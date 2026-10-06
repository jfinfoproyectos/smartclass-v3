"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function registerExpulsionAction(submissionId: string) {
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
                }
            }
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    // Incremento atómico para evitar condiciones de carrera entre blur y visibilitychange
    const updated = await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            expulsions: {
                increment: 1,
            },
        },
        select: {
            id: true,
            expulsions: true,
            attemptId: true,
            attempt: {
                select: {
                    courseId: true,
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
            description: `Salida de la aplicación registrada (Total faltas: ${newExpulsions}) en entrega ${submissionId}`,
            success: true,
        });
    } catch (logErr) {
        console.error("Audit log error in registerExpulsionAction:", logErr);
    }

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

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { evaluation: true }
    });

    if (!question) throw new Error("Question not found");
    const maxAttempts = question.evaluation.maxSupportAttempts;

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

    const evaluationData = await prisma.evaluation.findFirst({
        where: { questions: { some: { id: questionId } } },
        select: { authorId: true }
    });
    const teacherId = evaluationData?.authorId;

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
        attemptsRemaining: maxAttempts - currentAttemptNumber,
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
                    evaluation: { select: { wildcardAiHints: true } }
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");

    const maxHints = submission.attempt.evaluation.wildcardAiHints || 0;
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

    const evaluationData = await prisma.evaluation.findUnique({
        where: { id: submission.attempt.evaluationId },
        select: { authorId: true }
    });
    const teacherId = evaluationData?.authorId;

    const { getAiHint } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const hint = await getAiHint(question.text, question.type, currentAnswer, teacherId);

    wildcardsUsed.aiHintsUsed = hintsUsed + 1;
    if (!wildcardsUsed.aiHintQuestions) wildcardsUsed.aiHintQuestions = [];
    wildcardsUsed.aiHintQuestions.push({ questionId, usedAt: new Date().toISOString() });

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { wildcardsUsed }
    });

    return {
        success: true,
        hint,
        hintsRemaining: maxHints - (hintsUsed + 1)
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

    const maxSecondChances = submission.attempt.evaluation.wildcardSecondChance || 0;
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

    // Reset supportAttempts for this question in this submission to allow AI help again? 
    // The requirement says "Segunda oportunidad para reevaluar con IA". 
    // Let's reset the counter for this specific question.
    await prisma.evaluationAnswer.updateMany({
        where: { submissionId, questionId },
        data: { supportAttempts: 0 }
    });

    return {
        success: true,
        secondChancesRemaining: maxSecondChances - (secondChancesUsed + 1)
    };
}
