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
    status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEAVE_EARLY",
    arrivalTime?: Date | string | null,
    justification?: string | null,
    departureTime?: Date | string | null
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    
    // Convert arrivalTime to Date if it's a string
    const finalArrivalTime = typeof arrivalTime === 'string' ? new Date(arrivalTime) : arrivalTime;
    const finalDepartureTime = typeof departureTime === 'string' ? new Date(departureTime) : departureTime;

    const attendance = await attendanceService.recordAttendance(
        courseId, 
        userId, 
        date, 
        status, 
        finalArrivalTime, 
        justification,
        finalDepartureTime
    ) as any;
    
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

    // 🔔 PUSH NOTIFICATION
    try {
        const statusMap: Record<string, string> = {
            PRESENT: "Presente (Asistió)",
            ABSENT: "Falta (Inasistencia)",
            EXCUSED: "Justificado",
            LATE: "Tarde (Llegada Tarde)",
            LEAVE_EARLY: "Retiro (Salida Temprana)"
        };
        const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
        const formattedDate = typeof date === 'string' ? date : new Date(date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
        
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await sendPushNotification(userId, {
            title: "Registro de Asistencia 📋",
            body: `Se ha registrado tu asistencia en "${course?.title || 'Curso'}" para el ${formattedDate} como: ${statusMap[status] || status}.`,
            url: `/dashboard/student/attendance`
        });
    } catch (pushError) {
        console.error("Failed to send attendance push notification:", pushError);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function recordAttendanceBatchAction(
    courseId: string,
    date: Date | string,
    records: { 
        userId: string; 
        status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEAVE_EARLY"; 
        arrivalTime?: Date | string | null; 
        departureTime?: Date | string | null;
        justification?: string | null 
    }[]
) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    
    const formattedRecords = records.map(r => ({
        userId: r.userId,
        status: r.status,
        arrivalTime: typeof r.arrivalTime === 'string' ? new Date(r.arrivalTime) : r.arrivalTime,
        departureTime: typeof r.departureTime === 'string' ? new Date(r.departureTime) : r.departureTime,
        justification: r.justification
    }));

    await attendanceService.recordAttendanceBatch(courseId, date, formattedRecords);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
    
    await auditLogger.log({
        action: "UPDATE",
        entity: "ATTENDANCE",
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Registro de asistencia masivo realizado en el curso ${course?.title || "Curso"} para la fecha ${typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0]}. Total registros: ${records.length}`,
        success: true,
    });

    // 🔔 PUSH NOTIFICATIONS (BATCH)
    try {
        const statusMap: Record<string, string> = {
            PRESENT: "Presente (Asistió)",
            ABSENT: "Falta (Inasistencia)",
            EXCUSED: "Justificado",
            LATE: "Tarde (Llegada Tarde)",
            LEAVE_EARLY: "Retiro (Salida Temprana)"
        };
        const formattedDate = typeof date === 'string' ? date : new Date(date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
        
        const { sendPushNotification } = await import("@/lib/push-notifications");
        await Promise.all(
            records.map(r => 
                sendPushNotification(r.userId, {
                    title: "Registro de Asistencia 📋",
                    body: `Se ha registrado tu asistencia en "${course?.title || 'Curso'}" para el ${formattedDate} como: ${statusMap[r.status] || r.status}.`,
                    url: `/dashboard/student/attendance`
                }).catch(err => console.error(`Error sending batch push for user ${r.userId}:`, err))
            )
        );
    } catch (pushError) {
        console.error("Failed to send batch attendance push notifications:", pushError);
    }

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

export async function getCourseAttendanceForDateAction(courseId: string, date: Date | string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.getCourseAttendanceForDate(courseId, date);
}

export async function getCourseScheduleAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }
    return await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            startTime: true,
            endTime: true,
            classDays: true
        }
    });
}

/**
 * Batch version: fetches absence/late/leaveEarly counts for ALL students
 * in a single GROUP BY query. Use this instead of calling
 * getStudentAttendanceStatsAction per student.
 */
export async function getCourseAllStudentsAttendanceStatsAction(
    courseId: string
): Promise<Record<string, { absences: number; late: number; leaveEarly: number }>> {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.getAllStudentsAttendanceStats(courseId);
}

export async function getCourseAllAttendanceRecordsAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.getCourseAttendance(courseId);
}
