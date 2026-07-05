import prisma from "@/lib/prisma";

export const sharedContentService = {
    async create(data: {
        title: string;
        description?: string;
        links: any[];
        files: any[];
        courseId: string;
        teacherId: string;
        createdAt?: Date;
    }) {
        return await prisma.sharedContent.create({
            data: {
                title: data.title,
                description: data.description,
                links: data.links,
                files: data.files,
                courseId: data.courseId,
                teacherId: data.teacherId,
                createdAt: data.createdAt,
            },
        });
    },

    async update(id: string, data: {
        title?: string;
        description?: string;
        links?: any[];
        files?: any[];
        createdAt?: Date;
    }) {
        return await prisma.sharedContent.update({
            where: { id },
            data,
        });
    },

    async delete(id: string) {
        return await prisma.sharedContent.delete({
            where: { id },
        });
    },

    async getByCourse(courseId: string) {
        return await prisma.sharedContent.findMany({
            where: { courseId },
            orderBy: { createdAt: "asc" },
        });
    },

    async getById(id: string) {
        return await prisma.sharedContent.findUnique({
            where: { id },
        });
    },
};
