"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDateTime } from "@/lib/dateUtils";
import { formatName, getInitials } from "@/lib/utils";
import { 
    Trash2, 
    AlertCircle, 
    ArrowLeft, 
    Eye, 
    ShieldAlert, 
    Users, 
    UserCheck,
    Download,
    FileText,
    FileSpreadsheet,
    Loader2,
    Search,
    CheckCircle2,
    Clock,
    Award,
    TrendingUp,
    BarChart3,
    FileCheck,
    ChevronDown
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { deleteEvaluationSubmissionAction } from "@/features/teacher/actions/evaluationActions";
import { EvaluationStats } from "./EvaluationStats";
import { EvaluationReportPDF } from "./EvaluationReportPDF";
import { exportEvaluationSubmissionsToExcel } from "@/lib/export-utils";
import { toast } from "sonner";

interface SubmissionsManagerProps {
    courseId: string;
    attempt: any;
    submissions: any[];
    courseName: string;
    teacherName: string;
    institutionName: string;
}

const BUCKET_LABELS = [
    { label: "0.0 – 1.0", cat: "Crítico", color: "bg-red-500", text: "text-red-500" },
    { label: "1.0 – 2.0", cat: "Bajo", color: "bg-orange-500", text: "text-orange-500" },
    { label: "2.0 – 3.0", cat: "Insuficiente", color: "bg-amber-500", text: "text-amber-500" },
    { label: "3.0 – 4.0", cat: "Aceptable", color: "bg-emerald-500", text: "text-emerald-500" },
    { label: "4.0 – 5.0", cat: "Excelente", color: "bg-teal-500", text: "text-teal-500" },
];

export function SubmissionsManager({
    courseId,
    attempt,
    submissions,
    courseName,
    teacherName,
    institutionName
}: SubmissionsManagerProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "in_progress" | "passed" | "failed" | "expulsions">("all");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Statistics Calculations
    const totalStudents = submissions.length;
    const submittedSubmissions = useMemo(() => submissions.filter(s => s.submittedAt), [submissions]);
    const submittedCount = submittedSubmissions.length;
    const inProgressCount = totalStudents - submittedCount;
    const scores = useMemo(() => submittedSubmissions.map(s => Number(s.score) || 0), [submittedSubmissions]);
    const avgScore = scores.length > 0 ? (scores.reduce((acc, s) => acc + s, 0) / scores.length) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 3.0).length;
    const failCount = scores.filter(s => s < 3.0).length;
    const passRate = submittedCount > 0 ? (passCount / submittedCount) * 100 : 0;
    const totalExpulsions = submissions.reduce((acc, s) => acc + (s.expulsions || 0), 0);
    const totalQuestions = attempt.evaluation?.questions?.length || 0;

    // Distribution Buckets
    const buckets = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        scores.forEach(score => {
            const idx = Math.min(Math.floor(score), 4);
            counts[idx]++;
        });
        return counts;
    }, [scores]);

    // Live Filtering
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const studentName = formatName(sub.user?.name, sub.user?.profile).toLowerCase();
            const email = (sub.user?.email || "").toLowerCase();
            const query = searchQuery.toLowerCase().trim();

            const matchesSearch = !query || studentName.includes(query) || email.includes(query);
            if (!matchesSearch) return false;

            const isSubmitted = Boolean(sub.submittedAt);
            const score = Number(sub.score || 0);

            if (statusFilter === "submitted") return isSubmitted;
            if (statusFilter === "in_progress") return !isSubmitted;
            if (statusFilter === "passed") return isSubmitted && score >= 3.0;
            if (statusFilter === "failed") return isSubmitted && score < 3.0;
            if (statusFilter === "expulsions") return (sub.expulsions || 0) > 0;
            return true;
        });
    }, [submissions, searchQuery, statusFilter]);

    // PDF Export Handler
    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const { pdf } = await import("@react-pdf/renderer");
            const blob = await pdf(
                <EvaluationReportPDF
                    appTitle={institutionName || "SmartClass"}
                    courseName={courseName}
                    teacherName={teacherName}
                    evaluationTitle={attempt.evaluation?.title || "Evaluación"}
                    startTime={attempt.startTime}
                    endTime={attempt.endTime}
                    submissions={submissions}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeTitle = (attempt.evaluation?.title || "Evaluacion").replace(/[^a-zA-Z0-9_\-]/g, "_");
            link.download = `Reporte_Evaluacion_${safeTitle}_${new Date().toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("Reporte corporativo en PDF descargado exitosamente");
        } catch (error: any) {
            console.error("Error al exportar PDF:", error);
            toast.error("No se pudo generar el reporte en PDF");
        } finally {
            setIsExportingPdf(false);
        }
    };

    // Excel Export Handler
    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            await exportEvaluationSubmissionsToExcel({
                institutionName: institutionName || "SmartClass",
                courseName,
                teacherName,
                evaluationTitle: attempt.evaluation?.title || "Evaluación",
                startTime: attempt.startTime,
                endTime: attempt.endTime,
                submissions,
                totalQuestions,
            });
            toast.success("Consolidado institucional en Excel descargado exitosamente");
        } catch (error: any) {
            console.error("Error al exportar Excel:", error);
            toast.error("No se pudo generar el archivo Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const isExporting = isExportingPdf || isExportingExcel;

    return (
        <div className="space-y-6">
            {/* ─── 1. Header Ejecutivo y Barra de Acciones ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/70 shadow-xs backdrop-blur-xs">
                <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{courseName}</span>
                        <span>•</span>
                        <span>Docente: <strong className="text-foreground">{teacherName}</strong></span>
                        <span>•</span>
                        <span>{institutionName}</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
                        {attempt.evaluation?.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <Badge variant="outline" className="text-xs font-mono font-medium gap-1.5 py-0.5 px-2 bg-muted/40">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDateTime(attempt.startTime)} – {formatDateTime(attempt.endTime)}</span>
                        </Badge>

                        {Array.isArray(attempt.assignedStudentIds) && attempt.assignedStudentIds.length > 0 ? (
                            <Badge variant="outline" className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1.5 py-0.5 px-2">
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Asignada a {attempt.assignedStudentIds.length} {attempt.assignedStudentIds.length === 1 ? "estudiante" : "estudiantes"}</span>
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30 gap-1.5 py-0.5 px-2">
                                <Users className="h-3.5 w-3.5" />
                                <span>Asignada a toda la ficha</span>
                            </Badge>
                        )}

                        <Badge variant="secondary" className="text-xs font-mono py-0.5 px-2">
                            {totalQuestions} {totalQuestions === 1 ? "pregunta" : "preguntas"}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
                    {/* Botón de Exportación Corporativa con Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isExporting}
                                className="h-9 px-3.5 gap-2 font-bold shadow-xs hover:border-primary/50 transition-all cursor-pointer"
                            >
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                    <Download className="h-4 w-4 text-primary" />
                                )}
                                <span>Exportar Reporte</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1.5">
                            <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                                Reportes Oficiales
                            </DropdownMenuLabel>
                            <DropdownMenuItem 
                                onClick={handleExportPdf} 
                                disabled={isExportingPdf}
                                className="gap-2.5 py-2 cursor-pointer font-medium"
                            >
                                <div className="p-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold">Reporte en PDF (.pdf)</span>
                                    <span className="text-[10px] text-muted-foreground">Informe ejecutivo de 3 páginas</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={handleExportExcel} 
                                disabled={isExportingExcel}
                                className="gap-2.5 py-2 cursor-pointer font-medium"
                            >
                                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <FileSpreadsheet className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold">Consolidado en Excel (.xlsx)</span>
                                    <span className="text-[10px] text-muted-foreground">Resultados y distribución</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Botón Volver a Evaluaciones */}
                    <Button variant="default" size="sm" asChild className="h-9 px-3.5 gap-1.5 font-bold shadow-xs cursor-pointer">
                        <Link href={`/dashboard/teacher/courses/${courseId}?tab=evaluations`}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Volver a Evaluaciones</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ─── 2. Franja Superior de Indicadores Clave (5 KPIs) ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
                {/* Total Inscritos */}
                <Card className="border-border/70 bg-card shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Inscritos</p>
                            <p className="text-2xl font-black text-foreground mt-0.5">{totalStudents}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Estudiantes asignados</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Entregas Recibidas */}
                <Card className="border-border/70 bg-card shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Entregas</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-2xl font-black text-foreground">{submittedCount}</span>
                                <span className="text-xs text-muted-foreground font-semibold">/ {totalStudents}</span>
                            </div>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                                {totalStudents > 0 ? ((submittedCount / totalStudents) * 100).toFixed(0) : 0}% participación
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Nota Promedio */}
                <Card className="border-border/70 bg-card shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nota Promedio</p>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={`text-2xl font-black ${avgScore >= 3.0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                    {avgScore > 0 ? avgScore.toFixed(2) : "0.00"}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">/ 5.0</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {submittedCount > 0 ? `${submittedCount} entregas calificadas` : "Sin entregas aún"}
                            </p>
                        </div>
                        <div className={`p-2.5 rounded-xl border ${avgScore >= 3.0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                            <Award className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Tasa de Aprobación */}
                <Card className="border-border/70 bg-card shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Aprobación</p>
                            <p className="text-2xl font-black text-foreground mt-0.5">
                                {passRate.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                <strong className="text-emerald-600 font-bold">{passCount}</strong> aprobados • <strong className="text-red-500 font-bold">{failCount}</strong> rep.
                            </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Incidentes / Expulsiones */}
                <Card className="border-border/70 bg-card shadow-2xs col-span-2 sm:col-span-1">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Integridad</p>
                            <p className={`text-2xl font-black mt-0.5 ${totalExpulsions > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {totalExpulsions}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {totalExpulsions > 0 ? "Expulsiones registradas" : "Sin incidentes"}
                            </p>
                        </div>
                        <div className={`p-2.5 rounded-xl border ${totalExpulsions > 0 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── 3. Layout Principal de 2 Columnas (Aprovecha Espacio Lateral en xl+) ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* ═══ COLUMNA PRINCIPAL (8 columnas): Listado de Estudiantes con Buscador y Filtros ═══ */}
                <div className="xl:col-span-8 space-y-4">
                    <Card className="border-border/70 shadow-xs">
                        <CardHeader className="p-4 sm:p-5 border-b border-border/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold">Listado de Estudiantes</CardTitle>
                                        <Badge variant="secondary" className="font-mono text-xs font-bold">
                                            {filteredSubmissions.length} de {submissions.length}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs mt-0.5">
                                        Gestiona las entregas, revisa respuestas en detalle o administra permisos.
                                    </CardDescription>
                                </div>

                                {/* Buscador en tiempo real */}
                                <div className="relative w-full sm:w-64 shrink-0">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre o correo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-9 pl-9 pr-3 text-xs bg-muted/30 focus:bg-background"
                                    />
                                </div>
                            </div>

                            {/* Filtros rápidos por estado */}
                            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-none">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === "all" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("all")}
                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg"
                                >
                                    Todos ({submissions.length})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === "submitted" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("submitted")}
                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1"
                                >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    <span>Enviados ({submittedCount})</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === "in_progress" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("in_progress")}
                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1"
                                >
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    <span>En progreso ({inProgressCount})</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === "passed" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("passed")}
                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 text-emerald-600 dark:text-emerald-400"
                                >
                                    Aprobados ({passCount})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === "failed" ? "default" : "outline"}
                                    onClick={() => setStatusFilter("failed")}
                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 text-red-500"
                                >
                                    Reprobados ({failCount})
                                </Button>
                                {totalExpulsions > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={statusFilter === "expulsions" ? "destructive" : "outline"}
                                        onClick={() => setStatusFilter("expulsions")}
                                        className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1"
                                    >
                                        <ShieldAlert className="h-3 w-3" />
                                        <span>Con Expulsión</span>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground pl-4 sm:pl-6">Estudiante</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Respuestas</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Nota / 5.0</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Expulsiones</TableHead>
                                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground pr-4 sm:pr-6">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSubmissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center justify-center space-y-2">
                                                        <AlertCircle className="h-8 w-8 opacity-30 text-muted-foreground" />
                                                        <p className="font-medium text-sm">No se encontraron entregas que coincidan con la búsqueda o filtro.</p>
                                                        {(searchQuery || statusFilter !== "all") && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                                                className="text-xs h-7 mt-1 cursor-pointer"
                                                            >
                                                                Limpiar filtros
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSubmissions.map((sub: any) => {
                                                const studentName = formatName(sub.user?.name, sub.user?.profile);
                                                const isSubmitted = Boolean(sub.submittedAt);
                                                const score = sub.score !== null ? Number(sub.score) : null;
                                                const isPassing = score !== null && score >= 3.0;
                                                const answersCount = sub._count?.answersList || 0;
                                                const expulsions = sub.expulsions || 0;

                                                return (
                                                    <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                                                        {/* Estudiante con Avatar */}
                                                        <TableCell className="pl-4 sm:pl-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                                                    {getInitials(studentName)}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-bold text-sm text-foreground truncate">{studentName}</span>
                                                                    <span className="text-xs text-muted-foreground truncate">{sub.user?.email}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Estado de Entrega */}
                                                        <TableCell className="py-3">
                                                            {isSubmitted ? (
                                                                <div className="flex flex-col">
                                                                    <Badge variant="outline" className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2 py-0.5 w-fit">
                                                                        Enviado
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                                        {formatDateTime(sub.submittedAt, "dd/MM HH:mm")}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-2 py-0.5 w-fit">
                                                                    En progreso
                                                                </Badge>
                                                            )}
                                                        </TableCell>

                                                        {/* Respuestas contestadas */}
                                                        <TableCell className="text-center py-3">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs font-mono font-bold text-foreground">
                                                                    {answersCount} / {totalQuestions}
                                                                </span>
                                                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                                                    <div 
                                                                        className="h-full bg-primary rounded-full" 
                                                                        style={{ width: `${totalQuestions > 0 ? Math.min((answersCount / totalQuestions) * 100, 100) : 0}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Nota Final */}
                                                        <TableCell className="text-center py-3">
                                                            {isSubmitted && score !== null ? (
                                                                <div className="inline-flex flex-col items-center">
                                                                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                                                                        isPassing 
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                                                    }`}>
                                                                        {score.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground font-mono">—</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Expulsiones */}
                                                        <TableCell className="text-center py-3">
                                                            {expulsions > 0 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                                    {expulsions}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground font-mono">0</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Acciones */}
                                                        <TableCell className="text-right pr-4 sm:pr-6 py-3">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {isSubmitted && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Ver Respuestas del Estudiante"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                                                                        asChild
                                                                    >
                                                                        <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}/submissions/${sub.id}`}>
                                                                            <Eye className="h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                )}
                                                                
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                                                            title="Eliminar Entrega"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <form
                                                                            action={async () => {
                                                                                setIsDeleting(true);
                                                                                try {
                                                                                    await deleteEvaluationSubmissionAction(sub.id, courseId);
                                                                                    toast.success("Entrega eliminada correctamente");
                                                                                } catch (err: any) {
                                                                                    toast.error("Error al eliminar la entrega");
                                                                                } finally {
                                                                                    setIsDeleting(false);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <DialogHeader>
                                                                                <DialogTitle>Eliminar Entrega de {studentName}</DialogTitle>
                                                                                <DialogDescription>
                                                                                    ¿Estás completamente seguro de eliminar esta entrega? Esta acción eliminará las respuestas y notas registradas, permitiéndole al estudiante presentar la evaluación nuevamente.
                                                                                </DialogDescription>
                                                                            </DialogHeader>
                                                                            <DialogFooter className="mt-4">
                                                                                <Button type="submit" variant="destructive" disabled={isDeleting} className="cursor-pointer">
                                                                                    {isDeleting ? "Eliminando..." : "Sí, eliminar entrega"}
                                                                                </Button>
                                                                            </DialogFooter>
                                                                        </form>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ═══ PANEL LATERAL (4 columnas): Métricas, Distribución y Reportes Corporativos ═══ */}
                <div className="xl:col-span-4 space-y-5">
                    {/* Tarjeta Lateral 1: Desempeño y Rendimiento */}
                    <Card className="border-border/70 shadow-xs">
                        <CardHeader className="p-4 sm:p-5 pb-3">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span>Rendimiento Académico</span>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {submittedCount} calificados
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Resumen proporcional de aprobación de la prueba.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                            {/* Barra apilada visual de Aprobación */}
                            <div className="space-y-1.5">
                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                    <div 
                                        style={{ width: `${passRate}%` }} 
                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                        title={`Aprobados: ${passRate.toFixed(1)}%`}
                                    />
                                    <div 
                                        style={{ width: `${submittedCount > 0 ? (failCount / submittedCount) * 100 : 0}%` }} 
                                        className="h-full bg-red-500 transition-all duration-500" 
                                        title={`Reprobados: ${submittedCount > 0 ? ((failCount / submittedCount) * 100).toFixed(1) : 0}%`}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {passCount} Aprobados ({passRate.toFixed(0)}%)
                                    </span>
                                    <span className="flex items-center gap-1.5 text-red-500">
                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                        {failCount} Reprobados
                                    </span>
                                </div>
                            </div>

                            {/* Desglose de notas extremas */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nota Máxima</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {scores.length > 0 ? maxScore.toFixed(2) : "—"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nota Mínima</p>
                                    <p className="text-xl font-black text-red-500 mt-0.5">
                                        {scores.length > 0 ? minScore.toFixed(2) : "—"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta Lateral 2: Distribución por Rangos de Calificación */}
                    <Card className="border-border/70 shadow-xs">
                        <CardHeader className="p-4 sm:p-5 pb-3">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span>Distribución de Calificaciones</span>
                                <BarChart3 className="h-4 w-4 text-primary" />
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Frecuencia de notas en la escala de 0.0 a 5.0.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
                            {BUCKET_LABELS.map((b, i) => {
                                const count = buckets[i];
                                const maxB = Math.max(...buckets, 1);
                                const pct = submittedCount > 0 ? (count / submittedCount) * 100 : 0;

                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-mono font-bold ${b.text}`}>{b.label}</span>
                                                <span className="text-[10px] text-muted-foreground">({b.cat})</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                <strong className="text-foreground font-bold">{count}</strong>
                                                <span className="text-[10px] text-muted-foreground">({pct.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${b.color}`}
                                                style={{ width: `${count > 0 ? Math.max((count / maxB) * 100, 4) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Tarjeta Lateral 3: Accesos Rápidos de Reportes y Auditoría */}
                    <Card className="border-border/70 shadow-xs bg-gradient-to-br from-card via-card to-muted/30">
                        <CardHeader className="p-4 sm:p-5 pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-primary" />
                                <span>Reportes Corporativos</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Descarga los consolidados oficiales para archivo institucional o auditoría de notas.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportPdf}
                                disabled={isExportingPdf}
                                className="w-full justify-start h-9 text-xs font-bold gap-2.5 border-border/80 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-600 transition-all cursor-pointer"
                            >
                                {isExportingPdf ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="h-4 w-4 text-red-500" />
                                )}
                                <span>Descargar Informe en PDF (.pdf)</span>
                            </Button>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportExcel}
                                disabled={isExportingExcel}
                                className="w-full justify-start h-9 text-xs font-bold gap-2.5 border-border/80 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-all cursor-pointer"
                            >
                                {isExportingExcel ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                )}
                                <span>Descargar Libro en Excel (.xlsx)</span>
                            </Button>

                            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Formato Estándar LMS</span>
                                <span className="font-semibold text-primary">{institutionName}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ─── 4. Sección Inferior: Análisis Estadístico Avanzado, Preguntas e IA ─── */}
            <div className="pt-4 border-t border-border/70 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <span>Análisis Estadístico Avanzado y Preguntas</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Explora gráficos detallados, rendimiento por pregunta, detección de plagio e insights con IA.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-xs">
                    <EvaluationStats
                        submissions={submissions}
                        totalQuestions={totalQuestions}
                        questions={attempt.evaluation?.questions || []}
                        evaluationId={attempt.evaluationId}
                        attemptId={attempt.id}
                        courseId={courseId}
                        courseName={courseName}
                        teacherName={teacherName}
                    />
                </div>
            </div>
        </div>
    );
}
