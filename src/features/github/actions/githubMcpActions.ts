"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { askGitHubMcpQuestion, McpChatMessage } from "../services/githubMcpService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export interface McpChatSessionSummary {
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

        // Buscar si studentId pertenece a un grupo en esta actividad o curso
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
        console.error("Error al obtener miembros del grupo para MCP chat:", err);
        return { memberIds: [studentId], isGroupActivity: false };
    }
}

/**
 * Lista los resúmenes de todas las conversaciones históricas del inspector para una entrega.
 * Si la actividad es grupal, todos los miembros del grupo pueden visualizar el historial compartido.
 */
export async function listMcpChatSessionsAction({
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
    // El estudiante está autorizado si su propio ID es studentId o si pertenece al mismo grupo para esta actividad
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

        const sessions: McpChatSessionSummary[] = chats.map((c) => {
            const msgs = Array.isArray(c.messages) ? (c.messages as any[]) : [];
            const firstUserMsg = msgs.find((m) => m.role === "user");
            const title =
                c.title ||
                (firstUserMsg
                    ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? "..." : "")
                    : "Conversación");

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
        console.error("Error al listar sesiones MCP:", error);
        return { success: false, sessions: [], error: error.message };
    }
}

/**
 * Obtiene los mensajes de una sesión histórica específica o la más reciente.
 * Si la actividad es grupal, cualquier miembro del grupo puede consultar las conversaciones compartidas.
 */
export async function getMcpChatHistoryAction({
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

        const messages = Array.isArray(chat?.messages) ? chat.messages : [];
        return {
            success: true,
            messages,
            chatId: chat?.id || null,
            title: chat?.title || null,
            groupName,
        };
    } catch (error: any) {
        console.error("Error cargando historial de chat MCP:", error);
        return { success: false, messages: [], chatId: null, error: error.message };
    }
}

/**
 * Realiza una consulta con GitHub MCP y guarda la interacción en la sesión activa (o crea una nueva sesión histórica).
 * Exclusivo para docentes.
 */
export async function askRepoMcpQuestionAction({
    repoUrl,
    question,
    chatHistory = [],
    activityId,
    studentId,
    chatId,
}: {
    repoUrl: string;
    question: string;
    chatHistory?: McpChatMessage[];
    activityId?: string;
    studentId?: string;
    chatId?: string;
}) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Solo los profesores pueden usar la herramienta de inspección MCP.");
    }

    if (!repoUrl || !question) {
        throw new Error("Se requiere la URL del repositorio y la pregunta.");
    }

    try {
        const result = await askGitHubMcpQuestion({
            repoUrl,
            question,
            userId: session.user.id,
            chatHistory,
        });

        let savedChatId = chatId || null;

        // Si tenemos activityId y studentId, guardamos la conversación en PostgreSQL vía Prisma
        if (activityId && studentId && result.answer) {
            const now = new Date().toISOString();
            const userMsg = {
                id: "user-" + Date.now(),
                role: "user",
                content: question,
                timestamp: now,
            };
            const assistantMsg = {
                id: "asst-" + (Date.now() + 1),
                role: "assistant",
                content: result.answer,
                timestamp: now,
                toolCallsCount: result.toolCallsCount,
            };

            if (savedChatId) {
                // Verificar si existe el chat
                const existingChat = await prisma.mcpInspectorChat.findUnique({
                    where: { id: savedChatId },
                });

                if (existingChat) {
                    const currentMsgs = Array.isArray(existingChat.messages) ? (existingChat.messages as any[]) : [];
                    const updatedMsgs = [...currentMsgs, userMsg, assistantMsg];

                    await prisma.mcpInspectorChat.update({
                        where: { id: savedChatId },
                        data: {
                            messages: updatedMsgs,
                        },
                    });
                } else {
                    savedChatId = null; // Crear uno nuevo abajo
                }
            }

            if (!savedChatId) {
                // Crear una nueva conversación histórica con título representativo
                const autoTitle =
                    question.length > 55 ? question.slice(0, 55).trim() + "..." : question.trim();

                const newChat = await prisma.mcpInspectorChat.create({
                    data: {
                        title: autoTitle,
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                        messages: [userMsg, assistantMsg],
                    },
                });
                savedChatId = newChat.id;
            }
        }

        return {
            success: true,
            answer: result.answer,
            toolCallsCount: result.toolCallsCount,
            chatId: savedChatId,
        };
    } catch (error: any) {
        console.error("Error en askRepoMcpQuestionAction:", error);
        return {
            success: false,
            error: error.message || "Error al procesar la consulta con el servidor GitHub MCP.",
        };
    }
}

/**
 * Elimina una sesión de conversación histórica específica o todo el historial de la entrega.
 * Exclusivo para profesores.
 */
export async function deleteMcpChatHistoryAction({
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
        console.error("Error eliminando historial MCP:", error);
        return { success: false, error: error.message };
    }
}
