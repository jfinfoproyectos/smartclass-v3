import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import { TakeEvaluationLayout } from "@/features/student/components/TakeEvaluationLayout";

export default async function EvaluationPage({ params }: { params: Promise<{ attemptId: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "student") {
        redirect("/signin");
    }

    const { attemptId } = await params;
    const attempt = await evaluationService.getAttemptWithQuestions(attemptId);

    if (!attempt) {
        redirect("/dashboard/student");
    }

    // Initialize or fetch existing submission
    const submission = await evaluationService.getOrCreateSubmission(attemptId, session.user.id);

    // Verify Time Window ONLY if not submitted
    const isSubmitted = !!submission.submittedAt;
    if (!isSubmitted) {
        const now = new Date();
        if (now < new Date(attempt.startTime) || now > new Date(attempt.endTime)) {
            redirect("/dashboard/student");
        }
    }

    return (
        <TakeEvaluationLayout
            attempt={attempt}
            submission={submission}
            studentId={session.user.id}
        />
    );
}
