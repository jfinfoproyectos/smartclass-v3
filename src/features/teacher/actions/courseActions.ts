"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { parseISOAsUTC } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher" && session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    const docProjectId = docProjectIdRaw === "none" ? undefined : (docProjectIdRaw || undefined);

    const course = await courseService.createCourse({
        title,
        description,
        docProjectId,
        teacherId: session.user.id,
        startDate: startDateStr ? parseISOAsUTC(startDateStr) : undefined,
        endDate: endDateStr ? parseISOAsUTC(endDateStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseCreate(
        course.id,
        title,
        session.user.id,
        session.user.name || "Usuario"
    );

    revalidatePath("/dashboard/teacher");
}

export async function cloneCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher" && session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const sourceCourseId = formData.get("sourceCourseId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    const docProjectId = docProjectIdRaw === "none" ? undefined : (docProjectIdRaw || undefined);

    const course = await courseService.cloneCourse(sourceCourseId, {
        title,
        description,
        docProjectId,
        teacherId: session.user.id,
        startDate: startDateStr ? parseISOAsUTC(startDateStr) : undefined,
        endDate: endDateStr ? parseISOAsUTC(endDateStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseCreate(
        course.id,
        title,
        session.user.id,
        session.user.name || "Usuario"
    );

    revalidatePath("/dashboard/teacher");
}

export async function updateCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const courseId = formData.get("courseId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const docProjectIdRaw = formData.get("docProjectId") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;

    const docProjectId = docProjectIdRaw === "none" ? null : (docProjectIdRaw || undefined);

    await courseService.updateCourse(courseId, {
        title,
        description,
        docProjectId,
        startDate: startDateStr ? parseISOAsUTC(startDateStr) : undefined,
        endDate: endDateStr ? parseISOAsUTC(endDateStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseUpdate(
        courseId,
        title,
        session.user.id,
        session.user.name || "Profesor",
        { title, description, startDate: startDateStr, endDate: endDateStr }
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/admin");
}

export async function deleteCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const courseId = formData.get("courseId") as string;
    const confirmText = formData.get("confirmText") as string;

    if (confirmText !== "ELIMINAR") {
        throw new Error("Confirmación incorrecta");
    }

    // Get course info before deletion
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true }
    });

    // TODO: Add check if teacher owns the course if not admin
    await courseService.deleteCourse(courseId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logCourseDelete(
        courseId,
        course?.title || "Curso",
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/admin");
}

export async function toggleCourseRegistrationAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    await courseService.toggleCourseRegistration(courseId);
    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/student");
}

export async function updateRegistrationSettingsAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const courseId = formData.get("courseId") as string;
    const isOpen = formData.get("isOpen") === "true";
    const deadlineStr = formData.get("deadline") as string;

    await courseService.updateCourseRegistration(
        courseId,
        isOpen,
        deadlineStr ? parseISOAsUTC(deadlineStr) : undefined
    );

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/student");
}

// Generates or regenerates a unique 6-char enrollment code for the course
export async function generateEnrollmentCodeAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Generate a random 6-char uppercase alphanumeric code
    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars: 0,O,1,I
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    };

    // Try until unique (practically instant)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
        const existing = await prisma.course.findUnique({ where: { enrollmentCode: code } });
        if (!existing) break;
        code = generateCode();
        attempts++;
    }

    await prisma.course.update({
        where: { id: courseId },
        data: { enrollmentCode: code },
    });

    revalidatePath("/dashboard/teacher");
    return { code };
}

// Simple toggle: open/close course registration
export async function toggleCourseRegistrationSimpleAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { registrationOpen: true },
    });

    if (!course) throw new Error("Course not found");

    await prisma.course.update({
        where: { id: courseId },
        data: { registrationOpen: !course.registrationOpen },
    });

    revalidatePath("/dashboard/teacher");
    revalidatePath("/dashboard/student");
}
