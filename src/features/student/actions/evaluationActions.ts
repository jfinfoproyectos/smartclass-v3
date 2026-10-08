"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function registerExpulsionAction(submissionId: string, reason?: "resize" | "multi_screen") {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                select: {
                    id: true,
                    courseId: true,
                    maxWarnings: true,
                    enableSurveillance: true,
                    evaluationId: true,
                }
            }
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    const currentWildcards = typeof submission.wildcardsUsed === 'string'
        ? JSON.parse(submission.wildcardsUsed)
        : (submission.wildcardsUsed as any) || {};

    const prevExpulsionLogs = Array.isArray(currentWildcards.expulsionLogs) ? currentWildcards.expulsionLogs : [];
    const reasonLabel = reason === "resize" 
        ? "Ventana desmaximizada / redimensionada" 
        : reason === "multi_screen" 
            ? "Múltiples pantallas detectadas" 
            : "Incumplimiento de entorno de seguridad";

    const expulsionEntry = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        reason: reason || "unknown",
        reasonLabel,
        timestamp: new Date().toISOString(),
    };

    // Incremento atómico para evitar condiciones de carrera
    const updated = await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            expulsions: {
                increment: 1,
            },
            wildcardsUsed: {
                ...currentWildcards,
                expulsionLogs: [...prevExpulsionLogs, expulsionEntry],
            },
        },
        select: {
            id: true,
            expulsions: true,
            attemptId: true,
            attempt: {
                select: {
                    courseId: true,
                    evaluationId: true,
                }
            }
        }
    });

    const newExpulsions = updated.expulsions;

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "EVALUATION_SUBMISSION",
            entityId: submissionId,
            userId: session.user.id,
            userName: session.user.name || "Estudiante",
            userRole: session.user.role,
            description: `Expulsión temporal registrada (${reasonLabel}, Total: ${newExpulsions}) en entrega ${submissionId}`,
            success: true,
        });
    } catch (logErr) {
        console.error("Audit log error in registerExpulsionAction:", logErr);
    }

    // Notificar al profesor vía SSE
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        emitEvaluationUpdate({
            attemptId: updated.attemptId,
            evaluationId: updated.attempt?.evaluationId,
            submissionId,
            studentId: session.user.id,
            type: "PENALTY_UPDATED",
            timestamp: Date.now(),
            message: `Expulsión temporal: ${reasonLabel} (Falta #${newExpulsions}). El estudiante debe corregir el entorno para reingresar.`,
        });
    } catch {}

    // Revalidar rutas para que docente y estudiante vean las faltas actualizadas en tiempo real
    if (updated.attempt?.courseId) {
        revalidatePath(`/dashboard/teacher/courses/${updated.attempt.courseId}/evaluations/${updated.attemptId}`);
        revalidatePath(`/dashboard/teacher/courses/${updated.attempt.courseId}`);
    }
    revalidatePath(`/evaluations/${updated.attemptId}`);

    return { success: true, expulsions: newExpulsions };
}

export async function saveAnswerAction(submissionId: string, questionId: string, content: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const existing = await prisma.evaluationAnswer.findFirst({
        where: { submissionId, questionId }
    });

    if (existing) {
        await prisma.evaluationAnswer.update({
            where: { id: existing.id },
            data: { answer: content }
        });
    } else {
        await prisma.evaluationAnswer.create({
            data: { submissionId, questionId, answer: content }
        });
    }

    // Notificar al monitor del docente vía SSE para actualizar el mapa de respuestas al instante
    try {
        const sub = await prisma.evaluationSubmission.findUnique({
            where: { id: submissionId },
            select: { attemptId: true }
        });
        if (sub?.attemptId) {
            const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
            emitEvaluationUpdate({
                attemptId: sub.attemptId,
                submissionId,
                studentId: session.user.id,
                type: "SUBMISSION_UPDATED",
                timestamp: Date.now()
            });
        }
    } catch {}

    return { success: true };
}

