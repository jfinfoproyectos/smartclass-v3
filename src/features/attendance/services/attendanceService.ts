import { AttendanceStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { toUTCStartOfDay, toUTCStartOfDayFromLocal } from "@/lib/dateUtils";


export const attendanceService = {
    async recordAttendance(
        courseId: string,
        userId: string,
        date: Date | string,
        status: AttendanceStatus,
        arrivalTime?: Date | null
    ) {
        // Normalize date to start of day in UTC to avoid timezone shifts
        const normalizedDate = typeof date === 'string'
            ? new Date(date)
            : toUTCStartOfDayFromLocal(date);

        // If status is LATE and no arrivalTime is provided, use current time
        // If status is NOT LATE, arrivalTime should be null
        const finalArrivalTime = status === "LATE" 
            ? (arrivalTime || new Date()) 
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
            },
            create: {
                courseId,
                userId,
                date: normalizedDate,
                status,
                arrivalTime: finalArrivalTime,
            },
            include: {
                user: { select: { name: true } },
                course: { select: { title: true } }
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

        const newStatus = currentRecord?.status === "LATE" ? "LATE" : "EXCUSED";

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
        } else if (record.status === "LATE") {
            // If late, keep LATE but clear justification
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
            LATE: 0
        };

        studentRecords.forEach(r => {
            if (r.status in counts) {
                counts[r.status as keyof typeof counts]++;
            }
        });

        // Calculate percentage: (Present + Excused + Late) / Total Sessions
        const attendedSessions = counts.PRESENT + counts.EXCUSED + counts.LATE;
        const attendancePercentage = sessionCount > 0 ? (attendedSessions / sessionCount) * 100 : 100;

        return {
            totalSessions: sessionCount,
            absences: counts.ABSENT,
            presents: counts.PRESENT,
            excused: counts.EXCUSED,
            late: counts.LATE,
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
    }
};
