"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { activityService } from "../services/activityService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { normalizeUrl } from "@/lib/utils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}


export async function deleteSubmissionAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const submissionId = formData.get("submissionId") as string;
    const courseId = formData.get("courseId") as string;
    const activityId = formData.get("activityId") as string;

    if (!submissionId) {
        throw new Error("Missing submission ID");
    }

    // Get submission info before deletion
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
            activity: { select: { title: true } },
            user: { select: { name: true } }
        }
    });

    await activityService.deleteSubmission(submissionId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "SUBMISSION",
        entityId: submissionId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Entrega eliminada: ${submission?.activity.title || "Actividad"} de ${submission?.user.name || "Estudiante"}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
}

export async function validateUniqueLinksAction(activityId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // Get all submissions for this activity
    const submissions = await prisma.submission.findMany({
        where: { activityId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    // Map to track normalized URLs and their associated students
    const urlMap = new Map<string, Array<{ id: string; name: string; email: string; originalUrl: string }>>();

    // Process each submission
    submissions.forEach(submission => {
        const normalizedUrl = normalizeUrl(submission.url);

        if (!urlMap.has(normalizedUrl)) {
            urlMap.set(normalizedUrl, []);
        }

        urlMap.get(normalizedUrl)!.push({
            id: submission.user.id,
            name: submission.user.name || 'Sin nombre',
            email: submission.user.email,
            originalUrl: submission.url
        });
    });

    const duplicates: Array<{
        url: string;
        count: number;
        students: Array<{ id: string; name: string; email: string; originalUrl: string }>;
    }> = [];

    const uniques: Array<{
        url: string;
        student: { id: string; name: string; email: string; originalUrl: string };
    }> = [];

    urlMap.forEach((students, url) => {
        if (students.length > 1) {
            duplicates.push({
                url,
                count: students.length,
                students
            });
        } else if (students.length === 1) {
            uniques.push({
                url,
                student: students[0]
            });
        }
    });

    // Calculate statistics
    const totalSubmissions = submissions.length;
    const uniqueLinks = urlMap.size;
    const duplicateCount = duplicates.reduce((sum, dup) => sum + dup.count, 0);
    const uniqueCount = totalSubmissions - duplicateCount;

    return {
        totalSubmissions,
        uniqueLinks,
        uniqueCount,
        duplicateCount,
        duplicates,
        uniques,
        originalityPercentage: totalSubmissions > 0
            ? Math.round((uniqueCount / totalSubmissions) * 100)
            : 100
    };
}


// 2. Analizar un solo archivo (PROFESOR)
export async function analyzeGitHubFileAction(
    path: string,
    content: string,
    statement: string,
    repoUrl: string,
    accumulatedContext?: string,
    gradingMode: string = "moderate"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { analyzeFile } = await import("../services/ai/codeAnalysisService");
    return await analyzeFile(path, content, statement, repoUrl, session.user.id, accumulatedContext, gradingMode);
}

// 3. Finalizar y guardar calificación (PROFESOR)
export async function finalizeGitHubGradingAction(
    activityId: string,
    studentUserId: string,
    repoUrl: string,
    statement: string,
    analyses: any[],
    missingFiles: string[],
    totalExpectedFiles: number,
    courseId: string,
    gradingMode: string = "moderate"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { finalizeSubmission } = await import("../services/ai/gradingService");
    const result = await finalizeSubmission(analyses, statement, missingFiles, session.user.id, totalExpectedFiles, gradingMode);

    const feedbackText = result.feedback;

    await activityService.submitActivity({
        url: repoUrl,
        activityId,
        userId: studentUserId,
        grade: result.grade,
        feedback: feedbackText,
    });

    // Auditoría
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [activity, student] = await Promise.all([
        prisma.activity.findUnique({ where: { id: activityId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: studentUserId }, select: { name: true } })
    ]);

    await auditLogger.logGrade(activityId, activity?.title || "Actividad", student?.name || "Estudiante", result.grade, session.user.id, session.user.name || "Profesor");

    // 🔔 PUSH NOTIFICATION
    try {
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(studentUserId, {
            title: "Actividad Calificada 📝",
            body: `Tu entrega para "${activity?.title || 'Actividad'}" ha sido calificada con ${result.grade}.`,
            url: `/dashboard/student/activities`
        });
    } catch (pushError) {
        console.error("Failed to send grading push notification:", pushError);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    revalidatePath(`/dashboard/teacher`);
    revalidatePath("/dashboard/student");

    return result;
}

export async function gradeManualActivityAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const activityId = formData.get("activityId") as string;
    const userId = formData.get("userId") as string;
    const gradeStr = formData.get("grade") as string;
    const feedback = formData.get("feedback") as string;
    const courseId = formData.get("courseId") as string;

    if (!activityId) throw new Error("Falta el ID de la actividad");
    if (!userId) throw new Error("Falta el ID del estudiante");
    if (!gradeStr) throw new Error("La nota es obligatoria");


    const grade = parseFloat(gradeStr);
    if (isNaN(grade) || grade < 0 || grade > 5) {
        throw new Error("La nota debe estar entre 0.0 y 5.0");
    }

    // Get existing submission to preserve the URL
    const existingSubmission = await activityService.getSubmission(activityId, userId);
    const url = existingSubmission?.url || "MANUAL"; // Use existing URL or placeholder if none exists

    // Guardar calificación utilizando el servicio centralizado para aplicar lógica de intentos/rechazo
    await activityService.submitActivity({
        url,
        activityId,
        userId,
        grade,
        feedback: feedback || null,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "GRADE",
        entity: "SUBMISSION",
        entityId: `${activityId}_${userId}`,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Nota manual asignada a estudiante (${userId}) en actividad ${activityId}: ${grade}`,
        success: true,
    });

    // 🔔 PUSH NOTIFICATION
    try {
        const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { title: true } });
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: "Actividad Calificada 📝",
            body: `Tu entrega para "${activity?.title || 'Actividad'}" ha sido calificada con ${grade}.`,
            url: `/dashboard/student/activities`
        });
    } catch (pushError) {
        console.error("Failed to send manual grading push notification:", pushError);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
}



export async function rejectManualActivityAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const activityId = formData.get("activityId") as string;
    const userId = formData.get("userId") as string;
    const feedback = formData.get("feedback") as string;
    const courseId = formData.get("courseId") as string;

    if (!activityId || !userId) {
        throw new Error("Faltan campos requeridos");
    }

    const existingSubmission = await activityService.getSubmission(activityId, userId);
    if (!existingSubmission) {
        throw new Error("No hay entrega para rechazar");
    }

    const prefix = "[ENTREGA RECHAZADA]";
    const newFeedback = feedback 
        ? (feedback.startsWith(prefix) ? feedback : `${prefix}\n${feedback}`) 
        : `${prefix} Por favor, revisa las observaciones y vuelve a subir tu entrega.`;

    await activityService.submitActivity({
        url: existingSubmission.url,
        activityId,
        userId,
        grade: null,
        feedback: newFeedback,
    });

    // Auditoría
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [activity, student] = await Promise.all([
        prisma.activity.findUnique({ where: { id: activityId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await auditLogger.log({
        action: "UPDATE",
        entity: "SUBMISSION",
        entityId: existingSubmission.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Entrega rechazada: ${activity?.title || "Actividad"} de ${student?.name || "Estudiante"}`,
        success: true,
    });

    // 🔔 PUSH NOTIFICATION
    try {
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: "Entrega Rechazada ⚠️",
            body: `Tu entrega para "${activity?.title || 'Actividad'}" ha sido rechazada por el profesor. Revisa los comentarios.`,
            url: `/dashboard/student/activities`
        });
    } catch (pushError) {
        console.error("Failed to send rejection push notification:", pushError);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
}

export async function improveFeedbackAction(text: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { improveFeedback } = await import("../services/ai/feedbackService");
    return await improveFeedback(text, session.user.id);
}

export async function gradePdfReviewAction(
    activityId: string,
    studentUserId: string,
    pdfUrl: string,
    criteria: string,
    courseId: string,
    gradingMode: string = "moderate"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradePdfReviewSubmission } = await import("../services/ai/pdfReviewService");
    const result = await gradePdfReviewSubmission(criteria, pdfUrl, session.user.id, gradingMode);

    // Save the submission
    await activityService.submitActivity({
        url: pdfUrl,
        activityId,
        userId: studentUserId,
        grade: result.grade,
        feedback: result.feedback
    });

    // Auditoría
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [activity, student] = await Promise.all([
        prisma.activity.findUnique({ where: { id: activityId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: studentUserId }, select: { name: true } })
    ]);

    await auditLogger.logGrade(
        activityId,
        activity?.title || "Actividad",
        student?.name || "Estudiante",
        result.grade,
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    return result;
}

export async function gradeCodeChallengeAction(
    activityId: string,
    studentUserId: string,
    studentCode: string,
    language: string,
    statement: string,
    courseId: string,
    testCases?: Array<{ input: string; expectedOutput: string; isSecret?: boolean }>,
    testExecutionSummary?: { passed: number; total: number; details?: string },
    gradingMode: "normal" | "moderate" | "strict" = "moderate",
    files?: Array<{ name: string; content: string }>
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradeCodeChallenge } = await import("../services/ai/codeChallengeService");
    const result = await gradeCodeChallenge({
        studentCode,
        files,
        language,
        statement,
        testCases,
        testExecutionSummary,
        gradingMode,
        teacherId: session.user.id,
    });

    return result;
}

export async function testGradeCodeChallengeAction(
    files: Array<{ name: string; content: string }>,
    language: string,
    statement: string,
    gradingMode: "normal" | "moderate" | "strict" = "moderate",
    testCases?: Array<{ input: string; expectedOutput: string; isSecret?: boolean }>
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradeCodeChallenge } = await import("../services/ai/codeChallengeService");
    const result = await gradeCodeChallenge({
        studentCode: files[0]?.content || "",
        files,
        language,
        statement,
        testCases,
        gradingMode,
        teacherId: session.user.id,
    });

    return result;
}

