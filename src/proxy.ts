// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Define protected route prefixes and their allowed roles
    const prefixes = ["/dashboard/admin", "/dashboard/student", "/dashboard/teacher"];
    const protectedPrefix = prefixes.find((p) => pathname.startsWith(p));

    // Get session using the secure auth.api method
    const session = await auth.api.getSession({
        headers: await headers()
    });

    // If no session exists, redirect to sign-in for protected routes
    if (!session) {
        if (protectedPrefix) {
            return NextResponse.redirect(new URL("/signin", request.url));
        }
        return NextResponse.next();
    }

    // Extract user and role from session
    const user = session.user;
    const role = user?.role || "student";

    // Define role-based access control
    const allowed: Record<string, string[]> = {
        "/dashboard/admin": ["admin"],
        "/dashboard/teacher": ["teacher"],
        "/dashboard/student": ["student"],
    };

    // Redirect authenticated users from root or signin to unified home page
    if (pathname === "/" || pathname === "/signin" || pathname === "/signup") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Check if user has permission for the protected route
    if (protectedPrefix && !allowed[protectedPrefix].includes(role)) {
        // Redirect to home if user doesn't have permission
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/signin", "/signup", "/dashboard/admin/:path*", "/dashboard/student/:path*", "/dashboard/teacher/:path*", "/dashboard"]
};