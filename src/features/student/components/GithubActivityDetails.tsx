"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Github, Sparkles, Loader2, CheckCircle, ExternalLink, Send, Download,
    AlertCircle, ClipboardList, ChevronLeft, UserCheck, GitCommitVertical, Bot,
    PanelLeftClose, PanelLeftOpen, SlidersHorizontal, CheckCircle2,
    ListChecks, HelpCircle, Check, MinusCircle, XCircle, Clock, User, Users,
    Maximize2, Minimize2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchRepoFilesAction } from "@/features/github/actions/githubActions";
import { submitGithubActivityAction } from "@/features/student/actions/submissionActions";
import { FeedbackViewer } from "./FeedbackViewer";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { GithubRepoAudit } from "@/features/github/components/GithubRepoAudit";
import { GitHubRepoChatInspector } from "@/features/teacher/components/GitHubRepoChatInspector";
import { RUBRIC_LEVELS } from "@/features/teacher/components/CodeProjectInspector";
import { cn } from "@/lib/utils";
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { GroupActivityBanner } from "./ActivityDetails";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function splitFeedbackParts(feedback: string | null | undefined): { aiPart: string; teacherPart: string } {
    if (!feedback) return { aiPart: "", teacherPart: "" };

    const teacherMarker = "### 👨‍🏫 Observaciones del Profesor";
    const markerIndex = feedback.indexOf(teacherMarker);

    if (markerIndex !== -1) {
        const aiPart = feedback.substring(0, markerIndex).replace(/[\r\n\s\-\*]+$/, "").trim();
        const teacherPart = feedback.substring(markerIndex).trim();
        return { aiPart, teacherPart };
    }

    if (feedback.includes("Observaciones del Profesor") || feedback.includes("Justificación del Ajuste")) {
        return { aiPart: "", teacherPart: feedback.trim() };
    }

    return { aiPart: feedback.trim(), teacherPart: "" };
}

interface GithubActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

