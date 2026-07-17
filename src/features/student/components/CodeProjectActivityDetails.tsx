"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ExternalLink, CheckCircle, Download, Send, Clock, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { FeedbackViewer } from "./FeedbackViewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { submitGithubActivityAction } from "@/features/student/actions/submissionActions";
import { toast } from "sonner";
import { useReactToPrint } from 'react-to-print';
import { ActivityReportTemplate } from "./ActivityReportTemplate";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { useCooldown } from "@/hooks/use-cooldown";

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
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState("rubric");
    const [repoUrl, setRepoUrl] = useState(submission?.url || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const router = useRouter();

    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Informe_${activity.title.replace(/\s+/g, '_')}`,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    const { isCooldownActive, remainingTime } = useCooldown(isRejected ? null : submission?.lastSubmittedAt, 5);

    const canAttemptAgain = isGraded;

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
            toast.success("Proyecto entregado exitosamente");
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
                                        {!isRejected && !isGraded && (
                                            <p className="text-xs text-muted-foreground mt-4 italic">
                                                El profesor seleccionará los archivos a revisar y asignará tu calificación manualmente.
                                            </p>
                                        )}
                                    </div>
                                    
                                    {canAttemptAgain && (
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="text-sm font-medium mb-4">Nueva Entrega</h4>
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
                                                            disabled={isSubmitting || isCooldownActive}
                                                            className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                                                            value={repoUrl}
                                                            onChange={(e) => setRepoUrl(e.target.value)}
                                                            required
                                                        />
                                                        <Button
                                                            type="submit"
                                                            disabled={isSubmitting || !repoUrl.trim() || isCooldownActive}
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
                                                    {isCooldownActive && (
                                                        <p className="text-xs text-amber-600 font-medium">
                                                            Debes esperar {remainingTime} para actualizar tu entrega.
                                                        </p>
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
                                                disabled={isSubmitting || isCooldownActive}
                                                className="flex-1 bg-background border-primary/20 focus-visible:ring-primary"
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting || !repoUrl.trim() || isCooldownActive}
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
                                        {isCooldownActive && (
                                            <p className="text-xs text-amber-600 font-medium">
                                                Debes esperar {remainingTime} para actualizar tu entrega.
                                            </p>
                                        )}
                                    </div>
                                </form>
                            )}

                            {isGraded && (
                                <div className="pt-4 flex justify-end">
                                    <div style={{ display: 'none' }}>
                                        <ActivityReportTemplate
                                            ref={componentRef}
                                            activity={activity}
                                            submission={submission}
                                            studentName={studentName}
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Descargar Informe de Evaluación
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="rubric" className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Enunciado
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Resultado
                        </TabsTrigger>
                    </TabsList>


                    <TabsContent value="rubric" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Enunciado y Criterios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div data-color-mode={mode} className="w-full max-w-full overflow-hidden select-none">
                                    <MDEditor.Markdown 
                                        source={activity.statement || "**No hay enunciado disponible.**"} 
                                        style={{ background: 'transparent' }} 
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-4">
                        <Card className="border-primary/20">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                    Retroalimentación
                                </CardTitle>
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
                </Tabs>
            </div>
        </div>
    );
}
