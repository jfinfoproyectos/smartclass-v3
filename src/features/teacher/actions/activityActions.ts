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
    const type = formData.get("type") as "GITHUB" | "MANUAL" | "GOOGLE_COLAB" | "PDF_REVIEW" | "CODE_PROJECT";
    const weightStr = formData.get("weight") as string;
    const maxAttemptsStr = formData.get("maxAttempts") as string;
    const allowLinkSubmissionStr = formData.get("allowLinkSubmission") as string;

    console.log("SERVER ACTION: createActivityAction received:", { title, courseId, type });

    const activity = await activityService.createActivity({
        title,
        description,
        statement,
        filePaths,
        deadline: deadlineStr ? new Date(deadlineStr) : new Date(),
        openDate: openDateStr ? new Date(openDateStr) : undefined,
        courseId,
        type: type || "GITHUB",
        weight: weightStr ? parseFloat(weightStr) : 1.0,
        maxAttempts: maxAttemptsStr ? parseInt(maxAttemptsStr) : 1,
        allowLinkSubmission: allowLinkSubmissionStr === "true",
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
    const type = formData.get("type") as "GITHUB" | "MANUAL" | "GOOGLE_COLAB" | "PDF_REVIEW" | "CODE_PROJECT" | null;
    const weightStr = formData.get("weight") as string | null;
    const maxAttemptsStr = formData.get("maxAttempts") as string | null;
    const allowLinkSubmissionStr = formData.get("allowLinkSubmission") as string | null;

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
