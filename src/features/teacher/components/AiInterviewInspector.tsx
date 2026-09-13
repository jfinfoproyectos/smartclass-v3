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
    Sparkles, Users, CheckCircle2, ChevronLeft, ChevronRight,
    MessageSquareQuote, Play, Check, X, Clock,
    FileText, ClipboardList, Info, Loader2, Bot, ArrowRight, RotateCcw, CheckCircle,
    ListChecks, SlidersHorizontal, HelpCircle, Zap, Award, AlertCircle, XCircle, User
} from "lucide-react";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { gradeInterviewAction } from "@/features/teacher/actions/gradingActions";
import { GradingModeSelector } from "./GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { TeacherEvaluationHeaderBadges } from "./TeacherEvaluationHeaderBadges";
import { TeacherChecklistEvaluationPanel } from "./TeacherChecklistEvaluationPanel";
import {
    getActivityChecklistConfig,
    extractEvaluationMetadata,
    stripEvaluationMetadata,
    embedEvaluationMetadata,
    calculateChecklistScore,
    calculateCombinedFinalGrade,
    EvaluationMetadata
} from "@/features/teacher/utils/checklistGradingUtils";

interface AiInterviewInspectorProps {
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

export function AiInterviewInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList,
    onSelectStudent,
    onGradeManual,
    onReject,
}: AiInterviewInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";

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

    const targetRole = interviewConfig?.targetRole || "Junior";

    // Extraer sesión de entrevista y evaluación del estudiante
    const parsedPayload = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    const history: Array<{ role: "interviewer" | "student"; content: string; timestamp?: string }> = parsedPayload?.history || [];
    const savedEvaluation = parsedPayload?.evaluation || null;

    // Extraer Lista de Chequeo y Ponderaciones
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity);
    }, [activity]);

    const isTeacherGradingEnabled = Boolean(checklistConfig);

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
    const [aiGrade, setAiGrade] = useState<number | null>(savedEvaluation?.grade ?? null);
    const [aiResult, setAiResult] = useState<any>(savedEvaluation);

    const [isSaving, setIsSaving] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("moderate");

    // Pestañas
    const [leftTab, setLeftTab] = useState<"transcript" | "statement">("transcript");
    const [rightTab, setRightTab] = useState<"ai_eval" | "teacher_grade">("ai_eval");

    // Si la evaluación docente no está habilitada y el usuario estaba en esa pestaña, redirigir a ai_eval
    useEffect(() => {
        if (!isTeacherGradingEnabled && rightTab === "teacher_grade") {
            setRightTab("ai_eval");
        }
    }, [isTeacherGradingEnabled, rightTab]);

    // Sincronizar al cambiar de estudiante
    useEffect(() => {
        const meta = extractEvaluationMetadata(submission?.feedback);
        const cleanFeedback = stripEvaluationMetadata(submission?.feedback || "");

        setCriteriaLevels(meta?.criteriaLevels || {});
        setManualSustentacionScore(meta?.manualSustentacionScore ?? null);

        const currentAi = meta?.aiGrade ?? savedEvaluation?.grade ?? null;
        setAiGrade(currentAi);
        setAiResult(savedEvaluation);
        setAiFeedbackInput("");
        setTeacherNotesInput(cleanFeedback);

        if (submission?.grade !== null && submission?.grade !== undefined) {
            setGradeInput(String(submission.grade));
        } else {
            setGradeInput("");
        }
    }, [submission?.id, student?.id, savedEvaluation, submission?.feedback, submission?.grade]);

    // Nota de sustentación oral
    const checklistScore = useMemo(() => {
        return calculateChecklistScore(checklistData, criteriaLevels, manualSustentacionScore);
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Nota final combinada ponderada
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) return checklistScore;
        const aiScoreVal = aiGrade ?? (checklistConfig ? 0 : (submission?.grade !== null ? Number(submission?.grade) : 0));
        return calculateCombinedFinalGrade(aiScoreVal, checklistScore, aiWeight, checklistWeight);
    }, [checklistConfig, aiGrade, submission?.grade, aiWeight, checklistScore, checklistWeight]);

    const handleUpdateCriteriaLevels = (nextLevels: Record<string, number | undefined>) => {
        setCriteriaLevels(nextLevels);
        setManualSustentacionScore(null);
        if (checklistConfig) {
            const nextChecklist = calculateChecklistScore(checklistData, nextLevels, null);
            const aiScore = aiGrade ?? 0;
            const nextCombined = calculateCombinedFinalGrade(aiScore, nextChecklist, aiWeight, checklistWeight);
            setGradeInput(nextCombined.toFixed(1));
        }
    };

    const handleQuickSustentacionPreset = (score: number) => {
        setManualSustentacionScore(score);
        if (checklistConfig) {
            const aiScore = aiGrade ?? 0;
            const nextCombined = calculateCombinedFinalGrade(aiScore, score, aiWeight, checklistWeight);
            setGradeInput(nextCombined.toFixed(1));
        }
    };

    // Navegación entre estudiantes
    const currentIndex = useMemo(() => {
        if (!studentsList || !student) return -1;
        return studentsList.findIndex((item) => item.student.id === student.id);
    }, [studentsList, student]);

    const hasPrev = currentIndex > 0;
    const hasNext = studentsList && currentIndex >= 0 && currentIndex < studentsList.length - 1;

    // Reevaluar entrevista con IA
    const handleGradeWithAI = async () => {
        if (history.length === 0) {
            toast.error("El estudiante no ha realizado la entrevista.");
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const result = await gradeInterviewAction(
                activity.id,
                student.id,
                history,
                activity.statement || "",
                activity.courseId,
                targetRole,
                gradingMode
            );

            setAiResult(result);
            setAiGrade(result.grade);
            setAiFeedbackInput(result.feedback);
            const finalCombined = checklistConfig
                ? calculateCombinedFinalGrade(result.grade, checklistScore, aiWeight, checklistWeight)
                : result.grade;
            setGradeInput(finalCombined.toFixed(1));
            setRightTab("ai_eval");
            if (checklistConfig) {
                toast.success(`✓ Entrevista evaluada con IA (${result.grade.toFixed(1)}). Nota ponderada: ${finalCombined.toFixed(1)}`);
            } else {
                toast.success(`✓ Entrevista evaluada con IA. Nota sugerida: ${result.grade.toFixed(1)}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar entrevista.");
        } finally {
            setIsEvaluatingAI(false);
        }
    };

    // Guardar calificación manual
    const handleSaveGrade = async () => {
        let gradeToSave = gradeInput;
        if (checklistConfig && (!gradeToSave || isNaN(parseFloat(gradeToSave)))) {
            gradeToSave = combinedFinalScore.toFixed(1);
            setGradeInput(gradeToSave);
        }

        const parsedGrade = parseFloat(gradeToSave);
        if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 5) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }

        setIsSaving(true);
        try {
            let fullFeedback = teacherNotesInput.trim()
                ? `${teacherNotesInput.trim()}${aiFeedbackInput ? `\n\n---\n### Evaluación de la Entrevista Técnica (IA)\n${aiFeedbackInput}` : ""}`
                : (aiFeedbackInput || aiResult?.feedback || "");

            if (checklistConfig) {
                const metadata: EvaluationMetadata = {
                    aiGrade: aiGrade ?? 0,
                    checklistScore: checklistScore,
                    criteriaLevels: criteriaLevels,
                    manualSustentacionScore: manualSustentacionScore,
                };
                fullFeedback = embedEvaluationMetadata(fullFeedback, metadata);
            }

            await onGradeManual(gradeToSave, fullFeedback, student.id, activity.id);
            toast.success("✓ Calificación guardada exitosamente");
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la calificación");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
                {/* Header Inspector */}
                <div className="flex items-center justify-between p-3 sm:px-5 border-b bg-muted/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 text-xs gap-1">
                            <ChevronLeft className="h-4 w-4" /> Volver
                        </Button>
                        <Separator orientation="vertical" className="h-5" />
                        <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200">
                                <MessageSquareQuote className="h-3.5 w-3.5 mr-1" />
                                Entrevista Técnica
                            </Badge>
                            <span className="font-bold text-sm truncate text-foreground">{student.name}</span>
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">({activity.title})</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isTeacherGradingEnabled && checklistConfig ? (
                            <TeacherEvaluationHeaderBadges
                                checklistConfig={checklistConfig}
                                aiGrade={aiGrade}
                                checklistScore={checklistScore}
                                combinedFinalScore={combinedFinalScore}
                            />
                        ) : (submission?.grade !== null && submission?.grade !== undefined) ? (
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold animate-in fade-in">
                                <span className="text-[10px] uppercase font-bold opacity-80">Nota:</span>
                                <span className="text-sm font-black font-mono">{Number(submission.grade).toFixed(1)}</span>
                                <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                            </div>
                        ) : null}

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
                    {/* Columna Izquierda: Transcripción del Diálogo */}
                    <div className={cn("flex flex-col border-r border-border min-h-0 overflow-hidden", checklistConfig ? "lg:col-span-6" : "lg:col-span-7")}>
                        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
                                <TabsList className="h-7 p-0.5">
                                    <TabsTrigger value="transcript" className="text-xs px-2.5">
                                        <MessageSquareQuote className="h-3 w-3 mr-1" /> Transcripción de la Entrevista ({history.length} mensajes)
                                    </TabsTrigger>
                                    <TabsTrigger value="statement" className="text-xs px-2.5">
                                        <FileText className="h-3 w-3 mr-1" /> Enunciado
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <Badge variant="secondary" className="text-[10px] font-mono">
                                Nivel: {targetRole}
                            </Badge>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-muted/5">
                            {leftTab === "transcript" ? (
                                history.length > 0 ? (
                                    history.map((msg, idx) => {
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
                                                            {isInterviewer ? "Entrevistador IA" : "Respuesta del Estudiante"}
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
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-2">
                                        <AlertCircle className="h-8 w-8 text-amber-500" />
                                        <p className="text-xs font-semibold">El estudiante aún no ha iniciado o entregado la entrevista.</p>
                                    </div>
                                )
                            ) : (
                                <div className="p-4" data-color-mode={mode}>
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No hay enunciado disponible.**"}
                                        style={{ background: "transparent" }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Panel de Calificación e Informe */}
                    <div className={cn("flex flex-col min-h-0 overflow-hidden bg-background", checklistConfig ? "lg:col-span-6" : "lg:col-span-5")}>
                        <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex-1 flex flex-col min-h-0">
                            <div className="border-b p-2 bg-muted/20 overflow-x-auto scrollbar-none">
                                <TabsList className={cn("h-8 p-0.5 gap-1", isTeacherGradingEnabled && checklistConfig ? "grid grid-cols-2" : "inline-flex")}>
                                    <TabsTrigger value="ai_eval" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                        <Bot className="h-3.5 w-3.5 shrink-0" /> <span>Informe IA</span>
                                    </TabsTrigger>
                                    {isTeacherGradingEnabled && checklistConfig && (
                                        <TabsTrigger value="teacher_grade" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Evaluación Docente</span>
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold ml-0.5 shrink-0">
                                                {checklistScore.toFixed(1)}
                                            </Badge>
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>

                            {/* TAB 1: Evaluación IA */}
                            <TabsContent value="ai_eval" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                                <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                                    <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                </div>

                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={handleGradeWithAI}
                                    disabled={isEvaluatingAI || history.length === 0}
                                    className="w-full font-bold text-xs gap-2 shadow-xs h-9 cursor-pointer"
                                >
                                    {isEvaluatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {isEvaluatingAI ? "Evaluando con IA..." : (aiFeedbackInput ? "Reevaluar con IA" : "Evaluar con IA (Gemini)")}
                                </Button>

                                {aiResult ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Score Badges */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2 rounded-xl border bg-teal-500/5 border-teal-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Técnico</span>
                                                <span className="text-sm font-extrabold font-mono text-teal-600 dark:text-teal-400">
                                                    {aiResult.technicalScore?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-blue-500/5 border-blue-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Comunicación</span>
                                                <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                                    {aiResult.communicationScore?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Resolución</span>
                                                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                                    {aiResult.problemSolvingScore?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                        </div>

                                        {/* Resumen */}
                                        {aiResult.summary && (
                                            <div className="p-3 bg-muted/20 rounded-xl border text-xs space-y-1">
                                                <span className="font-bold text-foreground block">Diagnóstico de la Entrevista:</span>
                                                <p className="text-muted-foreground leading-relaxed">{aiResult.summary}</p>
                                            </div>
                                        )}

                                        {/* Desglose pregunta a pregunta */}
                                        {Array.isArray(aiResult.questionFeedback) && aiResult.questionFeedback.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="text-xs font-bold text-foreground block">
                                                    Desglose de Preguntas:
                                                </span>
                                                {aiResult.questionFeedback.map((qf: any, idx: number) => (
                                                    <div key={idx} className="p-2.5 rounded-xl border bg-background text-xs space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-teal-600">Pregunta #{idx + 1}</span>
                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                Nota: {qf.score?.toFixed(1)} / 5.0
                                                            </Badge>
                                                        </div>
                                                        <p className="font-semibold text-foreground text-[11px]">{qf.question}</p>
                                                        <p className="text-[10px] text-muted-foreground">{qf.evaluation}</p>
                                                    </div>
                                                ))}
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
                                        <Bot className="h-8 w-8 text-teal-600/40 animate-pulse" />
                                        <p className="text-xs font-semibold text-foreground">Aún no evaluado con IA</p>
                                        <p className="text-[11px] max-w-xs">
                                            Haz clic en el botón superior para que Gemini evalúe los 3 ejes: Dominio Técnico, Comunicación y Resolución de Problemas.
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 2: Calificación Docente y Sustentación (Solo si está habilitada en la actividad) */}
                            {isTeacherGradingEnabled && checklistConfig && (
                                <TabsContent value="teacher_grade" className="flex-1 p-0 overflow-y-auto m-0">
                                    <div className="p-4">
                                        <TeacherChecklistEvaluationPanel
                                            activity={activity}
                                            student={student}
                                            submission={submission}
                                            aiGrade={aiGrade}
                                            aiFeedbackInput={aiFeedbackInput}
                                            gradingResult={aiResult}
                                            checklistConfig={checklistConfig}
                                            criteriaLevels={criteriaLevels}
                                            onUpdateCriteriaLevels={handleUpdateCriteriaLevels}
                                            manualSustentacionScore={manualSustentacionScore}
                                            onSetManualSustentacionScore={setManualSustentacionScore}
                                            gradeInput={gradeInput}
                                            onSetGradeInput={setGradeInput}
                                            teacherNotesInput={teacherNotesInput}
                                            onSetTeacherNotesInput={setTeacherNotesInput}
                                            isSavingGrade={isSaving}
                                            onSaveGrade={handleSaveGrade}
                                            onReject={onReject ? () => onReject(student.id, teacherNotesInput || undefined) : undefined}
                                        />
                                    </div>
                                </TabsContent>
                            )}
                        </Tabs>
                    </div>
                </div>
            </div>
        );
    }
