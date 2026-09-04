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

export async function getPdfChatHistoryAction({
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

        const messages = Array.isArray(chat?.messages) ? (chat.messages as any[]) : [];
        return { success: true, messages };
    } catch (error: any) {
        console.error("Error cargando historial de chat de PDF:", error);
        return { success: false, messages: [], error: error.message };
    }
}

export async function askPdfInspectorQuestionAction({
    pdfUrl,
    question,
    chatHistory = [],
    activityId,
    studentId,
    statement = "",
}: {
    pdfUrl: string;
    question: string;
    chatHistory?: PdfChatMessage[];
    activityId?: string;
    studentId?: string;
    statement?: string;
}) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
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
                "No se pudo descargar el PDF. Asegúrate de que el enlace sea público (en Google Drive: 'Cualquiera con el enlace puede ver')."
            );
        }

        // 2. Obtener modelo configurado del docente (Gemini)
        const model = await getAIModel(session.user.id);

        // 3. Formatear historial
        const historyMessages = chatHistory.slice(-6).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
        }));

        const systemPrompt = `Eres un asistente de IA experto para profesores universitarios y de educación superior.
Tu rol es inspeccionar el documento PDF entregado por el estudiante y responder a las preguntas y verificaciones del docente.
Cuentas con el documento PDF completo cargado en tu contexto.

CRITERIOS Y ENUNCIADO DE LA ACTIVIDAD:
${statement || "No se especificó un enunciado particular."}

INSTRUCCIONES CLAVE:
1. Responde de manera clara, rigurosa, pedagógica y estructurada en formato Markdown.
2. Cita números de página o secciones específicas del documento cuando sea relevante.
3. Si el profesor te pregunta por plagio, calidad, estructura o cumplimiento de la rúbrica, sé totalmente objetivo y transparente.
4. Mantén un tono profesional y enfocado en apoyar la labor docente.`;

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

            const existingChat = await prisma.mcpInspectorChat.findUnique({
                where: {
                    teacherId_activityId_studentId: {
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                    },
                },
            });

            const currentList = Array.isArray(existingChat?.messages) ? (existingChat.messages as any[]) : [];
            const updatedMessages = [...currentList, userMsg, asstMsg];

            await prisma.mcpInspectorChat.upsert({
                where: {
                    teacherId_activityId_studentId: {
                        teacherId: session.user.id,
                        activityId,
                        studentId,
                    },
                },
                update: {
                    messages: updatedMessages,
                },
                create: {
                    teacherId: session.user.id,
                    activityId,
                    studentId,
                    messages: updatedMessages,
                },
            });
        }

        return { success: true, answer };
    } catch (error: any) {
        console.error("Error en chat inspector de PDF:", error);
        return { success: false, answer: "", error: error.message || "Error al procesar la consulta sobre el PDF." };
    }
}

export async function deletePdfChatHistoryAction({
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
        console.error("Error eliminando historial de chat de PDF:", error);
        return { success: false, error: error.message };
    }
}
