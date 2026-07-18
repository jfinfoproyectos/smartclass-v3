"use server"

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getSession() {
    try {
        return await auth.api.getSession({
            headers: await headers()
        });
    } catch (e) {
        console.error("Failed to get session:", e);
        return null;
    }
}

export async function saveTeacherCredentialsAction(formData: FormData) {
    const session = await getSession();

    if (!session?.user || (session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    const data: any = {};

    if (formData.has("githubToken")) {
        const githubToken = formData.get("githubToken") as string;
        data.encryptedGithubToken = githubToken ? await encrypt(githubToken) : null;
    }

    if (formData.has("geminiApiKey")) {
        const geminiApiKey = formData.get("geminiApiKey") as string;
        data.encryptedGeminiApiKey = geminiApiKey ? await encrypt(geminiApiKey) : null;
    }

    if (formData.has("aiProvider")) {
        const aiProvider = formData.get("aiProvider") as string;
        data.aiProvider = aiProvider || null;
    }

    if (formData.has("aiModel")) {
        const aiModel = formData.get("aiModel") as string;
        data.aiModel = aiModel || null;
    }

    if (formData.has("aiUrl")) {
        const aiUrl = formData.get("aiUrl") as string;
        data.aiUrl = aiUrl || null;
    }

    await prisma.user.update({
        where: { id: userId },
        data
    });

    // 🎯 AUDIT LOG
    try {
        const { auditLogger } = await import("@/features/admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "USER",
            entityId: userId,
            userId: userId,
            userName: session.user.name || "Profesor",
            userRole: session.user.role as "teacher" | "admin" | "student",
            description: "Credenciales de API (GitHub/Gemini/LLM) actualizadas por el profesor",
            success: true,
        });
    } catch (e) {
        console.error("Failed to log audit for credentials update", e);
    }

    revalidatePath("/dashboard/teacher/settings");
    return { success: true };
}

export async function getTeacherCredentialsAction() {
    const session = await getSession();

    if (!session?.user || (session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    }) as any;

    return {
        hasGithubToken: !!user?.encryptedGithubToken,
        hasGeminiApiKey: !!user?.encryptedGeminiApiKey,
        aiProvider: user?.aiProvider || "google",
        aiModel: user?.aiModel || "gemini-2.0-flash",
        aiUrl: user?.aiUrl || ""
    };
}

export async function testAICredentialsAction({ provider, model, apiKey }: { provider: string; model: string; apiKey: string }) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    try {
        let apiKeyToUse = apiKey;
        if (!apiKeyToUse && provider !== "ollama") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });
            if (user?.encryptedGeminiApiKey) {
                const { decrypt } = await import("@/lib/encryption");
                apiKeyToUse = await decrypt(user.encryptedGeminiApiKey);
            }
        }
        let modelInstance: any;
        if (provider === "google") {
            const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
            modelInstance = createGoogleGenerativeAI({ apiKey: apiKeyToUse })(model);
        } else if (provider === "openai") {
            const { createOpenAI } = await import("@ai-sdk/openai");
            modelInstance = createOpenAI({ apiKey: apiKeyToUse })(model);
        } else if (provider === "anthropic") {
            const { createAnthropic } = await import("@ai-sdk/anthropic");
            modelInstance = createAnthropic({ apiKey: apiKeyToUse })(model);
        } else if (provider === "minimax") {
            const { createMinimax } = await import("vercel-minimax-ai-provider");
            modelInstance = createMinimax({ apiKey: apiKeyToUse })(model);
        } else if (provider === "deepseek") {
            const { createDeepSeek } = await import("@ai-sdk/deepseek");
            modelInstance = createDeepSeek({ apiKey: apiKeyToUse })(model);
        } else if (provider === "xai") {
            const { createXai } = await import("@ai-sdk/xai");
            modelInstance = createXai({ apiKey: apiKeyToUse })(model);
        } else if (provider === "mistral") {
            const { createMistral } = await import("@ai-sdk/mistral");
            modelInstance = createMistral({ apiKey: apiKeyToUse })(model);
        } else if (provider === "ollama") {
            const { createOpenAI } = await import("@ai-sdk/openai");
            modelInstance = createOpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" })(model);
        } else {
            throw new Error("Proveedor no soportado");
        }

        const { generateText } = await import("ai");
        const response = await generateText({
            model: modelInstance,
            prompt: "Test connection. Reply briefly with 'OK'."
        });

        // Track usage for analytics
        const usageModel = (prisma as any).aiUsage || (prisma as any).aIUsage;
        if (usageModel) {
            await usageModel.create({
                data: {
                    userId: session.user.id,
                    provider,
                    model,
                    action: "test_connection",
                    promptTokens: (response.usage as any)?.promptTokens || 0,
                    completionTokens: (response.usage as any)?.completionTokens || 0,
                    totalTokens: (response.usage as any)?.totalTokens || 0
                }
            });
        }

        return { success: true, message: `Conexión exitosa con ${provider} - ${model}` };
    } catch (err: any) {
        console.error("Test connection failed:", err);
        return { success: false, error: err.message || "Error desconocido al probar la conexión." };
    }
}


