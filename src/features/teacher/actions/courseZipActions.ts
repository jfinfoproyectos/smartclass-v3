"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { courseZipService } from "../services/courseZipService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function exportCourseAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    try {
        return await courseZipService.exportCourseToJSON(courseId);
    } catch (error: any) {
        console.error("Export Action Error:", error);
        throw new Error(error.message || "Error al exportar el curso");
    }
}

export async function importCourseAction(jsonData: any) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    try {
        const newCourse = await courseZipService.importCourseFromJSON(jsonData, session.user.id);
        
        // 🎯 AUDIT LOG
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "CREATE",
            entity: "COURSE",
            entityId: newCourse.id,
            userId: session.user.id,
            userName: session.user.name || "Profesor",
            userRole: session.user.role,
            description: `Curso importado exitosamente desde ZIP: ${newCourse.title}`,
            success: true,
        });

        revalidatePath("/dashboard/teacher");
        return { success: true, courseId: newCourse.id };
    } catch (error: any) {
        console.error("Import Action Error:", error);
        throw new Error(error.message || "Error al importar el curso");
    }
}
