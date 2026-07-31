import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import { TeacherEvaluationsView } from "@/features/teacher/components/TeacherEvaluationsView";

export default async function EvaluationsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        redirect("/signin");
    }

    const evaluations = await evaluationService.getTeacherEvaluations(session.user.id);

    return <TeacherEvaluationsView evaluations={evaluations} />;
}
