"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Mic, Headphones, Volume2, Sparkles, Award, Loader2, Bot, CheckCircle,
    ChevronLeft, ChevronRight, ExternalLink, FileText, CheckCircle2, XCircle, ListChecks, Zap, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { gradeAudioDefenseAction } from "@/features/teacher/actions/gradingActions";
import { GradingModeSelector } from "./GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { RUBRIC_LEVELS } from "./CodeProjectInspector";
import { getAudioEmbed } from "@/features/student/components/AudioDefenseActivityDetails";

interface AudioDefenseInspectorProps {
    student: any;
    submission: any;
    activity: any;
    evalItem: any;
    onClose: () => void;
    studentsList?: any[];
    onSelectStudent?: (studentId: string) => void;
    onGradeManual: (grade: string, feedback: string, studentId: string, activityId: string) => Promise<void>;
    onReject: (studentId: string, feedback?: string) => Promise<void>;
}

export function AudioDefenseInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList,
    onSelectStudent,
    onGradeManual,
    onReject,
}: AudioDefenseInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";

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

    // Extraer datos entregados por el alumno
    const submissionData = useMemo(() => {
        if (!submission?.url) return { audioUrl: "", studentNotes: "" };
        try {
            const parsed = JSON.parse(submission.url);
            return {
                audioUrl: parsed?.audioUrl || submission.url,
                studentNotes: parsed?.studentNotes || "",
            };
        } catch {
            return { audioUrl: submission.url, studentNotes: "" };
        }
    }, [submission?.url]);

    const audioUrl = submissionData.audioUrl;
    const studentNotes = submissionData.studentNotes;
    const audioEmbed = useMemo(() => getAudioEmbed(audioUrl), [audioUrl]);

    // Extraer Lista de Chequeo y Ponderaciones si están configuradas
    const checklistConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            if (data?.hasChecklist && Array.isArray(data?.criteria) && data.criteria.length > 0) {
                return {
                    criteria: data.criteria,
                    aiWeight: typeof data.aiWeight === "number" ? data.aiWeight : 50,
                    checklistWeight: typeof data.checklistWeight === "number" ? data.checklistWeight : 50,
                };
            }
        } catch {
            return null;
        }
        return null;
    }, [activity?.description]);

    const checklistData = checklistConfig?.criteria ?? null;
    const aiWeight = checklistConfig?.aiWeight ?? 50;
    const checklistWeight = checklistConfig?.checklistWeight ?? 50;

    const [criteriaLevels, setCriteriaLevels] = useState<Record<string, number | undefined>>({});
    const [manualSustentacionScore, setManualSustentacionScore] = useState<number | null>(null);

    // Estados de calificación
    const [gradeInput, setGradeInput] = useState<string>(
        submission?.grade !== null && submission?.grade !== undefined ? String(submission.grade) : ""
    );
    const [teacherNotesInput, setTeacherNotesInput] = useState<string>("");
    const [aiFeedbackInput, setAiFeedbackInput] = useState<string>("");
    const [aiGrade, setAiGrade] = useState<number | null>(null);
    const [aiResult, setAiResult] = useState<any>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("moderate");

    // Pestañas
    const [leftTab, setLeftTab] = useState<"audio" | "statement">("audio");
    const [rightTab, setRightTab] = useState<"ai_eval" | "teacher_grade">("ai_eval");

    // Sincronizar al cambiar de estudiante
    useEffect(() => {
        setGradeInput(submission?.grade !== null && submission?.grade !== undefined ? String(submission.grade) : "");
        setTeacherNotesInput(submission?.feedback || "");
        setAiFeedbackInput("");
        setAiGrade(null);
        setAiResult(null);
        setCriteriaLevels({});
    }, [submission?.id, student?.id]);

    // Nota de sustentación oral
    const checklistScore = useMemo(() => {
        if (!checklistData || checklistData.length === 0) return 0;
        if (manualSustentacionScore !== null) return manualSustentacionScore;

        const totalEarnedWeight = checklistData.reduce((acc: number, crit: any) => {
            const factor = criteriaLevels[crit.id];
            if (typeof factor !== "number") return acc;
            const weight = Number(crit.percentage) || 0;
            return acc + (weight * factor);
        }, 0);
        return Math.min(5.0, Math.max(0.0, (totalEarnedWeight / 100) * 5.0));
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Nota final combinada ponderada
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) return checklistScore;
        const aiScoreVal = aiGrade ?? (submission?.grade !== null ? Number(submission?.grade) : 0);
        const aiPart = aiScoreVal * (aiWeight / 100);
        const teacherPart = checklistScore * (checklistWeight / 100);
        return Math.min(5.0, Math.max(0.0, aiPart + teacherPart));
    }, [checklistConfig, aiGrade, submission?.grade, aiWeight, checklistScore, checklistWeight]);

    // Navegación entre estudiantes
    const currentIndex = useMemo(() => {
        if (!studentsList || !student) return -1;
        return studentsList.findIndex((item) => item.student.id === student.id);
    }, [studentsList, student]);

    const hasPrev = currentIndex > 0;
    const hasNext = studentsList && currentIndex >= 0 && currentIndex < studentsList.length - 1;

    // Evaluar audio con IA (Gemini)
    const handleGradeWithAI = async () => {
        if (!audioUrl) {
            toast.error("El estudiante no ha entregado un enlace de audio.");
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const result = await gradeAudioDefenseAction(
                activity.id,
                student.id,
                audioUrl,
                activity.statement || "",
                activity.courseId,
                studentNotes,
                audioConfig || undefined,
                gradingMode
            );

            setAiResult(result);
            setAiGrade(result.grade);
            setAiFeedbackInput(result.feedback);
            setGradeInput(result.grade.toFixed(1));
            setRightTab("ai_eval");
            toast.success(`✓ Audio evaluado con IA. Nota sugerida: ${result.grade.toFixed(1)}`);
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar el audio.");
        } finally {
            setIsEvaluatingAI(false);
        }
    };

    // Guardar calificación
    const handleSaveGrade = async () => {
        const parsedGrade = parseFloat(gradeInput);
        if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 5) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }

        setIsSaving(true);
        try {
            const fullFeedback = teacherNotesInput.trim()
                ? `${teacherNotesInput.trim()}${aiFeedbackInput ? `\n\n---\n### Evaluación con IA del Audio\n${aiFeedbackInput}` : ""}`
                : (aiFeedbackInput || aiResult?.feedback || "");

            await onGradeManual(gradeInput, fullFeedback, student.id, activity.id);
            toast.success("✓ Calificación guardada exitosamente");
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la calificación");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4">
            <div className="flex flex-col w-full h-full max-w-7xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Header Inspector */}
                <div className="flex items-center justify-between p-3 sm:px-5 border-b bg-muted/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 text-xs gap-1">
                            <ChevronLeft className="h-4 w-4" /> Volver
                        </Button>
                        <Separator orientation="vertical" className="h-5" />
                        <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200">
                                <Mic className="h-3.5 w-3.5 mr-1" />
                                Sustentación en Audio
                            </Badge>
                            <span className="font-bold text-sm truncate text-foreground">{student.name}</span>
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">({activity.title})</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Navegación anterior / siguiente */}
                        {studentsList && onSelectStudent && (
                            <div className="flex items-center gap-1 mr-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!hasPrev}
                                    onClick={() => onSelectStudent(studentsList[currentIndex - 1].student.id)}
                                    className="h-7 w-7 p-0"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs font-mono px-1 text-muted-foreground">
                                    {currentIndex + 1}/{studentsList.length}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!hasNext}
                                    onClick={() => onSelectStudent(studentsList[currentIndex + 1].student.id)}
                                    className="h-7 w-7 p-0"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveGrade}
                            disabled={isSaving}
                            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                            Guardar Nota
                        </Button>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                    {/* Columna Izquierda: Reproductor de Audio y Notas (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col border-r border-border min-h-0 overflow-y-auto p-4 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
                                <TabsList className="h-7 p-0.5">
                                    <TabsTrigger value="audio" className="text-xs px-2.5">
                                        <Headphones className="h-3 w-3 mr-1 text-violet-600" /> Audio Entregado
                                    </TabsTrigger>
                                    <TabsTrigger value="statement" className="text-xs px-2.5">
                                        <FileText className="h-3 w-3 mr-1" /> Enunciado
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {audioUrl && (
                                <a
                                    href={audioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 font-mono"
                                >
                                    Abrir en nueva pestaña <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>

                        {leftTab === "audio" ? (
                            audioUrl ? (
                                <div className="space-y-4">
                                    {/* Reproductor embebido */}
                                    <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center justify-center min-h-[160px]">
                                        {audioEmbed.type === "vocaroo" && audioEmbed.embedUrl ? (
                                            <iframe
                                                src={audioEmbed.embedUrl}
                                                width="100%"
                                                height="70"
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
                                                    Tu navegador no soporta el reproductor de audio.
                                                </audio>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <Volume2 className="h-8 w-8 text-violet-500 mx-auto" />
                                                <p className="text-xs font-semibold">Audio alojado en plataforma externa</p>
                                                <a
                                                    href={audioUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                                                >
                                                    Escuchar Audio <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Minutero / Notas del estudiante */}
                                    {studentNotes && (
                                        <div className="p-3 bg-card rounded-xl border space-y-1.5">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-violet-600" />
                                                Minutero y Marcas de Tiempo del Estudiante:
                                            </span>
                                            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-muted/20 p-2.5 rounded-lg">
                                                {studentNotes}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Temas Requeridos Checklist */}
                                    {audioConfig?.requiredTopics && audioConfig.requiredTopics.length > 0 && (
                                        <div className="p-3 rounded-xl border bg-card space-y-2">
                                            <span className="text-xs font-bold text-foreground block">
                                                Temas obligatorios configurados por el docente:
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {audioConfig.requiredTopics.map((topic: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border text-xs">
                                                        <div className="h-4 w-4 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-muted-foreground truncate">{topic}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-2 p-4 my-auto">
                                    <AlertCircle className="h-8 w-8 text-amber-500" />
                                    <p className="text-xs font-semibold">El estudiante aún no ha entregado un enlace de audio.</p>
                                </div>
                            )
                        ) : (
                            <div className="p-2 overflow-y-auto" data-color-mode={mode}>
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: "transparent" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Evaluación IA y Calificación (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden bg-background">
                        <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex-1 flex flex-col min-h-0">
                            <div className="border-b p-2 bg-muted/20 overflow-x-auto scrollbar-none">
                                <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-8 p-1 gap-1">
                                    <TabsTrigger value="ai_eval" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                        <Bot className="h-3.5 w-3.5 shrink-0" /> <span>Evaluación IA</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="teacher_grade" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                        <CheckCircle className="h-3.5 w-3.5 shrink-0" /> <span>Calificación</span>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* TAB 1: Evaluación IA */}
                            <TabsContent value="ai_eval" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                                <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                                    <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleGradeWithAI}
                                    disabled={isEvaluatingAI || !audioUrl}
                                    className="w-full font-bold text-xs gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-xs h-9"
                                >
                                    {isEvaluatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    Evaluar Audio con Gemini
                                </Button>

                                {aiResult ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Score Badges */}
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="p-2 rounded-xl border bg-violet-500/5 border-violet-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Nota IA</span>
                                                <span className="text-sm font-extrabold font-mono text-violet-600 dark:text-violet-400">
                                                    {aiResult.grade?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-blue-500/5 border-blue-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Argumentos</span>
                                                <span className="text-xs font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                                    {aiResult.argumentationScore?.toFixed(1) || "4.5"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-purple-500/5 border-purple-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Estructura</span>
                                                <span className="text-xs font-extrabold font-mono text-purple-600 dark:text-purple-400">
                                                    {aiResult.structureScore?.toFixed(1) || "4.0"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Cobertura</span>
                                                <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                                    {aiResult.coveragePercentage || 100}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Resumen */}
                                        {aiResult.summary && (
                                            <div className="p-3 bg-muted/20 rounded-xl border text-xs space-y-1">
                                                <span className="font-bold text-foreground block">Diagnóstico de la Sustentación:</span>
                                                <p className="text-muted-foreground leading-relaxed">{aiResult.summary}</p>
                                            </div>
                                        )}

                                        {/* Cobertura de Temas */}
                                        {aiResult.topicsCoverage && aiResult.topicsCoverage.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="text-xs font-bold text-foreground block">Cobertura de Temas:</span>
                                                <div className="space-y-1.5">
                                                    {aiResult.topicsCoverage.map((tc: any, idx: number) => (
                                                        <div key={idx} className="p-2 rounded-lg border bg-card text-xs flex items-start gap-2">
                                                            {tc.covered ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                                            )}
                                                            <div className="space-y-0.5 min-w-0">
                                                                <span className="font-bold text-foreground block">{tc.topic}</span>
                                                                <p className="text-[11px] text-muted-foreground">{tc.comment}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Retroalimentación en Markdown */}
                                        {aiResult.feedback && (
                                            <div className="rounded-xl border bg-background p-3">
                                                <FeedbackViewer feedback={aiResult.feedback} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                        <Bot className="h-8 w-8 text-violet-600/40 animate-pulse" />
                                        <p className="text-xs font-semibold text-foreground">Aún no evaluado con IA</p>
                                        <p className="text-[11px] max-w-xs">
                                            Haz clic en el botón superior para que Gemini evalúe la sustentación en audio y la cobertura del enunciado.
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 2: Calificación Docente y Sustentación */}
                            <TabsContent value="teacher_grade" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                                {/* Checklist de Sustentación Docente */}
                                {checklistConfig && checklistData && checklistData.length > 0 && (
                                    <div className="p-3.5 rounded-xl border border-primary/20 bg-muted/20 space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-1.5">
                                                <ListChecks className="h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">Sustentación Oral Docente</span>
                                            </div>
                                            <span className="text-xs font-bold font-mono text-primary">
                                                Nota: {checklistScore.toFixed(1)} / 5.0
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                            {checklistData.map((crit: any, idx: number) => {
                                                const currentFactor = criteriaLevels[crit.id];
                                                return (
                                                    <div key={crit.id || idx} className="p-2.5 rounded-lg border bg-card space-y-1.5 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-[11px]">#{idx + 1} {crit.name}</span>
                                                            <Badge variant="outline" className="text-[9px] font-mono">{crit.percentage}%</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {RUBRIC_LEVELS.map((lvl) => (
                                                                <button
                                                                    key={lvl.key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextLevels = { ...criteriaLevels, [crit.id]: currentFactor === lvl.factor ? undefined : lvl.factor };
                                                                        setCriteriaLevels(nextLevels);
                                                                    }}
                                                                    className={cn(
                                                                        "text-[10px] font-bold px-2 py-0.5 rounded border transition-all",
                                                                        currentFactor === lvl.factor
                                                                            ? "bg-primary text-primary-foreground border-primary"
                                                                            : "bg-muted/40 hover:bg-muted text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {lvl.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                Ponderada: {combinedFinalScore.toFixed(1)} / 5.0
                                            </span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setGradeInput(combinedFinalScore.toFixed(1))}
                                                className="h-6 text-[10px] font-bold gap-1 text-primary"
                                            >
                                                <Zap className="h-3 w-3 fill-primary" /> Adoptar Ponderada
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Entrada de Nota Final */}
                                <div className="space-y-2">
                                    <Label htmlFor="grade-input-audio" className="text-xs font-bold uppercase tracking-wider flex justify-between">
                                        <span>Nota Final (0.0 a 5.0)</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">Escala 0.0 - 5.0</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="grade-input-audio"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            value={gradeInput}
                                            onChange={(e) => setGradeInput(e.target.value)}
                                            className="h-10 text-lg font-bold font-mono tracking-tight text-primary w-24 text-center"
                                        />
                                        <div className="flex flex-wrap items-center gap-1 flex-1">
                                            {["5.0", "4.5", "4.0", "3.5", "3.0", "0.0"].map((qg) => (
                                                <Button
                                                    key={qg}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setGradeInput(qg)}
                                                    className={`h-7 px-2 text-xs font-bold ${gradeInput === qg ? "bg-primary text-primary-foreground" : ""}`}
                                                >
                                                    {qg}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Observaciones del Profesor */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider">
                                        Observaciones y Retroalimentación
                                    </Label>
                                    <Textarea
                                        value={teacherNotesInput}
                                        onChange={(e) => setTeacherNotesInput(e.target.value)}
                                        rows={6}
                                        className="text-xs leading-relaxed"
                                        placeholder="Comentarios sobre la argumentación oral, tono y profundidad conceptual..."
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
