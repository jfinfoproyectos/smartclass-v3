"use client";

import { useState, useMemo, useEffect } from "react";
import { formatName, getInitials } from "@/lib/utils";
import { formatDateTime } from "@/lib/dateUtils";
import { 
    Users, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    ShieldAlert, 
    Search, 
    Eye, 
    Activity, 
    Filter,
    Maximize2,
    Minimize2,
    X,
    RefreshCw,
    SlidersHorizontal,
    Check,
    ArrowUpDown,
    CheckCircle,
    HelpCircle,
    UserX,
    Tv,
    Presentation,
    Shield,
    ArrowLeft,
    Sparkles,
    LayoutGrid,
    List,
    Flame,
    Radio,
    ChevronDown,
    FileText,
    Code
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { CodeAnswerViewerWrapper } from "@/features/teacher/components/CodeAnswerViewerWrapper";
import { SubmissionPenaltyDialog } from "./SubmissionPenaltyDialog";

interface EvaluationLiveMonitorProps {
    courseId: string;
    attemptId: string;
    submissions: any[];
    questions: any[];
    startTime: string | Date;
    endTime: string | Date;
    courseName: string;
    evaluationTitle: string;
    initialMode?: "teacher" | "projector";
    onClose?: () => void;
    autoRefresh?: boolean;
    onToggleAutoRefresh?: (enabled: boolean) => void;
    refreshIntervalSec?: number;
    onChangeRefreshInterval?: (interval: number) => void;
    onRefreshManual?: () => void;
    isRefreshing?: boolean;
    secondsUntilRefresh?: number;
    lastRefreshedAt?: Date | null;
    isStandalonePage?: boolean;
}

export function EvaluationLiveMonitor({
    courseId,
    attemptId,
    submissions,
    questions,
    startTime,
    endTime,
    courseName,
    evaluationTitle,
    initialMode = "teacher",
    onClose,
    autoRefresh = true,
    onToggleAutoRefresh,
    refreshIntervalSec = 10,
    onChangeRefreshInterval,
    onRefreshManual,
    isRefreshing = false,
    secondsUntilRefresh,
    lastRefreshedAt,
    isStandalonePage = false,
}: EvaluationLiveMonitorProps) {
    const currentMode = initialMode;
    const [projectorViewType, setProjectorViewType] = useState<"mosaic" | "table">("mosaic");
    const [projectorCols, setProjectorCols] = useState<number | "auto">("auto");
    const [tableCols, setTableCols] = useState<number | "auto">("auto");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "in_progress" | "submitted" | "alerts">("all");
    const [sortBy, setSortBy] = useState<"name" | "progress_asc" | "progress_desc" | "alerts">("name");
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [questionDetailModal, setQuestionDetailModal] = useState<{
        open: boolean;
        question: any;
        questionIndex: number;
        submission: any;
        activeTab?: "question" | "answer";
    } | null>(null);

    // Reloj digital en vivo
    useEffect(() => {
        setIsMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Atajo de teclado: Tecla Escape para salir
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                } else if (onClose) {
                    onClose();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Listener para pantalla completa nativa del navegador
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsNativeFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleNativeFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsNativeFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsNativeFullscreen(false);
        }
    };

    const totalStudents = submissions.length;
    const totalQuestions = questions.length || 0;

    // Métricas en vivo
    const submittedList = useMemo(() => submissions.filter(s => Boolean(s.submittedAt)), [submissions]);
    const inProgressList = useMemo(() => submissions.filter(s => !s.submittedAt), [submissions]);
    const alertList = useMemo(() => submissions.filter(s => (s.expulsions || 0) > 0), [submissions]);

    const totalAnswersAnswered = useMemo(() => {
        return submissions.reduce((acc, sub) => acc + (sub._count?.answersList || sub.answersList?.length || 0), 0);
    }, [submissions]);

    const totalQuestionsPossible = Math.max(totalStudents * totalQuestions, 1);
    const globalProgressPercent = Math.min(Math.round((totalAnswersAnswered / totalQuestionsPossible) * 100), 100);

    // Estado del tiempo de la prueba
    const now = currentTime.getTime();
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const isOngoing = now >= startMs && now <= endMs;
    const isFinished = now > endMs;
    const isUpcoming = now < startMs;

    const remainingSecTotal = Math.max(0, Math.floor((endMs - now) / 1000));
    const remainingHours = Math.floor(remainingSecTotal / 3600);
    const remainingMinutes = Math.floor((remainingSecTotal % 3600) / 60);
    const remainingSeconds = remainingSecTotal % 60;

    const totalDurationMs = Math.max(1, endMs - startMs);
    const elapsedMs = Math.max(0, now - startMs);
    const timeProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    const isEndingSoon = isOngoing && remainingSecTotal <= 600; // Menos de 10 minutos

    // Función auxiliar para extraer el enunciado limpio de la pregunta (en Prisma el campo es 'text')
    const getQuestionSnippet = (q: any) => {
        const raw = q?.text || q?.statement || q?.title || "";
        if (!raw) return "Sin enunciado";
        return raw
            .replace(/^#+\s*/gm, "")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
            .trim();
    };

    // Estadísticas de avance por cada pregunta para la panorámica del aula
    const questionStats = useMemo(() => {
        if (!questions || questions.length === 0) return [];
        return questions.map((q: any, idx: number) => {
            const answeredCount = submissions.filter((s: any) => {
                const answers = s.answersList || [];
                return answers.some((a: any) => a.questionId === q.id);
            }).length;
            const percent = totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0;
            return {
                id: q.id,
                index: idx + 1,
                statement: getQuestionSnippet(q),
                answeredCount,
                percent,
            };
        });
    }, [questions, submissions, totalStudents]);

    // Último estudiante en entregar su examen
    const latestSubmission = useMemo(() => {
        const submitted = submissions
            .filter((s: any) => Boolean(s.submittedAt))
            .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        return submitted[0] || null;
    }, [submissions]);

    // Filtrar y ordenar estudiantes
    const filteredSubmissions = useMemo(() => {
        const list = submissions.filter(sub => {
            const studentName = formatName(sub.user?.name, sub.user?.profile).toLowerCase();
            const email = (sub.user?.email || "").toLowerCase();
            const query = searchQuery.toLowerCase().trim();

            const matchesSearch = !query || studentName.includes(query) || email.includes(query);
            if (!matchesSearch) return false;

            if (filterStatus === "in_progress") return !sub.submittedAt;
            if (filterStatus === "submitted") return Boolean(sub.submittedAt);
            if (filterStatus === "alerts") return (sub.expulsions || 0) > 0;
            return true;
        });

        return list.sort((a, b) => {
            const answersA = a._count?.answersList || (a.answersList ? a.answersList.length : 0);
            const answersB = b._count?.answersList || (b.answersList ? b.answersList.length : 0);
            const alertsA = a.expulsions || 0;
            const alertsB = b.expulsions || 0;
            const nameA = formatName(a.user?.name, a.user?.profile);
            const nameB = formatName(b.user?.name, b.user?.profile);

            if (sortBy === "progress_asc") return answersA - answersB;
            if (sortBy === "progress_desc") return answersB - answersA;
            if (sortBy === "alerts") return alertsB - alertsA;
            return nameA.localeCompare(nameB);
        });
    }, [submissions, searchQuery, filterStatus, sortBy]);

    // Columnas automáticas óptimas para máxima simetría y encaje en pantalla sin scroll
    const optimalCols = useMemo(() => {
        if (typeof projectorCols === "number") return projectorCols;
        const count = filteredSubmissions.length;
        if (count <= 3) return Math.max(1, count);
        if (count <= 6) return Math.min(count, 3);
        if (count <= 8) return 4;
        
        // Buscar divisores exactos entre 5 y 10 para filas 100% simétricas (ej. 14 -> 7, 12 -> 6, 15 -> 5, 16 -> 8, 21 -> 7, 24 -> 8, etc.)
        const candidates = [7, 6, 8, 5, 9, 10];
        for (const c of candidates) {
            if (count % c === 0) return c;
        }

        // Si no es divisible exactamente, elegir el número de columnas que minimice el déficit en la última fila
        let best = 7;
        let minDeficit = 999;
        for (const c of candidates) {
            const remainder = count % c;
            const deficit = (c - remainder) % c;
            if (deficit < minDeficit) {
                minDeficit = deficit;
                best = c;
            }
        }
        return best;
    }, [filteredSubmissions.length, projectorCols]);

    // Columnas óptimas para la vista de tabla panorámica (multi-columna)
    const optimalTableCols = useMemo(() => {
        if (typeof tableCols === "number") return tableCols;
        const count = filteredSubmissions.length;
        if (count <= 8) return 1;
        if (count <= 24) return 2;
        return 3;
    }, [filteredSubmissions.length, tableCols]);

    // División de estudiantes en bloques para visualización de tabla en columnas paralelas
    const tableColumnChunks = useMemo(() => {
        const count = filteredSubmissions.length;
        if (count === 0) return [];
        const numCols = optimalTableCols;
        if (numCols <= 1) return [{ startIndex: 0, items: filteredSubmissions }];

        const itemsPerCol = Math.ceil(count / numCols);
        const chunks: { startIndex: number; items: any[] }[] = [];
        for (let i = 0; i < numCols; i++) {
            const start = i * itemsPerCol;
            const end = Math.min(start + itemsPerCol, count);
            if (start < count) {
                chunks.push({
                    startIndex: start,
                    items: filteredSubmissions.slice(start, end)
                });
            }
        }
        return chunks;
    }, [filteredSubmissions, optimalTableCols]);

    // Calcular tiempo relativo de última actividad
    const getRelativeActivity = (sub: any) => {
        const answers = sub.answersList || [];
        let latestDate: Date | null = null;
        if (answers.length > 0) {
            answers.forEach((ans: any) => {
                if (ans.updatedAt) {
                    const d = new Date(ans.updatedAt);
                    if (!latestDate || d > latestDate) latestDate = d;
                }
            });
        }
        if (!latestDate && sub.updatedAt) {
            latestDate = new Date(sub.updatedAt);
        }

        if (!latestDate) return "Sin actividad";
        const diffMs = currentTime.getTime() - latestDate.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return `Hace ${Math.max(1, diffSec)}s`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `Hace ${diffMin}m`;
        const diffHours = Math.floor(diffMin / 60);
        return `Hace ${diffHours}h`;
    };

    const isProjector = currentMode === "projector";

    const containerClasses = isProjector
        ? (isStandalonePage 
            ? "h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 select-none" 
            : "fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 animate-in fade-in-50 duration-200 overflow-hidden select-none")
        : (isStandalonePage
            ? "min-h-screen w-full flex flex-col bg-background text-foreground"
            : "fixed inset-0 z-50 flex flex-col bg-background text-foreground animate-in fade-in-50 duration-200");

    return (
        <TooltipProvider>
            <div className={containerClasses}>
                {/* ─── 1. BARRA SUPERIOR FIJADA (NAVBAR DEL MONITOR EN VIVO) ─── */}
                <header className={`h-16 shrink-0 border-b px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-10 shadow-xs ${
                    isProjector 
                        ? "border-slate-800 bg-slate-900/90 backdrop-blur-md text-slate-100" 
                        : "border-border/80 bg-card/95 backdrop-blur-md text-foreground"
                }`}>
                    {/* Izquierda: Identificador del Panel y Título */}
                    <div className="flex-1 min-w-0 flex items-center gap-2.5 justify-start">
                        {isProjector ? (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs shrink-0">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <Tv className="h-4 w-4 text-emerald-400" />
                                <span className="uppercase tracking-wider font-mono hidden md:inline">Proyector de Aula</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary font-bold text-xs shrink-0">
                                <Activity className="h-4 w-4 text-primary" />
                                <span className="uppercase tracking-wider font-mono hidden md:inline">Panel Docente</span>
                            </div>
                        )}

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xs sm:text-sm lg:text-base font-black truncate max-w-[180px] sm:max-w-[260px] lg:max-w-[360px]" title={evaluationTitle}>
                                    {evaluationTitle}
                                </h1>
                                <Badge variant="outline" className={`hidden 2xl:inline-flex text-[11px] font-medium py-0 px-2 shrink-0 ${
                                    isProjector ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-muted/40"
                                }`}>
                                    {courseName}
                                </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate hidden lg:inline">
                                {isProjector ? "Panorámica de Aula en Tiempo Real" : "Panel de Supervisión Docente"}
                            </span>
                        </div>
                    </div>

                    {/* Centro: Reloj y Cuenta Regresiva (Centrado Natural en el Flujo, Cero Traslapes) */}
                    <div className="shrink-0 flex items-center justify-center px-1">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-xs ${
                            isProjector ? "bg-slate-800/90 border-slate-700 text-slate-100" : "bg-muted/50 border-border/60 text-foreground"
                        }`}>
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                                <Clock className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                                <span suppressHydrationWarning>{isMounted ? formatDateTime(currentTime, "HH:mm:ss") : "--:--:--"}</span>
                            </div>

                            <div className={`h-3 w-px ${isProjector ? "bg-slate-700" : "bg-border/60"}`} />

                            <div className="flex items-center gap-1.5 text-xs font-mono" suppressHydrationWarning>
                                {isMounted ? (
                                    <>
                                        {isOngoing && (
                                            <span className={`font-bold ${isEndingSoon ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
                                                {isEndingSoon ? "⚠️ " : ""}Restante: {remainingHours > 0 ? `${remainingHours}h ` : ""}{remainingMinutes}m {remainingSeconds}s
                                            </span>
                                        )}
                                        {isFinished && (
                                            <span className="text-red-400 font-bold">
                                                Finalizada
                                            </span>
                                        )}
                                        {isUpcoming && (
                                            <span className="text-muted-foreground font-medium">
                                                Inicia: {formatDateTime(startTime, "HH:mm")}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground font-medium">...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Derecha: Controles de Refresco y Pantalla Completa */}
                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2">
                        {/* Selector de Vista en Proyector: Mosaico Panorámico vs Lista */}
                        {isProjector && (
                            <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={projectorViewType === "mosaic" ? "default" : "ghost"}
                                    onClick={() => setProjectorViewType("mosaic")}
                                    className={`h-7 px-2 text-xs font-bold gap-1 rounded cursor-pointer ${
                                        projectorViewType === "mosaic" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <LayoutGrid className="h-3 w-3" />
                                    <span className="hidden xl:inline">Mosaico</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={projectorViewType === "table" ? "default" : "ghost"}
                                    onClick={() => setProjectorViewType("table")}
                                    className={`h-7 px-2 text-xs font-bold gap-1 rounded cursor-pointer ${
                                        projectorViewType === "table" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <List className="h-3 w-3" />
                                    <span className="hidden xl:inline">Tabla</span>
                                </Button>
                            </div>
                        )}

                        {/* Auto-refresco Switch con Programador de Tiempo y Animación de Cuenta Regresiva */}
                        {onToggleAutoRefresh && (() => {
                            const currentSecondsLeft = typeof secondsUntilRefresh === "number" ? secondsUntilRefresh : refreshIntervalSec;
                            const progressRatio = Math.max(0, Math.min(1, currentSecondsLeft / (refreshIntervalSec || 1)));

                            return (
                                <div className={`relative overflow-hidden flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors shrink-0 ${
                                    isProjector ? "bg-slate-800/80 border-slate-700" : "bg-muted/50 border-border/60"
                                }`}>
                                    {/* Barra sutil de progreso inferior */}
                                    {autoRefresh && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-700/30 overflow-hidden pointer-events-none">
                                            <div
                                                className={`h-full transition-all duration-1000 ease-linear ${
                                                    isRefreshing
                                                        ? "w-full bg-emerald-400 animate-pulse"
                                                        : currentSecondsLeft <= 2
                                                        ? "bg-amber-400"
                                                        : "bg-emerald-500"
                                                }`}
                                                style={{ width: isRefreshing ? "100%" : `${progressRatio * 100}%` }}
                                            />
                                        </div>
                                    )}

                                    <Switch
                                        id="monitor-live-autorefresh"
                                        checked={autoRefresh}
                                        onCheckedChange={onToggleAutoRefresh}
                                        className="data-[state=checked]:bg-emerald-500 scale-75 sm:scale-90 cursor-pointer"
                                    />
                                    
                                    <div className="flex items-center gap-1 select-none">
                                        <DropdownMenu>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                                                autoRefresh
                                                                    ? isProjector
                                                                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                                                                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25"
                                                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                                                            }`}
                                                        >
                                                            {/* Indicador circular animado */}
                                                            {autoRefresh ? (
                                                                <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                                                                    <svg className={`w-3.5 h-3.5 -rotate-90 transform ${isRefreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24">
                                                                        <circle
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="9"
                                                                            className={isProjector ? "stroke-slate-700" : "stroke-slate-300 dark:stroke-slate-700/60"}
                                                                            strokeWidth="2.5"
                                                                            fill="none"
                                                                        />
                                                                        <circle
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="9"
                                                                            className={`${
                                                                                isRefreshing
                                                                                    ? "stroke-emerald-300"
                                                                                    : currentSecondsLeft <= 2
                                                                                    ? "stroke-amber-400"
                                                                                    : "stroke-emerald-400"
                                                                            } transition-all duration-1000 ease-linear`}
                                                                            strokeWidth="2.5"
                                                                            strokeDasharray={56.5}
                                                                            strokeDashoffset={isRefreshing ? 0 : 56.5 * (1 - progressRatio)}
                                                                            strokeLinecap="round"
                                                                            fill="none"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                            ) : (
                                                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                            )}

                                                            <span className="hidden md:inline font-sans text-[10px] uppercase font-bold text-slate-400">
                                                                {autoRefresh ? "Auto" : "Pausa"}
                                                            </span>

                                                            <span className="tabular-nums font-bold">
                                                                {isRefreshing ? (
                                                                    <span className="animate-pulse text-emerald-300">...</span>
                                                                ) : autoRefresh ? (
                                                                    `${currentSecondsLeft}s`
                                                                ) : (
                                                                    `${refreshIntervalSec}s`
                                                                )}
                                                            </span>

                                                            <ChevronDown className="h-3 w-3 opacity-80" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">
                                                    <p>
                                                        {autoRefresh
                                                            ? `Refrescando en ${currentSecondsLeft}s (Click para cambiar intervalo)`
                                                            : "Auto-refresco en pausa"}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <DropdownMenuContent align="end" className={`min-w-[170px] ${isProjector ? "bg-slate-900 border-slate-800 text-slate-100" : ""}`}>
                                                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-emerald-400" />
                                                    <span>Tiempo de Refresco</span>
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator className={isProjector ? "bg-slate-800" : ""} />
                                                {[3, 5, 10, 15, 30, 60].map((sec) => (
                                                    <DropdownMenuItem
                                                        key={sec}
                                                        onClick={() => {
                                                            if (onChangeRefreshInterval) onChangeRefreshInterval(sec);
                                                            if (!autoRefresh && onToggleAutoRefresh) onToggleAutoRefresh(true);
                                                        }}
                                                        className={`text-xs cursor-pointer flex items-center justify-between py-1.5 ${
                                                            refreshIntervalSec === sec ? "font-bold text-emerald-400 bg-emerald-500/10" : ""
                                                        }`}
                                                    >
                                                        <span>Cada {sec} segundos {sec === 10 ? "(Defecto)" : ""}</span>
                                                        {refreshIntervalSec === sec && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Botón Refrescar Manual */}
                        {onRefreshManual && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onRefreshManual}
                                        disabled={isRefreshing}
                                        className={`h-8 px-2 sm:px-2.5 text-xs font-bold gap-1.5 cursor-pointer shrink-0 ${
                                            isProjector ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : ""
                                        }`}
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
                                        <span className="hidden xl:inline">{isRefreshing ? "..." : "Refrescar"}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    <p>Sincronizar avance en tiempo real</p>
                                    {lastRefreshedAt && (
                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                            Último: {formatDateTime(lastRefreshedAt, "HH:mm:ss")}
                                        </p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Alternar Pantalla Completa Nativa F11 */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={isProjector ? "default" : "outline"}
                                    size="sm"
                                    onClick={toggleNativeFullscreen}
                                    className={`h-8 px-2 sm:px-2.5 text-xs font-bold gap-1.5 cursor-pointer flex items-center justify-center shrink-0 shadow-xs ${
                                        isProjector 
                                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white" 
                                            : ""
                                    }`}
                                >
                                    {isNativeFullscreen ? (
                                        <>
                                            <Minimize2 className="h-3.5 w-3.5" />
                                            <span className="hidden xl:inline">Ventana</span>
                                        </>
                                    ) : (
                                        <>
                                            <Maximize2 className="h-3.5 w-3.5" />
                                            <span className="hidden lg:inline">F11</span>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{isNativeFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa nativa para proyección (F11)"}</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Botón Salir / Regresar */}
                        {onClose ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={onClose}
                                className="h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                            >
                                <X className="h-3.5 w-3.5" />
                                <span>Salir</span>
                                <span className="hidden sm:inline text-[10px] opacity-70 font-mono">(Esc)</span>
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className={`h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer ${
                                    isProjector ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : ""
                                }`}
                            >
                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attemptId}`}>
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    <span>Volver</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* ─── CONTENIDO MODO 1: PROYECTOR EN CLASE (PANORÁMICA DE AULA) ── */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {isProjector ? (
                    <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-3.5 gap-2.5 overflow-hidden">
                        {/* ─── 1. HUD SUPERIOR COMPACTO Y PANORÁMICO (SIMETRÍA COMPLETA) ─── */}
                        <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3 shadow-lg">
                            {/* Grilla 100% Simétrica de 5 Tarjetas Equivalentes */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
                                {/* Tarjeta 1: Cronómetro Restante */}
                                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2.5">
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                                            Restante ({formatDateTime(endTime, "HH:mm")})
                                        </span>
                                        <div className="text-base sm:text-lg font-black font-mono tracking-tight text-white leading-tight mt-0.5" suppressHydrationWarning>
                                            {isMounted ? (
                                                isFinished ? (
                                                    <span className="text-red-400">00:00:00</span>
                                                ) : (
                                                    <span className={isEndingSoon ? "text-red-400 animate-pulse" : "text-emerald-400"}>
                                                        {String(remainingHours).padStart(2, "0")}:{String(remainingMinutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-slate-500">--:--:--</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                        <Clock className="h-4 w-4 animate-pulse" />
                                    </div>
                                </div>

                                {/* Tarjeta 2: Total Alumnos */}
                                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Total Alumnos</span>
                                        <span className="text-base sm:text-lg font-black text-white leading-tight">{totalStudents}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">asignados</span>
                                </div>

                                {/* Tarjeta 3: En Examen */}
                                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 leading-tight">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                                            En Examen
                                        </span>
                                        <span className="text-base sm:text-lg font-black text-amber-400 leading-tight">{inProgressList.length}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">activos</span>
                                </div>

                                {/* Tarjeta 4: Entregados */}
                                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 leading-tight">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Entregados
                                        </span>
                                        <span className="text-base sm:text-lg font-black text-emerald-400 leading-tight">{submittedList.length}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400/80 font-mono font-bold">
                                        {totalStudents > 0 ? Math.round((submittedList.length / totalStudents) * 100) : 0}%
                                    </span>
                                </div>

                                {/* Tarjeta 5: Avance Grupal */}
                                <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 block leading-tight">Avance Grupal</span>
                                        <span className="text-base sm:text-lg font-black text-teal-400 leading-tight">{globalProgressPercent}%</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">{totalAnswersAnswered} resp.</span>
                                </div>
                            </div>

                            {/* Termómetro de Preguntas Super Compacto y Centrado */}
                            {questionStats.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                                        <Flame className="h-3 w-3 text-amber-400" />
                                        <span>Preguntas:</span>
                                    </span>

                                    <div className="flex items-center gap-1.5 flex-1 max-w-4xl justify-center min-w-0">
                                        {questionStats.map((qs) => (
                                            <Tooltip key={qs.id}>
                                                <TooltipTrigger asChild>
                                                    <div className="flex-1 min-w-[60px] max-w-[120px] px-2 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-default">
                                                        <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none mb-1">
                                                            <span className="text-slate-300">P{qs.index}</span>
                                                            <span className={qs.percent >= 80 ? "text-emerald-400" : qs.percent >= 40 ? "text-amber-400" : "text-slate-400"}>
                                                                {qs.percent}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    qs.percent >= 80 ? "bg-emerald-500" : qs.percent >= 40 ? "bg-amber-500" : "bg-primary"
                                                                }`}
                                                                style={{ width: `${qs.percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-xs max-w-xs bg-slate-900 border-slate-800 text-slate-200">
                                                    <p className="font-bold text-white">Pregunta {qs.index}</p>
                                                    <p className="text-[11px] text-slate-400 line-clamp-2">{qs.statement}</p>
                                                    <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                                                        {qs.answeredCount} de {totalStudents} alumnos la han respondido ({qs.percent}%)
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── 2. MOSAICO O TABLA PANORÁMICA DE ESTUDIANTES ─── */}
                        <div className="flex-1 min-h-0 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col overflow-hidden shadow-xl">
                            {/* Barra de Título del Mosaico */}
                            <div className="p-2 sm:p-2.5 px-3 sm:px-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-emerald-400" />
                                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                                        Panorámica del Aula ({filteredSubmissions.length} estudiantes)
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700 py-0 hidden md:inline-flex">
                                        Privacidad Activa
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Selector de Columnas para Simetría y Ajuste a Pantalla (Mosaico y Tabla) */}
                                    {projectorViewType === "mosaic" ? (
                                        <div className="hidden lg:flex items-center gap-1 bg-slate-950/90 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px]">
                                            <span className="text-slate-400 font-semibold mr-0.5">Columnas:</span>
                                            {(["auto", 5, 6, 7, 8, 10] as const).map((colVal) => (
                                                <button
                                                    key={colVal}
                                                    type="button"
                                                    onClick={() => setProjectorCols(colVal)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                                        projectorCols === colVal
                                                            ? "bg-emerald-600 text-white shadow-xs"
                                                            : "text-slate-400 hover:text-white"
                                                    }`}
                                                >
                                                    {colVal === "auto" ? `Auto (${optimalCols})` : colVal}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="hidden lg:flex items-center gap-1 bg-slate-950/90 px-2 py-0.5 rounded-lg border border-slate-800 text-[10px]">
                                            <span className="text-slate-400 font-semibold mr-0.5">Columnas de tabla:</span>
                                            {(["auto", 1, 2, 3] as const).map((colVal) => (
                                                <button
                                                    key={colVal}
                                                    type="button"
                                                    onClick={() => setTableCols(colVal)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                                        tableCols === colVal
                                                            ? "bg-emerald-600 text-white shadow-xs"
                                                            : "text-slate-400 hover:text-white"
                                                    }`}
                                                >
                                                    {colVal === "auto" ? `Auto (${optimalTableCols})` : `${colVal} ${colVal === 1 ? "Col" : "Cols"}`}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative w-40 sm:w-56">
                                        <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-500" />
                                        <Input
                                            placeholder="Filtrar por nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 h-6 sm:h-7 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contenedor Adaptable: Mosaico Panorámico de Asientos */}
                            {projectorViewType === "mosaic" ? (
                                <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 scrollbar-thin">
                                    <div 
                                        className="grid gap-2 sm:gap-2.5"
                                        style={{
                                            gridTemplateColumns: `repeat(${optimalCols}, minmax(0, 1fr))`
                                        }}
                                    >
                                        {filteredSubmissions.map((sub: any) => {
                                            const studentName = formatName(sub.user?.name, sub.user?.profile);
                                            const isSubmitted = Boolean(sub.submittedAt);
                                            const answersCount = sub._count?.answersList || (sub.answersList ? sub.answersList.length : 0);
                                            const percent = totalQuestions > 0 ? Math.round((answersCount / totalQuestions) * 100) : 0;
                                            const lastActivity = getRelativeActivity(sub);

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                                                        isSubmitted
                                                            ? "bg-emerald-950/30 border-emerald-500/50 shadow-xs"
                                                            : answersCount > 0
                                                                ? "bg-slate-950/85 border-slate-800 hover:border-slate-700"
                                                                : "bg-slate-950/40 border-slate-800/60 opacity-60"
                                                    }`}
                                                >
                                                    {/* Nombre y Avatar */}
                                                    <div className="flex items-center gap-2 min-w-0 mb-1.5">
                                                        <div className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                            isSubmitted 
                                                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                                                                : "bg-slate-800 text-slate-200 border border-slate-700"
                                                        }`}>
                                                            {getInitials(studentName)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-xs text-white truncate leading-tight" title={studentName}>
                                                                {studentName}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 font-mono block leading-none mt-0.5" suppressHydrationWarning>
                                                                {isMounted ? lastActivity : "..."}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Estado Visual */}
                                                    <div className="space-y-1 mt-auto">
                                                        {isSubmitted ? (
                                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    <span>Entregado</span>
                                                                </span>
                                                                <span className="text-emerald-400/80 font-semibold">
                                                                    {sub.submittedAt ? formatDateTime(sub.submittedAt, "HH:mm") : "100%"}
                                                                </span>
                                                            </div>
                                                        ) : answersCount > 0 ? (
                                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                                <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                                                                    <span>En examen</span>
                                                                </span>
                                                                <span className="text-slate-300 font-bold">
                                                                    {answersCount}/{totalQuestions} ({percent}%)
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                                                <span>En espera</span>
                                                                <span>0/{totalQuestions}</span>
                                                            </div>
                                                        )}

                                                        {/* Barra de Progreso */}
                                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    isSubmitted ? "bg-emerald-500" : "bg-primary"
                                                                }`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Vista de Tabla Panorámica Multi-Columna */
                                <div className={`flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 scrollbar-thin grid gap-3 ${
                                    optimalTableCols === 1 
                                        ? "grid-cols-1" 
                                        : optimalTableCols === 2 
                                            ? "grid-cols-1 md:grid-cols-2 items-start" 
                                            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start"
                                }`}>
                                    {tableColumnChunks.length === 0 ? (
                                        <div className="col-span-full p-8 text-center text-slate-500 text-xs">
                                            No se encontraron estudiantes que coincidan con la búsqueda.
                                        </div>
                                    ) : (
                                        tableColumnChunks.map((chunk, chunkIdx) => (
                                            <div key={chunkIdx} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex flex-col shadow-xs">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                                                            <th className="py-2 px-2.5 text-center w-8">#</th>
                                                            <th className="py-2 px-2.5">Estudiante</th>
                                                            <th className="py-2 px-2 text-center">Estado</th>
                                                            <th className="py-2 px-2.5">Progreso</th>
                                                            {optimalTableCols <= 2 && (
                                                                <th className="py-2 px-2.5 text-right hidden sm:table-cell">Actividad</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                                                        {chunk.items.map((sub: any, itemIdx: number) => {
                                                            const globalIdx = chunk.startIndex + itemIdx;
                                                            const studentName = formatName(sub.user?.name, sub.user?.profile);
                                                            const isSubmitted = Boolean(sub.submittedAt);
                                                            const answersCount = sub._count?.answersList || (sub.answersList ? sub.answersList.length : 0);
                                                            const percent = totalQuestions > 0 ? Math.round((answersCount / totalQuestions) * 100) : 0;
                                                            const lastActivity = getRelativeActivity(sub);

                                                            return (
                                                                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                                                                    <td className="py-2 px-2.5 text-center font-mono text-slate-500 text-[10px]">
                                                                        {globalIdx + 1}
                                                                    </td>
                                                                    <td className="py-2 px-2.5 font-bold text-white max-w-[150px] truncate" title={studentName}>
                                                                        {studentName}
                                                                    </td>
                                                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                                                        {isSubmitted ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1 text-[10px] font-bold py-0 px-1.5">
                                                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                                                <span>Entregado</span>
                                                                            </Badge>
                                                                        ) : answersCount > 0 ? (
                                                                            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 gap-1 text-[10px] py-0 px-1.5">
                                                                                <span className="h-1 w-1 rounded-full bg-amber-400 animate-ping" />
                                                                                <span>En examen</span>
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-slate-500 text-[10px] border-slate-700 py-0 px-1.5">
                                                                                Sin iniciar
                                                                            </Badge>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 px-2.5">
                                                                        <div className="flex items-center gap-1.5 min-w-[90px]">
                                                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full rounded-full ${isSubmitted ? "bg-emerald-500" : "bg-primary"}`}
                                                                                    style={{ width: `${percent}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-[10px] font-mono text-slate-300 w-12 text-right shrink-0">
                                                                                {answersCount}/{totalQuestions}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    {optimalTableCols <= 2 && (
                                                                        <td className="py-2 px-2.5 text-right font-mono text-slate-400 text-[10px] hidden sm:table-cell whitespace-nowrap" suppressHydrationWarning>
                                                                            {isMounted ? lastActivity : "..."}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ─── 3. LIVE TICKER DE AULA EN TIEMPO REAL (PIE PANORÁMICO) ─── */}
                        <div className="shrink-0 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shadow-md">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Feed en Vivo:</span>
                                <span className="truncate text-slate-200">
                                    {latestSubmission ? (
                                        <>Última entrega registrada: <strong>{formatName(latestSubmission.user?.name, latestSubmission.user?.profile)}</strong> a las {formatDateTime(latestSubmission.submittedAt, "HH:mm")}</>
                                    ) : (
                                        <>Evaluación en curso • El aula avanza activamente en sus preguntas</>
                                    )}
                                </span>
                            </div>

                            <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono text-slate-400">
                                <span>Sync: {refreshIntervalSec}s</span>
                                <span>•</span>
                                <span>Pulsa F11 para pantalla completa sin marcos</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ═══════════════════════════════════════════════════════════════ */
                    /* ─── CONTENIDO MODO 2: PANEL DEL PROFESOR (COMPLETO) ────────── */
                    /* ═══════════════════════════════════════════════════════════════ */
                    <>
                        {/* ─── Franja Ejecutiva de KPIs en Vivo ─── */}
                        <div className="shrink-0 bg-muted/20 border-b border-border/70 p-4 sm:px-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Avance Global */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                                            Avance Global del Grupo
                                        </span>
                                        <span className="text-sm font-black font-mono text-primary">
                                            {globalProgressPercent}% completado
                                        </span>
                                    </div>

                                    <div className="w-full h-2.5 bg-muted/80 rounded-full overflow-hidden border border-border/40">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary via-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${globalProgressPercent}%` }}
                                        />
                                    </div>

                                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                                        <span><strong>{totalAnswersAnswered}</strong> de <strong>{totalStudents * totalQuestions}</strong> respuestas contestadas</span>
                                        <span>•</span>
                                        <span>Promedio: <strong>{totalStudents > 0 ? (totalAnswersAnswered / totalStudents).toFixed(1) : 0}</strong> preguntas por alumno</span>
                                    </p>
                                </div>

                                {/* Mini KPIs Rápidos en Fila */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:w-auto w-full shrink-0">
                                    <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Inscritos</span>
                                        <span className="text-lg font-black text-foreground">{totalStudents}</span>
                                    </div>

                                    <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">En Examen</span>
                                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">{inProgressList.length}</span>
                                    </div>

                                    <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Entregados</span>
                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{submittedList.length}</span>
                                    </div>

                                    <div className="px-3 py-2 rounded-xl bg-card border border-border/80 text-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Alertas Foco</span>
                                        <span className={`text-lg font-black ${alertList.length > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                            {alertList.length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Barra de Filtros, Ordenación y Búsqueda ─── */}
                        <div className="shrink-0 p-3 sm:px-6 bg-card border-b border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={filterStatus === "all" ? "default" : "outline"}
                                    onClick={() => setFilterStatus("all")}
                                    className="h-8 text-xs font-semibold px-3 rounded-lg cursor-pointer shrink-0"
                                >
                                    Todos ({submissions.length})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={filterStatus === "in_progress" ? "default" : "outline"}
                                    onClick={() => setFilterStatus("in_progress")}
                                    className="h-8 text-xs font-semibold px-3 rounded-lg cursor-pointer shrink-0 gap-1.5"
                                >
                                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span>En examen ({inProgressList.length})</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={filterStatus === "submitted" ? "default" : "outline"}
                                    onClick={() => setFilterStatus("submitted")}
                                    className="h-8 text-xs font-semibold px-3 rounded-lg cursor-pointer shrink-0 gap-1.5"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Entregados ({submittedList.length})</span>
                                </Button>
                                {alertList.length > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={filterStatus === "alerts" ? "destructive" : "outline"}
                                        onClick={() => setFilterStatus("alerts")}
                                        className="h-8 text-xs font-semibold px-3 rounded-lg cursor-pointer shrink-0 gap-1.5"
                                    >
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        <span>Con Alertas ({alertList.length})</span>
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 font-semibold gap-1.5 cursor-pointer shrink-0">
                                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="hidden sm:inline">
                                                {sortBy === "name" && "Alfabético"}
                                                {sortBy === "progress_asc" && "Menor Avance"}
                                                {sortBy === "progress_desc" && "Mayor Avance"}
                                                {sortBy === "alerts" && "Más Alertas"}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 p-1">
                                        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                                            Ordenar Estudiantes
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setSortBy("name")} className="text-xs cursor-pointer justify-between py-1.5 font-medium">
                                            <span>Alfabético (A-Z)</span>
                                            {sortBy === "name" && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy("progress_asc")} className="text-xs cursor-pointer justify-between py-1.5 font-medium">
                                            <span>Menor avance primero</span>
                                            {sortBy === "progress_asc" && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy("progress_desc")} className="text-xs cursor-pointer justify-between py-1.5 font-medium">
                                            <span>Mayor avance primero</span>
                                            {sortBy === "progress_desc" && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSortBy("alerts")} className="text-xs cursor-pointer justify-between py-1.5 font-medium">
                                            <span>Más alertas primero</span>
                                            {sortBy === "alerts" && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre o correo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border/70"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ─── Tabla / Matriz Completa del Profesor (NO TARJETAS) ─── */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:px-6">
                            {filteredSubmissions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/50">
                                    <Filter className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                    <p className="font-bold text-foreground text-sm">No se encontraron estudiantes para los filtros actuales</p>
                                    <p className="text-xs text-muted-foreground mt-1">Intenta restablecer la búsqueda o seleccionar &quot;Todos&quot;.</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
                                        className="mt-4 text-xs h-8 cursor-pointer"
                                    >
                                        Restablecer filtros
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <th className="py-3 px-3 text-center w-12">#</th>
                                                    <th className="py-3 px-4 min-w-[220px]">Estudiante</th>
                                                    <th className="py-3 px-3 text-center min-w-[130px]">Estado en Vivo</th>
                                                    <th className="py-3 px-4 min-w-[180px]">Progreso</th>
                                                    <th className="py-3 px-4 min-w-[200px]">Mapa de Preguntas ({totalQuestions})</th>
                                                    <th className="py-3 px-3 text-center min-w-[100px]">Faltas Foco</th>
                                                    <th className="py-3 px-3 min-w-[120px]">Última Actividad</th>
                                                    <th className="py-3 px-3 text-center min-w-[110px]">Calificación</th>
                                                    <th className="py-3 px-4 text-right min-w-[140px]">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 text-xs">
                                                {filteredSubmissions.map((sub: any, index: number) => {
                                                    const studentName = formatName(sub.user?.name, sub.user?.profile);
                                                    const isSubmitted = Boolean(sub.submittedAt);
                                                    const score = sub.score !== null ? Number(sub.score) : null;
                                                    const isPassing = score !== null && score >= 3.0;
                                                    const answersCount = sub._count?.answersList || (sub.answersList ? sub.answersList.length : 0);
                                                    const expulsions = sub.expulsions || 0;
                                                    const percent = totalQuestions > 0 ? Math.round((answersCount / totalQuestions) * 100) : 0;
                                                    const lastActivity = getRelativeActivity(sub);

                                                    const answeredQuestionIds = new Set(
                                                        (sub.answersList || []).map((a: any) => a.questionId)
                                                    );

                                                    return (
                                                        <tr 
                                                            key={sub.id}
                                                            className={`hover:bg-muted/40 transition-colors ${
                                                                expulsions > 0 ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                                            }`}
                                                        >
                                                            <td className="py-3 px-3 text-center font-mono text-[11px] text-muted-foreground">
                                                                {index + 1}
                                                            </td>

                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                                                        {getInitials(studentName)}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-bold text-foreground text-xs truncate max-w-[200px]" title={studentName}>
                                                                            {studentName}
                                                                        </span>
                                                                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={sub.user?.email}>
                                                                            {sub.user?.email || "Sin correo"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                {isSubmitted ? (
                                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[11px] font-semibold py-0.5">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        <span>Entregado</span>
                                                                    </Badge>
                                                                ) : expulsions > 0 ? (
                                                                    <Badge variant="destructive" className="gap-1 text-[11px] font-bold py-0.5 animate-pulse">
                                                                        <ShieldAlert className="h-3 w-3" />
                                                                        <span>Con Alertas</span>
                                                                    </Badge>
                                                                ) : answersCount > 0 ? (
                                                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 text-[11px] font-semibold py-0.5">
                                                                        <span className="relative flex h-1.5 w-1.5">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                                                        </span>
                                                                        <span>Respondiendo</span>
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px] py-0.5">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>En espera</span>
                                                                    </Badge>
                                                                )}
                                                            </td>

                                                            <td className="py-3 px-4">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between text-[11px]">
                                                                        <span className="font-mono font-bold text-foreground">{percent}%</span>
                                                                        <span className="text-muted-foreground font-mono text-[10px]">
                                                                            {answersCount} / {totalQuestions} preg.
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                                isSubmitted ? "bg-emerald-500" : "bg-primary"
                                                                            }`}
                                                                            style={{ width: `${percent}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-1 flex-wrap max-w-[280px]">
                                                                    {questions.slice(0, 24).map((q: any, qIdx: number) => {
                                                                        const isAnswered = answeredQuestionIds.has(q.id);
                                                                        return (
                                                                            <Tooltip key={q.id || qIdx}>
                                                                                <TooltipTrigger asChild>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setQuestionDetailModal({
                                                                                                open: true,
                                                                                                question: q,
                                                                                                questionIndex: qIdx + 1,
                                                                                                submission: sub,
                                                                                                activeTab: isAnswered ? "answer" : "question",
                                                                                            });
                                                                                        }}
                                                                                        className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all hover:scale-115 active:scale-95 ${
                                                                                            isAnswered
                                                                                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-2xs"
                                                                                                : "bg-muted/60 text-muted-foreground border border-border/40 hover:bg-muted opacity-60 hover:opacity-100"
                                                                                        }`}
                                                                                    >
                                                                                        {qIdx + 1}
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" className="text-xs p-2">
                                                                                    <p className="font-bold text-foreground">Pregunta {qIdx + 1}</p>
                                                                                    <p className={`text-[10px] font-semibold mt-0.5 ${isAnswered ? "text-emerald-500" : "text-amber-500"}`}>
                                                                                        {isAnswered ? "✓ Contestada" : "⏳ Pendiente"}
                                                                                    </p>
                                                                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                                                                        Clic para ver enunciado y respuesta
                                                                                    </p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        );
                                                                    })}
                                                                    {questions.length > 24 && (
                                                                        <span className="text-[10px] font-mono text-muted-foreground pl-0.5">
                                                                            +{questions.length - 24}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                {expulsions > 0 ? (
                                                                    <Badge variant="destructive" className="font-mono text-xs px-2 py-0.5 font-black gap-1">
                                                                        <AlertTriangle className="h-3 w-3" />
                                                                        <span>{expulsions}</span>
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="font-mono text-[11px] text-muted-foreground">0</span>
                                                                )}
                                                            </td>

                                                            <td className="py-3 px-3">
                                                                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1" suppressHydrationWarning>
                                                                    <Clock className="h-3 w-3 opacity-60" />
                                                                    <span>{isMounted ? lastActivity : "..."}</span>
                                                                </span>
                                                            </td>

                                                            <td className="py-3 px-3 text-center">
                                                                {score !== null ? (
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`font-mono text-xs font-black py-0.5 px-2 ${
                                                                            isPassing 
                                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                                                : "bg-red-500/10 text-red-500 border-red-500/30"
                                                                        }`}
                                                                    >
                                                                        {score.toFixed(2)}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-[11px] text-muted-foreground italic">
                                                                        {isSubmitted ? "Pendiente" : "En curso"}
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="py-3 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {expulsions > 0 && (
                                                                        <SubmissionPenaltyDialog
                                                                            submission={sub}
                                                                            courseId={courseId}
                                                                            studentName={studentName}
                                                                        />
                                                                    )}

                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-7 text-xs px-2 gap-1 font-semibold hover:border-primary cursor-pointer"
                                                                                asChild
                                                                            >
                                                                                <Link 
                                                                                    href={`/dashboard/teacher/courses/${courseId}/evaluations/${attemptId}/submissions/${sub.id}`}
                                                                                    target="_blank"
                                                                                >
                                                                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                                                                    <span className="hidden sm:inline">
                                                                                        {isSubmitted ? "Revisar" : "Avance"}
                                                                                    </span>
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top">
                                                                            <p>{isSubmitted ? "Revisar respuestas y calificación del estudiante" : "Inspeccionar las respuestas y código redactados en tiempo real"}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Modal Ancho con 2 Pestañas: Pregunta y Respuesta del Estudiante */}
                <Dialog
                    open={Boolean(questionDetailModal?.open)}
                    onOpenChange={(open) => {
                        if (!open) setQuestionDetailModal(null);
                    }}
                >
                    <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl border-border/80 shadow-2xl">
                        {questionDetailModal && (() => {
                            const { question, questionIndex, submission } = questionDetailModal;
                            // Encontrar la versión más reciente de la entrega (por si se actualizó en vivo)
                            const currentSubmission = filteredSubmissions.find((s: any) => s.id === submission.id) || submission;
                            const studentName = formatName(currentSubmission?.user?.name, currentSubmission?.user?.profile);
                            const studentEmail = currentSubmission?.user?.email || "Sin correo";
                            const answers = currentSubmission?.answersList || [];
                            const studentAnswer = answers.find((a: any) => a.questionId === question.id);
                            const isAnswered = Boolean(studentAnswer && (studentAnswer.answer || studentAnswer.score !== null));

                            return (
                                <>
                                    {/* Header del Modal */}
                                    <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30 shrink-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                                                    {getInitials(studentName)}
                                                </div>
                                                <div className="min-w-0">
                                                    <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap text-foreground">
                                                        <span>{studentName}</span>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            Pregunta {questionIndex} de {totalQuestions}
                                                        </Badge>
                                                        {question.type && (
                                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                                                {question.type === "Code" ? `Código (${question.language || "Java"})` : question.type}
                                                            </Badge>
                                                        )}
                                                    </DialogTitle>
                                                    <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                                                        {studentEmail} &bull; {evaluationTitle}
                                                    </DialogDescription>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                                {isAnswered ? (
                                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-xs py-1 px-2.5 font-semibold">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>Respondida</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 text-xs py-1 px-2.5 font-semibold">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>Pendiente</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </DialogHeader>

                                    {/* Contenedor de Pestañas */}
                                    <Tabs
                                        defaultValue={questionDetailModal.activeTab || "question"}
                                        className="flex-1 flex flex-col min-h-0 overflow-hidden"
                                    >
                                        <div className="px-4 sm:px-5 pt-3 pb-2 border-b bg-card shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <TabsList className="grid w-full sm:w-[380px] grid-cols-2">
                                                <TabsTrigger value="question" className="gap-2 text-xs sm:text-sm font-semibold cursor-pointer">
                                                    <FileText className="h-4 w-4" />
                                                    <span>1. Pregunta</span>
                                                </TabsTrigger>
                                                <TabsTrigger value="answer" className="gap-2 text-xs sm:text-sm font-semibold cursor-pointer">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>2. Respuesta</span>
                                                    {isAnswered && (
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    )}
                                                </TabsTrigger>
                                            </TabsList>

                                            {/* Barra de Navegación Rápida Entre Preguntas */}
                                            {questions.length > 1 && (
                                                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                                    <span className="text-[11px] text-muted-foreground mr-1 font-medium shrink-0">Ir a:</span>
                                                    {questions.map((qItem: any, idx: number) => {
                                                        const itemAns = answers.some((a: any) => a.questionId === qItem.id);
                                                        const isCurrent = qItem.id === question.id;
                                                        return (
                                                            <button
                                                                key={qItem.id || idx}
                                                                type="button"
                                                                onClick={() => setQuestionDetailModal((prev) => prev ? ({
                                                                    ...prev,
                                                                    question: qItem,
                                                                    questionIndex: idx + 1,
                                                                }) : null)}
                                                                className={`h-6 w-6 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                                                                    isCurrent
                                                                        ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                                                                        : itemAns
                                                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                                                                        : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50"
                                                                }`}
                                                                title={`Pregunta ${idx + 1}${itemAns ? " (Respondida)" : " (Pendiente)"}`}
                                                            >
                                                                {idx + 1}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pestaña 1: Enunciado Completo de la Pregunta */}
                                        <TabsContent value="question" className="flex-1 p-4 sm:p-6 overflow-y-auto m-0 outline-none space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span>Enunciado Completo de la Pregunta</span>
                                                </h3>
                                                {question.language && (
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        Lenguaje: {question.language}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="p-4 sm:p-5 rounded-xl border bg-muted/20 text-sm leading-relaxed overflow-x-auto">
                                                {question.text ? (
                                                    <FeedbackViewer feedback={question.text} />
                                                ) : (
                                                    <p className="text-muted-foreground italic">Sin enunciado disponible para esta pregunta.</p>
                                                )}
                                            </div>

                                            {question.referenceAnswer && (
                                                <div className="mt-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                                                        Respuesta de Referencia / Modelo:
                                                    </span>
                                                    <div className="text-sm">
                                                        <FeedbackViewer feedback={question.referenceAnswer} />
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Pestaña 2: Respuesta del Estudiante */}
                                        <TabsContent value="answer" className="flex-1 p-4 sm:p-6 overflow-y-auto m-0 outline-none space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                                                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                    <span>Respuesta Entregada por {studentName}</span>
                                                </h3>
                                                {studentAnswer?.updatedAt && (
                                                    <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Última actualización: {formatDateTime(studentAnswer.updatedAt, "DD/MM/YYYY HH:mm:ss")}
                                                    </span>
                                                )}
                                            </div>

                                            {studentAnswer && studentAnswer.answer ? (
                                                <div className="space-y-4">
                                                    {question.type === "Code" ? (
                                                        <div className="rounded-xl border overflow-hidden">
                                                            <div className="bg-muted/60 px-4 py-2 border-b text-xs font-mono font-semibold flex items-center justify-between">
                                                                <span>Código del Estudiante ({question.language || "Java"})</span>
                                                            </div>
                                                            <div className="p-2 sm:p-4 bg-zinc-950">
                                                                <CodeAnswerViewerWrapper
                                                                    code={studentAnswer.answer}
                                                                    language={question.language || "java"}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 sm:p-5 rounded-xl border bg-muted/20 text-sm leading-relaxed overflow-x-auto">
                                                            <FeedbackViewer feedback={studentAnswer.answer} />
                                                        </div>
                                                    )}

                                                    {/* Retroalimentación o Calificación si existe */}
                                                    {studentAnswer.score !== null && studentAnswer.score !== undefined && (
                                                        <div className="p-3 px-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between">
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                                                Puntaje Registrado:
                                                            </span>
                                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                                {Number(studentAnswer.score).toFixed(2)} pts
                                                            </span>
                                                        </div>
                                                    )}

                                                    {studentAnswer.aiFeedback && (
                                                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                                                            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                                                                Retroalimentación Automática (IA):
                                                            </span>
                                                            {Array.isArray(studentAnswer.aiFeedback) ? (
                                                                <div className="space-y-3">
                                                                    {studentAnswer.aiFeedback.map((fb: any, fbIdx: number) => (
                                                                        <div key={fbIdx} className="text-xs p-3 rounded-lg bg-card border space-y-1">
                                                                            <div className="font-bold flex items-center justify-between">
                                                                            <span>Intento {fb.attempt || fbIdx + 1}</span>
                                                                                {fb.score !== undefined && (
                                                                                    <Badge variant="outline">Nota: {fb.score}</Badge>
                                                                                )}
                                                                            </div>
                                                                            <FeedbackViewer feedback={fb.feedback || String(fb)} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs">
                                                                    <FeedbackViewer feedback={typeof studentAnswer.aiFeedback === "string" ? studentAnswer.aiFeedback : JSON.stringify(studentAnswer.aiFeedback, null, 2)} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed bg-muted/20">
                                                    <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                                                        <Clock className="h-6 w-6" />
                                                    </div>
                                                    <h4 className="font-bold text-base text-foreground">El estudiante aún no ha contestado esta pregunta</h4>
                                                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                                                        Esta pregunta sigue pendiente en la sesión del estudiante o no se ha redactado una respuesta aún.
                                                    </p>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </>
                            );
                        })()}
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
