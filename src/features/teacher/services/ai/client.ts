import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMinimax } from "vercel-minimax-ai-provider";
import { createOllama } from "ollama-ai-provider";
import { decrypt } from "@/lib/encryption";
import prisma from "@/lib/prisma";

/**
 * Get a configured Vercel AI SDK LanguageModelV3 instance.
 * Supports Google (via AI SDK), MiniMax, or Ollama.
 * @param userId - Optional user ID for fetching user-specific API key
 * @returns A configured LanguageModel instance from the Vercel AI SDK
 */
export async function getAIModel(userId?: string): Promise<any> {
    let apiKey: string | null = null;
    let provider = process.env.AI_PROVIDER || "google";
    let activeModel = process.env.AI_MODEL || "";

    if (userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        }) as any;

        // ÚNICAMENTE EL ROL PROFESOR PUEDE USAR SUS PROPIAS CREDENCIALES
        if (user?.role !== "teacher") {
            throw new Error("Llamada de IA incorrecta: solo los profesores pueden usar sus credenciales personales.");
        }

        if (user?.aiProvider) {
            provider = user.aiProvider;
        }
        if (user?.aiModel) {
            activeModel = user.aiModel;
        }

        if (user?.encryptedGeminiApiKey) {
            try {
                apiKey = await decrypt(user.encryptedGeminiApiKey);
            } catch (error) {
                console.error("Error decrypting user API key:", error);
            }
        }
    }

    if (provider === "ollama") {
        const { createOpenAI } = await import("@ai-sdk/openai");
        const ollama = createOpenAI({
            baseURL: "http://localhost:11434/v1",
            apiKey: "ollama"
        });
        return ollama(activeModel);
    }

    if (provider === "minimax") {
        const minimaxKey = apiKey || process.env.MINIMAX_API_KEY || null;
        if (!minimaxKey) {
            throw new Error("API Key de MiniMax no configurada.");
        }
        const minimax = createMinimax({
            apiKey: minimaxKey
        });
        return minimax(activeModel);
    }

    if (provider === "deepseek") {
        const deepseekKey = apiKey || process.env.DEEPSEEK_API_KEY || null;
        if (!deepseekKey) {
            throw new Error("API Key de DeepSeek no configurada.");
        }
        const { createDeepSeek } = await import("@ai-sdk/deepseek");
        const deepseek = createDeepSeek({
            apiKey: deepseekKey
        });
        return deepseek(activeModel);
    }

    if (provider === "anthropic") {
        const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY || null;
        if (!anthropicKey) {
            throw new Error("API Key de Anthropic no configurada.");
        }
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        const anthropic = createAnthropic({
            apiKey: anthropicKey
        });
        return anthropic(activeModel);
    }

    if (provider === "xai") {
        const xaiKey = apiKey || process.env.XAI_API_KEY || null;
        if (!xaiKey) {
            throw new Error("API Key de xAI no configurada.");
        }
        const { createXai } = await import("@ai-sdk/xai");
        const xai = createXai({
            apiKey: xaiKey
        });
        return xai(activeModel);
    }

    if (provider === "mistral") {
        const mistralKey = apiKey || process.env.MISTRAL_API_KEY || null;
        if (!mistralKey) {
            throw new Error("API Key de Mistral no configurada.");
        }
        const { createMistral } = await import("@ai-sdk/mistral");
        const mistral = createMistral({
            apiKey: mistralKey
        });
        return mistral(activeModel);
    }

    if (provider === "openai") {
        const openaiKey = apiKey || process.env.OPENAI_API_KEY || null;
        if (!openaiKey) {
            throw new Error("API Key de OpenAI no configurada.");
        }
        const { createOpenAI } = await import("@ai-sdk/openai");
        const openai = createOpenAI({
            apiKey: openaiKey
        });
        return openai(activeModel);
    }

    // Google by default
    const googleKey = apiKey || process.env.GEMINI_API_KEY || null;
    if (!googleKey) {
        throw new Error("El profesor no ha configurado su API Key o la variable de entorno GEMINI_API_KEY. Por favor, ve a Configuración para suministrarla.");
    }
    const google = createGoogleGenerativeAI({
        apiKey: googleKey
    });
    return google(activeModel);
}

/**
 * Extract and parse JSON from AI response text
 * Handles cases where JSON is wrapped in markdown code blocks or has extra text
 */
export function extractJSON<T = any>(text: string): T {
    const firstOpenBrace = text.indexOf('{');
    const lastCloseBrace = text.lastIndexOf('}');

    let jsonStr = text;
    if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
        jsonStr = text.substring(firstOpenBrace, lastCloseBrace + 1);
    }

    // Sanitize common LLM JSON errors:
    // 1. Literal control characters (like raw newlines, tabs) inside string values
    // This regex finds content between double quotes and replaces literal newlines/tabs with escapes
    const sanitize = (str: string) => {
        return str.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, content) => {
            // Replace raw control characters (0-31) with their escaped versions
            const escaped = content
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t')
                .replace(/[\x00-\x1f]/g, (ch: string) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
            return `"${escaped}"`;
        });
    };

    try {
        return JSON.parse(sanitize(jsonStr));
    } catch (primaryError) {
        // Fallback: try to extract JSON from a markdown code block (```json ... ```)
        const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch?.[1]) {
            try {
                return JSON.parse(sanitize(markdownMatch[1]));
            } catch {
                // Ignore fallback error, throw the original
            }
        }
        throw primaryError;
    }
}

/**
 * Repair escaped characters in feedback text
 */
export function repairFeedbackText(text: string): string {
    if (typeof text !== 'string') return text;
    
    // 1. Fix standard escaped characters
    let repaired = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    
    // 2. Fix AI SDK / Gemini artifacts where `\n` is corrupted to `n` in markdown
    // Table row separators `|n|` -> `|\n|`
    repaired = repaired.replace(/\|n\|/g, '|\n|');
    
    // Double newlines (paragraphs) typically appear as `nn` at the start of headings or paragraphs
    // e.g. `correctamente.nn## Resumen` -> `correctamente.\n\n## Resumen`
    repaired = repaired.replace(/([a-zA-Z0-9\.\*\!\?])nn([a-zA-Z0-9#\-\*])/g, '$1\n\n$2');
    
    // List items that might have been corrupted `n- ` or `n* ` or `n1. `
    repaired = repaired.replace(/([a-zA-Z0-9\.\*\!\?])n- /g, '$1\n- ');
    repaired = repaired.replace(/([a-zA-Z0-9\.\*\!\?])n\* /g, '$1\n* ');
    repaired = repaired.replace(/([a-zA-Z0-9\.\*\!\?])n([0-9]+\. )/g, '$1\n$2');
    
    // Any `nn` followed by a markdown heading
    repaired = repaired.replace(/nn#/g, '\n\n#');
    
    // Fix single `n` followed by `**` (bolding)
    repaired = repaired.replace(/([a-zA-Z0-9\.\*\!\?])n\*\*/g, '$1\n**');
    
    return repaired;
}
