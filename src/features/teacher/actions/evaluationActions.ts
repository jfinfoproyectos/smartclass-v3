"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createEvaluationAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const helpUrl = formData.get("helpUrl") as string;
    const maxSupportAttemptsStr = formData.get("maxSupportAttempts") as string;
    const aiSupportDelaySecondsStr = formData.get("aiSupportDelaySeconds") as string;
    const expulsionPenaltyStr = formData.get("expulsionPenalty") as string;
    const wildcardAiHintsStr = formData.get("wildcardAiHints") as string;
    const wildcardSecondChanceStr = formData.get("wildcardSecondChance") as string;

    const maxSupportAttempts = maxSupportAttemptsStr ? parseInt(maxSupportAttemptsStr, 10) : 3;
    const aiSupportDelaySeconds = aiSupportDelaySecondsStr ? parseInt(aiSupportDelaySecondsStr, 10) : 60;
    const expulsionPenalty = expulsionPenaltyStr ? parseFloat(expulsionPenaltyStr) : 0;
    const wildcardAiHints = wildcardAiHintsStr ? parseInt(wildcardAiHintsStr, 10) : 0;
    const wildcardSecondChance = wildcardSecondChanceStr ? parseInt(wildcardSecondChanceStr, 10) : 0;

    const { evaluationService } = await import("../services/evaluationService");

    const evaluation = await evaluationService.createEvaluation({
        title,
        description,
        helpUrl,
        authorId: session.user.id,
        maxSupportAttempts,
        aiSupportDelaySeconds,
        expulsionPenalty,
        wildcardAiHints,
        wildcardSecondChance
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "EVALUATION",
        entityId: evaluation.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Evaluación creada: ${title}`,
        success: true,
    });

    revalidatePath("/dashboard/teacher/evaluations");
}

export async function updateEvaluationAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const evaluationId = formData.get("evaluationId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const helpUrl = formData.get("helpUrl") as string;
    const maxSupportAttemptsStr = formData.get("maxSupportAttempts") as string;
    const aiSupportDelaySecondsStr = formData.get("aiSupportDelaySeconds") as string;
    const expulsionPenaltyStr = formData.get("expulsionPenalty") as string;
    const wildcardAiHintsStr = formData.get("wildcardAiHints") as string;
    const wildcardSecondChanceStr = formData.get("wildcardSecondChance") as string;

    const maxSupportAttempts = maxSupportAttemptsStr ? parseInt(maxSupportAttemptsStr, 10) : undefined;
    const aiSupportDelaySeconds = aiSupportDelaySecondsStr ? parseInt(aiSupportDelaySecondsStr, 10) : undefined;
    const expulsionPenalty = (expulsionPenaltyStr !== null && expulsionPenaltyStr !== "") ? parseFloat(expulsionPenaltyStr) : undefined;
    const wildcardAiHints = (wildcardAiHintsStr !== null && wildcardAiHintsStr !== "") ? parseInt(wildcardAiHintsStr, 10) : undefined;
    const wildcardSecondChance = (wildcardSecondChanceStr !== null && wildcardSecondChanceStr !== "") ? parseInt(wildcardSecondChanceStr, 10) : undefined;

    const { evaluationService } = await import("../services/evaluationService");

    await evaluationService.updateEvaluation(evaluationId, session.user.id, {
        title: title || undefined,
        description: description || undefined,
        helpUrl: helpUrl || undefined,
        maxSupportAttempts,
        aiSupportDelaySeconds,
        expulsionPenalty,
        wildcardAiHints,
        wildcardSecondChance
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "EVALUATION",
        entityId: evaluationId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Evaluación actualizada: ${title || "ID: " + evaluationId}`,
        success: true,
    });

    revalidatePath("/dashboard/teacher/evaluations");
}

