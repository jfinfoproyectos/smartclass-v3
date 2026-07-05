"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { activityService } from "../../teacher/services/activityService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { isValidPdfUrl } from "@/lib/utils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function submitActivityAction(prevState: any, formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        return { message: "Unauthorized", error: true };
    }

    const url = formData.get("url") as string;
    const activityId = formData.get("activityId") as string;

    try {
        const submission = await activityService.submitActivity({
            url,
            activityId,
            userId: session.user.id,
        });

        // 🎯 AUDIT LOG
        const { auditLogger } = await import("../../admin/services/auditLogger");


        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            select: { title: true }
        });

        await auditLogger.logSubmission(
            submission.id,
            activity?.title || "Actividad",
            session.user.id,
            session.user.name || "Estudiante",
            submission.attemptCount
        );

        revalidatePath("/dashboard/student");
        return { message: "Entrega exitosa", error: false };
    } catch (error: any) {
        console.error("Submission error:", error);

        // 🎯 AUDIT LOG - Error
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.logError(
            "SUBMIT",
            "SUBMISSION",
            `Error al entregar actividad: ${error.message}`,
            error.message,
            session.user.id,
            session.user.name || "Estudiante"
        );

        return { message: error.message || "Error al realizar la entrega", error: true };
    }
}

export async function submitGithubActivityAction(activityId: string, repoUrl: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await activityService.submitActivity({
        url: repoUrl,
        activityId,
        userId: session.user.id,
        // Sin grade ni feedback — el profesor lo asignará
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { title: true }
    });

    await auditLogger.logSubmission(
        submission.id,
        activity?.title || "Actividad",
        session.user.id,
        session.user.name || "Estudiante",
        submission.attemptCount
    );

    revalidatePath("/dashboard/student");
}

export async function submitPdfActivityAction(activityId: string, url: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    // VALIDACIÓN DE PDF
    if (!isValidPdfUrl(url)) {
        throw new Error("El enlace proporcionado no parece ser un documento PDF válido. Asegúrate de usar Google Drive, OneDrive, Dropbox o un enlace directo .pdf");
    }

    const submission = await activityService.submitActivity({
        url,
        activityId,
        userId: session.user.id,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { title: true }
    });

    await auditLogger.logSubmission(
        submission.id,
        activity?.title || "Actividad",
        session.user.id,
        session.user.name || "Estudiante",
        submission.attemptCount
    );

    revalidatePath("/dashboard/student");
}
