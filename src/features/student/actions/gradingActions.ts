"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { activityService } from "../../teacher/services/activityService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function gradeGoogleColabAction(activityId: string, colabUrl: string, statement: string, gradingMode: string = "normal") {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { course: { select: { teacherId: true } } }
    });
    const teacherId = activity?.course.teacherId;

    const { gradeGoogleColabSubmission } = await import("../../teacher/services/ai/gradingService");
    const result = await gradeGoogleColabSubmission(statement, colabUrl, teacherId, gradingMode);

    // Log API usage if global key is active
    if (result.apiRequestsCount) {
        const settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });
        if (settings?.geminiApiKeyMode === "GLOBAL" && settings?.encryptedGlobalApiKey) {
            const { auditLogger } = await import("../../admin/services/auditLogger");
            await auditLogger.logGeminiApiUsage(
                session.user.id,
                session.user.name || "Usuario",
                session.user.role || "student",
                result.apiRequestsCount
            );
        }
    }

    // Save the submission
    await activityService.submitActivity({
        url: colabUrl,
        activityId,
        userId: session.user.id,
        grade: result.grade,
        feedback: result.feedback + (result.apiRequestsCount ? `\n\n*(Peticiones a la API de Gemini: ${result.apiRequestsCount})*` : "")
    });

    revalidatePath("/dashboard/student");
    return result;
}
