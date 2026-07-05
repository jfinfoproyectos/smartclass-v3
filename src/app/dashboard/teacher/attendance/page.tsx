import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
    const session = await authClient.getSession();

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Asistencias</h1>
                <p className="text-muted-foreground">
                    Gestiona las asistencias de tus estudiantes
                </p>
            </div>

            <div className="rounded-lg border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                    Esta funcionalidad estará disponible próximamente
                </p>
            </div>
        </div>
    );
}
