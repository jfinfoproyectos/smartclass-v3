import prisma from "@/lib/prisma";
import crypto from "crypto";

export const courseZipService = {
    async exportCourseToJSON(courseId: string) {
        // Fetch course details
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                enrollments: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                activities: {
                    include: {
                        submissions: {
                            include: {
                                user: true
                            }
                        }
                    }
                },
                attendances: {
                    include: {
                        user: true
                    }
                },
                remarks: {
                    include: {
                        user: true,
                        teacher: true
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
                },
                evaluationAttempts: {
                    include: {
                        evaluation: {
                            include: {
                                questions: true
                            }
                        },
                        submissions: {
                            include: {
                                user: true,
                                answersList: {
                                    include: {
                                        question: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!course) {
            throw new Error("Curso no encontrado");
        }

        const exportedData = {
            version: "1.0",
            course: {
                title: course.title,
                description: course.description,
                registrationOpen: course.registrationOpen,
                registrationDeadline: course.registrationDeadline,
                startDate: course.startDate,
                endDate: course.endDate,
                docTrackingEnabled: course.docTrackingEnabled,
                docAiTutorEnabled: course.docAiTutorEnabled,
                docAiQuestionsLimit: course.docAiQuestionsLimit,
                docThemeMode: course.docThemeMode,
                docCodeTheme: course.docCodeTheme,
                docAllowCodeThemeChange: course.docAllowCodeThemeChange,
                docThemeColor: course.docThemeColor,
                docAllowThemeColorChange: course.docAllowThemeColorChange,
            },
            students: course.enrollments.map(e => ({
                email: e.user.email,
                name: e.user.name,
                status: e.status,
                profile: e.user.profile ? {
                    identificacion: e.user.profile.identificacion,
                    nombres: e.user.profile.nombres,
                    apellido: e.user.profile.apellido,
                    telefono: e.user.profile.telefono,
                    dataProcessingConsent: e.user.profile.dataProcessingConsent,
                } : null
            })),
            activities: course.activities.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                statement: a.statement,
                filePaths: a.filePaths,
                deadline: a.deadline,
                type: a.type,
                weight: a.weight,
                maxAttempts: a.maxAttempts,
                order: a.order,
                openDate: a.openDate,
                allowLinkSubmission: a.allowLinkSubmission,
                submissions: a.submissions.map(s => ({
                    studentEmail: s.user.email,
                    url: s.url,
                    grade: s.grade,
                    feedback: s.feedback,
                    attemptCount: s.attemptCount,
                    lastSubmittedAt: s.lastSubmittedAt,
                    createdAt: s.createdAt,
                }))
            })),
            attendances: course.attendances.map(att => ({
                studentEmail: att.user.email,
                date: att.date,
                status: att.status,
                arrivalTime: att.arrivalTime,
                justification: att.justification,
                justificationUrl: att.justificationUrl
            })),
            remarks: course.remarks.map(r => ({
                studentEmail: r.user.email,
                type: r.type,
                title: r.title,
                description: r.description,
                date: r.date
            })),
            gradeCategories: course.gradeCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                weight: cat.weight,
                groups: cat.groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    weight: g.weight,
                    items: g.items.map(item => ({
                        activityId: item.activityId,
                        evaluationAttemptId: item.evaluationAttemptId,
                        weight: item.weight
                    }))
                }))
            })),
            evaluationAttempts: course.evaluationAttempts.map(att => ({
                id: att.id,
                startTime: att.startTime,
                endTime: att.endTime,
                evaluation: att.evaluation ? {
                    id: att.evaluation.id,
                    title: att.evaluation.title,
                    description: att.evaluation.description,
                    helpUrl: att.evaluation.helpUrl,
                    maxSupportAttempts: att.evaluation.maxSupportAttempts,
                    aiSupportDelaySeconds: att.evaluation.aiSupportDelaySeconds,
                    expulsionPenalty: att.evaluation.expulsionPenalty,
                    wildcardAiHints: att.evaluation.wildcardAiHints,
                    wildcardSecondChance: att.evaluation.wildcardSecondChance,
                    questions: att.evaluation.questions.map(q => ({
                        id: q.id,
                        text: q.text,
                        type: q.type,
                        language: q.language,
                        referenceAnswer: q.referenceAnswer,
                        order: q.order
                    }))
                } : null,
                submissions: att.submissions.map(sub => ({
                    studentEmail: sub.user.email,
                    score: sub.score,
                    submittedAt: sub.submittedAt,
                    expulsions: sub.expulsions,
                    wildcardsUsed: sub.wildcardsUsed,
                    answers: sub.answersList.map(ans => ({
                        questionText: ans.question.text,
                        questionOrder: ans.question.order,
                        answer: ans.answer,
                        score: ans.score,
                        aiFeedback: ans.aiFeedback,
                        supportAttempts: ans.supportAttempts
                    }))
                }))
            }))
        };

        return exportedData;
    },

    async importCourseFromJSON(data: any, teacherId: string) {
        if (!data || data.version !== "1.0" || !data.course) {
            throw new Error("Datos de curso inválidos o versión no soportada");
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Create the Course
            const newCourse = await tx.course.create({
                data: {
                    title: `Importado: ${data.course.title}`,
                    description: data.course.description,
                    registrationOpen: data.course.registrationOpen,
                    registrationDeadline: data.course.registrationDeadline ? new Date(data.course.registrationDeadline) : null,
                    startDate: data.course.startDate ? new Date(data.course.startDate) : null,
                    endDate: data.course.endDate ? new Date(data.course.endDate) : null,
                    teacherId: teacherId,
                    docTrackingEnabled: data.course.docTrackingEnabled ?? true,
                    docAiTutorEnabled: data.course.docAiTutorEnabled ?? false,
                    docAiQuestionsLimit: data.course.docAiQuestionsLimit ?? 5,
                    docThemeMode: data.course.docThemeMode ?? "STUDENT",
                    docCodeTheme: data.course.docCodeTheme ?? "one-dark-pro",
                    docAllowCodeThemeChange: data.course.docAllowCodeThemeChange ?? true,
                    docThemeColor: data.course.docThemeColor ?? "zinc",
                    docAllowThemeColorChange: data.course.docAllowThemeColorChange ?? true,
                    enrollmentCode: Math.floor(100000 + Math.random() * 900000).toString(),
                }
            });

            const emailToUserIdMap: Record<string, string> = {};

            // 2. Process and import Students
            if (data.students && Array.isArray(data.students)) {
                for (const student of data.students) {
                    let user = await tx.user.findUnique({
                        where: { email: student.email }
                    });

                    if (!user) {
                        user = await tx.user.create({
                            data: {
                                id: crypto.randomUUID(),
                                email: student.email,
                                name: student.name || student.email.split('@')[0],
                                role: "student",
                                emailVerified: true,
                            }
                        });
                    }

                    emailToUserIdMap[student.email] = user.id;

                    if (student.profile) {
                        const existingProfile = await tx.profile.findUnique({
                            where: { userId: user.id }
                        });

                        if (!existingProfile) {
                            await tx.profile.create({
                                data: {
                                    identificacion: student.profile.identificacion,
                                    nombres: student.profile.nombres,
                                    apellido: student.profile.apellido,
                                    telefono: student.profile.telefono,
                                    userId: user.id,
                                    dataProcessingConsent: student.profile.dataProcessingConsent ?? false,
                                }
                            });
                        }
                    }

                    await tx.enrollment.create({
                        data: {
                            userId: user.id,
                            courseId: newCourse.id,
                            status: student.status || "APPROVED"
                        }
                    });
                }
            }

            // 3. Import Activities and Submissions
            const activityIdMap: Record<string, string> = {};
            if (data.activities && Array.isArray(data.activities)) {
                for (const act of data.activities) {
                    const newActivity = await tx.activity.create({
                        data: {
                            title: act.title,
                            description: act.description,
                            statement: act.statement,
                            filePaths: act.filePaths,
                            deadline: new Date(act.deadline),
                            type: act.type,
                            weight: act.weight,
                            maxAttempts: act.maxAttempts,
                            order: act.order,
                            openDate: act.openDate ? new Date(act.openDate) : null,
                            allowLinkSubmission: act.allowLinkSubmission ?? false,
                            courseId: newCourse.id
                        }
                    });

                    activityIdMap[act.id] = newActivity.id;

                    if (act.submissions && Array.isArray(act.submissions)) {
                        for (const sub of act.submissions) {
                            const newUserId = emailToUserIdMap[sub.studentEmail];
                            if (newUserId) {
                                await tx.submission.create({
                                    data: {
                                        url: sub.url,
                                        grade: sub.grade,
                                        feedback: sub.feedback,
                                        attemptCount: sub.attemptCount || 1,
                                        lastSubmittedAt: new Date(sub.lastSubmittedAt),
                                        createdAt: sub.createdAt ? new Date(sub.createdAt) : new Date(),
                                        activityId: newActivity.id,
                                        userId: newUserId
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // 4. Import Attendances
            if (data.attendances && Array.isArray(data.attendances)) {
                for (const att of data.attendances) {
                    const newUserId = emailToUserIdMap[att.studentEmail];
                    if (newUserId) {
                        await tx.attendance.create({
                            data: {
                                date: new Date(att.date),
                                status: att.status,
                                arrivalTime: att.arrivalTime ? new Date(att.arrivalTime) : null,
                                justification: att.justification,
                                justificationUrl: att.justificationUrl,
                                courseId: newCourse.id,
                                userId: newUserId
                            }
                        });
                    }
                }
            }

            // 5. Import Remarks
            if (data.remarks && Array.isArray(data.remarks)) {
                for (const rem of data.remarks) {
                    const newUserId = emailToUserIdMap[rem.studentEmail];
                    if (newUserId) {
                        await tx.remark.create({
                            data: {
                                type: rem.type,
                                title: rem.title,
                                description: rem.description,
                                date: new Date(rem.date),
                                courseId: newCourse.id,
                                userId: newUserId,
                                teacherId: teacherId
                            }
                        });
                    }
                }
            }

            // 6. Import Evaluations and Attempts
            const evaluationIdMap: Record<string, string> = {};
            const questionIdMap: Record<string, string> = {};
            const attemptIdMap: Record<string, string> = {};

            if (data.evaluationAttempts && Array.isArray(data.evaluationAttempts)) {
                for (const att of data.evaluationAttempts) {
                    let newEvaluationId: string | null = null;

                    if (att.evaluation) {
                        const originalEval = att.evaluation;
                        if (!evaluationIdMap[originalEval.id]) {
                            const newEval = await tx.evaluation.create({
                                data: {
                                    title: originalEval.title,
                                    description: originalEval.description,
                                    helpUrl: originalEval.helpUrl,
                                    authorId: teacherId,
                                    maxSupportAttempts: originalEval.maxSupportAttempts ?? 3,
                                    aiSupportDelaySeconds: originalEval.aiSupportDelaySeconds ?? 60,
                                    expulsionPenalty: originalEval.expulsionPenalty ?? 0,
                                    wildcardAiHints: originalEval.wildcardAiHints ?? 0,
                                    wildcardSecondChance: originalEval.wildcardSecondChance ?? 0
                                }
                            });
                            evaluationIdMap[originalEval.id] = newEval.id;

                            if (originalEval.questions && Array.isArray(originalEval.questions)) {
                                for (const q of originalEval.questions) {
                                    const newQ = await tx.question.create({
                                        data: {
                                            evaluationId: newEval.id,
                                            text: q.text,
                                            type: q.type,
                                            language: q.language,
                                            referenceAnswer: q.referenceAnswer,
                                            order: q.order
                                        }
                                    });
                                    questionIdMap[q.id] = newQ.id;
                                }
                            }
                        }
                        newEvaluationId = evaluationIdMap[originalEval.id];
                    }

                    if (newEvaluationId) {
                        const newAttempt = await tx.evaluationAttempt.create({
                            data: {
                                evaluationId: newEvaluationId,
                                startTime: new Date(att.startTime),
                                endTime: new Date(att.endTime),
                                courseId: newCourse.id
                            }
                        });
                        attemptIdMap[att.id] = newAttempt.id;

                        if (att.submissions && Array.isArray(att.submissions)) {
                            for (const sub of att.submissions) {
                                const newUserId = emailToUserIdMap[sub.studentEmail];
                                if (newUserId) {
                                    const newSubmission = await tx.evaluationSubmission.create({
                                        data: {
                                            attemptId: newAttempt.id,
                                            userId: newUserId,
                                            score: sub.score,
                                            submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : null,
                                            expulsions: sub.expulsions ?? 0,
                                            wildcardsUsed: sub.wildcardsUsed ?? {},
                                        }
                                    });

                                    if (sub.answers && Array.isArray(sub.answers)) {
                                        for (const ans of sub.answers) {
                                            const question = await tx.question.findFirst({
                                                where: {
                                                    evaluationId: newEvaluationId,
                                                    text: ans.questionText,
                                                    order: ans.questionOrder
                                                }
                                            });

                                            if (question) {
                                                await tx.evaluationAnswer.create({
                                                    data: {
                                                        submissionId: newSubmission.id,
                                                        questionId: question.id,
                                                        answer: ans.answer,
                                                        score: ans.score,
                                                        aiFeedback: ans.aiFeedback ?? null,
                                                        supportAttempts: ans.supportAttempts ?? 0
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 7. Import GradeCategories, GradeGroups and GradeGroupItems
            if (data.gradeCategories && Array.isArray(data.gradeCategories)) {
                for (const cat of data.gradeCategories) {
                    const newCat = await tx.gradeCategory.create({
                        data: {
                            name: cat.name,
                            weight: cat.weight,
                            courseId: newCourse.id
                        }
                    });

                    if (cat.groups && Array.isArray(cat.groups)) {
                        for (const g of cat.groups) {
                            const newGroup = await tx.gradeGroup.create({
                                data: {
                                    name: g.name,
                                    weight: g.weight,
                                    categoryId: newCat.id,
                                    courseId: newCourse.id
                                }
                            });

                            if (g.items && Array.isArray(g.items)) {
                                for (const item of g.items) {
                                    const mappedActivityId = item.activityId ? activityIdMap[item.activityId] : null;
                                    const mappedAttemptId = item.evaluationAttemptId ? attemptIdMap[item.evaluationAttemptId] : null;

                                    if (mappedActivityId || mappedAttemptId) {
                                        await tx.gradeGroupItem.create({
                                            data: {
                                                groupId: newGroup.id,
                                                activityId: mappedActivityId,
                                                evaluationAttemptId: mappedAttemptId,
                                                weight: item.weight
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return newCourse;
        });
    }
};
