"use client";

import { useState } from "react";
import { 
    MessageSquare, Users, ClipboardCheck, Clock, BookOpen, GraduationCap, 
    FileText, AlertCircle, ArrowLeft, Calendar, ArrowRight, LayoutGrid, List,
    Sparkles, FolderGit2, Code2, Terminal, Video, Headphones, MessageSquareQuote, Database, Target, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCalendarDate } from "@/lib/dateUtils";
import { StudentAttendanceSummary } from "@/features/attendance/components/StudentAttendanceSummary";
import { SharedContentList } from './SharedContentList';
import { StudentRemarks } from "./StudentRemarks";
import { StudentGradesView } from './StudentGradesView';
import { formatName, cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { CreditsModal } from "@/components/CreditsModal";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { CodeThemeSelector } from "@/components/theme/CodeThemeSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserDocsList } from "@/features/documentation/components/student/UserDocsList";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { TabEmptyState } from "@/components/ui/tab-empty-state";

const getActivityTypeInfo = (type: string) => {
    switch (type) {
        case "GITHUB":
            return {
                label: "IA GitHub",
                icon: FolderGit2,
                badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
                accentColor: "from-purple-500/30 via-purple-500/10 to-transparent",
                iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            };
        case "CODE_PROJECT":
            return {
                label: "Proyecto Código",
                icon: Code2,
                badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
                accentColor: "from-blue-500/30 via-blue-500/10 to-transparent",
                iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            };
        case "CODE_CHALLENGE":
            return {
                label: "Code Challenge",
                icon: Terminal,
                badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
                accentColor: "from-indigo-500/30 via-indigo-500/10 to-transparent",
                iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
            };
        case "DATABASE":
        case "DB_MODELING":
            return {
                label: "Bases de Datos",
                icon: Database,
                badgeColor: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
                accentColor: "from-cyan-500/30 via-cyan-500/10 to-transparent",
                iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
            };
        case "AUDIO_DEFENSE":
            return {
                label: "Defensa Oral",
                icon: Headphones,
                badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
                accentColor: "from-violet-500/30 via-violet-500/10 to-transparent",
                iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
            };
        case "VIDEO_PITCH":
            return {
                label: "Video Pitch",
                icon: Video,
                badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
                accentColor: "from-rose-500/30 via-rose-500/10 to-transparent",
                iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            };
        case "AI_INTERVIEW":
            return {
                label: "Entrevista IA",
                icon: MessageSquareQuote,
                badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
                accentColor: "from-teal-500/30 via-teal-500/10 to-transparent",
                iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
            };
        case "PDF_REVIEW":
            return {
                label: "Revisión PDF",
                icon: FileText,
                badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                accentColor: "from-emerald-500/30 via-emerald-500/10 to-transparent",
                iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            };
        default:
            return {
                label: "Manual",
                icon: Calendar,
                badgeColor: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25",
                accentColor: "from-zinc-500/30 via-zinc-500/10 to-transparent",
                iconBg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
            };
    }
};

export function MyEnrollments({
    enrollments,
    selectedCourse,
    onSelectCourse,
    activeTab = "activities",
    onTabChange,
    themes = []
}: {
    enrollments: any[],
    selectedCourse?: string,
    onSelectCourse: (courseId: string | null) => void,
    activeTab?: string,
    onTabChange?: (tab: string) => void,
    themes?: any[]
}) {
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [activitiesViewMode, setActivitiesViewMode] = useState<"grid" | "table">("grid");
    const [evaluationsViewMode, setEvaluationsViewMode] = useState<"grid" | "table">("grid");
    const [docsViewMode, setDocsViewMode] = useState<"grid" | "table">("grid");

    const filteredEnrollments = selectedCourse
        ? enrollments.filter(e => e.course.id === selectedCourse)
        : enrollments;

    if (filteredEnrollments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
                <p className="text-muted-foreground font-medium">No estás inscrito en ningún curso todavía.</p>
            </div>
        );
    }

    if (!selectedCourse) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 px-1">
                    <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold">
                        <Button
                            type="button"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("grid")}
                            title="Vista de Tarjetas"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1.5" />
                            <span>Tarjetas</span>
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("table")}
                            title="Vista de Tabla"
                        >
                            <List className="h-4 w-4 mr-1.5" />
                            <span>Tabla</span>
                        </Button>
                    </div>
                </div>

                {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrollments.map((enrollment) => {
                            const teacherName = formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile);
                            return (
                                <AICanvasCard
                                    key={enrollment.id}
                                    title={enrollment.course.title}
                                    description={enrollment.course.description || "Asignatura académica en la que estás matriculado."}
                                    icon={BookOpen}
                                    badge="Matriculado"
                                    badgeColor="bg-primary/10 text-primary border-primary/20"
                                    accentColor="from-primary/30 via-primary/15 to-transparent"
                                    iconBgColor="bg-primary/10"
                                    iconTextColor="text-primary"
                                    actionLabel={`Docente: ${teacherName}`}
                                    actionText="Entrar al Aula →"
                                    onClick={() => onSelectCourse(enrollment.course.id)}
                                    className="h-full cursor-pointer group"
                                >
                                    <div className="space-y-2 pt-2 text-xs text-muted-foreground border-t border-border/40 mt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-foreground">Docente:</span>
                                            <span className="font-medium text-foreground">
                                                {teacherName}
                                            </span>
                                        </div>
                                        {enrollment.course.startDate && (
                                            <div className="flex items-center justify-between">
                                                <span>Inicio del Curso:</span>
                                                <span className="font-medium text-foreground">
                                                    {formatCalendarDate(enrollment.course.startDate, "dd/MM/yyyy")}
                                                </span>
                                            </div>
                                        )}
                                        {enrollment.course.endDate && (
                                            <div className="flex items-center justify-between">
                                                <span>Finalización:</span>
                                                <span className="font-medium text-foreground">
                                                    {formatCalendarDate(enrollment.course.endDate, "dd/MM/yyyy")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </AICanvasCard>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5 overflow-x-auto">
                        <Table className="w-full min-w-[800px]">
                            <TableHeader>
                                <TableRow className="h-12 bg-muted/40 hover:bg-muted/40 border-b border-border/30">
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] pl-5 text-muted-foreground/80">Curso</TableHead>
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-muted-foreground/80 hidden sm:table-cell">Docente</TableHead>
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden md:table-cell text-muted-foreground/80">Inicio</TableHead>
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden md:table-cell text-muted-foreground/80">Finaliza</TableHead>
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden lg:table-cell text-muted-foreground/80">Estado</TableHead>
                                    <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-right pr-5 text-muted-foreground/80">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.map((enrollment) => (
                                    <TableRow
                                        key={enrollment.id}
                                        className="group hover:bg-muted/30 transition-colors border-b border-border/20"
                                    >
                                        <TableCell className="font-medium py-3.5 pl-5">
                                            <div className="flex items-center gap-3.5">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm shadow-primary/5 shrink-0">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300 leading-tight">
                                                        {enrollment.course.title}
                                                    </span>
                                                    <Badge variant="outline" className="text-[9px] w-fit px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full mt-0.5">
                                                        Matriculado
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3.5 hidden sm:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shadow-inner shrink-0">
                                                    {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile).charAt(0)}
                                                </div>
                                                <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
                                                    {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile)}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center py-3.5 hidden md:table-cell">
                                            <code className="text-[11px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-lg font-mono border border-border/30 tracking-tight shadow-inner-sm">
                                                {enrollment.course.startDate ? formatCalendarDate(enrollment.course.startDate, "dd/MM/yy") : "---"}
                                            </code>
                                        </TableCell>

                                        <TableCell className="text-center py-3.5 hidden md:table-cell">
                                            <code className="text-[11px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-lg font-mono border border-border/30 tracking-tight shadow-inner-sm">
                                                {enrollment.course.endDate ? formatCalendarDate(enrollment.course.endDate, "dd/MM/yy") : "Indeterminado"}
                                            </code>
                                        </TableCell>

                                        <TableCell className="text-center py-3.5 hidden lg:table-cell">
                                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 border font-bold gap-1 rounded-lg">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Activo
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right py-3.5 pr-5">
                                            <Button
                                                size="sm"
                                                className="h-8 px-4 font-black text-[10px] uppercase tracking-wider shadow-sm hover:shadow-primary/20 transition-all rounded-xl gap-1.5"
                                                onClick={() => onSelectCourse(enrollment.course.id)}
                                            >
                                                Ingresar <ArrowRight className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            {filteredEnrollments.map((enrollment) => {
                const totalActivities = enrollment.course.activities.length;
                const submittedActivities = enrollment.course.activities.filter((a: any) => a.submissions.length > 0).length;
                const progressPercentage = totalActivities > 0 ? Math.round((submittedActivities / totalActivities) * 100) : 0;

                return (
                    <div key={enrollment.id} className="flex flex-col w-full h-full min-h-0 overflow-hidden">
                        <Tabs value={activeTab || "activities"} onValueChange={onTabChange} className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                            {/* Unified Master Header: AI Canvas Style */}
                            <div className="flex-none bg-background/95 backdrop-blur-xl w-full border-b border-border/50 shadow-sm transition-all duration-300">
                                <TooltipProvider delayDuration={300}>
                                    {/* Row 1: Primary Controls & Identity (h-12 to match AppIdentity sidebar header and dashboard layout) */}
                                    <div className="flex items-center h-12 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                                        {/* Left: Sidebar trigger */}
                                        <div className="flex items-center h-full px-2.5 sm:px-3 border-r border-border/40">
                                            <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-xl transition-colors" />
                                        </div>

                                        {/* Middle: Course details */}
                                        <div className="flex-1 flex items-center gap-2 h-full px-3 sm:px-4 min-w-0">
                                            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                                                {enrollment.course.title}
                                            </h2>
                                            <div className="hidden md:flex items-center gap-1 shrink-0 text-muted-foreground">
                                                <span className="text-[10px] opacity-40">•</span>
                                                <Users className="h-3 w-3 text-primary" />
                                                <span className="text-[11px] font-medium truncate">
                                                    Docente: {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Progress & Utilities */}
                                        <div className="hidden sm:flex items-center gap-1.5 h-full px-3 border-l border-border/40">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Progreso:</span>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[10px] px-2 py-0 rounded-full h-4.5">
                                                {progressPercentage}%
                                            </Badge>
                                        </div>

                                        <div className="flex items-center h-full px-2.5 border-l border-border/40">
                                            <div className="flex items-center gap-0.5 bg-muted/60 dark:bg-muted/30 p-0.5 rounded-xl border border-border/70 shadow-2xs backdrop-blur-md">
                                                <ThemeSelector themes={themes} />
                                                <CodeThemeSelector />
                                                <ModeToggle />
                                                <div className="h-3.5 w-[1px] bg-border/80 mx-0.5" />
                                                <CreditsModal />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Content Navigation (Pestañas Reales) */}
                                    <div className="bg-background border-b border-border/60">
                                        <div className="overflow-x-auto scrollbar-none w-full flex items-center justify-start lg:justify-center px-4">
                                            <TabsList className="!flex h-11 w-max lg:w-full lg:max-w-6xl lg:grid lg:grid-cols-7 !bg-transparent !p-0 !border-0 !rounded-none !shadow-none gap-0 sm:gap-1">
                                                <TabsTrigger 
                                                    value="activities" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <ClipboardCheck className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Actividades</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="evaluations" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <FileText className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Evaluaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="attendance" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <Clock className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Asistencia</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="grades" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <GraduationCap className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Calificaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="remarks" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <MessageSquare className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Observaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="resources" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <BookOpen className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Recursos</span>
                                                </TabsTrigger>

                                                <TabsTrigger 
                                                    value="docs" 
                                                    className="group relative flex items-center justify-center gap-2 h-11 px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                                                >
                                                    <FileText className="h-4 w-4 transition-colors group-data-[state=active]:text-primary" />
                                                    <span className="transition-colors group-data-[state=active]:text-primary">Documentación</span>
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                    </div>
                                </TooltipProvider>
                            </div>

                            {/* Scrollable Content Area - Subdivided by Tabs (Scrollbar starts strictly AFTER the header bar) */}
                            <div className="flex-1 w-full overflow-y-auto min-h-0">
                                <TabsContent value="activities" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Actividades del Curso</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {enrollment.course.activities.length} {enrollment.course.activities.length === 1 ? 'actividad' : 'actividades'}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                                                <Button
                                                    type="button"
                                                    variant={activitiesViewMode === "grid" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setActivitiesViewMode("grid")}
                                                    title="Vista de Tarjetas"
                                                >
                                                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                                                    <span>Tarjetas</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={activitiesViewMode === "table" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setActivitiesViewMode("table")}
                                                    title="Vista de Tabla"
                                                >
                                                    <List className="h-4 w-4 mr-1.5" />
                                                    <span>Tabla</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {enrollment.course.activities.length > 0 ? (
                                            activitiesViewMode === "grid" ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                                    {enrollment.course.activities.map((activity: any, index: number) => {
                                                        const typeInfo = getActivityTypeInfo(activity.type);
                                                        const submission = activity.submissions?.[0];
                                                        const isSubmitted = !!submission;
                                                        const isGraded = submission && submission.grade !== null;
                                                        const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
                                                        const isOpen = !activity.openDate || new Date() >= new Date(activity.openDate);

                                                        return (
                                                            <div
                                                                key={activity.id}
                                                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                                                            >
                                                                {/* Barra superior de acento según tipo */}
                                                                <div className={cn("absolute top-0 inset-x-0 h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity", typeInfo.accentColor)} />

                                                                {/* Header de la tarjeta: Icono + Número + Badges */}
                                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs shrink-0", typeInfo.iconBg)}>
                                                                            <typeInfo.icon className="h-3.5 w-3.5" />
                                                                        </div>
                                                                        <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
                                                                            #{index + 1}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                                                                        {activity.isGroupActivity && activity.groupScope === "ACTIVITY" && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] font-bold px-1.5 py-0 gap-1 border shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                                                            >
                                                                                <Target className="h-2.5 w-2.5 text-amber-500" />
                                                                                <span>Exclusivo</span>
                                                                            </Badge>
                                                                        )}
                                                                        <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0 border shrink-0", typeInfo.badgeColor)}>
                                                                            {typeInfo.label}
                                                                        </Badge>
                                                                    </div>
                                                                </div>

                                                                {/* Contenido Principal: Título & Metadatos */}
                                                                <div className="flex-1 min-w-0 space-y-2 py-0.5">
                                                                    {isOpen ? (
                                                                        <Link
                                                                            href={`/dashboard/student/activities/${activity.id}`}
                                                                            className="block group/link"
                                                                        >
                                                                            <h4 
                                                                                className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover/link:text-primary transition-colors cursor-pointer" 
                                                                                title={activity.title}
                                                                            >
                                                                                {activity.title}
                                                                            </h4>
                                                                        </Link>
                                                                    ) : (
                                                                        <h4 
                                                                            className="font-bold text-sm text-muted-foreground line-clamp-2 leading-snug" 
                                                                            title={activity.title}
                                                                        >
                                                                            {activity.title}
                                                                        </h4>
                                                                    )}

                                                                    {/* Chips compactos: Fecha límite y Estado */}
                                                                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0" title="Fecha límite de entrega">
                                                                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                                                                            <span>
                                                                                {activity.type === "MANUAL" ? "Sin fecha límite" : format(new Date(activity.deadline), "dd MMM, p", { locale: es })}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            {!isOpen ? (
                                                                                <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0">Bloqueado</Badge>
                                                                            ) : isGraded ? (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15 text-[10px] font-semibold px-2 py-0">Completado</Badge>
                                                                            ) : isRejected ? (
                                                                                <Badge variant="destructive" className="gap-1 text-[10px] font-semibold px-2 py-0">
                                                                                    <AlertCircle className="h-2.5 w-2.5" /> Corregir
                                                                                </Badge>
                                                                            ) : isSubmitted ? (
                                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 gap-1 text-[10px] font-semibold px-2 py-0">
                                                                                    <Clock className="h-2.5 w-2.5" /> En Revisión
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 gap-1 text-[10px] font-semibold px-2 py-0">
                                                                                    <AlertCircle className="h-2.5 w-2.5" /> Pendiente
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Barra de Acciones Inferior Compacta */}
                                                                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/50">
                                                                    {/* Calificación / Nota */}
                                                                    <div className="flex items-center gap-1.5 text-xs">
                                                                        <span className="text-muted-foreground text-[11px] font-medium">Nota:</span>
                                                                        {isGraded ? (
                                                                            <span className={cn(
                                                                                "px-1.5 py-0.5 rounded font-bold font-mono text-xs border",
                                                                                submission.grade >= 3.0 
                                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" 
                                                                                    : "bg-destructive/10 text-destructive border-destructive/25"
                                                                            )}>
                                                                                {submission.grade.toFixed(1)}
                                                                            </span>
                                                                        ) : !isSubmitted && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL' ? (
                                                                            <span className="font-bold font-mono text-xs text-destructive">0.0</span>
                                                                        ) : (
                                                                            <span className="font-mono text-xs text-muted-foreground">-</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Botón de Acción */}
                                                                    {isOpen ? (
                                                                        <Link href={`/dashboard/student/activities/${activity.id}`}>
                                                                            <Button 
                                                                                variant={isSubmitted ? "secondary" : "default"} 
                                                                                size="sm" 
                                                                                className="h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                                                                            >
                                                                                <span>{isSubmitted ? "Revisar" : "Abrir"}</span>
                                                                                <ArrowRight className="h-3 w-3" />
                                                                            </Button>
                                                                        </Link>
                                                                    ) : (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="sm" 
                                                                            disabled 
                                                                            className="h-7 px-2.5 text-xs text-muted-foreground rounded-lg"
                                                                        >
                                                                            Bloqueado
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-2xs">
                                                    <Table className="min-w-[750px]">
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                <TableHead className="w-[50px] pl-4 font-bold uppercase tracking-wider text-xs">#</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs">Actividad</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Tipo</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Fecha Límite</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden sm:table-cell">Nota</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acciones</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {enrollment.course.activities.map((activity: any, index: number) => {
                                                                const typeInfo = getActivityTypeInfo(activity.type);
                                                                const submission = activity.submissions?.[0];
                                                                const isSubmitted = !!submission;
                                                                const isGraded = submission && submission.grade !== null;
                                                                const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
                                                                const isOpen = !activity.openDate || new Date() >= new Date(activity.openDate);

                                                                return (
                                                                    <TableRow key={activity.id} suppressHydrationWarning className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                        <TableCell className="pl-4 font-mono text-xs text-muted-foreground font-bold">
                                                                            #{index + 1}
                                                                        </TableCell>
                                                                        <TableCell className="font-medium py-3">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", typeInfo.iconBg)}>
                                                                                    <typeInfo.icon className="h-3 w-3" />
                                                                                </div>
                                                                                <div className="space-y-0.5">
                                                                                    <div className="font-semibold text-sm text-foreground">{activity.title}</div>
                                                                                    {!isOpen && (
                                                                                        <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium flex items-center">
                                                                                            <Clock className="mr-1 h-3 w-3" />
                                                                                            Disponible el: {format(new Date(activity.openDate), "PP p", { locale: es })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0 border", typeInfo.badgeColor)}>
                                                                                {typeInfo.label}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center hidden md:table-cell" suppressHydrationWarning>
                                                                            <div className="text-xs text-muted-foreground font-medium">
                                                                                {activity.type === "MANUAL" ? (
                                                                                    <span className="italic">Sin fecha límite</span>
                                                                                ) : (
                                                                                    <span className={new Date(activity.deadline) < new Date() ? "text-destructive" : ""}>
                                                                                        {format(new Date(activity.deadline), "dd MMM, p", { locale: es })}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center" suppressHydrationWarning>
                                                                            {!isOpen ? (
                                                                                <Badge variant="secondary" className="text-[10px]">Bloqueado</Badge>
                                                                            ) : isGraded ? (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15 text-[10px]">Completado</Badge>
                                                                            ) : isRejected ? (
                                                                                <Badge variant="destructive" className="gap-1 text-[10px]">
                                                                                    <AlertCircle className="h-3 w-3" /> Corregir
                                                                                </Badge>
                                                                            ) : isSubmitted ? (
                                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 gap-1 text-[10px]">
                                                                                    <Clock className="h-3 w-3" /> En Revisión
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 gap-1 text-[10px]">
                                                                                    <AlertCircle className="h-3 w-3" /> Pendiente
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center hidden sm:table-cell" suppressHydrationWarning>
                                                                            {isGraded ? (
                                                                                <span className={cn(
                                                                                    "px-1.5 py-0.5 rounded font-bold font-mono text-xs border",
                                                                                    submission.grade >= 3.0 
                                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" 
                                                                                        : "bg-destructive/10 text-destructive border-destructive/25"
                                                                                )}>
                                                                                    {submission.grade.toFixed(1)}
                                                                                </span>
                                                                            ) : !isSubmitted && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL' ? (
                                                                                <span className="font-bold font-mono text-xs text-destructive">0.0</span>
                                                                            ) : (
                                                                                <span className="font-mono text-xs text-muted-foreground">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {isOpen ? (
                                                                                <Link href={`/dashboard/student/activities/${activity.id}`}>
                                                                                    <Button 
                                                                                        variant={isSubmitted ? "secondary" : "default"} 
                                                                                        size="sm" 
                                                                                        className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 cursor-pointer"
                                                                                    >
                                                                                        <span>{isSubmitted ? "Revisar" : "Abrir"}</span>
                                                                                        <ArrowRight className="h-3 w-3" />
                                                                                    </Button>
                                                                                </Link>
                                                                            ) : (
                                                                                <span className="text-muted-foreground text-xs">Bloqueado</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )
                                        ) : (
                                            <TabEmptyState
                                                icon={ClipboardCheck}
                                                title="No hay actividades asignadas"
                                                description="Tu profesor aún no ha publicado actividades de aprendizaje para este curso."
                                            />
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="evaluations" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Evaluaciones del Curso</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {enrollment.course.evaluationAttempts?.length || 0} {(enrollment.course.evaluationAttempts?.length || 0) === 1 ? 'evaluación' : 'evaluaciones'}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                                                <Button
                                                    type="button"
                                                    variant={evaluationsViewMode === "grid" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setEvaluationsViewMode("grid")}
                                                    title="Vista de Tarjetas"
                                                >
                                                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                                                    <span>Tarjetas</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={evaluationsViewMode === "table" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setEvaluationsViewMode("table")}
                                                    title="Vista de Tabla"
                                                >
                                                    <List className="h-4 w-4 mr-1.5" />
                                                    <span>Tabla</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {enrollment.course.evaluationAttempts?.length > 0 ? (
                                            evaluationsViewMode === "grid" ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-20">
                                                    {enrollment.course.evaluationAttempts.map((attempt: any, index: number) => {
                                                        const submission = attempt.submissions?.[0];
                                                        const isSubmitted = !!submission?.submittedAt;
                                                        const now = new Date();
                                                        const startTime = new Date(attempt.startTime);
                                                        const endTime = new Date(attempt.endTime);
                                                        const isOpen = now >= startTime && now <= endTime;
                                                        const isUpcoming = now < startTime;
                                                        const isExpired = now > endTime && !isSubmitted;

                                                        return (
                                                            <div
                                                                key={attempt.id}
                                                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                                                            >
                                                                {/* Barra superior de acento */}
                                                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                                                                {/* Header de la tarjeta */}
                                                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 bg-primary/10 text-primary">
                                                                            <FileText className="h-3.5 w-3.5" />
                                                                        </div>
                                                                        <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
                                                                            #{index + 1}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                                                                        {isSubmitted ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0">Completado</Badge>
                                                                        ) : isExpired ? (
                                                                            <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-0">Expirado</Badge>
                                                                        ) : isUpcoming ? (
                                                                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold px-2 py-0">Próximamente</Badge>
                                                                        ) : isOpen ? (
                                                                            <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse text-[10px] font-semibold px-2 py-0">Abierto</Badge>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                {/* Contenido */}
                                                                <div className="flex-1 min-w-0 space-y-2 py-0.5">
                                                                    {isOpen || isSubmitted ? (
                                                                        <Link href={`/evaluations/${attempt.id}`} className="block group/link">
                                                                            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover/link:text-primary transition-colors cursor-pointer" title={attempt.evaluation.title}>
                                                                                {attempt.evaluation.title}
                                                                            </h4>
                                                                        </Link>
                                                                    ) : (
                                                                        <h4 className="font-bold text-sm text-muted-foreground line-clamp-2 leading-snug" title={attempt.evaluation.title}>
                                                                            {attempt.evaluation.title}
                                                                        </h4>
                                                                    )}

                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                                                                        <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                                                        <span>Inicio: {format(startTime, "dd MMM, p", { locale: es })}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Footer */}
                                                                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/50">
                                                                    <div className="flex items-center gap-1.5 text-xs">
                                                                        <span className="text-muted-foreground text-[11px] font-medium">Nota:</span>
                                                                        {isSubmitted && submission?.score !== null ? (
                                                                            <span className={cn(
                                                                                "px-1.5 py-0.5 rounded font-bold font-mono text-xs border",
                                                                                submission.score >= 3.0 
                                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" 
                                                                                    : "bg-destructive/10 text-destructive border-destructive/25"
                                                                            )}>
                                                                                {submission.score.toFixed(1)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="font-mono text-xs text-muted-foreground">-</span>
                                                                        )}
                                                                    </div>

                                                                    <Button 
                                                                        size="sm" 
                                                                        className="h-7 px-3 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                                                                        variant={isSubmitted ? "secondary" : isOpen ? "default" : "ghost"}
                                                                        disabled={!isOpen && !isSubmitted}
                                                                        asChild={isOpen || isSubmitted}
                                                                    >
                                                                        {isOpen || isSubmitted ? (
                                                                            <Link href={`/evaluations/${attempt.id}`}>
                                                                                <span>{isSubmitted ? "Resultados" : "Iniciar"}</span>
                                                                                <ArrowRight className="h-3 w-3" />
                                                                            </Link>
                                                                        ) : (
                                                                            <span>Bloqueado</span>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-2xs text-foreground mb-20">
                                                    <Table className="min-w-[700px]">
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                <TableHead className="w-[50px] pl-4 font-bold uppercase tracking-wider text-xs">#</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs">Evaluación</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden sm:table-cell">Nota</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Fecha Inicio</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acción</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {enrollment.course.evaluationAttempts.map((attempt: any, index: number) => {
                                                                const submission = attempt.submissions?.[0];
                                                                const isSubmitted = !!submission?.submittedAt;
                                                                const now = new Date();
                                                                const startTime = new Date(attempt.startTime);
                                                                const endTime = new Date(attempt.endTime);
                                                                const isOpen = now >= startTime && now <= endTime;
                                                                const isUpcoming = now < startTime;
                                                                const isExpired = now > endTime && !isSubmitted;

                                                                return (
                                                                    <TableRow key={attempt.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                        <TableCell className="pl-4 font-mono text-xs text-muted-foreground font-bold">
                                                                            #{index + 1}
                                                                        </TableCell>
                                                                        <TableCell className="font-semibold text-sm py-3">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                                                                                    <FileText className="h-3 w-3" />
                                                                                </div>
                                                                                <span>{attempt.evaluation.title}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {isSubmitted ? (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">Completado</Badge>
                                                                            ) : isExpired ? (
                                                                                <Badge variant="destructive" className="text-[10px]">Expirado</Badge>
                                                                            ) : isUpcoming ? (
                                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">Próximamente</Badge>
                                                                            ) : isOpen ? (
                                                                                <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse text-[10px]">Abierto</Badge>
                                                                            ) : null}
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-bold text-primary hidden sm:table-cell">
                                                                            {isSubmitted && submission?.score !== null ? (
                                                                                <span className={cn(
                                                                                    "px-1.5 py-0.5 rounded font-bold font-mono text-xs border",
                                                                                    submission.score >= 3.0 
                                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" 
                                                                                        : "bg-destructive/10 text-destructive border-destructive/25"
                                                                                )}>
                                                                                    {submission.score.toFixed(1)}
                                                                                </span>
                                                                            ) : "-"}
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs text-muted-foreground hidden md:table-cell">
                                                                            {format(startTime, "PP p", { locale: es })}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Button 
                                                                                size="sm" 
                                                                                className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 cursor-pointer"
                                                                                variant={isSubmitted ? "secondary" : isOpen ? "default" : "ghost"}
                                                                                disabled={!isOpen && !isSubmitted}
                                                                                asChild={isOpen || isSubmitted}
                                                                            >
                                                                                {isOpen || isSubmitted ? (
                                                                                    <Link href={`/evaluations/${attempt.id}`}>
                                                                                        <span>{isSubmitted ? "Resultados" : "Iniciar"}</span>
                                                                                        <ArrowRight className="h-3 w-3" />
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-xs">Bloqueado</span>
                                                                                )}
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )
                                        ) : (
                                            <TabEmptyState
                                                icon={FileText}
                                                title="No hay evaluaciones programadas"
                                                description="No tienes exámenes o cuestionarios pendientes por realizar en este curso."
                                            />
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="attendance" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Control de Asistencia</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    Historial de Clases
                                                </Badge>
                                            </div>
                                        </div>
                                        <StudentAttendanceSummary courseId={enrollment.course.id} userId={enrollment.userId} hideHeader={true} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="grades" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Calificaciones y Notas</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {enrollment.course.gradeCategories?.length 
                                                        ? `${enrollment.course.gradeCategories.length} ${enrollment.course.gradeCategories.length === 1 ? 'categoría' : 'categorías'}` 
                                                        : "Sin ponderación"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <StudentGradesView enrollment={enrollment} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="remarks" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Observaciones y Anotaciones</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    Seguimiento Docente
                                                </Badge>
                                            </div>
                                        </div>
                                        <StudentRemarks courseId={enrollment.course.id} userId={enrollment.userId} hideHeader={true} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="resources" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Recursos y Material Compartido</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {enrollment.course.sharedContent?.length || 0} {(enrollment.course.sharedContent?.length || 0) === 1 ? 'recurso' : 'recursos'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <SharedContentList contents={enrollment.course.sharedContent || []} hideHeader={true} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="docs" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-semibold">Documentación del Curso</h3>
                                                <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {enrollment.course.docLinks?.length || 0} {(enrollment.course.docLinks?.length || 0) === 1 ? 'manual' : 'manuales'}
                                                </Badge>
                                            </div>

                                            {enrollment.course.docLinks && enrollment.course.docLinks.length > 0 && (
                                                <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                                                    <Button
                                                        type="button"
                                                        variant={docsViewMode === "grid" ? "default" : "ghost"}
                                                        size="sm"
                                                        className="h-8 px-3 rounded-lg text-xs"
                                                        onClick={() => setDocsViewMode("grid")}
                                                        title="Vista de Tarjetas"
                                                    >
                                                        <LayoutGrid className="h-4 w-4 mr-1.5" />
                                                        <span>Tarjetas</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={docsViewMode === "table" ? "default" : "ghost"}
                                                        size="sm"
                                                        className="h-8 px-3 rounded-lg text-xs"
                                                        onClick={() => setDocsViewMode("table")}
                                                        title="Vista de Tabla"
                                                    >
                                                        <List className="h-4 w-4 mr-1.5" />
                                                        <span>Tabla</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        {enrollment.course.docLinks && enrollment.course.docLinks.length > 0 ? (
                                            <UserDocsList
                                                docs={enrollment.course.docLinks.map((link: any) => ({
                                                    id: link.docProject?.slug || link.docProject?.id,
                                                    title: link.docProject?.name || "Documento",
                                                    icon: link.docProject?.icon,
                                                    groupName: "Documentación del Curso",
                                                    imageUrl: link.docProject?.imageUrl,
                                                }))}
                                                viewMode={docsViewMode}
                                                hideHeader={true}
                                            />
                                        ) : (
                                            <TabEmptyState
                                                icon={BookOpen}
                                                title="Sin documentación asignada"
                                                description="El profesor aún no ha vinculado documentación interactiva o guías a este curso."
                                            />
                                        )}
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                );
            })}
        </div>
    );
}
