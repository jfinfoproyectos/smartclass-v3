import prisma from "@/lib/prisma";

export const settingsService = {
    async getSettings() {
        let settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" }
        });

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: { id: "settings" }
            });
        }

        return settings;
    },

    async updateSettings(data: any) {
        return await prisma.systemSettings.upsert({
            where: { id: "settings" },
            update: data,
            create: { id: "settings", ...data }
        });
    }
};
