"use client";

import { useState } from "react";
import { MessageSquare, Users, ClipboardCheck, Clock, BookOpen, GraduationCap, FileText, AlertCircle, ArrowLeft, Calendar, ArrowRight, LayoutGrid, List } from "lucide-react";
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
import { formatName } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { CreditsModal } from "@/components/CreditsModal";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserDocsList } from "@/features/documentation/components/student/UserDocsList";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";

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
                            title="Vista de Tarjetas AI Canvas"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1.5" />
                            <span>Tarjetas AI Canvas</span>
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
                        <Tabs key={activeTab} defaultValue={activeTab} onValueChange={onTabChange} className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                            {/* Unified Master Header: AI Canvas Style */}
                            <div className="flex-none bg-background/95 dark:bg-slate-950/95 backdrop-blur-xl w-full border-b border-border/50 shadow-sm transition-all duration-300">
                                <TooltipProvider delayDuration={300}>
                                    {/* Row 1: Primary Controls & Identity (h-16 to match AppIdentity sidebar header) */}
                                    <div className="flex items-center h-16 border-b border-border/40 bg-background/80 dark:bg-slate-950/80 backdrop-blur-xl">
                                        {/* Left: Sidebar trigger */}
                                        <div className="flex items-center h-full px-3 border-r border-border/40">
                                            <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-xl transition-colors" />
                                        </div>

                                        {/* Middle: Course details */}
                                        <div className="flex-1 flex flex-col justify-center h-full px-4 min-w-0">
                                            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                                                {enrollment.course.title}
                                            </h2>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Users className="h-3 w-3 text-primary" />
                                                <span className="text-xs font-medium text-muted-foreground truncate">
                                                    Docente: {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Progress & Utilities */}
                                        <div className="hidden sm:flex flex-col items-end justify-center h-full px-4 border-l border-border/40">
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Tu Progreso</span>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                                    {progressPercentage}%
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center h-full px-3 gap-1.5 border-l border-border/40">
                                            <ThemeSelector themes={themes} />
                                            <ModeToggle />
                                            <CreditsModal />
                                        </div>
                                    </div>

                                    {/* Row 2: Content Navigation */}
                                    <div className="border-b border-border/40 bg-muted/30">
                                        <div className="overflow-x-auto scrollbar-none w-full flex items-center justify-start lg:justify-center px-3 py-1.5">
                                            <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-7 h-10 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl gap-1 border border-border/40 shadow-none min-w-full">
                                                <TabsTrigger value="activities" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <ClipboardCheck className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Actividades</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="evaluations" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <FileText className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Evaluaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="attendance" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <Clock className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Asistencia</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="grades" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <GraduationCap className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Calificaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="remarks" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <MessageSquare className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Observaciones</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="resources" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <BookOpen className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Recursos</span>
                                                </TabsTrigger>

                                                <TabsTrigger value="docs" className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm whitespace-nowrap shrink-0">
                                                    <FileText className="h-4 w-4 group-data-[state=active]:text-primary shrink-0 transition-colors" />
                                                    <span>Documentación</span>
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
                                            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                                <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                                                <span>Actividades Pendientes y Entregas</span>
                                            </h3>

                                            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                                                <Button
                                                    type="button"
                                                    variant={activitiesViewMode === "grid" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setActivitiesViewMode("grid")}
                                                    title="Vista de Tarjetas AI Canvas"
                                                >
                                                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                                                    <span>Tarjetas AI Canvas</span>
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {enrollment.course.activities.map((activity: any, index: number) => {
                                                        const submission = activity.submissions[0];
                                                        const isSubmitted = !!submission;
                                                        const isGraded = submission && submission.grade !== null;
                                                        const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
                                                        const isOpen = !activity.openDate || new Date() >= new Date(activity.openDate);

                                                        const rawDesc = activity.description 
                                                            ? activity.description.replace(/[\*#_\n\r]/g, ' ').replace(/instrucciones de la actividad/gi, '').replace(/\s+/g, ' ').trim()
                                                            : "";
                                                        const cleanContent = rawDesc.replace(/[\s\.\-_]/g, '');
                                                        const displayDesc = cleanContent.length > 0 
                                                            ? (rawDesc.length > 90 ? rawDesc.substring(0, 90) + "..." : rawDesc)
                                                            : undefined;

                                                        return (
                                                            <AICanvasCard
                                                                key={activity.id}
                                                                title={activity.title}
                                                                description={displayDesc}
                                                                icon={ClipboardCheck}
                                                                badge={`Peso: ${activity.weight.toFixed(1)}%`}
                                                                badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                accentColor="from-blue-500/30 via-indigo-500/20 to-transparent"
                                                                iconBgColor="bg-blue-500/10 dark:bg-blue-500/20"
                                                                iconTextColor="text-blue-600 dark:text-blue-400"
                                                                hideFooter={true}
                                                                className="h-full group"
                                                            >
                                                                <div className="space-y-3 pt-2 text-xs text-muted-foreground border-t border-border/40 mt-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-semibold text-foreground">Estado:</span>
                                                                        {!isOpen ? (
                                                                            <Badge variant="secondary">Bloqueado</Badge>
                                                                        ) : isGraded ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">Completado</Badge>
                                                                        ) : isRejected ? (
                                                                            <Badge variant="destructive" className="gap-1">
                                                                                <AlertCircle className="h-3 w-3" /> Corregir
                                                                            </Badge>
                                                                        ) : isSubmitted ? (
                                                                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 gap-1">
                                                                                <Clock className="h-3 w-3" /> En Revisión
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 gap-1">
                                                                                <AlertCircle className="h-3 w-3" /> Pendiente
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span>Calificación:</span>
                                                                        <span className="font-bold text-foreground">
                                                                            {isGraded ? submission.grade.toFixed(1) : !isSubmitted && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL' ? '0.0' : '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span>Vencimiento:</span>
                                                                        <span className="font-medium text-foreground">
                                                                            {activity.type === "MANUAL" ? "Sin fecha límite" : format(new Date(activity.deadline), "PP", { locale: es })}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="pt-4 mt-auto border-t border-border/40">
                                                                    <Button
                                                                        variant={!isOpen ? "ghost" : isSubmitted ? "secondary" : "default"}
                                                                        size="sm"
                                                                        disabled={!isOpen}
                                                                        className="w-full font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
                                                                        asChild={isOpen}
                                                                    >
                                                                        {isOpen ? (
                                                                            <Link href={`/dashboard/student/activities/${activity.id}`}>
                                                                                {isSubmitted ? "Revisar" : "Abrir"}
                                                                                <ArrowRight className="ml-2 h-4 w-4" />
                                                                            </Link>
                                                                        ) : (
                                                                            <span>Bloqueado</span>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </AICanvasCard>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-sm text-foreground">
                                                    <Table className="min-w-[700px]">
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs pl-4 w-[300px]">Actividad</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden sm:table-cell">Nota</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Vencimiento</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acciones</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {enrollment.course.activities.map((activity: any, index: number) => {
                                                                const submission = activity.submissions[0];
                                                                const isSubmitted = !!submission;
                                                                const isGraded = submission && submission.grade !== null;
                                                                const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
                                                                const isOpen = !activity.openDate || new Date() >= new Date(activity.openDate);

                                                                return (
                                                                    <TableRow key={activity.id} suppressHydrationWarning className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                        <TableCell className="font-medium py-4">
                                                                            <div className="flex items-start gap-3">
                                                                                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                                                                    {index + 1}
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <div className="font-semibold text-sm text-foreground">{activity.title}</div>
                                                                                    <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-2">
                                                                                        <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] font-normal">
                                                                                            Peso: {activity.weight.toFixed(1)}%
                                                                                        </Badge>
                                                                                        {activity.type === "MANUAL" && <span>• Manual</span>}
                                                                                    </div>
                                                                                    {!isOpen && (
                                                                                        <div className="text-[10px] text-warning font-medium mt-1 flex items-center text-yellow-600 dark:text-yellow-400">
                                                                                            <Clock className="mr-1 h-3 w-3" />
                                                                                            Disponible el: {format(new Date(activity.openDate), "PP p")}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell suppressHydrationWarning>
                                                                            {!isOpen ? (
                                                                                <Badge variant="secondary">Bloqueado</Badge>
                                                                            ) : isGraded ? (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">Completado</Badge>
                                                                            ) : isRejected ? (
                                                                                <Badge variant="destructive" className="gap-1">
                                                                                    <AlertCircle className="h-3 w-3" /> Corregir
                                                                                </Badge>
                                                                            ) : isSubmitted ? (
                                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 gap-1">
                                                                                    <Clock className="h-3 w-3" /> En Revisión
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 gap-1">
                                                                                    <AlertCircle className="h-3 w-3" /> Pendiente
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="hidden sm:table-cell" suppressHydrationWarning>
                                                                            {isGraded ? (
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-bold text-lg text-primary">
                                                                                        {submission.grade.toFixed(1)}
                                                                                    </span>
                                                                                </div>
                                                                            ) : !isSubmitted && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL' ? (
                                                                                <span className="font-bold text-destructive">0.0</span>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="hidden md:table-cell" suppressHydrationWarning>
                                                                            <div className="text-xs text-muted-foreground font-medium" suppressHydrationWarning>
                                                                                {activity.type === "MANUAL" ? (
                                                                                    <span className="italic">Sin fecha límite</span>
                                                                                ) : (
                                                                                    <span className={new Date(activity.deadline) < new Date() ? "text-destructive" : ""}>
                                                                                        {format(new Date(activity.deadline), "PP", { locale: es })}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Button 
                                                                                variant={!isOpen ? "ghost" : isSubmitted ? "secondary" : "default"} 
                                                                                size="sm" 
                                                                                asChild 
                                                                                disabled={!isOpen}
                                                                                className="shadow-sm"
                                                                            >
                                                                                {isOpen ? (
                                                                                    <Link href={`/dashboard/student/activities/${activity.id}`}>
                                                                                        {isSubmitted ? "Revisar" : "Abrir"}
                                                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground cursor-not-allowed flex items-center justify-end text-xs">
                                                                                        Bloqueado
                                                                                    </span>
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
                                            <p className="text-sm text-muted-foreground">No hay actividades en este curso.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="evaluations" className="p-3 sm:p-5 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="space-y-4 pt-4 sm:pt-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                                            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                                <span>Evaluaciones del Curso</span>
                                            </h3>

                                            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                                                <Button
                                                    type="button"
                                                    variant={evaluationsViewMode === "grid" ? "default" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg text-xs"
                                                    onClick={() => setEvaluationsViewMode("grid")}
                                                    title="Vista de Tarjetas AI Canvas"
                                                >
                                                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                                                    <span>Tarjetas AI Canvas</span>
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                                    {enrollment.course.evaluationAttempts.map((attempt: any) => {
                                                        const submission = attempt.submissions[0];
                                                        const isSubmitted = !!submission?.submittedAt;
                                                        const now = new Date();
                                                        const startTime = new Date(attempt.startTime);
                                                        const endTime = new Date(attempt.endTime);
                                                        const isOpen = now >= startTime && now <= endTime;
                                                        const isUpcoming = now < startTime;
                                                        const isExpired = now > endTime && !isSubmitted;

                                                        const rawDesc = attempt.evaluation.description 
                                                            ? attempt.evaluation.description.replace(/[\*#_\n\r]/g, ' ').replace(/descripción de la evaluación/gi, '').replace(/instrucciones/gi, '').replace(/\s+/g, ' ').trim()
                                                            : "";
                                                        const cleanContent = rawDesc.replace(/[\s\.\-_]/g, '');
                                                        const displayDesc = cleanContent.length > 0 
                                                            ? (rawDesc.length > 90 ? rawDesc.substring(0, 90) + "..." : rawDesc)
                                                            : undefined;

                                                        return (
                                                            <AICanvasCard
                                                                key={attempt.id}
                                                                title={attempt.evaluation.title}
                                                                description={displayDesc}
                                                                icon={FileText}
                                                                badge={isSubmitted ? "Completado" : isExpired ? "Expirado" : isUpcoming ? "Próximamente" : isOpen ? "Abierto" : "Evaluación"}
                                                                badgeColor={isSubmitted ? "bg-primary/10 text-primary border-primary/20" : isExpired ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"}
                                                                accentColor="from-primary/30 via-primary/15 to-transparent"
                                                                iconBgColor="bg-primary/10"
                                                                iconTextColor="text-primary"
                                                                hideFooter={true}
                                                                className="h-full group"
                                                            >
                                                                <div className="space-y-3 pt-2 text-xs text-muted-foreground border-t border-border/40 mt-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-semibold text-foreground">Estado:</span>
                                                                        {isSubmitted ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Completado</Badge>
                                                                        ) : isExpired ? (
                                                                            <Badge variant="destructive">Expirado</Badge>
                                                                        ) : isUpcoming ? (
                                                                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Próximamente</Badge>
                                                                        ) : isOpen ? (
                                                                            <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse">Abierto</Badge>
                                                                        ) : null}
                                                                    </div>
                                                                    {isSubmitted && submission.score !== null && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-semibold text-foreground">Nota Final:</span>
                                                                            <span className="font-bold text-primary text-base">{submission.score.toFixed(1)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between">
                                                                        <span>Fecha Inicio:</span>
                                                                        <span className="font-medium text-foreground">{format(startTime, "PP p", { locale: es })}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="pt-4 mt-auto border-t border-border/40">
                                                                    <Button 
                                                                        className="w-full font-bold text-xs uppercase tracking-wider rounded-xl shadow-md" 
                                                                        variant={isSubmitted ? "outline" : isOpen ? "default" : "secondary"}
                                                                        disabled={!isOpen && !isSubmitted}
                                                                        asChild
                                                                    >
                                                                        <Link href={`/evaluations/${attempt.id}`}>
                                                                            {isSubmitted ? "Ver Resultados" : isOpen ? "Realizar Evaluación" : "No disponible"}
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            </AICanvasCard>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-sm text-foreground mb-20">
                                                    <Table className="min-w-[700px]">
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Evaluación</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden sm:table-cell">Nota</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Fecha Inicio</TableHead>
                                                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acción</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {enrollment.course.evaluationAttempts.map((attempt: any) => {
                                                                const submission = attempt.submissions[0];
                                                                const isSubmitted = !!submission?.submittedAt;
                                                                const now = new Date();
                                                                const startTime = new Date(attempt.startTime);
                                                                const endTime = new Date(attempt.endTime);
                                                                const isOpen = now >= startTime && now <= endTime;
                                                                const isUpcoming = now < startTime;
                                                                const isExpired = now > endTime && !isSubmitted;

                                                                return (
                                                                    <TableRow key={attempt.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                        <TableCell className="font-semibold text-sm py-4 pl-4">
                                                                            {attempt.evaluation.title}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {isSubmitted ? (
                                                                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Completado</Badge>
                                                                            ) : isExpired ? (
                                                                                <Badge variant="destructive">Expirado</Badge>
                                                                            ) : isUpcoming ? (
                                                                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Próximamente</Badge>
                                                                            ) : isOpen ? (
                                                                                <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse">Abierto</Badge>
                                                                            ) : null}
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-bold text-primary hidden sm:table-cell">
                                                                            {isSubmitted && submission.score !== null ? submission.score.toFixed(1) : "-"}
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs text-muted-foreground hidden md:table-cell">
                                                                            {format(startTime, "PP p", { locale: es })}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Button 
                                                                                size="sm" 
                                                                                className="font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm"
                                                                                variant={isSubmitted ? "outline" : isOpen ? "default" : "secondary"}
                                                                                disabled={!isOpen && !isSubmitted}
                                                                                asChild
                                                                            >
                                                                                <Link href={`/evaluations/${attempt.id}`}>
                                                                                    {isSubmitted ? "Ver Resultados" : isOpen ? "Realizar Evaluación" : "No disponible"}
                                                                                </Link>
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
                                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
                                                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                                <p className="text-muted-foreground font-medium">No hay evaluaciones programadas para este curso.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="attendance" className="p-4 sm:p-6 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="pt-6">
                                        <StudentAttendanceSummary courseId={enrollment.course.id} userId={enrollment.userId} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="resources" className="p-4 sm:p-6 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="pt-6">
                                        <SharedContentList contents={enrollment.course.sharedContent || []} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="remarks" className="p-4 sm:p-6 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="pt-6">
                                        <StudentRemarks courseId={enrollment.course.id} userId={enrollment.userId} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="grades" className="p-4 sm:p-6 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="pt-6">
                                        <StudentGradesView enrollment={enrollment} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="docs" className="p-4 sm:p-6 md:p-8 pt-0 mt-0 pb-12">
                                    <div className="pt-6">
                                        {enrollment.course.docLinks && enrollment.course.docLinks.length > 0 ? (
                                            <UserDocsList
                                                docs={enrollment.course.docLinks.map((link: any) => ({
                                                    id: link.docProject?.slug || link.docProject?.id,
                                                    title: link.docProject?.name || "Documento",
                                                    icon: link.docProject?.icon,
                                                    groupName: "Documentación del Curso",
                                                    imageUrl: link.docProject?.imageUrl,
                                                }))}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl text-center">
                                                <div className="p-4 bg-muted/20 rounded-full mb-4">
                                                    <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-muted-foreground">Sin documentación asignada</h3>
                                                <p className="text-sm text-muted-foreground/60 mt-1">El profesor aún no ha vinculado documentación a este curso.</p>
                                            </div>
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