export async function submitEvaluationAction(submissionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: { 
            attempt: { 
                include: { 
                    evaluation: { 
                        include: { questions: { select: { id: true } } } 
                    } 
                } 
            },
            answersList: true
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    // 1. Calcular nota final
    const totalQuestions = submission.attempt?.evaluation?.questions?.length || 1;
    const totalScoreSum = submission.answersList.reduce((acc, a) => acc + (a.score || 0), 0);
    const calculatedBase = Number((totalScoreSum / totalQuestions).toFixed(2));

    const prevWildcards = (submission.wildcardsUsed as any) || {};
    const penalty = Number(prevWildcards.penalty || 0);
    const baseScore = prevWildcards.baseScore !== undefined ? Number(prevWildcards.baseScore) : calculatedBase;
    const finalScore = submission.score !== null && submission.score !== undefined && prevWildcards.baseScore !== undefined
        ? submission.score
        : Math.max(0, Number((baseScore - penalty).toFixed(2)));

    // 2. Generar mensaje pedagógico con LLM según la nota obtenida
    let feedback = "";
    try {
        const evaluationTitle = submission.attempt?.evaluation?.title || "Evaluación";
        const teacherId = submission.attempt?.evaluation?.authorId;
        const { generateSubmissionFeedback } = await import("../../teacher/services/ai/evaluationAnalysisService");
        feedback = await generateSubmissionFeedback(
            evaluationTitle,
            finalScore,
            submission.expulsions || 0,
            teacherId
        );
    } catch (err) {
        console.error("Error generating feedback in submitEvaluationAction:", err);
        feedback = finalScore >= 3.0 ? "¡Evaluación completada con éxito!" : "Evaluación finalizada. Revisa tus respuestas y fortalece los conceptos clave.";
    }

    const updatedWildcards = {
        ...prevWildcards,
        baseScore,
        llmFeedback: feedback,
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { 
            submittedAt: new Date(),
            score: finalScore,
            wildcardsUsed: updatedWildcards,
        }
    });

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "EVALUATION_SUBMISSION",
            entityId: submissionId,
            userId: session.user.id,
            userName: session.user.name || "Estudiante",
            userRole: session.user.role,
            description: `Evaluación enviada con nota ${finalScore}: ${submissionId}`,
            success: true,
        });
    } catch (e) {
        console.error("Audit log error:", e);
    }

    // Notificar al profesor vía SSE que el examen fue entregado
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        emitEvaluationUpdate({
            attemptId: submission.attemptId,
            submissionId,
            studentId: session.user.id,
            type: "SUBMISSION_UPDATED",
            timestamp: Date.now(),
            message: `Evaluación entregada por ${session.user.name || "Estudiante"}`
        });
    } catch {}

    revalidatePath(`/dashboard/student`);
    if (submission.attempt?.courseId) {
        revalidatePath(`/dashboard/student?courseId=${submission.attempt.courseId}&tab=evaluations`);
    }
    return { success: true, score: finalScore, feedback };
}

export async function getOrGenerateEvaluationFeedbackAction(submissionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: {
                        include: { questions: { select: { id: true } } }
                    }
                }
            },
            answersList: true
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    const wildcards = (submission.wildcardsUsed as any) || {};
    if (wildcards.llmFeedback) {
        return { feedback: wildcards.llmFeedback, score: submission.score };
    }

    const totalQuestions = submission.attempt?.evaluation?.questions?.length || 1;
    const totalScoreSum = submission.answersList.reduce((acc, a) => acc + (a.score || 0), 0);
    const calculatedBase = Number((totalScoreSum / totalQuestions).toFixed(2));
    const penalty = Number(wildcards.penalty || 0);
    const baseScore = wildcards.baseScore !== undefined ? Number(wildcards.baseScore) : calculatedBase;
    const finalScore = submission.score !== null && submission.score !== undefined
        ? submission.score
        : Math.max(0, Number((baseScore - penalty).toFixed(2)));

    const evaluationTitle = submission.attempt?.evaluation?.title || "Evaluación";
    const teacherId = submission.attempt?.evaluation?.authorId;
    const { generateSubmissionFeedback } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const feedback = await generateSubmissionFeedback(
        evaluationTitle,
        finalScore,
        submission.expulsions || 0,
        teacherId
    );

    const updatedWildcards = {
        ...wildcards,
        llmFeedback: feedback,
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            score: finalScore,
            wildcardsUsed: updatedWildcards,
        }
    });

    revalidatePath(`/dashboard/student`);
    return { feedback, score: finalScore };
}

