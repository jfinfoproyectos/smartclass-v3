"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function recordFraudAttemptForSubmission(
    submissionId: string,
    questionId: string,
    studentAnswer: string,
    detectedPattern?: string,
    source: string = "manual"
) {
    try {
        const submission = await prisma.evaluationSubmission.findUnique({
            where: { id: submissionId },
            include: {
                attempt: { select: { id: true, courseId: true, evaluationId: true } },
                user: { select: { id: true, name: true, role: true } }
            }
        });
        if (!submission) return;

        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: { id: true, text: true, type: true, order: true }
        });

        const currentWildcards = typeof submission.wildcardsUsed === 'string'
            ? JSON.parse(submission.wildcardsUsed)
            : (submission.wildcardsUsed as any) || {};

        const fraudAttempts: Array<any> = Array.isArray(currentWildcards.fraudAttempts)
            ? [...currentWildcards.fraudAttempts]
            : [];

        const nowIso = new Date().toISOString();

        // Evitar duplicados consecutivos idénticos para la misma pregunta en menos de 5 segundos
        const recentSame = fraudAttempts.find(
            (f: any) => f.questionId === questionId && f.studentAnswer === studentAnswer && (Date.now() - new Date(f.timestamp).getTime() < 5000)
        );

        if (!recentSame) {
            fraudAttempts.push({
                id: `fraud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                questionId,
                questionOrder: question?.order ?? 0,
                questionText: question?.text ? question.text.substring(0, 300) : "Pregunta",
                questionType: question?.type || "Text",
                studentAnswer,
                detectedPattern: detectedPattern || "Solicitud de respuesta detectada",
                timestamp: nowIso,
                source,
            });

            const updatedWildcards = {
                ...currentWildcards,
                hasFraudAlert: true,
                fraudAttemptsCount: fraudAttempts.length,
                fraudAttempts,
                lastFraudAttemptAt: nowIso,
            };

            await prisma.evaluationSubmission.update({
                where: { id: submissionId },
                data: { wildcardsUsed: updatedWildcards }
            });

            // Notificar al monitor del docente vía SSE para actualizar el mapa de alertas al instante
            try {
                const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
                emitEvaluationUpdate({
                    attemptId: submission.attemptId,
                    evaluationId: submission.attempt?.evaluationId,
                    submissionId: submission.id,
                    studentId: submission.userId,
                    type: "FRAUD_ATTEMPT_DETECTED",
                    timestamp: Date.now(),
                    message: `🚨 ALERTA DE INTEGRIDAD: El estudiante ${submission.user?.name || "Estudiante"} intentó solicitar la solución ("${detectedPattern || studentAnswer.substring(0, 40)}") en la pregunta.`,
                    fraudEvidence: {
                        questionId,
                        questionText: question?.text,
                        studentAnswer,
                        pattern: detectedPattern
                    }
                });
            } catch (sseErr) {
                console.error("Error al emitir evento FRAUD_ATTEMPT_DETECTED SSE:", sseErr);
            }

            // Auditoría institucional
            try {
                const { auditLogger } = await import("../../admin/services/auditLogger");
                await auditLogger.log({
                    action: "UPDATE",
                    entity: "EVALUATION_SUBMISSION",
                    entityId: submissionId,
                    userId: submission.user?.id || submission.userId,
                    userName: submission.user?.name || "Estudiante",
                    userRole: submission.user?.role || "student",
                    description: `ALERTA DE SEGURIDAD: Intento de fraude / solicitud de respuesta ("${detectedPattern || "solicitud detectada"}"). Entrega: ${submissionId}`,
                    success: true,
                    metadata: {
                        questionId,
                        studentAnswer,
                        detectedPattern,
                        source
                    }
                });
            } catch (auditErr) {
                console.error("Error al registrar auditoría de fraude:", auditErr);
            }

            if (submission.attempt?.courseId) {
                revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}`);
                revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}/submissions/${submission.id}`);
            }
        }
    } catch (err) {
        console.error("Error en recordFraudAttemptForSubmission:", err);
    }
}

export async function registerExpulsionAction(submissionId: string, reason?: "resize" | "multi_screen") {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                select: {
                    id: true,
                    courseId: true,
                    maxWarnings: true,
                    enableSurveillance: true,
                    evaluationId: true,
                }
            }
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    const currentWildcards = typeof submission.wildcardsUsed === 'string'
        ? JSON.parse(submission.wildcardsUsed)
        : (submission.wildcardsUsed as any) || {};

    const prevExpulsionLogs = Array.isArray(currentWildcards.expulsionLogs) ? currentWildcards.expulsionLogs : [];
    const reasonLabel = reason === "resize" 
        ? "Ventana desmaximizada / redimensionada" 
        : reason === "multi_screen" 
            ? "Múltiples pantallas detectadas" 
            : "Incumplimiento de entorno de seguridad";

    const expulsionEntry = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        reason: reason || "unknown",
        reasonLabel,
        timestamp: new Date().toISOString(),
    };

    // Incremento atómico para evitar condiciones de carrera
    const updated = await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            expulsions: {
                increment: 1,
            },
            wildcardsUsed: {
                ...currentWildcards,
                expulsionLogs: [...prevExpulsionLogs, expulsionEntry],
            },
        },
        select: {
            id: true,
            expulsions: true,
            attemptId: true,
            attempt: {
                select: {
                    courseId: true,
                    evaluationId: true,
                }
            }
        }
    });

    const newExpulsions = updated.expulsions;

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "EVALUATION_SUBMISSION",
            entityId: submissionId,
            userId: session.user.id,
            userName: session.user.name || "Estudiante",
            userRole: session.user.role,
            description: `Expulsión temporal registrada (${reasonLabel}, Total: ${newExpulsions}) en entrega ${submissionId}`,
            success: true,
        });
    } catch (logErr) {
        console.error("Audit log error in registerExpulsionAction:", logErr);
    }

    // Notificar al profesor vía SSE
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        emitEvaluationUpdate({
            attemptId: updated.attemptId,
            evaluationId: updated.attempt?.evaluationId,
            submissionId,
            studentId: session.user.id,
            type: "PENALTY_UPDATED",
            timestamp: Date.now(),
            message: `Expulsión temporal: ${reasonLabel} (Falta #${newExpulsions}). El estudiante debe corregir el entorno para reingresar.`,
        });
    } catch {}

    // Revalidar rutas para que docente y estudiante vean las faltas actualizadas en tiempo real
    if (updated.attempt?.courseId) {
        revalidatePath(`/dashboard/teacher/courses/${updated.attempt.courseId}/evaluations/${updated.attemptId}`);
        revalidatePath(`/dashboard/teacher/courses/${updated.attempt.courseId}`);
    }
    revalidatePath(`/evaluations/${updated.attemptId}`);

    return { success: true, expulsions: newExpulsions };
}

