import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import prisma from "@/lib/prisma";
import { EvaluationLivePageClient } from "@/features/teacher/components/EvaluationLivePageClient";

export async function generateMetadata(
    props: {
        searchParams: Promise<{ mode?: string }>
    }
) {
    const searchParams = await props.searchParams;
    const mode = searchParams?.mode === "projector" ? "Proyector en Clase" : "Panel del Docente";
    return {
        title: `${mode} | SmartClass Live`,
        description: 'Monitoreo en tiempo real de la evaluación',
    };
}

export default async function EvaluationLiveStandalonePage(
    props: {
        params: Promise<{ attemptId: string }>;
        searchParams: Promise<{ courseId?: string; mode?: string }>;
    }
) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== 'teacher') {
        redirect("/signin");
    }

    const { attemptId } = params;
    const initialMode = searchParams?.mode === "projector" ? "projector" : "teacher";

    const attempt = await evaluationService.getAttemptWithQuestions(attemptId);
    if (!attempt) {
        notFound();
    }

    const courseId = searchParams?.courseId || attempt.courseId || "";
    let courseTitle = "Curso";
    if (courseId) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { title: true }
        });
        if (course) {
            courseTitle = course.title;
        }
    }

    const submissions = await evaluationService.getSubmissionsByAttempt(attemptId);

    return (
        <EvaluationLivePageClient
            courseId={courseId}
            attemptId={attemptId}
            initialSubmissions={submissions}
            attempt={attempt}
            courseName={courseTitle}
            evaluationTitle={attempt.evaluation?.title || "Evaluación"}
            initialMode={initialMode}
        />
    );
}
