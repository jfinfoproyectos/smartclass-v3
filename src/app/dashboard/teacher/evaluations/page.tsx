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
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Evaluaciones</h1>
                <p className="text-muted-foreground">
                    Crea, gestiona y visualiza los resultados de tus evaluaciones estructuradas.
                </p>
            </div>

            <EvaluationManager evaluations={evaluations} />
        </div>
    );
}