export async function deleteEvaluationAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const evaluationId = formData.get("evaluationId") as string;
    const confirmText = formData.get("confirmText") as string;

    if (confirmText !== "ELIMINAR") {
        throw new Error("Confirmación incorrecta");
    }

    const { evaluationService } = await import("../services/evaluationService");
    
    // Get info before deletion for audit log
    const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        select: { title: true }
    });

    await evaluationService.deleteEvaluation(evaluationId, session.user.id);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "EVALUATION",
        entityId: evaluationId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Evaluación eliminada: ${evaluation?.title || "ID: " + evaluationId}`,
        success: true,
    });

    revalidatePath("/dashboard/teacher/evaluations");
}

export async function createQuestionAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const evaluationId = formData.get("evaluationId") as string;
    const text = formData.get("text") as string;
    const type = formData.get("type") as string; // "Text" or "Code"
    const language = formData.get("language") as string;
    const referenceAnswer = (formData.get("referenceAnswer") as string) || "";

    const { evaluationService } = await import("../services/evaluationService");

    await evaluationService.createQuestion({
        evaluationId,
        text,
        type,
        language: type === "Code" ? language : undefined,
        referenceAnswer: referenceAnswer
    });

    revalidatePath(`/dashboard/teacher/evaluations/${evaluationId}`);
}

export async function updateQuestionAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const questionId = formData.get("questionId") as string;
    const evaluationId = formData.get("evaluationId") as string;
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const language = formData.get("language") as string;
    const referenceAnswer = (formData.get("referenceAnswer") as string) || "";

    const { evaluationService } = await import("../services/evaluationService");

    await evaluationService.updateQuestion(questionId, evaluationId, session.user.id, {
        text,
        type,
        language: type === "Code" ? language : undefined,
        referenceAnswer: referenceAnswer
    });

    revalidatePath(`/dashboard/teacher/evaluations/${evaluationId}`);
}

export async function updateQuestionsOrderAction(evaluationId: string, questionOrders: { id: string, order: number }[]) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const { evaluationService } = await import("../services/evaluationService");
    await evaluationService.updateQuestionsOrder(evaluationId, session.user.id, questionOrders);

    revalidatePath(`/dashboard/teacher/evaluations/${evaluationId}`);
}

export async function deleteQuestionAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const questionId = formData.get("questionId") as string;
    const evaluationId = formData.get("evaluationId") as string;
    const confirmText = formData.get("confirmText") as string;

    if (confirmText !== "ELIMINAR") {
        throw new Error("Confirmación incorrecta");
    }

    const { evaluationService } = await import("../services/evaluationService");
    await evaluationService.deleteQuestion(questionId, evaluationId, session.user.id);

    revalidatePath(`/dashboard/teacher/evaluations/${evaluationId}`);
}

export async function assignEvaluationAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const evaluationId = formData.get("evaluationId") as string;
    const courseId = formData.get("courseId") as string;
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;

    const enableSurveillance = formData.has("enableSurveillance") ? formData.get("enableSurveillance") === "true" : true;
    const blockTabSwitch = formData.has("blockTabSwitch") ? formData.get("blockTabSwitch") === "true" : true;
    const requireFullscreen = formData.has("requireFullscreen") ? formData.get("requireFullscreen") === "true" : true;
    const blockMultipleDisplays = formData.has("blockMultipleDisplays") ? formData.get("blockMultipleDisplays") === "true" : true;
    const blockClipboard = formData.has("blockClipboard") ? formData.get("blockClipboard") === "true" : true;
    const maxWarningsStr = formData.get("maxWarnings") as string;
    const maxWarnings = maxWarningsStr ? parseInt(maxWarningsStr, 10) : 3;

    const helpUrl = (formData.get("helpUrl") as string) || null;
    const maxSupportAttemptsStr = formData.get("maxSupportAttempts") as string;
    const aiSupportDelaySecondsStr = formData.get("aiSupportDelaySeconds") as string;
    const wildcardAiHintsStr = formData.get("wildcardAiHints") as string;
    const wildcardSecondChanceStr = formData.get("wildcardSecondChance") as string;

    const maxSupportAttempts = maxSupportAttemptsStr ? parseInt(maxSupportAttemptsStr, 10) : 3;
    const aiSupportDelaySeconds = aiSupportDelaySecondsStr ? parseInt(aiSupportDelaySecondsStr, 10) : 60;
    const wildcardAiHints = wildcardAiHintsStr ? parseInt(wildcardAiHintsStr, 10) : 0;
    const wildcardSecondChance = wildcardSecondChanceStr ? parseInt(wildcardSecondChanceStr, 10) : 0;

    const assignedStudentIdsStr = formData.get("assignedStudentIds") as string;
    let assignedStudentIds: string[] | undefined = undefined;
    if (assignedStudentIdsStr) {
        try {
            assignedStudentIds = JSON.parse(assignedStudentIdsStr);
        } catch {
            assignedStudentIds = [];
        }
    }

    if (!evaluationId || !courseId || !startTimeStr || !endTimeStr) {
        throw new Error("Faltan datos requeridos: debes seleccionar una evaluación y definir el horario de inicio y fin.");
    }

    const { evaluationService } = await import("../services/evaluationService");

    const attempt = await evaluationService.assignEvaluationToCourse({
        evaluationId,
        courseId,
        startTime: new Date(startTimeStr),
        endTime: new Date(endTimeStr),
        enableSurveillance,
        blockTabSwitch,
        requireFullscreen,
        blockMultipleDisplays,
        blockClipboard,
        maxWarnings,
        helpUrl,
        maxSupportAttempts,
        aiSupportDelaySeconds,
        wildcardAiHints,
        wildcardSecondChance,
        assignedStudentIds,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [evalInfo, courseInfo] = await Promise.all([
        prisma.evaluation.findUnique({ where: { id: evaluationId }, select: { title: true } }),
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } })
    ]);

    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Evaluación '${evalInfo?.title}' asignada al curso '${courseInfo?.title}'`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function unassignEvaluationAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const attemptId = formData.get("attemptId") as string;
    const courseId = formData.get("courseId") as string;

    const { evaluationService } = await import("../services/evaluationService");

    await evaluationService.unassignEvaluationAttempt(attemptId);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function testQuestionWithAIAction(questionText: string, type: string, answerText: string, referenceAnswer?: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { evaluateStudentAnswer } = await import("../services/ai/evaluationAnalysisService");
        const data = await evaluateStudentAnswer(questionText, type, answerText, 5.0, referenceAnswer, session.user.id);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message || "No se pudo realizar la evaluación." };
    }
}

