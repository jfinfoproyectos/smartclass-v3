"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function recordAttendanceAction(
    courseId: string,
    userId: string,
    date: Date | string,
    status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE",
    arrivalTime?: Date | string | null
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    
    // Convert arrivalTime to Date if it's a string
    const finalArrivalTime = typeof arrivalTime === 'string' ? new Date(arrivalTime) : arrivalTime;

    const attendance = await attendanceService.recordAttendance(courseId, userId, date, status, finalArrivalTime) as any;
    
    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");

    await auditLogger.logAttendance(
        attendance.id,
        attendance.course?.title || "Curso",
        attendance.user?.name || "Estudiante",
        status,
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function deleteAttendanceAction(
    courseId: string,
    userId: string,
    date: Date | string,
    attendanceId?: string
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    
    if (attendanceId) {
        await attendanceService.deleteAttendanceRecord(attendanceId);
    } else {
        await attendanceService.deleteAttendanceByDetails(courseId, userId, date);
    }

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await auditLogger.log({
        action: "DELETE",
        entity: "ATTENDANCE",
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Registro de asistencia eliminado para ${student?.name || "Estudiante"} en el curso ${course?.title || "Curso"} para la fecha ${typeof date === 'string' ? date : date.toISOString().split('T')[0]}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function generateLateCodeAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.generateLateCode(courseId);
}

export async function deleteLateCodeAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.deleteLateCode(courseId);
}

export async function deleteJustificationAction(attendanceId: string, courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    await attendanceService.deleteJustification(attendanceId);
    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function deleteAttendanceRecordAction(attendanceId: string, courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // Get attendance info before deletion for audit log
    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
            user: { select: { name: true } },
            course: { select: { title: true } }
        }
    });

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    await attendanceService.deleteAttendanceRecord(attendanceId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "ATTENDANCE",
        entityId: attendanceId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Registro de asistencia eliminado: ${attendance?.user.name || "Estudiante"} en ${attendance?.course.title || "Curso"} (${attendance?.date ? new Date(attendance.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : "fecha desconocida"})`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getAbsentStudentsForTodayAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.getAbsentStudentsForToday(courseId);
}

export async function getCourseSessionsCountAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    const sessions = await attendanceService.getCourseAttendance(courseId);
    
    // Get unique dates
    const uniqueDates = new Set(
        sessions.map(s => s.date instanceof Date ? s.date.toISOString().split('T')[0] : new Date(s.date).toISOString().split('T')[0])
    );
    
    return uniqueDates.size;
}
