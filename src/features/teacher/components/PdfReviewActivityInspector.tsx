"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Sparkles, Users, Crown, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown,
    ExternalLink, Copy, Check, X, Clock,
    FileText, ClipboardList, Info, Loader2, Bot, ArrowRight, RotateCcw, CheckCircle,
    ListChecks, SlidersHorizontal, HelpCircle, Zap, UserCheck
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import { format } from "date-fns";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { improveFeedbackAction, gradePdfReviewAction } from "@/features/teacher/actions/gradingActions";
import {
    getActivityChecklistConfig,
    extractEvaluationMetadata,
    stripEvaluationMetadata,
    embedEvaluationMetadata,
    calculateChecklistScore,
    calculateCombinedFinalGrade,
    type EvaluationMetadata,
} from "@/features/teacher/utils/checklistGradingUtils";
import { GradingModeSelector } from "./GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { PdfChatInspector } from "./PdfChatInspector";
import { RUBRIC_LEVELS } from "./CodeProjectInspector";

interface PdfReviewActivityInspectorProps {
    student: any;
    submission: any;
    activity: any;
    evalItem?: any;
    onClose?: () => void;
    studentsList?: any[];
    onSelectStudent?: (studentId: string) => void;
    onGradeManual: (grade: string, feedback: string, studentId: string, activityId: string) => Promise<void>;
    onReject: (studentId: string, feedback?: string) => Promise<void>;
}

function getPdfEmbedUrl(url: string): string | null {
    if (!url) return null;
    try {
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }
        if (url.toLowerCase().split('?')[0].endsWith('.pdf')) {
            return url;
        }
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    } catch {
        return url;
    }
}

// Separar retroalimentación almacenada entre reporte IA y observaciones del profesor
function parseStoredFeedback(rawFeedback: string | null | undefined) {
    if (!rawFeedback) return { aiFeedback: "", teacherNotes: "" };
    const cleanRaw = stripEvaluationMetadata(rawFeedback).replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "");
    const marker = "### 👨‍🏫 Observaciones del Profesor";
    const dividerMarker = "---";

    if (cleanRaw.includes(marker)) {
        const parts = cleanRaw.split(marker);
        let aiPart = parts[0].trim();
        if (aiPart.endsWith(dividerMarker)) {
            aiPart = aiPart.slice(0, -dividerMarker.length).trim();
        }
        const teacherPart = parts.slice(1).join(marker).trim();
        return { aiFeedback: aiPart, teacherNotes: teacherPart };
    }

    // Si parece un reporte generado por IA (contiene encabezados típicos de rúbrica)
    if (cleanRaw.includes("Criterio") || cleanRaw.includes("Puntaje") || cleanRaw.includes("Evaluación") || cleanRaw.includes("Fortalezas")) {
        return { aiFeedback: cleanRaw, teacherNotes: "" };
    }

    return { aiFeedback: "", teacherNotes: cleanRaw };
}

