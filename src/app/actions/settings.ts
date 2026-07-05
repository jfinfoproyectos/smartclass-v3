"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { settingsService } from "@/features/admin/services/settingsService";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getVisualSettingsAction() {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" }
        });

        return { 
            themeMode: settings?.appThemeMode || "STUDENT",
            themeColor: settings?.appThemeColor || "zinc",
            allowThemeColorChange: settings?.appAllowThemeColorChange ?? true
        };
    } catch (error) {
        console.error("Error fetching settings, using defaults:", error);
        return {
            themeMode: "STUDENT",
            themeColor: "zinc",
            allowThemeColorChange: true
        };
    }
}

export async function updateSettingsAction(data: any) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("No autorizado");
    }

    const result = await settingsService.updateSettings(data);

    // Audit log (optional but recommended)
    try {
        const { auditLogger } = await import("@/features/admin/services/auditLogger");
        await auditLogger.log({
            action: "UPDATE",
            entity: "SYSTEM",
            entityId: "settings",
            userId: session.user.id,
            userName: session.user.name || "Admin",
            userRole: session.user.role || "admin",
            description: "Configuración global actualizada",
            success: true
        });
    } catch (error) {
        console.error("Failed to log settings update:", error);
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard/admin/settings");
    
    return { success: true, settings: result };
}
