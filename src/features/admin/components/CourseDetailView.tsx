"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    BookOpen,
    Users,
    FileText,
    Calendar,
    Clock,
    UserCheck,
    CheckCircle2,
    Copy,
    Check,
    ExternalLink,
    UserCog,
    Archive,
    RefreshCw,
    Trash2,
    FileSpreadsheet,
    Download,
    Search,
    X,
    Loader2,
    CalendarDays,
    AlertCircle,
    MessageSquare,
    ClipboardCheck,
    GraduationCap,
    Shield,
    Eye,
    Award,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileCheck,
    ThumbsUp,
    ThumbsDown,
    Info,
    Paperclip,
    TrendingUp,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { formatName } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { exportToExcel } from "@/lib/export-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
    if (!content) return null;

    const cleanContent = typeof content === "string" ? content.replace(/\\n/g, "\n") : content;

    return (
        <div className={`text-xs text-foreground/90 leading-relaxed space-y-2 select-text ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }: any) => (
                        <h1 className="text-base font-extrabold text-foreground mt-4 mb-2 pb-1 border-b border-border/60" {...props} />
                    ),
                    h2: ({ node, ...props }: any) => (
                        <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5" {...props} />
                    ),
                    h3: ({ node, ...props }: any) => (
                        <h3 className="text-xs font-bold text-primary mt-2.5 mb-1" {...props} />
                    ),
                    h4: ({ node, ...props }: any) => (
                        <h4 className="text-xs font-bold text-foreground mt-2 mb-1" {...props} />
                    ),
                    p: ({ node, ...props }: any) => (
                        <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                    ),
                    ul: ({ node, ...props }: any) => (
                        <ul className="list-disc list-outside pl-4 space-y-1 mb-2" {...props} />
                    ),
                    ol: ({ node, ...props }: any) => (
                        <ol className="list-decimal list-outside pl-4 space-y-1 mb-2" {...props} />
                    ),
                    li: ({ node, ...props }: any) => (
                        <li className="leading-relaxed" {...props} />
                    ),
                    table: ({ node, ...props }: any) => (
                        <div className="my-3 w-full overflow-x-auto rounded-xl border border-border/80 bg-background/60 shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }: any) => (
                        <thead className="bg-muted/80 border-b border-border/70 font-bold text-foreground" {...props} />
                    ),
                    th: ({ node, ...props }: any) => (
                        <th className="px-3 py-2 border-r last:border-r-0 border-border/60 font-bold text-foreground" {...props} />
                    ),
                    td: ({ node, ...props }: any) => (
                        <td className="px-3 py-2 border-t border-r last:border-r-0 border-border/60 text-foreground/90 align-top" {...props} />
                    ),
                    code: ({ node, inline, className, children, ...props }: any) => {
                        return inline ? (
                            <code className="font-mono text-[11px] bg-muted/80 text-primary px-1.5 py-0.5 rounded border border-border/60 font-semibold" {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className="my-2 p-3 rounded-xl bg-muted/80 border border-border/60 font-mono text-[11px] text-foreground overflow-x-auto">
                                <code {...props}>{children}</code>
                            </pre>
                        );
                    },
                    blockquote: ({ node, ...props }: any) => (
                        <blockquote className="border-l-4 border-primary/50 pl-3 py-1 my-2 italic text-muted-foreground bg-muted/20 rounded-r-lg" {...props} />
                    ),
                    hr: ({ node, ...props }: any) => (
                        <hr className="border-border/60 my-3" {...props} />
                    ),
                    strong: ({ node, ...props }: any) => (
                        <strong className="font-bold text-foreground" {...props} />
                    ),
                    a: ({ node, ...props }: any) => (
                        <a className="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                }}
            >
                {cleanContent}
            </ReactMarkdown>
        </div>
    );
}

interface CourseDetailViewProps {
    course: any;
    details: any;
    loading: boolean;
    teachers: any[];
    onBack: () => void;
    onReassignTeacher: (courseId: string, newTeacherId: string) => Promise<void>;
    onToggleArchive: (course: any) => Promise<void>;
    onDeleteCourse: (courseId: string) => Promise<void>;
}

export function CourseDetailView({
    course,
    details,
    loading,
    teachers,
    onBack,
    onReassignTeacher,
    onToggleArchive,
    onDeleteCourse,
}: CourseDetailViewProps) {
    const [copiedCode, setCopiedCode] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [reassignOpen, setReassignOpen] = useState(false);
    const [newTeacherId, setNewTeacherId] = useState(course.teacher?.id || "");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isActionPending, setIsActionPending] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Detail Inspection Modal States
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any | null>(null);
    const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<any | null>(null);
    const [activityStudentSearch, setActivityStudentSearch] = useState("");
    const [expandedFeedbacks, setExpandedFeedbacks] = useState<Record<string, boolean>>({});

    const toggleFeedback = (id: string) => {
        setExpandedFeedbacks(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Attendance & Remarks filter states
    const [attendanceSearch, setAttendanceSearch] = useState("");
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("ALL");
    const [remarksSearch, setRemarksSearch] = useState("");

    const now = new Date();
    const isActive = !course.endDate || new Date(course.endDate) >= now;

    const handleCopyCode = () => {
        if (!course.enrollmentCode) return;
        navigator.clipboard.writeText(course.enrollmentCode);
        setCopiedCode(true);
        toast.success(`Código ${course.enrollmentCode} copiado al portapapeles`);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleConfirmReassign = async () => {
        if (!newTeacherId || newTeacherId === course.teacher?.id) {
            setReassignOpen(false);
            return;
        }
        setIsActionPending(true);
        try {
            await onReassignTeacher(course.id, newTeacherId);
            setReassignOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al reasignar docente");
        } finally {
            setIsActionPending(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmation !== "ELIMINAR") return;
        setIsActionPending(true);
        try {
            await onDeleteCourse(course.id);
            setDeleteOpen(false);
            onBack();
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar curso");
        } finally {
            setIsActionPending(false);
        }
    };

    const handleExportStudentsExcel = async () => {
        const enrollments = details?.enrollments || [];
        if (enrollments.length === 0) {
            toast.warning("No hay estudiantes matriculados para exportar");
            return;
        }

        setIsExportingExcel(true);
        try {
            const dataToExport = enrollments.map((enr: any, idx: number) => {
                const stats = getStudentStats(enr.userId);
                return {
                    "#": idx + 1,
                    "Nombre Completo": formatName(enr.user?.name, enr.user?.profile),
                    "Documento de Identidad": enr.user?.profile?.identificacion || "No registrado",
                    "Correo Electrónico": enr.user?.email || "Sin correo",
                    "Teléfono": enr.user?.profile?.telefono || "No registrado",
                    "Fecha de Matrícula": enr.createdAt ? format(new Date(enr.createdAt), "dd/MM/yyyy HH:mm") : "No disponible",
                    "Tareas Entregadas": `${stats.submittedCount} / ${stats.totalActivities}`,
                    "Promedio Calificaciones": stats.average ? `${stats.average} / 5.0` : "Sin calificaciones",
                    "Tasa de Asistencia": stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "Sin asistencias",
                    "Curso": course.title,
                    "Código de Curso": course.enrollmentCode || "Sin código",
                };
            });

            await exportToExcel(
                dataToExport,
                `Estudiantes_${course.title.replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
                "Matrículas"
            );
            toast.success("Listado de estudiantes exportado exitosamente a Excel");
        } catch (error) {
            console.error("Error exporting students to Excel:", error);
            toast.error("Error al exportar los estudiantes a Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const activitiesList = details?.activities || [];
    const remarksList = details?.remarks || [];
    const attendancesList = details?.attendances || [];
    const enrollmentsList = details?.enrollments || [];

    const totalStudentsCount = enrollmentsList.length || course._count?.enrollments || 0;
    const totalActivitiesCount = activitiesList.length || course._count?.activities || 0;
    const totalSubmissionsCount = activitiesList.reduce((acc: number, act: any) => acc + (act._count?.submissions || act.submissions?.length || 0), 0);

    // Helpers for student-specific analysis
    const getStudentSubmissions = (userId: string) => {
        return activitiesList.map((act: any) => {
            const sub = (act.submissions || []).find((s: any) => s.userId === userId);
            return {
                activity: act,
                submission: sub || null,
            };
        });
    };

    const getStudentStats = (userId: string) => {
        const studentSubs = getStudentSubmissions(userId);
        const totalActivities = studentSubs.length;
        const submittedCount = studentSubs.filter((item: any) => !!item.submission).length;
        const gradedSubs = studentSubs.filter((item: any) => item.submission && typeof item.submission.grade === "number");

        const average = gradedSubs.length > 0
            ? (gradedSubs.reduce((acc: number, curr: any) => acc + (curr.submission.grade || 0), 0) / gradedSubs.length).toFixed(1)
            : null;

        const studentAttendances = attendancesList.filter((att: any) => att.userId === userId);
        const totalAttendances = studentAttendances.length;
        const presentCount = studentAttendances.filter((att: any) => att.status === "PRESENT").length;
        const absentCount = studentAttendances.filter((att: any) => att.status === "ABSENT").length;
        const excusedCount = studentAttendances.filter((att: any) => att.status === "EXCUSED").length;
        const lateCount = studentAttendances.filter((att: any) => att.status === "LATE" || att.status === "LEAVE_EARLY").length;

        const attendanceRate = totalAttendances > 0
            ? Math.round((presentCount / totalAttendances) * 100)
            : null;

        const studentRemarks = remarksList.filter((r: any) => r.userId === userId);

        return {
            totalActivities,
            submittedCount,
            gradedCount: gradedSubs.length,
            average,
            studentAttendances,
            totalAttendances,
            presentCount,
            absentCount,
            excusedCount,
            lateCount,
            attendanceRate,
            studentRemarks,
        };
    };

    // Filtered Students list
    const enrolledStudents = enrollmentsList.filter((enr: any) => {
        if (!studentSearch.trim()) return true;
        const q = studentSearch.toLowerCase();
        const fullName = formatName(enr.user?.name, enr.user?.profile).toLowerCase();
        const email = (enr.user?.email || "").toLowerCase();
        const doc = (enr.user?.profile?.identificacion || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || doc.includes(q);
    });

    // Filtered Attendances list
    const filteredAttendances = attendancesList.filter((att: any) => {
        if (attendanceStatusFilter !== "ALL" && att.status !== attendanceStatusFilter) {
            return false;
        }
        if (!attendanceSearch.trim()) return true;
        const q = attendanceSearch.toLowerCase();
        const studentName = formatName(att.user?.name, att.user?.profile).toLowerCase();
        const email = (att.user?.email || "").toLowerCase();
        const doc = (att.user?.profile?.identificacion || "").toLowerCase();
        const dateStr = att.date ? format(new Date(att.date), "dd/MM/yyyy").toLowerCase() : "";
        return studentName.includes(q) || email.includes(q) || doc.includes(q) || dateStr.includes(q);
    });

    // Attendance stats
    const totalAttendanceRecords = attendancesList.length;
    const totalPresent = attendancesList.filter((a: any) => a.status === "PRESENT").length;
    const totalAbsent = attendancesList.filter((a: any) => a.status === "ABSENT").length;
    const totalExcused = attendancesList.filter((a: any) => a.status === "EXCUSED").length;
    const totalLate = attendancesList.filter((a: any) => a.status === "LATE" || a.status === "LEAVE_EARLY").length;
    const overallAttendanceRate = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 100;

    // Filtered Remarks list
    const filteredRemarks = remarksList.filter((rem: any) => {
        if (!remarksSearch.trim()) return true;
        const q = remarksSearch.toLowerCase();
        const studentName = formatName(rem.user?.name, rem.user?.profile).toLowerCase();
        const teacherName = formatName(rem.teacher?.name, rem.teacher?.profile).toLowerCase();
        const title = (rem.title || "").toLowerCase();
        const desc = (rem.description || rem.content || "").toLowerCase();
        return studentName.includes(q) || teacherName.includes(q) || title.includes(q) || desc.includes(q);
    });

    // Helper to render activity type badge
    const renderActivityTypeBadge = (type: string) => {
        switch (type) {
            case "GITHUB":
                return <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 text-[10px]">GitHub</Badge>;
            case "MANUAL":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]">Manual</Badge>;
            case "PDF_REVIEW":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]">PDF Review</Badge>;
            case "CODE_PROJECT":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]">Proyecto Código</Badge>;
            case "CODE_CHALLENGE":
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-[10px]">Reto Algorítmico</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{type || "General"}</Badge>;
        }
    };

    // Helper to render attendance status badge
    const renderAttendanceBadge = (status: string) => {
        switch (status) {
            case "PRESENT":
                return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20">Presente</Badge>;
            case "ABSENT":
                return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20">Inasistencia</Badge>;
            case "EXCUSED":
                return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20">Excusa Justificada</Badge>;
            case "LATE":
                return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/20">Llegada Tarde</Badge>;
            case "LEAVE_EARLY":
                return <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20">Salida Temprana</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Top Navigation & Action Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="gap-2 text-xs font-semibold hover:bg-muted/80 rounded-xl px-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver al Catálogo de Cursos</span>
                    </Button>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`text-xs font-bold py-1 px-3 ${
                                isActive
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {isActive ? "Curso Activo" : "Curso Archivado"}
                        </Badge>

                        {course.enrollmentCode && (
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shadow-2xs"
                                title="Clic para copiar código de inscripción"
                            >
                                <span>Código: {course.enrollmentCode}</span>
                                {copiedCode ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5 opacity-70" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Course Header Banner */}
                <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden bg-card/70 backdrop-blur-md relative">
                    <div className="pointer-events-none absolute -top-24 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl" />
                    
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1.5 max-w-3xl">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/60">
                                        ID: {course.id.substring(0, 8)}...
                                    </span>
                                    {course.classDays && (
                                        <Badge variant="secondary" className="text-xs font-medium">
                                            <CalendarDays className="w-3 h-3 mr-1" />
                                            {course.classDays}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                    {course.title}
                                </CardTitle>
                                {course.description ? (
                                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                                        {course.description}
                                    </CardDescription>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Sin descripción detallada registrada para este curso.
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    asChild
                                    className="gap-1.5 font-bold shadow-xs"
                                >
                                    <Link href={`/dashboard/teacher/courses/${course.id}`} target="_blank">
                                        <ExternalLink className="w-4 h-4" />
                                        <span>Entrar al Curso</span>
                                    </Link>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReassignOpen(true)}
                                    className="gap-1.5 font-medium"
                                >
                                    <UserCog className="w-4 h-4 text-primary" />
                                    <span>Reasignar Docente</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onToggleArchive(course)}
                                    className="gap-1.5 font-medium"
                                >
                                    {isActive ? (
                                        <>
                                             <Archive className="w-4 h-4 text-amber-600" />
                                            <span>Archivar</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 text-emerald-600" />
                                            <span>Reactivar</span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteOpen(true)}
                                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Eliminar</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Bento Metrics & Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Teacher Card */}
                <AICanvasCard
                    title="Docente Titular"
                    description={course.teacher?.email || "Sin correo"}
                    icon={UserCheck}
                    badge="Profesor"
                    badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    accentColor="from-emerald-500/20 via-emerald-500/10 to-transparent"
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-600 dark:text-emerald-400"
                    compact={true}
                >
                    <div className="flex items-center gap-3 pt-1">
                        <UserAvatar
                            src={course.teacher?.image}
                            alt={formatName(course.teacher?.name, course.teacher?.profile)}
                            fallbackText={formatName(course.teacher?.name, course.teacher?.profile)}
                            size="md"
                            className="h-10 w-10 border border-emerald-500/20"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-foreground truncate">
                                {formatName(course.teacher?.name, course.teacher?.profile)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {course.teacher?.profile?.identificacion ? `CC: ${course.teacher.profile.identificacion}` : "Docente Asignado"}
                            </p>
                        </div>
                    </div>
                </AICanvasCard>

                {/* Students Enrolled Card */}
                <AICanvasCard
                    title="Matrícula Oficial"
                    description="Estudiantes con acceso al aula"
                    icon={GraduationCap}
                    badge={`${totalStudentsCount} inscritos`}
                    badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    accentColor="from-blue-500/20 via-blue-500/10 to-transparent"
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-600 dark:text-blue-400"
                    compact={true}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {totalStudentsCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            estudiantes activos
                        </span>
                    </div>
                </AICanvasCard>

                {/* Activities Count Card */}
                <AICanvasCard
                    title="Actividades Curriculares"
                    description={`${totalSubmissionsCount} entregas registradas`}
                    icon={FileText}
                    badge={`${totalActivitiesCount} tareas`}
                    badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    accentColor="from-purple-500/20 via-purple-500/10 to-transparent"
                    iconBgColor="bg-purple-500/10"
                    iconTextColor="text-purple-600 dark:text-purple-400"
                    compact={true}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {totalActivitiesCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            actividades de evaluación
                        </span>
                    </div>
                </AICanvasCard>

                {/* Schedule and Dates Card */}
                <AICanvasCard
                    title="Horario & Fechas"
                    description={course.startDate ? `Inició: ${format(new Date(course.startDate), "dd/MM/yyyy")}` : "Vigencia académica"}
                    icon={Clock}
                    badge={course.startTime ? `${course.startTime} - ${course.endTime}` : "Horario flexible"}
                    badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    accentColor="from-amber-500/20 via-amber-500/10 to-transparent"
                    iconBgColor="bg-amber-500/10"
                    iconTextColor="text-amber-600 dark:text-amber-400"
                    compact={true}
                >
                    <div className="pt-1 space-y-1">
                        <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>{course.startTime && course.endTime ? `${course.startTime} - ${course.endTime}` : "No establecido"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {course.endDate ? `Fin: ${format(new Date(course.endDate), "dd/MM/yyyy")}` : "Sin fecha de cierre"}
                        </p>
                    </div>
                </AICanvasCard>
            </div>

            {/* Main Tabs Container: Full Width Exploration */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
                <Tabs defaultValue="students" className="w-full">
                    <div className="p-4 sm:p-6 border-b border-border/40 bg-muted/20">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <TabsList className="grid grid-cols-2 sm:flex sm:w-auto h-10 p-1 bg-muted/60 rounded-xl border border-border/60">
                                <TabsTrigger value="students" className="text-xs gap-2 px-4 rounded-lg">
                                    <Users className="w-4 h-4" />
                                    <span>Estudiantes</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 bg-background">
                                        {totalStudentsCount}
                                    </Badge>
                                </TabsTrigger>

                                <TabsTrigger value="activities" className="text-xs gap-2 px-4 rounded-lg">
                                    <FileText className="w-4 h-4" />
                                    <span>Actividades</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 bg-background">
                                        {totalActivitiesCount}
                                    </Badge>
                                </TabsTrigger>

                                <TabsTrigger value="attendance" className="text-xs gap-2 px-4 rounded-lg">
                                    <ClipboardCheck className="w-4 h-4" />
                                    <span>Asistencia</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 bg-background">
                                        {totalAttendanceRecords}
                                    </Badge>
                                </TabsTrigger>

                                <TabsTrigger value="remarks" className="text-xs gap-2 px-4 rounded-lg">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Observaciones</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 bg-background">
                                        {remarksList.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>

                            {/* Export Tab-specific Data */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportStudentsExcel}
                                    disabled={isExportingExcel || totalStudentsCount === 0}
                                    className="h-9 gap-1.5 text-xs font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    {isExportingExcel ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                    <span>Exportar Alumnos Excel</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tab: Estudiantes Matriculados */}
                    <TabsContent value="students" className="p-4 sm:p-6 space-y-4 m-0">
                        {/* Student Search Toolbar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filtrar por estudiante, identificación o correo..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="pl-10 pr-9 h-9 text-xs bg-background/60 border-border/70 rounded-xl"
                                />
                                {studentSearch && (
                                    <button
                                        onClick={() => setStudentSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Mostrando {enrolledStudents.length} de {totalStudentsCount} estudiantes
                            </span>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span>Cargando matriz de estudiantes matriculados...</span>
                            </div>
                        ) : enrolledStudents.length > 0 ? (
                            <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                            <TableHead className="text-xs font-bold">Estudiante</TableHead>
                                            <TableHead className="text-xs font-bold">Documento (CC)</TableHead>
                                            <TableHead className="text-xs font-bold">Correo Institucional</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Entregas</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Promedio</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Asistencia</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {enrolledStudents.map((enr: any, idx: number) => {
                                            const studentName = formatName(enr.user?.name, enr.user?.profile);
                                            const stats = getStudentStats(enr.userId);
                                            return (
                                                <TableRow key={enr.id || idx} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            <UserAvatar
                                                                src={enr.user?.image}
                                                                alt={studentName}
                                                                fallbackText={studentName}
                                                                size="sm"
                                                                className="h-8 w-8"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-xs text-foreground truncate">
                                                                    {studentName}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground truncate">
                                                                    ID: {enr.user?.id?.substring(0, 8)}...
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted/60 border border-border/50">
                                                            {enr.user?.profile?.identificacion || "Sin cédula"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {enr.user?.email}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {stats.submittedCount} / {stats.totalActivities}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {stats.average !== null ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`font-mono text-xs font-bold ${
                                                                    Number(stats.average) >= 3.0
                                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                                                }`}
                                                            >
                                                                {stats.average} / 5.0
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Sin nota</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {stats.attendanceRate !== null ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-bold ${
                                                                    stats.attendanceRate >= 80
                                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                                }`}
                                                            >
                                                                {stats.attendanceRate}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedStudentForDetail(enr)}
                                                            className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-xl px-2.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-primary" />
                                                            <span>Ver Ficha</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl bg-muted/10">
                                <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                                <h3 className="font-bold text-sm text-foreground">No se encontraron estudiantes</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {studentSearch ? "Ningún alumno coincide con el filtro de búsqueda" : "Este curso aún no tiene alumnos matriculados"}
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab: Actividades Curriculares */}
                    <TabsContent value="activities" className="p-4 sm:p-6 space-y-4 m-0">
                        {loading ? (
                            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span>Cargando actividades y tareas...</span>
                            </div>
                        ) : activitiesList.length > 0 ? (
                            <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                            <TableHead className="text-xs font-bold">Actividad / Tarea</TableHead>
                                            <TableHead className="text-xs font-bold">Tipo & Ponderación</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Fecha Límite</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Entregas</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Promedio</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activitiesList.map((act: any, idx: number) => {
                                            const deadline = act.deadline || act.dueDate;
                                            const isPastDue = deadline && new Date(deadline) < now;
                                            const submissions = act.submissions || [];
                                            const gradedSubs = submissions.filter((s: any) => typeof s.grade === "number");
                                            const avgGrade = gradedSubs.length > 0
                                                ? (gradedSubs.reduce((acc: number, s: any) => acc + s.grade, 0) / gradedSubs.length).toFixed(1)
                                                : null;

                                            return (
                                                <TableRow key={act.id || idx} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-xs text-foreground">
                                                            {act.title}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-sm">
                                                            {act.statement || act.description || "Sin enunciado"}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {renderActivityTypeBadge(act.type)}
                                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                                {act.weight ? `${act.weight * 100}%` : "1.0x"}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {deadline ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] font-semibold ${
                                                                    isPastDue
                                                                        ? "border-destructive/30 text-destructive bg-destructive/5"
                                                                        : "border-primary/30 text-primary bg-primary/5"
                                                                }`}
                                                            >
                                                                {format(new Date(deadline), "dd/MM/yyyy HH:mm")}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Sin límite</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-sm text-foreground">
                                                        <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-xs">
                                                            {submissions.length} / {totalStudentsCount}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {avgGrade !== null ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`font-mono text-xs font-bold ${
                                                                    Number(avgGrade) >= 3.0
                                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                                                }`}
                                                            >
                                                                {avgGrade} / 5.0
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedActivityForDetail(act);
                                                                setActivityStudentSearch("");
                                                            }}
                                                            className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-xl px-2.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-primary" />
                                                            <span>Ver Entregas & Detalle</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl bg-muted/10">
                                <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                                <h3 className="font-bold text-sm text-foreground">No hay actividades creadas</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    El docente aún no ha publicado tareas o talleres en este curso
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab: Asistencia */}
                    <TabsContent value="attendance" className="p-4 sm:p-6 space-y-4 m-0">
                        {/* Attendance Summary Widgets */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <Card className="p-3 rounded-2xl border-border/60 bg-muted/20">
                                <span className="text-[11px] text-muted-foreground font-medium">Total Registros</span>
                                <p className="text-xl font-black text-foreground mt-0.5">{totalAttendanceRecords}</p>
                            </Card>
                            <Card className="p-3 rounded-2xl border-emerald-500/20 bg-emerald-500/5">
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Asistencias</span>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalPresent}</p>
                            </Card>
                            <Card className="p-3 rounded-2xl border-rose-500/20 bg-rose-500/5">
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Inasistencias</span>
                                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{totalAbsent}</p>
                            </Card>
                            <Card className="p-3 rounded-2xl border-amber-500/20 bg-amber-500/5">
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Excusas</span>
                                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalExcused}</p>
                            </Card>
                            <Card className="p-3 rounded-2xl border-primary/20 bg-primary/5 col-span-2 sm:col-span-1">
                                <span className="text-[11px] text-primary font-medium">Tasa Global</span>
                                <p className="text-xl font-black text-primary mt-0.5">{overallAttendanceRate}%</p>
                            </Card>
                        </div>

                        {/* Search & Filter bar for Attendance */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por alumno, cédula o fecha (DD/MM/AAAA)..."
                                    value={attendanceSearch}
                                    onChange={(e) => setAttendanceSearch(e.target.value)}
                                    className="pl-10 pr-9 h-9 text-xs bg-background/60 border-border/70 rounded-xl"
                                />
                                {attendanceSearch && (
                                    <button
                                        onClick={() => setAttendanceSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
                                    <SelectTrigger className="h-9 w-44 text-xs rounded-xl">
                                        <SelectValue placeholder="Estado de asistencia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todos los estados</SelectItem>
                                        <SelectItem value="PRESENT">Presente</SelectItem>
                                        <SelectItem value="ABSENT">Inasistencia</SelectItem>
                                        <SelectItem value="EXCUSED">Excusa Justificada</SelectItem>
                                        <SelectItem value="LATE">Llegada Tarde</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {filteredAttendances.length > 0 ? (
                            <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                            <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                            <TableHead className="text-xs font-bold">Fecha de Clase</TableHead>
                                            <TableHead className="text-xs font-bold">Estudiante</TableHead>
                                            <TableHead className="text-xs font-bold">Documento</TableHead>
                                            <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                                            <TableHead className="text-xs font-bold">Observación / Justificación</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAttendances.map((att: any, idx: number) => {
                                            const studentName = formatName(att.user?.name, att.user?.profile);
                                            return (
                                                <TableRow key={att.id || idx} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-foreground">
                                                        {att.date ? format(new Date(att.date), "dd/MM/yyyy") : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <UserAvatar
                                                                src={att.user?.image}
                                                                alt={studentName}
                                                                fallbackText={studentName}
                                                                size="sm"
                                                                className="h-7 w-7"
                                                            />
                                                            <span className="font-bold text-xs text-foreground truncate">
                                                                {studentName}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {att.user?.profile?.identificacion || "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {renderAttendanceBadge(att.status)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                                                        {att.justification ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="truncate">{att.justification}</span>
                                                                {att.justificationUrl && (
                                                                    <a
                                                                        href={att.justificationUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-primary hover:underline shrink-0"
                                                                        title="Ver comprobante adjunto"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/60 italic">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl bg-muted/10">
                                <ClipboardCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                                <h3 className="font-bold text-sm text-foreground">No hay registros de asistencia</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {attendanceSearch || attendanceStatusFilter !== "ALL"
                                        ? "No hay coincidencias con el filtro aplicado"
                                        : "Aún no se ha tomado asistencia en este curso"}
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab: Observaciones */}
                    <TabsContent value="remarks" className="p-4 sm:p-6 space-y-4 m-0">
                        {/* Search bar for Remarks */}
                        <div className="relative max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en observaciones por alumno o contenido..."
                                value={remarksSearch}
                                onChange={(e) => setRemarksSearch(e.target.value)}
                                className="pl-10 pr-9 h-9 text-xs bg-background/60 border-border/70 rounded-xl"
                            />
                            {remarksSearch && (
                                <button
                                    onClick={() => setRemarksSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {filteredRemarks.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredRemarks.map((rem: any, idx: number) => {
                                    const isCommendation = rem.type === "COMMENDATION";
                                    const studentName = formatName(rem.user?.name, rem.user?.profile);
                                    const teacherName = formatName(rem.teacher?.name, rem.teacher?.profile);
                                    return (
                                        <Card
                                            key={rem.id || idx}
                                            className={`p-4 rounded-2xl border ${
                                                isCommendation
                                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                                    : "border-rose-500/30 bg-rose-500/5"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs font-bold ${
                                                            isCommendation
                                                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                                        }`}
                                                    >
                                                        {isCommendation ? (
                                                            <ThumbsUp className="w-3 h-3 mr-1" />
                                                        ) : (
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                        )}
                                                        {isCommendation ? "Felicitación / Reconocimiento" : "Llamado de Atención"}
                                                    </Badge>
                                                    {rem.title && (
                                                        <span className="font-bold text-xs text-foreground truncate">
                                                            {rem.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                    {rem.date || rem.createdAt ? format(new Date(rem.date || rem.createdAt), "dd/MM/yy HH:mm") : ""}
                                                </span>
                                            </div>

                                            <p className="text-xs text-foreground/90 leading-relaxed my-2">
                                                {rem.description || rem.content || "Sin detalle registrado."}
                                            </p>

                                            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                                                <span>
                                                    Estudiante: <strong className="text-foreground">{studentName}</strong>
                                                </span>
                                                <span>
                                                    Docente: <strong className="text-foreground">{teacherName}</strong>
                                                </span>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-16 text-center border border-dashed border-border/70 rounded-2xl bg-muted/10">
                                <MessageSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                                <h3 className="font-bold text-sm text-foreground">No hay observaciones registradas</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {remarksSearch
                                        ? "No hay novedades que coincidan con la búsqueda"
                                        : "El profesor no ha anotado llamados de atención ni reconocimientos"}
                                </p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </Card>

            {/* ========================================================================= */}
            {/* STUDENT DETAIL INSPECTION DIALOG (READ-ONLY) */}
            {/* ========================================================================= */}
            <Dialog open={!!selectedStudentForDetail} onOpenChange={(open) => !open && setSelectedStudentForDetail(null)}>
                <DialogContent
                    style={{ width: "95vw", maxWidth: "1250px" }}
                    className="w-[95vw] max-w-[1250px] max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 rounded-3xl border-border/80 shadow-2xl"
                >
                    {selectedStudentForDetail && (() => {
                        const enr = selectedStudentForDetail;
                        const studentUser = enr.user;
                        const studentName = formatName(studentUser?.name, studentUser?.profile);
                        const stats = getStudentStats(studentUser?.id);
                        const studentSubs = getStudentSubmissions(studentUser?.id);

                        return (
                            <div className="space-y-6 p-6">
                                {/* Dialog Header */}
                                <DialogHeader className="text-left space-y-3 pb-4 border-b border-border/60">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5">
                                            <UserAvatar
                                                src={studentUser?.image}
                                                alt={studentName}
                                                fallbackText={studentName}
                                                size="lg"
                                                className="h-14 w-14 border-2 border-primary/20"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <DialogTitle className="text-xl font-extrabold text-foreground">
                                                        {studentName}
                                                    </DialogTitle>
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        Estudiante
                                                    </Badge>
                                                </div>
                                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                                    {studentUser?.email} &bull; CC: {studentUser?.profile?.identificacion || "No registrada"}
                                                </DialogDescription>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <Badge variant="secondary" className="text-xs">
                                                Inscrito: {enr.createdAt ? format(new Date(enr.createdAt), "dd/MM/yyyy") : "-"}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Student Summary KPI Bento Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Promedio Curso</span>
                                            <div className="text-lg font-black text-foreground mt-0.5">
                                                {stats.average !== null ? (
                                                    <span className={Number(stats.average) >= 3.0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                        {stats.average} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-normal text-muted-foreground italic">Sin notas</span>
                                                )}
                                            </div>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Entregas Realizadas</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {stats.submittedCount} <span className="text-xs font-normal text-muted-foreground">de {stats.totalActivities} tareas</span>
                                            </p>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Tasa Asistencia</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {stats.attendanceRate !== null ? (
                                                    <span className={stats.attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                                        {stats.attendanceRate}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-normal text-muted-foreground">-</span>
                                                )}
                                            </p>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Observaciones</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {stats.studentRemarks.length} <span className="text-xs font-normal text-muted-foreground">registros</span>
                                            </p>
                                        </Card>
                                    </div>
                                </DialogHeader>

                                {/* Student Internal Tabs */}
                                <Tabs defaultValue="student-tasks" className="w-full">
                                    <TabsList className="w-full grid grid-cols-3 h-10 p-1 bg-muted/60 rounded-xl">
                                        <TabsTrigger value="student-tasks" className="text-xs font-semibold gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Entregas ({studentSubs.length})</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="student-attendance" className="text-xs font-semibold gap-1.5">
                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                            <span>Asistencia ({stats.totalAttendances})</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="student-remarks" className="text-xs font-semibold gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Observaciones ({stats.studentRemarks.length})</span>
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Student Submissions List */}
                                    <TabsContent value="student-tasks" className="space-y-3 pt-3">
                                        {studentSubs.length > 0 ? (
                                            <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs w-full">
                                                <Table className="w-full">
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                            <TableHead className="text-xs font-bold">Actividad</TableHead>
                                                            <TableHead className="w-36 text-xs font-bold text-center">Estado</TableHead>
                                                            <TableHead className="w-36 text-xs font-bold text-center">Fecha Envío</TableHead>
                                                            <TableHead className="w-32 text-xs font-bold text-center">Calificación</TableHead>
                                                            <TableHead className="w-36 text-xs font-bold text-center">Evidencia</TableHead>
                                                            <TableHead className="w-44 text-xs font-bold text-center">Informe Docente</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {studentSubs.map(({ activity, submission }: any, subIdx: number) => {
                                                            const deadline = activity.deadline || activity.dueDate;
                                                            const isPastDue = deadline && new Date(deadline) < now;
                                                            const studentSubKey = `student_sub_${activity.id || subIdx}`;
                                                            const isExpanded = !!expandedFeedbacks[studentSubKey];
                                                            const hasFeedback = !!submission?.feedback;

                                                            return (
                                                                <React.Fragment key={studentSubKey}>
                                                                    <TableRow className={`hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20 border-b-0" : ""}`}>
                                                                        <TableCell>
                                                                            <div className="font-bold text-xs text-foreground">
                                                                                {activity.title}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                                {renderActivityTypeBadge(activity.type)}
                                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                                    Peso: {activity.weight ? `${activity.weight * 100}%` : "1.0x"}
                                                                                </span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {submission ? (
                                                                                submission.grade !== null ? (
                                                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                                                                                        Calificada
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px]">
                                                                                        Entregada (Por calificar)
                                                                                    </Badge>
                                                                                )
                                                                            ) : isPastDue ? (
                                                                                <Badge variant="destructive" className="text-[10px]">
                                                                                    No Entregada (Vencida)
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                                                                    Pendiente
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                                            {submission?.lastSubmittedAt || submission?.createdAt
                                                                                ? format(new Date(submission.lastSubmittedAt || submission.createdAt), "dd/MM/yy HH:mm")
                                                                                : "-"}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {submission && typeof submission.grade === "number" ? (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={`font-mono text-xs font-bold ${
                                                                                        submission.grade >= 3.0
                                                                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                                                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                                                                    }`}
                                                                                >
                                                                                    {submission.grade.toFixed(1)} / 5.0
                                                                                </Badge>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground italic">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {submission?.url ? (
                                                                                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 gap-1 px-2">
                                                                                    <a href={submission.url} target="_blank" rel="noopener noreferrer">
                                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                                        <span>Ver Trabajo</span>
                                                                                    </a>
                                                                                </Button>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground italic">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {hasFeedback ? (
                                                                                <Button
                                                                                    variant={isExpanded ? "default" : "outline"}
                                                                                    size="sm"
                                                                                    onClick={() => toggleFeedback(studentSubKey)}
                                                                                    className={`h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-xl transition-all ${
                                                                                        isExpanded
                                                                                            ? "bg-primary text-primary-foreground shadow-xs"
                                                                                            : "border-primary/30 text-primary hover:bg-primary/10"
                                                                                    }`}
                                                                                >
                                                                                    <FileText className="w-3.5 h-3.5" />
                                                                                    <span>{isExpanded ? "Ocultar" : "Ver Informe"}</span>
                                                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                                </Button>
                                                                            ) : (
                                                                                <span className="text-[11px] text-muted-foreground/60 italic">Sin comentarios</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>

                                                                    {/* Full Width Expanded Evaluation Report */}
                                                                    {isExpanded && hasFeedback && (
                                                                        <TableRow className="bg-muted/15 border-b-2 border-primary/20 hover:bg-muted/15">
                                                                            <TableCell colSpan={6} className="p-4 sm:p-6">
                                                                                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                                                                                    <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                                                                                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                                                                                            <FileCheck className="w-5 h-5" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <h5 className="font-extrabold text-sm text-foreground">
                                                                                                Retroalimentación del Docente — {activity.title}
                                                                                            </h5>
                                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                                Comentarios técnicos y valoración de la entrega
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="p-4 rounded-xl bg-background/60 border border-border/60">
                                                                                        <MarkdownContent content={submission.feedback} />
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                No hay actividades configuradas en este curso.
                                            </p>
                                        )}
                                    </TabsContent>

                                    {/* Student Attendance List */}
                                    <TabsContent value="student-attendance" className="space-y-3 pt-3">
                                        {stats.studentAttendances.length > 0 ? (
                                            <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                            <TableHead className="text-xs font-bold">Fecha</TableHead>
                                                            <TableHead className="text-xs font-bold text-center">Estado</TableHead>
                                                            <TableHead className="text-xs font-bold">Hora Llegada</TableHead>
                                                            <TableHead className="text-xs font-bold">Justificación / Observación</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {stats.studentAttendances.map((att: any, attIdx: number) => (
                                                            <TableRow key={att.id || attIdx} className="hover:bg-muted/30">
                                                                <TableCell className="text-xs font-semibold">
                                                                    {att.date ? format(new Date(att.date), "dd/MM/yyyy") : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {renderAttendanceBadge(att.status)}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                                    {att.arrivalTime ? format(new Date(att.arrivalTime), "HH:mm") : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">
                                                                    {att.justification || "-"}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                No hay registros de asistencia para este estudiante.
                                            </p>
                                        )}
                                    </TabsContent>

                                    {/* Student Remarks List */}
                                    <TabsContent value="student-remarks" className="space-y-3 pt-3">
                                        {stats.studentRemarks.length > 0 ? (
                                            <div className="space-y-2.5">
                                                {stats.studentRemarks.map((rem: any, remIdx: number) => {
                                                    const isComm = rem.type === "COMMENDATION";
                                                    return (
                                                        <Card
                                                            key={rem.id || remIdx}
                                                            className={`p-3.5 rounded-2xl border ${
                                                                isComm
                                                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                                                    : "border-rose-500/30 bg-rose-500/5"
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] font-bold ${
                                                                        isComm
                                                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                                            : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                                                    }`}
                                                                >
                                                                    {isComm ? "Reconocimiento" : "Llamado de Atención"}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                    {rem.date || rem.createdAt ? format(new Date(rem.date || rem.createdAt), "dd/MM/yyyy HH:mm") : ""}
                                                                </span>
                                                            </div>
                                                            {rem.title && <h5 className="font-bold text-xs text-foreground mb-1">{rem.title}</h5>}
                                                            <p className="text-xs text-foreground/90">{rem.description || rem.content}</p>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                No hay observaciones registradas para este estudiante.
                                            </p>
                                        )}
                                    </TabsContent>
                                </Tabs>

                                <div className="flex justify-end pt-2 border-t border-border/60">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudentForDetail(null)}
                                        className="rounded-xl px-4 text-xs font-semibold"
                                    >
                                        Cerrar Ficha
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* ACTIVITY DETAIL & SUBMISSIONS INSPECTION DIALOG (READ-ONLY) */}
            {/* ========================================================================= */}
            <Dialog open={!!selectedActivityForDetail} onOpenChange={(open) => !open && setSelectedActivityForDetail(null)}>
                <DialogContent
                    style={{ width: "95vw", maxWidth: "1250px" }}
                    className="w-[95vw] max-w-[1250px] max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 rounded-3xl border-border/80 shadow-2xl"
                >
                    {selectedActivityForDetail && (() => {
                        const act = selectedActivityForDetail;
                        const deadline = act.deadline || act.dueDate;
                        const isPastDue = deadline && new Date(deadline) < now;
                        const submissions = act.submissions || [];
                        const gradedSubs = submissions.filter((s: any) => typeof s.grade === "number");
                        const avgGrade = gradedSubs.length > 0
                            ? (gradedSubs.reduce((acc: number, s: any) => acc + s.grade, 0) / gradedSubs.length).toFixed(1)
                            : null;

                        // Roster of enrolled students and their status for this activity
                        const roster = enrollmentsList.map((enr: any) => {
                            const sub = submissions.find((s: any) => s.userId === enr.userId);
                            return {
                                student: enr.user,
                                enrollment: enr,
                                submission: sub || null,
                            };
                        });

                        const filteredRoster = roster.filter(({ student }: any) => {
                            if (!activityStudentSearch.trim()) return true;
                            const q = activityStudentSearch.toLowerCase();
                            const name = formatName(student?.name, student?.profile).toLowerCase();
                            const doc = (student?.profile?.identificacion || "").toLowerCase();
                            const email = (student?.email || "").toLowerCase();
                            return name.includes(q) || doc.includes(q) || email.includes(q);
                        });

                        return (
                            <div className="space-y-6 p-6">
                                {/* Activity Header */}
                                <DialogHeader className="text-left space-y-3 pb-4 border-b border-border/60">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {renderActivityTypeBadge(act.type)}
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    Ponderación: {act.weight ? `${act.weight * 100}%` : "1.0x"}
                                                </Badge>
                                                {deadline && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] font-bold ${
                                                            isPastDue
                                                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                        }`}
                                                    >
                                                        {isPastDue ? "Plazo Vencido" : "Actividad Vigente"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <DialogTitle className="text-xl font-extrabold text-foreground">
                                                {act.title}
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-muted-foreground">
                                                Límite de entrega: {deadline ? format(new Date(deadline), "dd/MM/yyyy HH:mm") : "Sin fecha límite"} &bull; Intentos permitidos: {act.maxAttempts || 1}
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    {/* Bento Metrics for this activity */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Matrícula Total</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {totalStudentsCount} <span className="text-xs font-normal text-muted-foreground">estudiantes</span>
                                            </p>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Entregas Recibidas</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {submissions.length} <span className="text-xs font-normal text-muted-foreground">({totalStudentsCount > 0 ? Math.round((submissions.length / totalStudentsCount) * 100) : 0}%)</span>
                                            </p>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Pendientes de Entrega</span>
                                            <p className="text-lg font-black text-foreground mt-0.5">
                                                {Math.max(0, totalStudentsCount - submissions.length)} <span className="text-xs font-normal text-muted-foreground">estudiantes</span>
                                            </p>
                                        </Card>

                                        <Card className="p-3 rounded-2xl bg-muted/30 border-border/60">
                                            <span className="text-[11px] font-medium text-muted-foreground">Promedio Calificación</span>
                                            <div className="text-lg font-black text-foreground mt-0.5">
                                                {avgGrade !== null ? (
                                                    <span className={Number(avgGrade) >= 3.0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                        {avgGrade} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-normal text-muted-foreground italic">Sin notas</span>
                                                )}
                                            </div>
                                        </Card>
                                    </div>
                                </DialogHeader>

                                {/* Activity Instructions / Statement Section with Rich Markdown Rendering */}
                                {(act.statement || act.description) && (
                                    <div className="space-y-4 p-5 rounded-2xl bg-muted/20 border border-border/60">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-primary" />
                                            <span>Enunciado & Rúbrica de la Actividad</span>
                                        </h4>
                                        {act.statement && (
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Enunciado Principal:</span>
                                                <div className="bg-background/80 p-4 rounded-2xl border border-border/60 shadow-2xs">
                                                    <MarkdownContent content={act.statement} />
                                                </div>
                                            </div>
                                        )}
                                        {act.description && (
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Criterios / Instrucciones Adicionales:</span>
                                                <div className="bg-background/50 p-4 rounded-2xl border border-border/50">
                                                    <MarkdownContent content={act.description} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Roster of Enrolled Students Submissions */}
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" />
                                                <span>Entregas de Estudiantes ({submissions.length} de {totalStudentsCount})</span>
                                            </h4>
                                            {submissions.some((s: any) => !!s.feedback) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const feedbackIds = filteredRoster
                                                            .filter((r: any) => !!r.submission?.feedback)
                                                            .map((r: any) => r.student?.id || r.submission?.id);
                                                        const anyClosed = feedbackIds.some((id: string) => !expandedFeedbacks[id]);
                                                        const nextState = { ...expandedFeedbacks };
                                                        feedbackIds.forEach((id: string) => {
                                                            nextState[id] = anyClosed;
                                                        });
                                                        setExpandedFeedbacks(nextState);
                                                    }}
                                                    className="h-7 text-[11px] gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground"
                                                >
                                                    <FileText className="w-3 h-3 text-primary" />
                                                    <span>Alternar Todos los Informes</span>
                                                </Button>
                                            )}
                                        </div>

                                        <div className="relative w-full sm:w-72">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar estudiante..."
                                                value={activityStudentSearch}
                                                onChange={(e) => setActivityStudentSearch(e.target.value)}
                                                className="pl-9 h-8 text-xs bg-background/60 rounded-xl"
                                            />
                                            {activityStudentSearch && (
                                                <button
                                                    onClick={() => setActivityStudentSearch("")}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border/70 overflow-hidden shadow-2xs w-full">
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                    <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                                                    <TableHead className="text-xs font-bold">Estudiante</TableHead>
                                                    <TableHead className="w-36 text-xs font-bold text-center">Estado</TableHead>
                                                    <TableHead className="w-40 text-xs font-bold text-center">Fecha Entrega</TableHead>
                                                    <TableHead className="w-32 text-xs font-bold text-center">Calificación</TableHead>
                                                    <TableHead className="w-36 text-xs font-bold text-center">Evidencia</TableHead>
                                                    <TableHead className="w-44 text-xs font-bold text-center">Informe Docente</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRoster.map(({ student, submission }: any, rIdx: number) => {
                                                    const studentName = formatName(student?.name, student?.profile);
                                                    const rowKey = student?.id || submission?.id || String(rIdx);
                                                    const isExpanded = !!expandedFeedbacks[rowKey];
                                                    const hasFeedback = !!submission?.feedback;

                                                    return (
                                                        <React.Fragment key={rowKey}>
                                                            <TableRow className={`hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20 border-b-0" : ""}`}>
                                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                    {rIdx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2.5">
                                                                        <UserAvatar
                                                                            src={student?.image}
                                                                            alt={studentName}
                                                                            fallbackText={studentName}
                                                                            size="sm"
                                                                            className="h-8 w-8"
                                                                        />
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-xs text-foreground truncate">
                                                                                {studentName}
                                                                            </p>
                                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                                                CC: {student?.profile?.identificacion || "S/D"} &bull; {student?.email}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {submission ? (
                                                                        submission.grade !== null ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                                                                                Calificada
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px]">
                                                                                Entregada
                                                                            </Badge>
                                                                        )
                                                                    ) : isPastDue ? (
                                                                        <Badge variant="destructive" className="text-[10px]">
                                                                            No Entregó
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                                            Pendiente
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                                    {submission?.lastSubmittedAt || submission?.createdAt
                                                                        ? format(new Date(submission.lastSubmittedAt || submission.createdAt), "dd/MM/yy HH:mm")
                                                                        : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {submission && typeof submission.grade === "number" ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`font-mono text-xs font-bold ${
                                                                                submission.grade >= 3.0
                                                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                                                            }`}
                                                                        >
                                                                            {submission.grade.toFixed(1)} / 5.0
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground italic">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {submission?.url ? (
                                                                        <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 gap-1 px-2">
                                                                            <a href={submission.url} target="_blank" rel="noopener noreferrer">
                                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                                <span>Ver Trabajo</span>
                                                                            </a>
                                                                        </Button>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground italic">-</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {hasFeedback ? (
                                                                        <Button
                                                                            variant={isExpanded ? "default" : "outline"}
                                                                            size="sm"
                                                                            onClick={() => toggleFeedback(rowKey)}
                                                                            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-xl transition-all ${
                                                                                isExpanded
                                                                                    ? "bg-primary text-primary-foreground shadow-xs"
                                                                                    : "border-primary/30 text-primary hover:bg-primary/10"
                                                                            }`}
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                            <span>{isExpanded ? "Ocultar Informe" : "Ver Informe"}</span>
                                                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                        </Button>
                                                                    ) : (
                                                                        <span className="text-[11px] text-muted-foreground/60 italic">Sin comentarios</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* Full Width Expanded Evaluation Report */}
                                                            {isExpanded && hasFeedback && (
                                                                <TableRow className="bg-muted/15 border-b-2 border-primary/20 hover:bg-muted/15">
                                                                    <TableCell colSpan={7} className="p-4 sm:p-6">
                                                                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                                                                            {/* Report Top Banner */}
                                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                                                                                        <FileCheck className="w-5 h-5" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                                                                            <span>Informe de Evaluación — {studentName}</span>
                                                                                        </h5>
                                                                                        <p className="text-[11px] text-muted-foreground">
                                                                                            Revisión oficial registrada por el docente &bull; Intentos: {submission.attemptCount || 1}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-2">
                                                                                    {submission.grade !== null && (
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className={`font-mono text-xs font-bold px-3 py-1 ${
                                                                                                submission.grade >= 3.0
                                                                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                                                                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                                                                            }`}
                                                                                        >
                                                                                            Nota: {submission.grade.toFixed(1)} / 5.0
                                                                                        </Badge>
                                                                                    )}
                                                                                    {submission.url && (
                                                                                        <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1.5">
                                                                                            <a href={submission.url} target="_blank" rel="noopener noreferrer">
                                                                                                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                                                                                <span>Ir al repositorio / enlace</span>
                                                                                            </a>
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Full Width Rendered Markdown Content */}
                                                                            <div className="p-4 rounded-xl bg-background/60 border border-border/60">
                                                                                <MarkdownContent content={submission.feedback} />
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2 border-t border-border/60">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedActivityForDetail(null)}
                                        className="rounded-xl px-4 text-xs font-semibold"
                                    >
                                        Cerrar Detalle
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Reassign Teacher Dialog */}
            <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reasignar Docente Titular</DialogTitle>
                        <DialogDescription>
                            Selecciona el nuevo profesor que estará a cargo del curso "{course.title}".
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Profesor Actual</label>
                            <p className="text-sm font-bold text-foreground">
                                {formatName(course.teacher?.name, course.teacher?.profile)} ({course.teacher?.email})
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Nuevo Profesor</label>
                            <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Seleccionar docente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {formatName(t.name, t.profile)} ({t.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setReassignOpen(false)} disabled={isActionPending}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleConfirmReassign} disabled={isActionPending || newTeacherId === course.teacher?.id}>
                            {isActionPending ? "Reasignando..." : "Confirmar Reasignación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Course Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Eliminar Asignatura Definitivamente
                        </DialogTitle>
                        <DialogDescription>
                            Esta acción eliminará el curso "{course.title}", sus matrículas y tareas registradas. Esta operación es irreversible.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <p className="text-xs text-muted-foreground">
                            Para confirmar, escribe <span className="font-bold font-mono text-destructive">ELIMINAR</span> a continuación:
                        </p>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="ELIMINAR"
                            className="font-mono text-sm uppercase h-9"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={isActionPending}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmDelete}
                            disabled={isActionPending || deleteConfirmation !== "ELIMINAR"}
                            className="font-bold"
                        >
                            {isActionPending ? "Eliminando..." : "Eliminar Curso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
