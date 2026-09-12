"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { fetchPdfContent } from "@/features/teacher/services/ai/pdfReviewService";
import { getAIModel } from "@/features/teacher/services/ai/client";
import { generateText } from "ai";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export interface PdfChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface PdfChatSessionSummary {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    preview: string;
    studentName?: string;
    groupName?: string;
}

/**
 * Obtiene todos los IDs de estudiantes que pertenecen al mismo grupo para una actividad dada.
 * Si la actividad no es grupal o el estudiante no está en un grupo, devuelve [studentId].
 */
async function getGroupStudentIds(activityId: string, studentId: string): Promise<{
    memberIds: string[];
    isGroupActivity: boolean;
    groupName?: string;
}> {
    try {
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            select: { id: true, isGroupActivity: true, courseId: true, groupScope: true },
        });

        if (!activity || !activity.isGroupActivity) {
            return { memberIds: [studentId], isGroupActivity: false };
        }

        const isActivityScope = (activity as any).groupScope === "ACTIVITY";

        const membership = await prisma.studentGroupMember.findFirst({
            where: {
                userId: studentId,
                group: isActivityScope
                    ? { activityId: activity.id }
                    : { courseId: activity.courseId, activityId: null },
            },
            include: {
                group: {
                    include: {
                        members: {
                            select: { userId: true },
                        },
                    },
                },
            },
        });

        if (!membership?.group?.members?.length) {
            return { memberIds: [studentId], isGroupActivity: true };
        }

        const memberIds = membership.group.members.map((m) => m.userId);
        return {
            memberIds: Array.from(new Set([studentId, ...memberIds])),
            isGroupActivity: true,
            groupName: membership.group.name,
        };
    } catch (err) {
        console.error("Error al obtener miembros del grupo para PDF chat:", err);
        return { memberIds: [studentId], isGroupActivity: false };
    }
}

/**
 * Lista todas las sesiones históricas del inspector de PDF para una entrega.
 */
export async function listPdfChatSessionsAction({
    activityId,
    studentId,
}: {
    activityId?: string;
    studentId?: string;
}) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }

    if (!activityId || !studentId) {
        return { success: true, sessions: [], isGroupActivity: false };
    }

    const { memberIds: targetStudentIds, isGroupActivity, groupName } = await getGroupStudentIds(activityId, studentId);

    const isTeacher = session.user.role === "teacher" || session.user.role === "admin";
    const isStudent = session.user.role === "student" && (targetStudentIds.includes(session.user.id) || session.user.id === studentId);

    if (!isTeacher && !isStudent) {
        throw new Error("Unauthorized: No tienes permisos para ver el historial de esta actividad.");
    }

    try {
        const chats = await prisma.mcpInspectorChat.findMany({
            where: {
                activityId,
                studentId: { in: targetStudentIds },
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                messages: true,
                student: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        const sessions: PdfChatSessionSummary[] = chats.map((c) => {
            const msgs = Array.isArray(c.messages) ? (c.messages as any[]) : [];
            const firstUserMsg = msgs.find((m) => m.role === "user");
            const title =
                c.title ||
                (firstUserMsg
                    ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? "..." : "")
                    : "Conversación PDF");

            return {
                id: c.id,
                title,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                messageCount: msgs.length,
                preview: firstUserMsg ? firstUserMsg.content.slice(0, 100) : "",
                studentName: c.student?.name,
                groupName,
            };
        });

        return { success: true, sessions, isGroupActivity, groupName };
    } catch (error: any) {
        console.error("Error al listar sesiones de chat PDF:", error);
        return { success: false, sessions: [], error: error.message };
    }
}

/**
 * Obtiene los mensajes de una sesión específica o la más reciente.
 */
export async function getPdfChatHistoryAction({
    activityId,
    studentId,
    chatId,
}: {
    activityId?: string;
    studentId?: string;
    chatId?: string;
}) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }

    if (!activityId || !studentId) {
        return { success: true, messages: [], chatId: null, title: null };
    }

    const { memberIds: targetStudentIds, isGroupActivity, groupName } = await getGroupStudentIds(activityId, studentId);

    const isTeacher = session.user.role === "teacher" || session.user.role === "admin";
    const isStudent = session.user.role === "student" && (targetStudentIds.includes(session.user.id) || session.user.id === studentId);

    if (!isTeacher && !isStudent) {
        throw new Error("Unauthorized: No tienes permisos para ver este historial.");
    }

    try {
        let chat = null;

        if (chatId) {
            chat = await prisma.mcpInspectorChat.findFirst({
                where: {
                    id: chatId,
                    activityId,
                    studentId: { in: targetStudentIds },
                },
            });
        } else {
            chat = await prisma.mcpInspectorChat.findFirst({
                where: {
                    activityId,
                    studentId: { in: targetStudentIds },
                },
                orderBy: { createdAt: "desc" },
            });
        }

        const messages = Array.isArray(chat?.messages) ? (chat.messages as any[]) : [];
        return {
            success: true,
            messages,
            chatId: chat?.id || null,
            title: chat?.title || null,
            groupName,
        };
    } catch (error: any) {
        console.error("Error cargando historial de chat de PDF:", error);
        return { success: false, messages: [], chatId: null, error: error.message };
    }
}

