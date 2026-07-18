import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { formatName } from "@/lib/utils";

// Persistent cache for resilience
const courseStudentsCache = new Map<string, any>();


export const courseService = {
    async createCourse(data: {
        title: string;
        description?: string;
        teacherId: string;
        startDate?: Date;
        endDate?: Date;
        startTime?: string;
        endTime?: string;
        classDays?: string;
    }) {
        const course = await prisma.course.create({
            data,
        });

        return course;
    },

    async cloneCourse(sourceCourseId: string, data: {
        title: string;
        description?: string;
        teacherId: string;
        startDate?: Date;
        endDate?: Date;
        startTime?: string;
        endTime?: string;
        classDays?: string;
    }) {
        // 1. Get source course with all data needed for cloning
        const sourceCourse = await prisma.course.findUnique({
            where: { id: sourceCourseId },
            include: {
                activities: true,
            }
        });

        if (!sourceCourse) {
            throw new Error("Course not found");
        }

        // 2. Create new course
        const newCourse = await prisma.course.create({
            data: {
                ...data,
                startTime: data.startTime !== undefined ? data.startTime : sourceCourse.startTime,
                endTime: data.endTime !== undefined ? data.endTime : sourceCourse.endTime,
                classDays: data.classDays !== undefined ? data.classDays : sourceCourse.classDays,
            },
        });

        // 4. Clone Activities
        if (sourceCourse.activities.length > 0) {
            // We need to create them one by one or createMany if we don't have complex relations on activities yet
            // Activities are simple for now
            await prisma.activity.createMany({
                data: sourceCourse.activities.map(activity => ({
                    courseId: newCourse.id,
                    title: activity.title,
                    description: activity.description,
                    statement: activity.statement,
                    filePaths: activity.filePaths,
                    type: activity.type,
                    weight: activity.weight,
                    maxAttempts: activity.maxAttempts,
                    allowLinkSubmission: activity.allowLinkSubmission,
                    // Keep dates? Or reset?
                    // For now, we keep them. The teacher can update them.
                    openDate: activity.openDate,
                    deadline: activity.deadline,
                    order: activity.order,
                }))
            });
        }

        return newCourse;
    },

    async updateCourse(courseId: string, data: {
        title?: string;
        description?: string;
        startDate?: Date;
        endDate?: Date;
        startTime?: string | null;
        endTime?: string | null;
        classDays?: string | null;
    }) {
        // Force HMR update with a comment to use the latest prisma client instance
        const course = await prisma.course.update({
            where: { id: courseId },
            data,
        });

        return course;
    },

    async getTeacherCourses(teacherId: string) {
        return await prisma.course.findMany({
            where: { teacherId },
            orderBy: { createdAt: "desc" },
            include: {
                teacher: {
                    include: {
                        profile: true
                    }
                },
                _count: {
                    select: { enrollments: true },
                },
            },
        });
    },

    async getStudentCourses(userId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'APPROVED',
                course: {
                    OR: [
                        { endDate: null },
                        { endDate: { gte: new Date() } }
                    ]
                }
            },
            include: {
                course: {
                    include: {
                        teacher: {
                            include: { profile: true }
                        }
                    }
                }
            }
        });

        return enrollments.map(e => e.course);
    },

    async getAllCourses() {
        return await prisma.course.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                teacher: {
                    include: { profile: true }
                },
                _count: {
                    select: { enrollments: true },
                },
            },
        });
    },

    async getCourseById(courseId: string) {
        return await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                teacher: {
                    select: { id: true, name: true, email: true },
                },
                _count: {
                    select: {
                        enrollments: true,
                        activities: true
                    },
                },
            },
        });
    },

    async deleteCourse(courseId: string) {
        return await prisma.course.delete({
            where: { id: courseId },
        });
    },

    async enrollStudent(userId: string, courseId: string, status: 'PENDING' | 'APPROVED' = 'PENDING', bypassChecks: boolean = false) {
        // Check if course registration is open
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                registrationOpen: true,
                registrationDeadline: true
            },
        });

        if (!course) {
            throw new Error("Course not found");
        }

        if (!bypassChecks) {
            if (!course.registrationOpen) {
                throw new Error("Course registration is closed");
            }

            if (course.registrationDeadline && new Date() > course.registrationDeadline) {
                throw new Error("Course registration deadline has passed");
            }
        }

        // Check if already enrolled
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
        });

        if (existing) return existing;

        return await prisma.enrollment.create({
            data: {
                userId,
                courseId,
                status: status as any,
            },
        });
    },

    async getStudentEnrollments(userId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'APPROVED',
                course: {
                    OR: [
                        { endDate: null },
                        { endDate: { gte: new Date() } }
                    ]
                }
            },
            include: {
                course: {
                    include: {
                        docLinks: {
                            include: { docProject: { select: { id: true, name: true, slug: true, icon: true, imageUrl: true } } },
                            orderBy: { order: 'asc' }
                        },
                        teacher: {
                            include: {
                                profile: true
                            }
                        },
                        activities: {
                            orderBy: { order: "asc" },
                            include: {
                                submissions: {
                                    where: { userId },
                                    orderBy: { createdAt: "desc" }
                                }
                            }
                        },
                        sharedContent: {
                            orderBy: { createdAt: "asc" }
                        },
                        evaluationAttempts: {
                            orderBy: { createdAt: "desc" },
                            include: {
                                evaluation: {
                                    select: { title: true }
                                },
                                submissions: {
                                    where: { userId }
                                }
                            }
                        },
                        gradeCategories: {
                            include: {
                                groups: {
                                    include: {
                                        items: true
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });

        const now = new Date(); // Capture time once

        // Calculate weighted average grade for each course and fetch remarks/attendance
        // We do this manually or via separate queries because nested filtering on the same level (user -> remarks) 
        // within an an enrollment query can be tricky or less efficient if not careful. 
        // But actually, we can just fetch them separately or use a more complex include.
        // Let's try to fetch them in parallel for all enrollments to be efficient, or just iterate.
        // Given the scale, iterating is fine for now, or we can use the relation on User if we included User.
        // But we didn't include User in the findMany above.

        // Fetch all additional data for all enrollments in bulk to avoid N+1 problem
        const courseIds = enrollments.map(e => e.courseId);
        
        const [allRemarks, allAttendances] = await Promise.all([
            prisma.remark.findMany({
                where: {
                    courseId: { in: courseIds },
                    userId: userId
                },
                orderBy: { date: "desc" }
            }),
            prisma.attendance.findMany({
                where: {
                    courseId: { in: courseIds },
                    userId: userId
                },
                orderBy: { date: "desc" }
            })
        ]);

        // Map remarks and attendances to their respective courses
        const enrichedEnrollments = enrollments.map((enrollment) => {
            const activities = enrollment.course.activities;
            let totalWeightedGrade = 0;
            let totalWeight = 0;

            activities.forEach(activity => {
                const submission = activity.submissions[0];
                if (submission && submission.grade !== null) {
                    totalWeightedGrade += submission.grade * activity.weight;
                    totalWeight += activity.weight;
                } else if (!submission && activity.deadline && activity.deadline < now && activity.type !== 'MANUAL') {
                    totalWeightedGrade += 0.0; // 0 * weight
                    totalWeight += activity.weight;
                }
            });

            const average = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;

            const remarks = allRemarks.filter(r => r.courseId === enrollment.courseId);
            const attendances = allAttendances.filter(a => a.courseId === enrollment.courseId);

            return {
                ...enrollment,
                averageGrade: average,
                remarks,
                attendances
            };
        });

        return enrichedEnrollments;
    },

    async getStudentPendingEnrollments(userId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                userId,
                status: 'PENDING'
            },
            select: {
                courseId: true
            }
        });
        return enrollments.map(e => e.courseId);
    },

    async getPendingEnrollments(teacherId: string) {
        return await prisma.enrollment.findMany({
            where: {
                status: 'PENDING',
                course: {
                    teacherId: teacherId
                }
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    },

    async updateEnrollmentStatus(enrollmentId: string, status: 'APPROVED' | 'REJECTED') {
        // We no longer delete on REJECTED, we just update the status to suspend access
        return await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { status: status as any }
        });
    },

    async getActivity(activityId: string, userId: string) {
        // First check if user is enrolled and approved
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            select: { courseId: true }
        });

        if (!activity) return null;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: activity.courseId
                }
            }
        });

        if (!enrollment || enrollment.status !== 'APPROVED') {
            return null;
        }

        return await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                course: {
                    include: {
                        teacher: {
                            include: { profile: true }
                        },
                    },
                },
                submissions: {
                    where: { userId },
                },
            },
        });
    },

    async getCourseStudents(courseId: string) {
        try {
            const students = await prisma.enrollment.findMany({
                where: { courseId },
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
                                    apellido: true,
                                    telefono: true,
                                    dataProcessingConsent: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    user: {
                        name: 'asc'
                    }
                }
            });

            courseStudentsCache.set(courseId, students);
            return students;
        } catch (error) {
            console.error(`[Resilience] Error fetching students for course ${courseId}:`, error);
            if (courseStudentsCache.has(courseId)) {
                console.warn(`[Resilience] Using stale fallback student data for course ${courseId}`);
                return courseStudentsCache.get(courseId);
            }
            throw error;
        }
    },

    async searchStudents(query: string) {
        return await prisma.user.findMany({
            where: {
                role: "student",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    {
                        profile: {
                            OR: [
                                { identificacion: { contains: query, mode: "insensitive" } },
                                { nombres: { contains: query, mode: "insensitive" } },
                                { apellido: { contains: query, mode: "insensitive" } },
                                { telefono: { contains: query, mode: "insensitive" } },
                            ],
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile: {
                    select: {
                        identificacion: true,
                        nombres: true,
                        apellido: true,
                        telefono: true,
                        dataProcessingConsent: true,
                    },
                },
            },
            take: 10,
        });
    },

    async removeStudentFromCourse(userId: string, courseId: string) {
        return await prisma.$transaction([
            // 1. Delete student submissions for this course's activities
            prisma.submission.deleteMany({
                where: {
                    userId,
                    activity: { courseId }
                }
            }),
            // 2. Delete student evaluation submissions for this course's evaluation attempts
            prisma.evaluationSubmission.deleteMany({
                where: {
                    userId,
                    attempt: { courseId }
                }
            }),
            // 3. Delete student attendances for this course
            prisma.attendance.deleteMany({
                where: {
                    userId,
                    courseId
                }
            }),
            // 4. Delete student remarks for this course
            prisma.remark.deleteMany({
                where: {
                    userId,
                    courseId
                }
            }),
            // 5. Delete student enrollment
            prisma.enrollment.deleteMany({
                where: {
                    userId,
                    courseId
                }
            })
        ]);
    },

    async toggleCourseRegistration(courseId: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { registrationOpen: true },
        });

        if (!course) {
            throw new Error("Course not found");
        }

        return await prisma.course.update({
            where: { id: courseId },
            data: { registrationOpen: !course.registrationOpen },
        });
    },

    async updateCourseRegistration(courseId: string, isOpen: boolean, deadline?: Date) {
        return await prisma.course.update({
            where: { id: courseId },
            data: {
                registrationOpen: isOpen,
                registrationDeadline: deadline
            },
        });
    },

    async getStudentCourseEnrollment(userId: string, courseId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                },
            },
            include: {
                course: {
                    include: {
                        teacher: {
                            select: { name: true },
                        },
                        activities: {
                            orderBy: { order: "asc" },
                            include: {
                                submissions: {
                                    where: { userId },
                                    orderBy: { createdAt: "desc" }
                                }
                            }
                        },
                        sharedContent: {
                            orderBy: { createdAt: "asc" }
                        },
                        evaluationAttempts: {
                            orderBy: { createdAt: "desc" },
                            include: {
                                evaluation: {
                                    select: { title: true }
                                },
                                submissions: {
                                    where: { userId }
                                }
                            }
                        }
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                                dataProcessingConsent: true,
                            }
                        }
                    }
                }
            },
        });

        if (!enrollment) return null;

        // Calculate weighted average grade
        const activities = enrollment.course.activities;
        let totalWeightedGrade = 0;
        let totalWeight = 0;
        const now = new Date();

        activities.forEach(activity => {
            const submission = activity.submissions[0];
            if (submission && submission.grade !== null) {
                totalWeightedGrade += submission.grade * activity.weight;
                totalWeight += activity.weight;
            } else if (!submission && activity.deadline && activity.deadline < now && activity.type !== 'MANUAL') {
                // Missed deadline => 0.0
                totalWeightedGrade += 0.0;
                totalWeight += activity.weight;
            }
        });

        const average = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;

        // Fetch remarks and attendance
        const remarks = await prisma.remark.findMany({
            where: {
                courseId: courseId,
                userId: userId
            },
            orderBy: { date: "desc" }
        });

        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: courseId,
                userId: userId
            },
            orderBy: { date: "desc" }
        });

        return {
            ...enrollment,
            averageGrade: average,
            remarks,
            attendances
        };
    },


    async getStudentsForTeacher(teacherId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: {
                course: { teacherId }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            distinct: ['userId'],
            orderBy: {
                user: {
                    name: 'asc'
                }
            }
        });

        return enrollments.map(e => e.user);
    },

    async getCourseGradesReport(courseId: string) {
        // 1. Fetch Course, Categories, Groups, and Items
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
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
                activities: {
                    include: {
                        submissions: true
                    }
                },
                evaluationAttempts: {
                    include: {
                        evaluation: {
                            select: { title: true }
                        },
                        submissions: true
                    }
                }
            }
        });

        if (!course) throw new Error("Course not found");

        const { calculateFinalGrade } = await import("@/lib/gradeUtils");

        // 2. Fetch Enrolled Students
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: courseId,
                status: 'APPROVED'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        });

        // 4. Transform for Export (Flattened with hierarchical info)
        return enrollments.map(enrollment => {
            const student = enrollment.user;
            const { categoriesGrades, finalGrade } = calculateFinalGrade(
                student.id, 
                course.gradeCategories as any, 
                course.activities, 
                course.evaluationAttempts
            );

            const row: any = {
                'ID': student.profile?.identificacion || student.id.substring(0, 8),
                'Estudiante': formatName(student.name, student.profile),
                'Correo': student.email
            };

            // Add each category/group grade for Excel compatibility
            categoriesGrades.forEach(cat => {
                row[`${cat.name} (Total)`] = cat.grade.toFixed(2);
                cat.groups.forEach(group => {
                    row[`${cat.name} - ${group.name}`] = group.grade.toFixed(2);
                });
            });

            row['Nota Final'] = finalGrade.toFixed(2);
            row['_hierarchy'] = categoriesGrades; // Hidden field for advanced exporters

            return row;
        });
    },
    async getCourseAttendanceReport(courseId: string) {
        // 1. Fetch Course to ensure it exists
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) throw new Error("Course not found");

        // 2. Fetch Enrolled Students
        const enrollments = await prisma.enrollment.findMany({
            where: {
                courseId: courseId,
                status: 'APPROVED' // Only active students
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                user: { name: 'asc' }
            }
        });

        // 3. Fetch All Attendance Records for this course
        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: courseId
            },
            orderBy: {
                date: 'asc'
            }
        });

        // 4. Fetch All Remarks for this course
        const remarks = await prisma.remark.findMany({
            where: {
                courseId: courseId
            },
            orderBy: {
                date: 'asc'
            }
        });

        // 5. Get all unique dates from both attendances and remarks
        const attendanceDates = attendances.map(a => a.date.toISOString().split('T')[0]);
        const remarkDates = remarks.map(r => r.date.toISOString().split('T')[0]);
        const uniqueDates = Array.from(new Set([...attendanceDates, ...remarkDates])).sort();

        // 6. Process Data
        const reportData = enrollments.map(enrollment => {
            const student = enrollment.user;
            const row: any = {
                'ID': student.profile?.identificacion || student.id.substring(0, 8),
                'Estudiante': formatName(student.name, student.profile),
                'Correo': student.email
            };

            uniqueDates.forEach(dateStr => {
                const attendance = attendances.find(a =>
                    a.userId === student.id &&
                    a.date.toISOString().split('T')[0] === dateStr
                );

                const studentRemarks = remarks.filter(r => 
                    r.userId === student.id && 
                    r.date.toISOString().split('T')[0] === dateStr
                );

                let attendanceData: any = '-';
                if (attendance || studentRemarks.length > 0) {
                    let status = '-';
                    if (attendance) {
                        switch (attendance.status) {
                            case 'PRESENT': status = 'P'; break;
                            case 'ABSENT': status = 'A'; break;
                            case 'EXCUSED': status = 'E'; break;
                            case 'LATE': status = 'L'; break;
                            case 'LEAVE_EARLY': status = 'R'; break;
                        }
                    }
                    
                    attendanceData = {
                        status: status,
                        justification: attendance?.justification,
                        arrivalTime: attendance?.arrivalTime,
                        departureTime: (attendance as any)?.departureTime,
                        remarks: studentRemarks.map(r => ({
                            type: r.type,
                            title: r.title,
                            description: r.description
                        }))
                    };
                }

                row[dateStr] = attendanceData;
            });

            return row;
        });

        return reportData;
    },

    async getTeacherDashboardStats(teacherId: string) {
        const [
            pendingEnrollmentsCount,
            courses,
            pendingGradingSubmissions
        ] = await Promise.all([
            prisma.enrollment.count({
                where: {
                    status: 'PENDING',
                    course: { teacherId }
                }
            }),
            prisma.course.findMany({
                where: { teacherId },
                include: {
                    _count: {
                        select: { enrollments: true }
                    }
                }
            }),
            prisma.submission.findMany({
                where: {
                    grade: null,
                    activity: {
                        course: { teacherId }
                    }
                },
                include: {
                    activity: {
                        select: {
                            id: true,
                            title: true,
                            courseId: true,
                            course: { select: { title: true } }
                        }
                    },
                    user: {
                        include: { profile: true }
                    }
                },
                take: 5,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const totalStudents = courses.reduce((acc, course) => acc + course._count.enrollments, 0);
        
        // Count total pending grading (not just the top 5)
        const pendingGradingCount = await prisma.submission.count({
            where: {
                grade: null,
                activity: {
                    course: { teacherId }
                }
            }
        });

        return {
            pendingEnrollmentsCount,
            pendingGradingCount,
            activeCoursesCount: courses.length,
            totalStudentsCount: totalStudents,
            recentPendingGrading: pendingGradingSubmissions.map(s => ({
                id: s.id,
                studentName: formatName(s.user.name, s.user.profile),
                activityTitle: s.activity.title,
                courseTitle: s.activity.course.title,
                activityId: s.activity.id,
                courseId: s.activity.courseId,
                submittedAt: s.createdAt
            }))
        };
    },
};
