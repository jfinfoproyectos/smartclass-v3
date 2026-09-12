import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagement } from "@/features/admin/components/UserManagement";
import { getAllUsersAction } from "@/app/admin-actions";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import { Users, ShieldCheck } from "lucide-react";

export default async function AdminUsersPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const { users, total } = await getAllUsersAction({ limit: 20, role: "student" });

    return (
        <DashboardContainer>
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                        <Users className="w-3.5 h-3.5" />
                        <span>Gestión de Usuarios</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Administración de Cuentas & Roles
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Administra estudiantes, profesores y roles de administración del sistema.
                    </p>
                </div>
            </div>

            <UserManagement initialUsers={users} totalCount={total} />
        </DashboardContainer>
    );
}