export async function evaluateAnswerWithAIAction(submissionId: string, questionId: string, currentAnswer: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: true
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { evaluation: true }
    });

    if (!question) throw new Error("Question not found");

    // Precedence: attempt configuration (assigned to course/students) > attempt's evaluation > question's evaluation > default
    const maxAttempts = submission.attempt?.maxSupportAttempts 
        ?? submission.attempt?.evaluation?.maxSupportAttempts 
        ?? question.evaluation?.maxSupportAttempts 
        ?? 3;

    let answerRecord = await prisma.evaluationAnswer.findFirst({
        where: { submissionId, questionId }
    });

    if (!answerRecord) {
        answerRecord = await prisma.evaluationAnswer.create({
            data: { submissionId, questionId, answer: currentAnswer }
        });
    }

    if (answerRecord.supportAttempts >= maxAttempts) {
        throw new Error(`Has alcanzado el límite máximo de ${maxAttempts} ayudas de IA para esta pregunta.`);
    }

    if (answerRecord.answer !== currentAnswer) {
        answerRecord = await prisma.evaluationAnswer.update({
            where: { id: answerRecord.id },
            data: { answer: currentAnswer }
        });
    }

    const teacherId = submission.attempt?.evaluation?.authorId || question.evaluation?.authorId;

    const { evaluateStudentAnswer } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const aiResult = await evaluateStudentAnswer(question.text, question.type, currentAnswer, 5.0, question.referenceAnswer || undefined, teacherId);

    let feedbackHistory: { attempt: number; feedback: string; score: number; isCorrect: boolean; requestedAt: string }[] = [];
    if (answerRecord.aiFeedback) {
        feedbackHistory = Array.isArray(answerRecord.aiFeedback) 
            ? answerRecord.aiFeedback as typeof feedbackHistory
            : JSON.parse(answerRecord.aiFeedback as string);
    }

    const currentAttemptNumber = answerRecord.supportAttempts + 1;
    const now = new Date().toISOString();
    feedbackHistory.push({
        attempt: currentAttemptNumber,
        feedback: aiResult.feedback,
        score: aiResult.scoreContribution,
        isCorrect: aiResult.isCorrect,
        requestedAt: now
    });

    const maxScore = Math.max(...feedbackHistory.map(f => f.score));

    await prisma.evaluationAnswer.update({
        where: { id: answerRecord.id },
        data: {
            supportAttempts: currentAttemptNumber,
            score: maxScore,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aiFeedback: feedbackHistory as any
        }
    });

    const evaluation = await prisma.evaluation.findUnique({
        where: { id: question.evaluationId },
        include: { questions: { select: { id: true } } }
    });

    const totalQuestionsCount = evaluation?.questions.length || 1;
    const allAnswers = await prisma.evaluationAnswer.findMany({
        where: { submissionId }
    });

    const totalScoreSum = allAnswers.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const finalSubmissionScore = Number((totalScoreSum / totalQuestionsCount).toFixed(2));

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { score: finalSubmissionScore }
    });

    return {
        success: true,
        feedback: aiResult.feedback,
        isCorrect: aiResult.isCorrect,
        scoreContribution: aiResult.scoreContribution,
        accumulatedScore: finalSubmissionScore,
        attemptsRemaining: Math.max(0, maxAttempts - currentAttemptNumber),
        requestedAt: now
    };
}

export async function useAiHintAction(submissionId: string, questionId: string, currentAnswer: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: { select: { wildcardAiHints: true, authorId: true } }
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const maxHints = submission.attempt?.wildcardAiHints ?? submission.attempt?.evaluation?.wildcardAiHints ?? 0;
    const wildcardsUsed = (submission.wildcardsUsed || {}) as {
        aiHintsUsed?: number;
        aiHintQuestions?: { questionId: string; usedAt: string }[];
        secondChanceUsed?: number;
        secondChanceQuestions?: { questionId: string; usedAt: string }[];
    };
    const hintsUsed = wildcardsUsed.aiHintsUsed || 0;

    if (hintsUsed >= maxHints) {
        throw new Error(`Has agotado tus ${maxHints} pistas de IA disponibles.`);
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error("Question not found");

    const teacherId = submission.attempt?.evaluation?.authorId;

    const { getAiHint } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const hint = await getAiHint(question.text, question.type, currentAnswer, teacherId);

    wildcardsUsed.aiHintsUsed = hintsUsed + 1;
    if (!wildcardsUsed.aiHintQuestions) wildcardsUsed.aiHintQuestions = [];
    const newHintEntry = {
        questionId,
        hint,
        usedAt: new Date().toISOString()
    };
    wildcardsUsed.aiHintQuestions.push(newHintEntry);

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { wildcardsUsed }
    });

    return {
        success: true,
        hint,
        hintsRemaining: Math.max(0, maxHints - (hintsUsed + 1)),
        aiHintQuestions: wildcardsUsed.aiHintQuestions
    };
}