/**
 * Registra y audita las direcciones IP públicas desde donde se realiza la evaluación.
 * Si se detecta más de una IP distinta (no loopback), activa alerta inmediata
 * para el profesor (SSE + auditoría) y para el estudiante.
 */
/**
 * Registra y audita la dirección IP y huella digital del dispositivo para una entrega de evaluación.
 * Detecta tanto múltiples IPs (diferentes ubicaciones geográficas/redes) como
 * múltiples dispositivos o sesiones concurrentes bajo la misma IP (ej. misma red escolar/institucional).
 */
export async function recordIpForSubmission(
    submissionId: string,
    clientReportedIp?: string,
    actionName: string = "activity",
    devicePayload?: {
        deviceId?: string;
        screenRes?: string;
        browserInfo?: string;
        platform?: string;
    }
) {
    try {
        const reqHeaders = await headers();
        const { extractClientIp, normalizeIp } = await import("../../admin/services/ipSecurityService");
        const serverDetectedIp = extractClientIp(reqHeaders);
        const userAgent = reqHeaders.get("user-agent") || "";

        const cleanServerIp = normalizeIp(serverDetectedIp);
        const cleanClientIp = clientReportedIp ? normalizeIp(clientReportedIp) : null;

        // Si el cliente reporta una IP pública válida y no es loopback, la preferimos; de lo contrario usamos la detectada en el servidor
        const currentIp = (cleanClientIp && cleanClientIp !== "127.0.0.1")
            ? cleanClientIp
            : cleanServerIp;

        if (!currentIp) return null;

        const submission = await prisma.evaluationSubmission.findUnique({
            where: { id: submissionId },
            include: {
                attempt: {
                    select: {
                        id: true,
                        courseId: true,
                        evaluationId: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                }
            }
        });

        if (!submission) return null;

        const currentWildcards = typeof submission.wildcardsUsed === 'string'
            ? JSON.parse(submission.wildcardsUsed)
            : (submission.wildcardsUsed as any) || {};

        const rawDetectedIps: string[] = Array.isArray(currentWildcards.detectedIps)
            ? [...currentWildcards.detectedIps]
            : (currentWildcards.initialIp ? [currentWildcards.initialIp] : []);

        const prevHistory: Array<any> = Array.isArray(currentWildcards.ipHistory)
            ? [...currentWildcards.ipHistory]
            : [];

        // Registro de dispositivos / sesiones (Huella digital para detectar múltiples equipos bajo la misma IP)
        const activeDevices: Array<any> = Array.isArray(currentWildcards.activeDevices)
            ? [...currentWildcards.activeDevices]
            : [];

        // Si no viene deviceId explícito, generar huella por navegador y resolución
        let currentDeviceId = devicePayload?.deviceId || null;
        if (!currentDeviceId && (userAgent || devicePayload?.screenRes)) {
            const uaSnippet = userAgent ? userAgent.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "") : "ua";
            currentDeviceId = `fp_${devicePayload?.screenRes || "res"}_${uaSnippet}`;
        }
        if (!currentDeviceId) {
            currentDeviceId = submission.deviceId || `dev_${Date.now()}`;
        }

        const nowIso = new Date().toISOString();

        if (!rawDetectedIps.includes(currentIp)) {
            rawDetectedIps.push(currentIp);
        }

        // Registrar / actualizar dispositivo en la lista
        if (currentDeviceId) {
            const devIdx = activeDevices.findIndex((d: any) => {
                if (d.id === currentDeviceId) {
                    // Si el ID coincide pero la resolución o plataforma es distinta, es otro equipo físico
                    if (devicePayload?.screenRes && d.screenRes && d.screenRes !== "N/A" && d.screenRes !== devicePayload.screenRes) {
                        return false;
                    }
                    return true;
                }
                return false;
            });

            const devInfo = {
                id: currentDeviceId,
                ip: currentIp,
                userAgent: userAgent ? userAgent.substring(0, 150) : "N/A",
                screenRes: devicePayload?.screenRes || "N/A",
                platform: devicePayload?.platform || "N/A",
                lastSeen: nowIso,
            };

            if (devIdx >= 0) {
                activeDevices[devIdx] = {
                    ...activeDevices[devIdx],
                    ...devInfo,
                    count: (activeDevices[devIdx].count || 1) + 1,
                };
            } else {
                activeDevices.push({
                    ...devInfo,
                    firstSeen: nowIso,
                    count: 1,
                });
            }
        }

        // Si se reporta explícitamente el cierre de sesión/pestaña de este dispositivo
        if (actionName === "session_close" && currentDeviceId) {
            const cIdx = activeDevices.findIndex((d: any) => d.id === currentDeviceId);
            if (cIdx >= 0) {
                activeDevices[cIdx].isClosed = true;
                activeDevices[cIdx].closedAt = nowIso;
            }
        }

        const historyIndex = prevHistory.findIndex((h: any) => h.ip === currentIp);
        if (historyIndex >= 0) {
            prevHistory[historyIndex] = {
                ...prevHistory[historyIndex],
                lastSeen: nowIso,
                count: (prevHistory[historyIndex].count || 1) + 1,
                action: actionName,
                userAgent: userAgent ? userAgent.substring(0, 150) : prevHistory[historyIndex].userAgent,
                deviceId: currentDeviceId || prevHistory[historyIndex].deviceId,
            };
        } else {
            prevHistory.push({
                ip: currentIp,
                firstSeen: nowIso,
                lastSeen: nowIso,
                count: 1,
                action: actionName,
                userAgent: userAgent ? userAgent.substring(0, 150) : "N/A",
                deviceId: currentDeviceId || undefined,
            });
        }

        // Determinar IPs efectivas excluyendo 127.0.0.1 cuando existen IPs externas reales
        const nonLoopbackIps = rawDetectedIps.filter(ip => ip !== "127.0.0.1" && ip !== "::1" && ip !== "localhost");
        const effectiveIps = nonLoopbackIps.length > 0 ? nonLoopbackIps : rawDetectedIps;

        const hasMultipleIps = effectiveIps.length > 1;
        const wasAlreadyAlertedIps = Boolean(currentWildcards.multipleIpAlert);

        // Detección de dispositivos ACTIVOS en tiempo real (heartbeat en los últimos 28s y no cerrados)
        const nowMs = Date.now();
        const liveActiveDevices = activeDevices.filter((d: any) => {
            if (d.isClosed) return false;
            const lastSeenMs = d.lastSeen ? new Date(d.lastSeen).getTime() : 0;
            return (nowMs - lastSeenMs) < 28000;
        });

        // La alerta activa aplica únicamente si hay 2 o más dispositivos concurrentes EN VIVO en este instante
        const hasMultipleDevices = liveActiveDevices.length > 1;
        const hadMultipleDevicesEver = Boolean(currentWildcards.hadHistoricalMultipleDevices || activeDevices.length > 1);

        const updatedWildcards = {
            ...currentWildcards,
            initialIp: currentWildcards.initialIp || currentIp,
            initialDeviceId: currentWildcards.initialDeviceId || currentDeviceId,
            detectedIps: rawDetectedIps,
            effectiveIps,
            activeDevices,
            liveDevicesCount: liveActiveDevices.length,
            multipleIpAlert: hasMultipleIps,
            multipleIpAlertTriggeredAt: (hasMultipleIps && !currentWildcards.multipleIpAlertTriggeredAt)
                ? nowIso
                : currentWildcards.multipleIpAlertTriggeredAt,
            multipleDevicesAlert: hasMultipleDevices,
            hadHistoricalMultipleDevices: hadMultipleDevicesEver,
            multipleDevicesAlertTriggeredAt: (hasMultipleDevices && !currentWildcards.multipleDevicesAlertTriggeredAt)
                ? nowIso
                : currentWildcards.multipleDevicesAlertTriggeredAt,
            ipHistory: prevHistory,
        };

        await prisma.evaluationSubmission.update({
            where: { id: submissionId },
            data: { 
                wildcardsUsed: updatedWildcards,
                deviceId: currentDeviceId || submission.deviceId
            }
        });

        // Caso A: Alerta de múltiples IPs públicas
        if (hasMultipleIps && !wasAlreadyAlertedIps) {
            try {
                const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
                emitEvaluationUpdate({
                    attemptId: submission.attemptId,
                    evaluationId: submission.attempt?.evaluationId,
                    submissionId: submission.id,
                    studentId: submission.userId,
                    type: "MULTIPLE_IP_DETECTED",
                    timestamp: Date.now(),
                    ips: effectiveIps,
                    message: `🚨 ALERTA DE SEGURIDAD: Se ha detectado la presentación de la prueba desde ${effectiveIps.length} ubicaciones o direcciones IP distintas (${effectiveIps.join(", ")}). Posible asistencia externa o sesión duplicada.`,
                });
            } catch (sseErr) {
                console.error("Error al emitir evento MULTIPLE_IP_DETECTED SSE:", sseErr);
            }
        }

        // Caso B: Alerta o cese de múltiples dispositivos bajo la misma IP (o diferentes)
        if (hasMultipleDevices) {
            try {
                const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
                emitEvaluationUpdate({
                    attemptId: submission.attemptId,
                    evaluationId: submission.attempt?.evaluationId,
                    submissionId: submission.id,
                    studentId: submission.userId,
                    type: "CONCURRENT_SESSION_DETECTED",
                    timestamp: Date.now(),
                    ips: effectiveIps,
                    deviceInfo: {
                        isConcurrent: true,
                        devicesCount: liveActiveDevices.length,
                        devices: liveActiveDevices,
                    },
                    message: `🚨 ALERTA DE SESIONES SIMULTÁNEAS: Se ha detectado la prueba abierta en ${liveActiveDevices.length} dispositivos diferentes simultáneamente.`,
                });
            } catch (sseErr) {
                console.error("Error al emitir evento CONCURRENT_SESSION_DETECTED SSE:", sseErr);
            }

            try {
                const { auditLogger } = await import("../../admin/services/auditLogger");
                await auditLogger.log({
                    action: "UPDATE",
                    entity: "EVALUATION_SUBMISSION",
                    entityId: submissionId,
                    userId: submission.user?.id || submission.userId,
                    userName: submission.user?.name || "Estudiante",
                    userRole: submission.user?.role || "student",
                    description: `ALERTA DE SEGURIDAD: Concurrencia de ${liveActiveDevices.length} dispositivos en la misma evaluación. Entrega: ${submissionId}`,
                    success: true,
                    metadata: {
                        devicesCount: liveActiveDevices.length,
                        activeDevices: liveActiveDevices,
                        action: actionName,
                    }
                });
            } catch (auditErr) {
                console.error("Error al registrar auditoría de dispositivos concurrentes:", auditErr);
            }
        } else if (currentWildcards.multipleDevicesAlert) {
            // Las otras sesiones se cerraron: emitir cese de concurrencia para que el estudiante continúe
            try {
                const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
                emitEvaluationUpdate({
                    attemptId: submission.attemptId,
                    evaluationId: submission.attempt?.evaluationId,
                    submissionId: submission.id,
                    studentId: submission.userId,
                    type: "CONCURRENT_SESSION_DETECTED",
                    timestamp: Date.now(),
                    ips: effectiveIps,
                    deviceInfo: {
                        isConcurrent: false,
                        devicesCount: liveActiveDevices.length,
                        devices: liveActiveDevices,
                    },
                    message: "Sesiones adicionales cerradas. Evaluación en curso normal.",
                });
            } catch (sseErr) {
                console.error("Error al emitir cese de alerta SSE:", sseErr);
            }
        }

        if (submission.attempt?.courseId) {
            revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}`);
            revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}/submissions/${submission.id}`);
        }

        return {
            success: true,
            detectedIps: effectiveIps,
            multipleIpAlert: hasMultipleIps,
            multipleDevicesAlert: hasMultipleDevices,
            activeDevicesCount: liveActiveDevices.length,
            totalDevicesCount: activeDevices.length,
            activeDevices: liveActiveDevices,
            currentIp,
        };
    } catch (err) {
        console.error("Error en recordIpForSubmission:", err);
        return null;
    }
}

