import { AttendanceStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { toUTCStartOfDay, toUTCStartOfDayFromLocal } from "@/lib/dateUtils";


export const attendanceService = {
    async recordAttendance(
        courseId: string,
        userId: string,
        date: Date | string,
        status: AttendanceStatus,
        arrivalTime?: Date | null,
        justification?: string | null,
        departureTime?: Date | null
    ) {
        // Normalize date to start of day in UTC to avoid timezone shifts
        const normalizedDate = typeof date === 'string'
            ? new Date(`${date.split('T')[0]}T00:00:00.000Z`)
            : toUTCStartOfDayFromLocal(date);

        // If status is LATE and no arrivalTime is provided, use current time
        // If status is NOT LATE, arrivalTime should be null
        const finalArrivalTime = status === "LATE" 
            ? (arrivalTime || new Date()) 
            : null;

        // If status is LEAVE_EARLY and no departureTime is provided, use current time
        // If status is NOT LEAVE_EARLY, departureTime should be null
        const finalDepartureTime = status === "LEAVE_EARLY"
            ? (departureTime || new Date())
            : null;

        const finalJustification = (status === "EXCUSED" || status === "LATE" || status === "LEAVE_EARLY")
            ? justification
            : null;

        return await prisma.attendance.upsert({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId,
                    date: normalizedDate,
                },
            },
            update: {
                status,
                arrivalTime: finalArrivalTime,
                departureTime: finalDepartureTime,
                justification: finalJustification,
            },
            create: {
                courseId,
                userId,
                date: normalizedDate,
                status,
                arrivalTime: finalArrivalTime,
                departureTime: finalDepartureTime,
                justification: finalJustification,
            },
            include: {
                user: { select: { name: true } },
                course: { select: { title: true } }
            }
        });
    },

    async recordAttendanceBatch(
        courseId: string,
        date: Date | string,
        records: { 
            userId: string; 
            status: AttendanceStatus; 
            arrivalTime?: Date | null; 
            departureTime?: Date | null;
            justification?: string | null 
        }[]
    ) {
        const normalizedDate = typeof date === 'string'
            ? new Date(`${date.split('T')[0]}T00:00:00.000Z`)
            : toUTCStartOfDayFromLocal(date);

        return await prisma.$transaction(
            records.map(r => {
                const finalArrivalTime = r.status === "LATE" 
                    ? (r.arrivalTime || new Date()) 
                    : null;
                const finalDepartureTime = r.status === "LEAVE_EARLY"
                    ? (r.departureTime || new Date())
                    : null;
                const finalJustification = (r.status === "EXCUSED" || r.status === "LATE" || r.status === "LEAVE_EARLY")
                    ? r.justification
                    : null;

                return prisma.attendance.upsert({
                    where: {
                        courseId_userId_date: {
                            courseId,
                            userId: r.userId,
                            date: normalizedDate,
                        },
                    },
                    update: {
                        status: r.status,
                        arrivalTime: finalArrivalTime,
                        departureTime: finalDepartureTime,
                        justification: finalJustification,
                    },
                    create: {
                        courseId,
                        userId: r.userId,
                        date: normalizedDate,
                        status: r.status,
                        arrivalTime: finalArrivalTime,
                        departureTime: finalDepartureTime,
                        justification: finalJustification,
                    }
                });
            })
        );
    },

    async getCourseAttendanceForDate(courseId: string, date: Date | string) {
        const normalizedDate = typeof date === 'string'
            ? new Date(`${date.split('T')[0]}T00:00:00.000Z`)
            : toUTCStartOfDayFromLocal(date);

        return await prisma.attendance.findMany({
            where: {
                courseId,
                date: normalizedDate
            },
            select: {
                id: true,
                userId: true,
                status: true,
                arrivalTime: true,
                departureTime: true,
                justification: true
            }
        });
    },

    async generateLateCode(courseId: string) {
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        return await prisma.course.update({
            where: { id: courseId },
            data: {
                lateCode: code,
                lateCodeExpiresAt: null, // Permanent code
            },
        });
    },

    async deleteLateCode(courseId: string) {
        return await prisma.course.update({
            where: { id: courseId },
            data: {
                lateCode: null,
                lateCodeExpiresAt: null,
            },
        });
    },

    async registerLateArrival(courseId: string, userId: string, code: string, justification: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course || !course.lateCode) {
            throw new Error("No hay un código activo para este curso.");
        }

        if (course.lateCode !== code) {
            throw new Error("Código inválido.");
        }

        // Only check expiration if it exists (backward compatibility or future use)
        if (course.lateCodeExpiresAt && new Date() > course.lateCodeExpiresAt) {
            throw new Error("El código ha expirado.");
        }

        // Find existing attendance record for "today" (UTC range)
        // We define "today" as the current UTC date (server always runs in UTC)
        const now = new Date();
        const todayUTC = toUTCStartOfDay(now);

        // We look for a record with exactly this date, or create one if it doesn't exist (though late usually implies there was a session)
        // Adjusting logic: Late arrival means they missed the roll call earlier TODAY.

        const existingRecord = await prisma.attendance.findUnique({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId,
                    date: todayUTC
                }
            }
        });

        // If no record exists for today, we create a new one with LATE status

        return await prisma.attendance.upsert({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId,
                    date: todayUTC,
                },
            },
            update: {
                status: "LATE",
                arrivalTime: new Date(),
                justification,
            },
            create: {
                courseId,
                userId,
                date: todayUTC,
                status: "LATE",
                arrivalTime: new Date(),
                justification,
            },
        });
    },

    async registerAbsenceJustification(courseId: string, userId: string, date: Date | string, url: string | undefined | null, reason: string) {
        // Validate Google Drive URL if provided
        if (url) {
            const googleDriveRegex = /^https:\/\/(drive|docs)\.google\.com\/.+/;
            if (!googleDriveRegex.test(url)) {
                throw new Error("El enlace debe ser de Google Drive o Google Docs.");
            }

            // Check if URL is accessible (public)
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (!response.ok) {
                    throw new Error("El enlace no es accesible. Asegúrate de que sea público.");
                }
            } catch (error) {
                throw new Error("No se pudo verificar el enlace. Asegúrate de que sea válido y público.");
            }
        }

        const normalizedDate = typeof date === 'string' ? new Date(date) : toUTCStartOfDay(date);

        // Check current status to preserve LATE if it already exists
        const currentRecord = await prisma.attendance.findUnique({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId,
                    date: normalizedDate,
                },
            },
        });

        const newStatus = (currentRecord?.status === "LATE" || currentRecord?.status === "LEAVE_EARLY") ? currentRecord.status : "EXCUSED";

        return await prisma.attendance.upsert({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId,
                    date: normalizedDate,
                },
            },
            update: {
                status: newStatus,
                justification: reason,
                justificationUrl: url,
            },
            create: {
                courseId,
                userId,
                date: normalizedDate,
                status: "EXCUSED",
                justification: reason,
                justificationUrl: url,
            },
        });
    },

    async deleteJustification(attendanceId: string) {
        const record = await prisma.attendance.findUnique({
            where: { id: attendanceId },
        });

        if (!record) {
            throw new Error("Registro de asistencia no encontrado");
        }

        if (record.status === "EXCUSED") {
            // If excused, revert to ABSENT and clear justification
            return await prisma.attendance.update({
                where: { id: attendanceId },
                data: {
                    status: "ABSENT",
                    justification: null,
                    justificationUrl: null,
                },
            });
        } else if (record.status === "LATE" || record.status === "LEAVE_EARLY") {
            // If late or leave early, keep current status but clear justification
            return await prisma.attendance.update({
                where: { id: attendanceId },
                data: {
                    justification: null,
                    justificationUrl: null,
                },
            });
        } else {
            throw new Error("No hay justificación para eliminar en este registro");
        }
    },

    async deleteAttendanceRecord(attendanceId: string) {
        const record = await prisma.attendance.findUnique({
            where: { id: attendanceId },
        });

        if (!record) {
            throw new Error("Registro de asistencia no encontrado");
        }

        // Completely delete the attendance record
        return await prisma.attendance.delete({
            where: { id: attendanceId },
        });
    },

    async deleteAttendanceByDetails(courseId: string, userId: string, date: Date | string) {
        const normalizedDate = typeof date === 'string'
            ? new Date(date)
            : toUTCStartOfDay(date);

        try {
            return await prisma.attendance.delete({
                where: {
                    courseId_userId_date: {
                        courseId,
                        userId,
                        date: normalizedDate,
                    },
                },
            });
        } catch (error) {
            // If it doesn't exist, we don't need to do anything
            return null;
        }
    },

    async getCourseAttendance(courseId: string) {
        return await prisma.attendance.findMany({
            where: { courseId },
            orderBy: { date: "desc" },
        });
    },

    async getStudentAttendanceStats(courseId: string, userId: string, totalSessions?: number) {
        // Parallelize fetching student records and course sessions (if not provided)
        const [studentRecords, sessionCount] = await Promise.all([
            prisma.attendance.findMany({
                where: { courseId, userId },
                orderBy: { date: "desc" },
            }),
            totalSessions !== undefined 
                ? Promise.resolve(totalSessions)
                : prisma.attendance.groupBy({
                    by: ["date"],
                    where: { courseId },
                }).then(groups => groups.length)
        ]);

        const counts = {
            ABSENT: 0,
            PRESENT: 0,
            EXCUSED: 0,
            LATE: 0,
            LEAVE_EARLY: 0
        };

        studentRecords.forEach(r => {
            if (r.status in counts) {
                counts[r.status as keyof typeof counts]++;
            }
        });

        // Calculate percentage: (Present + Excused + Late + Leave Early) / Total Sessions
        const attendedSessions = counts.PRESENT + counts.EXCUSED + counts.LATE + counts.LEAVE_EARLY;
        const attendancePercentage = sessionCount > 0 ? (attendedSessions / sessionCount) * 100 : 100;

        return {
            totalSessions: sessionCount,
            absences: counts.ABSENT,
            presents: counts.PRESENT,
            excused: counts.EXCUSED,
            late: counts.LATE,
            leaveEarly: counts.LEAVE_EARLY,
            attendancePercentage,
            records: studentRecords,
        };
    },

    async getAbsentStudentsForToday(courseId: string) {
        const today = toUTCStartOfDay(new Date());
        return await prisma.attendance.findMany({
            where: {
                courseId,
                date: today,
                status: "ABSENT"
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Batch: returns a map of userId → { absences, late, leaveEarly }
     * for all students in a course using a single GROUP BY query.
     * Replaces the N individual getStudentAttendanceStats calls in the list view.
     */
    async getAllStudentsAttendanceStats(courseId: string): Promise<Record<string, { absences: number; late: number; leaveEarly: number }>> {
        const rows = await prisma.attendance.groupBy({
            by: ["userId", "status"],
            where: { courseId },
            _count: { _all: true },
        });

        const result: Record<string, { absences: number; late: number; leaveEarly: number }> = {};
        for (const row of rows) {
            if (!result[row.userId]) {
                result[row.userId] = { absences: 0, late: 0, leaveEarly: 0 };
            }
            if (row.status === "ABSENT")      result[row.userId].absences   += row._count._all;
            if (row.status === "LATE")         result[row.userId].late        += row._count._all;
            if (row.status === "LEAVE_EARLY")  result[row.userId].leaveEarly  += row._count._all;
        }
        return result;
    },
};
