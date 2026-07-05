"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getStudentRemarksAction(courseId: string, userId: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }

    // Allow teacher to view any student, or student to view their own
    if (session.user.role === "student" && session.user.id !== userId) {
        throw new Error("Unauthorized");
    }

    const { remarkService } = await import("../services/remarkService");
    return await remarkService.getStudentRemarks(courseId, userId);
}
