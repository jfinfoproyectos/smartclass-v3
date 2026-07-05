import prisma from "@/lib/prisma";


export const profileService = {
    async getProfile(userId: string) {
        return await prisma.profile.findUnique({
            where: { userId },
        });
    },

    async upsertProfile(userId: string, data: {
        identificacion: string;
        nombres: string;
        apellido: string;
        telefono?: string;
        dataProcessingConsent?: boolean;
        dataProcessingConsentDate?: Date;
    }) {
        return await prisma.profile.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
            },
            update: data,
        });
    },
};
