"use client";

import { MessageSquare, Users, ClipboardCheck, Clock, BookOpen, GraduationCap, FileText, ExternalLink, ArrowRight, AlertCircle, ArrowLeft, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RefreshButton } from "@/components/navigation/RefreshButton";
import { recordProjectVisitAction } from "../../documentation/actions/progressActions";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12 w-full max-w-7xl mx-auto">
                {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="relative group flex flex-col">
                        <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="h-full flex flex-col relative bg-background/60 backdrop-blur-xl border-border/50 rounded-[1.8rem] overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl text-center">
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                            
                            <CardHeader className="pb-1 pt-5 px-5">
                                <div className="flex flex-col items-center gap-2">
                                    <Badge variant="outline" className="text-[8px] px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full">
                                        Matriculado
                                    </Badge>
                                    <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors w-full uppercase tracking-tight line-clamp-3 min-h-[3rem] flex items-center justify-center">
                                        {enrollment.course.title}
                                    </CardTitle>
                                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mt-1">
                                        <Users className="h-2.5 w-2.5" />
                                        {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile)}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 px-5 py-4 space-y-4 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Inicio</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-foreground/80">
                                            <Calendar className="h-2.5 w-2.5 text-primary" />
                                            {enrollment.course.startDate ? formatCalendarDate(enrollment.course.startDate, "dd/MM/yy") : "---"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Estado</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Activo
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 justify-center">
                                    <Clock className="h-2.5 w-2.5" />
                                    Finaliza: {enrollment.course.endDate ? formatCalendarDate(enrollment.course.endDate, "dd MMM yyyy") : "INDETERMINADO"}
                                </div>
                            </CardContent>

                            <CardFooter className="px-5 pb-5 pt-0">
                                <Button 
                                    className="w-full font-black text-[10px] uppercase tracking-widest shadow-md hover:shadow-primary/20 transition-all active:scale-[0.98] h-10 rounded-xl border border-primary/20"
                                    onClick={() => onSelectCourse(enrollment.course.id)}
                                >
                                    Ingresar al Aula <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                ))}
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
                    <div key={enrollment.id} className="flex flex-col h-screen overflow-hidden">
                        <Tabs key={activeTab} defaultValue={activeTab} onValueChange={onTabChange} className="w-full h-full flex flex-col">
                            {/* Unified Master Header: Matching Teacher Style */}
                            <div className="flex-none bg-background/95 backdrop-blur-md w-full z-30 border-b border-border/50 shadow-sm transition-all duration-300">
                                <style jsx global>{`
                                    .nav-indicator-active-student {
                                        position: relative;
                                    }
                                    
                                    .nav-indicator-active-student::after {
                                        content: '';
                                        position: absolute;
                                        bottom: -1px;
                                        left: 0;
                                        right: 0;
                                        height: 2px;
                                        background: hsl(var(--primary));
                                        border-radius: 2px 2px 0 0;
                                        box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
                                    }
                                `}</style>

                                <TooltipProvider delayDuration={300}>
                                    {/* Row 1: Primary Controls & Identity (h-12) */}
                                    <div className="flex items-center px-4 h-12 border-b-2 border-foreground/10">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-lg transition-colors" />
                                                <div className="h-6 w-[2px] bg-foreground/15" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => onSelectCourse(null)}
                                                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                                                        >
                                                            <ArrowLeft className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Salir del aula</TooltipContent>
                                                </Tooltip>
                                            </div>
                                            
                                            <div className="h-6 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />

                                            <div className="flex flex-col min-w-0">
                                                <h2 className="text-[13px] font-black tracking-tight leading-none uppercase truncate opacity-90 transition-opacity">
                                                    {enrollment.course.title}
                                                </h2>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Users className="h-2.5 w-2.5 text-primary/60" />
                                                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest truncate">Docente: {formatName(enrollment.course.teacher.name, enrollment.course.teacher.profile)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right utilities */}
                                        <div className="flex items-center gap-2 ml-auto">
                                            <div className="hidden md:flex flex-col items-end mr-2 pr-2 border-r border-border/40">
                                                <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-black leading-none mb-0.5">Tu Progreso</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] font-black bg-primary/10 text-primary border-none rounded-sm">
                                                        {progressPercentage}%
                                                    </Badge>
                                                </div>
                                            </div>

                                            {enrollment.course.externalUrl && (
                                                <div className="hidden lg:flex items-center bg-muted/60 hover:bg-muted/80 transition-colors rounded-full px-1 py-1 h-8 gap-1 border border-foreground/10">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                                className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                                                            >
                                                                <Link href={enrollment.course.externalUrl} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Documentación externa</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}

                                            {enrollment.course.docProjectId && (
                                                <div className="flex items-center bg-primary/10 hover:bg-primary/20 transition-colors rounded-full px-1 py-1 h-8 gap-1 border border-primary/20">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                                className="h-6 w-6 rounded-full hover:bg-primary/20 hover:text-primary transition-all"
                                                            >
                                                                <Link 
                                                                  href={`/docs/${enrollment.course.docProject?.slug || enrollment.course.docProjectId}`} 
                                                                  target="_blank" 
                                                                  rel="noopener noreferrer"
                                                                  onClick={() => recordProjectVisitAction(enrollment.course.docProjectId)}
                                                                >
                                                                    <BookOpen className="h-3 w-3 text-primary" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Ver Documentación del Curso</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}

                                            <div className="h-6 w-[2px] bg-foreground/15 mx-1 hidden sm:block" />
                                            
                                            <div className="flex items-center gap-1">
                                                <RefreshButton />
                                                <ThemeSelector themes={themes} />
                                                <ModeToggle />
                                                <CreditsModal />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Content Navigation (h-10) */}
                                    <div className="px-4 h-10 flex items-center justify-center bg-muted/5 border-b border-foreground/10 shadow-[0_1px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                                        <TabsList className="flex w-full md:w-auto h-10 p-0 bg-transparent gap-0 overflow-x-auto scrollbar-none justify-center">
                                            <TabsTrigger value="activities" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <ClipboardCheck className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Actividades</span>
                                            </TabsTrigger>
                                            
                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                                            
                                            <TabsTrigger value="evaluations" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <FileText className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Evaluaciones</span>
                                            </TabsTrigger>
                                            
                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="attendance" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <Clock className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Asistencia</span>
                                            </TabsTrigger>

                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="grades" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <GraduationCap className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Calificaciones</span>
                                            </TabsTrigger>

                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="remarks" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <MessageSquare className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Observaciones</span>
                                            </TabsTrigger>

                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="resources" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student">
                                                <BookOpen className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="hidden sm:inline group-data-[state=active]:text-primary">Recursos</span>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>
                                </TooltipProvider>
                            </div>

                            {/* Independently Scrollable Content Area - Subdivided by Tabs */}
                            <div className="flex-1 min-h-0 w-full overflow-hidden">
                                <TabsContent value="activities" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="space-y-4 pt-6">
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            Actividades Pendientes y Entregas
                                        </h3>
                                        {enrollment.course.activities.length > 0 ? (
                                            <div className="w-full overflow-x-auto rounded-md border text-foreground">
                                                <Table className="min-w-[700px]">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[300px]">Actividad</TableHead>
                                                            <TableHead>Estado</TableHead>
                                                            <TableHead className="hidden sm:table-cell">Nota</TableHead>
                                                            <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                                                            <TableHead className="text-right">Acciones</TableHead>
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
                                                                <TableRow key={activity.id} suppressHydrationWarning className="hover:bg-muted/30 transition-colors">
                                                                    <TableCell className="font-medium py-4">
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                                                {index + 1}
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="font-bold text-sm sm:text-base">{activity.title}</div>
                                                                                <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-2">
                                                                                    <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] font-normal">
                                                                                        Peso: {activity.weight.toFixed(1)}%
                                                                                    </Badge>
                                                                                    {activity.type === "MANUAL" && <span>• Manual</span>}
                                                                                </div>
                                                                                {!isOpen && (
                                                                                    <div className="text-[10px] text-amber-600 font-medium mt-1 flex items-center">
                                                                                        <Clock className="mr-1 h-3 w-3" />
                                                                                        Disponible el: {format(new Date(activity.openDate), "PP p")}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell suppressHydrationWarning>
                                                                        {!isOpen ? (
                                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">Bloqueado</Badge>
                                                                        ) : isGraded ? (
                                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Completado</Badge>
                                                                        ) : isRejected ? (
                                                                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none gap-1">
                                                                                <AlertCircle className="h-3 w-3" /> Corregir
                                                                            </Badge>
                                                                        ) : isSubmitted ? (
                                                                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none gap-1">
                                                                                <Clock className="h-3 w-3" /> En Revisión
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none gap-1">
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
                                                                            <span className="font-bold text-rose-500">0.0</span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">-</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="hidden md:table-cell" suppressHydrationWarning>
                                                                        <div className="text-xs text-muted-foreground font-medium" suppressHydrationWarning>
                                                                            {activity.type === "MANUAL" ? (
                                                                                <span className="italic">Sin fecha límite</span>
                                                                            ) : (
                                                                                <span className={new Date(activity.deadline) < new Date() ? "text-rose-500" : ""}>
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
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No hay actividades en este curso.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="evaluations" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
    <div className="space-y-4 pt-6">
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            Evaluaciones del Curso
                                        </h3>
                                        {enrollment.course.evaluationAttempts?.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
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
                                                        <Card key={attempt.id} className="overflow-hidden border-muted shadow-sm hover:shadow-md transition-shadow">
                                                            <CardHeader className="pb-3 border-b bg-muted/10">
                                                                <CardTitle className="text-lg">{attempt.evaluation.title}</CardTitle>
                                                                <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                                                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                                                    <span suppressHydrationWarning>
                                                                        {format(startTime, "PP p", { locale: es })}
                                                                    </span>
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="pt-4 flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Estado</span>
                                                                        {isSubmitted ? (
                                                                            <Badge className="bg-emerald-100 text-emerald-700 border-none">Completado</Badge>
                                                                        ) : isExpired ? (
                                                                            <Badge variant="destructive">Expirado</Badge>
                                                                        ) : isUpcoming ? (
                                                                            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Próximamente</Badge>
                                                                        ) : isOpen ? (
                                                                            <Badge className="bg-blue-100 text-blue-700 border-none animate-pulse">Abierto</Badge>
                                                                        ) : null}
                                                                    </div>
                                                                    {isSubmitted && submission.score !== null && (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nota</span>
                                                                            <span className="text-xl font-bold text-primary">{submission.score.toFixed(1)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Button 
                                                                    className="w-full font-bold shadow-sm" 
                                                                    variant={isSubmitted ? "outline" : isOpen ? "default" : "secondary"}
                                                                    disabled={!isOpen && !isSubmitted}
                                                                    asChild
                                                                >
                                                                    <Link href={`/evaluations/${attempt.id}`}>
                                                                        {isSubmitted ? "Ver Resultados" : isOpen ? "Realizar Evaluación" : "No disponible"}
                                                                    </Link>
                                                                </Button>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
                                                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                                <p className="text-muted-foreground font-medium">No hay evaluaciones programadas para este curso.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="attendance" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <StudentAttendanceSummary courseId={enrollment.course.id} userId={enrollment.userId} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="resources" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <SharedContentList contents={enrollment.course.sharedContent || []} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="remarks" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <StudentRemarks courseId={enrollment.course.id} userId={enrollment.userId} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="grades" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <StudentGradesView enrollment={enrollment} />
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
