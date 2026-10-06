import { redirect } from "next/navigation";

export default async function EvaluationLiveDashboardRedirect(
    props: {
        params: Promise<{ courseId: string; attemptId: string }>;
        searchParams: Promise<{ mode?: string }>;
    }
) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const { courseId, attemptId } = params;
    const mode = searchParams?.mode === "projector" ? "projector" : "teacher";

    // Redireccionar al panel independiente fuera del shell del dashboard
    redirect(`/evaluations/${attemptId}/live?courseId=${courseId}&mode=${mode}`);
}
