"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getStudentAttendanceStatsAction(courseId: string, userId: string, totalSessions?: number) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }

    // Allow teacher to view any student, or student to view their own
    if (session.user.role === "student" && session.user.id !== userId) {
        throw new Error("Unauthorized");
    }

    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.getStudentAttendanceStats(courseId, userId, totalSessions);
}

export async function registerLateArrivalAction(courseId: string, code: string, justification: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.registerLateArrival(courseId, session.user.id, code, justification);
}

export async function registerAbsenceJustificationAction(courseId: string, date: Date | string, url: string | undefined | null, reason: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    const { attendanceService } = await import("../../attendance/services/attendanceService");
    return await attendanceService.registerAbsenceJustification(courseId, session.user.id, date, url, reason);
}
