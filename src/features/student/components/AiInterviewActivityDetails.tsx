"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bot, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, MessageSquareQuote,
    User, ArrowRight, CheckCircle, HelpCircle, AlertCircle, Play
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { FeedbackViewer } from "./FeedbackViewer";
import { getNextInterviewQuestionAction, gradeInterviewAction } from "@/features/teacher/actions/gradingActions";
import { submitActivityAction } from "../actions/submissionActions";

interface AiInterviewActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

interface ChatMessage {
    role: "interviewer" | "student";
    content: string;
    timestamp: string;
}

export function AiInterviewActivityDetails({
    activity,
    userId,
    studentName,
}: AiInterviewActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    // Extraer configuración de la entrevista
    const interviewConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.interviewConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const totalQuestions = interviewConfig?.questionsCount || 4;
    const targetRole = interviewConfig?.targetRole || "Junior";
    const focusAreas: string[] = interviewConfig?.focusAreas || [
        "Conceptos Fundamentales y Arquitectura",
        "Patrones de Diseño y Buenas Prácticas",
        "Resolución de Problemas y Casos Borde",
    ];

    // Cargar historial previo si ya fue entregado
    const savedSession = useMemo(() => {
        if (!submission?.url) return null;
        try {
            const parsed = JSON.parse(submission.url);
            return parsed || null;
        } catch {
            return null;
        }
    }, [submission?.url]);

    const [isSessionStarted, setIsSessionStarted] = useState<boolean>(Boolean(savedSession?.history?.length));
    const [history, setHistory] = useState<ChatMessage[]>(savedSession?.history || []);
    const [currentAnswer, setCurrentAnswer] = useState<string>("");
    const [isLoadingNext, setIsLoadingNext] = useState<boolean>(false);
    const [isFinishing, setIsFinishing] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<"interview" | "statement" | "results">("interview");

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Cantidad de preguntas formuladas hasta el momento
    const questionsAsked = useMemo(() => {
        return history.filter(m => m.role === "interviewer").length;
    }, [history]);

    const isInterviewComplete = questionsAsked >= totalQuestions && history.length === questionsAsked * 2;

    // Scroll automático al último mensaje
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoadingNext]);

    // Iniciar la sesión de entrevista
    const handleStartInterview = async () => {
        setIsSessionStarted(true);
        setIsLoadingNext(true);
        try {
            const firstQuestion = await getNextInterviewQuestionAction(
                activity.id,
                [],
                1,
                totalQuestions,
                targetRole
            );

            setHistory([
                {
                    role: "interviewer",
                    content: firstQuestion,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }
            ]);
        } catch (err: any) {
            toast.error(err.message || "Error al iniciar la entrevista con IA.");
            setIsSessionStarted(false);
        } finally {
            setIsLoadingNext(false);
        }
    };

    // Responder la pregunta actual
    const handleSendAnswer = async () => {
        if (!currentAnswer.trim()) {
            toast.warning("Por favor escribe tu respuesta antes de continuar.");
            return;
        }

        const answerText = currentAnswer.trim();
        setCurrentAnswer("");

        const newHistory: ChatMessage[] = [
            ...history,
            {
                role: "student",
                content: answerText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
        ];
        setHistory(newHistory);

        const currentQNum = questionsAsked;

        // Si ya respondimos la última pregunta, finalizar la entrevista y enviar evaluación
        if (currentQNum >= totalQuestions) {
            await handleFinalizeInterview(newHistory);
        } else {
            // Pedir siguiente pregunta
            setIsLoadingNext(true);
            try {
                const nextQ = await getNextInterviewQuestionAction(
                    activity.id,
                    newHistory,
                    currentQNum + 1,
                    totalQuestions,
                    targetRole
                );

                setHistory([
                    ...newHistory,
                    {
                        role: "interviewer",
                        content: nextQ,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    }
                ]);
            } catch (err: any) {
                toast.error("Error al obtener la siguiente pregunta: " + err.message);
            } finally {
                setIsLoadingNext(false);
            }
        }
    };

    // Finalizar entrevista y calificar con IA
    const handleFinalizeInterview = async (finalHistory: ChatMessage[]) => {
        setIsFinishing(true);
        toast.info("Analizando tu entrevista con IA y generando la evaluación...");

        try {
            const gradingResult = await gradeInterviewAction(
                activity.id,
                userId,
                finalHistory,
                activity.statement || "",
                activity.courseId,
                targetRole,
                "moderate"
            );

            const payload = JSON.stringify({
                history: finalHistory,
                evaluation: gradingResult,
                completedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            await submitActivityAction(null, formData);
            toast.success("✓ ¡Entrevista completada y calificada exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al calificar la entrevista.");
        } finally {
            setIsFinishing(false);
        }
    };

    return (
        <div className="space-y-6 w-full p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200">
                            <MessageSquareQuote className="h-3.5 w-3.5 mr-1" />
                            Entrevista Técnica con IA
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                            Nivel: {targetRole}
                        </Badge>
                        {isGraded ? (
                            <Badge className="bg-emerald-600 text-white font-bold">
                                Calificado: {submission.grade.toFixed(1)} / 5.0
                            </Badge>
                        ) : isSubmitted ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Entrevista Completada (Pendiente de Calificación Docente)
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                                No realizada
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {activity.title}
                    </h1>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Límite: {activity.deadline ? format(new Date(activity.deadline), "PPp", { locale: es }) : "Sin fecha"}</span>
                    </div>
                </div>
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
                {/* Columna Izquierda: Sala de Entrevista Interactiva (7 columnas) */}
                <div className="lg:col-span-7 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    {/* Barra de progreso de la entrevista */}
                    <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                            <span className="text-xs font-bold text-foreground">Simulador de Entrevista en Vivo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted-foreground">
                                {isSessionStarted ? `Pregunta ${Math.min(questionsAsked, totalQuestions)} de ${totalQuestions}` : `${totalQuestions} preguntas`}
                            </span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${(Math.min(questionsAsked, totalQuestions) / totalQuestions) * 100}%` }}
                                    className="h-full bg-teal-500 transition-all duration-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Chat Feed */}
                    <div className="flex-1 min-h-[380px] max-h-[460px] overflow-y-auto p-4 space-y-3 bg-muted/5">
                        {!isSessionStarted ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 my-auto">
                                <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-foreground">¿Listo para comenzar tu entrevista técnica?</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm">
                                        La IA te formulará <strong>{totalQuestions} preguntas</strong> adaptativas sobre los temas del curso. Tómate tu tiempo para redactar respuestas completas y estructuradas.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleStartInterview}
                                    disabled={isLoadingNext || isDeadlinePassed}
                                    className="font-bold text-xs gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                                >
                                    {isLoadingNext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                                    Iniciar Entrevista Ahora
                                </Button>
                            </div>
                        ) : (
                            <>
                                {history.map((msg, idx) => {
                                    const isInterviewer = msg.role === "interviewer";
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-start gap-2.5 ${isInterviewer ? "justify-start" : "justify-end"}`}
                                        >
                                            {isInterviewer && (
                                                <div className="h-7 w-7 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Bot className="h-4 w-4" />
                                                </div>
                                            )}

                                            <div
                                                className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                                                    isInterviewer
                                                        ? "bg-background border shadow-2xs text-foreground"
                                                        : "bg-teal-600 text-white shadow-xs"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold ${isInterviewer ? "text-teal-600 dark:text-teal-400" : "text-teal-100"}`}>
                                                        {isInterviewer ? "Entrevistador IA" : "Tú (Estudiante)"}
                                                    </span>
                                                    {msg.timestamp && (
                                                        <span className={`text-[9px] ${isInterviewer ? "text-muted-foreground" : "text-teal-200"}`}>
                                                            {msg.timestamp}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>

                                            {!isInterviewer && (
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                    <User className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {isLoadingNext && (
                                    <div className="flex items-center gap-2 p-3 bg-background border rounded-2xl text-xs text-muted-foreground max-w-[60%]">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                                        <span>El entrevistador está formulando la siguiente pregunta...</span>
                                    </div>
                                )}

                                {isFinishing && (
                                    <div className="flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-xs text-teal-700 dark:text-teal-300">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Entrevista finalizada. Analizando transcripción y calculando nota...</span>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </>
                        )}
                    </div>

                    {/* Caja de Respuesta del Estudiante */}
                    {isSessionStarted && !isInterviewComplete && !isSubmitted && (
                        <div className="p-3 border-t bg-card space-y-2">
                            <div className="relative">
                                <Textarea
                                    value={currentAnswer}
                                    onChange={(e) => setCurrentAnswer(e.target.value)}
                                    placeholder="Escribe tu respuesta con la mayor claridad y detalle conceptual posible..."
                                    rows={3}
                                    disabled={isLoadingNext || isFinishing || isDeadlinePassed}
                                    className="text-xs resize-none pr-20 leading-relaxed"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handleSendAnswer();
                                        }
                                    }}
                                />
                                <div className="absolute right-2 bottom-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSendAnswer}
                                        disabled={isLoadingNext || isFinishing || !currentAnswer.trim() || isDeadlinePassed}
                                        className="h-7 px-3 text-xs font-bold gap-1 bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                                    >
                                        {isLoadingNext || isFinishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                        {questionsAsked >= totalQuestions ? "Finalizar" : "Responder"}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                                <span>Tip: Presiona <strong>Ctrl + Enter</strong> para enviar tu respuesta.</span>
                                <span>{currentAnswer.length} caracteres</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Enunciado, Temas y Calificación (5 columnas) */}
                <div className="lg:col-span-5 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                        <div className="border-b p-2 bg-muted/30 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="interview" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado y Áreas</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Evaluación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado y Temas */}
                        <TabsContent value="interview" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            <div className="p-3 bg-muted/20 rounded-xl border space-y-2">
                                <span className="text-xs font-bold text-foreground block">Áreas a Evaluar:</span>
                                <div className="space-y-1">
                                    {focusAreas.map((area, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                            <span className="text-muted-foreground">{area}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Calificación y Resultados */}
                        <TabsContent value="results" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {isGraded ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Calificación de la Entrevista</span>
                                        <div className="text-3xl font-extrabold font-mono text-primary">
                                            {submission.grade.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </div>

                                    {submission.feedback && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider">
                                                Informe de Desempeño
                                            </Label>
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                    )}
                                </div>
                            ) : isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                                    <CheckCircle className="h-8 w-8 text-teal-600" />
                                    <p className="text-xs font-semibold">Entrevista Completada</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu entrevista ha sido registrada y analizada por la IA. El profesor revisará las observaciones para publicar la nota definitiva.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has completado la entrevista</p>
                                    <p className="text-[11px] max-w-xs">
                                        Inicia la sesión en la pestaña izquierda y responde las {totalQuestions} preguntas.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
