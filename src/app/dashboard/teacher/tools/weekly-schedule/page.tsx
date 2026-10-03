import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { InstructorSchedulePlannerView } from "@/features/instructor-schedule/components/InstructorSchedulePlannerView";

export const metadata = {
    title: "Organizador de Horarios Semanales | SmartClass",
    description: "Herramienta avanzada para que el instructor organice sus horarios de clases en múltiples instituciones académicas con exportación JSON y PDF.",
};

export default async function WeeklyScheduleToolPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as { id?: string; email?: string; name?: string; role?: string; roles?: string[] } | null | undefined;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        redirect("/signin");
    }

    const instructorId = user?.id || user?.email || "default";
    const instructorName = user?.name || "Instructor Docente";

    return (
      <InstructorSchedulePlannerView 
        instructorId={instructorId} 
        initialInstructorName={instructorName} 
      />
    );
}
