import prisma from "@/lib/prisma";

// -------------------------------------------------------------
// Interfaces y Tipos
// -------------------------------------------------------------
export type AttackType =
    | "BRUTE_FORCE"
    | "RATE_LIMIT_EXCEEDED"
    | "PATH_TRAVERSAL"
    | "SQL_INJECTION_PROBE"
    | "MALICIOUS_SCANNER"
    | "ADMIN_UNAUTHORIZED"
    | "BLOCKED_IP_ATTEMPT"
    | "MANUAL_BLOCK";

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityInspectionResult {
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    details?: {
        ip: string;
        reason?: string;
        expiresAt?: Date | null;
        isPermanent?: boolean;
        retryAfter?: number;
    };
}

// -------------------------------------------------------------
// En memoria: Rate Limiting & Caché de Alto Rendimiento
// -------------------------------------------------------------
interface RateBucket {
    count: number;
    windowStart: number;
    failedLogins: number;
    violationsCount: number;
}

const rateLimitMap = new Map<string, RateBucket>();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Limpieza periódica de memoria
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [ip, bucket] of rateLimitMap.entries()) {
            if (now - bucket.windowStart > 10 * 60 * 1000) {
                rateLimitMap.delete(ip);
            }
        }
    }, CLEANUP_INTERVAL);
}

// Caché en memoria para evitar saturar la base de datos en cada request
interface SecurityCache {
    blockedIps: Map<string, { reason: string; expiresAt: Date | null; isPermanent: boolean }>;
    whitelistedIps: Set<string>;
    policy: {
        enabled: boolean;
        rateLimitMaxRequests: number;
        rateLimitWindowSeconds: number;
        authMaxAttempts: number;
        autoBanDurationMinutes: number;
        strictAdminWhitelist: boolean;
        blockMaliciousScanners: boolean;
    } | null;
    lastFetch: number;
}

const securityCache: SecurityCache = {
    blockedIps: new Map(),
    whitelistedIps: new Set(),
    policy: null,
    lastFetch: 0,
};

const CACHE_TTL_MS = 15 * 1000; // 15 segundos

/**
 * Invalida el caché en memoria para refresco inmediato tras cambios administrativos
 */
export function invalidateSecurityCache() {
    securityCache.lastFetch = 0;
}

/**
 * Normaliza y extrae la IP real del cliente a partir de cabeceras estándar
 */
export function extractClientIp(headersLike: Headers | Record<string, string | string[] | undefined>): string {
    const getHeader = (name: string): string | undefined => {
        if ("get" in headersLike && typeof headersLike.get === "function") {
            return headersLike.get(name) || undefined;
        }
        const val = (headersLike as Record<string, any>)[name] || (headersLike as Record<string, any>)[name.toLowerCase()];
        if (Array.isArray(val)) return val[0];
        return typeof val === "string" ? val : undefined;
    };

    const forwardedFor = getHeader("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0].trim();
        if (firstIp) return normalizeIp(firstIp);
    }

    const realIp = getHeader("x-real-ip");
    if (realIp) return normalizeIp(realIp.trim());

    const cfIp = getHeader("cf-connecting-ip");
    if (cfIp) return normalizeIp(cfIp.trim());

    const fastlyIp = getHeader("fastly-client-ip");
    if (fastlyIp) return normalizeIp(fastlyIp.trim());

    return "127.0.0.1";
}

/**
 * Limpia prefijos IPv6 / locales comunes
 */
export function normalizeIp(ip: string): string {
    if (!ip) return "127.0.0.1";
    let cleaned = ip.trim();
    if (cleaned.startsWith("::ffff:")) {
        cleaned = cleaned.substring(7);
    }
    if (cleaned === "::1" || cleaned === "localhost") {
        return "127.0.0.1";
    }
    return cleaned;
}

/**
 * Sincroniza la política y listas de IPs en memoria desde la Base de Datos
 */
