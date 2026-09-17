"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ExternalLink, CheckCircle, Download, Send, Clock, FileText, ClipboardList, RotateCcw, Bot, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { submitGithubActivityAction } from "@/features/student/actions/submissionActions";
import { toast } from "sonner";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { GitHubRepoChatInspector } from "@/features/teacher/components/GitHubRepoChatInspector";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";

interface CodeProjectActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

export function CodeProjectActivityDetails({ activity, userId, studentName }: CodeProjectActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const attemptCount = submission?.attemptCount || 0;
    const maxAttempts = activity.maxAttempts || 1;

    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null;
    const isReevaluationRequested = submission?.reevaluationRequested ?? false;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("rubric");
    const [repoUrl, setRepoUrl] = useState(submission?.url || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();
    const canAttemptAgain = isGraded && !isDeadlinePassed;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!repoUrl.includes("github.com")) {
            setError("Por favor, ingresa una URL válida de GitHub.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await submitGithubActivityAction(activity.id, repoUrl);
            setSubmitSuccess(true);
            toast.success("Solicitud de reevaluación guardada exitosamente");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Error al realizar la entrega.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6 w-full p-4 sm:p-6">
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
                            <Link href={activity.courseId ? `/dashboard/student?courseId=${activity.courseId}&tab=activities` : `/dashboard/student`}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>Volver a actividades</span>
                            </Link>
                        </Button>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{activity.title}</h1>
                    </div>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {activity.course?.title || "Curso"}
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
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            Entrega del Proyecto (GitHub)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">Tu Estado:</span>
                                    {isReevaluationRequested ? (
                                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none px-3 py-1 font-bold gap-1">
                                            <RotateCcw className="h-3.5 w-3.5" /> Reevaluación Solicitada
                                        </Badge>
                                    ) : isGraded ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold">Completado</Badge>
                                    ) : isRejected ? (
                                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1 font-bold">Rechazado</Badge>
                                    ) : isSubmitted ? (
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-bold gap-1">
                                            <Clock className="h-3.5 w-3.5" /> En Revisión
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 font-bold gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" /> Pendiente
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">Vencimiento:</span>
                                    <span className="text-sm text-muted-foreground">{format(new Date(activity.deadline), "PP p")}</span>
                                </div>
                            </div>

                            <Separator />

                            {isSubmitted ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
                                        <p className="text-sm text-muted-foreground mb-2">Tu entrega más reciente:</p>
                                        <a href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold flex items-center justify-center gap-2">
                                            <ExternalLink className="h-4 w-4" />
                                            {submission.url}
                                        </a>
                                        {isReevaluationRequested && (
                                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 rounded-md text-xs font-medium">
                                                🔄 Solicitud de reevaluación enviada. El profesor revisará las actualizaciones de tu repositorio.
                                            </div>
                                        )}
                                        {isRejected && (
                                            <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg flex items-start gap-3 text-left">
                                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm uppercase tracking-wide">Entrega Rechazada</p>
                                                    <p className="text-xs leading-relaxed opacity-90">
                                                        Tu proyecto no cumple con los requisitos mínimos. 
                                                        Por favor, revisa la retroalimentación y realiza una nueva entrega abajo.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {!isRejected && !isGraded && !isReevaluationRequested && (
                                            <p className="text-xs text-muted-foreground mt-4 italic">
                                                El profesor seleccionará los archivos a revisar y asignará tu calificación manualmente.
                                            </p>
                                        )}
                                    </div>
                                    
                                    {canAttemptAgain && (
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                                                <RotateCcw className="h-4 w-4 text-purple-600" />
                                                Solicitar Reevaluación / Actualizar Repositorio
                                            </h4>
                                            <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
                                                <div className="space-y-2">
                                                    <Label htmlFor="repo-url" className="text-base font-bold text-primary flex items-center gap-2">
                                                        <Send className="h-4 w-4" />
                                                        URL del Repositorio GitHub
                                                    </Label>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <Input
                                                            id="repo-url"
                                                            placeholder="https://github.com/usuario/repositorio"
                                                            className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                                                            value={repoUrl}
                                                            onChange={(e) => setRepoUrl(e.target.value)}
                                                            required
                                                        />
                                                        <Button
                                                            type="submit"
                                                            disabled={isSubmitting || !repoUrl.trim()}
                                                            className="w-full sm:w-auto gap-2 shadow-md hover:shadow-lg transition-all"
                                                        >
                                                            {isSubmitting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Send className="h-4 w-4" />
                                                            )}
                                                            Entregar Proyecto
                                                        </Button>
                                                    </div>
                                                    {error && (
                                                        <p className="text-sm text-destructive font-medium mt-1">{error}</p>
                                                    )}
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
                                    <div className="space-y-2">
                                        <Label htmlFor="repo-url" className="text-base font-bold text-primary flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            URL del Repositorio GitHub
                                        </Label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Input
                                                id="repo-url"
                                                placeholder="https://github.com/usuario/repositorio"
                                                disabled={isSubmitting}
                                                className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting || !repoUrl.trim()}
                                                className="w-full sm:w-auto gap-2 shadow-md hover:shadow-lg transition-all"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                                Entregar Proyecto
                                            </Button>
                                        </div>
                                        {error && (
                                            <p className="text-sm text-destructive font-medium mt-1">{error}</p>
                                        )}
                                    </div>
                                </form>
                            )}

                            {isGraded && (
                                <div className="pt-4 flex justify-end">
                                    <ExportFeedbackButtons
                                        activity={activity}
                                        submission={submission}
                                        studentName={studentName}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1 shrink-0 -mx-1 px-1">
                        <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-3 h-auto min-h-9 p-1 gap-1">
                            <TabsTrigger value="rubric" className="flex items-center gap-2 shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">
                                <ClipboardList className="h-4 w-4 shrink-0" />
                                <span>Enunciado</span>
                            </TabsTrigger>
                            <TabsTrigger value="feedback" className="flex items-center gap-2 shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                <span>Resultado</span>
                            </TabsTrigger>
                            <TabsTrigger value="inspector" className="flex items-center gap-2 shrink-0 px-3 py-1.5 whitespace-nowrap text-xs font-semibold">
                                <Bot className="h-4 w-4 shrink-0 text-sky-500" />
                                <span>Inspector</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>


                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Enunciado y Criterios</CardTitle>
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
                        <Card className="border-primary/20">
                            <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                    Retroalimentación
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
                                {(isGraded || isRejected) && submission?.feedback ? (
                                    <FeedbackViewer feedback={submission.feedback} />
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        <p className="font-medium">Aún no hay retroalimentación disponible.</p>
                                        <p className="text-xs mt-1">Tu profesor revisará los archivos seleccionados de tu repositorio.</p>
                                        {isRejected && <p className="text-sm mt-2 text-rose-600 font-bold uppercase">Entrega Rechazada</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="inspector" className="mt-4">
                        <div className="h-[650px]">
                            {(submission?.url || repoUrl) ? (
                                <GitHubRepoChatInspector
                                    repoUrl={submission?.url || repoUrl}
                                    studentName={studentName}
                                    activityId={activity?.id}
                                    studentId={userId}
                                    readOnly={true}
                                />
                            ) : (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                        <Bot className="h-10 w-10 text-muted-foreground/40 mb-2" />
                                        <p className="font-semibold text-sm text-foreground">No se ha registrado una entrega de repositorio aún.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Realiza tu entrega para visualizar las auditorías y consultas técnicas del docente.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