export async function generateQuestionAction(
    topic: string,
    type: string,
    language?: string,
    customPrompt?: string,
    size: "short" | "medium" | "long" = "medium",
    openness: "concrete" | "balanced" | "open" = "balanced",
    includeCode: boolean = false,
    difficulty: "easy" | "medium" | "hard" | "expert" = "medium",
    bloomTaxonomy: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create" = "apply",
    includeBoilerplate: boolean = false,
    includeTestCases: boolean = false,
    docContextParams?: { docProjectId: string; pageIds: string[] }
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        let docContext: { docName: string; files: { title: string; slug: string; content: string }[] } | undefined = undefined;

        if (docContextParams && docContextParams.docProjectId && docContextParams.pageIds.length > 0) {
            const docProject = await prisma.docProject.findUnique({
                where: { id: docContextParams.docProjectId },
                select: { name: true }
            });
            const pages = await prisma.docPage.findMany({
                where: {
                    docProjectId: docContextParams.docProjectId,
                    id: { in: docContextParams.pageIds }
                },
                select: { title: true, slug: true, content: true }
            });
            if (docProject && pages.length > 0) {
                docContext = {
                    docName: docProject.name,
                    files: pages
                };
            }
        }

        const { generateQuestion } = await import("../services/ai/questionGenerationService");
        const data = await generateQuestion(
            topic, type, language, customPrompt,
            size, openness, includeCode,
            difficulty, bloomTaxonomy, includeBoilerplate, includeTestCases,
            session.user.id, docContext
        );
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message || "Error al generar la pregunta." };
    }
}

