"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getTeacherDashboardStatsAction() {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    return await courseService.getTeacherDashboardStats(session.user.id);
}