export async function useSecondChanceAction(submissionId: string, questionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: { select: { wildcardSecondChance: true } }
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const maxSecondChances = submission.attempt?.wildcardSecondChance ?? submission.attempt?.evaluation?.wildcardSecondChance ?? 0;
    const wildcardsUsed = (submission.wildcardsUsed || {}) as {
        aiHintsUsed?: number;
        aiHintQuestions?: { questionId: string; usedAt: string }[];
        secondChanceUsed?: number;
        secondChanceQuestions?: { questionId: string; usedAt: string }[];
    };
    const secondChancesUsed = wildcardsUsed.secondChanceUsed || 0;

    if (secondChancesUsed >= maxSecondChances) {
        throw new Error(`Has agotado tus ${maxSecondChances} segundas oportunidades disponibles.`);
    }

    wildcardsUsed.secondChanceUsed = secondChancesUsed + 1;
    if (!wildcardsUsed.secondChanceQuestions) wildcardsUsed.secondChanceQuestions = [];
    wildcardsUsed.secondChanceQuestions.push({ questionId, usedAt: new Date().toISOString() });

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { wildcardsUsed }
    });

    // Reset supportAttempts for this question in this submission to allow AI help again
    await prisma.evaluationAnswer.updateMany({
        where: { submissionId, questionId },
        data: { supportAttempts: 0 }
    });

    return {
        success: true,
        secondChancesRemaining: Math.max(0, maxSecondChances - (secondChancesUsed + 1))
    };
}

export async function getEvaluationAttemptDataAction(attemptId: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("No autenticado");
    }

    const { evaluationService } = await import("@/features/teacher/services/evaluationService");
    const attempt = await evaluationService.getAttemptWithQuestions(attemptId);
    if (!attempt) {
        throw new Error("Evaluación no encontrada");
    }

    // Si la asignación es selectiva, verificar que el estudiante esté en la lista
    let studentSubmission = null;
    if (session.user.role === "student") {
        const assignedIds = Array.isArray(attempt.assignedStudentIds)
            ? (attempt.assignedStudentIds as string[])
            : typeof attempt.assignedStudentIds === 'string'
                ? JSON.parse(attempt.assignedStudentIds)
                : [];
        if (assignedIds.length > 0 && !assignedIds.includes(session.user.id)) {
            throw new Error("No tienes asignada esta evaluación.");
        }

        studentSubmission = await prisma.evaluationSubmission.findFirst({
            where: { attemptId, userId: session.user.id },
            include: { answersList: true }
        });
    }

    return {
        ...attempt,
        studentSubmission
    };
}

/**
 * Registra un evento de cambio de pestaña / navegación fuera del examen cuando blockTabSwitch está desactivado
 */