export function PdfReviewActivityInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList = [],
    onSelectStudent,
    onGradeManual,
    onReject,
}: PdfReviewActivityInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";

    const parsed = useMemo(() => parseStoredFeedback(submission?.feedback), [submission?.feedback]);
    const storedMeta = useMemo(() => extractEvaluationMetadata(submission?.feedback), [submission?.feedback]);

    const [gradeInput, setGradeInput] = useState<string>(
        submission?.grade !== null && submission?.grade !== undefined
            ? String(submission.grade)
            : ""
    );
    const [teacherNotesInput, setTeacherNotesInput] = useState<string>(parsed.teacherNotes);
    const [aiFeedbackInput, setAiFeedbackInput] = useState<string>(parsed.aiFeedback);
    const [aiGrade, setAiGrade] = useState<number | null>(() => {
        if (storedMeta?.aiGrade !== undefined && storedMeta?.aiGrade !== null) {
            return Number(storedMeta.aiGrade);
        }
        return parsed.aiFeedback && submission?.grade !== null && submission?.grade !== undefined
            ? Number(submission.grade)
            : null;
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isImprovingAI, setIsImprovingAI] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("moderate");
    const [copiedLink, setCopiedLink] = useState(false);
    
    // Pestañas independientes para el visor izquierdo y el panel de evaluación derecho
    const [leftTab, setLeftTab] = useState<"pdf" | "statement" | "details">("pdf");
    const [rightTab, setRightTab] = useState<"ai_report" | "teacher_grade" | "chat_pdf">(
        parsed.aiFeedback ? "ai_report" : "teacher_grade"
    );

    // Extraer Lista de Chequeo, Criterios y Ponderaciones configuradas (por defecto: 30% IA / 70% Docente)
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const checklistData = checklistConfig?.criteria ?? null;
    const aiWeight = checklistConfig?.aiWeight ?? 30;
    const checklistWeight = checklistConfig?.checklistWeight ?? 70;

    const [criteriaLevels, setCriteriaLevels] = useState<Record<string, number | undefined>>(() => {
        return storedMeta?.criteriaLevels ?? {};
    });
    const [manualSustentacionScore, setManualSustentacionScore] = useState<number | null>(() => {
        return storedMeta?.manualSustentacionScore ?? null;
    });

    // Nota obtenida exclusivamente en la sustentación oral (0.0 - 5.0) de forma proporcional
    const checklistScore = useMemo(() => {
        return calculateChecklistScore(checklistData, criteriaLevels, manualSustentacionScore);
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Nota final combinada ponderada: (IA * aiWeight%) + (Sustentación * checklistWeight%)
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) return checklistScore;
        const aiScoreVal = aiGrade ?? (checklistConfig ? 0 : (submission?.grade !== null ? Number(submission?.grade) : 0));
        return calculateCombinedFinalGrade(aiScoreVal, checklistScore, aiWeight, checklistWeight);
    }, [checklistConfig, aiGrade, submission?.grade, aiWeight, checklistScore, checklistWeight]);

    // Sincronizar estado al cambiar de estudiante
    useEffect(() => {
        const nextParsed = parseStoredFeedback(submission?.feedback);
        const meta = extractEvaluationMetadata(submission?.feedback);
        setCriteriaLevels(meta?.criteriaLevels ?? {});
        setManualSustentacionScore(meta?.manualSustentacionScore ?? null);
        setGradeInput(
            submission?.grade !== null && submission?.grade !== undefined
                ? String(submission.grade)
                : ""
        );
        setTeacherNotesInput(
            nextParsed.teacherNotes || (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")
        );
        setAiFeedbackInput(nextParsed.aiFeedback);
        setAiGrade(
            meta?.aiGrade !== undefined && meta?.aiGrade !== null
                ? Number(meta.aiGrade)
                : (nextParsed.aiFeedback && !checklistConfig && submission?.grade !== null && submission?.grade !== undefined
                    ? Number(submission.grade)
                    : null)
        );
        setRightTab(nextParsed.aiFeedback ? "ai_report" : (checklistConfig ? "teacher_grade" : "ai_report"));
    }, [student?.id, submission?.id, submission?.feedback, submission?.grade, activity.deadline, checklistConfig]);

    // Sincronizar automáticamente gradeInput con la nota combinada en tiempo real cuando la sustentación esté activa
    useEffect(() => {
        if (checklistConfig) {
            setGradeInput(combinedFinalScore.toFixed(1));
        }
    }, [checklistConfig, combinedFinalScore]);

    // Si la calificación docente está deshabilitada y la pestaña activa era teacher_grade, redirigir
    useEffect(() => {
        if (!checklistConfig && rightTab === "teacher_grade") {
            setRightTab("ai_report");
        }
    }, [checklistConfig, rightTab]);

    // Navegación entre estudiantes (o líderes si es grupal)
    const currentIndex = studentsList.findIndex(s => s.student.id === student?.id);
    const totalStudents = studentsList.length;

    const handlePrev = () => {
        if (currentIndex > 0 && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex - 1].student.id);
        }
    };

    const handleNext = () => {
        if (currentIndex < totalStudents - 1 && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex + 1].student.id);
        }
    };

    const handleCopyUrl = async () => {
        if (!submission?.url) return;
        try {
            await navigator.clipboard.writeText(submission.url);
            setCopiedLink(true);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    };

    const handleGradeWithAI = async () => {
        if (!submission?.url) {
            toast.error("El estudiante no ha proporcionado un enlace de PDF.");
            return;
        }

        setIsEvaluatingAI(true);
        const toastId = toast.loading("Evaluando documento PDF con IA (Gemini)...");
        try {
            const result = await gradePdfReviewAction(
                activity.id,
                student.id,
                submission.url,
                activity.statement || "",
                activity.courseId,
                gradingMode
            );

            const rawAi = result.rawAiGrade ?? result.grade;
            setAiGrade(rawAi);
            setAiFeedbackInput(stripEvaluationMetadata(result.feedback));
            const finalCombined = checklistConfig
                ? calculateCombinedFinalGrade(rawAi, checklistScore, aiWeight, checklistWeight)
                : result.grade;
            setGradeInput(finalCombined.toFixed(1));
            setRightTab("ai_report");
            toast.success(`PDF evaluado con éxito: ${finalCombined.toFixed(1)} / 5.0 (IA: ${rawAi.toFixed(1)})`, { id: toastId });
        } catch (error: any) {
            toast.error("Error al evaluar el PDF con IA", { id: toastId, description: error.message });
        } finally {
            setIsEvaluatingAI(false);
        }
    };

    const handleAdoptAIGrade = () => {
        if (aiGrade !== null) {
            setGradeInput(aiGrade.toFixed(1));
        }
        setRightTab("teacher_grade");
        toast.success("Nota adoptada en la Evaluación Docente");
    };

    const handleImproveWithAI = async () => {
        if (!teacherNotesInput || teacherNotesInput.trim().length < 10) {
            toast.error("Escribe al menos 10 caracteres en la retroalimentación para mejorarla con IA.");
            return;
        }

        setIsImprovingAI(true);
        const toastId = toast.loading("Mejorando redacción con IA...");
        try {
            const improved = await improveFeedbackAction(teacherNotesInput);
            setTeacherNotesInput(improved);
            toast.success("Retroalimentación enriquecida exitosamente", { id: toastId });
        } catch (error: any) {
            toast.error("Error al mejorar con IA", { id: toastId, description: error.message });
        } finally {
            setIsImprovingAI(false);
        }
    };

    const handleSave = async (andNext: boolean = false) => {
        let gradeToSave = checklistConfig ? combinedFinalScore.toFixed(1) : gradeInput;
        if (!gradeToSave || isNaN(Number(gradeToSave))) {
            gradeToSave = combinedFinalScore.toFixed(1);
        }

        if (!gradeToSave || isNaN(Number(gradeToSave))) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }
        const numericGrade = Number(gradeToSave);
        if (numericGrade < 0 || numericGrade > 5) {
            toast.error("La nota debe estar en el rango de 0.0 a 5.0");
            return;
        }

        // Ensamblar feedback completo respetando el reporte IA y las notas docentes
        let finalFeedback = "";
        if (aiFeedbackInput && teacherNotesInput) {
            finalFeedback = `${aiFeedbackInput}\n\n---\n### 👨‍🏫 Observaciones del Profesor\n${teacherNotesInput}`;
        } else if (teacherNotesInput) {
            finalFeedback = teacherNotesInput;
        } else if (aiFeedbackInput) {
            finalFeedback = aiFeedbackInput;
        }

        if (checklistConfig) {
            finalFeedback = embedEvaluationMetadata(finalFeedback, {
                aiGrade: aiGrade,
                checklistScore: checklistScore,
                criteriaLevels: criteriaLevels as any,
                manualSustentacionScore: manualSustentacionScore,
                calculatedFinalGrade: numericGrade,
            });
        }

        setIsSaving(true);
        try {
            await onGradeManual(gradeToSave, finalFeedback, student.id, activity.id);
            toast.success("Calificación guardada correctamente");
            if (andNext && currentIndex < totalStudents - 1 && onSelectStudent) {
                onSelectStudent(studentsList[currentIndex + 1].student.id);
            }
        } catch (error: any) {
            toast.error("Error al guardar la calificación", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReject = async () => {
        setIsSaving(true);
        try {
            await onReject(student.id, teacherNotesInput || undefined);
            if (currentIndex < totalStudents - 1 && onSelectStudent) {
                onSelectStudent(studentsList[currentIndex + 1].student.id);
            }
        } catch (error: any) {
            toast.error("Error al rechazar entrega", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const currentGrade = submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade) : null;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const group = evalItem?.group;
    const isLeader = evalItem?.isLeader;
    const embedPdfUrl = submission?.url ? getPdfEmbedUrl(submission.url) : null;

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2.5 bg-card/80 backdrop-blur-xs gap-3 shrink-0">
                {/* Left: Navigation and Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Student switcher */}
                    {studentsList.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handlePrev}
                                disabled={currentIndex <= 0}
                                title="Estudiante anterior"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs text-muted-foreground tabular-nums px-1">
                                {currentIndex + 1} / {totalStudents}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleNext}
                                disabled={currentIndex >= totalStudents - 1}
                                title="Siguiente estudiante"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 font-bold text-sm tracking-tight gap-1 hover:bg-muted/80 max-w-[200px] sm:max-w-[280px]">
                                        <span className="truncate">{student ? formatName(student.name, student.profile) : "Estudiante"}</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-y-auto z-50">
                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                                        {activity?.isGroupActivity ? "Líderes de Grupo" : "Lista de Estudiantes"} ({studentsList.length})
                                    </div>
                                    {studentsList.map((item, idx) => {
                                        const isSelected = item.student.id === student?.id;
                                        const subGrade = item.submission?.grade;
                                        const statusText = item.status === 'graded'
                                            ? `${subGrade !== null && subGrade !== undefined ? subGrade.toFixed(1) : '-'}/5.0`
                                            : item.status === 'submitted'
                                            ? 'Entregado'
                                            : 'Pendiente';

                                        return (
                                            <DropdownMenuItem
                                                key={item.student.id}
                                                onClick={() => onSelectStudent && onSelectStudent(item.student.id)}
                                                className={`flex items-center justify-between text-xs cursor-pointer py-1.5 ${
                                                    isSelected ? "bg-primary/10 font-bold text-primary" : ""
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                                                    <span className="truncate">{formatName(item.student.name, item.student.profile)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                    {item.group && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold">
                                                            {item.group.name}
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant={item.status === 'graded' ? "secondary" : "outline"}
                                                        className={`text-[9px] px-1.5 py-0 h-4 font-mono shrink-0 ${
                                                            item.status === 'graded' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold" : "opacity-60"
                                                        }`}
                                                    >
                                                        {statusText}
                                                    </Badge>
                                                </div>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Activity title & Badge */}
                    <div className="hidden lg:flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground truncate">
                            • {activity.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-primary/10 text-primary border-primary/30 uppercase tracking-wider shrink-0">
                            <FileText className="h-3 w-3" /> Revisión PDF
                        </Badge>
                        {activity.isGroupActivity && (
                            <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 uppercase tracking-wider shrink-0">
                                <Users className="h-3 w-3" /> Grupal
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Right: Submission Links, Grade Pill & Close */}
                <div className="flex items-center gap-2 shrink-0">

                    {submission?.url && (
                        <div className="flex items-center gap-1">
                            <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 shrink-0"
                                title="Abrir PDF en nueva pestaña"
                            >
                                <a href={submission.url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Ver PDF</span>
                                </a>
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={handleCopyUrl}
                                title="Copiar enlace"
                            >
                                {copiedLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                        </div>
                    )}

                    {checklistConfig ? (
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap animate-in fade-in">
                            {/* Nota IA con porcentaje */}
                            <div 
                                className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Evaluación IA: ${(aiGrade || 0).toFixed(1)} / 5.0 (${aiWeight}% de la nota final)`}
                            >
                                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">IA</span>
                                <span className="text-[10px] font-mono opacity-80">({aiWeight}%):</span>
                                <span className="text-xs font-black font-mono">{(aiGrade || 0).toFixed(1)}</span>
                            </div>

                            {/* Nota Docente / Sustentación con porcentaje */}
                            <div 
                                className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Sustentación Docente: ${checklistScore.toFixed(1)} / 5.0 (${checklistWeight}% de la nota final)`}
                            >
                                <UserCheck className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">Docente</span>
                                <span className="text-[10px] font-mono opacity-80">({checklistWeight}%):</span>
                                <span className="text-xs font-black font-mono">{checklistScore.toFixed(1)}</span>
                            </div>

                            {/* Nota Final Ponderada */}
                            <div 
                                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Nota Final Ponderada: ${combinedFinalScore.toFixed(1)} / 5.0`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Final:</span>
                                <span className="text-sm font-black font-mono">{combinedFinalScore.toFixed(1)}</span>
                                <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                            </div>
                        </div>
                    ) : currentGrade !== null ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold animate-in fade-in">
                            <span className="text-[10px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-sm font-black">{currentGrade.toFixed(1)}</span>
                            <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : isRejected ? (
                        <Badge className="bg-rose-600 text-white border-transparent text-xs py-0.5 px-2">
                            Rechazado
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs py-0.5 px-2 text-amber-600 border-amber-500/30 bg-amber-500/5">
                            Sin calificar
                        </Badge>
                    )}

                    {onClose && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                            className="h-7 px-2.5 text-xs gap-1 font-bold ml-1"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Split-Screen Inspector Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
                
                {/* Left Panel: PDF Viewer, Statement & Delivery Details */}
                <div className="lg:col-span-6 flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden min-h-0">
                    <div className="border-b px-4 py-2 bg-muted/30 flex items-center justify-between shrink-0">
                        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)} className="w-auto">
                            <TabsList className="h-7 p-0.5 bg-background border">
                                <TabsTrigger value="pdf" className="h-6 text-xs px-2.5 gap-1.5">
                                    <FileText className="h-3 w-3" />
                                    Visor de PDF
                                </TabsTrigger>
                                <TabsTrigger value="statement" className="h-6 text-xs px-2.5 gap-1.5">
                                    <ClipboardList className="h-3 w-3" />
                                    Enunciado
                                </TabsTrigger>
                                <TabsTrigger value="details" className="h-6 text-xs px-2.5 gap-1.5">
                                    <Info className="h-3 w-3" />
                                    Detalles
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {group && (
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-bold">
                                {isLeader ? <Crown className="h-3 w-3 fill-amber-500" /> : <Users className="h-3 w-3" />}
                                {group.name} {isLeader && "(Líder)"}
                            </Badge>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        {leftTab === "pdf" && (
                            <div className="flex-1 flex flex-col h-full overflow-hidden p-2">
                                {embedPdfUrl ? (
                                    <div className="flex-1 relative w-full h-full rounded-lg overflow-hidden border bg-muted/20">
                                        <iframe
                                            src={embedPdfUrl}
                                            className="w-full h-full border-0"
                                            title="Documento PDF del estudiante"
                                            allow="autoplay"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg border border-dashed gap-3">
                                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                                        <p className="text-sm font-semibold text-muted-foreground">
                                            No se ha registrado ningún enlace o documento PDF para este estudiante.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {leftTab === "statement" && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                                    Enunciado y Criterios de Evaluación
                                </div>
                                <div
                                    data-color-mode={mode}
                                    className="rounded-lg border p-4 bg-muted/20 text-xs sm:text-sm leading-relaxed max-w-full overflow-x-auto [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word!"
                                >
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No se ha configurado un enunciado para esta actividad.**"}
                                        style={{ background: 'transparent' }}
                                    />
                                </div>
                            </div>
                        )}

                        {leftTab === "details" && (
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Student Profile Card */}
                                <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                        Información del Estudiante
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Nombre:</span>
                                            <p className="font-semibold text-foreground mt-0.5">{formatName(student.name, student.profile)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Email:</span>
                                            <p className="font-semibold text-foreground mt-0.5">{student.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Resource URL Card */}
                                <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5 text-primary" />
                                        Enlace del Documento PDF
                                    </h4>
                                    {submission?.url ? (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-background rounded-lg border gap-2">
                                            <a
                                                href={submission.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 min-w-0"
                                            >
                                                {submission.url}
                                            </a>
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="default"
                                                className="h-7 px-3 text-xs gap-1.5 font-bold shrink-0"
                                            >
                                                <a href={submission.url} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Abrir en nueva pestaña
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground italic text-center">
                                            El estudiante aún no ha registrado una entrega.
                                        </div>
                                    )}

                                    {submission && (
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Fecha: {format(new Date(submission.lastSubmittedAt || submission.createdAt), "PP p")}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <span>Intentos: <strong>{submission.attemptCount}</strong> de {activity.maxAttempts}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Group members section if group activity */}
                                {activity.isGroupActivity && group && (
                                    <div className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                                Integrantes del Grupo ({group.name})
                                            </h4>
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                                                {group.members?.length || 1} miembros
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            La calificación y retroalimentación guardada aquí se aplicará automáticamente a todos los integrantes:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                            {group.members?.map((m: any) => {
                                                const memberUser = m.user || m;
                                                const isThisLeader = m.isLeader || group.leaderId === memberUser.id;
                                                return (
                                                    <div key={memberUser.id} className="flex items-center gap-1.5 text-xs bg-background/80 p-1.5 rounded border">
                                                        {isThisLeader ? (
                                                            <Crown className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                                                        ) : (
                                                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className="font-medium truncate">{formatName(memberUser.name, memberUser.profile)}</span>
                                                        {isThisLeader && <span className="text-[9px] text-amber-600 font-bold ml-auto">(Líder)</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Dedicated Tabs for AI Evaluation Report & Teacher Evaluation */}
                <div className="lg:col-span-6 flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden min-h-0">
                    <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                        {/* Header Tabs: Evaluación IA vs Evaluación Docente */}
                        <div className="border-b px-4 py-2 bg-muted/30 flex items-center justify-between shrink-0">
                            <TabsList className="h-8 p-0.5 bg-background border">
                                <TabsTrigger value="ai_report" className="h-7 text-xs px-3 gap-1.5 font-semibold data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    <span>Evaluación IA</span>
                                    {aiGrade !== null && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold ml-1">
                                            {aiGrade.toFixed(1)}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                {checklistConfig && (
                                    <TabsTrigger value="teacher_grade" className="h-7 text-xs px-3 gap-1.5 font-semibold data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Evaluación Docente</span>
                                        {gradeInput && !isNaN(Number(gradeInput)) && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold ml-1">
                                                {Number(gradeInput).toFixed(1)}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="chat_pdf" className="h-7 text-xs px-3 gap-1.5 font-semibold data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-400">
                                    <Bot className="h-3.5 w-3.5 text-sky-600" />
                                    <span>Inspector / Chat IA</span>
                                </TabsTrigger>
                            </TabsList>

                            {currentGrade !== null && (
                                <span className="text-xs text-muted-foreground font-mono">
                                    Actual: <strong className="text-foreground">{currentGrade.toFixed(1)} / 5.0</strong>
                                </span>
                            )}
                        </div>

                        {/* TAB 1: Evaluación IA (Gemini Report) */}
                        <TabsContent value="ai_report" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
                            {/* Toolbar interna de la pestaña Evaluación IA */}
                            <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                                <div className="flex items-center gap-2">
                                    <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleGradeWithAI}
                                        disabled={!submission?.url || isEvaluatingAI}
                                        variant="default"
                                        className="h-8 px-3 text-xs gap-1.5 font-bold shadow-xs transition-all"
                                        title="Evaluar el documento PDF con IA según el enunciado"
                                    >
                                        {isEvaluatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                                        <span>{aiFeedbackInput ? "Reevaluar con IA" : "Evaluar con IA"}</span>
                                    </Button>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono shrink-0">
                                        Solo Lectura
                                    </Badge>

                                    {aiGrade !== null && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAdoptAIGrade}
                                            className="h-8 text-xs font-bold gap-1 text-purple-700 dark:text-purple-300 bg-purple-500/5 hover:bg-purple-500/15 border-purple-500/30 shadow-2xs"
                                            title="Copiar nota y cambiar a Evaluación Docente"
                                        >
                                            <span>Adoptar Nota ({aiGrade.toFixed(1)})</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                {isEvaluatingAI ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-foreground">Analizando documento con IA...</p>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Descargando el PDF y evaluando los criterios del enunciado con Gemini.
                                            </p>
                                        </div>
                                    </div>
                                ) : aiFeedbackInput ? (
                                    <div className="space-y-4">
                                        {aiGrade !== null && (
                                            <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                                                        Calificación Sugerida por la IA:
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono font-black text-lg text-purple-700 dark:text-purple-400">
                                                    <span>{aiGrade.toFixed(1)}</span>
                                                    <span className="text-xs font-bold opacity-75">/ 5.0</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-lg border bg-background/50 p-4">
                                            <FeedbackViewer feedback={aiFeedbackInput} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                        <Sparkles className="h-10 w-10 text-purple-600/40 animate-pulse" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                Aún no se ha realizado la evaluación con IA
                                            </p>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Puedes analizar el PDF automáticamente contra los criterios del enunciado con un solo clic.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleGradeWithAI}
                                            disabled={!submission?.url || isEvaluatingAI}
                                            variant="default"
                                            className="font-bold gap-2 text-xs shadow-xs"
                                        >
                                            <Bot className="h-4 w-4" />
                                            <span>Iniciar Evaluación con IA (Gemini)</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* TAB 2: Panel de Calificación Docente y Feedback (si está configurada) */}
                        {checklistConfig && (
                        <TabsContent value="teacher_grade" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Sección Lista de Chequeo / Sustentación Docente (si está configurada) */}
                                {checklistConfig && checklistData && checklistData.length > 0 && (
                                    <div className="p-4 rounded-xl border border-primary/20 bg-muted/20 space-y-4 shadow-2xs">
                                        {/* Header de Sustentación */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <ListChecks className="h-4 w-4 text-primary" />
                                                    <span className="text-xs font-bold text-foreground">
                                                        Lista de Chequeo / Sustentación Docente
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                                                        {checklistData.length} criterios
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Evalúa cada criterio oralmente. La nota se ponderará: {checklistWeight}% Sustentación + {aiWeight}% Evaluación IA.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <span className="text-[10px] text-muted-foreground block">Nota Sustentación:</span>
                                                    <span className="text-xs font-bold font-mono text-primary">
                                                        {checklistScore.toFixed(1)} / 5.0
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setManualSustentacionScore(null);
                                                        setCriteriaLevels({});
                                                    }}
                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                                >
                                                    Limpiar
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Criterios interactivos */}
                                        <div className="space-y-3">
                                            {checklistData.map((crit: any, idx: number) => {
                                                const currentFactor = criteriaLevels[crit.id];
                                                const hasValue = typeof currentFactor === "number";
                                                const earnedWeight = hasValue ? (Number(crit.percentage) || 0) * currentFactor : 0;

                                                return (
                                                    <div 
                                                        key={crit.id || idx}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all space-y-2.5",
                                                            currentFactor === 1.0 
                                                                ? "bg-emerald-500/[0.07] border-emerald-500/35" 
                                                                : currentFactor === 0.75 
                                                                ? "bg-blue-500/[0.07] border-blue-500/35" 
                                                                : currentFactor === 0.5 
                                                                ? "bg-amber-500/[0.07] border-amber-500/35" 
                                                                : currentFactor === 0.0 
                                                                ? "bg-rose-500/[0.07] border-rose-500/35" 
                                                                : "bg-card border-border/70"
                                                        )}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                                                <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0 bg-primary/5 text-primary border-primary/20">
                                                                    #{idx + 1}
                                                                </Badge>
                                                                <span className="font-bold text-xs text-foreground">
                                                                    {crit.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {hasValue && (
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={cn(
                                                                            "text-[10px] font-mono font-bold",
                                                                            currentFactor === 1.0
                                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                                : currentFactor === 0.75
                                                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                                                : currentFactor === 0.5
                                                                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                                                        )}
                                                                    >
                                                                        +{earnedWeight.toFixed(1)}% / {crit.percentage}%
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                                                                    Peso: {crit.percentage}%
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {/* 4 Niveles Proporcionales: Sabe, Aceptable, Parcial, No Sabe */}
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                            {RUBRIC_LEVELS.map((lvl) => {
                                                                const isSelected = currentFactor === lvl.factor;
                                                                return (
                                                                    <button
                                                                        key={lvl.key}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setManualSustentacionScore(null);
                                                                            const nextLevels: Record<string, number | undefined> = {
                                                                                ...criteriaLevels,
                                                                                [crit.id]: isSelected ? undefined : lvl.factor
                                                                            };
                                                                            setCriteriaLevels(nextLevels);
                                                                            
                                                                            // Calcular nueva nota ponderada y actualizar gradeInput
                                                                            const nextEarned = checklistData.reduce((acc: number, c: any) => {
                                                                                const f = nextLevels[c.id];
                                                                                if (typeof f !== "number") return acc;
                                                                                return acc + ((Number(c.percentage) || 0) * f);
                                                                            }, 0);
                                                                            const nextChecklist = Math.min(5.0, Math.max(0.0, (nextEarned / 100) * 5.0));
                                                                            const aiScore = aiGrade || 0;
                                                                            const nextCombined = Math.min(5.0, Math.max(0.0, (aiScore * (aiWeight / 100)) + (nextChecklist * (checklistWeight / 100))));
                                                                            setGradeInput(nextCombined.toFixed(1));
                                                                        }}
                                                                        className={cn(
                                                                            "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                                                            isSelected
                                                                                ? lvl.key === "sabe"
                                                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                                                    : lvl.key === "aceptable"
                                                                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                                                    : lvl.key === "parcial"
                                                                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                                                                    : "bg-rose-600 text-white border-rose-600 shadow-xs"
                                                                                : lvl.key === "sabe"
                                                                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                                                                : lvl.key === "aceptable"
                                                                                ? "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                                                                                : lvl.key === "parcial"
                                                                                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                                                                                : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                                                                        )}
                                                                        title={`${lvl.label} (${lvl.pct}) - Aporta ${((Number(crit.percentage) || 0) * lvl.factor).toFixed(1)}%`}
                                                                    >
                                                                        <lvl.icon className="h-3.5 w-3.5" />
                                                                        <span>{lvl.label}</span>
                                                                        <span className="text-[10px] opacity-80">({lvl.pct})</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {crit.question && (
                                                            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-1">
                                                                <div className="font-semibold text-primary flex items-center gap-1">
                                                                    <HelpCircle className="h-3 w-3" />
                                                                    Pregunta de sustentación:
                                                                </div>
                                                                <p className="text-foreground leading-snug">{crit.question}</p>
                                                            </div>
                                                        )}

                                                        {crit.expectedAnswer && (
                                                            <div className="text-[11px] text-muted-foreground bg-emerald-500/5 p-2 rounded-lg space-y-0.5 border border-emerald-500/10">
                                                                <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Respuesta esperada / Qué verificar:
                                                                </div>
                                                                <p className="text-foreground/90 leading-snug">{crit.expectedAnswer}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Barra de Distribución y Fórmula Ponderada */}
                                        <div className="p-3 rounded-lg border bg-background space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                    <div className="flex flex-col text-right">
                                                        <span className="font-bold text-xs font-mono text-emerald-700 dark:text-emerald-300">
                                                            Nota Ponderada: {combinedFinalScore.toFixed(1)} / 5.0
                                                        </span>
                                                        <span className="font-mono text-muted-foreground text-[10px]">
                                                            (IA {aiWeight}%: {(aiGrade || 0).toFixed(1)}) + (Docente {checklistWeight}%: {checklistScore.toFixed(1)})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                                <div 
                                                    style={{ width: `${aiWeight}%` }} 
                                                    className="bg-purple-500 transition-all duration-300" 
                                                    title={`IA: ${aiWeight}%`}
                                                />
                                                <div 
                                                    style={{ width: `${checklistWeight}%` }} 
                                                    className="bg-blue-500 transition-all duration-300" 
                                                    title={`Docente: ${checklistWeight}%`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grade Input Section */}
                                <div className="space-y-2">
                                    <Label htmlFor="grade-input" className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                                        <span>Nota Final (0.0 a 5.0)</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">Escala 0.0 - 5.0</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="grade-input"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            placeholder="4.5"
                                            value={gradeInput}
                                            onChange={(e) => setGradeInput(e.target.value)}
                                            className="h-10 text-lg font-bold font-mono tracking-tight text-primary w-28 text-center bg-background border-primary/30 focus-visible:ring-primary"
                                        />
                                        <div className="flex flex-wrap items-center gap-1 flex-1">
                                            {["5.0", "4.5", "4.0", "3.5", "3.0", "0.0"].map((quickGrade) => (
                                                <Button
                                                    key={quickGrade}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setGradeInput(quickGrade)}
                                                    className={`h-7 px-2 text-xs font-bold transition-all ${
                                                        gradeInput === quickGrade
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "hover:bg-primary/10 hover:text-primary"
                                                    }`}
                                                >
                                                    {quickGrade}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Observaciones Docente / Feedback Section */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="feedback-input" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                            Observaciones y Retroalimentación Docente
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleImproveWithAI}
                                            disabled={isImprovingAI || !teacherNotesInput.trim()}
                                            className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 gap-1 px-2 font-semibold"
                                        >
                                            {isImprovingAI ? <Sparkles className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                            <span>Mejorar con IA</span>
                                        </Button>
                                    </div>
                                    <Textarea
                                        id="feedback-input"
                                        rows={7}
                                        placeholder="Escribe observaciones personalizadas, fortalezas o sugerencias de mejora para el documento entregado..."
                                        value={teacherNotesInput}
                                        onChange={(e) => setTeacherNotesInput(e.target.value)}
                                        className="text-xs leading-relaxed bg-background resize-none border-border/80 focus-visible:ring-primary"
                                    />
                                    {/* Fast Feedback Templates */}
                                    <div className="flex flex-wrap items-center gap-1 pt-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Rápidas:</span>
                                        {[
                                            "Excelente documento, estructura clara y responde a la rúbrica.",
                                            "Buen informe, pero se recomienda profundizar en las conclusiones.",
                                            "El documento está incompleto según los criterios establecidos.",
                                        ].map((template, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setTeacherNotesInput(prev => prev ? `${prev}\n\n${template}` : template)}
                                                className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors truncate max-w-[200px]"
                                                title={template}
                                            >
                                                + {template}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activity.isGroupActivity && (
                                    <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                        <p className="leading-relaxed">
                                            <strong>Actividad Grupal:</strong> Al guardar la calificación se actualizará la misma nota ({gradeInput || "0.0"}) y comentarios para todos los integrantes del grupo automáticamente.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Actions Bar */}
                            <div className="border-t p-4 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {submission && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleReject}
                                            disabled={isSaving}
                                            className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 font-semibold"
                                        >
                                            Rechazar Entrega
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleSave(false)}
                                        disabled={isSaving}
                                        className="h-9 px-4 text-xs font-bold shadow-xs"
                                    >
                                        {isSaving ? "Guardando..." : (
                                            checklistConfig 
                                                ? (submission?.grade !== null && submission?.grade !== undefined 
                                                    ? `Actualizar Nota (${combinedFinalScore.toFixed(1)})` 
                                                    : `Guardar Nota (${combinedFinalScore.toFixed(1)})`)
                                                : (submission?.grade !== null && submission?.grade !== undefined 
                                                    ? "Actualizar Nota" 
                                                    : "Guardar Nota")
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleSave(true)}
                                        disabled={isSaving}
                                        className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {isSaving ? "Guardando..." : "Guardar y Siguiente"}
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                        )}

                        {/* TAB 3: Inspector / Chat Interactivo con PDF (Gemini) */}
                        <TabsContent value="chat_pdf" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
                            <PdfChatInspector
                                pdfUrl={submission?.url || ""}
                                studentName={student ? formatName(student.name, student.profile) : undefined}
                                activityId={activity?.id}
                                studentId={student?.id}
                                statement={activity?.statement || ""}
                                onInsertObservation={(text) => {
                                    setTeacherNotesInput(prev => prev ? `${prev}\n\n${text}` : text);
                                    setRightTab("teacher_grade");
                                }}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

            </div>
        </div>
    );
}