export async function generateAnswerAction(questionText: string, type: string, language?: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { generateSampleAnswer } = await import("../services/ai/questionGenerationService");
        const data = await generateSampleAnswer(questionText, type, language, session.user.id);
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message || "Error al generar la respuesta." };
    }
}

export async function getGroupAIInsightsAction(evaluationId: string, attemptId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { evaluationService } = await import("../services/evaluationService");
    const { getGroupAIInsights } = await import("../services/ai/evaluationAnalysisService");

    const evaluation = await prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: { questions: true }
    });
    if (!evaluation) throw new Error("Evaluation not found");

    const submissions = await evaluationService.getSubmissionsByAttempt(attemptId);

    const stats = evaluation.questions.map((q, index) => {
        const answersForQ = submissions
            .flatMap(s => (s.answersList || []))
            .filter((a) => a.questionId === q.id && a.score !== null);

        const avg = answersForQ.length > 0
            ? answersForQ.reduce((acc, a) => acc + Number(a.score), 0) / answersForQ.length
            : 0;

        const successCount = answersForQ.filter((a) => Number(a.score) >= 3.0).length;

        return {
            questionIndex: index,
            averageScore: Number(avg.toFixed(2)),
            maxScore: 5.0,
            successRate: answersForQ.length > 0 ? successCount / answersForQ.length : 0
        };
    });

    const sampleFeedbackList = (submissions as any[])
        .flatMap((s: any) => (s.answersList || []))
        .filter((a: any) => a.score !== null && Number(a.score) < 3.0 && a.aiFeedback && a.aiFeedback.length > 0)
        .map((a: any) => {
            const history = Array.isArray(a.aiFeedback) ? a.aiFeedback : JSON.parse(a.aiFeedback as string);
            return history[history.length - 1].feedback;
        })
        .filter((val: string, index: number, self: string[]) => self.indexOf(val) === index)
        .slice(0, 15);

    return await getGroupAIInsights(
        evaluation.title,
        evaluation.questions.map(q => ({ text: q.text, type: q.type })),
        stats,
        sampleFeedbackList,
        session.user.id
    );
}

export async function getPlagiarismAnalysisAction(attemptId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { analyzePlagiarism } = await import("../services/ai/plagiarismService");
    const { formatName } = await import("@/lib/utils");

    const attempt = await prisma.evaluationAttempt.findUnique({
        where: { id: attemptId },
        include: { evaluation: true }
    });
    if (!attempt) throw new Error("Attempt not found");

    const submissions = await prisma.evaluationSubmission.findMany({
        where: { attemptId },
        include: {
            user: { include: { profile: true } },
            answersList: { select: { questionId: true, answer: true } }
        }
    });

    if (submissions.length < 2) return [];

    const formattedSubmissions = submissions.map(s => ({
        userId: s.user.id,
        userName: formatName(s.user.name, s.user.profile),
        answers: s.answersList.map(a => ({ questionId: a.questionId, content: a.answer }))
    }));

    return await analyzePlagiarism(attempt.evaluation.title, formattedSubmissions, session.user.id);
}

export async function exportEvaluationAction(evaluationId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { evaluationService } = await import("../services/evaluationService");
    return await evaluationService.getFullEvaluationData(evaluationId, session.user.id);
}