export async function registerTabSwitchLogAction({
    submissionId,
    durationSeconds,
    questionNumber,
    questionTitle,
    leftAt,
    returnedAt
}: {
    submissionId: string;
    durationSeconds: number;
    questionNumber: number;
    questionTitle?: string;
    leftAt: string;
    returnedAt: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        select: {
            id: true,
            userId: true,
            wildcardsUsed: true,
            attemptId: true,
            attempt: { 
                select: { 
                    courseId: true, 
                    evaluationId: true,
                    blockTabSwitch: true,
                    maxExitTimeSeconds: true,
                    enableSurveillance: true,
                    evaluation: {
                        select: {
                            blockTabSwitch: true,
                            maxExitTimeSeconds: true,
                        }
                    }
                } 
            }
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    // Si la vigilancia o blockTabSwitch está desactivado, el sistema NO registra absolutamente nada de cambios de pestaña
    const surveillanceEnabled = submission.attempt?.enableSurveillance !== false;
    const isBlockTabSwitch = surveillanceEnabled && (submission.attempt?.blockTabSwitch ?? submission.attempt?.evaluation?.blockTabSwitch ?? true);
    if (!isBlockTabSwitch) {
        return {
            success: false,
            ignored: true,
            tabSwitchesCount: 0,
            totalTimeAwaySeconds: 0,
            hasTimeLimitAlert: false,
            maxExitTimeSeconds: 60,
            logEntry: null,
        };
    }

    const maxAllowedExitTime = submission.attempt?.maxExitTimeSeconds ?? submission.attempt?.evaluation?.maxExitTimeSeconds ?? 60;

    const currentWildcards = typeof submission.wildcardsUsed === 'string'
        ? JSON.parse(submission.wildcardsUsed)
        : (submission.wildcardsUsed as any) || {};

    const prevLogs = Array.isArray(currentWildcards.tabSwitchLogs) ? currentWildcards.tabSwitchLogs : [];
    const newCount = (currentWildcards.tabSwitchesCount || 0) + 1;
    const newTotalAway = (currentWildcards.totalTimeAwaySeconds || 0) + durationSeconds;
    const hasTimeLimitAlert = newTotalAway >= maxAllowedExitTime;
    const wasAlreadyAlerted = !!currentWildcards.hasTimeLimitAlert;

    const newLogEntry = {
        id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        questionNumber,
        questionTitle: questionTitle || `Pregunta ${questionNumber}`,
        durationSeconds,
        leftAt,
        returnedAt,
    };

    const updatedWildcards = {
        ...currentWildcards,
        tabSwitchesCount: newCount,
        totalTimeAwaySeconds: newTotalAway,
        hasTimeLimitAlert: hasTimeLimitAlert || wasAlreadyAlerted,
        timeLimitAlertTriggeredAt: hasTimeLimitAlert && !currentWildcards.timeLimitAlertTriggeredAt ? new Date().toISOString() : currentWildcards.timeLimitAlertTriggeredAt,
        tabSwitchLogs: [...prevLogs, newLogEntry],
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            wildcardsUsed: updatedWildcards,
        }
    });

    // Notificar al profesor vía SSE
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        const alertPrefix = hasTimeLimitAlert ? "⚠️ [LÍMITE DE TIEMPO FUERA EXCEDIDO] " : "";
        const maxMins = Math.max(1, Math.round(maxAllowedExitTime / 60));
        const totalAwayMins = Math.max(1, Math.round(newTotalAway / 60));
        emitEvaluationUpdate({
            attemptId: submission.attemptId,
            evaluationId: submission.attempt?.evaluationId,
            submissionId: submission.id,
            studentId: session.user.id,
            type: hasTimeLimitAlert ? "TIME_LIMIT_EXCEEDED" : "PENALTY_UPDATED",
            timestamp: Date.now(),
            message: `${alertPrefix}Salida de pestaña (Total acumulado: ${totalAwayMins} min / Límite permitido: ${maxMins} min) en pregunta ${questionNumber}`,
        });
    } catch {}

    // Audit log si se supera el umbral de alerta por primera vez
    if (hasTimeLimitAlert && !wasAlreadyAlerted) {
        try {
            const { auditLogger } = await import("../../admin/services/auditLogger");
            const maxMins = Math.max(1, Math.round(maxAllowedExitTime / 60));
            const totalAwayMins = Math.max(1, Math.round(newTotalAway / 60));
            await auditLogger.log({
                action: "UPDATE",
                entity: "EVALUATION_SUBMISSION",
                entityId: submissionId,
                userId: session.user.id,
                userName: session.user.name || "Estudiante",
                userRole: session.user.role,
                description: `ALERTA DE SEGURIDAD: Tiempo acumulado fuera del examen superado (${totalAwayMins} min acumulados >= límite de ${maxMins} min) en entrega ${submissionId}`,
                success: true,
            });
        } catch {}
    }

    // Revalidar rutas para que docente y estudiante vean la telemetría actualizada
    if (submission.attempt?.courseId) {
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}`);
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}/submissions/${submission.id}`);
    }

    return {
        success: true,
        tabSwitchesCount: newCount,
        totalTimeAwaySeconds: newTotalAway,
        hasTimeLimitAlert,
        maxExitTimeSeconds: maxAllowedExitTime,
        logEntry: newLogEntry,
    };
}
