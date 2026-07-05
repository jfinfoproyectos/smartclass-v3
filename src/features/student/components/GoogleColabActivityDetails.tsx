"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ExternalLink, CheckCircle, Download, Send } from "lucide-react";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { gradeGoogleColabAction } from "@/features/student/actions/gradingActions";
import { useReactToPrint } from 'react-to-print';
import { ActivityReportTemplate } from "./ActivityReportTemplate";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { useCooldown } from "@/hooks/use-cooldown";

interface GoogleColabActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

export function GoogleColabActivityDetails({ activity, userId, studentName }: GoogleColabActivityDetailsProps) {
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
        documentTitle: `Informe_${activity.title.replace(/\s+/g, '_')}`,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    return (
        <div className="space-y-6 w-full p-6">
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
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de la Entrega (Google Colab)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Tu Estado:</span>
                                {isGraded ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold">Completado</Badge>
                                ) : isRejected ? (
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1 font-bold">Rechazado</Badge>
                                ) : isSubmitted ? (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-bold gap-1">
                                        <Clock className="h-3.5 w-3.5" /> En Revisión
                                    </Badge>
                                ) : (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 font-bold gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> Pendiente de Entrega
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Intentos:</span>
                                <span className="text-sm text-muted-foreground">{attemptCount} / {maxAttempts}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Vencimiento:</span>
                                <span className="text-sm text-muted-foreground">{format(new Date(activity.deadline), "PP p")}</span>
                            </div>

                            {isGraded && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Nota:</span>
                                        <span className="text-2xl font-bold text-primary">{submission.grade.toFixed(1)}</span>
                                    </div>

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
                                    <a href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1">
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
                                                Tu notebook de Google Colab ha sido rechazado. 
                                                Por favor, revisa la retroalimentación en la pestaña "Resultado" y realiza una nueva entrega abajo.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(attemptCount < maxAttempts || isRejected) && (
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="text-sm font-medium mb-4">
                                            {isRejected ? "Nueva Entrega (Corrección)" : `Nueva Entrega (Intento ${attemptCount + 1})`}
                                        </h4>
                                        <SubmissionForm
                                            activityId={activity.id}
                                            statement={activity.statement || ""}
                                            lastSubmittedAt={isRejected ? null : submission.lastSubmittedAt}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <SubmissionForm
                                activityId={activity.id}
                                statement={activity.statement || ""}
                                lastSubmittedAt={null}
                            />
                        )}
                    </CardContent>
                </Card>

                <Tabs defaultValue="instructions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                        <TabsTrigger value="instructions" className="text-xs sm:text-sm py-2 whitespace-normal wrap-break-word">
                            <div className="flex flex-col items-center">
                                <span>Instrucciones</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="rubric" className="text-xs sm:text-sm py-2 whitespace-normal wrap-break-word">
                            <div className="flex flex-col items-center">
                                <span>Rúbrica (Trabajo a realizar)</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="text-xs sm:text-sm py-2 whitespace-normal wrap-break-word">
                            <div className="flex flex-col items-center">
                                <span>Resultado de Evaluación</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="instructions" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Instrucciones de la Actividad</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Nota: Las instrucciones detalladas a continuación <strong>no se califican directamente</strong>, pero son una guía necesaria para que puedas configurar tu entorno y realizar la actividad correctamente.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div data-color-mode={mode} className="w-full max-w-full overflow-hidden [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word! select-none">
                                    <MDEditor.Markdown source={activity.description || "**No hay instrucciones disponibles.**"} style={{ background: 'transparent' }} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rúbrica / Trabajo a Realizar</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Este es el <strong>trabajo específico que debes realizar</strong> y los criterios bajo los cuales la inteligencia artificial evaluará y calificará tu entrega.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div data-color-mode={mode} className="w-full max-w-full overflow-hidden [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word! select-none">
                                    <MDEditor.Markdown source={activity.statement || "**No hay rúbrica disponible.**"} style={{ background: 'transparent' }} />
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
                                {(isSubmitted && submission.feedback) || isRejected ? (
                                    <div className="bg-card rounded-lg p-2">
                                        <FeedbackViewer feedback={submission.feedback || ""} />
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        <div className="flex justify-center mb-3 text-muted-foreground/30">
                                            <AlertCircle className="h-10 w-10" />
                                        </div>
                                        <p className="font-medium text-base">Aún no hay retroalimentación disponible.</p>
                                        {!isSubmitted && <p className="text-sm mt-1">Debes realizar una entrega para recibir retroalimentación.</p>}
                                        {isRejected && <p className="text-sm mt-1 text-rose-600 font-bold uppercase">Entrega Rechazada</p>}
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

function SubmissionForm({ activityId, statement, lastSubmittedAt }: { activityId: string, statement: string, lastSubmittedAt?: string | Date | null }) {
    const [status, setStatus] = useState<'idle' | 'grading' | 'success' | 'error'>('idle');
    const [progress, setProgress] = useState<string>("");
    const [apiRequests, setApiRequests] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { isCooldownActive, remainingTime } = useCooldown(lastSubmittedAt, 5);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const url = formData.get("url") as string;

        if (!url) return;

        setStatus('grading');
        setError(null);
        setApiRequests(null);
        setProgress("Iniciando evaluación de Google Colab...");

        try {
            // Call the server action to grade the Colab notebook
            const result = await gradeGoogleColabAction(activityId, url, statement);

            if (result?.apiRequestsCount) {
                setApiRequests(result.apiRequestsCount);
            }

            setStatus('success');
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setError(err.message || "Ocurrió un error inesperado");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
            <div className="space-y-2">
                <Label htmlFor="url" className="text-base font-bold text-primary flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    URL de Google Colab
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="url"
                        name="url"
                        placeholder="https://colab.research.google.com/..."
                        required
                        disabled={status === 'grading' || isCooldownActive}
                        className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                    />
                    <Button 
                        type="submit" 
                        disabled={status === 'grading' || isCooldownActive}
                        className="shadow-md hover:shadow-lg transition-all gap-2"
                    >
                        {status === 'grading' ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Evaluando
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Entregar Tarea
                            </>
                        )}
                    </Button>
                </div>
                {isCooldownActive && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
                        <p>
                            Debes esperar <strong>{remainingTime}</strong> antes de poder realizar una nueva entrega.
                        </p>
                    </div>
                )}
                <p className="text-[10px] text-muted-foreground italic">
                    * Asegúrate de que el enlace sea público ("Cualquiera con el enlace puede ver").
                </p>
            </div>

            {status === 'grading' && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {progress}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Esto puede tomar unos segundos mientras analizamos tu notebook.
                    </p>
                </div>
            )}

            {status === 'error' && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">Error en la evaluación</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {status === 'success' && (
                <div className="p-4 bg-green-50 text-green-600 rounded-lg flex flex-col gap-1 text-sm border border-green-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <p className="font-medium">¡Entrega evaluada correctamente!</p>
                    </div>
                    {apiRequests !== null && (
                        <p className="text-xs text-green-700 ml-7">
                            Peticiones a la API de Gemini: {apiRequests}
                        </p>
                    )}
                </div>
            )}
        </form>
    );
}
