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
    Sparkles, Users, Crown, CheckCircle2, ChevronLeft, ChevronRight,
    Terminal, Play, Check, X, Clock, FileCode,
    FileText, ClipboardList, Info, Loader2, Bot, ArrowRight, RotateCcw, CheckCircle,
    ListChecks, SlidersHorizontal, HelpCircle, Zap, Award, AlertCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import { gradeCodeChallengeAction } from "@/features/teacher/actions/gradingActions";
import { GradingModeSelector } from "./GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { RUBRIC_LEVELS } from "./CodeProjectInspector";
import {
    getActivityChecklistConfig,
    extractEvaluationMetadata,
    stripEvaluationMetadata,
    embedEvaluationMetadata,
    calculateChecklistScore,
    calculateCombinedFinalGrade,
    EvaluationMetadata
} from "@/features/teacher/utils/checklistGradingUtils";

interface CodeChallengeInspectorProps {
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

function getLanguageFromFileName(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case "js":
        case "jsx":
        case "mjs":
            return "javascript";
        case "ts":
        case "tsx":
            return "typescript";
        case "py":
            return "python";
        case "html":
        case "htm":
            return "html";
        case "css":
            return "css";
        case "json":
            return "json";
        case "sql":
            return "sql";
        case "java":
            return "java";
        case "cpp":
        case "cc":
        case "c":
            return "cpp";
        case "md":
            return "markdown";
        default:
            return "javascript";
    }
}

