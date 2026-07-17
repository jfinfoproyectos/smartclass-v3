"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function enrollByCodeAction(code: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("No autorizado");
    }

    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode || trimmedCode.length !== 6) {
        throw new Error("El código debe tener 6 caracteres");
    }

    // Find course by enrollment code
    const course = await prisma.course.findUnique({
        where: { enrollmentCode: trimmedCode },
        select: {
            id: true,
            title: true,
        },
    });

    if (!course) {
        throw new Error("Código de inscripción no válido");
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    });

    if (existing) {
        if (existing.status === "APPROVED") {
            throw new Error("Ya estás inscrito en este curso");
        }
        if (existing.status === "PENDING") {
            throw new Error("Tu inscripción en este curso ya está pendiente de aprobación");
        }
    }

    // Enroll directly as APPROVED (code-based enrollment is always approved)
    const enrollment = await prisma.enrollment.create({
        data: {
            userId: session.user.id,
            courseId: course.id,
            status: "APPROVED",
        },
    });

    // Audit log
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logEnrollment(
        enrollment.id,
        course.title,
        session.user.id,
        session.user.name || "Estudiante"
    );

    revalidatePath("/dashboard/student");
    return { courseName: course.title };
}

// Keep legacy action for backward compatibility
export async function enrollStudentAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
        },
    });

    if (!course) throw new Error("Curso no encontrado");

    const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId } },
    });
    if (existing) throw new Error("Ya estás inscrito");

    const enrollment = await prisma.enrollment.create({
        data: { userId: session.user.id, courseId, status: "APPROVED" },
    });

    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logEnrollment(
        enrollment.id,
        course.title,
        session.user.id,
        session.user.name || "Estudiante"
    );

    revalidatePath("/dashboard/student");
}
