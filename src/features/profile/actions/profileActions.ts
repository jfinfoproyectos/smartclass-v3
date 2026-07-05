"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getProfileAction() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const { profileService } = await import("../services/profileService");
    return await profileService.getProfile(session.user.id);
}

export async function updateProfileAction(formData: FormData) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const identificacion = formData.get("identificacion") as string;
    const nombres = formData.get("nombres") as string;
    const apellido = formData.get("apellido") as string;
    const telefono = formData.get("telefono") as string | null;
    const geminiApiKey = formData.get("geminiApiKey") as string | null;
    const dataProcessingConsent = formData.get("dataProcessingConsent") === "true";


    if (geminiApiKey && session.user.role === "teacher") {
        const { encrypt } = await import("@/lib/encryption");
        const encryptedKey = await encrypt(geminiApiKey);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { encryptedGeminiApiKey: encryptedKey }
        });
    }

    const { profileService } = await import("../services/profileService");
    await profileService.upsertProfile(session.user.id, {
        identificacion,
        nombres,
        apellido,
        telefono: telefono || undefined,
        dataProcessingConsent,
        dataProcessingConsentDate: dataProcessingConsent ? new Date() : undefined
    });

    revalidatePath("/");
}