export async function gradeVideoPitchAction(
    activityId: string,
    studentUserId: string,
    videoUrl: string,
    statement: string,
    courseId: string,
    studentNotes?: string,
    pitchConfig?: {
        maxDurationMinutes?: number;
        requiredTopics?: string[];
        keyQuestions?: string[];
    },
    gradingMode: "normal" | "moderate" | "strict" = "moderate"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradeVideoPitch } = await import("../services/ai/videoPitchService");
    const result = await gradeVideoPitch({
        videoUrl,
        studentNotes,
        statement,
        pitchConfig,
        gradingMode,
        teacherId: session.user.id,
    });

    return result;
}

export async function gradeAudioDefenseAction(
    activityId: string,
    studentUserId: string,
    audioUrl: string,
    statement: string,
    courseId: string,
    studentNotes?: string,
    audioConfig?: {
        maxDurationMinutes?: number;
        requiredTopics?: string[];
        keyQuestions?: string[];
    },
    gradingMode: "normal" | "moderate" | "strict" = "moderate"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradeAudioDefense } = await import("../services/ai/audioDefenseService");
    const result = await gradeAudioDefense({
        audioUrl,
        studentNotes,
        statement,
        audioConfig,
        gradingMode,
        teacherId: session.user.id,
    });

    return result;
}

