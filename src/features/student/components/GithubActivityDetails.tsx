"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Github, Sparkles, Loader2, CheckCircle, ExternalLink, Send, Download,
    AlertCircle, ClipboardList, ChevronLeft, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchRepoFilesAction } from "@/features/github/actions/githubActions";
import { submitGithubActivityAction } from "@/features/student/actions/submissionActions";
import { FeedbackViewer } from "./FeedbackViewer";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { ActivityReportTemplate } from "./ActivityReportTemplate";
import { useReactToPrint } from "react-to-print";
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

    // Form submission state
    const [repoUrlInput, setRepoUrlInput] = useState(submission?.url || "");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ valid: string[]; missing: string[] } | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"statement" | "submit" | "ai_report" | "teacher_grade">(isGraded ? "ai_report" : "statement");
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Informe_${activity.title.replace(/\s+/g, '_')}`,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Split AI feedback and Teacher feedback parts
    const { aiPart, teacherPart } = useMemo(() => {
        return splitFeedbackParts(submission?.feedback);
    }, [submission?.feedback]);

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
        <div className="flex flex-col h-full w-full gap-3 overflow-hidden flex-1 min-h-0">
            {/* Header Bar: Ultra-Compact Bar */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border bg-card text-card-foreground shadow-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-card-foreground tracking-tight truncate">
                            {activity.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold gap-1 shrink-0 bg-primary/10 text-primary border-primary/30 uppercase tracking-wider py-0 px-1.5 h-4">
                            <Github className="h-2.5 w-2.5 text-primary" />
                            <span>GitHub</span>
                        </Badge>
                    </div>

                    {activity.deadline && (
                        <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1 shrink-0">
                            • Vence: {format(new Date(activity.deadline), "PP p")}
                        </span>
                    )}

                    <Badge variant="outline" className="text-[10px] font-mono shrink-0 py-0 px-1.5 h-4">
                        Intentos: {attemptCount} / {maxAttempts}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    {isGraded ? (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            <span className="text-[9px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-xs font-black">{submission.grade.toFixed(1)}</span>
                            <span className="text-[9px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : isSubmitted ? (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] px-2 py-0.5 font-bold">
                            Entregado (Pendiente)
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold opacity-75">
                            Pendiente de Entrega
                        </Badge>
                    )}

                    {submission?.url && (
                        <Button
                            asChild
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] gap-1 shrink-0"
                            title="Abrir tu repositorio en GitHub (nueva pestaña)"
                        >
                            <a
                                href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Github className="h-3 w-3 text-primary" />
                                <span>Ver Repo</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                        </Button>
                    )}

                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 sm:h-7 px-2.5 text-xs font-semibold shrink-0 gap-1 rounded-md border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer"
                        title="Volver a la lista de actividades"
                    >
                        <Link href={`/dashboard/student?courseId=${activity.courseId}&tab=activities`}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Volver</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Main Clean 4-Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "statement" | "submit" | "ai_report" | "teacher_grade")} className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1 shrink-0 -mx-1 px-1">
                        <TabsList className="inline-flex w-max min-w-full md:grid md:grid-cols-4 h-auto min-h-10 p-1 gap-1">
                            <TabsTrigger value="statement" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span>Enunciado y Rúbrica</span>
                            </TabsTrigger>
                            <TabsTrigger value="submit" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <Send className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span>Entrega</span>
                            </TabsTrigger>
                            <TabsTrigger value="ai_report" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>Retroalimentación IA</span>
                            </TabsTrigger>
                            <TabsTrigger value="teacher_grade" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Observaciones Profesor</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Tab 1: Enunciado y Rúbrica */}
                    <TabsContent value="statement" className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                        <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                            <div className="p-3 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
                                <div className="flex items-center gap-2 truncate">
                                    <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="font-semibold text-muted-foreground truncate">
                                        {activity.title} — Enunciado y Rúbrica de Evaluación
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <FeedbackViewer
                                    feedback={activity.statement || "**No hay un enunciado o rúbrica cargada para esta actividad.**"}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Entrega de Repositorio */}
                    <TabsContent value="submit" className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
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
                                            disabled={isVerifying || !repoUrlInput.trim() || (attemptCount >= maxAttempts && !isRejected) || Boolean(activity.deadline && new Date(activity.deadline) < new Date()) || Boolean(activity.isGroupActivity && !activity.isLeader)}
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
                                                        : (isSubmitted ? "Re-entregar Repositorio" : "Entregar Repositorio")}
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
                                                <span className="text-muted-foreground block text-[11px]">Intentos Consumidos:</span>
                                                <span className="font-mono font-bold text-foreground mt-0.5 block">
                                                    {attemptCount} / {maxAttempts}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Retroalimentación IA */}
                    <TabsContent value="ai_report" className="mt-3 flex-1 min-h-0 overflow-y-auto">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 h-full flex flex-col min-h-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 border-b pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-sm flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Retroalimentación Inteligente (IA Gemini)
                                        </h4>
                                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30 py-0.5">
                                            Solo Lectura
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Análisis automático detallado generado por la IA basándose en los archivos inspeccionados y la rúbrica.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isSubmitted && submission?.feedback && (
                                        <>
                                            <ExportFeedbackButtons
                                                activity={activity}
                                                submission={submission}
                                                studentName={studentName}
                                                size="sm"
                                            />
                                            <div style={{ display: 'none' }}>
                                                <ActivityReportTemplate
                                                    ref={componentRef}
                                                    activity={activity}
                                                    submission={submission}
                                                    studentName={studentName}
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 h-8 text-xs"
                                                onClick={() => handlePrint()}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span>PDF</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                {isSubmitted && aiPart ? (
                                    <FeedbackViewer feedback={aiPart} />
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
                    <TabsContent value="teacher_grade" className="mt-3 flex-1 min-h-0 overflow-y-auto">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 h-full flex flex-col min-h-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 border-b pb-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-sm flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-emerald-500" />
                                            Observaciones y Calificación del Profesor
                                        </h4>
                                        {isGraded && (
                                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 py-0.5">
                                                Nota: {submission.grade.toFixed(1)} / 5.0
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
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

                            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                {isGraded && teacherPart ? (
                                    <FeedbackViewer feedback={teacherPart} />
                                ) : isGraded ? (
                                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2">
                                        <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Calificación Asignada: {submission.grade.toFixed(1)} / 5.0
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            El profesor ha registrado tu calificación definitiva. No se incluyeron observaciones escritas adicionales.
                                        </p>
                                    </div>
                                ) : isSubmitted ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <UserCheck className="h-10 w-10 text-emerald-500 opacity-40" />
                                        <p className="font-bold text-sm">Pendiente de Revisión Docente</p>
                                        <p className="text-xs text-muted-foreground max-w-sm">
                                            Tu entrega fue registrada. Las observaciones del profesor aparecerán aquí en cuanto sean revisadas y calificadas.
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
                </Tabs>
            </div>

            {/* Diálogo de Confirmación de Entrega */}
            <Dialog open={showConfirmDialog} onOpenChange={(open) => { if (!isSubmitting) setShowConfirmDialog(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Confirmar Entrega</DialogTitle>
                        <DialogDescription>
                            {configuredPathsList.length > 0
                                ? "Revisa el siguiente informe antes de confirmar tu entrega. Esta acción consumirá un intento."
                                : "Revisa la URL del repositorio antes de confirmar tu entrega. Esta acción consumirá un intento."}
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
        </div>
    );
}
