"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ExternalLink, CheckCircle, Download, Send, Clock } from "lucide-react";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { fetchRepoFilesAction } from "@/features/github/actions/githubActions";
import { submitGithubActivityAction } from "@/features/student/actions/submissionActions";
import { toast } from "sonner";
import { useReactToPrint } from 'react-to-print';
import { ActivityReportTemplate } from './ActivityReportTemplate';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { useCooldown } from "@/hooks/use-cooldown";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
    const isGraded = submission && submission.grade !== null;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState(isGraded ? "feedback" : "rubric");
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Informe_${activity.title.replace(/\s+/g, '_')}`,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isGraded) {
            setActiveTab("feedback");
        }
    }, [isGraded]);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    // Un nuevo intento solo está disponible si ya se calificó el intento anterior o si fue rechazada
    const canAttemptAgain = isGraded;

    return (
        <div className="space-y-6 w-full p-4 sm:p-6">
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
                        <CardTitle>Estado de la Entrega (GitHub)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
                                    <span className="text-sm font-medium">Vence:</span>
                                    <span className="text-sm text-muted-foreground">{format(new Date(activity.deadline), "PP p")}</span>
                                </div>
                            </div>

                            {isGraded && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                                        className="gap-2 w-full sm:w-auto"
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
                                                Tu repositorio de GitHub no cumple con los requisitos o la URL es incorrecta. 
                                                Por favor, revisa la retroalimentación en la pestaña "Resultado" y realiza una nueva entrega.
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
                                        <h4 className="text-sm font-medium mb-4">Nueva Entrega</h4>
                                        <SubmissionForm
                                            activityId={activity.id}
                                            filePaths={activity.filePaths || ""}
                                            lastSubmittedAt={submission.lastSubmittedAt}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <SubmissionForm
                                activityId={activity.id}
                                filePaths={activity.filePaths || ""}
                                lastSubmittedAt={null}
                            />
                        )}
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-auto">
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

                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rúbrica / Trabajo a Realizar</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Este es el <strong>trabajo específico que debes realizar</strong> y los criterios bajo los cuales el profesor evaluará tu entrega.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {activity.filePaths && (
                                    <div className="p-4 bg-muted/50 rounded-lg border">
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-primary" />
                                            Archivos Requeridos para Evaluación
                                        </h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            El sistema buscará los siguientes archivos en tu repositorio al momento de la entrega. Asegúrate de que existan y tengan el nombre correcto.
                                        </p>
                                        <ul className="space-y-2">
                                            {activity.filePaths.split(',').map((path: string, index: number) => (
                                                <li key={index} className="flex items-center gap-2 text-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                                                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                                                        {path.trim()}
                                                    </code>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

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
                                {isSubmitted && submission.feedback ? (
                                    <div className="bg-card rounded-lg p-2">
                                        <FeedbackViewer feedback={submission.feedback} />
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        <div className="flex justify-center mb-3 text-muted-foreground/30">
                                            <AlertCircle className="h-10 w-10" />
                                        </div>
                                        <p className="font-medium text-base">Aún no hay retroalimentación disponible.</p>
                                        {!isSubmitted && <p className="text-sm mt-1">Debes realizar una entrega para recibir retroalimentación.</p>}
                                        {isSubmitted && !isGraded && !isRejected && <p className="text-sm mt-1">Tu entrega está siendo revisada por el profesor.</p>}
                                        {isRejected && <p className="text-sm mt-1 text-rose-600 font-bold">TU ENTREGA FUE RECHAZADA. Revisa los detalles arriba.</p>}
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

function SubmissionForm({
    activityId,
    filePaths,
    lastSubmittedAt
}: {
    activityId: string;
    filePaths: string;
    lastSubmittedAt?: string | Date | null;
}) {
    const [repoUrl, setRepoUrl] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ valid: string[]; missing: string[] } | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const { isCooldownActive, remainingTime } = useCooldown(lastSubmittedAt, 5);

    async function handleVerifyAndShowConfirm() {
        if (!repoUrl.trim()) {
            setError("Por favor ingresa la URL del repositorio.");
            return;
        }

        setError(null);
        setIsVerifying(true);
        setVerificationResult(null);

        try {
            const { validFiles, missingFiles, warning } = await fetchRepoFilesAction(repoUrl, filePaths, activityId);
            setVerificationResult({
                valid: validFiles.map(f => f.path),
                missing: missingFiles
            });
            if (warning) {
                toast.warning("Límite de API Posible", { description: warning });
            }
            setShowConfirmDialog(true);
        } catch (err: any) {
            setError(err.message || "Error al verificar el repositorio. Verifica que la URL sea correcta y el repositorio sea público.");
        } finally {
            setIsVerifying(false);
        }
    }

    async function handleConfirmSubmit() {
        setIsSubmitting(true);
        setError(null);

        try {
            await submitGithubActivityAction(activityId, repoUrl);
            setShowConfirmDialog(false);
            setSubmitSuccess(true);
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Error al realizar la entrega.");
            setShowConfirmDialog(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (submitSuccess) {
        return (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    <p className="font-medium">¡Entrega realizada exitosamente!</p>
                </div>
                <p className="text-xs ml-7">Tu repositorio fue registrado. El profesor lo revisará y asignará una calificación pronto.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
            <div className="space-y-2">
                <Label htmlFor="repo-url" className="text-base font-bold text-primary flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    URL del Repositorio GitHub
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        id="repo-url"
                        placeholder="https://github.com/usuario/repositorio"
                        disabled={isVerifying || isCooldownActive}
                        className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Button
                        type="button"
                        onClick={handleVerifyAndShowConfirm}
                        disabled={isVerifying || !repoUrl.trim() || isCooldownActive}
                        className="w-full sm:w-auto gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Entregar
                            </>
                        )}
                    </Button>
                </div>

                <div className="mt-2 p-3 bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                        <strong>Nota:</strong> Si acabas de realizar un cambio en tu repositorio, por favor <strong>espera 5 minutos</strong> antes de entregar, para asegurar que los cambios se hayan sincronizado correctamente con GitHub.
                    </p>
                </div>

                {isCooldownActive && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
                        <p>
                            Debes esperar <strong>{remainingTime}</strong> antes de poder realizar una nueva entrega.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-600 rounded-md flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground italic">
                    * Asegúrate de que el repositorio sea público o que el sistema tenga acceso.
                </p>
            </div>

            {/* Diálogo de Confirmación de Entrega */}
            <Dialog open={showConfirmDialog} onOpenChange={(open) => { if (!isSubmitting) setShowConfirmDialog(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Confirmar Entrega</DialogTitle>
                        <DialogDescription>
                            Revisa el siguiente informe antes de confirmar tu entrega. Esta acción consumirá un intento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Informe de verificación */}
                        {verificationResult && (
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
                            <a href={repoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                                {repoUrl}
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
