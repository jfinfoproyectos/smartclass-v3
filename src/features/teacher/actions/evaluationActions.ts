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

    if (!evaluationId || !courseId || !startTimeStr || !endTimeStr) {
        throw new Error("Faltan datos requeridos");
    }

    const { evaluationService } = await import("../services/evaluationService");

    const attempt = await evaluationService.assignEvaluationToCourse({
        evaluationId,
        courseId,
        startTime: new Date(startTimeStr),
        endTime: new Date(endTimeStr),
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
    includeTestCases: boolean = false
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { generateQuestion } = await import("../services/ai/questionGenerationService");
        const data = await generateQuestion(topic, type, language, customPrompt, size, openness, includeCode, difficulty, bloomTaxonomy, includeBoilerplate, includeTestCases, session.user.id);
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
    const evaluationId = formData.get("evaluationId") as string;
    const startTime = new Date(formData.get("startTime") as string);
    const endTime = new Date(formData.get("endTime") as string);
    const courseId = formData.get("courseId") as string;

    const { evaluationService } = await import("../services/evaluationService");
    const attempt = await evaluationService.updateEvaluationAssignment(attemptId, {
        evaluationId,
        startTime,
        endTime
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
