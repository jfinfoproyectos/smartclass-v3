"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { generateActivityDescription, generateActivityStatement } from "@/features/teacher/services/ai/activityContentService"

export async function generateActivityDescriptionAction(prompt: string, activityType: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() })

        if (!session?.user || session.user.role !== "teacher") {
            return { error: "No autorizado" }
        }

        const content = await generateActivityDescription(prompt, activityType, session.user.id)

        return { content }
    } catch (error: unknown) {
        console.error("Error generating description:", error)
        return { error: error instanceof Error ? error.message : "Error al generar contenido" }
    }
}

export async function generateActivityStatementAction(prompt: string, activityType: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() })

        if (!session?.user || session.user.role !== "teacher") {
            return { error: "No autorizado" }
        }

        const content = await generateActivityStatement(prompt, activityType, session.user.id)

        return { content }
    } catch (error: unknown) {
        console.error("Error generating statement:", error)
        return { error: error instanceof Error ? error.message : "Error al generar contenido" }
    }
}