export async function importEvaluationAction(data: Record<string, unknown>) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { evaluationService } = await import("../services/evaluationService");
    const evaluation = await evaluationService.createFullEvaluation(session.user.id, data);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "EVALUATION",
        entityId: evaluation.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Evaluación importada: ${evaluation.title}`,
        success: true,
    });

    revalidatePath("/dashboard/teacher/evaluations");
}

export async function updateEvaluationAssignmentAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const attemptId = formData.get("attemptId") as string;
    const evaluationId = (formData.get("evaluationId") as string) || undefined;
    const startTimeRaw = formData.get("startTime") as string;
    const endTimeRaw = formData.get("endTime") as string;
    const startTime = startTimeRaw ? new Date(startTimeRaw) : undefined;
    const endTime = endTimeRaw ? new Date(endTimeRaw) : undefined;
    const courseId = formData.get("courseId") as string;

    const enableSurveillance = formData.has("enableSurveillance") ? formData.get("enableSurveillance") === "true" : true;
    const blockTabSwitch = formData.has("blockTabSwitch") ? formData.get("blockTabSwitch") === "true" : true;
    const requireFullscreen = formData.has("requireFullscreen") ? formData.get("requireFullscreen") === "true" : true;
    const blockMultipleDisplays = formData.has("blockMultipleDisplays") ? formData.get("blockMultipleDisplays") === "true" : true;
    const blockClipboard = formData.has("blockClipboard") ? formData.get("blockClipboard") === "true" : true;
    const maxWarningsStr = formData.get("maxWarnings") as string;
    const maxWarnings = maxWarningsStr ? parseInt(maxWarningsStr, 10) : 3;

    const helpUrl = formData.has("helpUrl") ? ((formData.get("helpUrl") as string) || null) : undefined;
    const maxSupportAttemptsStr = formData.get("maxSupportAttempts") as string;
    const aiSupportDelaySecondsStr = formData.get("aiSupportDelaySeconds") as string;
    const wildcardAiHintsStr = formData.get("wildcardAiHints") as string;
    const wildcardSecondChanceStr = formData.get("wildcardSecondChance") as string;

    const maxSupportAttempts = maxSupportAttemptsStr ? parseInt(maxSupportAttemptsStr, 10) : undefined;
    const aiSupportDelaySeconds = aiSupportDelaySecondsStr ? parseInt(aiSupportDelaySecondsStr, 10) : undefined;
    const wildcardAiHints = wildcardAiHintsStr ? parseInt(wildcardAiHintsStr, 10) : undefined;
    const wildcardSecondChance = wildcardSecondChanceStr ? parseInt(wildcardSecondChanceStr, 10) : undefined;

    const assignedStudentIdsStr = formData.has("assignedStudentIds") ? (formData.get("assignedStudentIds") as string) : undefined;
    let assignedStudentIds: string[] | undefined = undefined;
    if (assignedStudentIdsStr !== undefined) {
        try {
            assignedStudentIds = JSON.parse(assignedStudentIdsStr);
        } catch {
            assignedStudentIds = [];
        }
    }

    const { evaluationService } = await import("../services/evaluationService");
    const attempt = await evaluationService.updateEvaluationAssignment(attemptId, {
        evaluationId,
        startTime,
        endTime,
        enableSurveillance,
        blockTabSwitch,
        requireFullscreen,
        blockMultipleDisplays,
        blockClipboard,
        maxWarnings,
        helpUrl,
        maxSupportAttempts,
        aiSupportDelaySeconds,
        wildcardAiHints,
        wildcardSecondChance,
        assignedStudentIds,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "EVALUATION",
        entityId: attempt.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Asignación de evaluación actualizada: ${attempt.evaluation.title}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}/evaluations`);
}

export async function deleteEvaluationSubmissionAction(submissionId: string, courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const { evaluationService } = await import("../services/evaluationService");
    await evaluationService.deleteSubmission(submissionId);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true };
}

export async function updateSubmissionPenaltyAction(
    submissionId: string,
    penalty: number,
    comment: string,
    courseId: string
): Promise<
    | {
          success: true;
          finalScore: number;
          baseScore: number;
          penalty: number;
          comment: string;
      }
    | {
          success: false;
          error: string;
          finalScore?: never;
      }