export async function getNextInterviewQuestionAction(
    activityId: string,
    history: Array<{ role: "interviewer" | "student"; content: string }>,
    questionNumber: number,
    totalQuestions: number,
    targetRole: string = "Junior"
) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { course: { select: { teacherId: true } } }
    });

    if (!activity) throw new Error("Actividad no encontrada");
    const teacherId = activity.course.teacherId;

    const { getNextInterviewQuestion } = await import("../services/ai/interviewService");
    return await getNextInterviewQuestion({
        statement: activity.statement || "",
        targetRole,
        history,
        questionNumber,
        totalQuestions,
        teacherId,
    });
}

export async function gradeInterviewAction(
    activityId: string,
    studentUserId: string,
    history: Array<{ role: "interviewer" | "student"; content: string }>,
    statement: string,
    courseId: string,
    targetRole: string = "Junior",
    gradingMode: "normal" | "moderate" | "strict" = "moderate"
) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { course: { select: { teacherId: true } } }
    });

    if (!activity) throw new Error("Actividad no encontrada");
    const teacherId = activity.course.teacherId;

    const { gradeInterview } = await import("../services/ai/interviewService");
    const result = await gradeInterview({
        statement,
        targetRole,
        history,
        gradingMode,
        teacherId,
    });

    return result;
}

export async function gradeDbModelingAction(
    activityId: string,
    studentUserId: string,
    diagramCode: string,
    sqlScript: string,
    statement: string,
    courseId: string,
    dbConfig?: {
        deliveryMode?: "sandbox" | "cloud";
        targetEngine?: string;
        requiredEntities?: string[];
        requiredNormalization?: string;
    },
    gradingMode: "normal" | "moderate" | "strict" = "moderate",
    connectionString?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { gradeDbModeling } = await import("../services/ai/dbModelingService");
    const result = await gradeDbModeling({
        diagramCode,
        sqlScript,
        connectionString,
        statement,
        dbConfig,
        gradingMode,
        teacherId: session.user.id,
    });

    return result;
}
