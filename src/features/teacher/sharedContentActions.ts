"use server";

import { sharedContentService } from "@/features/teacher/services/sharedContentService";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function createSharedContent(data: {
    title: string;
    description?: string;
    links: any[];
    files: any[];
    courseId: string;
    createdAt?: Date;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const content = await sharedContentService.create({
        ...data,
        teacherId: session.user.id,
    });

    revalidatePath(`/dashboard/teacher/courses/${data.courseId}`);
    return content;
}

export async function updateSharedContent(id: string, data: {
    title?: string;
    description?: string;
    links?: any[];
    files?: any[];
    courseId: string;
    createdAt?: Date;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const content = await sharedContentService.update(id, {
        title: data.title,
        description: data.description,
        links: data.links,
        files: data.files,
        createdAt: data.createdAt,
    });

    revalidatePath(`/dashboard/teacher/courses/${data.courseId}`);
    return content;
}

export async function deleteSharedContent(id: string, courseId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    await sharedContentService.delete(id);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getSharedContentByCourse(courseId: string) {
    return await sharedContentService.getByCourse(courseId);
}