> {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
        return { success: false, error: "No autorizado" };
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            user: { select: { id: true, name: true, email: true } },
            attempt: { select: { id: true, courseId: true, evaluation: { select: { title: true } } } },
            answersList: { select: { score: true } }
        }
    });

    if (!submission) {
        return { success: false, error: "Entrega no encontrada" };
    }

    const wildcards = (submission.wildcardsUsed as any) || {};

    // Obtener la nota base: si ya existía baseScore, preservarla; de lo contrario, tomar la nota previa de la entrega o calcularla
    let baseScore = wildcards.baseScore !== undefined ? Number(wildcards.baseScore) : null;
    if (baseScore === null) {
        if (submission.score !== null && submission.score !== undefined) {
            baseScore = Number(submission.score);
        } else {
            const totalSum = submission.answersList.reduce((acc, a) => acc + (a.score || 0), 0);
            const qCount = submission.answersList.length || 1;
            baseScore = Number((totalSum / qCount).toFixed(2));
        }
    }

    const penaltyNum = Math.max(0, Math.min(5, Number(penalty || 0)));
    const finalScore = Math.max(0, Number((baseScore - penaltyNum).toFixed(2)));

    const updatedWildcards = {
        ...wildcards,
        baseScore,
        penalty: penaltyNum,
        penaltyComment: comment.trim(),
        penalizedAt: new Date().toISOString(),
        penalizedBy: session.user.name || "Profesor"
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            score: finalScore,
            wildcardsUsed: updatedWildcards
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
            userName: session.user.name || "Profesor",
            userRole: session.user.role,
            description: `Ajuste/descuento de nota (${penaltyNum > 0 ? `-${penaltyNum}` : 'Restablecido a 0'}) aplicado a ${submission.user.name || submission.user.email}: ${comment}`,
            success: true,
        });
    } catch (auditErr) {
        console.error("Audit log error in updateSubmissionPenaltyAction:", auditErr);
    }

    if (submission.attempt?.courseId) {
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attempt.id}`);
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attempt.id}/submissions/${submissionId}`);
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}`);
        revalidatePath(`/dashboard/student?courseId=${submission.attempt.courseId}&tab=evaluations`);
    }
    revalidatePath(`/evaluations/${submission.attempt.id}`);

    return {
        success: true,
        finalScore,
        baseScore,
        penalty: penaltyNum,
        comment: comment.trim()
    };
}

export async function getEvaluationGroupDocsAction(evaluationId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { evaluationService } = await import("../services/evaluationService");
        const groups = await evaluationService.getEvaluationGroupDocProjects(evaluationId, session.user.id);
        return { success: true, data: groups };
    } catch (error: any) {
        console.error("Error fetching group docs:", error);
        return { success: false, error: error.message || "Error al cargar las documentaciones del grupo." };
    }
}

export async function generateQuestionsFromDocAction(
    evaluationId: string,
    docProjectId: string,
    pageIds: string[],
    config: {
        type: "both" | "Code" | "Text";
        codeCount?: number;
        textCount?: number;
        difficulty?: "easy" | "medium" | "hard" | "expert";
        language?: string;
        customPrompt?: string;
        includeBoilerplate?: boolean;
        includeTestCases?: boolean;
    }
) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { title: true }
        });
        if (!evaluation) {
            return { success: false, error: "Evaluación no encontrada." };
        }

        const docProject = await prisma.docProject.findUnique({
            where: { id: docProjectId },
            select: { name: true }
        });
        if (!docProject) {
            return { success: false, error: "Proyecto de documentación no encontrado." };
        }

        const pages = await prisma.docPage.findMany({
            where: {
                docProjectId,
                id: { in: pageIds }
            },
            select: {
                id: true,
                title: true,
                slug: true,
                content: true,
                category: true
            }
        });

        if (pages.length === 0) {
            return { success: false, error: "Debes seleccionar al menos un archivo de la documentación." };
        }

        const { generateQuestionsFromDocumentation } = await import("../services/ai/questionGenerationService");
        const questions = await generateQuestionsFromDocumentation(
            evaluation.title,
            docProject.name,
            pages,
            config,
            session.user.id
        );

        return { success: true, data: questions };
    } catch (error: any) {
        console.error("Error generating questions from documentation:", error);
        return { success: false, error: error.message || "Error al generar preguntas desde la documentación." };
    }
}

export async function saveBatchQuestionsAction(
    evaluationId: string,
    questions: Array<{ text: string; type: string; language?: string; referenceAnswer?: string }>
) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { evaluationService } = await import("../services/evaluationService");
        const created = await evaluationService.createQuestionsBatch(evaluationId, session.user.id, questions);

        revalidatePath(`/dashboard/teacher/evaluations/${evaluationId}`);
        return { success: true, count: created.length };
    } catch (error: any) {
        console.error("Error saving batch questions:", error);
        return { success: false, error: error.message || "Error al guardar las preguntas generadas." };
    }
}

export async function refineQuestionAction(
    currentText: string,
    instruction: string,
    type: string = "Text",
    language?: string
) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        return { error: "No autorizado" };
    }

    try {
        const { refineQuestionStatement } = await import("../services/ai/questionGenerationService");
        const content = await refineQuestionStatement(
            currentText,
            instruction,
            type as any,
            language,
            session.user.id
        );
        return { content };
    } catch (error: any) {
        console.error("Error refining question:", error);
        return { error: error.message || "Error al adaptar la pregunta con IA" };
    }
}

export async function refinePenaltyCommentAction(rawComment: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        return { success: false, error: "No autorizado" };
    }

    if (!rawComment || !rawComment.trim()) {
        return { success: false, error: "Debes ingresar un texto para corregir su redacción." };
    }

    try {
        const { getAIModel } = await import("../services/ai/client");
        const { generateText } = await import("ai");

        const model = await getAIModel(session.user.role === "teacher" ? session.user.id : undefined);

        const prompt = `Actúa como un corrector de estilo y ortografía profesional en español.