export async function recordEvaluationIpAction(
    submissionId: string,
    clientReportedIp?: string,
    actionName: string = "heartbeat",
    devicePayload?: {
        deviceId?: string;
        screenRes?: string;
        browserInfo?: string;
        platform?: string;
    }
) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const res = await recordIpForSubmission(submissionId, clientReportedIp, actionName, devicePayload);
    return res || { success: false, detectedIps: [], multipleIpAlert: false, multipleDevicesAlert: false };
}

export async function saveAnswerAction(submissionId: string, questionId: string, content: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    // Registrar IP de forma asíncrona para auditoría de conexiones
    recordIpForSubmission(submissionId, undefined, "save_answer").catch(() => {});

    const existing = await prisma.evaluationAnswer.findFirst({
        where: { submissionId, questionId }
    });

    if (existing) {
        await prisma.evaluationAnswer.update({
            where: { id: existing.id },
            data: { 
                answer: content,
            }
        });
    } else {
        await prisma.evaluationAnswer.create({
            data: { 
                submissionId, 
                questionId, 
                answer: content,
            }
        });
    }

    // Notificar al monitor del docente vía SSE para actualizar el mapa de respuestas al instante
    try {
        const sub = await prisma.evaluationSubmission.findUnique({
            where: { id: submissionId },
            select: { attemptId: true }
        });
        if (sub?.attemptId) {
            const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
            emitEvaluationUpdate({
                attemptId: sub.attemptId,
                submissionId,
                studentId: session.user.id,
                type: "SUBMISSION_UPDATED",
                timestamp: Date.now()
            });
        }
    } catch {}

    return { success: true };
}

