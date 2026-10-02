"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    getSecurityOverview,
    getBlockedIpsList,
    blockIpManually,
    unblockIp,
    getWhitelistedIpsList,
    addWhitelistedIp,
    removeWhitelistedIp,
    getSecurityAttackLogs,
    clearExpiredBlockedIps,
    clearAllSecurityLogs,
    updateSecurityPolicySettings,
    extractClientIp,
    logSecurityAttack,
    SecuritySeverity,
    AttackType,
} from "../services/ipSecurityService";

// Helper de autorización de administrador
async function assertAdmin() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        throw new Error("No tienes permisos de administrador para ejecutar esta acción de seguridad.");
    }

    return session;
}

/**
 * Obtiene la IP actual del cliente/administrador
 */
export async function getCurrentAdminIpAction(): Promise<string> {
    const h = await headers();
    return extractClientIp(h);
}

/**
 * Obtiene métricas y estado global del firewall
 */
export async function getSecurityOverviewAction() {
    await assertAdmin();
    return getSecurityOverview();
}

/**
 * Obtiene lista de IPs bloqueadas
 */
export async function getBlockedIpsAction() {
    await assertAdmin();
    return getBlockedIpsList();
}

/**
 * Bloquea manualmente una IP
 */
export async function blockIpAction(data: {
    ip: string;
    reason: string;
    severity?: SecuritySeverity;
    durationHours?: number;
    isPermanent?: boolean;
}) {
    const session = await assertAdmin();
    const result = await blockIpManually({
        ...data,
        adminName: session.user.name || "Administrador",
    });

    revalidatePath("/dashboard/admin/security");
    revalidatePath("/dashboard/admin");
    return { success: true, record: result };
}

/**
 * Desbloquea una IP
 */
export async function unblockIpAction(ip: string) {
    await assertAdmin();
    await unblockIp(ip);

    revalidatePath("/dashboard/admin/security");
    revalidatePath("/dashboard/admin");
    return { success: true };
}

/**
 * Obtiene la lista blanca de IPs permitidas
 */
export async function getWhitelistedIpsAction() {
    await assertAdmin();
    return getWhitelistedIpsList();
}

/**
 * Añade una IP a la lista blanca
 */
export async function addWhitelistedIpAction(ip: string, description?: string) {
    const session = await assertAdmin();
    const result = await addWhitelistedIp(ip, description, session.user.name || "Administrador");

    revalidatePath("/dashboard/admin/security");
    return { success: true, record: result };
}

/**
 * Remueve una IP de la lista blanca
 */
export async function removeWhitelistedIpAction(ip: string) {
    await assertAdmin();
    await removeWhitelistedIp(ip);

    revalidatePath("/dashboard/admin/security");
    return { success: true };
}

/**
 * Obtiene registros de ataques con paginación y filtros
 */
export async function getSecurityAttackLogsAction(options: {
    page?: number;
    limit?: number;
    attackType?: string;
    severity?: string;
    searchIp?: string;
}) {
    await assertAdmin();
    return getSecurityAttackLogs(options);
}

/**
 * Limpia bloqueos que ya han expirado
 */
export async function clearExpiredBlockedIpsAction() {
    await assertAdmin();
    const purgedCount = await clearExpiredBlockedIps();
    revalidatePath("/dashboard/admin/security");
    return { success: true, purgedCount };
}

/**
 * Pone a cero los logs de auditoría forense
 */
export async function clearAllSecurityLogsAction() {
    await assertAdmin();
    const cleared = await clearAllSecurityLogs();
    revalidatePath("/dashboard/admin/security");
    return { success: true, cleared };
}

/**
 * Actualiza la política global de seguridad y defensas
 */
export async function updateSecurityPolicyAction(data: {
    enabled?: boolean;
    rateLimitMaxRequests?: number;
    rateLimitWindowSeconds?: number;
    authMaxAttempts?: number;
    autoBanDurationMinutes?: number;
    strictAdminWhitelist?: boolean;
    blockMaliciousScanners?: boolean;
}) {
    await assertAdmin();
    const updated = await updateSecurityPolicySettings(data);
    revalidatePath("/dashboard/admin/security");
    return { success: true, policy: updated };
}

/**
 * Simulación de ataque para verificar que el sistema de detección y alertas funcione
 */
export async function simulateAttackAction(attackType: AttackType, testIp: string = "198.51.100.42") {
    await assertAdmin();
    
    await logSecurityAttack({
        ip: testIp,
        attackType,
        severity: attackType === "BRUTE_FORCE" ? "HIGH" : attackType === "MALICIOUS_SCANNER" ? "CRITICAL" : "MEDIUM",
        endpoint: attackType === "BRUTE_FORCE" ? "/api/auth/sign-in/email" : "/.env",
        method: "POST",
        userAgent: "Simulated-Bot/1.0 (SmartClass Defense Tester)",
        payload: attackType === "BRUTE_FORCE" 
            ? "Simulación de fuerza bruta: 10 intentos fallidos simultáneos con diccionario" 
            : "Simulación de escáner: Sonda de vulnerabilidades a variables de entorno",
        blocked: true,
    });

    revalidatePath("/dashboard/admin/security");
    return { success: true };
}
