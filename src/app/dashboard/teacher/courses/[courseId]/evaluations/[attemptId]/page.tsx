import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import prisma from "@/lib/prisma";
import { SubmissionsManager } from "@/features/teacher/components/SubmissionsManager";

export async function generateMetadata() {
    const settings = await prisma.systemSettings.findUnique({
        where: { id: "settings" },
        select: { institutionName: true }
    });
    const appTitle = settings?.institutionName || "SmartClass";

    return {
        title: `Monitor de Entregas | ${appTitle}`,
        description: 'Gestor de entregas de evaluaciones estudiantiles',
    };
}

export default async function EvaluationAttemptResultsPage(
    props: {
        params: Promise<{ courseId: string; attemptId: string }>
    }
) {
    const params = await props.params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== 'teacher') {
        redirect("/signin");
    }

    const { courseId, attemptId } = params;

    const attempt = await evaluationService.getAttemptWithQuestions(attemptId);
    if (!attempt) {
        notFound();
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
    });

    if (!course) {
        notFound();
    }

    const settings = await prisma.systemSettings.findUnique({
        where: { id: "settings" },
        select: { institutionName: true }
    });

    const submissions = await evaluationService.getSubmissionsByAttempt(attemptId);

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
            <SubmissionsManager
                courseId={courseId}
                attempt={attempt}
                submissions={submissions}
                courseName={course.title}
                teacherName={session.user.name || "Profesor"}
                institutionName={settings?.institutionName || "SmartClass"}
            />
        </div>
    );
}