export async function submitEvaluationAction(submissionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: { 
            attempt: { 
                include: { 
                    evaluation: { 
                        include: { questions: { select: { id: true } } } 
                    } 
                } 
            },
            answersList: true
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    // Registrar IP de forma asíncrona para auditoría de entrega final
    recordIpForSubmission(submissionId, undefined, "submit_evaluation").catch(() => {});

    // 1. Calcular nota final estrictamente con las preguntas actuales de la evaluación
    const currentQuestions = submission.attempt?.evaluation?.questions || [];
    const currentQuestionIds = new Set(currentQuestions.map(q => q.id));
    const totalQuestions = currentQuestions.length || 1;

    // Purgar respuestas huérfanas en la base de datos si alguna pregunta fue eliminada durante la evaluación
    if (submission.answersList.some(a => !currentQuestionIds.has(a.questionId))) {
        await prisma.evaluationAnswer.deleteMany({
            where: {
                submissionId,
                questionId: { notIn: Array.from(currentQuestionIds) }
            }
        });
    }

    // Filtrar estrictamente solo respuestas pertenecientes a las preguntas vigentes de la evaluación
    const validAnswers = submission.answersList.filter(a => currentQuestionIds.has(a.questionId));

    // Mantener la nota más alta por pregunta entre los intentos válidos.
    // Si se detectó fraude, los intentos previos fueron anulados a 0.0 en evaluateAnswerWithAIAction,
    // y solo los intentos legítimos restantes aportan puntaje.
    for (const a of validAnswers) {
        if (a.aiFeedback) {
            try {
                const feedbacks = Array.isArray(a.aiFeedback) 
                    ? a.aiFeedback 
                    : (typeof a.aiFeedback === 'string' ? JSON.parse(a.aiFeedback) : []);
                if (feedbacks.length > 0) {
                    const computedMax = Math.max(0.0, ...feedbacks.map((f: any) => Number(f.score || 0)));
                    if (a.score !== computedMax) {
                        a.score = computedMax;
                        await prisma.evaluationAnswer.update({
                            where: { id: a.id },
                            data: { score: computedMax }
                        });
                    }
                }
            } catch (e) {
                // Si no se puede parsear, mantener score actual
            }
        }
    }

    const totalScoreSum = validAnswers.reduce((acc, a) => acc + (a.score || 0), 0);
    const calculatedBase = Number((totalScoreSum / totalQuestions).toFixed(2));

    const prevWildcards = (submission.wildcardsUsed as any) || {};
    const penalty = Number(prevWildcards.penalty || 0);
    // Nota base recalculada estrictamente con las preguntas actuales
    const baseScore = calculatedBase;
    const finalScore = Math.max(0, Number((baseScore - penalty).toFixed(2)));

    // 2. Generar mensaje pedagógico con LLM según la nota obtenida
    let feedback = "";
    try {
        const evaluationTitle = submission.attempt?.evaluation?.title || "Evaluación";
        const teacherId = submission.attempt?.evaluation?.authorId;
        const { generateSubmissionFeedback } = await import("../../teacher/services/ai/evaluationAnalysisService");
        feedback = await generateSubmissionFeedback(
            evaluationTitle,
            finalScore,
            submission.expulsions || 0,
            teacherId
        );
    } catch (err) {
        console.error("Error generating feedback in submitEvaluationAction:", err);
        feedback = finalScore >= 3.0 ? "¡Evaluación completada con éxito!" : "Evaluación finalizada. Revisa tus respuestas y fortalece los conceptos clave.";
    }

    const updatedWildcards = {
        ...prevWildcards,
        baseScore,
        llmFeedback: feedback,
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { 
            submittedAt: new Date(),
            score: finalScore,
            wildcardsUsed: updatedWildcards,
        }
    });

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("../../admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "EVALUATION_SUBMISSION",
            entityId: submissionId,
            userId: session.user.id,
            userName: session.user.name || "Estudiante",
            userRole: session.user.role,
            description: `Evaluación enviada con nota ${finalScore}: ${submissionId}`,
            success: true,
        });
    } catch (e) {
        console.error("Audit log error:", e);
    }

    // Notificar al profesor vía SSE que el examen fue entregado
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        emitEvaluationUpdate({
            attemptId: submission.attemptId,
            submissionId,
            studentId: session.user.id,
            type: "SUBMISSION_UPDATED",
            timestamp: Date.now(),
            message: `Evaluación entregada por ${session.user.name || "Estudiante"}`
        });
    } catch {}

    revalidatePath(`/dashboard/student`);
    if (submission.attempt?.courseId) {
        revalidatePath(`/dashboard/student?courseId=${submission.attempt.courseId}&tab=evaluations`);
    }
    return { success: true, score: finalScore, feedback };
}