Tu ÚNICA tarea es corregir la redacción, ortografía, gramática, puntuación y concordancia del siguiente texto escrito por un docente:

"${rawComment.trim()}"

REGLAS ESTRICTAS:
1. SOLO CORRIGE LA REDACCIÓN Y ORTOGRAFÍA. ESTÁ TOTALMENTE PROHIBIDO GENERAR TEXTO NUEVO, EXPANDIRLO O INVENTAR HECHOS O NARRATIVAS.
2. NO agregues encabezados ni prefijos como "Estudiante:", "Motivo:", "Justificación:", "Observación:", etc.
3. Conserva fielmente la longitud, tono e ideas exactas del autor, limitándote a mejorar la claridad, cohesión y corrección sintáctica del mensaje que escribió.
4. Si el texto es una palabra o frase corta (por ejemplo: "Fraude", "Copia durante la evaluación", "Salida indebida de la pantalla"), únicamente ajusta su ortografía, mayúsculas y puntuación correspondiente (ejemplo: "Fraude detectado durante la prueba." o "Copia durante la evaluación."), sin inventar nuevos detalles.
5. NO incluyas saludos, introducciones ("Aquí tienes la corrección:"), notas ni explicaciones.
6. Devuelve EXCLUSIVAMENTE el texto corregido, en texto plano, sin comillas externas ni markdown.`;

        const { text } = await generateText({
            model,
            prompt,
            temperature: 0.1,
        });

        // Limpiar comillas iniciales o finales si el modelo las agregó
        let refined = text.trim().replace(/^["']+|["']+$/g, "").trim();

        // Limpiar cualquier prefijo accidental como "Motivo: " o "Texto corregido: " o "Estudiante: ..."
        refined = refined.replace(/^(Motivo|Justificación|Texto corregido|Estudiante|Corrección)\s*:\s*/i, "").trim();

        return { success: true, refinedComment: refined };
    } catch (error: any) {
        console.error("Error refining penalty comment:", error);
        return { success: false, error: error.message || "Error al conectar con el servicio de IA." };
    }
}

/**
 * Obtiene las entregas actualizadas en tiempo real para el panel de monitoreo en vivo
 */
export async function getAttemptSubmissionsAction(attemptId: string) {
    try {
        const session = await getSession();
        if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
            return { success: false, error: "No autorizado" };
        }

        const { evaluationService } = await import("../services/evaluationService");
        const submissions = await evaluationService.getSubmissionsByAttempt(attemptId);

        return {
            success: true,
            submissions: JSON.parse(JSON.stringify(submissions))
        };
    } catch (error: any) {
        console.error("Error al obtener entregas para monitoreo en vivo:", error);
        return { success: false, error: error.message || "Error al consultar las entregas" };
    }
}

