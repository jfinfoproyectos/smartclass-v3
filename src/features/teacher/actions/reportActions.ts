"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import prisma from "@/lib/prisma";
import { formatName } from "@/lib/utils";
import { toUTCStartOfDayFromLocal } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getCourseGradesReportAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");
    return await courseService.getCourseGradesReport(courseId);
}

export async function getCourseAttendanceReportAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");
    return await courseService.getCourseAttendanceReport(courseId);
}

export async function getMultiCourseGradesReportAction(courseIds: string[]) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const reports = [];
    for (const id of courseIds) {
        const course = await prisma.course.findUnique({ where: { id, teacherId: session.user.id }, select: { title: true } });
        if (course) {
            const data = await courseService.getCourseGradesReport(id);
            reports.push({
                name: course.title.substring(0, 30), // Excel sheet name limit
                data: data
            });
        }
    }
    return reports;
}

export async function getCourseCompleteDataAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // Get course info
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            enrollments: {
                where: { status: "APPROVED" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    user: { name: 'asc' }
                }
            },
            activities: {
                orderBy: { order: 'asc' },
                include: {
                    submissions: {
                        select: {
                            userId: true,
                            grade: true,
                            feedback: true
                        }
                    }
                }
            },
            evaluationAttempts: {
                include: {
                    evaluation: { select: { title: true } },
                    submissions: true
                }
            },
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: {
                                include: {
                                    activity: true,
                                    evaluationAttempt: {
                                        include: {
                                            evaluation: {
                                                select: { title: true }
                                            },
                                            submissions: true
                                        }
                                    }
                                },
                                orderBy: { createdAt: 'asc' }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            attendances: {
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            },
            remarks: {
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    if (!course) {
        throw new Error("Course not found");
    }

    // 1. GRADES DATA
    const { calculateFinalGrade } = await import("@/lib/gradeUtils");
    const gradesData = course.enrollments.map(enrollment => {
        const student = enrollment.user;
        const studentId = student.id;

        const { finalGrade } = calculateFinalGrade(
            studentId,
            (course as any).gradeCategories || [],
            course.activities,
            (course as any).evaluationAttempts || []
        );

        const row: any = {
            "Estudiante": student.name || "Sin nombre",
            "Email": student.email
        };

        course.activities.forEach(activity => {
            const submission = activity.submissions.find(s => s.userId === studentId);
            const grade = submission?.grade ?? null;
            row[activity.title] = grade !== null ? grade.toFixed(1) : "-";
        });

        row["Nota Final"] = finalGrade.toFixed(1);

        return row;
    });

    // 2. ATTENDANCE DATA
    const attendanceData = course.attendances.map(attendance => ({
        "Estudiante": attendance.user.name || "Sin nombre",
        "Email": attendance.user.email,
        "Fecha": new Date(attendance.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
        "Estado": attendance.status === 'PRESENT' ? 'Presente' :
            attendance.status === 'ABSENT' ? 'Ausente' :
                attendance.status === 'LATE' ? 'Tarde' : 'Excusado',
        "Hora Llegada": attendance.arrivalTime ? new Date(attendance.arrivalTime).toLocaleTimeString('es-ES') : "-",
        "Justificación": attendance.justification || "-"
    }));

    // 3. REMARKS DATA
    const remarksData = course.remarks.map(remark => ({
        "Estudiante": remark.user.name || "Sin nombre",
        "Email": remark.user.email,
        "Fecha": new Date(remark.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
        "Tipo": remark.type === 'COMMENDATION' ? 'Felicitación' : 'Llamado de Atención',
        "Título": remark.title,
        "Descripción": remark.description
    }));

    // 4. STATISTICS DATA
    const totalStudents = course.enrollments.length;
    const totalActivities = course.activities.length;

    // Calculate average grade
    let sumGrades = 0;
    let countGrades = 0;
    course.enrollments.forEach(enrollment => {
        let totalWeightedGrade = 0;
        let totalWeight = 0;
        course.activities.forEach(activity => {
            const submission = activity.submissions.find(s => s.userId === enrollment.userId);
            if (submission?.grade !== null && submission?.grade !== undefined) {
                totalWeightedGrade += submission.grade * activity.weight;
                totalWeight += activity.weight;
            }
        });
        if (totalWeight > 0) {
            sumGrades += totalWeightedGrade / totalWeight;
            countGrades++;
        }
    });
    const averageGrade = countGrades > 0 ? sumGrades / countGrades : 0;

    // Calculate attendance rate
    const totalAttendanceRecords = course.attendances.length;
    const presentRecords = course.attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendanceRate = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;

    // Count remarks
    const positiveRemarks = course.remarks.filter(r => r.type === 'COMMENDATION').length;
    const negativeRemarks = course.remarks.filter(r => r.type === 'ATTENTION').length;

    const statisticsData = [
        { "Métrica": "Total Estudiantes", "Valor": totalStudents.toString() },
        { "Métrica": "Actividades Totales", "Valor": totalActivities.toString() },
        { "Métrica": "Promedio General", "Valor": averageGrade.toFixed(1) },
        { "Métrica": "Tasa de Asistencia", "Valor": `${attendanceRate.toFixed(1)}%` },
        { "Métrica": "Observaciones Positivas", "Valor": positiveRemarks.toString() },
        { "Métrica": "Observaciones Negativas", "Valor": negativeRemarks.toString() },
        { "Métrica": "Total Registros de Asistencia", "Valor": totalAttendanceRecords.toString() }
    ];

    return {
        grades: gradesData,
        attendance: attendanceData,
        remarks: remarksData,
        statistics: statisticsData
    };
}

export async function getStudentCompleteDataAction(studentId: string, courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Get course info with full hierarchy for THIS student
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            teacher: {
                select: { name: true }
            },
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: {
                                include: {
                                    activity: true,
                                    evaluationAttempt: {
                                        include: {
                                            evaluation: {
                                                select: { title: true }
                                            },
                                            submissions: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            enrollments: {
                where: { userId: studentId, status: "APPROVED" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profile: {
                                select: {
                                    nombres: true,
                                    apellido: true
                                }
                            }
                        }
                    }
                }
            },
            activities: {
                include: {
                    submissions: {
                        where: { userId: studentId }
                    }
                }
            },
            attendances: {
                where: { userId: studentId },
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            },
            remarks: {
                where: { userId: studentId },
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    if (!course || course.enrollments.length === 0) {
        throw new Error("Enrollment not found");
    }

    const teacherName = course.teacher?.name || "Sin profesor";
    const courseName = course.title;
    const enrollment = course.enrollments[0];
    const student = enrollment.user;

    // Hierarchical Grade Calculation
    const categoriesGrades = course.gradeCategories.map(cat => {
        const groupGrades = cat.groups.map(group => {
            let totalWeightedGrade = 0;
            let totalWeight = 0;

            const itemsWithGrades = group.items.map(item => {
                let grade = 0;
                let title = "S/N";
                if (item.activityId) {
                    const activity = course.activities.find(a => a.id === item.activityId);
                    const submission = activity?.submissions[0];
                    grade = submission?.grade || 0;
                    title = activity?.title || title;
                } else if (item.evaluationAttemptId) {
                    const submission = item.evaluationAttempt?.submissions.find(s => s.userId === studentId);
                    grade = submission?.score || 0;
                    title = item.evaluationAttempt?.evaluation?.title || title;
                }

                totalWeightedGrade += grade * item.weight;
                totalWeight += item.weight;

                return {
                    id: item.id,
                    title,
                    weight: item.weight,
                    grade
                };
            });

            const groupAvg = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
            return {
                id: group.id,
                name: group.name,
                weight: group.weight,
                grade: groupAvg,
                items: itemsWithGrades
            };
        });

        let catWeightedGrade = 0;
        let catTotalWeight = 0;

        groupGrades.forEach(g => {
            catWeightedGrade += g.grade * g.weight;
            catTotalWeight += g.weight;
        });

        const catAvg = catTotalWeight > 0 ? catWeightedGrade / catTotalWeight : 0;
        return {
            id: cat.id,
            name: cat.name,
            weight: cat.weight,
            grade: catAvg,
            groups: groupGrades
        };
    });

    let finalWeightedGrade = 0;
    let finalTotalWeight = 0;

    categoriesGrades.forEach(c => {
        finalWeightedGrade += c.grade * c.weight;
        finalTotalWeight += c.weight;
    });

    const finalGrade = finalTotalWeight > 0 ? finalWeightedGrade / finalTotalWeight : 0;

    return {
        studentId: student.id,
        studentName: formatName(student.name, student.profile),
        studentEmail: student.email,
        courseName,
        teacherName,
        averageGrade: finalGrade,
        categories: categoriesGrades,
        attendances: course.attendances.map(a => ({
            id: a.id,
            date: a.date,
            status: a.status,
            justification: a.justification,
            justificationUrl: a.justificationUrl
        })),
        remarks: course.remarks.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            type: r.type,
            date: r.date
        })),
        // For Excel compatibility
        _hierarchy: categoriesGrades,
        "ID": student.id,
        "Estudiante": formatName(student.name, student.profile),
        "Correo": student.email,
        "Nota Final": finalGrade.toFixed(2)
    };
}

export async function getCourseStudentsCompleteDataAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    // Get course info with full hierarchy
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            teacher: {
                include: {
                    profile: true
                }
            },
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: {
                                include: {
                                    activity: true,
                                    evaluationAttempt: {
                                        include: {
                                            evaluation: {
                                                select: { title: true }
                                            },
                                            submissions: true
                                        }
                                    }
                                },
                                orderBy: { createdAt: 'asc' }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            enrollments: {
                where: { status: "APPROVED" },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    }
                },
                orderBy: {
                    user: { name: 'asc' }
                }
            },
            activities: {
                include: {
                    submissions: true
                }
            },
            attendances: {
                orderBy: { date: 'desc' },
                include: {
                    user: true
                }
            },
            remarks: {
                orderBy: { date: 'desc' },
                include: {
                    user: true
                }
            },
            evaluationAttempts: {
                include: {
                    evaluation: { select: { title: true } },
                    submissions: true
                }
            }
        }
    });

    if (!course) {
        throw new Error("Course not found");
    }

    const { calculateFinalGrade } = await import("@/lib/gradeUtils");
    const teacherName = formatName(course.teacher?.name, course.teacher?.profile as any);
    const courseName = course.title;

    // Process data per student
    const studentsData = course.enrollments.map((enrollment: any) => {
        const student = enrollment.user;
        const studentId = student.id;

        // Hierarchical Grade Calculation using unified utility
        const { finalGrade, categoriesGrades } = calculateFinalGrade(
            studentId, 
            course.gradeCategories as any, 
            course.activities, 
            course.evaluationAttempts
        );

        // Filter Attendances
        const studentAttendances = course.attendances
            .filter((a: any) => a.userId === studentId)
            .map((a: any) => ({
                id: a.id,
                date: a.date,
                status: a.status,
                justification: a.justification,
                justificationUrl: a.justificationUrl
            }));

        // Filter Remarks
        const studentRemarks = course.remarks
            .filter((r: any) => r.userId === studentId)
            .map((r: any) => ({
                id: r.id,
                name: r.title,
                title: r.title,
                description: r.description,
                type: r.type,
                date: r.date
            }));

        return {
            studentName: formatName(student.name, student.profile),
            courseName,
            teacherName,
            averageGrade: finalGrade,
            categories: categoriesGrades, // Hierarchical data for PDF
            attendances: studentAttendances,
            remarks: studentRemarks
        };
    });

    return studentsData;
}

export async function getCourseDuplicateLinksAction(courseId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") throw new Error("Unauthorized");

    const { normalizeUrl } = await import("@/lib/utils");

    // Get all activities for the course
    const activities = await prisma.activity.findMany({
        where: { courseId },
        include: {
            submissions: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        }
    });

    const report = [];

    for (const activity of activities) {
        const urlMap = new Map<string, any[]>();
        activity.submissions.forEach(sub => {
            if (!sub.url || sub.url === "MANUAL") return;
            
            const normalized = normalizeUrl(sub.url);
            if (!urlMap.has(normalized)) urlMap.set(normalized, []);
            urlMap.get(normalized)!.push({
                name: sub.user.name || "Sin nombre",
                email: sub.user.email,
                submissionDate: sub.createdAt,
                url: sub.url
            });
        });

        const duplicates: any[] = [];
        urlMap.forEach((students, url) => {
            if (students.length > 1) {
                duplicates.push({ url, students });
            }
        });

        if (duplicates.length > 0) {
            report.push({
                activityId: activity.id,
                activityTitle: activity.title,
                duplicates
            });
        }
    }

    return report;
}