export async function getOrGenerateEvaluationFeedbackAction(submissionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: {
                        include: { questions: { select: { id: true } } }
                    }
                }
            },
            answersList: true
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    const wildcards = (submission.wildcardsUsed as any) || {};
    if (wildcards.llmFeedback) {
        return { feedback: wildcards.llmFeedback, score: submission.score };
    }

    const totalQuestions = submission.attempt?.evaluation?.questions?.length || 1;
    const totalScoreSum = submission.answersList.reduce((acc, a) => acc + (a.score || 0), 0);
    const calculatedBase = Number((totalScoreSum / totalQuestions).toFixed(2));
    const penalty = Number(wildcards.penalty || 0);
    const baseScore = wildcards.baseScore !== undefined ? Number(wildcards.baseScore) : calculatedBase;
    const finalScore = submission.score !== null && submission.score !== undefined
        ? submission.score
        : Math.max(0, Number((baseScore - penalty).toFixed(2)));

    const evaluationTitle = submission.attempt?.evaluation?.title || "Evaluación";
    const teacherId = submission.attempt?.evaluation?.authorId;
    const { generateSubmissionFeedback } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const feedback = await generateSubmissionFeedback(
        evaluationTitle,
        finalScore,
        submission.expulsions || 0,
        teacherId
    );

    const updatedWildcards = {
        ...wildcards,
        llmFeedback: feedback,
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            score: finalScore,
            wildcardsUsed: updatedWildcards,
        }
    });

    revalidatePath(`/dashboard/student`);
    return { feedback, score: finalScore };
}

