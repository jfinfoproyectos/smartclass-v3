import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTeacherCredentialsAction } from "@/app/teacher-actions";
import { TeacherSettings } from "@/features/teacher/components/TeacherSettings";
import { Settings2 } from "lucide-react";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export default async function TeacherSettingsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        redirect("/signin");
    }

    const [credentials, themes] = await Promise.all([
        getTeacherCredentialsAction(),
        import("@/app/actions/themes").then(m => m.getAvailableThemes())
    ]);

    return (
        <DashboardContainer>
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md">
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Ajustes Docentes</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                        Configuración Personal & Claves API
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Gestiona tus credenciales de integración de IA (Gemini, OpenAI, DeepSeek, Claude) y conectividad GitHub.
                    </p>
                </div>
            </div>

            <TeacherSettings initialCredentials={credentials} themes={themes} />
        </DashboardContainer>
    );
}
