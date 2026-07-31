"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MyEnrollments } from "./MyEnrollments";
import { formatName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EnrollCourseDialog } from "./EnrollCourseDialog";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { BookOpen, CalendarClock, Activity, GraduationCap } from "lucide-react";
import { DashboardContainer } from "@/components/ui/dashboard-container";

export function StudentDashboard({
    myEnrollments,
    studentName,
    themes = []
}: {
    myEnrollments: any[],
    studentName: string,
    themes?: any[]
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const selectedCourse = searchParams.get("courseId") || "";
    const activeTab = searchParams.get("tab") || "activities";
    const isInsideCourse = !!selectedCourse;

    const handleSelectCourse = (courseId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (courseId) {
            params.set("courseId", courseId);
            params.set("tab", "activities");
        } else {
            params.delete("courseId");
            params.delete("tab");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const activeEnrollmentsCount = myEnrollments.filter((e: any) => e.status === "approved" || e.status === "ACTIVE").length;

    if (isInsideCourse) {
        return (
            <div className="p-0 h-[calc(100vh-4rem)] overflow-hidden flex flex-col w-full">
                <style jsx global>{`
                    main[data-slot="sidebar-inset"] > header {
                        display: none !important;
                    }
                    main[data-slot="sidebar-inset"] {
                        margin: 0 !important;
                        border-radius: 0 !important;
                        height: 100vh !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    main[data-slot="sidebar-inset"] > div {
                        padding: 0 !important;
                        margin: 0 !important;
                        height: 100vh !important;
                        max-height: 100vh !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                    }
                    main[data-slot="sidebar-inset"] > div > div {
                        padding: 0 !important;
                        margin: 0 !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                    }
                    footer, .footer {
                        display: none !important;
                    }
                    body, html {
                        overflow: hidden !important;
                        height: 100vh !important;
                    }
                `}</style>
                <MyEnrollments
                    enrollments={myEnrollments}
                    selectedCourse={selectedCourse}
                    onSelectCourse={handleSelectCourse}
                    themes={themes}
                />
            </div>
        );
    }

    return (
        <DashboardContainer>
            {/* AI Canvas Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 left-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/20 via-purple-500/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Portal Estudiantil</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                            ¡Hola, {formatName(studentName).split(' ')[0]}! 👋
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Revisa el estado de tus materias, entregas de actividades y asistencias diarias.
                        </p>
                    </div>

                    <EnrollCourseDialog />
                </div>
            </div>

            {/* Quick Student Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <AICanvasCard
                    title="Mis Cursos"
                    description="Asignaturas inscritas en este período"
                    icon={BookOpen}
                    badge="Inscritos"
                    badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    accentColor="from-blue-500/30 via-indigo-500/20 to-transparent"
                    iconBgColor="bg-blue-500/10 dark:bg-blue-500/20"
                    iconTextColor="text-blue-600 dark:text-blue-400"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            {activeEnrollmentsCount}
                        </div>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Mi Asistencia"
                    description="Registro acumulado de clases presenciales"
                    icon={CalendarClock}
                    badge="Asistencia"
                    badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    accentColor="from-emerald-500/30 via-teal-500/20 to-transparent"
                    iconBgColor="bg-emerald-500/10 dark:bg-emerald-500/20"
                    iconTextColor="text-emerald-600 dark:text-emerald-400"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            100%
                        </div>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Actividades"
                    description="Talleres y tareas en progreso"
                    icon={Activity}
                    badge="Evaluación"
                    badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    accentColor="from-purple-500/30 via-pink-500/20 to-transparent"
                    iconBgColor="bg-purple-500/10 dark:bg-purple-500/20"
                    iconTextColor="text-purple-600 dark:text-purple-400"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            Activas
                        </div>
                    </div>
                </AICanvasCard>
            </div>

            {/* Content area */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Mis Cursos Asignados</h2>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <MyEnrollments 
                        enrollments={myEnrollments} 
                        selectedCourse={selectedCourse} 
                        onSelectCourse={handleSelectCourse}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        themes={themes}
                    />
                </motion.div>
            </div>
        </DashboardContainer>
    );
}
