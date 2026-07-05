"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../../teacher/services/courseService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function enrollStudentAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const enrollment = await courseService.enrollStudent(session.user.id, courseId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true }
    });

    await auditLogger.logEnrollment(
        enrollment.id,
        course?.title || "Curso",
        session.user.id,
        session.user.name || "Estudiante"
    );

    revalidatePath("/dashboard/student");
}
