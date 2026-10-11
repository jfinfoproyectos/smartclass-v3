import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import { TakeEvaluationLayout } from "@/features/student/components/TakeEvaluationLayout";
import { getAvailableThemes } from "@/app/actions/themes";

export default async function EvaluationPage({ params }: { params: Promise<{ attemptId: string }> }) {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session || session.user.role !== "student") {
        redirect("/signin");
    }

    const { extractClientIp } = await import("@/features/admin/services/ipSecurityService");
    const clientIp = extractClientIp(headersList);
    const userAgent = headersList.get("user-agent") || undefined;

    const { attemptId } = await params;
    const [attempt, themes] = await Promise.all([
        evaluationService.getAttemptWithQuestions(attemptId),
        getAvailableThemes()
    ]);

    if (!attempt) {
        redirect("/dashboard/student");
    }

    // Verify student is assigned to this attempt
    const assignedIds = Array.isArray(attempt.assignedStudentIds)
        ? (attempt.assignedStudentIds as string[])
        : typeof attempt.assignedStudentIds === 'string'
            ? JSON.parse(attempt.assignedStudentIds)
            : [];
    if (assignedIds.length > 0 && !assignedIds.includes(session.user.id)) {
        redirect("/dashboard/student");
    }

    // Initialize or fetch existing submission with client IP telemetry
    const submission = await evaluationService.getOrCreateSubmission(attemptId, session.user.id, clientIp, userAgent);

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
            themes={themes}
        />
    );
}