export async function evaluateAnswerWithAIAction(submissionId: string, questionId: string, currentAnswer: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    // Registrar IP de forma asíncrona para auditoría de conexiones
    recordIpForSubmission(submissionId, undefined, "ai_evaluation").catch(() => {});

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: true
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { evaluation: true }
    });

    if (!question) throw new Error("Question not found");

    // Precedence: attempt configuration (assigned to course/students) > attempt's evaluation > question's evaluation > default
    const maxAttempts = submission.attempt?.maxSupportAttempts 
        ?? submission.attempt?.evaluation?.maxSupportAttempts 
        ?? question.evaluation?.maxSupportAttempts 
        ?? 3;

    let answerRecord = await prisma.evaluationAnswer.findFirst({
        where: { submissionId, questionId }
    });

    if (!answerRecord) {
        answerRecord = await prisma.evaluationAnswer.create({
            data: { submissionId, questionId, answer: currentAnswer }
        });
    }

    if (answerRecord.supportAttempts >= maxAttempts) {
        throw new Error(`Has alcanzado el límite máximo de ${maxAttempts} ayudas de IA para esta pregunta.`);
    }

    if (answerRecord.answer !== currentAnswer) {
        answerRecord = await prisma.evaluationAnswer.update({
            where: { id: answerRecord.id },
            data: { answer: currentAnswer }
        });
    }

    const teacherId = submission.attempt?.evaluation?.authorId || question.evaluation?.authorId;

    const { evaluateStudentAnswer } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const aiResult = await evaluateStudentAnswer(question.text, question.type, currentAnswer, 5.0, question.referenceAnswer || undefined, teacherId);

    const isFraudAttempt = Boolean(aiResult.isFraudAttempt);
    const detectedPattern = aiResult.detectedPattern;

    if (isFraudAttempt) {
        await recordFraudAttemptForSubmission(
            submissionId,
            questionId,
            currentAnswer,
            detectedPattern || "Intento de solicitar la solución detectado por la IA",
            "ai_evaluation"
        );
    }

    let feedbackHistory: { 
        attempt: number; 
        feedback: string; 
        score: number; 
        isCorrect: boolean; 
        isFraudAttempt?: boolean; 
        detectedPattern?: string; 
        invalidatedByFraud?: boolean;
        requestedAt: string 
    }[] = [];
    if (answerRecord.aiFeedback) {
        feedbackHistory = Array.isArray(answerRecord.aiFeedback) 
            ? answerRecord.aiFeedback as typeof feedbackHistory
            : JSON.parse(answerRecord.aiFeedback as string);
    }

    const currentAttemptNumber = answerRecord.supportAttempts + 1;
    const now = new Date().toISOString();

    // Si se detecta fraude en este intento:
    // Se BORRA el histórico previo de calificaciones para esta pregunta y se restablece a 0.0.
    // El estudiante solo podrá obtener nota mediante los intentos restantes.
    if (isFraudAttempt) {
        feedbackHistory = feedbackHistory.map(item => ({
            ...item,
            score: 0.0,
            isCorrect: false,
            invalidatedByFraud: true
        }));
    }

    feedbackHistory.push({
        attempt: currentAttemptNumber,
        feedback: aiResult.feedback,
        score: isFraudAttempt ? 0.0 : aiResult.scoreContribution,
        isCorrect: isFraudAttempt ? false : aiResult.isCorrect,
        isFraudAttempt,
        detectedPattern,
        requestedAt: now
    });

    // Mantiene la nota más alta de todos los intentos vigentes.
    // Si hubo fraude, todos los intentos previos quedaron en 0.0, por lo que el puntaje es 0.0
    // a menos que en un intento restante posterior obtenga una calificación válida.
    const maxScore = isFraudAttempt ? 0.0 : Math.max(0.0, ...feedbackHistory.map(f => Number(f.score || 0)));

    await prisma.evaluationAnswer.update({
        where: { id: answerRecord.id },
        data: {
            supportAttempts: currentAttemptNumber,
            score: maxScore,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aiFeedback: feedbackHistory as any
        }
    });

    const evaluation = await prisma.evaluation.findUnique({
        where: { id: question.evaluationId },
        include: { questions: { select: { id: true } } }
    });

    const currentQuestions = evaluation?.questions || [];
    const currentQuestionIds = new Set(currentQuestions.map(q => q.id));
    const totalQuestionsCount = currentQuestions.length || 1;

    const allAnswers = await prisma.evaluationAnswer.findMany({
        where: { submissionId }
    });

    // Filtrar estrictamente solo respuestas a preguntas vigentes actuales
    const validAnswers = allAnswers.filter(a => currentQuestionIds.has(a.questionId));
    const totalScoreSum = validAnswers.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const finalSubmissionScore = Number((totalScoreSum / totalQuestionsCount).toFixed(2));

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { score: finalSubmissionScore }
    });

    return {
        success: true,
        isFraudAttempt,
        detectedPattern,
        feedback: aiResult.feedback,
        isCorrect: isFraudAttempt ? false : aiResult.isCorrect,
        scoreContribution: isFraudAttempt ? 0.0 : aiResult.scoreContribution,
        questionScore: maxScore,
        feedbackHistory,
        accumulatedScore: finalSubmissionScore,
        attemptsRemaining: Math.max(0, maxAttempts - currentAttemptNumber),
        requestedAt: now
    };
}

