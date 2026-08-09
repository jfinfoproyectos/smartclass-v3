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

    const activeEnrollments = myEnrollments.filter((e: any) => e.status === "approved" || e.status === "ACTIVE");
    const activeEnrollmentsCount = activeEnrollments.length;

    const totalPendingActivities = myEnrollments.reduce((acc: number, e: any) => {
        const pending = e.course?.activities?.filter((a: any) => !a.submissions || a.submissions.length === 0).length || 0;
        return acc + pending;
    }, 0);

    const totalAttendanceCount = myEnrollments.reduce((acc: number, e: any) => {
        return acc + (e.course?.attendanceEvents?.length || 0);
    }, 0);

    if (isInsideCourse) {
        return (
            <div className="w-full flex-1 flex flex-col min-h-0 h-full overflow-hidden">
                <style jsx global>{`
                    main[data-slot="sidebar-inset"] > header {
                        display: none !important;
                    }
                    main[data-slot="sidebar-inset"] > div > div {
                        padding-top: 0 !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
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
                <div className="pointer-events-none absolute -top-32 left-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
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
                    badgeColor="bg-primary/10 text-primary border-primary/20"
                    accentColor="from-primary/30 via-primary/15 to-transparent"
                    iconBgColor="bg-primary/10"
                    iconTextColor="text-primary"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            {activeEnrollmentsCount}
                        </div>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Mi Asistencia"
                    description="Registros de asistencia a clases"
                    icon={CalendarClock}
                    badge="Asistencia"
                    badgeColor="bg-primary/10 text-primary border-primary/20"
                    accentColor="from-primary/30 via-primary/15 to-transparent"
                    iconBgColor="bg-primary/10"
                    iconTextColor="text-primary"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            {totalAttendanceCount} {totalAttendanceCount === 1 ? "Clase" : "Clases"}
                        </div>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Actividades"
                    description="Tareas y entregas por realizar"
                    icon={Activity}
                    badge="Evaluación"
                    badgeColor="bg-primary/10 text-primary border-primary/20"
                    accentColor="from-primary/30 via-primary/15 to-transparent"
                    iconBgColor="bg-primary/10"
                    iconTextColor="text-primary"
                >
                    <div className="pt-2">
                        <div className="text-3xl font-black tracking-tight text-foreground">
                            {totalPendingActivities} {totalPendingActivities === 1 ? "Pendiente" : "Pendientes"}
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
