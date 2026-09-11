"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export interface InspectorQuestionItem {
    id: string;
    category: string;
    label: string;
    prompt: string;
    isCustom?: boolean;
    createdAt?: number;
}

/**
 * Obtiene las preguntas personalizadas del usuario autenticado guardadas en la BD.
 */
export async function getInspectorQuestionsAction(scope = "GITHUB"): Promise<{
    success: boolean;
    questions?: InspectorQuestionItem[];
    error?: string;
}> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return { success: false, error: "No autorizado" };
        }

        const rows = await prisma.inspectorQuestion.findMany({
            where: {
                userId: session.user.id,
                scope,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        const questions: InspectorQuestionItem[] = rows.map((r) => ({
            id: r.id,
            category: r.category,
            label: r.label,
            prompt: r.prompt,
            isCustom: true,
            createdAt: r.createdAt.getTime(),
        }));

        return { success: true, questions };
    } catch (error: any) {
        console.error("Error al obtener preguntas de inspección de BD:", error);
        return { success: false, error: error.message || "Error al consultar la base de datos" };
    }
}

/**
 * Guarda una nueva pregunta personalizada en la base de datos.
 */
export async function createInspectorQuestionAction(input: {
    category: string;
    label: string;
    prompt: string;
    scope?: string;
}): Promise<{
    success: boolean;
    question?: InspectorQuestionItem;
    error?: string;
}> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return { success: false, error: "No autorizado" };
        }

        const category = input.category?.trim();
        const label = input.label?.trim();
        const prompt = input.prompt?.trim();
        const scope = input.scope || "GITHUB";

        if (!category || !label || !prompt) {
            return { success: false, error: "Todos los campos son obligatorios" };
        }

        const created = await prisma.inspectorQuestion.create({
            data: {
                userId: session.user.id,
                category,
                label,
                prompt,
                scope,
            },
        });

        return {
            success: true,
            question: {
                id: created.id,
                category: created.category,
                label: created.label,
                prompt: created.prompt,
                isCustom: true,
                createdAt: created.createdAt.getTime(),
            },
        };
    } catch (error: any) {
        console.error("Error al guardar pregunta en BD:", error);
        return { success: false, error: error.message || "Error al guardar en base de datos" };
    }
}

/**
 * Elimina una pregunta personalizada por ID en la base de datos.
 */
export async function deleteInspectorQuestionAction(id: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.inspectorQuestion.deleteMany({
            where: {
                id,
                userId: session.user.id,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar pregunta de BD:", error);
        return { success: false, error: error.message || "Error al eliminar de base de datos" };
    }
}

/**
 * Elimina todas las preguntas personalizadas del usuario para este scope en la base de datos.
 */
export async function resetInspectorQuestionsAction(scope = "GITHUB"): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.inspectorQuestion.deleteMany({
            where: {
                userId: session.user.id,
                scope,
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error al reiniciar preguntas en BD:", error);
        return { success: false, error: error.message || "Error al reiniciar en base de datos" };
    }
}