export async function useAiHintAction(submissionId: string, questionId: string, currentAnswer: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: { select: { wildcardAiHints: true, authorId: true } }
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const maxHints = submission.attempt?.wildcardAiHints ?? submission.attempt?.evaluation?.wildcardAiHints ?? 0;
    const wildcardsUsed = (submission.wildcardsUsed || {}) as {
        aiHintsUsed?: number;
        aiHintQuestions?: { questionId: string; hint: string; usedAt: string }[];
        secondChanceUsed?: number;
        secondChanceQuestions?: { questionId: string; usedAt: string }[];
    };
    const hintsUsed = wildcardsUsed.aiHintsUsed || 0;

    if (hintsUsed >= maxHints) {
        throw new Error(`Has agotado tus ${maxHints} pistas de IA disponibles.`);
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error("Question not found");

    const teacherId = submission.attempt?.evaluation?.authorId;

    const { getAiHint } = await import("../../teacher/services/ai/evaluationAnalysisService");
    const hintResult = await getAiHint(question.text, question.type, currentAnswer, teacherId);

    // Si la IA detecta que el estudiante pide la solución directa o intenta fraude al pedir pista
    if (hintResult.isFraudAttempt) {
        await recordFraudAttemptForSubmission(
            submissionId,
            questionId,
            currentAnswer,
            hintResult.detectedPattern || "Solicitud de respuesta detectada por la IA al pedir pista",
            "ai_hint"
        );
        return {
            success: false,
            isFraudAttempt: true,
            hint: hintResult.hint,
            hintsRemaining: Math.max(0, maxHints - hintsUsed),
            aiHintQuestions: wildcardsUsed.aiHintQuestions || []
        };
    }

    const hint = hintResult.hint;
    wildcardsUsed.aiHintsUsed = hintsUsed + 1;
    if (!wildcardsUsed.aiHintQuestions) wildcardsUsed.aiHintQuestions = [];
    const newHintEntry = {
        questionId,
        hint,
        usedAt: new Date().toISOString()
    };
    wildcardsUsed.aiHintQuestions.push(newHintEntry);

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { wildcardsUsed }
    });

    return {
        success: true,
        hint,
        hintsRemaining: Math.max(0, maxHints - (hintsUsed + 1)),
        aiHintQuestions: wildcardsUsed.aiHintQuestions
    };
}

export async function useSecondChanceAction(submissionId: string, questionId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        include: {
            attempt: {
                include: {
                    evaluation: { select: { wildcardSecondChance: true } }
                }
            }
        }
    });

    if (!submission) throw new Error("Submission not found");
    if (submission.userId !== session.user.id) throw new Error("Unauthorized");
    if (submission.submittedAt) throw new Error("La evaluación ya fue enviada.");

    const maxSecondChances = submission.attempt?.wildcardSecondChance ?? submission.attempt?.evaluation?.wildcardSecondChance ?? 0;
    const wildcardsUsed = (submission.wildcardsUsed || {}) as {
        aiHintsUsed?: number;
        aiHintQuestions?: { questionId: string; usedAt: string }[];
        secondChanceUsed?: number;
        secondChanceQuestions?: { questionId: string; usedAt: string }[];
    };
    const secondChancesUsed = wildcardsUsed.secondChanceUsed || 0;

    if (secondChancesUsed >= maxSecondChances) {
        throw new Error(`Has agotado tus ${maxSecondChances} segundas oportunidades disponibles.`);
    }

    wildcardsUsed.secondChanceUsed = secondChancesUsed + 1;
    if (!wildcardsUsed.secondChanceQuestions) wildcardsUsed.secondChanceQuestions = [];
    wildcardsUsed.secondChanceQuestions.push({ questionId, usedAt: new Date().toISOString() });

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: { wildcardsUsed }
    });

    // Reset supportAttempts for this question in this submission to allow AI help again
    await prisma.evaluationAnswer.updateMany({
        where: { submissionId, questionId },
        data: { supportAttempts: 0 }
    });

    return {
        success: true,
        secondChancesRemaining: Math.max(0, maxSecondChances - (secondChancesUsed + 1))
    };
}

export async function getEvaluationAttemptDataAction(attemptId: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("No autenticado");
    }

    const { evaluationService } = await import("@/features/teacher/services/evaluationService");
    const attempt = await evaluationService.getAttemptWithQuestions(attemptId);
    if (!attempt) {
        throw new Error("Evaluación no encontrada");
    }

    // Si la asignación es selectiva, verificar que el estudiante esté en la lista
    let studentSubmission = null;
    if (session.user.role === "student") {
        const assignedIds = Array.isArray(attempt.assignedStudentIds)
            ? (attempt.assignedStudentIds as string[])
            : typeof attempt.assignedStudentIds === 'string'
                ? JSON.parse(attempt.assignedStudentIds)
                : [];
        if (assignedIds.length > 0 && !assignedIds.includes(session.user.id)) {
            throw new Error("No tienes asignada esta evaluación.");
        }

        studentSubmission = await prisma.evaluationSubmission.findFirst({
            where: { attemptId, userId: session.user.id },
            include: { answersList: true }
        });
    }

    return {
        ...attempt,
        studentSubmission
    };
}

/**
 * Registra un evento de cambio de pestaña / navegación fuera del examen cuando blockTabSwitch está desactivado
 */
