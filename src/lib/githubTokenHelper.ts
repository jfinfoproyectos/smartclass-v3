import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function getGithubToken(userId?: string): Promise<string | null> {
    try {
        // 1. Intentar obtener token personal del usuario (profesor o admin)
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { encryptedGithubToken: true, role: true }
            });

            if (user?.encryptedGithubToken) {
                try {
                    const decrypted = await decrypt(user.encryptedGithubToken);
                    if (decrypted && decrypted.trim()) {
                        return decrypted.trim();
                    }
                } catch (decErr) {
                    console.error("[getGithubToken] Error al desencriptar token de usuario:", decErr);
                }
            }
        }

        // 2. Fallback: Intentar obtener token global de SystemSettings de la aplicación
        try {
            const settings = await prisma.systemSettings.findFirst({
                select: { encryptedGithubToken: true }
            });

            if (settings?.encryptedGithubToken) {
                const decrypted = await decrypt(settings.encryptedGithubToken);
                if (decrypted && decrypted.trim()) {
                    return decrypted.trim();
                }
            }
        } catch (settingsErr) {
            console.error("[getGithubToken] Error al obtener token de SystemSettings:", settingsErr);
        }

        // 3. Fallback: Variable de entorno del servidor
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
            return process.env.GITHUB_TOKEN.trim();
        }

        return null;

    } catch (error: any) {
        console.error("[getGithubToken] Error general al consultar token de GitHub:", error);
        return null;
    }
}

export async function getGithubTokenInfo(userId?: string): Promise<{
    hasToken: boolean;
    source: "personal" | "system" | "env" | "none";
}> {
    try {
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { encryptedGithubToken: true }
            });
            if (user?.encryptedGithubToken) {
                try {
                    const decrypted = await decrypt(user.encryptedGithubToken);
                    if (decrypted && decrypted.trim()) {
                        return { hasToken: true, source: "personal" };
                    }
                } catch {
                    // Si falla desencriptar, continuar al fallback
                }
            }
        }

        const settings = await prisma.systemSettings.findFirst({
            select: { encryptedGithubToken: true }
        });
        if (settings?.encryptedGithubToken) {
            try {
                const decrypted = await decrypt(settings.encryptedGithubToken);
                if (decrypted && decrypted.trim()) {
                    return { hasToken: true, source: "system" };
                }
            } catch {
                // Si falla desencriptar, continuar al fallback
            }
        }

        if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
            return { hasToken: true, source: "env" };
        }

        return { hasToken: false, source: "none" };
    } catch {
        return { hasToken: false, source: "none" };
    }
}

