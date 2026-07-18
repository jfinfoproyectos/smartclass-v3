import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function StudentAttendancePage() {
    const session = await authClient.getSession();

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold tracking-tight">Mis Asistencias</h2>
                    <p className="text-muted-foreground">
                        Revisa tu historial de asistencias
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/25 backdrop-blur-md shadow-xl shadow-black/5 p-12 text-center">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Esta funcionalidad estará disponible próximamente
                </p>
            </div>
        </div>
    );
}
