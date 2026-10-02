// proxy.ts (Next.js 16 Network Boundary)
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { extractClientIp, inspectIncomingRequest } from "@/features/admin/services/ipSecurityService";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. INSPECCIÓN DE SEGURIDAD Y DEFENSA DE IPs (Firewall)
    const clientIp = extractClientIp(request.headers);
    const verdict = await inspectIncomingRequest({
        ip: clientIp,
        pathname,
        method: request.method,
        userAgent: request.headers.get("user-agent") || undefined,
        searchParams: request.nextUrl.search,
    });

    if (!verdict.allowed) {
        // Límite de peticiones excedido (HTTP 429)
        if (verdict.statusCode === 429) {
            return new NextResponse(
                JSON.stringify({
                    error: "Too Many Requests",
                    message: verdict.details?.reason || "Límite de solicitudes alcanzado. Por favor espera un momento.",
                    retryAfter: verdict.details?.retryAfter || 60,
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": String(verdict.details?.retryAfter || 60),
                    },
                }
            );
        }

        // Acceso Bloqueado / Prohibido (HTTP 403)
        const isApi = pathname.startsWith("/api/");
        if (isApi) {
            return new NextResponse(
                JSON.stringify({
                    error: "Access Denied",
                    reason: verdict.details?.reason || "Acceso bloqueado por el firewall de seguridad de IPs.",
                    ip: clientIp,
                    expiresAt: verdict.details?.expiresAt,
                    isPermanent: verdict.details?.isPermanent,
                }),
                {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Respuesta visual estilizada de bloqueo para navegadores
        const blockHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso Bloqueado - SmartClass Security Shield</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #07090e; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
                .card { max-width: 480px; width: 100%; background: radial-gradient(circle at top, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 24px; padding: 36px 28px; box-shadow: 0 30px 60px -15px rgba(239, 68, 68, 0.2); backdrop-filter: blur(20px); text-align: center; }
                .shield-icon { width: 68px; height: 68px; background: rgba(239, 68, 68, 0.15); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; box-shadow: 0 0 24px rgba(239, 68, 68, 0.3); }
                h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.5px; }
                p { font-size: 13.5px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
                .details { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(51, 65, 85, 0.7); border-radius: 14px; padding: 16px; text-align: left; font-size: 12.5px; margin-bottom: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
                .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(51, 65, 85, 0.4); }
                .details-row:last-child { border-bottom: none; }
                .label { color: #64748b; font-weight: 500; }
                .value { color: #f87171; font-weight: 600; word-break: break-all; text-align: right; max-width: 65%; }
                .badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; background: rgba(239, 68, 68, 0.18); color: #fca5a5; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.4); }
                .contact { font-size: 12px; color: #64748b; margin-top: 18px; line-height: 1.5; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="shield-icon">🛡️</div>
                <div class="badge">SmartClass Shield Defense</div>
                <h1>Acceso Restringido por Firewall</h1>
                <p>El sistema de seguridad ha interceptado y restringido el tráfico procedente de su red.</p>
                <div class="details">
                    <div class="details-row"><span class="label">IP Detectada:</span><span class="value">${clientIp}</span></div>
                    <div class="details-row"><span class="label">Motivo:</span><span class="value">${verdict.details?.reason || "Actividad sospechosa o exceso de peticiones"}</span></div>
                    <div class="details-row"><span class="label">Estado:</span><span class="value">${verdict.details?.isPermanent ? "Bloqueo Permanente" : "Bloqueo Temporal Activo"}</span></div>
                </div>
                <div class="contact">Si eres un usuario legítimo o consideras que se trata de un falso positivo, contacta a la administración institucional de SmartClass.</div>
            </div>
        </body>
        </html>
        `;

        return new NextResponse(blockHtml, {
            status: 403,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    }

    // 2. CONTROL DE RUTAS PROTEGIDAS Y ROLES DE SESIÓN
    const prefixes = ["/dashboard/admin", "/dashboard/student", "/dashboard/teacher"];
    const protectedPrefix = prefixes.find((p) => pathname.startsWith(p));

    // Obtener sesión usando el método nativo de Better Auth
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // Si no hay sesión para rutas protegidas, redirigir a sign-in
    if (!session) {
        if (protectedPrefix) {
            return NextResponse.redirect(new URL("/signin", request.url));
        }
        return NextResponse.next();
    }

    // Extraer rol
    const user = session.user;
    const role = user?.role || "student";

    const allowed: Record<string, string[]> = {
        "/dashboard/admin": ["admin"],
        "/dashboard/teacher": ["teacher"],
        "/dashboard/student": ["student"],
    };

    // Redireccionar usuarios autenticados que visiten raíz, signin o signup al dashboard
    if (pathname === "/" || pathname === "/signin" || pathname === "/signup") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Comprobar si el usuario tiene permiso para la ruta protegida
    if (protectedPrefix && !allowed[protectedPrefix].includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/signin",
        "/signup",
        "/dashboard",
        "/dashboard/:path*",
        "/api/auth/:path*",
        "/api/security/:path*",
    ],
};