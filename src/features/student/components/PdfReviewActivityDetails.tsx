"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, Download, FileText, ExternalLink, Info, Send, RotateCcw, Sparkles } from "lucide-react";
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

    return (
        <div className="space-y-6 w-full p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{activity.title}</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {activity.course.title}
                    </p>
                </div>
                {isGraded && (
                    <div className="flex flex-col items-end bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Tu Calificación</span>
                        <span className="text-3xl font-black">{submission.grade.toFixed(1)}</span>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Estado de la Entrega (Evaluación de PDF)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Tu Estado:</span>
                                {isReevaluationRequested ? (
                                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none px-3 py-1 font-bold gap-1">
                                        <RotateCcw className="h-3.5 w-3.5" /> Reevaluación Solicitada
                                    </Badge>
                                ) : isGraded ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold">
                                        Completado
                                    </Badge>
                                ) : isRejected ? (
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1 font-bold">
                                        Rechazado
                                    </Badge>
                                ) : isSubmitted ? (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-bold gap-1">
                                        <Clock className="h-3 w-3" />
                                        En Revisión
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="px-3 py-1 font-bold">
                                        Pendiente
                                    </Badge>
                                )}

                                {pdfConfig && (
                                    <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-medium shrink-0">
                                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>
                                            Páginas a evaluar por IA:{" "}
                                            <strong className="font-bold">
                                                {pdfConfig.mode === "first_n"
                                                    ? `Primeras ${pdfConfig.maxPages ?? 5} páginas`
                                                    : pdfConfig.mode === "range"
                                                    ? `Páginas ${pdfConfig.pageRange || "1-5"}`
                                                    : "Documento completo"}
                                            </strong>
                                        </span>
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium">
                                <span>Vencimiento: <span className="text-primary font-bold">{activity.deadline ? format(new Date(activity.deadline), "PP p") : "Sin límite"}</span></span>
                            </div>

                            {isGraded && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Nota:</span>
                                        <span className="text-2xl font-bold text-primary">
                                            {submission.grade.toFixed(1)}
                                        </span>
                                        <ExportFeedbackButtons
                                            activity={activity}
                                            submission={submission}
                                            studentName={studentName}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Submission hints */}
                        <div className="space-y-3">
                            {pdfConfig && (
                                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm">
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
                                        <p className="text-xs opacity-90 leading-relaxed">
                                            {pdfConfig.mode === "first_n"
                                                ? `Tu profesor configuró la IA para evaluar únicamente las primeras ${pdfConfig.maxPages ?? 5} páginas de tu informe. Asegúrate de que el contenido principal, análisis y conclusiones se encuentren dentro de estas páginas iniciales.`
                                                : pdfConfig.mode === "range"
                                                ? `Tu profesor configuró la IA para evaluar exclusivamente el intervalo de páginas ${pdfConfig.pageRange || "1-5"}. Asegúrate de ubicar tu desarrollo principal en este rango.`
                                                : "La inteligencia artificial evaluará la totalidad del documento sin recorte de páginas."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">¿Cómo entregar?</p>
                                    <p className="text-xs mt-0.5 opacity-90">
                                        Sube tu documento PDF a <strong>Google Drive</strong> y asegúrate de que el permiso de
                                        compartición esté en <em>"Cualquiera con el enlace puede ver"</em>. Luego pega el
                                        enlace abajo. La IA evaluará tu documento automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form / Submitted view */}
                        {activity.deadline && new Date(activity.deadline) < new Date() ? (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-md flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">Actividad Cerrada</p>
                                    <p className="text-xs opacity-90">
                                        La fecha límite para esta actividad ha pasado. Ya no se aceptan nuevas entregas.
                                    </p>
                                </div>
                            </div>
                        ) : isSubmitted ? (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Tu entrega más reciente:</Label>
                                    <a
                                        href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        {submission.url}
                                    </a>
                                </div>

                                {isRejected && (
                                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg flex items-start gap-3">
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
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="text-sm font-medium mb-4">
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

                {/* Tabs */}
                <Tabs defaultValue="rubric" className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1 shrink-0 -mx-1 px-1">
                        <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-9 p-1 gap-1">
                            <TabsTrigger value="rubric" className="shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">
                                <span>Criterios de Evaluación</span>
                            </TabsTrigger>
                            <TabsTrigger value="feedback" className="shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">
                                <span>Resultado</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>


                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Criterios de Evaluación</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    La IA evaluará tu PDF según estos criterios. Asegúrate de cumplirlos todos para
                                    obtener la mejor calificación.
                                </p>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="bg-card rounded-lg p-2 select-none" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
                                    <FeedbackViewer 
                                        feedback={activity.statement || "**No hay criterios de evaluación disponibles.**"} 
                                        preventCopy={true}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-4">
                        <Card className="w-full border-primary/20 shadow-sm">
                            <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-primary" />
                                    Resultado de la Evaluación
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
                            <CardContent className="pt-6">
                                {isSubmitted && submission.feedback ? (
                                    <div className="bg-card rounded-lg p-2">
                                        <FeedbackViewer feedback={submission.feedback} />
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        <div className="flex justify-center mb-3 text-muted-foreground/30">
                                            <FileText className="h-10 w-10" />
                                        </div>
                                        <p className="font-medium text-base">Aún no hay retroalimentación disponible.</p>
                                        {!isSubmitted && (
                                            <p className="text-sm mt-1">
                                                Entrega tu PDF para recibir retroalimentación.
                                            </p>
                                        )}
                                        {isSubmitted && !isGraded && (
                                            <p className="text-sm mt-1">
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
        <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
            <div className="space-y-2">
                <Label htmlFor="url" className="text-base font-bold text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Enlace al PDF (Google Drive / OneDrive / Dropbox)
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="url"
                        name="url"
                        placeholder="https://drive.google.com/file/d/..."
                        required
                        disabled={status === "submitting" || isLeaderDisabled}
                        className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                    />
                    <Button 
                        type="submit" 
                        disabled={status === "submitting" || isLeaderDisabled}
                        className="shadow-md hover:shadow-lg transition-all gap-2"
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
