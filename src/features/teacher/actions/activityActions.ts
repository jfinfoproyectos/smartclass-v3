"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { activityService } from "../services/activityService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createActivityAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const statement = formData.get("statement") as string;
    const filePaths = formData.get("filePaths") as string;
    const deadlineStr = formData.get("deadline") as string;
    const openDateStr = formData.get("openDate") as string;
    const courseId = formData.get("courseId") as string;
    const type = formData.get("type") as "GITHUB" | "MANUAL" | "PDF_REVIEW" | "CODE_PROJECT" | "CODE_CHALLENGE" | "VIDEO_PITCH" | "AI_INTERVIEW" | "DB_MODELING" | "AUDIO_DEFENSE";
    const weightStr = formData.get("weight") as string;
    const maxAttemptsStr = formData.get("maxAttempts") as string;
    const allowLinkSubmissionStr = formData.get("allowLinkSubmission") as string;
    const isGroupActivityStr = formData.get("isGroupActivity") as string | null;
    const groupScope = formData.get("groupScope") as string | null;

    console.log("SERVER ACTION: createActivityAction received:", { title, courseId, type, isGroupActivity: isGroupActivityStr === "true", groupScope });

    const now = new Date();
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 7);
    defaultEnd.setHours(23, 59, 0, 0);

    const activity = await activityService.createActivity({
        title,
        description,
        statement,
        filePaths,
        deadline: deadlineStr ? new Date(deadlineStr) : defaultEnd,
        openDate: openDateStr ? new Date(openDateStr) : now,
        courseId,
        type: type || "GITHUB",
        weight: weightStr ? parseFloat(weightStr) : 1.0,
        maxAttempts: maxAttemptsStr ? parseInt(maxAttemptsStr) : 1,
        allowLinkSubmission: allowLinkSubmissionStr === "true",
        isGroupActivity: isGroupActivityStr === "true",
        groupScope: (groupScope === "ACTIVITY" ? "ACTIVITY" : "COURSE") as "COURSE" | "ACTIVITY",
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logActivityCreate(
        activity.id,
        title,
        courseId,
        session.user.id,
        session.user.name || "Profesor"
    );

    // 🔔 PUSH NOTIFICATION
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId, status: "APPROVED" },
            select: { userId: true }
        });
        
        if (enrollments.length > 0) {
            const { sendPushNotification } = await import("@/lib/push-notifications");
            await Promise.all(
                enrollments.map(enrollment => 
                    sendPushNotification(enrollment.userId, {
                        title: "Nueva Actividad 📅",
                        body: `Se ha publicado la actividad "${title}" en tu curso.`,
                        url: `/dashboard/student/activities`
                    })
                )
            );
        }
    } catch (pushError) {
        console.error("Failed to dispatch push notifications for new activity:", pushError);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function updateActivityAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("activityId") as string;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const statement = formData.get("statement") as string | null;
    const filePaths = formData.get("filePaths") as string | null;
    const deadlineStr = formData.get("deadline") as string | null;
    const openDateStr = formData.get("openDate") as string | null;
    const courseId = formData.get("courseId") as string;
    const type = formData.get("type") as "GITHUB" | "MANUAL" | "PDF_REVIEW" | "CODE_PROJECT" | "CODE_CHALLENGE" | "VIDEO_PITCH" | "AI_INTERVIEW" | "DB_MODELING" | "AUDIO_DEFENSE" | null;
    const weightStr = formData.get("weight") as string | null;
    const maxAttemptsStr = formData.get("maxAttempts") as string | null;
    const allowLinkSubmissionStr = formData.get("allowLinkSubmission") as string | null;
    const isGroupActivityStr = formData.get("isGroupActivity") as string | null;
    const groupScope = formData.get("groupScope") as string | null;

    await activityService.updateActivity(id, {
        title: title || undefined,
        description: description || undefined,
        statement: statement || undefined,
        filePaths: filePaths || undefined,
        deadline: deadlineStr ? new Date(deadlineStr) : undefined,
        openDate: openDateStr ? new Date(openDateStr) : undefined,
        type: type || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
        maxAttempts: maxAttemptsStr ? parseInt(maxAttemptsStr) : undefined,
        allowLinkSubmission: allowLinkSubmissionStr ? allowLinkSubmissionStr === "true" : undefined,
        isGroupActivity: isGroupActivityStr ? isGroupActivityStr === "true" : undefined,
        groupScope: groupScope ? (groupScope as "COURSE" | "ACTIVITY") : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "ACTIVITY",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Actividad actualizada: ${title || "Sin título"}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    if (id) {
        revalidatePath(`/dashboard/student/activities/${id}`);
        revalidatePath(`/dashboard/teacher/activities/${id}`);
    }
    revalidatePath(`/dashboard/student`);
    revalidatePath(`/dashboard/teacher`);
}

export async function deleteActivityAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const activityId = formData.get("activityId") as string;
    const courseId = formData.get("courseId") as string;
    const confirmText = (formData.get("confirmText") as string) || "";

    if (confirmText !== "ELIMINAR") {
        throw new Error("Confirmación inválida");
    }

    // Get activity info before deletion for audit log
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { title: true }
    });

    await activityService.deleteActivity(activityId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "ACTIVITY",
        entityId: activityId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Actividad eliminada: ${activity?.title || "Desconocida"}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function reorderActivitiesAction(courseId: string, activityIds: string[]) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    await activityService.reorderActivities(courseId, activityIds);
    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function generateChecklistCriteriaAction(
    statement: string, 
    aiModelName?: string,
    options?: {
        isAlternative?: boolean;
        existingCriteria?: Array<{ name: string; question?: string; expectedAnswer?: string }>;
    }
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { generateChecklistCriteria } = await import("../services/ai/activityContentService");
    return await generateChecklistCriteria(statement, session.user.id, aiModelName, options);
}

export async function verifyCriterionRelationAction(
    statement: string,
    criterion: {
        name: string;
        question?: string;
        expectedAnswer?: string;
        description?: string;
    },
    aiModelName?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { verifyCriterionRelation } = await import("../services/ai/activityContentService");
    return await verifyCriterionRelation(statement, criterion, session.user.id, aiModelName);
}

export async function balanceCriteriaPercentagesAction(
    statement: string,
    criteria: Array<{
        id: string;
        name: string;
        question?: string;
        description?: string;
    }>,
    aiModelName?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { balanceCriteriaPercentagesWithAI } = await import("../services/ai/activityContentService");
    return await balanceCriteriaPercentagesWithAI(statement, criteria, session.user.id, aiModelName);
}

export async function generateActivityStatementAction(
    prompt: string,
    activityType: string,
    aiModelName?: string,
    academicLevel?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { generateActivityStatement } = await import("../services/ai/activityContentService");
    return await generateActivityStatement(
        prompt,
        activityType,
        session.user.id,
        aiModelName,
        academicLevel ? { level: academicLevel } : undefined
    );
}

export async function generateCodeFileTemplateAction(
    prompt: string,
    fileName: string,
    language: string,
    context?: {
        activityTitle?: string;
        activityStatement?: string;
        otherFiles?: { name: string }[];
        currentCode?: string;
    },
    aiModelName?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { generateCodeFileTemplate } = await import("../services/ai/activityContentService");
    return await generateCodeFileTemplate(
        prompt,
        fileName,
        language,
        session.user.id,
        context,
        aiModelName
    );
}

export async function generateAllCodeChallengeSolutionsAction(
    files: Array<{ id: string; name: string; content: string }>,
    language: string,
    statement: string,
    activityTitle: string,
    aiModelName?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { generateAllCodeChallengeSolutions } = await import("../services/ai/activityContentService");
    return await generateAllCodeChallengeSolutions(
        files,
        language,
        statement,
        activityTitle,
        session.user.id,
        aiModelName
    );
}

export async function generateRequiredTopicsAction(
    statement: string,
    activityType: "VIDEO_PITCH" | "AUDIO_DEFENSE" | "AI_INTERVIEW",
    activityTitle?: string,
    aiModelName?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { generateRequiredTopics } = await import("../services/ai/activityContentService");
    return await generateRequiredTopics(
        statement,
        activityType,
        activityTitle,
        session.user.id,
        aiModelName
    );
}

