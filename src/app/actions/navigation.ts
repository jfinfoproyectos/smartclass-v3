"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function getSearchItems() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const userId = session.user.id;
    const role = session.user.role;

    if (role === "admin") {
        const courses = await prisma.course.findMany({
            select: { id: true, title: true },
            orderBy: { title: "asc" }
        });
        return courses.map(c => ({ id: c.id, title: c.title, type: "course", url: `/dashboard/admin/courses` }));
    }

    if (role === "teacher") {
        const courses = await prisma.course.findMany({
            where: { teacherId: userId },
            select: { id: true, title: true },
            orderBy: { title: "asc" }
        });
        return courses.map(c => ({ id: c.id, title: c.title, type: "course", url: `/dashboard/teacher/courses/${c.id}` }));
    }

    if (role === "student") {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId, status: "APPROVED" },
            include: { course: { select: { id: true, title: true } } }
        });
        return enrollments.map(e => ({ id: e.course.id, title: e.course.title, type: "course", url: `/dashboard/student?courseId=${e.course.id}` }));
    }

    return [];
}
