import { DuplicateLinksReport } from "@/features/teacher/components/DuplicateLinksReport";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{
        courseId: string;
    }>;
}

export default async function DuplicateReportPage({ params }: PageProps) {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true }
    });

    if (!course) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Reporte de Duplicados</h2>
            </div>

            <div className="mt-6">
                <DuplicateLinksReport courseId={courseId} courseName={course.title} />
            </div>
        </div>
    );
}