export function GithubActivityDetails({ activity, userId, studentName }: GithubActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const attemptCount = submission?.attemptCount || 0;
    const maxAttempts = activity.maxAttempts || 1;

    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");

    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isStatementFullscreen, setIsStatementFullscreen] = useState(false);

    // Escape listener to close statement fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isStatementFullscreen) {
                setIsStatementFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isStatementFullscreen]);

    // Form submission state
    const [repoUrlInput, setRepoUrlInput] = useState(submission?.url || "");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ valid: string[]; missing: string[] } | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"statement" | "submit" | "ai_report" | "teacher_grade" | "mcp_chat" | "git_audit">(
        isGraded ? "ai_report" : (isSubmitted ? "ai_report" : "submit")
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    // Split AI feedback and Teacher feedback parts
    const { aiPart, teacherPart } = useMemo(() => {
        return splitFeedbackParts(submission?.feedback);
    }, [submission?.feedback]);

    // Extraer configuración de calificación docente / lista de chequeo
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const isTeacherGradingEnabled = Boolean(checklistConfig);
    const aiWeight = checklistConfig?.aiWeight ?? 30;
    const checklistWeight = checklistConfig?.checklistWeight ?? 70;

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    const aiGrade = useMemo(() => {
        if (evalMetadata?.aiGrade !== undefined && evalMetadata?.aiGrade !== null) {
            return Number(evalMetadata.aiGrade);
        }
        return null;
    }, [evalMetadata]);

    const teacherGrade = useMemo(() => {
        if (evalMetadata?.checklistScore !== undefined && evalMetadata?.checklistScore !== null) {
            return Number(evalMetadata.checklistScore);
        }
        if (evalMetadata?.manualSustentacionScore !== undefined && evalMetadata?.manualSustentacionScore !== null) {
            return Number(evalMetadata.manualSustentacionScore);
        }
        return null;
    }, [evalMetadata]);

    // Si la calificación docente está deshabilitada y la pestaña activa era teacher_grade, redirigir
    useEffect(() => {
        if (!isTeacherGradingEnabled && activeTab === "teacher_grade") {
            setActiveTab(isGraded ? "ai_report" : (isSubmitted ? "ai_report" : "submit"));
        }
    }, [isTeacherGradingEnabled, activeTab, isGraded, isSubmitted]);

    // Configured required file paths
    const configuredPathsList: string[] = useMemo(() => {
        if (!activity?.filePaths) return [];
        if (typeof activity.filePaths === "string") {
            return activity.filePaths.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(activity.filePaths)) {
            return activity.filePaths.map((s: any) => String(s).trim()).filter(Boolean);
        }
        return [];
    }, [activity?.filePaths]);

    async function handleVerifyAndShowConfirm() {
        if (activity.isGroupActivity && !activity.isLeader) {
            setSubmitError("Esta actividad es grupal. Únicamente el líder de tu equipo puede realizar la entrega.");
            return;
        }

        if (!repoUrlInput.trim()) {
            setSubmitError("Por favor ingresa la URL del repositorio.");
            return;
        }

        setSubmitError(null);
        const hasConfiguredPaths = Boolean(configuredPathsList.length > 0);

        if (!hasConfiguredPaths) {
            setVerificationResult(null);
            setShowConfirmDialog(true);
            return;
        }

        setIsVerifying(true);
        setVerificationResult(null);

        try {
            const { validFiles, missingFiles, warning } = await fetchRepoFilesAction(repoUrlInput, activity.filePaths || "", activity.id);
            setVerificationResult({
                valid: validFiles.map(f => f.path),
                missing: missingFiles
            });
            if (warning) {
                toast.warning("Límite de API Posible", { description: warning });
            }
            setShowConfirmDialog(true);
        } catch (err: any) {
            setSubmitError(err.message || "Error al verificar el repositorio. Verifica que la URL sea correcta y el repositorio sea público.");
        } finally {
            setIsVerifying(false);
        }
    }

    async function handleConfirmSubmit() {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await submitGithubActivityAction(activity.id, repoUrlInput);
            setShowConfirmDialog(false);
            toast.success("¡Entrega enviada correctamente!");
            router.refresh();
        } catch (err: any) {
            setSubmitError(err.message || "Error al realizar la entrega.");
            setShowConfirmDialog(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden flex-1 min-h-0">
            <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-1.5 sm:gap-2 h-full overflow-hidden">
                {/* Columna Izquierda: Información de Actividad, Grupo y Enunciado */}
                {!isLeftCollapsed && (
                    <div className="lg:col-span-5 xl:col-span-5 flex flex-col shrink-0 lg:shrink lg:h-full lg:min-h-0 lg:overflow-hidden gap-1 sm:gap-1.5">
                        {/* Tarjeta de Encabezado y Metadatos en 2 Líneas Organizadas */}
                        <div className="shrink-0 p-1.5 sm:p-2 rounded-xl border bg-card text-card-foreground shadow-2xs space-y-1.5">
                            {/* Fila 1 (Arriba): Nombre de la actividad en una sola línea y a la derecha Grupal / Individual + Acciones */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                    <h2 className="font-bold text-xs sm:text-sm text-card-foreground tracking-tight truncate" title={activity.title}>
                                        {activity.title}
                                    </h2>
                                    <Badge variant="outline" className="text-[9px] font-bold gap-1 shrink-0 bg-primary/10 text-primary border-primary/30 uppercase tracking-wider py-0 px-1.5 h-4">
                                        <Github className="h-2.5 w-2.5 text-primary" />
                                        <span>GitHub</span>
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Indicador de Tipo: Grupal o Individual */}
                                    {activity.isGroupActivity ? (
                                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 px-2 py-0.5 h-5.5">
                                            <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                            <span>Grupal</span>
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 px-2 py-0.5 h-5.5">
                                            <User className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                                            <span>Individual</span>
                                        </Badge>
                                    )}

                                    {submission?.url && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    asChild
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                                                    aria-label="Abrir repositorio en GitHub"
                                                >
                                                    <a
                                                        href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <Github className="h-3.5 w-3.5 text-primary" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-[11px] font-medium">
                                                Ver repositorio en GitHub
                                            </TooltipContent>
                                        </Tooltip>
                                    )}

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                asChild
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6 rounded-md border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer"
                                                aria-label="Volver a la lista de actividades"
                                            >
                                                <Link href={`/dashboard/student?courseId=${activity.courseId}&tab=activities`}>
                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[11px] font-medium">
                                            Volver a actividades
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 hidden lg:inline-flex text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                                                onClick={() => setIsLeftCollapsed(true)}
                                                aria-label="Ocultar panel del enunciado"
                                            >
                                                <PanelLeftClose className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[11px] font-medium">
                                            Ocultar enunciado (modo amplio)
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            {/* Fila 2 (Abajo): Métricas y Notas legibles completas sin cortarse */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
                                {isGraded ? (
                                    isTeacherGradingEnabled ? (
                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                            {/* Nota IA con % */}
                                            {aiGrade !== null && (
                                                <div className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md text-[10px] font-bold h-5.5 shrink-0" title={`Evaluación IA: ${aiGrade.toFixed(1)} (${aiWeight}%)`}>
                                                    <Sparkles className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                                    <span className="text-[8px] opacity-85">IA ({aiWeight}%):</span>
                                                    <span className="font-mono font-black">{aiGrade.toFixed(1)}</span>
                                                </div>
                                            )}

                                            {/* Nota Profesor con % */}
                                            {teacherGrade !== null && (
                                                <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold h-5.5 shrink-0" title={`Evaluación Docente / Sustentación: ${teacherGrade.toFixed(1)} (${checklistWeight}%)`}>
                                                    <UserCheck className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                    <span className="text-[8px] opacity-85">Profesor ({checklistWeight}%):</span>
                                                    <span className="font-mono font-black">{teacherGrade.toFixed(1)}</span>
                                                </div>
                                            )}

                                            {/* Nota Final Ponderada */}
                                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 h-5.5 shadow-2xs" title={`Nota Final Ponderada: ${submission.grade.toFixed(1)} / 5.0`}>
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span className="text-[8px] uppercase font-bold opacity-80">Final:</span>
                                                <span className="text-xs font-black font-mono">{submission.grade.toFixed(1)}</span>
                                                <span className="text-[8px] opacity-75">/ 5.0</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 h-5.5">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="text-[8px] uppercase font-bold opacity-80">Nota:</span>
                                            <span className="text-xs font-black font-mono">{submission.grade.toFixed(1)}</span>
                                            <span className="text-[8px] opacity-75">/ 5.0</span>
                                        </div>
                                    )
                                ) : isSubmitted ? (
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] px-2 py-0.5 h-5 font-bold shrink-0">
                                        Entregado
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 font-bold opacity-75 shrink-0">
                                        Pendiente de Entrega
                                    </Badge>
                                )}

                                {activity.deadline && (
                                    <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate shrink-0 ml-auto" title={`Vence: ${format(new Date(activity.deadline), "PP p")}`}>
                                        • Vence: {format(new Date(activity.deadline), "PP p")}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Banner Grupal Ultra-Compacto */}
                        <GroupActivityBanner activity={activity} compact={true} />

                        {/* Enunciado y Rúbrica con Scroll Independiente (Visible solo en desktop) */}
                        <div 
                            className="hidden lg:flex rounded-xl border bg-card text-card-foreground shadow-2xs overflow-hidden flex-col flex-1 min-h-0 select-none"
                            onCopy={(e) => e.preventDefault()}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <div className="p-1.5 sm:p-2 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="font-semibold text-muted-foreground truncate">
                                        Enunciado y Rúbrica de Evaluación
                                    </span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                                            onClick={() => setIsStatementFullscreen(true)}
                                            aria-label="Ver enunciado en pantalla completa"
                                        >
                                            <Maximize2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-[11px] font-medium">
                                        Pantalla completa
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2.5 select-none">
                                <FeedbackViewer
                                    feedback={activity.statement || "**No hay un enunciado o rúbrica cargada para esta actividad.**"}
                                    preventCopy={true}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Columna Derecha: Pestañas de Acción e Inspección */}
                <div className={`${isLeftCollapsed ? "lg:col-span-12" : "lg:col-span-7 xl:col-span-7"} flex flex-col flex-1 min-h-0 h-full overflow-hidden`}>
                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 border-b border-border/60 shrink-0 overflow-x-auto scrollbar-none">
                            {isLeftCollapsed && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setIsLeftCollapsed(false)}
                                            className="h-7 w-7 shrink-0 hidden lg:inline-flex shadow-2xs mb-1 rounded-md border-border/80 hover:bg-accent"
                                            aria-label="Mostrar enunciado de la actividad"
                                        >
                                            <PanelLeftOpen className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="text-[11px] font-medium">
                                        Mostrar enunciado de la actividad
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <TabsList className={cn(
                                "flex w-max lg:w-full h-8 sm:h-9 lg:h-10 !bg-transparent !p-0 !border-0 !rounded-none !shadow-none gap-0.5 lg:gap-0",
                                isTeacherGradingEnabled ? "lg:grid lg:grid-cols-5" : "lg:grid lg:grid-cols-4"
                            )}>
                                {/* Pestaña Enunciado exclusiva de Móvil */}
                                <TabsTrigger 
                                    value="statement" 
                                    className="lg:hidden group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 whitespace-nowrap"
                                >
                                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-500 transition-colors group-data-[state=active]:text-primary" />
                                    <span>Enunciado</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="submit" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Send className="h-3.5 w-3.5 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Entrega</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="ai_report" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Sparkles className="h-3.5 w-3.5 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Retroalimentación IA</span>
                                    {isGraded && aiGrade !== null && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold ml-0.5">
                                            {aiGrade.toFixed(1)}
                                        </Badge>
                                    )}
                                </TabsTrigger>

                                {isTeacherGradingEnabled && (
                                    <TabsTrigger 
                                        value="teacher_grade" 
                                        className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                    >
                                        <UserCheck className="h-3.5 w-3.5 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                        <span className="truncate">Profesor</span>
                                        {isGraded && teacherGrade !== null && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold ml-0.5">
                                                {teacherGrade.toFixed(1)}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}

                                <TabsTrigger 
                                    value="mcp_chat" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Bot className="h-3.5 w-3.5 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Inspector</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="git_audit" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <GitCommitVertical className="h-3.5 w-3.5 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Auditoría Git</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña de Enunciado para Móvil */}
                        <TabsContent value="statement" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full lg:hidden select-none">
                            <div 
                                className="rounded-xl border bg-card text-card-foreground shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0 select-none"
                                onCopy={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                <div className="p-1.5 sm:p-2 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
                                    <div className="flex items-center gap-2 truncate">
                                        <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="font-semibold text-muted-foreground truncate">
                                            Enunciado y Rúbrica de Evaluación
                                        </span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md shrink-0 cursor-pointer"
                                                onClick={() => setIsStatementFullscreen(true)}
                                                aria-label="Ver enunciado en pantalla completa"
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[11px] font-medium">
                                            Pantalla completa
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2.5 select-none">
                                    <FeedbackViewer
                                        feedback={activity.statement || "**No hay un enunciado o rúbrica cargada para esta actividad.**"}
                                        preventCopy={true}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 1: Entrega de Repositorio */}
                        <TabsContent value="submit" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                        <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                            <div className="p-3 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <Send className="h-4 w-4 text-blue-500 shrink-0" />
                                    <span className="font-semibold text-muted-foreground truncate">
                                        Registrar o Actualizar Entrega (GitHub)
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="tab-repo-url" className="text-sm font-bold text-primary flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            URL del Repositorio GitHub
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Ingresa el enlace público de tu repositorio de GitHub para enviar o actualizar tu entrega.
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="relative flex-1">
                                            <Github className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                                            <Input
                                                id="tab-repo-url"
                                                placeholder="https://github.com/usuario/repositorio"
                                                value={repoUrlInput}
                                                onChange={(e) => setRepoUrlInput(e.target.value)}
                                                disabled={isVerifying || Boolean(activity.deadline && new Date(activity.deadline) < new Date()) || Boolean(activity.isGroupActivity && !activity.isLeader)}
                                                className="h-9 text-xs pl-9 bg-background border-primary/20"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleVerifyAndShowConfirm}
                                            disabled={isVerifying || !repoUrlInput.trim() || Boolean(activity.deadline && new Date(activity.deadline) < new Date()) || Boolean(activity.isGroupActivity && !activity.isLeader)}
                                            className="h-9 px-4 font-bold text-xs gap-2 shrink-0 shadow-xs"
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Verificando...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-3.5 w-3.5" />
                                                    {activity.isGroupActivity && !activity.isLeader
                                                        ? "Solo el Líder puede Entregar"
                                                        : (isSubmitted ? "Actualizar Entrega" : "Entregar Repositorio")}
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {submitError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-xs font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{submitError}</span>
                                        </div>
                                    )}
                                </div>

                                {isSubmitted && (
                                    <div className="p-4 rounded-xl border bg-card space-y-3">
                                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            Detalles de la Entrega Actual
                                        </h5>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Enlace del Repositorio:</span>
                                                <a
                                                    href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 font-mono font-medium hover:underline flex items-center gap-1 mt-0.5 break-all"
                                                >
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                    {submission.url}
                                                </a>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Fecha de Entrega:</span>
                                                <span className="font-medium text-foreground mt-0.5 block">
                                                    {submission.createdAt ? format(new Date(submission.createdAt), "PP p") : "Registrada"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Retroalimentación IA */}
                    <TabsContent value="ai_report" className="mt-1 flex-1 min-h-0 overflow-y-auto">
                        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm space-y-3 sm:space-y-4 h-full flex flex-col min-h-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 border-b pb-2.5 sm:pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Retroalimentación Inteligente (IA Gemini)
                                        </h4>
                                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30 py-0.5">
                                            Solo Lectura
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                                        Análisis automático detallado generado por la IA basándose en los archivos inspeccionados y la rúbrica.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isSubmitted && submission?.feedback && (
                                        <ExportFeedbackButtons
                                            activity={activity}
                                            submission={submission}
                                            studentName={studentName}
                                            size="sm"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                                {isTeacherGradingEnabled && isGraded && (
                                    <div className="p-3 rounded-xl border border-primary/20 bg-muted/20 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold flex items-center gap-1.5 text-foreground">
                                                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                Ponderación de Calificación: {aiWeight}% IA + {checklistWeight}% Docente
                                            </span>
                                            <span className="text-[11px] font-mono">
                                                Nota Final: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{submission.grade.toFixed(1)} / 5.0</strong>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="p-2 rounded-lg bg-purple-500/[0.06] border border-purple-500/20 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> Evaluación IA ({aiWeight}%)
                                                </span>
                                                <span className="font-mono font-black">{aiGrade !== null ? aiGrade.toFixed(1) : "—"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                    <UserCheck className="h-3 w-3" /> Sustentación ({checklistWeight}%)
                                                </span>
                                                <span className="font-mono font-black">{teacherGrade !== null ? teacherGrade.toFixed(1) : "—"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Nota Final Ponderada
                                                </span>
                                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">{submission.grade.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isSubmitted && aiPart ? (
                                    <FeedbackViewer 
                                        feedback={aiPart} 
                                        repoUrl={submission?.url || repoUrlInput}
                                        configuredPaths={activity.filePaths}
                                    />
                                ) : isSubmitted ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <Sparkles className="h-10 w-10 text-primary opacity-40 animate-pulse" />
                                        <p className="font-bold text-sm">Entrega en Proceso de Evaluación</p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            Tu entrega fue recibida exitosamente. El análisis inteligente con IA se publicará aquí una vez sea procesado por el profesor.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                                        <p className="font-medium text-sm">Aún no has realizado una entrega.</p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            Ingresa el enlace de tu repositorio de GitHub en la pestaña de Entrega para enviar tu trabajo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 4: Observaciones del Profesor */}
                    {isTeacherGradingEnabled && (
                    <TabsContent value="teacher_grade" className="mt-1 flex-1 min-h-0 overflow-y-auto">
                        <div className="rounded-xl border bg-card p-3 sm:p-5 shadow-sm space-y-3 sm:space-y-4 h-full flex flex-col min-h-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 border-b pb-2.5 sm:pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-emerald-500" />
                                            Observaciones y Calificación del Profesor
                                        </h4>
                                        {isGraded && (
                                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 py-0.5">
                                                Nota: {submission.grade.toFixed(1)} / 5.0
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                                        Comentarios docentes, justificaciones de nota y recomendaciones personalizadas del profesor.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isSubmitted && submission?.feedback && (
                                        <ExportFeedbackButtons
                                            activity={activity}
                                            submission={submission}
                                            studentName={studentName}
                                            size="sm"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                                {isTeacherGradingEnabled && isGraded && (
                                    <div className="p-3 rounded-xl border border-primary/20 bg-muted/20 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold flex items-center gap-1.5 text-foreground">
                                                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                Ponderación de Calificación: {aiWeight}% IA + {checklistWeight}% Sustentación Docente
                                            </span>
                                            <span className="text-[11px] font-mono">
                                                Nota Final: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{submission.grade.toFixed(1)} / 5.0</strong>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="p-2 rounded-lg bg-purple-500/[0.06] border border-purple-500/20 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> Evaluación IA ({aiWeight}%)
                                                </span>
                                                <span className="font-mono font-black">{aiGrade !== null ? aiGrade.toFixed(1) : "—"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                    <UserCheck className="h-3 w-3" /> Sustentación ({checklistWeight}%)
                                                </span>
                                                <span className="font-mono font-black">{teacherGrade !== null ? teacherGrade.toFixed(1) : "—"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Nota Final Ponderada
                                                </span>
                                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">{submission.grade.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Criterios Calificados por el Profesor (Sustentación Oral) */}
                                {checklistConfig?.criteria && checklistConfig.criteria.length > 0 && (
                                    <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                    <ListChecks className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-xs sm:text-sm text-foreground">
                                                            Criterios de Sustentación Calificados
                                                        </h5>
                                                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                                                            {checklistConfig.criteria.length} criterios
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Criterios evaluados por el docente durante la sustentación oral de tu entrega.
                                                    </p>
                                                </div>
                                            </div>

                                            {teacherGrade !== null && (
                                                <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 py-1 px-2.5">
                                                    Nota Sustentación: {teacherGrade.toFixed(1)} / 5.0
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            {checklistConfig.criteria.map((crit, idx) => {
                                                const factor = evalMetadata?.criteriaLevels?.[crit.id] 
                                                    ?? evalMetadata?.criteriaLevels?.[`crit-${idx + 1}`] 
                                                    ?? evalMetadata?.criteriaLevels?.[String(idx + 1)]
                                                    ?? (typeof evalMetadata?.criteriaLevels?.[crit.name] === "number" ? evalMetadata.criteriaLevels[crit.name] : undefined);
                                                const hasLevel = typeof factor === "number";
                                                const rubricLevel = hasLevel ? RUBRIC_LEVELS.find(l => l.factor === factor) : null;
                                                const weightPct = Number(crit.percentage) || 0;
                                                const earnedWeight = hasLevel ? (weightPct * factor) : (teacherGrade !== null ? (weightPct * (teacherGrade / 5.0)) : null);
                                                const criterionGrade = hasLevel 
                                                    ? (factor * 5.0).toFixed(1) 
                                                    : (teacherGrade !== null ? teacherGrade.toFixed(1) : null);

                                                return (
                                                    <div
                                                        key={crit.id || idx}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all space-y-2",
                                                            rubricLevel?.key === "sabe"
                                                                ? "bg-emerald-500/[0.05] border-emerald-500/30"
                                                                : rubricLevel?.key === "aceptable"
                                                                ? "bg-blue-500/[0.05] border-blue-500/30"
                                                                : rubricLevel?.key === "parcial"
                                                                ? "bg-amber-500/[0.05] border-amber-500/30"
                                                                : rubricLevel?.key === "no_sabe"
                                                                ? "bg-rose-500/[0.05] border-rose-500/30"
                                                                : "bg-muted/10 border-border/70"
                                                        )}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                                                <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0 bg-primary/5 text-primary border-primary/20">
                                                                    #{idx + 1}
                                                                </Badge>
                                                                <span className="font-bold text-xs sm:text-sm text-foreground">
                                                                    {crit.name}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                                                {rubricLevel ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "text-[10px] font-bold gap-1",
                                                                            rubricLevel.key === "sabe"
                                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                                : rubricLevel.key === "aceptable"
                                                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                                                : rubricLevel.key === "parcial"
                                                                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                                                        )}
                                                                    >
                                                                        <rubricLevel.icon className="h-3 w-3" />
                                                                        <span>{rubricLevel.label} ({rubricLevel.pct})</span>
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
                                                                        {teacherGrade !== null ? `Global: ${teacherGrade.toFixed(1)} / 5.0` : "Pendiente"}
                                                                    </Badge>
                                                                )}

                                                                {earnedWeight !== null ? (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] font-mono font-bold"
                                                                    >
                                                                        +{earnedWeight.toFixed(1)}% / {crit.percentage}%
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                                        Peso: {crit.percentage}%
                                                                    </Badge>
                                                                )}

                                                                {criterionGrade !== null && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20"
                                                                    >
                                                                        Nota: {criterionGrade} / 5.0
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {crit.question && (
                                                            <div className="text-[11px] sm:text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-0.5">
                                                                <div className="font-semibold text-primary flex items-center gap-1">
                                                                    <HelpCircle className="h-3 w-3" />
                                                                    Pregunta evaluada:
                                                                </div>
                                                                <p className="text-foreground leading-snug">{crit.question}</p>
                                                            </div>
                                                        )}

                                                        {crit.expectedAnswer && (
                                                            <div className="text-[11px] sm:text-xs text-muted-foreground bg-emerald-500/5 p-2 rounded-lg space-y-0.5 border border-emerald-500/10">
                                                                <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Criterio esperado / Qué se evalúa:
                                                                </div>
                                                                <p className="text-foreground/90 leading-snug">{crit.expectedAnswer}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Observaciones Escritas del Docente */}
                                {isGraded && teacherPart ? (
                                    <div className="p-3.5 sm:p-4 rounded-xl border bg-card space-y-2.5">
                                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
                                            <UserCheck className="h-4 w-4 text-emerald-500" />
                                            Comentarios y Observaciones del Profesor
                                        </h5>
                                        <FeedbackViewer 
                                            feedback={teacherPart} 
                                            repoUrl={submission?.url || repoUrlInput}
                                            configuredPaths={activity.filePaths}
                                        />
                                    </div>
                                ) : isGraded && (!checklistConfig?.criteria || checklistConfig.criteria.length === 0) ? (
                                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                                        <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Calificación Asignada: {submission.grade.toFixed(1)} / 5.0
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            El profesor ha registrado tu calificación definitiva. No se incluyeron observaciones escritas adicionales.
                                        </p>
                                    </div>
                                ) : !isGraded && isSubmitted ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 rounded-xl border border-dashed bg-muted/10">
                                        <UserCheck className="h-10 w-10 text-emerald-500 opacity-40" />
                                        <p className="font-bold text-sm">Pendiente de Revisión Docente</p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            Tu entrega fue registrada. Los criterios y la calificación asignada por el docente aparecerán aquí una vez completada la sustentación.
                                        </p>
                                    </div>
                                ) : !isSubmitted ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                                        <p className="font-medium text-sm">Aún no has realizado una entrega.</p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            Ingresa el enlace de tu repositorio de GitHub en la pestaña de Entrega para enviar tu trabajo.
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </TabsContent>
                    )}

                    {/* Tab 5: Auditoría Git (Commits y Colaboradores) */}
                    <TabsContent value="git_audit" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                        <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                            <GithubRepoAudit
                                repoUrl={submission?.url || repoUrlInput}
                                activityId={activity?.id}
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 6: Inspector GitHub MCP (Histórico de Conversaciones - Modo Estudiante) */}
                    <TabsContent value="mcp_chat" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                        {(submission?.url || repoUrlInput) ? (
                            <GitHubRepoChatInspector
                                repoUrl={submission?.url || repoUrlInput}
                                studentName={studentName}
                                activityId={activity?.id}
                                studentId={userId}
                                readOnly={true}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-card rounded-xl border">
                                <Bot className="h-10 w-10 text-muted-foreground/40 mb-2" />
                                <p className="text-sm font-semibold">No se ha registrado una entrega de GitHub aún.</p>
                                <p className="text-xs text-muted-foreground mt-1">Realiza tu entrega para visualizar las auditorías y consultas técnicas del docente.</p>
                            </div>
                        )}
                    </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Diálogo de Confirmación de Entrega */}
            <Dialog open={showConfirmDialog} onOpenChange={(open) => { if (!isSubmitting) setShowConfirmDialog(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Confirmar Entrega</DialogTitle>
                        <DialogDescription>
                            {configuredPathsList.length > 0
                                ? "Revisa el siguiente informe de verificación antes de confirmar tu entrega."
                                : "Revisa la URL del repositorio antes de confirmar tu entrega."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Informe de verificación (solo si la actividad define archivos requeridos) */}
                        {verificationResult && configuredPathsList.length > 0 && (
                            <div className="p-3 bg-muted/30 border rounded-md text-sm space-y-3">
                                <p className="font-semibold text-xs text-muted-foreground uppercase">Informe de Verificación de Archivos</p>

                                {verificationResult.valid.length > 0 && (
                                    <div>
                                        <p className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 text-xs">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Archivos encontrados ({verificationResult.valid.length}):
                                        </p>
                                        <ul className="list-disc pl-5 text-xs mt-1 text-muted-foreground space-y-0.5">
                                            {verificationResult.valid.map(file => (
                                                <li key={file}><code className="font-mono">{file}</code></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {verificationResult.missing.length > 0 ? (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-md">
                                        <p className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 text-xs">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            ⚠️ Archivos NO encontrados ({verificationResult.missing.length}):
                                        </p>
                                        <ul className="list-disc pl-5 text-xs mt-1 text-amber-700/80 dark:text-amber-400/80 space-y-0.5">
                                            {verificationResult.missing.map(file => (
                                                <li key={`missing-${file}`}><code className="font-mono">{file}</code></li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium">
                                            Puedes entregar aunque falten archivos, pero el profesor los tendrá en cuenta al calificar.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-green-700 dark:text-green-400 flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p className="text-xs font-medium leading-relaxed">¡Todos los archivos requeridos fueron encontrados! Tu entrega está completa.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border">
                            <strong>Repositorio a entregar:</strong>{" "}
                            <a href={repoUrlInput} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                                {repoUrlInput}
                            </a>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmSubmit}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Confirmar Entrega
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal / Overlay de Pantalla Completa para Enunciado y Rúbrica */}
            {isStatementFullscreen && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in-0 duration-200">
                    <div className="p-3 sm:p-4 bg-muted/50 border-b flex items-center justify-between shrink-0 px-4 sm:px-8">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                                        Enunciado y Rúbrica de Evaluación
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0 hidden sm:inline-flex">
                                        {activity.title}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    Vista completa de lectura • Presiona Esc o el botón para restaurar
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold h-8 cursor-pointer shadow-xs"
                                onClick={() => setIsStatementFullscreen(false)}
                            >
                                <Minimize2 className="h-3.5 w-3.5" />
                                <span>Salir de pantalla completa</span>
                            </Button>
                        </div>
                    </div>

                    <div 
                        className="flex-1 overflow-y-auto p-4 sm:p-8 select-none"
                        onCopy={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="max-w-4xl mx-auto space-y-4 bg-card p-6 sm:p-8 rounded-2xl border shadow-sm select-none">
                            <FeedbackViewer
                                feedback={activity.statement || "**No hay un enunciado o rúbrica cargada para esta actividad.**"}
                                preventCopy={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
