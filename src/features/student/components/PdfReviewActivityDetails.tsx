"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, Download, FileText, ExternalLink, Info, Send, RotateCcw, Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { getPdfReviewConfig, PdfReviewConfig } from "@/features/teacher/utils/pdfPageUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { submitPdfActivityAction } from "@/features/student/actions/submissionActions";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { isValidPdfUrl } from "@/lib/utils";
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { StudentTeacherEvaluationSection } from "./StudentTeacherEvaluationSection";

interface PdfReviewActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

export function PdfReviewActivityDetails({ activity, userId, studentName }: PdfReviewActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const attemptCount = submission?.attemptCount || 0;
    const maxAttempts = activity.maxAttempts || 1;

    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null;
    const isReevaluationRequested = submission?.reevaluationRequested ?? false;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted
        ? resolvedTheme === "dark"
            ? "dark"
            : resolvedTheme === "light"
            ? "light"
            : "auto"
        : "light";

    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
    // Un nuevo intento o reevaluación solo está disponible si ya se calificó el intento anterior o si fue rechazada, y no ha vencido la actividad
    const canAttemptAgain = isGraded && !isDeadlinePassed;

    // Configuración de páginas de revisión PDF
    const pdfConfig = useMemo(() => getPdfReviewConfig(activity?.description), [activity?.description]);

    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    return (
        <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 p-3 sm:p-6 overflow-x-hidden">
            {/* Header: Compacto, Moderno y Responsivo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border/80 shadow-xs">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base sm:text-2xl font-bold tracking-tight text-foreground truncate" title={activity.title}>
                            {activity.title}
                        </h1>
                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 py-0 px-2 h-5 shrink-0">
                            <FileText className="h-3 w-3" />
                            <span>Evaluación de PDF</span>
                        </Badge>
                    </div>
                    <p className="text-muted-foreground font-medium text-xs sm:text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="truncate">{activity.course?.title || activity.courseTitle || "Curso"}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {checklistConfig && isGraded && evalMetadata ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {evalMetadata.aiGrade !== undefined && evalMetadata.aiGrade !== null && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-mono font-bold">
                                    IA ({checklistConfig.aiWeight}%): {Number(evalMetadata.aiGrade).toFixed(1)}
                                </Badge>
                            )}
                            {evalMetadata.checklistScore !== undefined && evalMetadata.checklistScore !== null && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-mono font-bold">
                                    Docente ({checklistConfig.checklistWeight}%): {Number(evalMetadata.checklistScore).toFixed(1)}
                                </Badge>
                            )}
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg">
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Final:</span>
                                <span className="text-lg sm:text-2xl font-black font-mono">{submission.grade.toFixed(1)}</span>
                                <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                            </div>
                        </div>
                    ) : isGraded ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Nota:</span>
                            <span className="text-lg sm:text-2xl font-black font-mono">{submission.grade.toFixed(1)}</span>
                            <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : null}

                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-semibold shrink-0 gap-1 rounded-md border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer"
                        title="Volver a la lista de actividades"
                    >
                        <Link href={activity.courseId ? `/dashboard/student?courseId=${activity.courseId}&tab=activities` : `/dashboard/student`}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Volver a actividades</span>
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
                {/* Status Card */}
                <Card className="overflow-hidden border-border/80 shadow-xs">
                    <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3 border-b bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
                            <FileText className="h-4 sm:h-5 w-4 sm:w-5 text-primary shrink-0" />
                            <span>Estado de la Entrega (Evaluación de PDF)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                        {/* Fila de Estado, Páginas y Vencimiento */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 flex-wrap min-w-0 w-full sm:w-auto">
                                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Tu Estado:</span>
                                {isReevaluationRequested ? (
                                    <Badge className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-2.5 py-0.5 font-bold gap-1 text-xs shrink-0">
                                        <RotateCcw className="h-3 w-3" /> Reevaluación Solicitada
                                    </Badge>
                                ) : isGraded ? (
                                    <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 font-bold text-xs shrink-0">
                                        <CheckCircle className="h-3 w-3 mr-1" /> Completado
                                    </Badge>
                                ) : isRejected ? (
                                    <Badge className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-2.5 py-0.5 font-bold text-xs shrink-0">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Rechazado
                                    </Badge>
                                ) : isSubmitted ? (
                                    <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 font-bold gap-1 text-xs shrink-0">
                                        <Clock className="h-3 w-3" /> En Revisión
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="px-2.5 py-0.5 font-bold text-xs shrink-0">
                                        Pendiente
                                    </Badge>
                                )}

                                {pdfConfig && (
                                    <Badge variant="outline" className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium whitespace-normal text-left max-w-full">
                                        <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                                        <span>
                                            Páginas a evaluar por IA:{" "}
                                            <strong className="font-bold">
                                                {pdfConfig.mode === "first_n"
                                                    ? `Primeras ${pdfConfig.maxPages ?? 5} págs`
                                                    : pdfConfig.mode === "range"
                                                    ? `Págs ${pdfConfig.pageRange || "1-5"}`
                                                    : "Documento completo"}
                                            </strong>
                                        </span>
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs sm:text-sm font-medium w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                    Vence: <strong className="text-foreground">{activity.deadline ? format(new Date(activity.deadline), "PP p") : "Sin límite"}</strong>
                                </span>

                                {isGraded && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <ExportFeedbackButtons
                                            activity={activity}
                                            submission={submission}
                                            studentName={studentName}
                                            size="sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Submission hints */}
                        <div className="space-y-2.5 sm:space-y-3">
                            {pdfConfig && (
                                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                                    <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-xs sm:text-sm">
                                            Alcance de Revisión de la IA:{" "}
                                            {pdfConfig.mode === "first_n"
                                                ? `Primeras ${pdfConfig.maxPages ?? 5} páginas`
                                                : pdfConfig.mode === "range"
                                                ? `Páginas ${pdfConfig.pageRange || "1-5"}`
                                                : "Documento completo"}
                                        </p>
                                        <p className="text-[11px] sm:text-xs opacity-90 leading-relaxed">
                                            {pdfConfig.mode === "first_n"
                                                ? `Tu profesor configuró la IA para evaluar únicamente las primeras ${pdfConfig.maxPages ?? 5} páginas de tu informe. Asegúrate de que el contenido principal, análisis y conclusiones se encuentren dentro de estas páginas iniciales.`
                                                : pdfConfig.mode === "range"
                                                ? `Tu profesor configuró la IA para evaluar exclusivamente el intervalo de páginas ${pdfConfig.pageRange || "1-5"}. Asegúrate de ubicar tu desarrollo principal en este rango.`
                                                : "La inteligencia artificial evaluará la totalidad del documento sin recorte de páginas."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs sm:text-sm">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">¿Cómo entregar?</p>
                                    <p className="text-[11px] sm:text-xs mt-0.5 opacity-90 leading-relaxed">
                                        Sube tu documento PDF a <strong>Google Drive</strong> y asegúrate de que el permiso de
                                        compartición esté en <em>"Cualquiera con el enlace puede ver"</em>. Luego pega el
                                        enlace abajo. La IA evaluará tu documento automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form / Submitted view */}
                        {activity.deadline && new Date(activity.deadline) < new Date() ? (
                            <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-md flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">Actividad Cerrada</p>
                                    <p className="text-xs opacity-90">
                                        La fecha límite para esta actividad ha pasado. Ya no se aceptan nuevas entregas.
                                    </p>
                                </div>
                            </div>
                        ) : isSubmitted ? (
                            <div className="space-y-3.5 sm:space-y-4">
                                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                                    <Label className="text-xs font-semibold text-muted-foreground">Tu entrega más reciente:</Label>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <a
                                            href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline break-all min-w-0"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{submission.url}</span>
                                        </a>
                                    </div>
                                </div>

                                {isRejected && (
                                    <div className="p-3.5 sm:p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm uppercase tracking-wide">Entrega Rechazada</p>
                                            <p className="text-xs leading-relaxed opacity-90">
                                                Tu entrega no cumple con los requisitos mínimos o el archivo es incorrecto. 
                                                Por favor, revisa la retroalimentación abajo y realiza una nueva entrega corregida.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!isGraded && !isRejected && (
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-md flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <p className="text-xs">
                                            Tu entrega fue recibida exitosamente. El profesor la revisará y asignará una calificación pronto.
                                        </p>
                                    </div>
                                )}

                                {canAttemptAgain && (
                                    <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t">
                                        <h4 className="text-xs sm:text-sm font-semibold mb-3">
                                            Nueva Entrega
                                        </h4>
                                        <PdfSubmissionForm
                                            activityId={activity.id}
                                            lastSubmittedAt={submission.lastSubmittedAt}
                                            isLeaderDisabled={Boolean(activity.isGroupActivity && !activity.isLeader)}
                                            pdfConfig={pdfConfig}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PdfSubmissionForm
                                activityId={activity.id}
                                lastSubmittedAt={null}
                                isLeaderDisabled={Boolean(activity.isGroupActivity && !activity.isLeader)}
                                pdfConfig={pdfConfig}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Tabs: Criterios y Resultado */}
                <Tabs defaultValue={isGraded ? "feedback" : "rubric"} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-auto min-h-9 p-1 gap-1">
                        <TabsTrigger value="rubric" className="px-3 py-1.5 text-xs font-semibold cursor-pointer">
                            <span>Criterios de Evaluación</span>
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="px-3 py-1.5 text-xs font-semibold gap-1.5 cursor-pointer">
                            <span>Resultado</span>
                            {isGraded && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                    {submission.grade.toFixed(1)}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rubric" className="mt-3 sm:mt-4">
                        <Card className="border-border/80 shadow-xs">
                            <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
                                <CardTitle className="text-sm sm:text-base font-bold">Criterios de Evaluación</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    La IA evaluará tu PDF según estos criterios. Asegúrate de cumplirlos todos para
                                    obtener la mejor calificación.
                                </p>
                            </CardHeader>
                            <CardContent className="p-3.5 sm:p-5 pt-2 sm:pt-3">
                                <div className="bg-card rounded-lg p-2 select-none" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
                                    <FeedbackViewer 
                                        feedback={activity.statement || "**No hay criterios de evaluación disponibles.**"} 
                                        preventCopy={true}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-3 sm:mt-4">
                        <Card className="w-full border-primary/20 shadow-xs overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b p-3.5 sm:p-4 flex flex-row items-center justify-between gap-2">
                                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                                    <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5 text-primary shrink-0" />
                                    <span>Resultado de la Evaluación</span>
                                </CardTitle>
                                {isSubmitted && submission?.feedback && (
                                    <ExportFeedbackButtons
                                        activity={activity}
                                        submission={submission}
                                        studentName={studentName}
                                        size="sm"
                                    />
                                )}
                            </CardHeader>
                            <CardContent className="p-3.5 sm:p-5 space-y-4">
                                {/* Sección de Evaluación Docente (Solo si está habilitada en la configuración) */}
                                {checklistConfig && isGraded && (
                                    <StudentTeacherEvaluationSection
                                        checklistConfig={checklistConfig}
                                        submission={submission}
                                    />
                                )}

                                {isSubmitted && submission.feedback ? (
                                    <div className="bg-card rounded-lg p-2">
                                        <FeedbackViewer feedback={submission.feedback} />
                                    </div>
                                ) : (
                                    <div className="text-center py-8 sm:py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-4">
                                        <div className="flex justify-center mb-3 text-muted-foreground/30">
                                            <FileText className="h-8 sm:h-10 w-8 sm:w-10" />
                                        </div>
                                        <p className="font-semibold text-sm sm:text-base">Aún no hay retroalimentación disponible.</p>
                                        {!isSubmitted && (
                                            <p className="text-xs sm:text-sm mt-1">
                                                Entrega tu PDF para recibir retroalimentación.
                                            </p>
                                        )}
                                        {isSubmitted && !isGraded && (
                                            <p className="text-xs sm:text-sm mt-1">
                                                Tu entrega está siendo revisada por el profesor.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ─── Submission Form ───────────────────────────────────────────────────────────

function PdfSubmissionForm({ 
    activityId, 
    lastSubmittedAt, 
    isLeaderDisabled = false,
    pdfConfig = null,
}: { 
    activityId: string; 
    lastSubmittedAt: string | Date | null; 
    isLeaderDisabled?: boolean;
    pdfConfig?: PdfReviewConfig | null;
}) {
    const router = useRouter();
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [progress, setProgress] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [apiRequests, setApiRequests] = useState<number | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isLeaderDisabled) {
            setError("Esta actividad es grupal. Únicamente el líder de tu grupo puede realizar la entrega.");
            return;
        }
        const formData = new FormData(event.currentTarget);
        const url = formData.get("url") as string;
        if (!url) return;

        // NUEVA VALIDACIÓN CLIENT-SIDE
        if (!isValidPdfUrl(url)) {
            setStatus("error");
            setError("El enlace no parece ser un documento PDF válido. Asegúrate de subirlo a Google Drive, OneDrive, Dropbox o que sea un enlace directo acabado en .pdf");
            return;
        }

        setStatus("submitting");
        setError(null);
        setApiRequests(null);
        setProgress("Registrando tu entrega...");

        try {
            await submitPdfActivityAction(activityId, url);

            setStatus("success");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setStatus("error");
            setError(err.message || "Ocurrió un error inesperado al entregar el PDF.");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-3.5 sm:p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-xs">
            <div className="space-y-2">
                <Label htmlFor="url" className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Enlace al PDF (Google Drive / OneDrive / Dropbox)</span>
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        id="url"
                        name="url"
                        placeholder="https://drive.google.com/file/d/..."
                        required
                        disabled={status === "submitting" || isLeaderDisabled}
                        className="flex-1 bg-background border-primary/20 focus-visible:ring-primary h-9 sm:h-10 text-xs sm:text-sm"
                    />
                    <Button 
                        type="submit" 
                        disabled={status === "submitting" || isLeaderDisabled}
                        className="shadow-xs hover:shadow-md transition-all gap-2 h-9 sm:h-10 px-4 text-xs sm:text-sm font-bold w-full sm:w-auto shrink-0 cursor-pointer"
                    >
                        {status === "submitting" ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Entregar PDF
                            </>
                        )}
                    </Button>
                </div>

                {pdfConfig && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>
                            Recuerda: la IA evaluará{" "}
                            <strong className="text-foreground">
                                {pdfConfig.mode === "first_n"
                                    ? `las primeras ${pdfConfig.maxPages ?? 5} páginas`
                                    : pdfConfig.mode === "range"
                                    ? `las páginas ${pdfConfig.pageRange || "1-5"}`
                                    : "el documento completo"}
                            </strong> de tu entrega.
                        </span>
                    </p>
                )}
                <p className="text-[10px] text-muted-foreground italic">
                    * Asegúrate de que el enlace sea público. En Google Drive: botón{" "}
                    <em>"Compartir" → "Cualquiera con el enlace"</em>.
                </p>
            </div>

            {status === "submitting" && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {progress}
                    </div>
                </div>
            )}

            {status === "error" && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Error en la evaluación</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {status === "success" && (
                <div className="p-4 bg-green-50 text-green-600 rounded-lg flex flex-col gap-1 text-sm border border-green-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <p className="font-medium">¡PDF entregado correctamente!</p>
                    </div>
                    <p className="text-xs text-green-700 ml-7">
                        El profesor revisará tu entrega pronto.
                    </p>
                </div>
            )}
        </form>
    );
}
