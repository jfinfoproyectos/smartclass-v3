import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { extractClientIp, registerFailedLoginAttempt, resetFailedLogins } from "@/features/admin/services/ipSecurityService";

const handlers = toNextJsHandler(auth.handler);

export async function POST(req: NextRequest) {
    const res = await handlers.POST(req);

    // Monitoreo de seguridad en intentos de autenticación
    if (req.nextUrl.pathname.includes("/sign-in")) {
        const clientIp = extractClientIp(req.headers);
        const userAgent = req.headers.get("user-agent") || undefined;

        if (res.status === 401 || res.status === 400) {
            registerFailedLoginAttempt(clientIp, undefined, userAgent).catch((err) => {
                console.error("[AuthSecurity] Error registering failed login:", err);
            });
        } else if (res.status === 200 || res.status === 302) {
            resetFailedLogins(clientIp);
        }
    }

    return res;
}

export const GET = handlers.GET;
export const runtime = "nodejs";