async function ensureSecurityCache(): Promise<SecurityCache> {
    const now = Date.now();
    if (securityCache.policy && (now - securityCache.lastFetch) < CACHE_TTL_MS) {
        return securityCache;
    }

    try {
        // Cargar política (o crear por defecto si no existe)
        let policy = await prisma.securityPolicy.findUnique({
            where: { id: "security_policy" },
        });

        if (!policy) {
            policy = await prisma.securityPolicy.create({
                data: {
                    id: "security_policy",
                    enabled: true,
                    rateLimitMaxRequests: 100,
                    rateLimitWindowSeconds: 60,
                    authMaxAttempts: 5,
                    autoBanDurationMinutes: 60,
                    strictAdminWhitelist: false,
                    blockMaliciousScanners: true,
                },
            });
        }

        // Cargar IPs bloqueadas activas (o permanentes o con expiresAt > now)
        const currentDate = new Date();
        const activeBlocked = await prisma.blockedIp.findMany({
            where: {
                OR: [
                    { isPermanent: true },
                    { expiresAt: { gt: currentDate } },
                ],
            },
            select: {
                ip: true,
                reason: true,
                expiresAt: true,
                isPermanent: true,
            },
        });

        // Cargar IPs en lista blanca
        const whitelisted = await prisma.whitelistedIp.findMany({
            select: { ip: true },
        });

        const blockedMap = new Map<string, { reason: string; expiresAt: Date | null; isPermanent: boolean }>();
        for (const item of activeBlocked) {
            blockedMap.set(item.ip, {
                reason: item.reason,
                expiresAt: item.expiresAt,
                isPermanent: item.isPermanent,
            });
        }

        const whiteSet = new Set<string>();
        for (const item of whitelisted) {
            whiteSet.add(item.ip);
        }

        securityCache.policy = {
            enabled: policy.enabled,
            rateLimitMaxRequests: policy.rateLimitMaxRequests,
            rateLimitWindowSeconds: policy.rateLimitWindowSeconds,
            authMaxAttempts: policy.authMaxAttempts,
            autoBanDurationMinutes: policy.autoBanDurationMinutes,
            strictAdminWhitelist: policy.strictAdminWhitelist,
            blockMaliciousScanners: policy.blockMaliciousScanners,
        };
        securityCache.blockedIps = blockedMap;
        securityCache.whitelistedIps = whiteSet;
        securityCache.lastFetch = now;
    } catch (error) {
        console.error("[IpSecurityService] Error refreshing security cache:", error);
        // Fallback seguro si la BD falla transitoriamente
        if (!securityCache.policy) {
            securityCache.policy = {
                enabled: true,
                rateLimitMaxRequests: 100,
                rateLimitWindowSeconds: 60,
                authMaxAttempts: 5,
                autoBanDurationMinutes: 60,
                strictAdminWhitelist: false,
                blockMaliciousScanners: true,
            };
        }
    }

    return securityCache;
}

// -------------------------------------------------------------
// Detección de patrones maliciosos / escáneres
// -------------------------------------------------------------
const SUSPICIOUS_PATH_PATTERNS = [
    /\/\.env(\.|$)/i,
    /\/\.git(\/|$)/i,
    /\/\.aws(\/|$)/i,
    /\/wp-admin/i,
    /\/wp-login\.php/i,
    /\/xmlrpc\.php/i,
    /\/phpmyadmin/i,
    /\/pma/i,
    /\/actuator(\/|$)/i,
    /\/server-status/i,
    /\/web\.config/i,
    /\/etc\/passwd/i,
    /\.\.\/\.\./,           // Path traversal simple
    /\.\.%2f\.\.%2f/i,      // Path traversal encoded
];

