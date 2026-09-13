import prisma from "@/lib/prisma";


export const profileService = {
    async getProfile(userId: string) {
        const [profile, credentialAccount] = await Promise.all([
            prisma.profile.findUnique({
                where: { userId },
            }),
            prisma.account.findFirst({
                where: { userId, providerId: "credential" },
                select: { id: true, password: true }
            })
        ]);

        return {
            ...profile,
            hasPassword: !!credentialAccount?.password
        };
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
