import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function getGithubToken(userId?: string): Promise<string | null> {
    try {
        // 1. Try to get token from User (if userId is provided)
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { encryptedGithubToken: true, role: true }
            });

            // 🛑 ÚNICAMENTE EL ROL PROFESOR PUEDE USAR SUS PROPIAS CREDENCIALES
            if (user?.role !== "teacher") {
                // Si no es profesor (estudiante o admin), no extraemos llaves personales.
                return null;
            }
            
            if (user?.encryptedGithubToken) {
                return await decrypt(user.encryptedGithubToken);
            }
        }

        return null;

    } catch (error: any) {
        console.error("Error fetching GitHub token:", error);
        return null;
    }
}