const SUSPICIOUS_PAYLOAD_PATTERNS = [
    /union(\s+all)?\s+select/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /document\.cookie/i,
    /exec\s*\(\s*xp_cmdshell/i,
    /benchmark\s*\(\s*\d+/i,
    /waitfor\s+delay/i,
];

export function isMaliciousProbe(pathname: string, searchParams?: string): { isMalicious: boolean; type?: AttackType; reason?: string } {
    for (const pattern of SUSPICIOUS_PATH_PATTERNS) {
        if (pattern.test(pathname)) {
            return {
                isMalicious: true,
                type: "MALICIOUS_SCANNER",
                reason: `Escaneo sospechoso de endpoint protegido: ${pathname}`,
            };
        }
    }

    if (searchParams) {
        const decoded = decodeURIComponent(searchParams);
        for (const pattern of SUSPICIOUS_PAYLOAD_PATTERNS) {
            if (pattern.test(decoded)) {
                return {
                    isMalicious: true,
                    type: "SQL_INJECTION_PROBE",
                    reason: `Inyección detectada en parámetros de consulta: ${decoded.slice(0, 100)}`,
                };
            }
        }
    }

    return { isMalicious: false };
}

// -------------------------------------------------------------
// Motor Central de Inspección de Solicitudes (Guardia)
// -------------------------------------------------------------
export async function inspectIncomingRequest(options: {
    ip: string;
    pathname: string;
    method: string;
    userAgent?: string;
    searchParams?: string;
}): Promise<SecurityInspectionResult> {
    const { ip, pathname, method, userAgent, searchParams } = options;

    const cache = await ensureSecurityCache();
    const policy = cache.policy;

    // 1. Si la IP está en Lista Blanca -> Acceso Ilimitado Autorizado
    if (cache.whitelistedIps.has(ip)) {
        return { allowed: true };
    }

    // 2. Si la protección general está desactivada por el Admin
    if (!policy || !policy.enabled) {
        return { allowed: true };
    }

    // 3. Verificar si la IP está en la Lista Negra (Bloqueada)
    const blockRecord = cache.blockedIps.get(ip);
    if (blockRecord) {
        const isExpired = blockRecord.expiresAt && new Date(blockRecord.expiresAt).getTime() <= Date.now();
        if (!blockRecord.isPermanent && isExpired) {
            // Ya expiró: desbloquear de caché y permitir pasar
            cache.blockedIps.delete(ip);
        } else {
            // Registrar intento de acceso desde IP bloqueada (asíncrono sin bloquear)
            logSecurityAttack({
                ip,
                attackType: "BLOCKED_IP_ATTEMPT",
                severity: "HIGH",
                endpoint: pathname,
                method,
                userAgent,
                payload: `Intento de acceso bloqueado. Razón previa: ${blockRecord.reason}`,
                blocked: true,
            }).catch(() => {});

            return {
                allowed: false,
                reason: "IP_BLOCKED",
                statusCode: 403,
                details: {
                    ip,
                    reason: blockRecord.reason,
                    expiresAt: blockRecord.expiresAt,
                    isPermanent: blockRecord.isPermanent,
                },
            };
        }
    }

    // 4. Verificación de Escáneres y Patrones Maliciosos
    if (policy.blockMaliciousScanners) {
        const probeCheck = isMaliciousProbe(pathname, searchParams);
        if (probeCheck.isMalicious) {
            // Baneo automático inmediato por intento de escaneo / exploit
            await autoBanIp({
                ip,
                reason: probeCheck.reason || "Escaneo malicioso de vulnerabilidades",
                severity: "CRITICAL",
                durationMinutes: policy.autoBanDurationMinutes * 2, // Doble penalidad
                attackType: probeCheck.type || "MALICIOUS_SCANNER",
                endpoint: pathname,
                method,
                userAgent,
            });

            return {
                allowed: false,
                reason: "MALICIOUS_PROBE_DETECTED",
                statusCode: 403,
                details: {
                    ip,
                    reason: "Actividad maliciosa detectada y neutralizada por el Firewall",
                },
            };
        }
    }

    // 5. Restricción Estricta de Panel de Administrador (Solo IPs en Whitelist)
    if (policy.strictAdminWhitelist && pathname.startsWith("/dashboard/admin")) {
        // La IP no está en whitelist (ya comprobado en paso 1)
        logSecurityAttack({
            ip,
            attackType: "ADMIN_UNAUTHORIZED",
            severity: "HIGH",
            endpoint: pathname,
            method,
            userAgent,
            payload: "Intento de acceso al panel de administración desde IP no autorizada en Lista Blanca",
            blocked: true,
        }).catch(() => {});

        return {
            allowed: false,
            reason: "STRICT_ADMIN_WHITELIST_REQUIRED",
            statusCode: 403,
            details: {
                ip,
                reason: "Acceso al Panel de Administrador restringido exclusivamente a IPs autorizadas en la Lista Blanca.",
            },
        };
    }

    // 6. Rate Limiting por IP (Ventana Deslizante)
    const now = Date.now();
    let bucket = rateLimitMap.get(ip);
    const windowMs = policy.rateLimitWindowSeconds * 1000;

    if (!bucket || (now - bucket.windowStart) > windowMs) {
        bucket = {
            count: 1,
            windowStart: now,
            failedLogins: bucket ? bucket.failedLogins : 0,
            violationsCount: bucket ? bucket.violationsCount : 0,
        };
        rateLimitMap.set(ip, bucket);
    } else {
        bucket.count++;
    }

    // Umbral más restrictivo para endpoints sensibles de autenticación
    const isAuthEndpoint = pathname.includes("/signin") || pathname.includes("/signup") || pathname.includes("/api/auth");
    const maxAllowedRequests = isAuthEndpoint
        ? Math.min(20, Math.floor(policy.rateLimitMaxRequests / 3))
        : policy.rateLimitMaxRequests;

    if (bucket.count > maxAllowedRequests) {
        bucket.violationsCount++;

        // Si sobrepasa reiteradamente (3 o más infracciones consecutivas), auto-banear IP
        if (bucket.violationsCount >= 3) {
            await autoBanIp({
                ip,
                reason: `Exceso sostenido de peticiones: ${bucket.count} reqs/${policy.rateLimitWindowSeconds}s (Ataque DDoS / Flood)`,
                severity: "HIGH",
                durationMinutes: policy.autoBanDurationMinutes,
                attackType: "RATE_LIMIT_EXCEEDED",
                endpoint: pathname,
                method,
                userAgent,
            });

            return {
                allowed: false,
                reason: "IP_BLOCKED_RATE_LIMIT",
                statusCode: 403,
                details: {
                    ip,
                    reason: "IP bloqueada temporalmente por exceso masivo de solicitudes (Protección contra DDoS)",
                },
            };
        }

        // Registrar ataque de rate limit
        logSecurityAttack({
            ip,
            attackType: "RATE_LIMIT_EXCEEDED",
            severity: "MEDIUM",
            endpoint: pathname,
            method,
            userAgent,
            payload: `Límite excedido: ${bucket.count}/${maxAllowedRequests} en ${policy.rateLimitWindowSeconds}s`,
            blocked: true,
        }).catch(() => {});

        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
        return {
            allowed: false,
            reason: "RATE_LIMIT_EXCEEDED",
            statusCode: 429,
            details: {
                ip,
                retryAfter: retryAfterSeconds,
                reason: `Demasiadas solicitudes. Límite de ${maxAllowedRequests} peticiones por minuto alcanzado.`,
            },
        };
    }

    return { allowed: true };
}

// -------------------------------------------------------------
// Registro y Detección de Intentos Fallidos de Login (Fuerza Bruta)
// -------------------------------------------------------------
export async function registerFailedLoginAttempt(ip: string, email?: string, userAgent?: string) {
    const cache = await ensureSecurityCache();
    const policy = cache.policy;
    if (!policy || !policy.enabled) return;

    // Si la IP está en whitelist, no banear
    if (cache.whitelistedIps.has(ip)) return;

    let bucket = rateLimitMap.get(ip);
    const now = Date.now();
    if (!bucket) {
        bucket = {
            count: 1,
            windowStart: now,
            failedLogins: 1,
            violationsCount: 0,
        };
        rateLimitMap.set(ip, bucket);
    } else {
        bucket.failedLogins++;
    }

    // Registrar en logs de ataques
    await logSecurityAttack({
        ip,
        attackType: "BRUTE_FORCE",
        severity: bucket.failedLogins >= policy.authMaxAttempts ? "CRITICAL" : "MEDIUM",
        endpoint: "/api/auth/sign-in/email",
        method: "POST",
        userAgent,
        payload: `Intento de acceso fallido #${bucket.failedLogins} para cuenta: ${email || "anónimo"}`,
        blocked: false,
    });

    // Si supera el límite de intentos fallidos -> Autobloqueo
    if (bucket.failedLogins >= policy.authMaxAttempts) {
        await autoBanIp({
            ip,
            reason: `Fuerza bruta: ${bucket.failedLogins} intentos fallidos de autenticación en poco tiempo`,
            severity: "HIGH",
            durationMinutes: policy.autoBanDurationMinutes,
            attackType: "BRUTE_FORCE",
            endpoint: "/api/auth/sign-in/email",
            method: "POST",
            userAgent,
        });
        bucket.failedLogins = 0; // Reset counter after ban
    }
}

// Reset de login fallido tras login exitoso
export function resetFailedLogins(ip: string) {
    const bucket = rateLimitMap.get(ip);
    if (bucket) {
        bucket.failedLogins = 0;
    }
}

// -------------------------------------------------------------
// Autobaneo de IP
// -------------------------------------------------------------
async function autoBanIp(options: {
    ip: string;
    reason: string;
    severity?: SecuritySeverity;
    durationMinutes: number;
    attackType: AttackType;
    endpoint: string;
    method?: string;
    userAgent?: string;
}) {
    const { ip, reason, severity = "HIGH", durationMinutes, attackType, endpoint, method = "GET", userAgent } = options;
    const expiresAt = durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;
    const isPermanent = durationMinutes <= 0;

    try {
        await prisma.blockedIp.upsert({
            where: { ip },
            create: {
                ip,
                reason,
                severity,
                attackCount: 1,
                isPermanent,
                expiresAt,
                blockedBy: "SISTEMA_FIREWALL",
            },
            update: {
                reason,
                severity,
                attackCount: { increment: 1 },
                isPermanent,
                expiresAt,
                updatedAt: new Date(),
            },
        });

        // Registrar en logs de ataque
        await logSecurityAttack({
            ip,
            attackType,
            severity: "CRITICAL",
            endpoint,
            method,
            userAgent,
            payload: `Baneo automático aplicado (${durationMinutes > 0 ? `${durationMinutes}m` : "Permanente"}). Razón: ${reason}`,
            blocked: true,
        });

        // Actualizar caché en memoria
        securityCache.blockedIps.set(ip, {
            reason,
            expiresAt,
            isPermanent,
        });
    } catch (error) {
        console.error("[IpSecurityService] Error during auto-ban:", error);
    }
}

// -------------------------------------------------------------
// Registro Forense de Eventos de Ataque
// -------------------------------------------------------------
export async function logSecurityAttack(data: {
    ip: string;
    attackType: AttackType;
    severity: SecuritySeverity;
    endpoint: string;
    method?: string;
    userAgent?: string;
    payload?: string;
    blocked?: boolean;
}) {
    try {
        await prisma.securityAttackLog.create({
            data: {
                ip: data.ip,
                attackType: data.attackType,
                severity: data.severity,
                endpoint: data.endpoint,
                method: data.method || "GET",
                userAgent: data.userAgent || null,
                payload: data.payload || null,
                blocked: data.blocked ?? true,
            },
        });
    } catch (e) {
        console.error("[IpSecurityService] Error writing attack log:", e);
    }
}

// -------------------------------------------------------------
// Consultas y Operaciones Administrativas
// -------------------------------------------------------------
export async function getSecurityOverview() {
    const cache = await ensureSecurityCache();
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
        totalBlocked,
        activeBlockedCount,
        whitelistedCount,
        totalAttacks,
        attacksLast24h,
        attacksByType,
        attacksBySeverity,
    ] = await Promise.all([
        prisma.blockedIp.count(),
        prisma.blockedIp.count({
            where: {
                OR: [
                    { isPermanent: true },
                    { expiresAt: { gt: now } },
                ],
            },
        }),
        prisma.whitelistedIp.count(),
        prisma.securityAttackLog.count(),
        prisma.securityAttackLog.count({
            where: { createdAt: { gte: twentyFourHoursAgo } },
        }),
        prisma.securityAttackLog.groupBy({
            by: ["attackType"],
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 6,
        }),
        prisma.securityAttackLog.groupBy({
            by: ["severity"],
            _count: { id: true },
        }),
    ]);

    return {
        policy: cache.policy,
        stats: {
            totalBlocked,
            activeBlockedCount,
            whitelistedCount,
            totalAttacks,
            attacksLast24h,
            attacksByType: attacksByType.map(t => ({ type: t.attackType, count: t._count.id })),
            attacksBySeverity: attacksBySeverity.map(s => ({ severity: s.severity, count: s._count.id })),
        },
    };
}

export async function getBlockedIpsList() {
    return prisma.blockedIp.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function blockIpManually(options: {
    ip: string;
    reason: string;
    severity?: SecuritySeverity;
    durationHours?: number; // 0 o null = permanente
    isPermanent?: boolean;
    adminName?: string;
}) {
    const { ip, reason, severity = "HIGH", durationHours = 24, isPermanent = false, adminName = "Administrador" } = options;
    const cleanIp = normalizeIp(ip);
    const expiresAt = isPermanent || durationHours <= 0 ? null : new Date(Date.now() + durationHours * 3600 * 1000);

    // Si estaba en whitelist, removerla
    await prisma.whitelistedIp.deleteMany({
        where: { ip: cleanIp },
    });

    const record = await prisma.blockedIp.upsert({
        where: { ip: cleanIp },
        create: {
            ip: cleanIp,
            reason: reason || "Bloqueado manualmente por el Administrador",
            severity,
            attackCount: 1,
            isPermanent: isPermanent || durationHours <= 0,
            expiresAt,
            blockedBy: adminName,
        },
        update: {
            reason: reason || "Bloqueo actualizado manualmente",
            severity,
            isPermanent: isPermanent || durationHours <= 0,
            expiresAt,
            blockedBy: adminName,
            updatedAt: new Date(),
        },
    });

    await logSecurityAttack({
        ip: cleanIp,
        attackType: "MANUAL_BLOCK",
        severity,
        endpoint: "/dashboard/admin/security",
        method: "POST",
        payload: `Bloqueo manual aplicado por ${adminName}. Motivo: ${reason}`,
        blocked: true,
    });

    invalidateSecurityCache();
    return record;
}

export async function unblockIp(ip: string) {
    const cleanIp = normalizeIp(ip);
    await prisma.blockedIp.deleteMany({
        where: { ip: cleanIp },
    });

    // Resetear también el contador en memoria
    rateLimitMap.delete(cleanIp);
    invalidateSecurityCache();
}

export async function getWhitelistedIpsList() {
    return prisma.whitelistedIp.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function addWhitelistedIp(ip: string, description?: string, addedBy: string = "Administrador") {
    const cleanIp = normalizeIp(ip);

    // Si estaba bloqueada, quitar el bloqueo
    await prisma.blockedIp.deleteMany({
        where: { ip: cleanIp },
    });

    const record = await prisma.whitelistedIp.upsert({
        where: { ip: cleanIp },
        create: {
            ip: cleanIp,
            description: description || "IP de confianza autorizada",
            addedBy,
        },
        update: {
            description: description || "IP de confianza autorizada",
            addedBy,
            updatedAt: new Date(),
        },
    });

    rateLimitMap.delete(cleanIp);
    invalidateSecurityCache();
    return record;
}

export async function removeWhitelistedIp(ip: string) {
    const cleanIp = normalizeIp(ip);
    await prisma.whitelistedIp.deleteMany({
        where: { ip: cleanIp },
    });
    invalidateSecurityCache();
}

export async function getSecurityAttackLogs(options: {
    page?: number;
    limit?: number;
    attackType?: string;
    severity?: string;
    searchIp?: string;
}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(10, options.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.attackType && options.attackType !== "ALL") {
        where.attackType = options.attackType;
    }
    if (options.severity && options.severity !== "ALL") {
        where.severity = options.severity;
    }
    if (options.searchIp && options.searchIp.trim()) {
        where.ip = { contains: options.searchIp.trim() };
    }

    const [total, logs] = await Promise.all([
        prisma.securityAttackLog.count({ where }),
        prisma.securityAttackLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
    ]);

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

export async function clearExpiredBlockedIps() {
    const now = new Date();
    const result = await prisma.blockedIp.deleteMany({
        where: {
            isPermanent: false,
            expiresAt: { lte: now },
        },
    });
    invalidateSecurityCache();
    return result.count;
}

export async function clearAllSecurityLogs() {
    const result = await prisma.securityAttackLog.deleteMany();
    return result.count;
}

export async function updateSecurityPolicySettings(data: {
    enabled?: boolean;
    rateLimitMaxRequests?: number;
    rateLimitWindowSeconds?: number;
    authMaxAttempts?: number;
    autoBanDurationMinutes?: number;
    strictAdminWhitelist?: boolean;
    blockMaliciousScanners?: boolean;
}) {
    const updated = await prisma.securityPolicy.upsert({
        where: { id: "security_policy" },
        create: {
            id: "security_policy",
            enabled: data.enabled ?? true,
            rateLimitMaxRequests: data.rateLimitMaxRequests ?? 100,
            rateLimitWindowSeconds: data.rateLimitWindowSeconds ?? 60,
            authMaxAttempts: data.authMaxAttempts ?? 5,
            autoBanDurationMinutes: data.autoBanDurationMinutes ?? 60,
            strictAdminWhitelist: data.strictAdminWhitelist ?? false,
            blockMaliciousScanners: data.blockMaliciousScanners ?? true,
        },
        update: {
            ...data,
            updatedAt: new Date(),
        },
    });

    invalidateSecurityCache();
    return updated;
}
