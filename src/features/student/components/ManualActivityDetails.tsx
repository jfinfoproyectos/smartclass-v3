"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ExternalLink, Link as LinkIcon, AlertCircle, Clock, Send, ChevronLeft } from "lucide-react";
import { FeedbackViewer } from "./FeedbackViewer";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submitActivityAction } from "@/features/student/actions/submissionActions";
import { useActionState, useMemo } from "react";
import { toast } from "sonner";
import { useCooldown } from "@/hooks/use-cooldown";
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { StudentTeacherEvaluationSection } from "./StudentTeacherEvaluationSection";

interface ManualActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

const initialState = {
    message: "",
    error: false,
};

export function ManualActivityDetails({ activity, userId, studentName }: ManualActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isGraded = submission && submission.grade !== null;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    
    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [state, formAction] = useActionState(submitActivityAction, initialState);
    
    // Si la entrega está rechazada, no aplicamos el cooldown
    const cooldownTime = isRejected ? null : submission?.lastSubmittedAt;
    const { isCooldownActive, remainingTime } = useCooldown(cooldownTime, 5);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (state.message) {
            if (state.error) {
                toast.error("Error", { description: state.message });
            } else {
                toast.success("Éxito", { description: state.message });
            }
        }
    }, [state]);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    return (
        <div className="space-y-6 w-full p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold shrink-0 gap-1 rounded-md border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer"
                            title="Volver a la lista de actividades"
                        >
                            <Link href={`/dashboard/student?courseId=${activity.courseId}&tab=activities`}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>Volver</span>
                            </Link>
                        </Button>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{activity.title}</h1>
                    </div>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {activity.course.title}
                    </p>
                </div>
                {checklistConfig && isGraded && evalMetadata ? (
                    <div className="flex flex-col items-end gap-1">
                        {evalMetadata.checklistScore !== undefined && evalMetadata.checklistScore !== null && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-mono font-bold">
                                Sustentación: {Number(evalMetadata.checklistScore).toFixed(1)} / 5.0
                            </Badge>
                        )}
                        <div className="flex flex-col items-end bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Tu Calificación</span>
                            <span className="text-3xl font-black">{submission.grade.toFixed(1)}</span>
                        </div>
                    </div>
                ) : isGraded ? (
                    <div className="flex flex-col items-end bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Tu Calificación</span>
                        <span className="text-3xl font-black">{submission.grade.toFixed(1)}</span>
                    </div>
                ) : null}
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Estado de la Actividad</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">Tu Estado:</span>
                                {isGraded ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold">Completado</Badge>
                                ) : isRejected ? (
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1 font-bold gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> Acción Requerida
                                    </Badge>
                                ) : submission ? (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-bold gap-1">
                                        <Clock className="h-3.5 w-3.5" /> En Revisión
                                    </Badge>
                                ) : (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 font-bold gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> Pendiente de Entrega
                                    </Badge>
                                )}
                            </div>

                            {isGraded && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Nota:</span>
                                    <span className="text-2xl font-bold text-primary">{submission.grade.toFixed(1)}</span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Show submitted link if exists */}
                        {submission && submission.url && (
                            <div className="rounded-lg border p-4 bg-muted/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" />
                                    Enlace Enviado
                                </h4>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm break-all flex items-center gap-1"
                                    >
                                        {submission.url}
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Última actualización: {new Date(submission.lastSubmittedAt || submission.createdAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {/* Submission form - only show if allowLinkSubmission is enabled AND (not submitted OR isGraded) */}
                        {activity.allowLinkSubmission && (!submission || isGraded) && (
                            activity.deadline && new Date(activity.deadline) < new Date() ? (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-md flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">Actividad Cerrada</p>
                                        <p className="text-xs opacity-90">
                                            La fecha límite para esta actividad ha pasado. Ya no se aceptan entregas por enlace.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 shadow-sm space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-primary flex items-center gap-2">
                                            <LinkIcon className="h-4 w-4" />
                                            {submission ? "Actualizar Enlace de Entrega" : "Enviar Enlace de Entrega"}
                                        </h4>
                                        <p className="text-xs text-muted-foreground italic">
                                            {submission
                                                ? "Ingresa un nuevo enlace público que contenga el desarrollo de tu actividad a revaluar."
                                                : "Ingresa un enlace público que contenga la entrega y desarrollo de tu actividad."}
                                        </p>
                                    </div>
                                    <form action={formAction} className="space-y-4">
                                        <input type="hidden" name="activityId" value={activity.id} />
                                        <div className="space-y-2">
                                            <Label htmlFor="url" className="text-sm font-semibold">Enlace de Entrega</Label>
                                            <Input
                                                id="url"
                                                name="url"
                                                type="url"
                                                placeholder="https://drive.google.com/..."
                                                defaultValue={submission?.url || ""}
                                                required
                                                disabled={isCooldownActive || Boolean(activity.isGroupActivity && !activity.isLeader)}
                                                className="bg-background border-primary/20 focus-visible:ring-primary"
                                            />
                                            <p className="text-[10px] text-muted-foreground italic">
                                                * Asegúrate de que el enlace sea accesible para el profesor.
                                            </p>
                                        </div>
                                        <Button type="submit" className="w-full shadow-md hover:shadow-lg transition-all font-bold gap-2" disabled={isCooldownActive || Boolean(activity.isGroupActivity && !activity.isLeader)}>
                                            <Send className="h-4 w-4" />
                                            {activity.isGroupActivity && !activity.isLeader ? "Solo el Líder puede Entregar" : (submission ? "Actualizar Entrega" : "Enviar Entrega")}
                                        </Button>
                                        {isCooldownActive && (
                                            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p>
                                                    Debes esperar <strong>{remainingTime}</strong> antes de poder actualizar tu entrega.
                                                </p>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )
                        )}

                        {/* Message when link submission is disabled */}
                        {!isGraded && !activity.allowLinkSubmission && (
                            <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                                <p className="text-sm text-muted-foreground">
                                    El profesor no ha habilitado el envío de enlaces para esta actividad.
                                    <br />
                                    Esta actividad será calificada manualmente por el profesor.
                                </p>
                            </div>
                        )}

                        {isGraded && (
                            <div className="text-center py-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                                    ✓ Esta actividad ya ha sido calificada por el profesor.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Tabs defaultValue="statement" className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1 shrink-0 -mx-1 px-1">
                        <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-9 p-1 gap-1">
                            <TabsTrigger value="statement" className="shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">Enunciado / Rúbrica</TabsTrigger>
                            <TabsTrigger value="feedback" className="shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">Retroalimentación</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="statement" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Enunciado / Rúbrica</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="bg-card rounded-lg p-2 select-none" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
                                    <FeedbackViewer 
                                        feedback={activity.statement || "**No hay enunciado disponible.**"} 
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
                                    Retroalimentación del Profesor
                                </CardTitle>
                                {(isGraded || isRejected || !!submission) && submission?.feedback && (
                                    <ExportFeedbackButtons
                                        activity={activity}
                                        submission={submission}
                                        studentName={studentName}
                                        size="sm"
                                    />
                                )}
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {checklistConfig && isGraded && (
                                    <StudentTeacherEvaluationSection
                                        checklistConfig={checklistConfig}
                                        submission={submission}
                                    />
                                )}

                                {(isGraded || isRejected) && submission?.feedback ? (
                                    <div className="bg-card rounded-lg p-2">
                                        <FeedbackViewer feedback={submission.feedback} />
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        <div className="flex justify-center mb-3 text-muted-foreground/30">
                                            <AlertCircle className="h-10 w-10" />
                                        </div>
                                        <p className="font-medium text-base">Aún no hay retroalimentación disponible.</p>
                                        {!isGraded && !isRejected && <p className="text-sm mt-1">Tu profesor te responderá una vez califique tu entrega.</p>}
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

