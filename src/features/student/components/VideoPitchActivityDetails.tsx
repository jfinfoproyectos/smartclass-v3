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
    Video, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, AlertCircle, Play, CheckSquare, ExternalLink, ChevronLeft
} from "lucide-react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";

interface VideoPitchActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

/**
 * Función auxiliar para convertir enlaces de video comunes en URLs embebibles
 */
function getEmbedUrl(rawUrl: string): { embedUrl: string | null; type: "youtube" | "loom" | "drive" | "video" | "link" } {
    if (!rawUrl) return { embedUrl: null, type: "link" };
    const url = rawUrl.trim();

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
        return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, type: "youtube" };
    }

    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch && loomMatch[1]) {
        return { embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`, type: "loom" };
    }

    // Google Drive
    const driveMatch = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch && driveMatch[1]) {
        return { embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, type: "drive" };
    }

    // Direct video file
    if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) {
        return { embedUrl: url, type: "video" };
    }

    return { embedUrl: url, type: "link" };
}

export function VideoPitchActivityDetails({
    activity,
    userId,
    studentName,
}: VideoPitchActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    // Extraer configuración del pitch
    const pitchConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.pitchConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const maxMinutes = pitchConfig?.maxDurationMinutes || 5;
    const requiredTopics: string[] = pitchConfig?.requiredTopics || [
        "Problema y Solución",
        "Arquitectura Técnica y Stack",
        "Demostración en Vivo",
        "Lecciones y Retos Superados",
    ];

    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    // Extraer videoUrl y notas guardadas
    const initialData = useMemo(() => {
        if (!submission?.url) return { videoUrl: "", notes: "" };
        try {
            const parsed = JSON.parse(submission.url);
            if (parsed?.videoUrl) {
                return { videoUrl: parsed.videoUrl, notes: parsed.notes || "" };
            }
        } catch {
            return { videoUrl: submission.url, notes: "" };
        }
        return { videoUrl: submission.url, notes: "" };
    }, [submission?.url]);

    const [videoUrl, setVideoUrl] = useState<string>(initialData.videoUrl);
    const [notes, setNotes] = useState<string>(initialData.notes);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"statement" | "checklist" | "submission">("statement");
    const [mobileView, setMobileView] = useState<"pitch" | "info">("pitch");

    useEffect(() => {
        if (!checklistConfig && activeTab === "checklist") {
            setActiveTab("statement");
        }
    }, [checklistConfig, activeTab]);

    useEffect(() => {
        setVideoUrl(initialData.videoUrl);
        setNotes(initialData.notes);
    }, [initialData]);

    // Embed info
    const embedInfo = useMemo(() => getEmbedUrl(videoUrl), [videoUrl]);

    // Enviar entrega
    const handleSubmit = async () => {
        if (!videoUrl.trim()) {
            toast.error("Por favor ingresa el enlace de tu video de sustentación.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = JSON.stringify({
                videoUrl: videoUrl.trim(),
                notes: notes.trim(),
                submittedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            const res = await submitActivityAction(null, formData);
            if (res && res.error) {
                toast.error(res.message || "Error al enviar la entrega.");
                return;
            }

            toast.success(isSubmitted ? "¡Sustentación actualizada exitosamente!" : "¡Video de sustentación enviado exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al enviar la entrega.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden flex-1 min-h-0 gap-2 sm:gap-2.5">
            {/* Header: Compacto y Moderno */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/20 p-2.5 sm:p-3 rounded-xl border">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200">
                            <Video className="h-3 w-3 mr-1" />
                            Sustentación en Video (Pitch)
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                            Máx. {maxMinutes} min
                        </Badge>
                        {checklistConfig && isGraded && evalMetadata ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {evalMetadata.aiGrade !== undefined && evalMetadata.aiGrade !== null && (
                                    <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-mono font-bold">
                                        IA ({checklistConfig.aiWeight}%): {Number(evalMetadata.aiGrade).toFixed(1)}
                                    </Badge>
                                )}
                                {evalMetadata.checklistScore !== undefined && evalMetadata.checklistScore !== null && (
                                    <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-mono font-bold">
                                        Docente ({checklistConfig.checklistWeight}%): {Number(evalMetadata.checklistScore).toFixed(1)}
                                    </Badge>
                                )}
                                <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                                    Final: {submission.grade.toFixed(1)} / 5.0
                                </Badge>
                            </div>
                        ) : isGraded ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                                Calificado: {submission.grade.toFixed(1)} / 5.0
                            </Badge>
                        ) : isSubmitted ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                                Entregado (Pendiente Docente)
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                                No entregado
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-foreground truncate" title={activity.title}>
                        {activity.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px]">Límite: {activity.deadline ? format(new Date(activity.deadline), "PPp", { locale: es }) : "Sin fecha"}</span>
                    </div>
                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs font-semibold shrink-0 gap-1 rounded-lg border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer bg-background"
                        title="Volver a la lista de actividades"
                    >
                        <Link href={activity.courseId ? `/dashboard/student?courseId=${activity.courseId}&tab=activities` : `/dashboard/student`}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Volver a actividades</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Selector de Vistas Móviles (< lg) */}
            <div className="lg:hidden shrink-0 grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shadow-2xs">
                <button
                    type="button"
                    onClick={() => setMobileView("pitch")}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        mobileView === "pitch"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Video className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">Pitch y Entrega</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileView("info")}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        mobileView === "info"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Enunciado y Rúbrica</span>
                </button>
            </div>

            {/* Layout principal adaptado: 2 columnas en desktop, 1 pestaña en móvil */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
                {/* Columna Izquierda: Reproductor y Formulario (7 columnas) */}
                <div className={cn(
                    "lg:col-span-7 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs",
                    mobileView === "pitch" ? "flex" : "hidden lg:flex"
                )}>
                    <div className="shrink-0 p-2.5 sm:p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-rose-500" />
                            <span className="text-xs font-bold text-foreground">Grabación del Pitch</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                            Soporta YouTube, Loom, Drive o MP4
                        </span>
                    </div>

                    {/* Previsualizador de Video */}
                    <div className="shrink-0 relative aspect-video w-full max-h-[260px] sm:max-h-[300px] bg-slate-950 flex items-center justify-center overflow-hidden border-b">
                        {embedInfo.embedUrl ? (
                            embedInfo.type === "video" ? (
                                <video src={embedInfo.embedUrl} controls className="w-full h-full object-contain" />
                            ) : (
                                <iframe
                                    src={embedInfo.embedUrl}
                                    title="Pitch Video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full border-0"
                                />
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                                <Play className="h-10 w-10 text-slate-600 animate-pulse" />
                                <span className="text-xs font-semibold">Pega el enlace de tu video para previsualizarlo</span>
                                <span className="text-[11px] text-slate-500 max-w-xs">
                                    Graba tu pantalla o cámara explicando el proyecto y comparte el link público.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Formulario de Entrega con scroll vertical interno si es necesario */}
                    <div className="p-3 sm:p-4 space-y-3 flex-1 min-h-0 overflow-y-auto flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="video-url-input" className="text-xs font-bold flex items-center justify-between">
                                    <span>Enlace del Video (YouTube / Loom / Google Drive)</span>
                                    {videoUrl && (
                                        <a href={videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                            Abrir enlace <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    )}
                                </Label>
                                <Input
                                    id="video-url-input"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... o https://www.loom.com/share/..."
                                    disabled={isDeadlinePassed}
                                    className="text-xs h-9 font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="notes-input" className="text-xs font-semibold">
                                    Notas Adicionales / Resumen de tu Sustentación (Opcional)
                                </Label>
                                <Textarea
                                    id="notes-input"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    disabled={isDeadlinePassed}
                                    placeholder="Puedes incluir aquí timestamps clave (ej. 01:20 Demo en vivo), enlaces a repositorios o comentarios adicionales..."
                                    className="text-xs leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                                Límite sugerido: <strong>{maxMinutes} minutos</strong>.
                            </span>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isDeadlinePassed || !videoUrl.trim()}
                                className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {isSubmitted ? "Actualizar Sustentación" : "Entregar Sustentación"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Enunciado, Estructura y Evaluación (5 columnas) */}
                <div className={cn(
                    "lg:col-span-5 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs",
                    mobileView === "info" ? "flex" : "hidden lg:flex"
                )}>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
                        <div className="border-b p-1.5 sm:p-2 bg-muted/30 shrink-0">
                            <TabsList className={cn(
                                "grid w-full h-auto min-h-8 p-1 gap-1",
                                checklistConfig ? "grid-cols-3" : "grid-cols-2"
                            )}>
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1 shrink-0 px-2 sm:px-3 py-1.5 whitespace-nowrap justify-center cursor-pointer">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado</span>
                                </TabsTrigger>
                                {checklistConfig && (
                                    <TabsTrigger value="checklist" className="text-xs font-semibold gap-1 shrink-0 px-2 sm:px-3 py-1.5 whitespace-nowrap justify-center cursor-pointer">
                                        <CheckSquare className="h-3.5 w-3.5 shrink-0" /> <span>Estructura</span>
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="submission" className="text-xs font-semibold gap-1 shrink-0 px-2 sm:px-3 py-1.5 whitespace-nowrap justify-center cursor-pointer">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Evaluación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado con scroll vertical independiente */}
                        <TabsContent value="statement" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4">
                            <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Guía de Estructura Recomendada con scroll vertical independiente */}
                        {checklistConfig && (
                            <TabsContent value="checklist" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-3">
                                <div className="space-y-1 pb-2 border-b">
                                    <span className="text-xs font-bold text-foreground">Lista de Autochequeo del Pitch</span>
                                    <p className="text-[11px] text-muted-foreground">
                                        Asegúrate de cubrir estos temas en tu exposición antes de enviar:
                                    </p>
                                </div>

                                <div className="space-y-2 pt-1">
                                    {requiredTopics.map((topic, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-muted/20 text-xs">
                                            <div className="h-5 w-5 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                                {idx + 1}
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-foreground block">{topic}</span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    Explica con precisión conceptual y muestra evidencia en tu video.
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        )}

                        {/* Pestaña 3: Calificación y Feedback con scroll vertical independiente */}
                        <TabsContent value="submission" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4">
                            {isGraded ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Calificación de la Sustentación</span>
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
                                            <Label className="text-xs font-bold uppercase tracking-wider">
                                                Retroalimentación del Docente
                                            </Label>
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                    )}
                                </div>
                            ) : isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                                    <CheckCircle2 className="h-8 w-8 text-rose-500" />
                                    <p className="text-xs font-semibold">Sustentación Enviada</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        El docente y la IA evaluarán la claridad, estructura y dominio técnico de tu presentación.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has enviado tu video</p>
                                    <p className="text-[11px] max-w-xs">
                                        Pega el enlace de tu video de sustentación y presiona <strong>Entregar Sustentación</strong>.
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
