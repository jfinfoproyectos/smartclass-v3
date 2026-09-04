"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { askGitHubMcpQuestion, McpChatMessage } from "../services/githubMcpService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getMcpChatHistoryAction({
    activityId,
    studentId,
}: {
    activityId?: string;
    studentId?: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    if (!activityId || !studentId) {
        return { success: true, messages: [] };
    }

    try {
        const chat = await prisma.mcpInspectorChat.findUnique({
            where: {
                teacherId_activityId_studentId: {
                    teacherId: session.user.id,
                    activityId,
                    studentId,
                },
            },
        });

        const messages = Array.isArray(chat?.messages) ? chat.messages : [];
        return { success: true, messages };
    } catch (error: any) {
        console.error("Error cargando historial de chat MCP:", error);
        return { success: false, messages: [], error: error.message };
    }
}

export async function askRepoMcpQuestionAction({
    repoUrl,
    question,
    chatHistory = [],
    activityId,
    studentId,
}: {
    repoUrl: string;
    question: string;
    chatHistory?: McpChatMessage[];
    activityId?: string;
    studentId?: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
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

            // Cargar mensajes existentes o inicializar
            const existingChat = await prisma.mcpInspectorChat.findUnique({
                where: {
                    teacherId_activityId_studentId: {
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                    },
                },
            });

            const currentMsgs = Array.isArray(existingChat?.messages) ? (existingChat.messages as any[]) : [];
            const updatedMsgs = [...currentMsgs, userMsg, assistantMsg];

            await prisma.mcpInspectorChat.upsert({
                where: {
                    teacherId_activityId_studentId: {
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                    },
                },
                create: {
                    teacherId: session.user.id,
                    activityId,
                    studentId,
                    messages: updatedMsgs,
                },
                update: {
                    messages: updatedMsgs,
                },
            });
        }

        return {
            success: true,
            answer: result.answer,
            toolCallsCount: result.toolCallsCount,
        };
    } catch (error: any) {
        console.error("Error en askRepoMcpQuestionAction:", error);
        return {
            success: false,
            error: error.message || "Error al procesar la consulta con el servidor GitHub MCP.",
        };
    }
}

export async function deleteMcpChatHistoryAction({
    activityId,
    studentId,
}: {
    activityId: string;
    studentId: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    if (!activityId || !studentId) {
        throw new Error("Se requiere ID de actividad y de estudiante.");
    }

    try {
        await prisma.mcpInspectorChat.deleteMany({
            where: {
                teacherId: session.user.id,
                activityId,
                studentId,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error eliminando historial MCP:", error);
        return { success: false, error: error.message };
    }
}