/**
 * Realiza una consulta analítica sobre el documento PDF con Gemini y persiste en la sesión histórica activa.
 */
export async function askPdfInspectorQuestionAction({
    pdfUrl,
    question,
    chatHistory = [],
    activityId,
    studentId,
    statement = "",
    chatId,
}: {
    pdfUrl: string;
    question: string;
    chatHistory?: PdfChatMessage[];
    activityId?: string;
    studentId?: string;
    statement?: string;
    chatId?: string;
}) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Solo los profesores pueden usar el inspector de PDF con IA.");
    }

    if (!pdfUrl || !question) {
        throw new Error("Se requiere el enlace del PDF y la pregunta.");
    }

    try {
        // 1. Descargar documento PDF
        const pdfData = await fetchPdfContent(pdfUrl);
        if (!pdfData) {
            throw new Error(
                "No se pudo descargar el PDF. Asegúrate de que el enlace sea accesible o público."
            );
        }

        // 2. Obtener modelo configurado del docente (Gemini)
        const model = await getAIModel(session.user.id);

        // 3. Formatear historial
        const historyMessages = chatHistory.slice(-8).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));

        const systemPrompt = `Eres un asistente de IA experto para profesores universitarios y de educación superior.
Tu rol es inspeccionar exhaustivamente el documento PDF entregado por el estudiante y responder con precisión a las consultas, dudas y verificaciones del docente.
Cuentas con el documento PDF completo cargado en tu contexto multimodal.

CRITERIOS Y ENUNCIADO DE LA ACTIVIDAD:
${statement || "No se especificó un enunciado particular."}

INSTRUCCIONES CLAVE:
1. Responde de manera clara, rigurosa, pedagógica y estructurada en formato Markdown limpio.
2. Utiliza títulos, listas y tablas cuando ayude a comparar o presentar datos de forma estructurada.
3. Cita números de página, secciones o encabezados específicos del documento cuando sea relevante.
4. Si el profesor te pregunta por calidad, cumplimiento de rúbrica, originalidad o inconsistencias, sé objetivo, constructivo y fundamenta tu respuesta en el contenido real del documento.
5. Mantén un tono profesional enfocado en agilizar y potenciar la labor de evaluación docente.`;

        // 4. Invocar modelo multimodal con el PDF y la pregunta
        const result = await generateText({
            model,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                ...historyMessages,
                {
                    role: "user",
                    content: [
                        { type: "text", text: question },
                        { type: "file", data: pdfData.data, mediaType: "application/pdf" },
                    ],
                },
            ],
        });

        const answer = result.text || "No se obtuvo respuesta del modelo para este documento.";
        let savedChatId = chatId || null;

        // 5. Persistir en la base de datos si tenemos activityId y studentId
        if (activityId && studentId && answer) {
            const now = new Date().toISOString();
            const userMsg: PdfChatMessage = {
                id: "user-" + Date.now(),
                role: "user",
                content: question,
                timestamp: now,
            };
            const asstMsg: PdfChatMessage = {
                id: "asst-" + (Date.now() + 1),
                role: "assistant",
                content: answer,
                timestamp: now,
            };

            if (savedChatId) {
                const existingChat = await prisma.mcpInspectorChat.findUnique({
                    where: { id: savedChatId },
                });

                if (existingChat) {
                    const currentList = Array.isArray(existingChat.messages) ? (existingChat.messages as any[]) : [];
                    const updatedMessages = [...currentList, userMsg, asstMsg];

                    await prisma.mcpInspectorChat.update({
                        where: { id: savedChatId },
                        data: { messages: updatedMessages as any },
                    });
                } else {
                    savedChatId = null;
                }
            }

            if (!savedChatId) {
                const autoTitle =
                    question.length > 55 ? question.slice(0, 55).trim() + "..." : question.trim();

                const newChat = await prisma.mcpInspectorChat.create({
                    data: {
                        title: autoTitle,
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                        messages: [userMsg, asstMsg] as any,
                    },
                });
                savedChatId = newChat.id;
            }
        }

        return { success: true, answer, chatId: savedChatId };
    } catch (error: any) {
        console.error("Error en chat inspector de PDF:", error);
        return { success: false, answer: "", error: error.message || "Error al procesar la consulta sobre el PDF." };
    }
}

/**
 * Elimina una conversación específica o todo el historial de consultas sobre el PDF.
 */
export async function deletePdfChatHistoryAction({
    activityId,
    studentId,
    chatId,
}: {
    activityId?: string;
    studentId?: string;
    chatId?: string;
}) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Solo los profesores pueden eliminar conversaciones históricas.");
    }

    try {
        if (chatId) {
            await prisma.mcpInspectorChat.delete({
                where: { id: chatId },
            });
            return { success: true };
        }

        if (!activityId || !studentId) {
            throw new Error("Se requiere ID de actividad y de estudiante para eliminar todo el historial.");
        }

        const { memberIds: targetStudentIds } = await getGroupStudentIds(activityId, studentId);

        await prisma.mcpInspectorChat.deleteMany({
            where: {
                activityId,
                studentId: { in: targetStudentIds },
            },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error eliminando historial de chat de PDF:", error);
        return { success: false, error: error.message };
    }
}