export async function registerTabSwitchLogAction({
    submissionId,
    durationSeconds,
    questionNumber,
    questionTitle,
    leftAt,
    returnedAt
}: {
    submissionId: string;
    durationSeconds: number;
    questionNumber: number;
    questionTitle?: string;
    leftAt: string;
    returnedAt: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "student") {
        throw new Error("Unauthorized");
    }

    const submission = await prisma.evaluationSubmission.findUnique({
        where: { id: submissionId },
        select: {
            id: true,
            userId: true,
            wildcardsUsed: true,
            attemptId: true,
            attempt: { 
                select: { 
                    courseId: true, 
                    evaluationId: true,
                    blockTabSwitch: true,
                    maxExitTimeSeconds: true,
                    enableSurveillance: true,
                    evaluation: {
                        select: {
                            blockTabSwitch: true,
                            maxExitTimeSeconds: true,
                        }
                    }
                } 
            }
        }
    });

    if (!submission || submission.userId !== session.user.id) {
        throw new Error("Unauthorized or submission not found");
    }

    // Si la vigilancia o blockTabSwitch está desactivado, el sistema NO registra absolutamente nada de cambios de pestaña
    const surveillanceEnabled = submission.attempt?.enableSurveillance !== false;
    const isBlockTabSwitch = surveillanceEnabled && (submission.attempt?.blockTabSwitch ?? submission.attempt?.evaluation?.blockTabSwitch ?? true);
    if (!isBlockTabSwitch) {
        return {
            success: false,
            ignored: true,
            tabSwitchesCount: 0,
            totalTimeAwaySeconds: 0,
            hasTimeLimitAlert: false,
            maxExitTimeSeconds: 60,
            logEntry: null,
        };
    }

    const maxAllowedExitTime = submission.attempt?.maxExitTimeSeconds ?? submission.attempt?.evaluation?.maxExitTimeSeconds ?? 60;

    const currentWildcards = typeof submission.wildcardsUsed === 'string'
        ? JSON.parse(submission.wildcardsUsed)
        : (submission.wildcardsUsed as any) || {};

    const prevLogs = Array.isArray(currentWildcards.tabSwitchLogs) ? currentWildcards.tabSwitchLogs : [];
    const newCount = (currentWildcards.tabSwitchesCount || 0) + 1;
    const newTotalAway = (currentWildcards.totalTimeAwaySeconds || 0) + durationSeconds;
    const hasTimeLimitAlert = newTotalAway >= maxAllowedExitTime;
    const wasAlreadyAlerted = !!currentWildcards.hasTimeLimitAlert;

    const newLogEntry = {
        id: `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        questionNumber,
        questionTitle: questionTitle || `Pregunta ${questionNumber}`,
        durationSeconds,
        leftAt,
        returnedAt,
    };

    const updatedWildcards = {
        ...currentWildcards,
        tabSwitchesCount: newCount,
        totalTimeAwaySeconds: newTotalAway,
        hasTimeLimitAlert: hasTimeLimitAlert || wasAlreadyAlerted,
        timeLimitAlertTriggeredAt: hasTimeLimitAlert && !currentWildcards.timeLimitAlertTriggeredAt ? new Date().toISOString() : currentWildcards.timeLimitAlertTriggeredAt,
        tabSwitchLogs: [...prevLogs, newLogEntry],
    };

    await prisma.evaluationSubmission.update({
        where: { id: submissionId },
        data: {
            wildcardsUsed: updatedWildcards,
        }
    });

    // Notificar al profesor vía SSE
    try {
        const { emitEvaluationUpdate } = await import("@/lib/evaluationEvents");
        const alertPrefix = hasTimeLimitAlert ? "⚠️ [LÍMITE DE TIEMPO FUERA EXCEDIDO] " : "";
        const maxMins = Math.max(1, Math.round(maxAllowedExitTime / 60));
        const totalAwayMins = Math.max(1, Math.round(newTotalAway / 60));
        emitEvaluationUpdate({
            attemptId: submission.attemptId,
            evaluationId: submission.attempt?.evaluationId,
            submissionId: submission.id,
            studentId: session.user.id,
            type: hasTimeLimitAlert ? "TIME_LIMIT_EXCEEDED" : "PENALTY_UPDATED",
            timestamp: Date.now(),
            message: `${alertPrefix}Salida de pestaña (Total acumulado: ${totalAwayMins} min / Límite permitido: ${maxMins} min) en pregunta ${questionNumber}`,
        });
    } catch {}

    // Audit log si se supera el umbral de alerta por primera vez
    if (hasTimeLimitAlert && !wasAlreadyAlerted) {
        try {
            const { auditLogger } = await import("../../admin/services/auditLogger");
            const maxMins = Math.max(1, Math.round(maxAllowedExitTime / 60));
            const totalAwayMins = Math.max(1, Math.round(newTotalAway / 60));
            await auditLogger.log({
                action: "UPDATE",
                entity: "EVALUATION_SUBMISSION",
                entityId: submissionId,
                userId: session.user.id,
                userName: session.user.name || "Estudiante",
                userRole: session.user.role,
                description: `ALERTA DE SEGURIDAD: Tiempo acumulado fuera del examen superado (${totalAwayMins} min acumulados >= límite de ${maxMins} min) en entrega ${submissionId}`,
                success: true,
            });
        } catch {}
    }

    // Revalidar rutas para que docente y estudiante vean la telemetría actualizada
    if (submission.attempt?.courseId) {
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}`);
        revalidatePath(`/dashboard/teacher/courses/${submission.attempt.courseId}/evaluations/${submission.attemptId}/submissions/${submission.id}`);
    }

    return {
        success: true,
        tabSwitchesCount: newCount,
        totalTimeAwaySeconds: newTotalAway,
        hasTimeLimitAlert,
        maxExitTimeSeconds: maxAllowedExitTime,
        logEntry: newLogEntry,
    };
}
