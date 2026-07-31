import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CourseManagement } from "@/features/admin/components/CourseManagement";
import { getAllCoursesAdminAction, getAllUsersAction } from "@/app/admin-actions";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import { BookOpen, ShieldCheck } from "lucide-react";

export default async function AdminCoursesPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== "admin") {
        redirect("/dashboard/student");
    }

    const [{ courses, total }, { users: allUsers }] = await Promise.all([
        getAllCoursesAdminAction({ limit: 100 }),
        getAllUsersAction({ role: "teacher", limit: 500 })
    ]);

    return (
        <DashboardContainer>
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 backdrop-blur-md">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Gestión de Cursos</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                        Administración Global de Cursos
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Crea, asigna profesores y administra las asignaturas y programas académicos.
                    </p>
                </div>
            </div>

            <CourseManagement
                initialCourses={courses}
                teachers={allUsers}
                totalCount={total}
            />
        </DashboardContainer>
    );
}
