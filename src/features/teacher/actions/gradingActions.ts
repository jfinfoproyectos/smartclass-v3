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
    gradingMode: string = "normal"
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
    gradingMode: string = "normal"
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { finalizeSubmission } = await import("../services/ai/gradingService");
    const result = await finalizeSubmission(analyses, statement, missingFiles, session.user.id, totalExpectedFiles, gradingMode);

    const apiRequestsCount = analyses.length + 1;
    const feedbackText = result.feedback + `\n\n*(Calificado por IA - Peticiones API: ${apiRequestsCount})*`;

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
    gradingMode: string = "normal"
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
        feedback: result.feedback + (result.apiRequestsCount ? `\n\n*(Peticiones a la API de Gemini: ${result.apiRequestsCount})*` : "")
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
