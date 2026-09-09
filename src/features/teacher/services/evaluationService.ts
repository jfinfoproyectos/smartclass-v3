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
            select: { authorId: true }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized or evaluation not found");
        }

        return await prisma.evaluation.delete({
            where: { id },
        });
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

    async deleteQuestion(id: string, evaluationId: string, authorId: string) {
        // Verify ownership of the parent evaluation before deleting
        const evaluation = await prisma.evaluation.findUnique({
            where: { id: evaluationId },
            select: { authorId: true }
        });

        if (!evaluation || evaluation.authorId !== authorId) {
            throw new Error("Unauthorized");
        }

        return await prisma.question.delete({
            where: { id },
        });
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
        return await prisma.evaluationAttempt.delete({
            where: { id: attemptId }
        });
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
        return await prisma.evaluationAttempt.findUnique({
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
    },

    async getOrCreateSubmission(attemptId: string, userId: string) {
        // Find attempt to verify student authorization
        const attempt = await prisma.evaluationAttempt.findUnique({
            where: { id: attemptId },
            select: { assignedStudentIds: true }
        });

        if (attempt?.assignedStudentIds) {
            const assignedIds = Array.isArray(attempt.assignedStudentIds)
                ? (attempt.assignedStudentIds as string[])
                : typeof attempt.assignedStudentIds === 'string'
                    ? JSON.parse(attempt.assignedStudentIds)
                    : [];
            if (assignedIds.length > 0 && !assignedIds.includes(userId)) {
                throw new Error("No tienes asignada esta evaluación.");
            }
        }

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
        return await prisma.evaluationSubmission.findMany({
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
                        score: true,
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

