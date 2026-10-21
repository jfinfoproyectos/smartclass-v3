"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatName } from "@/lib/utils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

import {
    type PerformanceDayConfig,
    type StudentDayPerformance,
    type StudentPerformanceRecord,
    generatePerformanceClassDates,
} from "../utils/performanceUtils";

export type {
    PerformanceDayConfig,
    StudentDayPerformance,
    StudentPerformanceRecord,
};

// Fetch complete performance evaluation data for course and activity
export async function getPerformanceEvaluationDataAction(activityId: string, courseId: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("No autenticado");
    }

    const [activity, enrollments, attendances, submissions] = await Promise.all([
        prisma.activity.findUnique({
            where: { id: activityId },
            include: { course: true }
        }),
        prisma.enrollment.findMany({
            where: { courseId, status: "APPROVED" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: true,
                    }
                }
            },
            orderBy: {
                user: { name: "asc" }
            }
        }),
        prisma.attendance.findMany({
            where: { courseId },
            orderBy: { date: "asc" }
        }),
        prisma.submission.findMany({
            where: { activityId },
            select: {
                id: true,
                userId: true,
                grade: true,
                url: true,
                feedback: true,
                lastSubmittedAt: true,
                attemptCount: true,
            }
        })
    ]);

    if (!activity) {
        throw new Error("Actividad no encontrada");
    }

    // Parse performance configuration from description
    let performanceConfig = {
        startDate: activity.openDate ? activity.openDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        endDate: activity.deadline ? activity.deadline.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        daysOfWeek: [1, 2, 3, 4, 5],
        defaultDailyGrade: 5.0,
        absenceGrade: 0.0,
        tardinessPenalty: 1.0,
        scaleMin: 0.0,
        scaleMax: 5.0,
    };

    if (activity.description) {
        try {
            const parsed = JSON.parse(activity.description);
            if (parsed.performanceConfig) {
                performanceConfig = {
                    ...performanceConfig,
                    ...parsed.performanceConfig,
                };
            }
        } catch {}
    }

    // Generate class dates based on config
    const classDates = generatePerformanceClassDates(
        performanceConfig.startDate,
        performanceConfig.endDate,
        performanceConfig.daysOfWeek
    );

    // Map attendances by `userId_dateStr`
    const attendanceMap = new Map<string, any>();
    attendances.forEach(att => {
        const dateStr = att.date.toISOString().split("T")[0];
        const key = `${att.userId}_${dateStr}`;
        attendanceMap.set(key, att);
    });

    // Map submissions by userId
    const submissionMap = new Map<string, any>();
    submissions.forEach(sub => {
        submissionMap.set(sub.userId, sub);
    });

    // Process students
    const students: StudentPerformanceRecord[] = enrollments.map(enr => {
        const user = enr.user;
        const studentName = formatName(user.name, user.profile);
        const sub = submissionMap.get(user.id);

        let savedDaysMap = new Map<string, any>();
        if (sub && sub.url && sub.url.startsWith("{")) {
            try {
                const parsedUrl = JSON.parse(sub.url);
                if (Array.isArray(parsedUrl.days)) {
                    parsedUrl.days.forEach((d: any) => {
                        if (d && d.date) savedDaysMap.set(d.date, d);
                    });
                }
            } catch {}
        }

        let presentDays = 0;
        let lateDays = 0;
        let absentDays = 0;
        let excusedDays = 0;
        let customGradesCount = 0;
        let gradeSum = 0;

        const days: StudentDayPerformance[] = classDates.map(cfg => {
            const att = attendanceMap.get(`${user.id}_${cfg.date}`);
            const savedDay = savedDaysMap.get(cfg.date);

            const attendanceStatus = (att ? att.status : (savedDay?.attendanceStatus || "NONE")) as StudentDayPerformance["attendanceStatus"];
            const isAbsent = attendanceStatus === "ABSENT";
            const isLate = attendanceStatus === "LATE";
            const isExcused = attendanceStatus === "EXCUSED";
            const isPresent = attendanceStatus === "PRESENT";

            if (isAbsent) absentDays++;
            else if (isLate) lateDays++;
            else if (isExcused) excusedDays++;
            else if (isPresent) presentDays++;

            const defaultBase = performanceConfig.defaultDailyGrade ?? 5.0;
            const penalty = isLate ? (performanceConfig.tardinessPenalty ?? 1.0) : 0;
            
            let finalDayGrade = defaultBase;
            if (isAbsent) {
                finalDayGrade = 0.0;
            } else if (isLate) {
                finalDayGrade = Math.max(0, defaultBase - penalty);
            }

            let manualGrade: number | null = null;
            let teacherNote = savedDay?.teacherNote || "";

            // Check if teacher saved a manual grade for this day (only allowed if not absent)
            if (savedDay && typeof savedDay.manualGrade === "number" && !isAbsent) {
                manualGrade = Math.min(5.0, Math.max(0, savedDay.manualGrade));
                finalDayGrade = manualGrade;
                customGradesCount++;
            } else if (savedDay && typeof savedDay.finalDayGrade === "number" && !isAbsent && savedDay.finalDayGrade !== (isLate ? Math.max(0, defaultBase - penalty) : defaultBase)) {
                manualGrade = Math.min(5.0, Math.max(0, savedDay.finalDayGrade));
                finalDayGrade = manualGrade;
                customGradesCount++;
            }

            // Inasistencia always forces 0.0
            if (isAbsent) {
                finalDayGrade = 0.0;
                manualGrade = null;
            }

            gradeSum += finalDayGrade;

            return {
                date: cfg.date,
                dayOfWeek: cfg.dayOfWeek,
                dayName: cfg.dayName,
                formattedDate: cfg.formattedDate,
                attendanceStatus,
                baseGrade: defaultBase,
                penalty,
                manualGrade,
                finalDayGrade: Number(finalDayGrade.toFixed(2)),
                teacherNote,
                lockedByAbsence: isAbsent,
            };
        });

        const totalDays = classDates.length;
        const finalAverage = totalDays > 0 ? Number((gradeSum / totalDays).toFixed(2)) : 5.0;

        return {
            studentId: user.id,
            studentName,
            email: user.email,
            image: user.image,
            identificacion: user.profile?.identificacion || user.id.slice(0, 8),
            submissionId: sub?.id || null,
            currentGrade: sub?.grade ?? null,
            lastSubmittedAt: sub?.lastSubmittedAt ? sub.lastSubmittedAt.toISOString() : null,
            days,
            finalAverage,
            stats: {
                totalDays,
                presentDays,
                lateDays,
                absentDays,
                excusedDays,
                customGradesCount,
            }
        };
    });

    return {
        activity: {
            id: activity.id,
            title: activity.title,
            courseId: activity.courseId,
            courseTitle: activity.course?.title || "",
            openDate: activity.openDate?.toISOString() || null,
            deadline: activity.deadline?.toISOString() || null,
            statement: activity.statement,
        },
        performanceConfig,
        classDates,
        students,
    };
}