export function CodeChallengeInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList,
    onSelectStudent,
    onGradeManual,
    onReject,
}: CodeChallengeInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const monacoTheme = mode === "dark" ? "vs-dark" : "light";

    // Extraer configuración del desafío
    const challengeConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.challengeConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const language = challengeConfig?.language || "javascript";

    // Extraer archivos entregados por el estudiante
    const files = useMemo<Array<{ id: string; name: string; content: string }>>(() => {
        if (!submission?.url) return [];
        try {
            const parsed = JSON.parse(submission.url);
            if (Array.isArray(parsed?.files) && parsed.files.length > 0) {
                return parsed.files;
            }
            if (parsed?.code) {
                return [{ id: "1", name: "solucion.js", content: parsed.code }];
            }
        } catch {
            if (typeof submission.url === "string" && submission.url.trim()) {
                return [{ id: "1", name: "solucion.js", content: submission.url }];
            }
        }
        return [];
    }, [submission?.url]);

    const [activeFileId, setActiveFileId] = useState<string>(files[0]?.id || "1");

    useEffect(() => {
        if (files.length > 0 && !files.some(f => f.id === activeFileId)) {
            setActiveFileId(files[0].id);
        }
    }, [files, activeFileId]);

    const activeFile = files.find(f => f.id === activeFileId) || files[0];

    // Extraer Lista de Chequeo y Ponderaciones si están configuradas
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity);
    }, [activity]);

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
    const [leftTab, setLeftTab] = useState<"code" | "statement">("code");
    const [rightTab, setRightTab] = useState<"ai_eval" | "teacher_grade">("ai_eval");

    // Sincronizar al cambiar de estudiante
    useEffect(() => {
        const meta = extractEvaluationMetadata(submission?.feedback);
        const cleanFeedback = stripEvaluationMetadata(submission?.feedback || "");

        setCriteriaLevels(meta?.criteriaLevels || {});
        setManualSustentacionScore(meta?.manualSustentacionScore ?? null);

        const currentAi = meta?.aiGrade ?? null;
        setAiGrade(currentAi);
        setAiResult(null);
        setAiFeedbackInput("");
        setTeacherNotesInput(cleanFeedback);

        if (submission?.grade !== null && submission?.grade !== undefined) {
            setGradeInput(String(submission.grade));
        } else {
            setGradeInput("");
        }
    }, [submission?.id, student?.id, submission?.feedback, submission?.grade]);

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

    // Evaluar solución de código con IA (Gemini)
    const handleGradeWithAI = async () => {
        if (files.length === 0) {
            toast.error("El estudiante no ha entregado archivos de código.");
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const result = await gradeCodeChallengeAction(
                activity.id,
                student.id,
                files[0]?.content || "",
                language,
                activity.statement || "",
                activity.courseId,
                [],
                undefined,
                gradingMode,
                files
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
                toast.success(`✓ Código evaluado con IA (${result.grade.toFixed(1)}). Nota ponderada: ${finalCombined.toFixed(1)}`);
            } else {
                toast.success(`✓ Código evaluado con IA. Nota sugerida: ${result.grade.toFixed(1)}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar el código.");
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
                ? `${teacherNotesInput.trim()}${aiFeedbackInput ? `\n\n---\n### Evaluación del Código (IA)\n${aiFeedbackInput}` : ""}`
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
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200">
                                <Terminal className="h-3.5 w-3.5 mr-1" />
                                Taller de Código
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
                    {/* Columna Izquierda: Monaco Editor con los archivos del alumno (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col border-r border-border min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
                                <TabsList className="h-7 p-0.5">
                                    <TabsTrigger value="code" className="text-xs px-2.5">
                                        <Terminal className="h-3 w-3 mr-1 text-blue-500" /> Código Entregado ({files.length} archivos)
                                    </TabsTrigger>
                                    <TabsTrigger value="statement" className="text-xs px-2.5">
                                        <FileText className="h-3 w-3 mr-1" /> Enunciado
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {leftTab === "code" && activeFile && (
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    {getLanguageFromFileName(activeFile.name)}
                                </Badge>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
                            {leftTab === "code" ? (
                                files.length > 0 ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        {/* Pestañas de archivos (multilínea sin scroll) */}
                                        <div className="flex flex-wrap items-center gap-1.5 p-2.5 border-b bg-muted/30">
                                            {files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    onClick={() => setActiveFileId(file.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer border transition-all select-none whitespace-nowrap shrink-0",
                                                        activeFileId === file.id
                                                            ? "bg-background text-foreground border-border shadow-2xs font-bold ring-1 ring-primary/30"
                                                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                                                    )}
                                                >
                                                    <FileCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                    <span>{file.name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Editor Monaco en modo visor */}
                                        <div className="flex-1 min-h-[400px]">
                                            {activeFile && (
                                                <Editor
                                                    key={`${activeFile.id}_${getLanguageFromFileName(activeFile.name)}`}
                                                    path={activeFile.name}
                                                    height="100%"
                                                    language={getLanguageFromFileName(activeFile.name)}
                                                    theme={monacoTheme}
                                                    value={activeFile.content}
                                                    options={{
                                                        minimap: { enabled: false },
                                                        fontSize: 13,
                                                        lineNumbers: "on",
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        wordWrap: "on",
                                                        tabSize: 4,
                                                        readOnly: true,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-2 p-4 my-auto">
                                        <AlertCircle className="h-8 w-8 text-amber-500" />
                                        <p className="text-xs font-semibold">El estudiante aún no ha entregado archivos para este taller.</p>
                                    </div>
                                )
                            ) : (
                                <div className="p-4 overflow-y-auto" data-color-mode={mode}>
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No hay enunciado disponible.**"}
                                        style={{ background: "transparent" }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Panel de Calificación e IA (5 cols) */}
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
                                    disabled={isEvaluatingAI || files.length === 0}
                                    className="w-full font-bold text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs h-9"
                                >
                                    {isEvaluatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    Evaluar Código con Gemini
                                </Button>

                                {aiResult ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Score Badges */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2 rounded-xl border bg-blue-500/5 border-blue-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Nota Sugerida</span>
                                                <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                                    {aiResult.grade?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-purple-500/5 border-purple-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Tiempo Big-O</span>
                                                <span className="text-xs font-extrabold font-mono text-purple-600 dark:text-purple-400">
                                                    {aiResult.timeComplexity || "O(n)"}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Eficiencia</span>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    {aiResult.algorithmicEfficiency || "Óptima"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Resumen */}
                                        {aiResult.summary && (
                                            <div className="p-3 bg-muted/20 rounded-xl border text-xs space-y-1">
                                                <span className="font-bold text-foreground block">Diagnóstico del Código:</span>
                                                <p className="text-muted-foreground leading-relaxed">{aiResult.summary}</p>
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
                                        <Bot className="h-8 w-8 text-blue-600/40 animate-pulse" />
                                        <p className="text-xs font-semibold text-foreground">Aún no evaluado con IA</p>
                                        <p className="text-[11px] max-w-xs">
                                            Haz clic en el botón superior para que Gemini analice los archivos entregados en función del enunciado y la rúbrica.
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
                                                <span className="text-xs font-bold text-foreground">Sustentación Docente ({checklistWeight}%)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const allFull: Record<string, number> = {};
                                                        checklistData.forEach((c: any) => { allFull[c.id] = 1.0; });
                                                        handleUpdateCriteriaLevels(allFull);
                                                    }}
                                                    className="h-6 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                                >
                                                    Todos Sabe
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUpdateCriteriaLevels({})}
                                                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:bg-muted"
                                                >
                                                    Limpiar
                                                </Button>
                                                <span className="text-xs font-bold font-mono text-primary ml-1">
                                                    {checklistScore.toFixed(1)} / 5.0
                                                </span>
                                            </div>
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
                                                                        handleUpdateCriteriaLevels(nextLevels);
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

                                        {/* Presets rápidos de nota de sustentación */}
                                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-dashed">
                                            <span className="text-[10px] text-muted-foreground font-medium">Nota Rápida Sustentación:</span>
                                            <div className="flex items-center gap-1">
                                                {[5.0, 4.0, 3.0, 0.0].map((score) => (
                                                    <Button
                                                        key={score}
                                                        type="button"
                                                        variant={manualSustentacionScore === score ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleQuickSustentacionPreset(score)}
                                                        className="h-5 px-1.5 text-[10px] font-mono"
                                                    >
                                                        {score.toFixed(1)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Ponderación combinada */}
                                        <div className="p-2 rounded-lg bg-background/80 border text-[11px] space-y-1">
                                            <div className="flex items-center justify-between font-mono">
                                                <span className="text-muted-foreground">
                                                    (IA {aiWeight}%: {(aiGrade ?? 0).toFixed(1)}) + (Docente {checklistWeight}%: {checklistScore.toFixed(1)})
                                                </span>
                                                <span className="font-bold text-primary">
                                                    = {combinedFinalScore.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                                <div className="bg-purple-500 h-full" style={{ width: `${aiWeight}%` }} title={`IA: ${aiWeight}%`} />
                                                <div className="bg-blue-500 h-full" style={{ width: `${checklistWeight}%` }} title={`Docente: ${checklistWeight}%`} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Entrada de Nota Final */}
                                <div className="space-y-2">
                                    <Label htmlFor="grade-input-challenge" className="text-xs font-bold uppercase tracking-wider flex justify-between">
                                        <span>Nota Final (0.0 a 5.0)</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">Escala 0.0 - 5.0</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="grade-input-challenge"
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
                                        placeholder="Comentarios sobre la lógica, modularidad y dominio del código..."
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
