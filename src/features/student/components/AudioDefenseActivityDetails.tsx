"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Mic, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, AlertCircle, Play, CheckSquare, ExternalLink, Headphones, Volume2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { FeedbackViewer } from "./FeedbackViewer";
import { submitActivityAction } from "../actions/submissionActions";
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { StudentTeacherEvaluationSection } from "./StudentTeacherEvaluationSection";

interface AudioDefenseActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

/**
 * Función auxiliar para detectar y generar reproductores embebidos de audio
 */
export function getAudioEmbed(rawUrl: string): { embedUrl: string | null; type: "vocaroo" | "drive" | "spotify" | "audio" | "link" } {
    if (!rawUrl) return { embedUrl: null, type: "link" };
    const url = rawUrl.trim();

    // Vocaroo
    const vocarooMatch = url.match(/(?:vocaroo\.com\/|voca\.ro\/)([a-zA-Z0-9]+)/);
    if (vocarooMatch && vocarooMatch[1]) {
        return { embedUrl: `https://vocaroo.com/embed/${vocarooMatch[1]}?autoplay=0`, type: "vocaroo" };
    }

    // Google Drive
    const driveMatch = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch && driveMatch[1]) {
        return { embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, type: "drive" };
    }

    // Spotify
    const spotifyMatch = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(episode|track)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch && spotifyMatch[2]) {
        return { embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`, type: "spotify" };
    }

    // Archivo de audio directo (mp3, wav, m4a, ogg, aac, flac)
    if (/\.(mp3|wav|m4a|ogg|aac|flac)($|\?)/i.test(url)) {
        return { embedUrl: url, type: "audio" };
    }

    return { embedUrl: url, type: "link" };
}

export function AudioDefenseActivityDetails({
    activity,
    userId,
    studentName,
}: AudioDefenseActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    // Extraer configuración de la sustentación en audio
    const audioConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.audioConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const maxDuration = audioConfig?.maxDurationMinutes || 5;
    const requiredTopics: string[] = audioConfig?.requiredTopics || [
        "Problema y Contexto",
        "Decisiones Técnicas y Arquitectura",
        "Retos y Conclusiones",
    ];

    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    // Extraer datos entregados previamente por el estudiante
    const savedSubmissionData = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return { audioUrl: submission.url, studentNotes: "" };
        }
    }, [submission?.url]);

    const [audioUrlInput, setAudioUrlInput] = useState<string>(savedSubmissionData?.audioUrl || "");
    const [studentNotes, setStudentNotes] = useState<string>(savedSubmissionData?.studentNotes || "");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [activeRightTab, setActiveRightTab] = useState<"statement" | "results">("statement");

    const audioEmbed = useMemo(() => getAudioEmbed(audioUrlInput), [audioUrlInput]);

    // Enviar entrega de la actividad
    const handleSubmit = async () => {
        if (!audioUrlInput.trim()) {
            toast.error("Por favor ingresa el enlace de tu audio o podcast.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = JSON.stringify({
                audioUrl: audioUrlInput.trim(),
                studentNotes: studentNotes.trim(),
                submittedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            const res = await submitActivityAction(null, formData);
            if (res && res.error) {
                toast.error(res.message || "Error al entregar la sustentación.");
                return;
            }

            toast.success("✓ ¡Sustentación en audio entregada exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al entregar la sustentación.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200">
                            <Mic className="h-3.5 w-3.5 mr-1" />
                            Sustentación en Audio
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                            Máx. {maxDuration} min
                        </Badge>
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
                                <Badge className="bg-emerald-600 text-white font-bold">
                                    Final: {submission.grade.toFixed(1)} / 5.0
                                </Badge>
                            </div>
                        ) : isGraded ? (
                            <Badge className="bg-emerald-600 text-white font-bold">
                                Calificado: {submission.grade.toFixed(1)} / 5.0
                            </Badge>
                        ) : isSubmitted ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Entregado (Pendiente de Calificación)
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                                Sin entregar
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
                {/* Columna Izquierda: Reproductor y Formulario de Entrega (7 columnas) */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                    {/* Tarjeta de Reproductor de Audio */}
                    <Card className="rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                                <Headphones className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                <span>Reproductor de Audio</span>
                            </CardTitle>
                            {audioEmbed.embedUrl && (
                                <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                                    {audioEmbed.type}
                                </Badge>
                            )}
                        </CardHeader>

                        <CardContent className="p-4 space-y-4">
                            {/* Visualizador / Reproductor */}
                            <div className="w-full bg-muted/20 border border-border/60 rounded-xl overflow-hidden min-h-[140px] flex items-center justify-center p-4">
                                {audioEmbed.type === "vocaroo" && audioEmbed.embedUrl ? (
                                    <iframe
                                        src={audioEmbed.embedUrl}
                                        width="100%"
                                        height="60"
                                        className="rounded-lg border-0"
                                        allow="autoplay"
                                    />
                                ) : audioEmbed.type === "spotify" && audioEmbed.embedUrl ? (
                                    <iframe
                                        src={audioEmbed.embedUrl}
                                        width="100%"
                                        height="152"
                                        className="rounded-lg border-0"
                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    />
                                ) : audioEmbed.type === "drive" && audioEmbed.embedUrl ? (
                                    <iframe
                                        src={audioEmbed.embedUrl}
                                        width="100%"
                                        height="120"
                                        className="rounded-lg border-0"
                                        allow="autoplay"
                                    />
                                ) : audioEmbed.type === "audio" && audioEmbed.embedUrl ? (
                                    <div className="w-full space-y-2 text-center">
                                        <Volume2 className="h-8 w-8 text-violet-600 mx-auto animate-pulse" />
                                        <audio controls className="w-full">
                                            <source src={audioEmbed.embedUrl} />
                                            Tu navegador no soporta el elemento de audio.
                                        </audio>
                                    </div>
                                ) : audioUrlInput.trim() ? (
                                    <div className="text-center p-4 space-y-2">
                                        <Volume2 className="h-8 w-8 text-violet-500 mx-auto" />
                                        <p className="text-xs text-foreground font-semibold">Enlace de audio registrado</p>
                                        <a
                                            href={audioUrlInput}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                                        >
                                            Abrir audio en pestaña nueva <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center p-6 space-y-2 text-muted-foreground">
                                        <Mic className="h-10 w-10 mx-auto text-violet-500/40" />
                                        <p className="text-xs font-semibold text-foreground">Aún no has ingresado tu audio</p>
                                        <p className="text-[11px] max-w-sm">
                                            Graba tu sustentación o podcast en <strong>Vocaroo</strong>, <strong>Google Drive</strong>, <strong>Spotify</strong> o sube tu archivo <strong>MP3 / WAV</strong>.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Entrada de URL */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Enlace del Audio o Podcast:</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">Vocaroo, Drive, Spotify, SoundCloud, MP3</span>
                                </Label>
                                <Input
                                    value={audioUrlInput}
                                    onChange={(e) => setAudioUrlInput(e.target.value)}
                                    placeholder="ej. https://voca.ro/1a2b3c4d o https://drive.google.com/file/d/..."
                                    disabled={isDeadlinePassed}
                                    className="font-mono text-xs h-9 bg-background"
                                />
                            </div>

                            {/* Minutero / Marcas de tiempo del estudiante */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-foreground">
                                        Minutero / Marcas de Tiempo y Notas (Opcional):
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground">Facilita la revisión del docente y la IA</span>
                                </div>
                                <Textarea
                                    value={studentNotes}
                                    onChange={(e) => setStudentNotes(e.target.value)}
                                    rows={3}
                                    disabled={isDeadlinePassed}
                                    placeholder="00:20 - Introducción y contextualización&#10;01:30 - Arquitectura y diseño técnico&#10;03:15 - Demostración y conclusiones..."
                                    className="text-xs font-mono bg-background resize-none leading-relaxed"
                                />
                            </div>

                            {/* Botón de Envío */}
                            <div className="pt-2 flex items-center justify-between border-t">
                                <span className="text-[11px] text-muted-foreground">
                                    {isSubmitted
                                        ? "✓ Audio entregado. Puedes actualizar el enlace antes de la fecha límite."
                                        : "Verifica que el audio se escuche correctamente antes de enviar."}
                                </span>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || isDeadlinePassed || !audioUrlInput.trim()}
                                    className="font-bold text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                                >
                                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                    {isSubmitted ? "Actualizar Entrega" : "Entregar Sustentación"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Temas Requeridos Checklist */}
                    {checklistConfig && requiredTopics.length > 0 && (
                        <Card className="rounded-2xl border border-border/70 p-4 space-y-2.5">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <CheckSquare className="h-4 w-4 text-violet-600" />
                                Temas obligatorios a cubrir en el audio:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {requiredTopics.map((topic, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border text-xs">
                                        <div className="h-4 w-4 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                            {idx + 1}
                                        </div>
                                        <span className="text-foreground font-medium truncate">{topic}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Columna Derecha: Enunciado e Instrucciones / Evaluación (5 columnas) */}
                <div className="lg:col-span-5 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as any)} className="flex-1 flex flex-col">
                        <div className="border-b p-2 bg-muted/30 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado e Instrucciones</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Evaluación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado */}
                        <TabsContent value="statement" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            <div className="p-3 bg-violet-500/5 rounded-xl border border-violet-500/20 space-y-1 text-xs">
                                <span className="font-bold text-violet-700 dark:text-violet-400 block">Formato de Audio Recomendado:</span>
                                <p className="text-muted-foreground leading-relaxed text-[11px]">
                                    Asegúrate de hablar con claridad y buen volumen. Sigue la estructura indicada en el enunciado y respeta el tiempo máximo asignado ({maxDuration} min).
                                </p>
                            </div>

                            <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Calificación */}
                        <TabsContent value="results" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {isGraded ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Calificación Final</span>
                                        <div className="text-3xl font-extrabold font-mono text-primary">
                                            {submission.grade.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </div>

                                    {/* Sección de Evaluación Docente (Solo si está habilitada en la configuración) */}
                                    {checklistConfig && (
                                        <StudentTeacherEvaluationSection
                                            checklistConfig={checklistConfig}
                                            submission={submission}
                                        />
                                    )}

                                    {submission.feedback && (
                                        <div className="space-y-2">
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                    )}
                                </div>
                            ) : isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                                    <CheckCircle2 className="h-8 w-8 text-violet-600" />
                                    <p className="text-xs font-semibold">Audio Entregado con Éxito</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu sustentación en audio ha sido registrada. El profesor evaluará tu entrega con asistencia de IA y/o sustentación oral.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has entregado la sustentación</p>
                                    <p className="text-[11px] max-w-xs">
                                        Ingresa el enlace de tu audio a la izquierda y pulsa el botón para entregar.
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
