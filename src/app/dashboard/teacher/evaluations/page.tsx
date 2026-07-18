import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import { EvaluationManager } from "@/features/teacher/components/EvaluationManager";

export default async function EvaluationsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        redirect("/login");
    }

    const evaluations = await evaluationService.getTeacherEvaluations(session.user.id);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-6">
            <EvaluationManager evaluations={evaluations} />
        </div>
    );
}
