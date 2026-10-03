import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import {
    extractClientIp,
    registerFailedLoginAttempt,
    resetFailedLogins,
    checkAccountLockStatus,
} from "@/features/admin/services/ipSecurityService";

const handlers = toNextJsHandler(auth.handler);

export async function POST(req: NextRequest) {
    const isSignIn = req.nextUrl.pathname.includes("/sign-in");
    let attemptEmail: string | undefined;
    const clientIp = extractClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || undefined;

    if (isSignIn) {
        try {
            const clone = req.clone();
            const body = await clone.json();
            if (typeof body?.email === "string" && body.email.trim()) {
                attemptEmail = body.email.trim().toLowerCase();
            }
        } catch {
            // Cuerpo no JSON o ya consumido
        }

        // 1. Verificación previa de seguridad: Si la cuenta individual está bloqueada
        // Esto previene que un atacante siga forzando la cuenta, pero permite que los demás
        // estudiantes del aula (con la misma IP compartida) puedan ingresar sin problema.
        if (attemptEmail) {
            const lockStatus = await checkAccountLockStatus(attemptEmail, clientIp);
            if (lockStatus.isLocked) {
                return new NextResponse(
                    JSON.stringify({
                        error: "ACCOUNT_LOCKED",
                        message: lockStatus.reason || `La cuenta (${attemptEmail}) se encuentra temporalmente bloqueada por seguridad. Inténtalo más tarde o contacta a tu profesor.`,
                        retryAfter: lockStatus.retryAfterSeconds,
                    }),
                    {
                        status: 429,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": String(lockStatus.retryAfterSeconds || 60),
                        },
                    }
                );
            }
        }
    }

    const res = await handlers.POST(req);

    // Monitoreo de seguridad tras la respuesta de autenticación
    if (isSignIn) {
        if (res.status === 401 || res.status === 400) {
            registerFailedLoginAttempt(clientIp, attemptEmail, userAgent).catch((err) => {
                console.error("[AuthSecurity] Error registering failed login:", err);
            });
        } else if (res.status === 200 || res.status === 302) {
            resetFailedLogins(clientIp, attemptEmail).catch((err) => {
                console.error("[AuthSecurity] Error resetting failed logins:", err);
            });
        }
    }

    return res;
}

export const GET = handlers.GET;
export const runtime = "nodejs";