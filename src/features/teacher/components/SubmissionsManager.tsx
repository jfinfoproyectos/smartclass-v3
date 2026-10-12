"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { formatDateTime, formatDurationHMS, formatDurationHuman } from "@/lib/dateUtils";
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
    ChevronDown,
    Gavel,
    RefreshCw,
    Activity,
    Tv,
    ExternalLink,
    Globe,
    History,
    Laptop,
    Smartphone,
    Pencil
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
import { deleteEvaluationSubmissionAction, getAttemptSubmissionsAction } from "@/features/teacher/actions/evaluationActions";
import { EvaluationStats } from "./EvaluationStats";
import { EvaluationReportPDF } from "./EvaluationReportPDF";
import { exportEvaluationSubmissionsToExcel } from "@/lib/export-utils";
import { SubmissionPenaltyDialog } from "./SubmissionPenaltyDialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { TeacherStudentMessageDialog } from "./TeacherStudentMessageDialog";
import { TeacherBroadcastMessageDialog } from "./TeacherBroadcastMessageDialog";
import { EvaluationLockToggleButton } from "./EvaluationLockToggleButton";
import { ManualEvaluationGradeDialog } from "./ManualEvaluationGradeDialog";

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
    const [currentSubmissions, setCurrentSubmissions] = useState<any[]>(submissions);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "assigned_targets" | "previous_batch" | "not_started" | "submitted" | "in_progress" | "passed" | "failed" | "expulsions" | "multiple_ips" | "fraud_attempts">("all");
    const [selectedIpDetails, setSelectedIpDetails] = useState<{ studentName: string; sub: any; wildcards: any } | null>(null);
    const [selectedFraudDetails, setSelectedFraudDetails] = useState<{ studentName: string; sub: any; fraudAttempts: any[] } | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const isRefreshingRef = useRef(false);
    isRefreshingRef.current = isRefreshing;

    const lastEventTimeRef = useRef(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sincronizar si cambia el prop submissions
    useEffect(() => {
        setCurrentSubmissions(submissions);
    }, [submissions]);

    // Función para refrescar entregas en tiempo real
    const fetchSubmissions = useCallback(async (isManual = false) => {
        if (isRefreshingRef.current) return;
        setIsRefreshing(true);
        try {
            const res = await getAttemptSubmissionsAction(attempt.id);
            if (res.success && res.submissions) {
                setCurrentSubmissions(res.submissions);
                setLastRefreshedAt(new Date());
                if (isManual) {
                    toast.success("Avance actualizado con éxito", { duration: 2500 });
                }
            } else if (isManual) {
                toast.error(res.error || "No se pudo actualizar el avance");
            }
        } catch (err: any) {
            console.error("Error al refrescar avance:", err);
            if (isManual) {
                toast.error("Error al sincronizar con el servidor");
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [attempt.id]);

    // Conexión Server-Sent Events (SSE) para actualizaciones instantáneas en tiempo real
    useEffect(() => {
        if (!isMounted || !attempt?.id) return;

        let eventSource: EventSource | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;

        const connectSSE = () => {
            try {
                eventSource = new EventSource(`/api/evaluations/${attempt.id}/events`);

                eventSource.onopen = () => {
                    setIsLiveConnected(true);
                };

                eventSource.addEventListener("connected", () => {
                    setIsLiveConnected(true);
                });

                eventSource.addEventListener("evaluation-updated", (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data?.type === "TIME_LIMIT_EXCEEDED") {
                            toast.warning("Alerta de Tiempo Fuera Superado", {
                                description: data.message || "Un estudiante ha excedido el tiempo acumulado permitido fuera de la prueba.",
                                duration: 6000,
                            });
                        } else if (data?.type === "MULTIPLE_IP_DETECTED") {
                            toast.error("🚨 Alerta de Múltiples Direcciones IP", {
                                description: data.message || "Se ha detectado presentación desde más de una ubicación o dirección IP.",
                                duration: 10000,
                            });
                        } else if (data?.type === "CONCURRENT_SESSION_DETECTED") {
                            toast.error("🚨 Alerta de Sesiones Simultáneas / Dispositivos", {
                                description: data.message || "Se ha detectado la prueba abierta en múltiples dispositivos o navegadores a la vez.",
                                duration: 10000,
                            });
                        } else if (data?.type === "FRAUD_ATTEMPT_DETECTED") {
                            toast.error("🚨 Alerta de Intento de Fraude", {
                                description: data.message || "Un estudiante intentó solicitar la respuesta o solución durante el examen.",
                                duration: 10000,
                            });
                        }
                    } catch {}

                    const now = Date.now();
                    // Debounce de 350ms para evitar avalancha de peticiones
                    if (now - lastEventTimeRef.current > 350) {
                        lastEventTimeRef.current = now;
                        fetchSubmissions(false);
                    }
                });

                eventSource.addEventListener("teacher-message", () => {
                    fetchSubmissions(false);
                });

                eventSource.onerror = () => {
                    setIsLiveConnected(false);
                    if (eventSource) {
                        eventSource.close();
                        eventSource = null;
                    }
                    reconnectTimeout = setTimeout(connectSSE, 4000);
                };
            } catch (err) {
                console.error("Error al conectar SSE en panel docente:", err);
                setIsLiveConnected(false);
                reconnectTimeout = setTimeout(connectSSE, 5000);
            }
        };

        connectSSE();

        // Polling de respaldo cada 12 segundos para entornos serverless (Vercel)
        const pollingTimer = setInterval(() => {
            fetchSubmissions(false);
        }, 12000);

        return () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            clearInterval(pollingTimer);
        };
    }, [isMounted, attempt?.id, fetchSubmissions]);

    // Selective Assignment Helpers
    const assignedIds: string[] = useMemo(() => {
        return Array.isArray(attempt?.assignedStudentIds)
            ? attempt.assignedStudentIds
            : typeof attempt?.assignedStudentIds === "string"
                ? JSON.parse(attempt.assignedStudentIds)
                : [];
    }, [attempt?.assignedStudentIds]);
    const isSelectiveAssignment = assignedIds.length > 0;

    // Statistics Calculations
    const totalStudents = currentSubmissions.length;
    const notStartedCount = useMemo(() => currentSubmissions.filter(s => s.isNotStarted).length, [currentSubmissions]);
    const submittedSubmissions = useMemo(() => currentSubmissions.filter(s => s.submittedAt), [currentSubmissions]);
    const submittedCount = submittedSubmissions.length;
    const inProgressCount = useMemo(() => currentSubmissions.filter(s => !s.submittedAt && !s.isNotStarted).length, [currentSubmissions]);
    const currentAssignedCount = useMemo(() => currentSubmissions.filter(s => s.isAssignedTarget).length, [currentSubmissions]);
    const previousBatchCount = useMemo(() => currentSubmissions.filter(s => !s.isAssignedTarget).length, [currentSubmissions]);
    const scores = useMemo(() => submittedSubmissions.map(s => Number(s.score) || 0), [submittedSubmissions]);
    const avgScore = scores.length > 0 ? (scores.reduce((acc, s) => acc + s, 0) / scores.length) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 3.0).length;
    const failCount = scores.filter(s => s < 3.0).length;
    const passRate = submittedCount > 0 ? (passCount / submittedCount) * 100 : 0;
    const totalExpulsions = currentSubmissions.reduce((acc, s) => acc + (s.expulsions || 0), 0);
    const totalQuestions = attempt.evaluation?.questions?.length || 0;

    // Conteo de estudiantes con alerta de múltiples IPs
    const studentsWithMultipleIps = useMemo(() => {
        return currentSubmissions.filter((sub: any) => {
            const wildcards = typeof sub.wildcardsUsed === 'string'
                ? JSON.parse(sub.wildcardsUsed)
                : (sub.wildcardsUsed as any) || {};
            const ips = Array.isArray(wildcards.effectiveIps || wildcards.detectedIps)
                ? (wildcards.effectiveIps || wildcards.detectedIps)
                : [];
            return Boolean(wildcards.multipleIpAlert || ips.length > 1);
        });
    }, [currentSubmissions]);
    const multipleIpsCount = studentsWithMultipleIps.length;

    // Conteo de estudiantes con intentos de fraude / evasión detectados
    const studentsWithFraudAttempts = useMemo(() => {
        return currentSubmissions.filter((sub: any) => {
            const wildcards = typeof sub.wildcardsUsed === 'string'
                ? JSON.parse(sub.wildcardsUsed)
                : (sub.wildcardsUsed as any) || {};
            const fraudAttempts = Array.isArray(wildcards.fraudAttempts) ? wildcards.fraudAttempts : [];
            return Boolean(wildcards.hasFraudAlert || fraudAttempts.length > 0);
        });
    }, [currentSubmissions]);
    const fraudAttemptsCount = studentsWithFraudAttempts.length;

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
        return currentSubmissions.filter(sub => {
            const studentName = formatName(sub.user?.name, sub.user?.profile).toLowerCase();
            const email = (sub.user?.email || "").toLowerCase();
            const query = searchQuery.toLowerCase().trim();

            const matchesSearch = !query || studentName.includes(query) || email.includes(query);
            if (!matchesSearch) return false;

            const isSubmitted = Boolean(sub.submittedAt);
            const score = Number(sub.score || 0);

            if (statusFilter === "assigned_targets") return Boolean(sub.isAssignedTarget);
            if (statusFilter === "previous_batch") return !sub.isAssignedTarget;
            if (statusFilter === "not_started") return Boolean(sub.isNotStarted);
            if (statusFilter === "submitted") return isSubmitted;
            if (statusFilter === "in_progress") return !isSubmitted && !sub.isNotStarted;
            if (statusFilter === "passed") return isSubmitted && score >= 3.0;
            if (statusFilter === "failed") return isSubmitted && score < 3.0;
            if (statusFilter === "expulsions") return (sub.expulsions || 0) > 0;
            if (statusFilter === "multiple_ips") {
                const wildcards = typeof sub.wildcardsUsed === 'string'
                    ? JSON.parse(sub.wildcardsUsed)
                    : (sub.wildcardsUsed as any) || {};
                const ips = Array.isArray(wildcards.effectiveIps || wildcards.detectedIps)
                    ? (wildcards.effectiveIps || wildcards.detectedIps)
                    : [];
                return Boolean(wildcards.multipleIpAlert || ips.length > 1);
            }
            if (statusFilter === "fraud_attempts") {
                const wildcards = typeof sub.wildcardsUsed === 'string'
                    ? JSON.parse(sub.wildcardsUsed)
                    : (sub.wildcardsUsed as any) || {};
                const fraudAttempts = Array.isArray(wildcards.fraudAttempts) ? wildcards.fraudAttempts : [];
                return Boolean(wildcards.hasFraudAlert || fraudAttempts.length > 0);
            }
            return true;
        });
    }, [currentSubmissions, searchQuery, statusFilter]);

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
                    submissions={currentSubmissions}
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
                submissions: currentSubmissions,
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
        <TooltipProvider delayDuration={150}>
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

                        {/* Botón Volver a Evaluaciones con Tooltip */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="default" size="sm" asChild className="h-9 px-3.5 gap-1.5 font-bold shadow-xs cursor-pointer">
                                    <Link href={`/dashboard/teacher/courses/${courseId}?tab=evaluations`}>
                                        <ArrowLeft className="h-4 w-4" />
                                        <span>Volver a Evaluaciones</span>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>Regresar al listado general de evaluaciones del curso</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* ─── 1.1 Barra de Control de Monitoreo en Vivo & Refresco ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 px-4 rounded-xl bg-card border border-border/80 shadow-2xs">
                    {/* Botones de Lanzamiento a Nuevas Pestañas: Panel Profesor & Proyector en Clase */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        {/* 1. Panel del Profesor (Nueva Pestaña) */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    asChild
                                    className="h-8.5 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer transition-all"
                                >
                                    <Link
                                        href={`/evaluations/${attempt.id}/live?courseId=${courseId}&mode=teacher`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Activity className="h-3.5 w-3.5" />
                                        <span>Panel Docente</span>
                                        <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                <p>Abrir panel de supervisión en una nueva pestaña (Respuestas, alertas y notas)</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* 2. Proyector en Clase para Estudiantes (Nueva Pestaña) */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="h-8.5 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-xs cursor-pointer transition-all"
                                >
                                    <Link
                                        href={`/evaluations/${attempt.id}/live?courseId=${courseId}&mode=projector`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Tv className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Proyector Aula</span>
                                        <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                <p>Abrir modo proyector en nueva pestaña para los alumnos (Reloj gigante, avance grupal y privacidad)</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* 3. Mensaje Global a Todos los Estudiantes */}
                        <TeacherBroadcastMessageDialog
                            attemptId={attempt.id}
                            evaluationId={attempt.evaluationId}
                            evaluationTitle={attempt.evaluation?.title}
                        />

                        {/* 4. Bloquear / Desbloquear Evaluación en Vivo */}
                        <EvaluationLockToggleButton
                            attemptId={attempt.id}
                            initialIsLocked={attempt.isLocked}
                            courseId={courseId}
                        />
                    </div>

                    {/* Controles de Refresco Periódico y Manual con SSE */}
                    <div className="flex items-center gap-2.5 flex-wrap justify-end">
                        {/* Estado SSE en tiempo real */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold select-none transition-colors ${
                                    isLiveConnected 
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                        : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                }`}>
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                                    <span className="font-bold">{isLiveConnected ? "SSE en vivo" : "Reconectando..."}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs max-w-xs">
                                <p className="font-bold">{isLiveConnected ? "Sincronización en Vivo SSE Activa" : "Conectando al canal de eventos"}</p>
                                <p className="text-muted-foreground text-[11px] mt-0.5">
                                    {isLiveConnected 
                                        ? "Las respuestas, salidas de pantalla, alertas de tiempo y entregas de los alumnos se actualizan al instante vía Server-Sent Events." 
                                        : "Intentando conectar con el servidor para recibir actualizaciones instantáneas."}
                                </p>
                            </TooltipContent>
                        </Tooltip>



                        {/* Botón Refrescar Manual en cualquier momento */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchSubmissions(true)}
                                    disabled={isRefreshing}
                                    className="h-8 text-xs px-3 gap-1.5 font-bold shadow-2xs hover:border-primary/50 cursor-pointer"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
                                    <span>{isRefreshing ? "Actualizando..." : "Refrescar"}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                <p>Sincronizar el avance en tiempo real desde el servidor</p>
                                {lastRefreshedAt && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                        Última sincronización: {formatDateTime(lastRefreshedAt, "HH:mm:ss")}
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>

                        {/* Indicador de última actualización sutil */}
                        {lastRefreshedAt && (
                            <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline-block">
                                {isLiveConnected ? "Sync: SSE en vivo" : `Sync: ${formatDateTime(lastRefreshedAt, "HH:mm:ss")}`}
                            </span>
                        )}
                    </div>
                </div>

                {/* ─── 2. Franja Superior de Indicadores Clave (5 KPIs) con Tooltips ─── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
                    {/* Total Inscritos */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-border/70 bg-card shadow-2xs hover:border-primary/40 transition-colors cursor-default">
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
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Total de estudiantes matriculados o habilitados para presentar esta evaluación</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Entregas Recibidas */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-border/70 bg-card shadow-2xs hover:border-emerald-500/40 transition-colors cursor-default">
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
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{submittedCount} de {totalStudents} convocados completaron su entrega ({totalStudents > 0 ? ((submittedCount / totalStudents) * 100).toFixed(1) : 0}%)</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Nota Promedio */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-border/70 bg-card shadow-2xs hover:border-primary/40 transition-colors cursor-default">
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
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Promedio ponderado de las notas obtenidas en esta evaluación</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Tasa de Aprobación */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-border/70 bg-card shadow-2xs hover:border-violet-500/40 transition-colors cursor-default">
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
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Porcentaje de estudiantes con nota igual o superior a 3.0 sobre el total evaluado</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Incidentes / Expulsiones */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-border/70 bg-card shadow-2xs col-span-2 sm:col-span-1 hover:border-red-500/40 transition-colors cursor-default">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Integridad</p>
                                        <p className={`text-2xl font-black mt-0.5 ${(totalExpulsions > 0 || multipleIpsCount > 0) ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                            {totalExpulsions + multipleIpsCount}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {multipleIpsCount > 0 
                                                ? `${multipleIpsCount} con alerta de IPs` 
                                                : totalExpulsions > 0 
                                                    ? `${totalExpulsions} salidas / faltas` 
                                                    : "Sin incidentes"}
                                        </p>
                                    </div>
                                    <div className={`p-2.5 rounded-xl border ${(totalExpulsions > 0 || multipleIpsCount > 0) ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                                        <ShieldAlert className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{totalExpulsions > 0 ? `Total de salidas de pantalla, pérdida de foco o sospechas de fraude registradas` : "Sin incidentes de pérdida de foco registrados"}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

            {/* ─── 3. Contenido Principal: Layout de 2 Columnas de Entregas y Estadísticas ─── */}
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
                                                {filteredSubmissions.length} de {currentSubmissions.length}
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

                            {/* Filtros rápidos por estado con Tooltips */}
                            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-none">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={statusFilter === "all" ? "default" : "outline"}
                                            onClick={() => setStatusFilter("all")}
                                            className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg"
                                        >
                                            Todos ({currentSubmissions.length})
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Mostrar todas las entregas registradas</p>
                                    </TooltipContent>
                                </Tooltip>

                                {isSelectiveAssignment && (
                                    <>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={statusFilter === "assigned_targets" ? "default" : "outline"}
                                                    onClick={() => setStatusFilter("assigned_targets")}
                                                    className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/15"
                                                >
                                                    <UserCheck className="h-3 w-3 text-blue-500" />
                                                    <span>Destinatarios Actuales ({currentAssignedCount})</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p>Ver exclusivamente los estudiantes asignados a esta programación ({assignedIds.length} alumnos)</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        {previousBatchCount > 0 && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={statusFilter === "previous_batch" ? "default" : "outline"}
                                                        onClick={() => setStatusFilter("previous_batch")}
                                                        className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 text-muted-foreground"
                                                    >
                                                        <History className="h-3 w-3" />
                                                        <span>Entregas Previas ({previousBatchCount})</span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p>Estudiantes que presentaron en una fecha u horario anterior y no están en los destinatarios de hoy</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </>
                                )}

                                {notStartedCount > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={statusFilter === "not_started" ? "default" : "outline"}
                                                onClick={() => setStatusFilter("not_started")}
                                                className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                            >
                                                <Clock className="h-3 w-3 text-amber-500" />
                                                <span>Sin iniciar ({notStartedCount})</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Estudiantes asignados que aún no han ingresado a resolver la prueba</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                <Tooltip>
                                    <TooltipTrigger asChild>
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
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Filtrar estudiantes que están presentando la prueba actualmente</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
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
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Filtrar únicamente evaluaciones que ya fueron enviadas</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={statusFilter === "passed" ? "default" : "outline"}
                                            onClick={() => setStatusFilter("passed")}
                                            className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 text-emerald-600 dark:text-emerald-400"
                                        >
                                            Aprobados ({passCount})
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Filtrar estudiantes con nota mayor o igual a 3.0</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={statusFilter === "failed" ? "default" : "outline"}
                                            onClick={() => setStatusFilter("failed")}
                                            className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 text-red-500"
                                        >
                                            Reprobados ({failCount})
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Filtrar estudiantes con nota reprobatoria menor a 3.0</p>
                                    </TooltipContent>
                                </Tooltip>

                                {totalExpulsions > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={statusFilter === "expulsions" ? "destructive" : "outline"}
                                                onClick={() => setStatusFilter("expulsions")}
                                                className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1"
                                            >
                                                <ShieldAlert className="h-3 w-3" />
                                                <span>Con Salidas / Faltas</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Filtrar pruebas con alertas de fraude o pérdidas de foco</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                {multipleIpsCount > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={statusFilter === "multiple_ips" ? "destructive" : "outline"}
                                                onClick={() => setStatusFilter("multiple_ips")}
                                                className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400"
                                            >
                                                <Globe className="h-3 w-3 text-rose-500" />
                                                <span>Alerta de IPs ({multipleIpsCount})</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Filtrar pruebas con sospecha de presentación indebida desde 2 o más ubicaciones/IPs</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                {fraudAttemptsCount > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={statusFilter === "fraud_attempts" ? "destructive" : "outline"}
                                                onClick={() => setStatusFilter("fraud_attempts")}
                                                className="h-7 text-xs font-semibold px-2.5 cursor-pointer rounded-lg gap-1 border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                            >
                                                <ShieldAlert className="h-3 w-3 text-red-500" />
                                                <span>Intentos de Fraude ({fraudAttemptsCount})</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Filtrar pruebas donde el estudiante solicitó la solución (&quot;dame la respuesta&quot;, &quot;dime la solución&quot;)</p>
                                        </TooltipContent>
                                    </Tooltip>
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
                                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">Salidas / Faltas</TableHead>
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

                                                const wildcards = typeof sub.wildcardsUsed === 'string'
                                                    ? JSON.parse(sub.wildcardsUsed)
                                                    : (sub.wildcardsUsed as any) || {};
                                                const penalty = wildcards.penalty !== undefined ? Number(wildcards.penalty) : 0;
                                                const baseScore = wildcards.baseScore !== undefined ? Number(wildcards.baseScore) : score;
                                                const penaltyComment = wildcards.penaltyComment || "";
                                                const isManualGrade = Boolean(wildcards.isManualGrade);
                                                const manualGradedBy = wildcards.manualGradedBy || "";
                                                const originalScore = wildcards.originalScore !== undefined ? wildcards.originalScore : null;
                                                const manualGradeComment = wildcards.manualGradeComment || "";
                                                const tabSwitches = wildcards.tabSwitchesCount || 0;
                                                const timeAway = wildcards.totalTimeAwaySeconds || 0;
                                                const subDetectedIps: string[] = Array.isArray(wildcards.effectiveIps || wildcards.detectedIps)
                                                    ? (wildcards.effectiveIps || wildcards.detectedIps)
                                                    : wildcards.initialIp ? [wildcards.initialIp] : [];
                                                const subHasMultipleIps = Boolean(wildcards.multipleIpAlert || subDetectedIps.length > 1);
                                                const activeDevices: any[] = Array.isArray(wildcards.activeDevices) ? wildcards.activeDevices : [];
                                                const isConcurrentLive = Boolean(wildcards.multipleDevicesAlert);
                                                const hasHistoricalDevices = Boolean(wildcards.hadHistoricalMultipleDevices || activeDevices.length > 1);
                                                const subHasMultipleDevices = isConcurrentLive || hasHistoricalDevices;
                                                const fraudAttempts: any[] = Array.isArray(wildcards.fraudAttempts) ? wildcards.fraudAttempts : [];
                                                const subHasFraud = Boolean(wildcards.hasFraudAlert || fraudAttempts.length > 0);

                                                return (
                                                    <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                                                        {/* Estudiante con Avatar */}
                                                        <TableCell className="pl-4 sm:pl-6 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                                                    {getInitials(studentName)}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-sm text-foreground truncate">{studentName}</span>
                                                                        {isSelectiveAssignment && (
                                                                            sub.isAssignedTarget ? (
                                                                                <Badge variant="outline" className="text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 py-0 px-1.5">
                                                                                    Destinatario Actual
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground bg-muted/70 border-border/60 py-0 px-1.5">
                                                                                    Entrega Previa
                                                                                </Badge>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-xs text-muted-foreground truncate">{sub.user?.email}</span>
                                                                            {subDetectedIps.length > 0 && (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setSelectedIpDetails({ studentName, sub, wildcards });
                                                                                            }}
                                                                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer shrink-0 ${
                                                                                                subHasMultipleIps
                                                                                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25 animate-pulse font-bold"
                                                                                                    : "bg-muted/60 text-foreground/80 border-border/70 hover:bg-muted"
                                                                                            }`}
                                                                                        >
                                                                                            <Globe className="w-2.5 h-2.5 opacity-70" />
                                                                                            <span>{subDetectedIps[0]}</span>
                                                                                            {subDetectedIps.length > 1 && (
                                                                                                <span className="font-bold text-rose-600 dark:text-rose-400">+{subDetectedIps.length - 1}</span>
                                                                                            )}
                                                                                        </button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent side="right" className="text-xs">
                                                                                        <p className="font-bold">Dirección IP de conexión:</p>
                                                                                        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                                                                                            {subDetectedIps.join(", ")}
                                                                                        </p>
                                                                                        <p className="text-[10px] text-primary mt-1 font-sans">
                                                                                            Clic para ver timeline forense completo
                                                                                        </p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>

                                                        {/* Estado de Entrega */}
                                                        <TableCell className="py-3">
                                                            {sub.isNotStarted ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex flex-col cursor-default w-fit">
                                                                            <Badge variant="outline" className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-2 py-0.5 w-fit">
                                                                                Sin Iniciar
                                                                            </Badge>
                                                                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                                                Pendiente por entrar
                                                                            </span>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">
                                                                        <p>El estudiante está convocado a esta prueba pero aún no ha ingresado al examen</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : isSubmitted ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex flex-col cursor-default w-fit">
                                                                            <Badge variant="outline" className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2 py-0.5 w-fit">
                                                                                Enviado
                                                                            </Badge>
                                                                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                                                {formatDateTime(sub.submittedAt, "dd/MM HH:mm")}
                                                                            </span>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">
                                                                        <p>Prueba enviada el {formatDateTime(sub.submittedAt, "dd/MM/yyyy HH:mm:ss")}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="cursor-default w-fit">
                                                                            <Badge variant="outline" className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-2 py-0.5 w-fit">
                                                                                En progreso
                                                                            </Badge>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">
                                                                        <p>El estudiante inició la prueba pero aún no ha realizado la entrega definitiva</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </TableCell>

                                                        {/* Respuestas contestadas */}
                                                        <TableCell className="text-center py-3">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex flex-col items-center cursor-default">
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
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p>{answersCount} de {totalQuestions} preguntas respondidas ({totalQuestions > 0 ? Math.round((answersCount / totalQuestions) * 100) : 0}%)</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>

                                                        {/* Nota Final */}
                                                        <TableCell className="text-center py-3">
                                                            <div className="inline-flex flex-col items-center gap-1">
                                                                <ManualEvaluationGradeDialog
                                                                    courseId={courseId}
                                                                    attemptId={attempt.id}
                                                                    submissionId={sub.id}
                                                                    studentId={sub.userId}
                                                                    studentName={studentName}
                                                                    studentEmail={sub.user?.email}
                                                                    currentScore={score}
                                                                    wildcardsUsed={sub.wildcardsUsed}
                                                                    onSuccess={() => fetchSubmissions(false)}
                                                                    trigger={
                                                                        score !== null ? (
                                                                            <button
                                                                                type="button"
                                                                                className={`text-sm font-black px-2.5 py-0.5 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${
                                                                                    isPassing 
                                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                                                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                                                                }`}
                                                                            >
                                                                                {score.toFixed(2)}
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                className="text-xs text-muted-foreground font-mono hover:text-primary hover:bg-primary/10 px-2 py-0.5 rounded border border-dashed border-border/70 hover:border-primary/40 transition-colors cursor-pointer"
                                                                            >
                                                                                — <span className="text-[10px] text-primary font-sans font-bold">+ Asignar</span>
                                                                            </button>
                                                                        )
                                                                    }
                                                                    triggerTooltip={
                                                                        score !== null ? (
                                                                            <div>
                                                                                <p className="font-semibold">{isPassing ? "Nota Aprobatoria (≥ 3.0)" : "Nota Reprobatoria (< 3.0)"}</p>
                                                                                <p className="text-[11px] text-primary font-bold">Clic para modificar nota definitiva manual</p>
                                                                                {penalty > 0 && (
                                                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                                        Nota tras descuento: {baseScore?.toFixed(2)} - {penalty.toFixed(2)} = {score.toFixed(2)}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <p>Clic para asignar una nota definitiva manual a este estudiante</p>
                                                                        )
                                                                    }
                                                                />

                                                                {isManualGrade && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25 px-1.5 py-0.2 rounded cursor-default flex items-center gap-0.5">
                                                                                <Pencil className="w-2.5 h-2.5 shrink-0" />
                                                                                <span>Nota Manual</span>
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-0.5 text-left">
                                                                            <p className="font-bold text-blue-600 dark:text-blue-400">Calificación Asignada Manualmente</p>
                                                                            {manualGradedBy && <p className="text-[11px]">Por: {manualGradedBy}</p>}
                                                                            {originalScore !== null && <p className="text-[11px] text-muted-foreground">Nota previa: {Number(originalScore).toFixed(2)}</p>}
                                                                            {manualGradeComment && <p className="text-[11px] italic text-foreground pt-0.5">&quot;{manualGradeComment}&quot;</p>}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {penalty > 0 && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span 
                                                                                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded cursor-default"
                                                                            >
                                                                                <Gavel className="w-2.5 h-2.5 shrink-0" />
                                                                                <span>-{penalty.toFixed(1)}</span>
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-1">
                                                                            <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                                <Gavel className="w-3.5 h-3.5" />
                                                                                Descuento por Penalización
                                                                            </p>
                                                                            <div className="text-[11px] space-y-0.5">
                                                                                <p><span className="text-muted-foreground">Nota base obtenida:</span> <span className="font-mono font-bold">{baseScore?.toFixed(2)}</span></p>
                                                                                <p><span className="text-muted-foreground">Descuento aplicado:</span> <span className="font-mono font-bold text-red-500">-{penalty.toFixed(2)}</span></p>
                                                                                {penaltyComment && (
                                                                                    <p className="pt-1 border-t border-border/50 text-muted-foreground italic">
                                                                                        &quot;{penaltyComment}&quot;
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Expulsiones y Salidas a otras pestañas */}
                                                        <TableCell className="text-center py-3">
                                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                {expulsions > 0 && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 cursor-default">
                                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                                                {expulsions}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p className="font-semibold text-red-500">{expulsions} expulsiones de integridad registradas</p>
                                                                            <p className="text-[11px] text-muted-foreground">Pérdida de foco estricta durante el examen</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {tabSwitches > 0 && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-default">
                                                                                <ExternalLink className="w-3 h-3 text-amber-500" />
                                                                                <span>{tabSwitches}</span>
                                                                                <span className="text-[10px] opacity-75 font-normal font-mono">({formatDurationHMS(timeAway)})</span>
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                                                                            <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-xs">
                                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                                {tabSwitches} {tabSwitches === 1 ? 'salida registrada' : 'salidas registradas'}
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                Tiempo acumulado fuera: <strong>{formatDurationHMS(timeAway)} ({formatDurationHuman(timeAway)})</strong>
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {/* Alerta de Seguridad de Múltiples Direcciones IP */}
                                                                {subHasMultipleIps ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedIpDetails({ studentName, sub, wildcards })}
                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer animate-pulse"
                                                                            >
                                                                                <Globe className="w-3.5 h-3.5" />
                                                                                <span>{subDetectedIps.length} IPs</span>
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                                                                            <p className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-xs">
                                                                                <Globe className="w-3.5 h-3.5" />
                                                                                🚨 Alerta: Presentación desde Múltiples Ubicaciones
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                Se detectaron {subDetectedIps.length} direcciones IP diferentes ({subDetectedIps.join(", ")}). Clic para ver historial forense.
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ) : subDetectedIps.length > 0 ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedIpDetails({ studentName, sub, wildcards })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono text-muted-foreground bg-muted/40 border border-border/50 hover:bg-muted cursor-pointer"
                                                                            >
                                                                                <Globe className="w-3 h-3 text-muted-foreground/70" />
                                                                                <span className="truncate max-w-[75px]">{subDetectedIps[0]}</span>
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p className="text-xs">IP registrada: {subDetectedIps[0]}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ) : null}

                                                                {/* Alerta de Seguridad de Múltiples Dispositivos / Sesiones Concurrentes (misma o diferente IP) */}
                                                                {subHasMultipleDevices && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedIpDetails({ studentName, sub, wildcards })}
                                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                                                                                    isConcurrentLive
                                                                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:bg-rose-500/25 animate-pulse"
                                                                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/20"
                                                                                }`}
                                                                            >
                                                                                <Laptop className="w-3.5 h-3.5" />
                                                                                <span>
                                                                                    {isConcurrentLive
                                                                                        ? `${wildcards.liveDevicesCount || activeDevices.length} Equipos Activos`
                                                                                        : `${activeDevices.length} Equipos (Cerrado)`}
                                                                                </span>
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                                                                            <p className={`font-bold flex items-center gap-1 text-xs ${isConcurrentLive ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                                                <Laptop className="w-3.5 h-3.5" />
                                                                                {isConcurrentLive
                                                                                    ? "🚨 Alerta Activa: Sesiones Simultáneas en Vivo"
                                                                                    : "⚠️ Registro: Equipos Concurrentes Detectados (Sesión Cerrada)"}
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                {isConcurrentLive
                                                                                    ? `Se detectó la prueba abierta en ${wildcards.liveDevicesCount || activeDevices.length} computadores en tiempo real. Clic para ver detalles.`
                                                                                    : `Hubo ${activeDevices.length} dispositivos conectados previamente. El estudiante cerró las sesiones adicionales y continuó con su examen.`}
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {/* Alerta de Intentos de Fraude / Solicitud de Respuesta */}
                                                                {subHasFraud && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedFraudDetails({ studentName, sub, fraudAttempts })}
                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-red-600/15 text-red-700 dark:text-red-300 border border-red-500/40 hover:bg-red-600/25 transition-colors cursor-pointer"
                                                                            >
                                                                                <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                                                                <span>{fraudAttempts.length || 1} {fraudAttempts.length === 1 ? "Fraude" : "Fraudes"}</span>
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                                                                            <p className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1 text-xs">
                                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                                                🚨 Intento de Fraude / Solicitud de Respuesta
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                El estudiante escribió solicitudes explícitas como &quot;dame la respuesta&quot;. Clic para ver la evidencia forense completa.
                                                                            </p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {expulsions === 0 && tabSwitches === 0 && !subHasMultipleIps && subDetectedIps.length === 0 && !subHasFraud && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-xs text-muted-foreground font-mono cursor-default">0</span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p>Sin salidas de pestaña, alertas de IP ni intentos de fraude</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Acciones */}
                                                        <TableCell className="text-right pr-4 sm:pr-6 py-3">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {sub.isNotStarted ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                disabled
                                                                                className="h-8 w-8 text-muted-foreground/30 cursor-not-allowed rounded-lg"
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p>El estudiante aún no ha iniciado la prueba</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                                                                                asChild
                                                                            >
                                                                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}/submissions/${sub.id}`}>
                                                                                    <Eye className="h-4 w-4" />
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p>{isSubmitted ? "Ver respuestas detalladas y retroalimentación" : "Ver avance actual y respuestas en progreso"}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {/* Botón para enviar mensaje prioritario vía SSE */}
                                                                <TeacherStudentMessageDialog
                                                                    attemptId={attempt.id}
                                                                    evaluationId={attempt.evaluationId}
                                                                    submissionId={sub.id}
                                                                    studentId={sub.userId}
                                                                    studentName={studentName}
                                                                />

                                                                {/* Botón para asignar o modificar nota definitiva manual */}
                                                                <ManualEvaluationGradeDialog
                                                                    courseId={courseId}
                                                                    attemptId={attempt.id}
                                                                    submissionId={sub.id}
                                                                    studentId={sub.userId}
                                                                    studentName={studentName}
                                                                    studentEmail={sub.user?.email}
                                                                    currentScore={score}
                                                                    wildcardsUsed={sub.wildcardsUsed}
                                                                    onSuccess={() => fetchSubmissions(false)}
                                                                />

                                                                {isSubmitted && (
                                                                    <SubmissionPenaltyDialog
                                                                        submission={sub}
                                                                        courseId={courseId}
                                                                        studentName={studentName}
                                                                    />
                                                                )}
                                                                
                                                                <Dialog>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <DialogTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p>Eliminar entrega</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    <DialogContent>
                                                                        <form
                                                                            action={async () => {
                                                                                setIsDeleting(true);
                                                                                try {
                                                                                    await deleteEvaluationSubmissionAction(sub.id, courseId);
                                                                                    toast.success("Entrega eliminada correctamente");
                                                                                } catch {
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
                        submissions={currentSubmissions}
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

            {/* Modal de Detalle Forense de IPs para el Docente */}
            {selectedIpDetails && (
                <Dialog open={!!selectedIpDetails} onOpenChange={(open) => { if (!open) setSelectedIpDetails(null); }}>
                    <DialogContent className="max-w-2xl p-6 bg-card border-border shadow-2xl">
                        <DialogHeader className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                        <span>Historial Forense de Direcciones IP</span>
                                        {Boolean(selectedIpDetails.wildcards?.multipleIpAlert || (Array.isArray(selectedIpDetails.wildcards?.effectiveIps || selectedIpDetails.wildcards?.detectedIps) && (selectedIpDetails.wildcards?.effectiveIps || selectedIpDetails.wildcards?.detectedIps).length > 1)) && (
                                            <Badge variant="destructive" className="text-[10px] uppercase font-black">
                                                🚨 Sospecha de Fraude / Multi-IP
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Estudiante: <strong className="text-foreground">{selectedIpDetails.studentName}</strong> • {selectedIpDetails.sub?.user?.email}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 my-2">
                            {Boolean(selectedIpDetails.wildcards?.multipleIpAlert || (Array.isArray(selectedIpDetails.wildcards?.effectiveIps || selectedIpDetails.wildcards?.detectedIps) && (selectedIpDetails.wildcards?.effectiveIps || selectedIpDetails.wildcards?.detectedIps).length > 1)) && (
                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-1.5">
                                    <p className="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                        <ShieldAlert className="w-4 h-4 shrink-0" />
                                        Alerta de Presentación Indebida desde Diferentes Lugares
                                    </p>
                                    <p className="leading-relaxed">
                                        Esta prueba registró conexiones y respuestas desde más de una dirección IP pública. Esto puede evidenciar asistencia de una tercera persona desde otra ubicación o sesión compartida.
                                    </p>
                                </div>
                            )}

                            {/* Resumen de IPs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">IP Inicial Registrada</p>
                                    <p className="text-sm font-mono font-bold text-foreground mt-0.5">
                                        {selectedIpDetails.wildcards?.initialIp || selectedIpDetails.wildcards?.detectedIps?.[0] || "No registrada"}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total IPs Detectadas</p>
                                    <p className="text-sm font-mono font-bold text-foreground mt-0.5">
                                        {(selectedIpDetails.wildcards?.effectiveIps || selectedIpDetails.wildcards?.detectedIps || []).length} direcciones
                                    </p>
                                </div>
                            </div>

                            {/* Tabla cronológica de IPs */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Timeline de Actividad por Dirección IP
                                </h4>
                                <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 text-[11px]">
                                                <TableHead className="py-2 font-bold">Dirección IP</TableHead>
                                                <TableHead className="py-2 font-bold">Primera Vez</TableHead>
                                                <TableHead className="py-2 font-bold">Última Vez</TableHead>
                                                <TableHead className="py-2 font-bold text-center">Peticiones</TableHead>
                                                <TableHead className="py-2 font-bold">Acción</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.isArray(selectedIpDetails.wildcards?.ipHistory) && selectedIpDetails.wildcards.ipHistory.length > 0 ? (
                                                selectedIpDetails.wildcards.ipHistory.map((entry: any, idx: number) => (
                                                    <TableRow key={idx} className="text-xs font-mono">
                                                        <TableCell className="py-2 font-bold text-foreground flex items-center gap-1.5">
                                                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span>{entry.ip}</span>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-[11px] text-muted-foreground">
                                                            {entry.firstSeen ? formatDateTime(entry.firstSeen, "HH:mm:ss") : "—"}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-[11px] text-muted-foreground">
                                                            {entry.lastSeen ? formatDateTime(entry.lastSeen, "HH:mm:ss") : "—"}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-center font-bold">
                                                            {entry.count || 1}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-[11px] text-muted-foreground capitalize">
                                                            {entry.action || "actividad"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                (selectedIpDetails.wildcards?.detectedIps || []).map((ip: string, idx: number) => (
                                                    <TableRow key={idx} className="text-xs font-mono">
                                                        <TableCell className="py-2 font-bold text-foreground">
                                                            {ip}
                                                        </TableCell>
                                                        <TableCell colSpan={4} className="py-2 text-muted-foreground text-[11px]">
                                                            IP registrada durante la evaluación
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Detalle Forense de Dispositivos / Sesiones Concurrentes */}
                            {Array.isArray(selectedIpDetails.wildcards?.activeDevices) && selectedIpDetails.wildcards.activeDevices.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <Laptop className="w-3.5 h-3.5 text-primary" />
                                            <span>Dispositivos / Sesiones Detectadas ({selectedIpDetails.wildcards.activeDevices.length})</span>
                                        </h4>
                                        {selectedIpDetails.wildcards.activeDevices.length > 1 && (
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                                                🚨 {selectedIpDetails.wildcards.activeDevices.length} Equipos Concurrentes
                                            </Badge>
                                        )}
                                    </div>

                                    {selectedIpDetails.wildcards.activeDevices.length > 1 && (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs">
                                            <p className="font-semibold">⚠️ Posible doble apertura en la misma red (misma IP institucional):</p>
                                            <p className="text-[11px] mt-0.5 opacity-90">
                                                Se detectaron firmas de hardware o navegadores distintos enviando respuestas. Esto comprueba que la prueba fue operada desde más de un computador.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedIpDetails.wildcards.activeDevices.map((dev: any, dIdx: number) => (
                                            <div key={dev.id || dIdx} className="p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-foreground flex items-center gap-1">
                                                        <Laptop className="w-3 h-3 text-muted-foreground" />
                                                        Dispositivo #{dIdx + 1}
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold text-primary">{dev.count || 1} pings</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono space-y-0.5">
                                                    <p><span className="font-semibold text-foreground">IP:</span> {dev.ip || "N/A"}</p>
                                                    <p><span className="font-semibold text-foreground">Pantalla:</span> {dev.screenRes || "N/A"}</p>
                                                    <p><span className="font-semibold text-foreground">SO:</span> {dev.platform || "N/A"}</p>
                                                    <p className="truncate" title={dev.userAgent}><span className="font-semibold text-foreground">Navegador:</span> {dev.userAgent || "N/A"}</p>
                                                    <p><span className="font-semibold text-foreground">Última actividad:</span> {dev.lastSeen ? formatDateTime(dev.lastSeen, "HH:mm:ss") : "—"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedIpDetails(null)}
                                className="h-8 text-xs cursor-pointer"
                            >
                                Cerrar
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
                                asChild
                            >
                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}/submissions/${selectedIpDetails.sub?.id}`}>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Ver Entrega Completa</span>
                                </Link>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal de Detalle Forense de Intentos de Fraude / Solicitud de Respuesta */}
            {selectedFraudDetails && (
                <Dialog open={Boolean(selectedFraudDetails)} onOpenChange={() => setSelectedFraudDetails(null)}>
                    <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-red-600/15 text-red-600 dark:text-red-400 shrink-0">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                                        <span>Evidencia de Intentos de Fraude / Evasión</span>
                                        <Badge variant="outline" className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] font-mono">
                                            {selectedFraudDetails.fraudAttempts.length} {selectedFraudDetails.fraudAttempts.length === 1 ? "Incidente" : "Incidentes"}
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Estudiante: <strong className="text-foreground">{selectedFraudDetails.studentName}</strong> • {selectedFraudDetails.sub?.user?.email}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 my-2">
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs space-y-1.5">
                                <p className="font-bold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                    <ShieldAlert className="w-4 h-4 shrink-0" />
                                    Detección Activa de Solicitud de Respuestas
                                </p>
                                <p className="leading-relaxed">
                                    El estudiante escribió peticiones explícitas para obtener la solución o respuesta (ej: &quot;dame la respuesta&quot;, &quot;dime la solución&quot; o manipulación del sistema). La plataforma bloqueó la revelación de la respuesta, asignó 0.0 a la pregunta y emitió una detención ética pedagógica.
                                </p>
                            </div>

                            {/* Timeline de intentos de fraude */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Historial Forense de Respuestas del Estudiante
                                </h4>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {selectedFraudDetails.fraudAttempts.map((item: any, idx: number) => (
                                        <div key={item.id || idx} className="p-3.5 rounded-xl border bg-card/90 space-y-2 text-xs shadow-2xs">
                                            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">
                                                        {item.questionOrder !== undefined ? `Pregunta #${item.questionOrder + 1}` : `Incidente #${idx + 1}`}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25">
                                                        {item.questionType || "Texto/Código"}
                                                    </Badge>
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {item.timestamp ? formatDateTime(item.timestamp, "HH:mm:ss") : "—"}
                                                </span>
                                            </div>

                                            {item.questionText && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                                                    Enunciado: {item.questionText}
                                                </p>
                                            )}

                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                                    Texto exacto escrito por el estudiante (Evidencia):
                                                </span>
                                                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 font-mono text-xs text-red-900 dark:text-red-200 whitespace-pre-wrap break-all">
                                                    {item.studentAnswer || "(Vacío)"}
                                                </div>
                                            </div>

                                            {item.detectedPattern && (
                                                <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                                                    <span>Patrón detectado: <strong className="text-red-600 dark:text-red-400 font-mono">{item.detectedPattern}</strong></span>
                                                    <span className="font-bold text-red-600 dark:text-red-400">Nota asignada: 0.0</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedFraudDetails(null)}
                                className="h-8 text-xs cursor-pointer"
                            >
                                Cerrar
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-xs font-bold gap-1.5 cursor-pointer"
                                asChild
                            >
                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}/submissions/${selectedFraudDetails.sub?.id}`}>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Ver Entrega Completa</span>
                                </Link>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    </TooltipProvider>
);
}
