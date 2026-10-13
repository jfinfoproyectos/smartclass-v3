import prisma from "@/lib/prisma";

export const evaluationService = {
    async createEvaluation(data: {
        title: string;
        description?: string;
        helpUrl?: string;
        authorId: string;
        maxSupportAttempts?: number;
        aiSupportDelaySeconds?: number;
        expulsionPenalty?: number;
        wildcardAiHints?: number;
        wildcardSecondChance?: number;
    }) {
        return await prisma.evaluation.create({
            data: {
                title: data.title,
                description: data.description,
                helpUrl: data.helpUrl,
                authorId: data.authorId,
                maxSupportAttempts: data.maxSupportAttempts || 3,
                aiSupportDelaySeconds: data.aiSupportDelaySeconds || 60,
                expulsionPenalty: data.expulsionPenalty ?? 0,
                wildcardAiHints: data.wildcardAiHints ?? 0,
                wildcardSecondChance: data.wildcardSecondChance ?? 0,
            },
        });
    },

    async updateEvaluation(id: string, authorId: string, data: {
        title?: string;
        description?: string;
        helpUrl?: string;
        maxSupportAttempts?: number;
        aiSupportDelaySeconds?: number;
        expulsionPenalty?: number;
        wildcardAiHints?: number;
        wildcardSecondChance?: number;
    }) {
        const evaluation = await prisma.evaluation.findUnique({ where: { id } });
        if (!evaluation || (evaluation.authorId !== authorId && authorId !== 'admin')) {
            throw new Error("Unauthorized to edit this evaluation.");
        }

        return await prisma.evaluation.update({
            where: { id },
            data,
        });
    },

    async getTeacherEvaluations(authorId: string) {
        return await prisma.evaluation.findMany({
            where: { authorId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        questions: true,
                        attempts: true,
                    }
                }
            }
        });
    },

    async deleteEvaluation(id: string, authorId: string) {
        // Verify ownership before deleting
        const evaluation = await prisma.evaluation.findUnique({
            where: { id },
            select: {
                authorId: true,
                attempts: {
                    select: {
                        id: true,
                        courseId: true,
                    }
                }
            }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized or evaluation not found");
        }

        const attemptIds = evaluation.attempts.map(a => a.id);
        const courseIds = evaluation.attempts
            .map(a => a.courseId)
            .filter((cId): cId is string => Boolean(cId));

        if (attemptIds.length > 0) {
            await prisma.gradeGroupItem.deleteMany({
                where: { evaluationAttemptId: { in: attemptIds } }
            });
        }

        await prisma.gradeGroupItem.deleteMany({
            where: {
                activityId: null,
                evaluationAttemptId: null
            }
        });

        const deleted = await prisma.evaluation.delete({
            where: { id },
        });

        return { deleted, courseIds: Array.from(new Set(courseIds)) };
    },

    // Questions
    async getEvaluationWithQuestions(id: string, authorId: string) {
        const evaluation = await prisma.evaluation.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order: "asc" }
                }
            }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized or evaluation not found");
        }

        return evaluation;
    },

    async createQuestion(data: {
        evaluationId: string;
        text: string;
        type: string;
        language?: string;
        referenceAnswer?: string;
    }) {
        // Obtenemos el último orden para asignar el siguiente
        const lastQuestion = await prisma.question.findFirst({
            where: { evaluationId: data.evaluationId },
            orderBy: { order: "desc" },
            select: { order: true }
        });
        const nextOrder = (lastQuestion?.order ?? 0) + 1;

        return await prisma.question.create({
            data: {
                evaluationId: data.evaluationId,
                text: data.text,
                type: data.type,
                language: data.language,
                referenceAnswer: data.referenceAnswer,
                order: nextOrder
            },
        });
    },

    async updateQuestion(questionId: string, evaluationId: string, authorId: string, data: {
        text: string;
        type: string;
        language?: string;
        referenceAnswer?: string;
    }) {
        // Verify ownership
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { authorId: true }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized");
        }

        return await prisma.question.update({
            where: { id: questionId },
            data: {
                text: data.text,
                type: data.type,
                language: data.language,
                referenceAnswer: data.referenceAnswer,
            },
        });
    },

    async updateQuestionsOrder(evaluationId: string, authorId: string, questionOrders: { id: string, order: number }[]) {
        // Verify ownership
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { authorId: true }
        });

        if (!evaluation || (evaluation.authorId !== authorId && authorId !== 'admin')) {
            throw new Error("Unauthorized");
        }

        // Use a transaction for bulk update
        return await prisma.$transaction(
            questionOrders.map((q) =>
                prisma.question.update({
                    where: { id: q.id },
                    data: { order: q.order }
                })
            )
        );
    },

    async createQuestionsBatch(evaluationId: string, authorId: string, questions: {
        text: string;
        type: string;
        language?: string;
        referenceAnswer?: string;
    }[]) {
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { authorId: true }
        });

        if (!evaluation || (evaluation.authorId !== authorId && authorId !== 'admin')) {
            throw new Error("Unauthorized to add questions to this evaluation.");
        }

        const lastQuestion = await prisma.question.findFirst({
            where: { evaluationId },
            orderBy: { order: "desc" },
            select: { order: true }
        });

        let currentOrder = (lastQuestion?.order ?? 0) + 1;
        const created = [];
        for (const q of questions) {
            const item = await prisma.question.create({
                data: {
                    evaluationId,
                    text: q.text,
                    type: q.type,
                    language: q.type === "Code" ? (q.language || "javascript") : undefined,
                    referenceAnswer: q.referenceAnswer || null,
                    order: currentOrder++
                }
            });
            created.push(item);
        }

        return created;
    },

    async getEvaluationGroupDocProjects(evaluationId: string, authorId: string) {
        // 1. Attempts for this evaluation
        const attempts = await prisma.evaluationAttempt.findMany({
            where: { evaluationId },
            include: {
                course: {
                    include: {
                        docLinks: {
                            include: {
                                docProject: {
                                    include: {
                                        pages: {
                                            where: { draft: false },
                                            select: {
                                                id: true,
                                                title: true,
                                                slug: true,
                                                category: true,
                                                order: true,
                                            },
                                            orderBy: [
                                                { categoryOrder: "asc" },
                                                { order: "asc" }
                                            ]
                                        }
                                    }
                                }
                            },
                            orderBy: { order: "asc" }
                        }
                    }
                }
            }
        });

        // 2. Also find other courses of this teacher that have assigned docLinks
        const teacherCourses = await prisma.course.findMany({
            where: { teacherId: authorId },
            include: {
                docLinks: {
                    include: {
                        docProject: {
                            include: {
                                pages: {
                                    where: { draft: false },
                                    select: {
                                        id: true,
                                        title: true,
                                        slug: true,
                                        category: true,
                                        order: true,
                                    },
                                    orderBy: [
                                        { categoryOrder: "asc" },
                                        { order: "asc" }
                                    ]
                                }
                            }
                        }
                    },
                    orderBy: { order: "asc" }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const directCourseIds = new Set<string>();
        const groups: Array<{
            courseId: string;
            courseTitle: string;
            isDirectlyAssigned: boolean;
            docProjects: Array<{
                id: string;
                name: string;
                slug: string;
                icon: string | null;
                description: string | null;
                pages: Array<{
                    id: string;
                    title: string;
                    slug: string;
                    category: string | null;
                    order: number;
                }>;
            }>;
        }> = [];

        for (const attempt of attempts) {
            if (attempt.course && !directCourseIds.has(attempt.course.id)) {
                directCourseIds.add(attempt.course.id);
                groups.push({
                    courseId: attempt.course.id,
                    courseTitle: attempt.course.title,
                    isDirectlyAssigned: true,
                    docProjects: attempt.course.docLinks.map(dl => dl.docProject)
                });
            }
        }

        for (const c of teacherCourses) {
            if (!directCourseIds.has(c.id)) {
                groups.push({
                    courseId: c.id,
                    courseTitle: c.title,
                    isDirectlyAssigned: false,
                    docProjects: c.docLinks.map(dl => dl.docProject)
                });
            }
        }

        return groups;
    },

    async deleteQuestion(id: string, evaluationId: string, authorId: string) {
        // Verify ownership of the parent evaluation before deleting
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { authorId: true }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized");
        }

        // Eliminar respuestas asociadas a la pregunta para evitar registros huérfanos
        await prisma.evaluationAnswer.deleteMany({
            where: { questionId: id }
        });

        const deleted = await prisma.question.delete({
            where: { id },
        });

        // Recalcular notas de entregas existentes estrictamente con las preguntas restantes actuales
        const remainingQuestions = await prisma.question.findMany({
            where: { evaluationId },
            select: { id: true }
        });
        const remainingCount = remainingQuestions.length || 1;
        const remainingIds = new Set(remainingQuestions.map(q => q.id));

        const attempts = await prisma.evaluationAttempt.findMany({
            where: { evaluationId },
            select: { id: true }
        });
        const attemptIds = attempts.map(a => a.id);

        if (attemptIds.length > 0) {
            const submissions = await prisma.evaluationSubmission.findMany({
                where: { attemptId: { in: attemptIds } },
                include: { answersList: true }
            });

            for (const sub of submissions) {
                const validAnswers = sub.answersList.filter(a => remainingIds.has(a.questionId));
                const totalScore = validAnswers.reduce((acc, a) => acc + (a.score || 0), 0);
                const calculatedBase = Number((totalScore / remainingCount).toFixed(2));
                const prevWildcards = (sub.wildcardsUsed as any) || {};
                const penalty = Number(prevWildcards.penalty || 0);
                const finalScore = Math.max(0, Number((calculatedBase - penalty).toFixed(2)));

                await prisma.evaluationSubmission.update({
                    where: { id: sub.id },
                    data: { 
                        score: finalScore,
                        wildcardsUsed: {
                            ...prevWildcards,
                            baseScore: calculatedBase
                        }
                    }
                });
            }
        }

        return deleted;
    },

    // Assignments / Attempts
    async getCourseEvaluationAttempts(courseId: string) {
        return await prisma.evaluationAttempt.findMany({
            where: { courseId },
            include: {
                evaluation: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        _count: {
                            select: {
                                questions: true,
                            }
                        }
                    }
                },
                submissions: {
                    select: {
                        id: true,
                        userId: true,
                        submittedAt: true,
                        score: true,
                        expulsions: true,
                    }
                },
                _count: {
                    select: {
                        submissions: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    },

    async assignEvaluationToCourse(data: {
        evaluationId: string;
        courseId: string;
        startTime: Date;
        endTime: Date;
        enableSurveillance?: boolean;
        blockTabSwitch?: boolean;
        requireFullscreen?: boolean;
        blockMultipleDisplays?: boolean;
        blockClipboard?: boolean;
        maxWarnings?: number;
        maxExitTimeSeconds?: number;
        helpUrl?: string | null;
        maxSupportAttempts?: number;
        aiSupportDelaySeconds?: number;
        wildcardAiHints?: number;
        wildcardSecondChance?: number;
        assignedStudentIds?: string[];
    }) {
        return await prisma.evaluationAttempt.create({
            data: {
                evaluationId: data.evaluationId,
                courseId: data.courseId,
                startTime: data.startTime,
                endTime: data.endTime,
                enableSurveillance: data.enableSurveillance ?? true,
                blockTabSwitch: data.blockTabSwitch ?? true,
                requireFullscreen: data.requireFullscreen ?? true,
                blockMultipleDisplays: data.blockMultipleDisplays ?? true,
                blockClipboard: data.blockClipboard ?? true,
                maxWarnings: data.maxWarnings ?? 3,
                maxExitTimeSeconds: data.maxExitTimeSeconds ?? 60,
                helpUrl: data.helpUrl,
                maxSupportAttempts: data.maxSupportAttempts ?? 3,
                aiSupportDelaySeconds: data.aiSupportDelaySeconds ?? 60,
                wildcardAiHints: data.wildcardAiHints ?? 0,
                wildcardSecondChance: data.wildcardSecondChance ?? 0,
                assignedStudentIds: data.assignedStudentIds ?? [],
            }
        });
    },

    async unassignEvaluationAttempt(attemptId: string) {
        const attempt = await prisma.evaluationAttempt.findUnique({
            where: { id: attemptId },
            select: { id: true, courseId: true }
        });

        if (!attempt) {
            return null;
        }

        await prisma.gradeGroupItem.deleteMany({
            where: { evaluationAttemptId: attemptId }
        });

        await prisma.gradeGroupItem.deleteMany({
            where: { activityId: null, evaluationAttemptId: null }
        });

        const deleted = await prisma.evaluationAttempt.delete({
            where: { id: attemptId }
        });

        return { deleted, courseId: attempt.courseId };
    },

    async updateEvaluationAssignment(attemptId: string, data: {
        evaluationId?: string;
        startTime?: Date;
        endTime?: Date;
        enableSurveillance?: boolean;
        blockTabSwitch?: boolean;
        requireFullscreen?: boolean;
        blockMultipleDisplays?: boolean;
        blockClipboard?: boolean;
        maxWarnings?: number;
        maxExitTimeSeconds?: number;
        helpUrl?: string | null;
        maxSupportAttempts?: number;
        aiSupportDelaySeconds?: number;
        wildcardAiHints?: number;
        wildcardSecondChance?: number;
        assignedStudentIds?: string[];
    }) {
        const updateData: any = {};

        if (data.evaluationId) {
            updateData.evaluation = { connect: { id: data.evaluationId } };
        }
        if (data.startTime && !isNaN(data.startTime.getTime())) {
            updateData.startTime = data.startTime;
        }
        if (data.endTime && !isNaN(data.endTime.getTime())) {
            updateData.endTime = data.endTime;
        }
        if (data.enableSurveillance !== undefined) {
            updateData.enableSurveillance = data.enableSurveillance;
        }
        if (data.blockTabSwitch !== undefined) {
            updateData.blockTabSwitch = data.blockTabSwitch;
        }
        if (data.requireFullscreen !== undefined) {
            updateData.requireFullscreen = data.requireFullscreen;
        }
        if (data.blockMultipleDisplays !== undefined) {
            updateData.blockMultipleDisplays = data.blockMultipleDisplays;
        }
        if (data.blockClipboard !== undefined) {
            updateData.blockClipboard = data.blockClipboard;
        }
        if (data.maxWarnings !== undefined) {
            updateData.maxWarnings = data.maxWarnings;
        }
        if (data.maxExitTimeSeconds !== undefined) {
            updateData.maxExitTimeSeconds = data.maxExitTimeSeconds;
        }
        if (data.helpUrl !== undefined) {
            updateData.helpUrl = data.helpUrl;
        }
        if (data.maxSupportAttempts !== undefined) {
            updateData.maxSupportAttempts = data.maxSupportAttempts;
        }
        if (data.aiSupportDelaySeconds !== undefined) {
            updateData.aiSupportDelaySeconds = data.aiSupportDelaySeconds;
        }
        if (data.wildcardAiHints !== undefined) {
            updateData.wildcardAiHints = data.wildcardAiHints;
        }
        if (data.wildcardSecondChance !== undefined) {
            updateData.wildcardSecondChance = data.wildcardSecondChance;
        }
        if (data.assignedStudentIds !== undefined) {
            updateData.assignedStudentIds = data.assignedStudentIds;
        }

        return await prisma.evaluationAttempt.update({
            where: { id: attemptId },
            data: updateData,
            include: {
                evaluation: {
                    select: { title: true }
                }
            }
        });
    },

    // Student Exam Execution
    async getAttemptWithQuestions(attemptId: string) {
        const attempt = await prisma.evaluationAttempt.findUnique({
            where: { id: attemptId },
            include: {
                evaluation: {
                    include: {
                        questions: {
                            orderBy: { order: "asc" }
                        }
                    }
                }
            }
        });

        if (!attempt || !attempt.evaluation) {
            return null;
        }

        return attempt;
    },

    async getOrCreateSubmission(attemptId: string, userId: string, clientIp?: string, userAgent?: string) {
        // Find attempt to verify student authorization
        const attempt = await prisma.evaluationAttempt.findUnique({
            where: { id: attemptId },
            select: {
                id: true,
                assignedStudentIds: true,
                evaluation: {
                    select: { id: true }
                }
            }
        });

        if (!attempt || !attempt.evaluation) {
            throw new Error("La evaluación no existe o ha sido eliminada por el profesor.");
        }

        if (attempt.assignedStudentIds) {
            const assignedIds = Array.isArray(attempt.assignedStudentIds)
                ? (attempt.assignedStudentIds as string[])
                : typeof attempt.assignedStudentIds === 'string'
                    ? JSON.parse(attempt.assignedStudentIds)
                    : [];
            if (assignedIds.length > 0 && !assignedIds.includes(userId)) {
                throw new Error("No tienes asignada esta evaluación.");
            }
        }

        const nowIso = new Date().toISOString();
        const initialWildcards = clientIp ? {
            initialIp: clientIp,
            detectedIps: [clientIp],
            effectiveIps: [clientIp],
            multipleIpAlert: false,
            ipHistory: [{
                ip: clientIp,
                firstSeen: nowIso,
                lastSeen: nowIso,
                count: 1,
                userAgent: userAgent ? userAgent.substring(0, 150) : "N/A",
                action: "init",
            }],
        } : {};

        // Find existing
        let submission = await prisma.evaluationSubmission.findFirst({
            where: {
                attemptId: attemptId,
                userId: userId
            },
            include: {
                answersList: true
            }
        });

        // Create if missing
        if (!submission) {
            submission = await prisma.evaluationSubmission.create({
                data: {
                    attemptId,
                    userId,
                    wildcardsUsed: initialWildcards,
                },
                include: {
                    answersList: true
                }
            });
        }

        return submission;
    },

    // Teacher Evaluation Submissions Manager
    async getSubmissionsByAttempt(attemptId: string) {
        const attempt = await prisma.evaluationAttempt.findUnique({
            where: { id: attemptId },
            select: { assignedStudentIds: true }
        });

        const submissions = await prisma.evaluationSubmission.findMany({
            where: { attemptId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                },
                answersList: {
                    select: {
                        questionId: true,
                        answer: true,
                        score: true,
                        aiFeedback: true,
                        updatedAt: true,
                    }
                },
                _count: {
                    select: {
                        answersList: true
                    }
                }
            },
            orderBy: {
                user: {
                    name: "asc"
                }
            }
        });

        const assignedIds: string[] = Array.isArray(attempt?.assignedStudentIds)
            ? (attempt.assignedStudentIds as string[])
            : typeof attempt?.assignedStudentIds === "string"
                ? JSON.parse(attempt.assignedStudentIds)
                : [];

        if (assignedIds.length > 0) {
            const existingUserIds = new Set(submissions.map(s => s.userId));
            const missingAssignedIds = assignedIds.filter(id => !existingUserIds.has(id));

            let pendingPlaceholders: any[] = [];
            if (missingAssignedIds.length > 0) {
                const missingUsers = await prisma.user.findMany({
                    where: { id: { in: missingAssignedIds } },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                nombres: true,
                                apellido: true,
                            }
                        }
                    }
                });

                pendingPlaceholders = missingUsers.map(u => ({
                    id: `pending-${u.id}`,
                    attemptId,
                    userId: u.id,
                    score: null,
                    submittedAt: null,
                    expulsions: 0,
                    wildcardsUsed: {},
                    user: u,
                    answersList: [],
                    _count: { answersList: 0 },
                    isNotStarted: true,
                    isAssignedTarget: true,
                }));
            }

            const enrichedExisting = submissions.map(s => ({
                ...s,
                isAssignedTarget: assignedIds.includes(s.userId),
                isNotStarted: false
            }));

            // Return pending placeholders first or combined
            return [...pendingPlaceholders, ...enrichedExisting];
        }

        return submissions.map(s => ({
            ...s,
            isAssignedTarget: true,
            isNotStarted: false
        }));
    },

    async getSubmissionDetails(submissionId: string) {
        return await prisma.evaluationSubmission.findUnique({
            where: { id: submissionId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                attempt: {
                    include: {
                        evaluation: {
                            include: {
                                questions: {
                                    orderBy: { order: "asc" }
                                }
                            }
                        }
                    }
                },
                answersList: true
            }
        });
    },

    async deleteSubmission(submissionId: string) {
        return await prisma.evaluationSubmission.delete({
            where: { id: submissionId }
        });
    },

    /**
     * Export / Import
     */
    async getFullEvaluationData(id: string, authorId: string) {
        const evaluation = await prisma.evaluation.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { order: "asc" }
                }
            }
        });

        if (!evaluation || (evaluation.authorId !== authorId && authorId !== 'admin')) {
            throw new Error("Unauthorized or evaluation not found");
        }

        // Return data without IDs to avoid conflicts on import
        return {
            title: evaluation.title,
            description: evaluation.description,
            helpUrl: evaluation.helpUrl,
            maxSupportAttempts: evaluation.maxSupportAttempts,
            aiSupportDelaySeconds: evaluation.aiSupportDelaySeconds,
            expulsionPenalty: evaluation.expulsionPenalty,
            wildcardAiHints: evaluation.wildcardAiHints,
            wildcardSecondChance: evaluation.wildcardSecondChance,
            questions: evaluation.questions.map(q => ({
                text: q.text,
                type: q.type,
                language: q.language,
                referenceAnswer: q.referenceAnswer,
                order: q.order
            }))
        };
    },

    async createFullEvaluation(authorId: string, data: any) {
        return await prisma.$transaction(async (tx) => {
            const evaluation = await tx.evaluation.create({
                data: {
                    title: data.title,
                    description: data.description,
                    helpUrl: data.helpUrl,
                    authorId,
                    maxSupportAttempts: data.maxSupportAttempts || 3,
                    aiSupportDelaySeconds: data.aiSupportDelaySeconds || 60,
                    expulsionPenalty: data.expulsionPenalty ?? 0,
                    wildcardAiHints: data.wildcardAiHints ?? 0,
                    wildcardSecondChance: data.wildcardSecondChance ?? 0,
                    questions: {
                        create: data.questions.map((q: any, i: number) => ({
                            text: q.text,
                            type: q.type,
                            language: q.language,
                            referenceAnswer: q.referenceAnswer,
                            order: q.order || (i + 1)
                        }))
                    }
                }
            });
            return evaluation;
        });
    },

    /**
     * Lazy finalization of expired submissions.
     * Marks all unsubmitted attempts as submitted at the deadline if they have expired.
     */
    async finalizeExpiredSubmissions(courseId?: string, attemptId?: string) {
        const now = new Date();

        // Find all submissions that are NOT submitted but whose attempt deadline has passed
        const expiredSubmissions = await prisma.evaluationSubmission.findMany({
            where: {
                submittedAt: null,
                attempt: {
                    endTime: { lt: now },
                    ...(courseId ? { courseId } : {}),
                    ...(attemptId ? { id: attemptId } : {}),
                }
            },
            include: {
                attempt: { select: { endTime: true } }
            }
        });

        if (expiredSubmissions.length === 0) return;

        // Update them in bulk (or sequential if we need logic, but here simple update works)
        await prisma.evaluationSubmission.updateMany({
            where: {
                id: { in: expiredSubmissions.map(s => s.id) }
            },
            data: {
                // We use the attempt's endTime as the submission time for consistency
                // Note: since updateMany doesn't support relation fields in 'data', 
                // we'll just use 'now' or do it in a loop if we want per-attempt endTime.
                // Using 'now' is acceptable as it indicates they were auto-finalized.
                submittedAt: now
            }
        });

        console.log(`Auto-finalized ${expiredSubmissions.length} expired submissions.`);
    }
};

// Wrap methods to include lazy finalization
const originalGetCourseEvaluationAttempts = evaluationService.getCourseEvaluationAttempts;
evaluationService.getCourseEvaluationAttempts = async function (courseId: string) {
    await this.finalizeExpiredSubmissions(courseId);
    return originalGetCourseEvaluationAttempts.apply(this, [courseId]);
};

const originalGetSubmissionsByAttempt = evaluationService.getSubmissionsByAttempt;
evaluationService.getSubmissionsByAttempt = async function (attemptId: string) {
    await this.finalizeExpiredSubmissions(undefined, attemptId);
    return originalGetSubmissionsByAttempt.apply(this, [attemptId]);
};

const originalGetAttemptWithQuestions = evaluationService.getAttemptWithQuestions;
evaluationService.getAttemptWithQuestions = async function (attemptId: string) {
    await this.finalizeExpiredSubmissions(undefined, attemptId);
    return originalGetAttemptWithQuestions.apply(this, [attemptId]);
};

