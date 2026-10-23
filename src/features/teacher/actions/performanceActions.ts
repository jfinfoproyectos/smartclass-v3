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
    type PerformancePenaltyCriterion,
    DEFAULT_PERFORMANCE_CRITERIA,
    generatePerformanceClassDates,
    computeStudentDayGrade,
} from "../utils/performanceUtils";
import { getRegionalDateOnly, getTodayDateString, toUTCStartOfDayFromRegional, isFutureDate } from "@/lib/dateUtils";

export type {
    PerformanceDayConfig,
    StudentDayPerformance,
    StudentPerformanceRecord,
    PerformancePenaltyCriterion,
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
    const courseStartDate = activity.course?.startDate ? getRegionalDateOnly(activity.course.startDate) : null;
    const courseEndDate = activity.course?.endDate ? getRegionalDateOnly(activity.course.endDate) : null;

    let performanceConfig = {
        startDate: courseStartDate || (activity.openDate ? getRegionalDateOnly(activity.openDate) : getTodayDateString()),
        endDate: courseEndDate || (activity.deadline ? getRegionalDateOnly(activity.deadline) : getTodayDateString()),
        daysOfWeek: [1, 2, 3, 4, 5],
        defaultDailyGrade: 5.0,
        absenceGrade: 0.0,
        tardinessPenalty: 1.0,
        scaleMin: 0.0,
        scaleMax: 5.0,
        criteria: DEFAULT_PERFORMANCE_CRITERIA as PerformancePenaltyCriterion[],
    };

    if (activity.description) {
        try {
            const parsed = JSON.parse(activity.description);
            if (parsed.performanceConfig) {
                performanceConfig = {
                    ...performanceConfig,
                    ...parsed.performanceConfig,
                    startDate: courseStartDate || parsed.performanceConfig.startDate || performanceConfig.startDate,
                    endDate: courseEndDate || parsed.performanceConfig.endDate || performanceConfig.endDate,
                    criteria: Array.isArray(parsed.performanceConfig.criteria) && parsed.performanceConfig.criteria.length > 0
                        ? parsed.performanceConfig.criteria
                        : DEFAULT_PERFORMANCE_CRITERIA,
                };
            }
        } catch {}
    }

    // Collect all dates that have recorded attendance in this course
    const attendanceDates = Array.from(new Set(
        attendances.map(att => att.date.toISOString().split("T")[0])
    ));

    // Generate class dates based on config + recorded attendances
    const classDates = generatePerformanceClassDates(
        performanceConfig.startDate,
        performanceConfig.endDate,
        performanceConfig.daysOfWeek,
        attendanceDates
    );

    // Map attendances by `userId_dateStr` using UTC date string (exact calendar date)
    const attendanceMap = new Map<string, any>();
    attendances.forEach(att => {
        const dateStr = att.date.toISOString().split("T")[0];
        attendanceMap.set(`${att.userId}_${dateStr}`, att);
    });

    // Map submissions by userId
    const submissionMap = new Map<string, any>();
    submissions.forEach(sub => {
        submissionMap.set(sub.userId, sub);
    });

    const syncPromises: Promise<any>[] = [];

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
        let daysChanged = false;

        const days: StudentDayPerformance[] = classDates.map(cfg => {
            const att = attendanceMap.get(`${user.id}_${cfg.date}`);
            const savedDay = savedDaysMap.get(cfg.date);

            // Prioritize official attendance record from Attendance module
            let attendanceStatus: StudentDayPerformance["attendanceStatus"] = "NONE";
            if (att) {
                if (att.status === "ABSENT") {
                    attendanceStatus = "ABSENT";
                } else if (att.status === "LATE" || Boolean(att.arrivalTime)) {
                    attendanceStatus = "LATE";
                } else if (att.status === "EXCUSED") {
                    attendanceStatus = "EXCUSED";
                } else if (att.status === "LEAVE_EARLY") {
                    attendanceStatus = "LEAVE_EARLY";
                } else if (att.status === "PRESENT") {
                    attendanceStatus = "PRESENT";
                } else {
                    attendanceStatus = att.status;
                }
            } else if (savedDay?.attendanceStatus) {
                attendanceStatus = savedDay.attendanceStatus;
            }

            const isAbsent = attendanceStatus === "ABSENT";
            const isLate = attendanceStatus === "LATE";
            const isExcused = attendanceStatus === "EXCUSED";
            const isPresent = attendanceStatus === "PRESENT";

            if (isAbsent) absentDays++;
            else if (isLate) lateDays++;
            else if (isExcused) excusedDays++;
            else presentDays++;

            const defaultBase = performanceConfig.defaultDailyGrade ?? 5.0;
            const penalty = isLate ? (performanceConfig.tardinessPenalty ?? 1.0) : 0;
            const appliedCriteria: string[] = isAbsent ? [] : (Array.isArray(savedDay?.appliedCriteria) ? savedDay.appliedCriteria : []);

            let finalDayGrade = defaultBase;
            let manualGrade: number | null = null;
            const teacherNote = savedDay?.teacherNote || "";

            if (isAbsent) {
                // Inasistencia: siempre bloquea de manera fija en 0.0
                finalDayGrade = 0.0;
                manualGrade = null;
            } else if (appliedCriteria.length > 0) {
                // Si tiene criterios aplicados, calcula descontando tardanza y criterios de base 5.0
                finalDayGrade = computeStudentDayGrade(
                    { lockedByAbsence: false, attendanceStatus, appliedCriteria },
                    performanceConfig.criteria,
                    performanceConfig.tardinessPenalty ?? 1.0,
                    defaultBase
                );
                manualGrade = finalDayGrade;
            } else if (savedDay && typeof savedDay.manualGrade === "number" && savedDay.manualGrade !== null) {
                let baseManual = Math.min(defaultBase, Math.max(0.0, savedDay.manualGrade));
                if (isLate && baseManual > defaultBase - penalty) {
                    baseManual = Math.max(0.0, defaultBase - penalty);
                }
                manualGrade = baseManual;
                finalDayGrade = baseManual;
                customGradesCount++;
            } else {
                finalDayGrade = isLate ? Math.max(0.0, defaultBase - penalty) : defaultBase;
            }

            finalDayGrade = Number(finalDayGrade.toFixed(2));
            gradeSum += finalDayGrade;

            if (
                !savedDay ||
                savedDay.attendanceStatus !== attendanceStatus ||
                Math.abs((savedDay.finalDayGrade ?? -1) - finalDayGrade) > 0.01 ||
                Boolean(savedDay.lockedByAbsence) !== isAbsent
            ) {
                daysChanged = true;
            }

            return {
                date: cfg.date,
                dayOfWeek: cfg.dayOfWeek,
                dayName: cfg.dayName,
                formattedDate: cfg.formattedDate,
                attendanceStatus,
                baseGrade: defaultBase,
                penalty,
                manualGrade,
                finalDayGrade,
                teacherNote,
                lockedByAbsence: isAbsent,
                appliedCriteria,
            };
        });

        const totalDays = classDates.length;
        const finalAverage = totalDays > 0 ? Number((gradeSum / totalDays).toFixed(2)) : 5.0;

        // Auto-synchronize student submission if attendance or grades changed
        const currentSubGrade = typeof sub?.grade === "number" ? sub.grade : null;
        if (!sub || daysChanged || currentSubGrade === null || Math.abs(currentSubGrade - finalAverage) > 0.01) {
            const payload = {
                studentId: user.id,
                finalGrade: finalAverage,
                days,
                lastCalculatedAt: new Date().toISOString(),
                teacherObservation: "",
            };
            const feedback = `Evaluación de Desempeño en Clase: ${finalAverage.toFixed(1)} / 5.0 (Sincronizado automáticamente)`;
            syncPromises.push(
                prisma.submission.upsert({
                    where: {
                        userId_activityId: {
                            userId: user.id,
                            activityId,
                        }
                    },
                    update: {
                        url: JSON.stringify(payload),
                        grade: finalAverage,
                        feedback,
                        lastSubmittedAt: new Date(),
                    },
                    create: {
                        activityId,
                        userId: user.id,
                        url: JSON.stringify(payload),
                        grade: finalAverage,
                        feedback,
                        attemptCount: 1,
                        lastSubmittedAt: new Date(),
                    }
                })
            );
        }

        return {
            studentId: user.id,
            studentName,
            email: user.email,
            image: user.image,
            identificacion: user.profile?.identificacion || user.id.slice(0, 8),
            submissionId: sub?.id || null,
            currentGrade: finalAverage,
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

    if (syncPromises.length > 0) {
        try {
            await Promise.all(syncPromises);
        } catch (e) {
            console.warn("Error auto-syncing performance submissions:", e);
        }
    }

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

// Update performance penalty criteria and sync into statement
export async function updatePerformanceCriteriaAction(data: {
    activityId: string;
    courseId: string;
    criteria: PerformancePenaltyCriterion[];
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const { activityId, courseId, criteria } = data;

    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { description: true, statement: true }
    });

    if (!activity) {
        throw new Error("Actividad no encontrada");
    }

    let parsedDesc: any = {};
    try {
        if (activity.description) {
            parsedDesc = JSON.parse(activity.description);
        }
    } catch {}

    const updatedPerformanceConfig = {
        ...(parsedDesc.performanceConfig || {}),
        criteria,
    };

    parsedDesc.performanceConfig = updatedPerformanceConfig;

    // Build or update the criteria markdown table in the statement
    let currentStatement = activity.statement || "";
    const criteriaSectionTitle = "## Criterios de Evaluación y Penalizaciones Diarias (Base: 5.0)";
    
    let tableMarkdown = `${criteriaSectionTitle}\n\n`;
    tableMarkdown += `Cada sesión de clase inicia con una nota base de **5.0**. Si se incurre en una falta disciplinaria o de cumplimiento, se descontará la penalización correspondiente a la nota del día. Las inasistencias injustificadas reciben automáticamente **0.0**.\n\n`;
    tableMarkdown += `| Criterio de Desempeño | Penalización | Descripción |\n`;
    tableMarkdown += `| :--- | :---: | :--- |\n`;
    criteria.forEach(c => {
        tableMarkdown += `| **${c.name}** | \`-${c.penalty.toFixed(1)} pts\` | ${c.description || "Aplica descuento sobre la nota máxima diaria de 5.0"} |\n`;
    });
    tableMarkdown += `| **Llegada Tarde (Tardanza)** | \`-${(updatedPerformanceConfig.tardinessPenalty ?? 1.0).toFixed(1)} pts\` | Retardo en el ingreso a la sesión de clase |\n`;
    tableMarkdown += `| **Inasistencia a Clase** | \`0.0 Automático\` | Falta no justificada en la sesión |\n`;

    let newStatement = currentStatement;
    if (newStatement.includes(criteriaSectionTitle)) {
        const regex = new RegExp(`${criteriaSectionTitle}[\\s\\S]*?(?=\\n## |$)`, "g");
        newStatement = newStatement.replace(regex, tableMarkdown + "\n\n");
    } else {
        newStatement = newStatement.trim() + "\n\n" + tableMarkdown;
    }

    await prisma.activity.update({
        where: { id: activityId },
        data: {
            description: JSON.stringify(parsedDesc),
            statement: newStatement,
        }
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    revalidatePath(`/dashboard/student/activities/${activityId}`);

    return {
        success: true,
        criteria,
    };
}

// Update attendance directly from the Performance Activity Inspector
export async function recordPerformanceAttendanceAction(data: {
    activityId: string;
    courseId: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NONE";
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const { activityId, courseId, studentId, date, status } = data;

    if (isFutureDate(date)) {
        throw new Error("No es posible registrar ni modificar asistencia en fechas posteriores a la fecha actual.");
    }

    const normalizedDate = toUTCStartOfDayFromRegional(date);

    if (status === "NONE") {
        await prisma.attendance.deleteMany({
            where: {
                courseId,
                userId: studentId,
                date: normalizedDate,
            }
        });
    } else {
        await prisma.attendance.upsert({
            where: {
                courseId_userId_date: {
                    courseId,
                    userId: studentId,
                    date: normalizedDate,
                }
            },
            update: {
                status,
                arrivalTime: status === "LATE" ? new Date() : null,
            },
            create: {
                courseId,
                userId: studentId,
                date: normalizedDate,
                status,
                arrivalTime: status === "LATE" ? new Date() : null,
            }
        });
    }

    // Refresh evaluation data and auto-sync student submission
    const evalData = await getPerformanceEvaluationDataAction(activityId, courseId);

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    revalidatePath(`/dashboard/student/activities/${activityId}`);
    revalidatePath(`/dashboard/teacher/courses/${courseId}`);

    const updatedStudent = evalData.students.find(s => s.studentId === studentId);

    return {
        success: true,
        student: updatedStudent,
    };
}

