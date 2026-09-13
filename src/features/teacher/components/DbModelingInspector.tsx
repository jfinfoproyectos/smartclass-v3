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
    Database, Sparkles, CheckCircle2, ChevronLeft, ChevronRight,
    Play, Check, X, Clock, FileText, ClipboardList, Info, Loader2,
    Bot, ArrowRight, RotateCcw, CheckCircle, ListChecks, SlidersHorizontal,
    Zap, Award, AlertCircle, XCircle, Code2, Layers, Copy, Cloud, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import { gradeDbModelingAction } from "@/features/teacher/actions/gradingActions";
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

interface DbModelingInspectorProps {
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

export function DbModelingInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList,
    onSelectStudent,
    onGradeManual,
    onReject,
}: DbModelingInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";

    // Extraer configuración de BD
    const dbConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.dbConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const targetEngine = dbConfig?.targetEngine || "PostgreSQL";
    const requiredNormalization = dbConfig?.requiredNormalization || "3FN";

    // Extraer datos entregados por el estudiante
    const parsedPayload = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    const diagramCode: string = parsedPayload?.diagramCode || "";
    const sqlScript: string = parsedPayload?.sqlScript || "";
    const connectionString: string = parsedPayload?.connectionString || "";
    const isCloudMode = Boolean(connectionString) || dbConfig?.deliveryMode === "cloud";

    const maskedConnectionUri = useMemo(() => {
        if (!connectionString) return "";
        try {
            const parsed = new URL(connectionString);
            if (parsed.password) parsed.password = "••••••••";
            return parsed.toString();
        } catch {
            return connectionString.replace(/:([^@]+)@/, ":••••••••@");
        }
    }, [connectionString]);

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
    const [teacherObservationInput, setTeacherObservationInput] = useState<string>("");
    const [aiFeedbackInput, setAiFeedbackInput] = useState<string>("");
    const [aiGrade, setAiGrade] = useState<number | null>(null);
    const [aiResult, setAiResult] = useState<any>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("moderate");

    // Pestañas
    const [leftTab, setLeftTab] = useState<"sql" | "tables" | "statement">("sql");
    const [rightTab, setRightTab] = useState<"ai_eval" | "teacher_grade">("ai_eval");

    // Redirigir si la calificación docente está deshabilitada y la pestaña activa era teacher_grade
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

        const currentAi = meta?.aiGrade ?? null;
        setAiGrade(currentAi);
        setAiResult(null);
        setAiFeedbackInput("");
        setTeacherNotesInput(cleanFeedback);
        setLeftTab("sql");

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

    // Auditar modelo de BD con IA
    const handleGradeWithAI = async () => {
        if (!sqlScript && !connectionString) {
            toast.error("El estudiante no ha entregado script SQL ni cadena de conexión cloud.");
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const result = await gradeDbModelingAction(
                activity.id,
                student.id,
                diagramCode,
                sqlScript,
                activity.statement || "",
                activity.courseId,
                dbConfig,
                gradingMode,
                connectionString
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
                toast.success(`✓ Modelo evaluado con IA (${result.grade.toFixed(1)}). Nota ponderada: ${finalCombined.toFixed(1)}`);
            } else {
                toast.success(`✓ Modelo evaluado con IA. Nota sugerida: ${result.grade.toFixed(1)}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar modelo de base de datos.");
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
                ? `${teacherNotesInput.trim()}${aiFeedbackInput ? `\n\n---\n### Auditoría de Base de Datos (IA)\n${aiFeedbackInput}` : ""}`
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
                            <Badge variant="outline" className={cn(
                                "text-xs border",
                                isCloudMode
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40"
                                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200"
                            )}>
                                {isCloudMode ? <Cloud className="h-3.5 w-3.5 mr-1" /> : <Database className="h-3.5 w-3.5 mr-1" />}
                                {isCloudMode ? "Cloud PostgreSQL MCP" : "Sandbox Local (PGlite)"}
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
                    {/* Columna Izquierda: Diagrama ER / Script SQL */}
                    <div className={cn("flex flex-col border-r border-border min-h-0 overflow-hidden", checklistConfig ? "lg:col-span-6" : "lg:col-span-7")}>
                        <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
                                <TabsList className="h-7 p-0.5">
                                    <TabsTrigger value="sql" className="text-xs px-2.5">
                                        <Code2 className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" /> Script SQL
                                    </TabsTrigger>
                                    <TabsTrigger value="tables" className="text-xs px-2.5">
                                        <Database className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Tablas Vivas (Sandbox)
                                    </TabsTrigger>
                                    {diagramCode?.trim() ? (
                                        <TabsTrigger value="diagram" className="text-xs px-2.5">
                                            <Layers className="h-3 w-3 mr-1 text-indigo-600 dark:text-indigo-400" /> Diagrama ER
                                        </TabsTrigger>
                                    ) : null}
                                    <TabsTrigger value="statement" className="text-xs px-2.5">
                                        <FileText className="h-3 w-3 mr-1" /> Enunciado
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                    Motor: {targetEngine}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    Norm: {requiredNormalization}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-muted/5">
                            {leftTab === "sql" ? (
                                <div className="flex-1 flex flex-col space-y-3">
                                    {isCloudMode && (
                                        <div className="p-3.5 bg-blue-500/5 border border-blue-200 dark:border-blue-800/40 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                                                    <Cloud className="h-4 w-4" />
                                                    <span>Base de Datos en la Nube (Conexión Directa)</span>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                                                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> SSL Habilitado
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 bg-background p-2 rounded-lg border font-mono text-xs">
                                                <span className="truncate flex-1 text-muted-foreground">{maskedConnectionUri || "(Sin URI registrada)"}</span>
                                                {connectionString && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(connectionString);
                                                            toast.success("URI de conexión copiada al portapapeles");
                                                        }}
                                                        className="h-6 text-[10px] gap-1 px-2 shrink-0"
                                                    >
                                                        <Copy className="h-3 w-3" /> Copiar URI
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {sqlScript ? (
                                        <div className="flex-1 flex flex-col rounded-xl border bg-background overflow-hidden min-h-[400px] shadow-2xs">
                                            <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {isCloudMode ? "Scripts de Migración / Consultas de Demostración" : "Script SQL (.sql) — DDL, DML & Consultas"}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(sqlScript);
                                                        toast.success("Script copiado al portapapeles");
                                                    }}
                                                    className="h-6 text-[10px] gap-1 px-2"
                                                >
                                                    <Copy className="h-3 w-3" /> Copiar SQL
                                                </Button>
                                            </div>
                                            <div className="flex-1 min-h-[360px]">
                                                <Editor
                                                    height="100%"
                                                    language="sql"
                                                    theme={mode === "dark" ? "vs-dark" : "light"}
                                                    value={sqlScript}
                                                    options={{
                                                        minimap: { enabled: false },
                                                        fontSize: 12,
                                                        lineNumbers: "on",
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        wordWrap: "on",
                                                        readOnly: true,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground space-y-2 border rounded-xl bg-background p-4">
                                            <Info className="h-6 w-6 text-muted-foreground" />
                                            <p className="text-xs font-semibold">El estudiante no incluyó código o notas SQL adicionales.</p>
                                        </div>
                                    )}
                                </div>
                            ) : leftTab === "tables" ? (
                                aiResult?.cloudResult ? (
                                    /* Vista Cloud PostgreSQL MCP */
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-background">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    className={cn(
                                                        "text-xs font-bold gap-1",
                                                        aiResult.cloudResult.success
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-rose-600 text-white"
                                                    )}
                                                >
                                                    <Cloud className="h-3.5 w-3.5" />
                                                    {aiResult.cloudResult.success ? `✓ Cloud PostgreSQL (${aiResult.cloudResult.host})` : "❌ Error de Conexión Cloud"}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {aiResult.cloudResult.executionTimeMs} ms
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">
                                                {aiResult.cloudResult.totalTables} tablas en producción
                                            </span>
                                        </div>

                                        {aiResult.cloudResult.errors.length > 0 && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-300 dark:border-rose-800 rounded-xl space-y-1">
                                                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                                                    Fallo de conexión al servidor remoto:
                                                </span>
                                                {aiResult.cloudResult.errors.map((err: string, i: number) => (
                                                    <pre key={i} className="text-[11px] font-mono text-rose-600 whitespace-pre-wrap">
                                                        {err}
                                                    </pre>
                                                ))}
                                            </div>
                                        )}

                                        {aiResult.cloudResult.tables.length > 0 ? (
                                            <div className="space-y-3">
                                                {aiResult.cloudResult.tables.map((tbl: any, idx: number) => (
                                                    <div key={idx} className="rounded-xl border bg-background overflow-hidden">
                                                        <div className="flex items-center justify-between p-2.5 bg-muted/30 border-b">
                                                            <div className="flex items-center gap-2">
                                                                <Database className="h-3.5 w-3.5 text-blue-600" />
                                                                <span className="font-bold text-xs font-mono">{tbl.tableName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                                    {tbl.sizeBytes}
                                                                </Badge>
                                                                <Badge variant="secondary" className="text-[10px] font-mono">
                                                                    {tbl.rowCount} filas reales
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="p-2.5 space-y-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                {tbl.columns.map((col: any, cIdx: number) => (
                                                                    <Badge key={cIdx} variant="outline" className="text-[9px] font-mono">
                                                                        {col.columnName}: <span className="text-muted-foreground ml-0.5">{col.dataType}</span>
                                                                    </Badge>
                                                                ))}
                                                            </div>

                                                            {/* Índices en producción */}
                                                            {tbl.indexes && tbl.indexes.length > 0 && (
                                                                <div className="pt-1">
                                                                    <span className="text-[10px] font-bold text-muted-foreground block">
                                                                        Índices en Producción:
                                                                    </span>
                                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                                        {tbl.indexes.map((idxItem: any, iIdx: number) => (
                                                                            <Badge key={iIdx} variant="secondary" className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400">
                                                                                {idxItem.indexName}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {tbl.sampleRows && tbl.sampleRows.length > 0 ? (
                                                                <div className="overflow-x-auto border rounded-lg max-h-40">
                                                                    <table className="w-full text-[10px] font-mono">
                                                                        <thead className="bg-muted/50 border-b">
                                                                            <tr>
                                                                                {Object.keys(tbl.sampleRows[0]).map((k) => (
                                                                                    <th key={k} className="p-1.5 text-left font-bold">{k}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {tbl.sampleRows.map((row: any, rIdx: number) => (
                                                                                <tr key={rIdx} className="border-b last:border-0 hover:bg-muted/20">
                                                                                    {Object.values(row).map((val: any, vIdx: number) => (
                                                                                        <td key={vIdx} className="p-1.5 truncate max-w-[120px]">{String(val)}</td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-muted-foreground italic">Tabla sin registros en producción.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground space-y-1">
                                                <Database className="h-6 w-6 text-muted-foreground/50" />
                                                <p className="text-xs">No se detectaron tablas en el esquema público de la base de datos remota.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : aiResult?.sandboxResult ? (
                                    /* Vista Sandbox Local */
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-background">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    className={cn(
                                                        "text-xs font-bold",
                                                        aiResult.sandboxResult.success
                                                            ? "bg-emerald-600 text-white"
                                                            : "bg-rose-600 text-white"
                                                    )}
                                                >
                                                    {aiResult.sandboxResult.success ? "✓ Sandbox PostgreSQL OK" : "❌ Error de Ejecución"}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {aiResult.sandboxResult.executionTimeMs} ms
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">
                                                {aiResult.sandboxResult.createdTableNames.length} tablas creadas
                                            </span>
                                        </div>

                                        {aiResult.sandboxResult.errors.length > 0 && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-300 dark:border-rose-800 rounded-xl space-y-1">
                                                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                                                    Errores nativos arrojados por el motor PostgreSQL:
                                                </span>
                                                {aiResult.sandboxResult.errors.map((err: string, i: number) => (
                                                    <pre key={i} className="text-[11px] font-mono text-rose-600 whitespace-pre-wrap">
                                                        {err}
                                                    </pre>
                                                ))}
                                            </div>
                                        )}

                                        {aiResult.sandboxResult.tables.length > 0 ? (
                                            <div className="space-y-3">
                                                {aiResult.sandboxResult.tables.map((tbl: any, idx: number) => (
                                                    <div key={idx} className="rounded-xl border bg-background overflow-hidden">
                                                        <div className="flex items-center justify-between p-2.5 bg-muted/30 border-b">
                                                            <div className="flex items-center gap-2">
                                                                <Database className="h-3.5 w-3.5 text-indigo-600" />
                                                                <span className="font-bold text-xs font-mono">{tbl.tableName}</span>
                                                            </div>
                                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                                {tbl.rowCount} filas
                                                            </Badge>
                                                        </div>
                                                        <div className="p-2.5 space-y-2">
                                                            <div className="flex flex-wrap gap-1">
                                                                {tbl.columns.map((col: any, cIdx: number) => (
                                                                    <Badge key={cIdx} variant="outline" className="text-[9px] font-mono">
                                                                        {col.columnName}: <span className="text-muted-foreground ml-0.5">{col.dataType}</span>
                                                                    </Badge>
                                                                ))}
                                                            </div>

                                                            {tbl.sampleRows && tbl.sampleRows.length > 0 ? (
                                                                <div className="overflow-x-auto border rounded-lg max-h-40">
                                                                    <table className="w-full text-[10px] font-mono">
                                                                        <thead className="bg-muted/50 border-b">
                                                                            <tr>
                                                                                {Object.keys(tbl.sampleRows[0]).map((k) => (
                                                                                    <th key={k} className="p-1.5 text-left font-bold">{k}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {tbl.sampleRows.map((row: any, rIdx: number) => (
                                                                                <tr key={rIdx} className="border-b last:border-0 hover:bg-muted/20">
                                                                                    {Object.values(row).map((val: any, vIdx: number) => (
                                                                                        <td key={vIdx} className="p-1.5 truncate max-w-[120px]">{String(val)}</td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-muted-foreground italic">Tabla vacía (0 registros insertados).</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground space-y-1">
                                                <Database className="h-6 w-6 text-muted-foreground/50" />
                                                <p className="text-xs">No se detectaron tablas creadas en el esquema público.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-2">
                                        <Database className="h-8 w-8 text-indigo-600/50" />
                                        <p className="text-xs font-semibold text-foreground">Tablas Vivas ({isCloudMode ? "PostgreSQL Cloud" : "Sandbox"})</p>
                                        <p className="text-[11px] max-w-xs">
                                            Ejecuta la "Auditoría IA" en el panel derecho para {isCloudMode ? "conectar en vivo a la base de datos remota e inspeccionar sus tablas e índices." : "instanciar la base de datos en memoria y visualizar las tablas y registros aquí."}
                                        </p>
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

                    {/* Columna Derecha: Panel de Auditoría IA y Calificación */}
                    <div className={cn("flex flex-col min-h-0 overflow-hidden bg-background", checklistConfig ? "lg:col-span-6" : "lg:col-span-5")}>
                        <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex-1 flex flex-col min-h-0">
                            <div className="border-b p-2 bg-muted/20 overflow-x-auto scrollbar-none">
                                <TabsList className={cn("h-8 p-0.5 gap-1", isTeacherGradingEnabled && checklistConfig ? "grid grid-cols-2" : "inline-flex")}>
                                    <TabsTrigger value="ai_eval" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                        <Bot className="h-3.5 w-3.5 shrink-0" /> <span>Auditoría IA</span>
                                    </TabsTrigger>
                                    {isTeacherGradingEnabled && checklistConfig && (
                                        <TabsTrigger value="teacher_grade" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Evaluación Docente</span>
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4 bg-primary/20 text-primary">
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
                                    disabled={isEvaluatingAI || !sqlScript}
                                    className="w-full font-bold text-xs gap-2 shadow-xs h-9 cursor-pointer"
                                >
                                    {isEvaluatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {isEvaluatingAI ? "Evaluando con IA..." : (aiFeedbackInput ? "Reevaluar con IA" : "Evaluar con IA (Gemini)")}
                                </Button>

                                {aiResult ? (
                                    <div className="space-y-4 animate-in fade-in">
                                        {/* Score Badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="p-2 rounded-xl border bg-blue-500/5 border-blue-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Estructura DDL</span>
                                                <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                                    {(aiResult.ddlScore ?? aiResult.sqlSyntaxScore ?? 0).toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Datos DML</span>
                                                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                                    {(aiResult.dmlScore ?? 5.0).toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-indigo-500/5 border-indigo-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Normalización</span>
                                                <span className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                                                    {(aiResult.normalizationScore ?? 0).toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-purple-500/5 border-purple-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Integridad Sandbox</span>
                                                <span className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
                                                    {(aiResult.integrityScore ?? aiResult.erScore ?? 5.0).toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                        </div>

                                        {/* Nivel de normalización alcanzado */}
                                        <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-xl border text-xs">
                                            <span className="font-semibold text-foreground">Nivel de Normalización Detectado:</span>
                                            <Badge className="bg-indigo-600 text-white font-mono font-bold">
                                                {aiResult.normalizationLevelAchieved || "3FN"}
                                            </Badge>
                                        </div>

                                        {/* Diagnóstico Resumen */}
                                        {aiResult.summary && (
                                            <div className="p-3 bg-muted/20 rounded-xl border text-xs space-y-1">
                                                <span className="font-bold text-foreground block">Diagnóstico del Modelo & SQL:</span>
                                                <p className="text-muted-foreground leading-relaxed">{aiResult.summary}</p>
                                            </div>
                                        )}

                                        {/* Diagnóstico DML */}
                                        {aiResult.dmlStatus && (
                                            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-foreground flex items-center gap-1.5">
                                                        <Code2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                                        Auditoría DML & Manipulación:
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] font-mono",
                                                            aiResult.dmlStatus.allPassed
                                                                ? "text-emerald-600 border-emerald-300"
                                                                : "text-amber-600 border-amber-300"
                                                        )}
                                                    >
                                                        {aiResult.dmlStatus.allPassed ? "Correcto" : "Revisar"}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">{aiResult.dmlStatus.details}</p>
                                            </div>
                                        )}

                                        {/* Observaciones de Restricciones */}
                                        {aiResult.constraintsNotes && (
                                            <div className="p-3 bg-muted/20 rounded-xl border text-xs space-y-1">
                                                <span className="font-bold text-foreground block">Restricciones & Claves:</span>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">{aiResult.constraintsNotes}</p>
                                            </div>
                                        )}

                                        {/* Estado de entidades/tablas */}
                                        {Array.isArray(aiResult.entitiesStatus) && aiResult.entitiesStatus.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="text-xs font-bold text-foreground block">
                                                    Validación de Entidades y Tablas:
                                                </span>
                                                {aiResult.entitiesStatus.map((es: any, idx: number) => (
                                                    <div key={idx} className="p-2.5 rounded-xl border bg-background text-xs space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold font-mono text-indigo-600">{es.entityName}</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[9px] font-bold",
                                                                    es.status === "CORRECT" ? "text-emerald-600 border-emerald-300" :
                                                                    es.status === "WARNING" ? "text-amber-600 border-amber-300" : "text-rose-600 border-rose-300"
                                                                )}
                                                            >
                                                                {es.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground">{es.comment}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {aiResult.feedback && (
                                            <div className="rounded-xl border bg-background p-3">
                                                <FeedbackViewer feedback={aiResult.feedback} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                        <Bot className="h-8 w-8 text-indigo-600/40 animate-pulse" />
                                        <p className="text-xs font-semibold text-foreground">Aún no evaluado con IA</p>
                                        <p className="text-[11px] max-w-xs">
                                            Haz clic en el botón superior para que Gemini valide las Formas Normales (1FN, 2FN, 3FN), relaciones foráneas y restricciones DDL SQL.
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
                                            teacherObservationInput={teacherObservationInput}
                                            onSetTeacherObservationInput={setTeacherObservationInput}
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
