"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, Download, FileText, ExternalLink, Info, Send } from "lucide-react";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { submitPdfActivityAction } from "@/features/student/actions/submissionActions";
import { useReactToPrint } from "react-to-print";
import { ActivityReportTemplate } from "./ActivityReportTemplate";
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
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Informe_${activity.title.replace(/\s+/g, "_")}`,
    });

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

    // Un nuevo intento solo está disponible si ya se calificó el intento anterior o si fue rechazada
    const canAttemptAgain = isGraded;

    return (
        <div className="space-y-6 w-full p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight">{activity.title}</h1>
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
                                {isGraded ? (
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
                                    </div>

                                    <div style={{ display: "none" }}>
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
                                        className="gap-2"
                                        onClick={() => handlePrint()}
                                    >
                                        <Download className="h-4 w-4" />
                                        Descargar Informe
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Submission hints */}
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
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PdfSubmissionForm
                                activityId={activity.id}
                                lastSubmittedAt={null}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="rubric" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-auto">
                        <TabsTrigger value="rubric" className="text-xs sm:text-sm py-2 whitespace-normal">
                            <div className="flex flex-col items-center">
                                <span>Criterios de Evaluación</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="text-xs sm:text-sm py-2 whitespace-normal">
                            <div className="flex flex-col items-center">
                                <span>Resultado</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>


                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Criterios de Evaluación</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    La IA evaluará tu PDF según estos criterios. Asegúrate de cumplirlos todos para
                                    obtener la mejor calificación.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div
                                    data-color-mode={mode}
                                    className="w-full max-w-full overflow-hidden [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word! select-none"
                                >
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No hay criterios de evaluación disponibles.**"}
                                        style={{ background: "transparent" }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-4">
                        <Card className="w-full border-primary/20 shadow-sm">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-primary" />
                                    Resultado de la Evaluación
                                </CardTitle>
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
}: {
    activityId: string;
    lastSubmittedAt?: string | Date | null;
}) {
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [progress, setProgress] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [apiRequests, setApiRequests] = useState<number | null>(null);
    const router = useRouter();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
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
                        disabled={status === "submitting"}
                        className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                    />
                    <Button 
                        type="submit" 
                        disabled={status === "submitting"}
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
                                Entregar Tarea
                            </>
                        )}
                    </Button>
                </div>
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