// Save or update an individual student's performance grades
export async function saveStudentPerformanceAction(data: {
    activityId: string;
    courseId: string;
    studentId: string;
    finalGrade: number;
    days: StudentDayPerformance[];
    teacherObservation?: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const { activityId, courseId, studentId, finalGrade, days, teacherObservation } = data;

    if (!activityId || !studentId) {
        throw new Error("Parámetros incompletos");
    }

    const clampedGrade = Math.min(5.0, Math.max(0.0, Number(finalGrade.toFixed(2))));

    const performancePayload = {
        studentId,
        finalGrade: clampedGrade,
        days,
        lastCalculatedAt: new Date().toISOString(),
        teacherObservation: teacherObservation || "",
    };

    const feedback = teacherObservation
        ? `Evaluación de Desempeño: ${clampedGrade.toFixed(1)} / 5.0. ${teacherObservation}`
        : `Evaluación de Desempeño en Clase: ${clampedGrade.toFixed(1)} / 5.0.`;

    const submission = await prisma.submission.upsert({
        where: {
            userId_activityId: {
                userId: studentId,
                activityId,
            }
        },
        update: {
            url: JSON.stringify(performancePayload),
            grade: clampedGrade,
            feedback,
            lastSubmittedAt: new Date(),
        },
        create: {
            activityId,
            userId: studentId,
            url: JSON.stringify(performancePayload),
            grade: clampedGrade,
            feedback,
            attemptCount: 1,
            lastSubmittedAt: new Date(),
        }
    });

    // Audit log
    try {
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "GRADE",
            entity: "SUBMISSION",
            entityId: submission.id,
            userId: session.user.id,
            userName: session.user.name || "Profesor",
            userRole: session.user.role,
            description: `Calificación de desempeño guardada: ${clampedGrade.toFixed(1)}/5.0 para el estudiante (${studentId})`,
            success: true,
        });
    } catch (e) {
        console.warn("Error registering audit log for performance:", e);
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    revalidatePath(`/dashboard/student/activities/${activityId}`);

    return {
        success: true,
        submissionId: submission.id,
        grade: clampedGrade,
    };
}

// Bulk save all students' performance grades
export async function batchSavePerformanceAction(data: {
    activityId: string;
    courseId: string;
    evaluations: Array<{
        studentId: string;
        finalGrade: number;
        days: StudentDayPerformance[];
        teacherObservation?: string;
    }>;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const { activityId, courseId, evaluations } = data;

    let savedCount = 0;
    for (const ev of evaluations) {
        const clampedGrade = Math.min(5.0, Math.max(0.0, Number(ev.finalGrade.toFixed(2))));
        const payload = {
            studentId: ev.studentId,
            finalGrade: clampedGrade,
            days: ev.days,
            lastCalculatedAt: new Date().toISOString(),
            teacherObservation: ev.teacherObservation || "",
        };

        const feedback = ev.teacherObservation
            ? `Evaluación de Desempeño: ${clampedGrade.toFixed(1)} / 5.0. ${ev.teacherObservation}`
            : `Evaluación de Desempeño en Clase: ${clampedGrade.toFixed(1)} / 5.0.`;

        await prisma.submission.upsert({
            where: {
                userId_activityId: {
                    userId: ev.studentId,
                    activityId,
                }
            },
            update: {
                url: JSON.stringify(payload),
                grade: clampedGrade,
                feedback,
                lastSubmittedAt: new Date(),
            },
            create: {
                activityId,
                userId: ev.studentId,
                url: JSON.stringify(payload),
                grade: clampedGrade,
                feedback,
                attemptCount: 1,
                lastSubmittedAt: new Date(),
            }
        });
        savedCount++;
    }

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    revalidatePath(`/dashboard/teacher/courses/${courseId}`);

    return {
        success: true,
        count: savedCount,
    };
}
