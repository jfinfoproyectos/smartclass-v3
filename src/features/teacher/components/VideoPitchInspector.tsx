"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Sparkles, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown,
    Video, Check,
    FileText, Loader2, Bot,
    AlertCircle, XCircle, ExternalLink, UserCheck, Award
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import { gradeVideoPitchAction } from "@/features/teacher/actions/gradingActions";
import { GradingModeSelector } from "./GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { TeacherEvaluationHeaderBadges } from "./TeacherEvaluationHeaderBadges";
import { TeacherChecklistEvaluationPanel } from "./TeacherChecklistEvaluationPanel";
import {
    getActivityChecklistConfig,
    extractEvaluationMetadata,
    stripEvaluationMetadata,
    embedEvaluationMetadata,
    calculateChecklistScore,
    calculateCombinedFinalGrade,
    ActivityChecklistConfig,
    ChecklistCriterion,
    EvaluationMetadata
} from "@/features/teacher/utils/checklistGradingUtils";

interface VideoPitchInspectorProps {
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

function getEmbedUrl(rawUrl: string): { embedUrl: string | null; type: "youtube" | "loom" | "drive" | "video" | "link" } {
    if (!rawUrl) return { embedUrl: null, type: "link" };
    const url = rawUrl.trim();

    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
        return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, type: "youtube" };
    }

    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch && loomMatch[1]) {
        return { embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`, type: "loom" };
    }

    const driveMatch = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch && driveMatch[1]) {
        return { embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, type: "drive" };
    }

    if (/\.(mp4|webm|ogg)($|\?)/i.test(url)) {
        return { embedUrl: url, type: "video" };
    }

    return { embedUrl: url, type: "link" };
}

// Separar feedback guardado en parte IA, observaciones profesor y justificación
function parseInitialFeedback(rawFeedback: string | null | undefined) {
    if (!rawFeedback) return { aiFeedback: "", teacherNotes: "", teacherObservation: "" };
    const cleanRaw = stripEvaluationMetadata(rawFeedback).replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "");
    const teacherMarker = "### 👨‍🏫 Observaciones del Profesor";
    const altTeacherMarker = "### Observaciones del Profesor";
    const obsMarker = "> 📝 **Justificación del Ajuste de Nota (Profesor):**";
    const dividerMarker = "---";

    let aiPart = cleanRaw;
    let teacherPart = "";
    let observationPart = "";

    if (aiPart.includes(obsMarker)) {
        const obsSplit = aiPart.split(obsMarker);
        aiPart = obsSplit[0].trim();
        const obsRest = obsSplit[1] || "";
        observationPart = obsRest.split("\n")[0].trim();
        if (aiPart.endsWith(dividerMarker)) {
            aiPart = aiPart.slice(0, -dividerMarker.length).trim();
        }
    }

    const activeMarker = aiPart.includes(teacherMarker) ? teacherMarker : (aiPart.includes(altTeacherMarker) ? altTeacherMarker : null);
    if (activeMarker) {
        const parts = aiPart.split(activeMarker);
        aiPart = parts[0].trim();
        if (aiPart.endsWith(dividerMarker)) {
            aiPart = aiPart.slice(0, -dividerMarker.length).trim();
        }
        teacherPart = parts.slice(1).join(activeMarker).trim();
    }

    return { aiFeedback: aiPart, teacherNotes: teacherPart, teacherObservation: observationPart };
}

export function VideoPitchInspector({
    student,
    submission,
    activity,
    onClose,
    studentsList,
    onSelectStudent,
    onGradeManual,
    onReject,
}: VideoPitchInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";

    // Configuración del pitch
    const pitchConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.pitchConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    // Rúbrica / Lista de Chequeo solo si está habilitada explícitamente en la actividad
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity);
    }, [activity]);

    const isTeacherGradingEnabled = Boolean(checklistConfig);
    const checklistData = checklistConfig?.criteria ?? null;
    const aiWeight = checklistConfig?.aiWeight ?? 40;
    const checklistWeight = checklistConfig?.checklistWeight ?? 60;

    // Extraer entrega del estudiante
    const submissionData = useMemo(() => {
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

    const videoUrl = submissionData.videoUrl;
    const studentNotes = submissionData.notes;
    const embedInfo = useMemo(() => getEmbedUrl(videoUrl), [videoUrl]);

    // Estados de evaluación
    const [criteriaLevels, setCriteriaLevels] = useState<Record<string, number | undefined>>({});
    const [manualSustentacionScore, setManualSustentacionScore] = useState<number | null>(null);
    const [gradeInput, setGradeInput] = useState<string>("");
    const [teacherNotesInput, setTeacherNotesInput] = useState<string>("");
    const [teacherObservationInput, setTeacherObservationInput] = useState<string>("");
    const [aiFeedbackInput, setAiFeedbackInput] = useState<string>("");
    const [aiGrade, setAiGrade] = useState<number | null>(null);
    const [aiResult, setAiResult] = useState<any>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("moderate");

    // Pestañas
    const [leftTab, setLeftTab] = useState<"video" | "statement">("video");
    const [rightTab, setRightTab] = useState<"ai_eval" | "teacher_grade">("ai_eval");

    // Sincronizar al cambiar de estudiante o cargar entrega existente
    useEffect(() => {
        const { aiFeedback, teacherNotes, teacherObservation } = parseInitialFeedback(submission?.feedback);
        const meta = extractEvaluationMetadata(submission?.feedback);

        setCriteriaLevels(meta?.criteriaLevels || {});
        setManualSustentacionScore(meta?.manualSustentacionScore ?? null);

        const currentAi = meta?.aiGrade !== undefined && meta?.aiGrade !== null
            ? meta.aiGrade
            : (submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade) : null);

        setAiGrade(currentAi);
        setAiResult(null);
        setAiFeedbackInput(aiFeedback);
        setTeacherNotesInput(teacherNotes);
        setTeacherObservationInput(teacherObservation);

        if (meta?.calculatedFinalGrade !== undefined && meta?.calculatedFinalGrade !== null) {
            setGradeInput(meta.calculatedFinalGrade.toFixed(1));
        } else if (submission?.grade !== null && submission?.grade !== undefined) {
            setGradeInput(Number(submission.grade).toFixed(1));
        } else {
            setGradeInput("");
        }
    }, [submission?.id, student?.id, submission?.feedback, submission?.grade]);

    // Nota de sustentación oral
    const checklistScore = useMemo(() => {
        return calculateChecklistScore(checklistData, criteriaLevels, manualSustentacionScore);
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Redirigir si la calificación docente está deshabilitada y la pestaña activa era teacher_grade
    useEffect(() => {
        if (!isTeacherGradingEnabled && rightTab === "teacher_grade") {
            setRightTab("ai_eval");
        }
    }, [isTeacherGradingEnabled, rightTab]);

    // Nota final combinada ponderada (o nota directa de IA/manual si no hay checklist)
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) {
            return aiGrade ?? (submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade) : 0);
        }
        const aiScoreVal = typeof aiGrade === "number" ? aiGrade : 0;
        return calculateCombinedFinalGrade(aiScoreVal, checklistScore, aiWeight, checklistWeight);
    }, [checklistConfig, aiGrade, checklistScore, aiWeight, checklistWeight, submission?.grade]);

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

    // Navegación entre estudiantes
    const currentIndex = useMemo(() => {
        if (!studentsList || !student) return -1;
        return studentsList.findIndex((item) => item.student.id === student.id);
    }, [studentsList, student]);

    const hasPrev = currentIndex > 0;
    const hasNext = studentsList && currentIndex >= 0 && currentIndex < studentsList.length - 1;

    // Evaluación con IA Multimodal (Gemini)
    const handleGradeWithAI = async () => {
        if (!videoUrl) {
            toast.error("El estudiante no ha proporcionado enlace al video.");
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const result = await gradeVideoPitchAction(
                activity.id,
                student.id,
                videoUrl,
                activity.statement || "",
                activity.courseId,
                studentNotes,
                pitchConfig || undefined,
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

            // Guardar automáticamente la nota al evaluar con IA
            let finalFeedback = result.feedback || "";
            if (checklistConfig) {
                const metadata: EvaluationMetadata = {
                    aiGrade: result.grade,
                    checklistScore: checklistScore,
                    criteriaLevels: criteriaLevels,
                    manualSustentacionScore: manualSustentacionScore,
                    calculatedFinalGrade: finalCombined,
                    updatedAt: new Date().toISOString(),
                };
                finalFeedback = embedEvaluationMetadata(finalFeedback, metadata);
            }
            await onGradeManual(finalCombined.toFixed(1), finalFeedback, student.id, activity.id);

            if (checklistConfig) {
                toast.success(`✓ Evaluación multimodal completada y guardada (${result.grade.toFixed(1)}). Nota ponderada: ${finalCombined.toFixed(1)}`);
            } else {
                toast.success(`✓ Evaluación multimodal completada y guardada: ${result.grade.toFixed(1)}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar con IA.");
        } finally {
            setIsEvaluatingAI(false);
        }
    };

    // Guardar calificación manual
    const handleSaveGrade = async () => {
        let gradeToSave = gradeInput;
        if (!gradeToSave || isNaN(parseFloat(gradeToSave))) {
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
            let finalFeedback = "";

            if (aiFeedbackInput.trim()) {
                finalFeedback += aiFeedbackInput.trim();
            }

            if (teacherNotesInput.trim()) {
                if (finalFeedback) {
                    finalFeedback += `\n\n---\n\n### 👨‍🏫 Observaciones del Profesor\n\n${teacherNotesInput.trim()}`;
                } else {
                    finalFeedback = `### 👨‍🏫 Observaciones del Profesor\n\n${teacherNotesInput.trim()}`;
                }
            }

            if (
                aiGrade !== null &&
                aiGrade !== undefined &&
                !isNaN(parsedGrade) &&
                parsedGrade !== aiGrade &&
                teacherObservationInput.trim()
            ) {
                finalFeedback += `\n\n---\n\n> 📝 **Justificación del Ajuste de Nota (Profesor):**\n> ${teacherObservationInput.trim()} *(Nota IA: ${aiGrade.toFixed(1)} → Nota Definitiva: ${parsedGrade.toFixed(1)})*`;
            }

            if (checklistConfig) {
                const metadata: EvaluationMetadata = {
                    aiGrade: aiGrade ?? 0,
                    checklistScore: checklistScore,
                    criteriaLevels: criteriaLevels,
                    manualSustentacionScore: manualSustentacionScore,
                    calculatedFinalGrade: parsedGrade,
                    updatedAt: new Date().toISOString(),
                };
                finalFeedback = embedEvaluationMetadata(finalFeedback, metadata);
            }

            await onGradeManual(gradeToSave, finalFeedback, student.id, activity.id);
            toast.success("✓ Calificación guardada exitosamente");
        } catch (err: any) {
            toast.error(err.message || "Error al guardar la calificación");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
            {/* Header Inspector idéntico al de Actividades GitHub */}
            <div className="flex items-center justify-between p-2.5 sm:px-4 border-b bg-muted/40 shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs gap-1 shrink-0">
                        <ChevronLeft className="h-4 w-4" /> Volver
                    </Button>
                    <Separator orientation="vertical" className="h-4 shrink-0" />
                    
                    <Badge variant="outline" className="text-[10px] font-bold gap-1 shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300">
                        <Video className="h-3 w-3" />
                        <span>Pitch</span>
                    </Badge>

                    {/* Selector de estudiante con Dropdown y Navegación */}
                    {studentsList && studentsList.length > 1 ? (
                        <div className="flex items-center gap-1 min-w-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-card-foreground tracking-tight hover:text-primary transition-colors cursor-pointer text-left truncate max-w-[180px] sm:max-w-[280px]"
                                        title="Clic para cambiar de estudiante"
                                    >
                                        <span className="truncate">{student ? formatName(student.name, student.profile) : "Estudiante"}</span>
                                        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                                    <DropdownMenuLabel className="text-[11px] text-muted-foreground font-semibold">
                                        Estudiantes con entrega ({studentsList.length})
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {studentsList.map((item, idx) => {
                                        const isSelected = item.student.id === student?.id;
                                        const isGraded = item.submission?.grade !== null && item.submission?.grade !== undefined;
                                        return (
                                            <DropdownMenuItem
                                                key={item.student.id}
                                                onClick={() => onSelectStudent && onSelectStudent(item.student.id)}
                                                className={cn(
                                                    "flex items-center justify-between text-xs cursor-pointer py-1.5",
                                                    isSelected && "bg-primary/10 font-bold text-primary"
                                                )}
                                            >
                                                <span className="truncate">{idx + 1}. {formatName(item.student.name, item.student.profile)}</span>
                                                <Badge
                                                    variant={isGraded ? "secondary" : "outline"}
                                                    className={cn(
                                                        "text-[9px] px-1 py-0 h-4 font-mono shrink-0 ml-1",
                                                        isGraded ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold" : "opacity-60"
                                                    )}
                                                >
                                                    {isGraded ? `${Number(item.submission.grade).toFixed(1)}` : "Sin calificar"}
                                                </Badge>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Flechas de anterior / siguiente */}
                            <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!hasPrev}
                                    onClick={() => hasPrev && onSelectStudent && onSelectStudent(studentsList[currentIndex - 1].student.id)}
                                    className="h-6 w-6 p-0 shrink-0"
                                    title="Estudiante anterior"
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] font-mono px-1 text-muted-foreground hidden sm:inline">
                                    {currentIndex + 1}/{studentsList.length}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!hasNext}
                                    onClick={() => hasNext && onSelectStudent && onSelectStudent(studentsList[currentIndex + 1].student.id)}
                                    className="h-6 w-6 p-0 shrink-0"
                                    title="Siguiente estudiante"
                                >
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <span className="font-bold text-xs sm:text-sm truncate">
                            {student ? formatName(student.name, student.profile) : "Evaluación de Entrega"}
                        </span>
                    )}
                </div>

                {/* Badges Ponderados de Encabezado (Igual que en GitHub) */}
                <div className="flex items-center gap-2 shrink-0">
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
                </div>
            </div>

            {/* Layout Principal Dividido */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
                {/* Columna Izquierda: Video Player y Enunciado */}
                <div className="flex flex-col border-r border-border min-h-0 overflow-hidden lg:col-span-6 bg-muted/10">
                    <div className="flex items-center justify-between p-2 border-b bg-muted/20 shrink-0">
                        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)}>
                            <TabsList className="h-7 p-0.5">
                                <TabsTrigger value="video" className="text-xs px-2.5 gap-1">
                                    <Video className="h-3 w-3" /> Video Pitch
                                </TabsTrigger>
                                <TabsTrigger value="statement" className="text-xs px-2.5 gap-1">
                                    <FileText className="h-3 w-3" /> Enunciado
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {videoUrl && (
                            <a
                                href={videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold pr-2"
                            >
                                Abrir enlace <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-4 space-y-4">
                        {leftTab === "video" ? (
                            <>
                                {/* Video Player */}
                                <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden shadow-md flex items-center justify-center border shrink-0">
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
                                            <AlertCircle className="h-8 w-8 text-amber-500" />
                                            <p className="text-xs font-semibold">El estudiante aún no ha enviado enlace de video.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Notas del Estudiante */}
                                {studentNotes && (
                                    <div className="p-3 bg-muted/30 rounded-xl border space-y-1">
                                        <span className="text-[11px] font-bold text-foreground block">
                                            Notas o timestamps del estudiante:
                                        </span>
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                            {studentNotes}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-2" data-color-mode={mode}>
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: "transparent" }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Panel de Evaluación con Tabs */}
                <div className="flex flex-col min-h-0 overflow-hidden bg-background lg:col-span-6">
                    <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as any)} className="flex-1 flex flex-col min-h-0">
                        {/* Pestañas de Evaluación */}
                        <div className="border-b px-3 py-1.5 bg-muted/20 shrink-0">
                            <TabsList className={cn("h-8 p-0.5 gap-1", isTeacherGradingEnabled ? "grid grid-cols-2" : "inline-flex")}>
                                <TabsTrigger value="ai_eval" className="text-xs font-semibold gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                    <span>Evaluación IA</span>
                                    {aiGrade !== null && aiGrade !== undefined && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold ml-0.5">
                                            {aiGrade.toFixed(1)}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                {isTeacherGradingEnabled && (
                                    <TabsTrigger value="teacher_grade" className="text-xs font-semibold gap-1.5">
                                        <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Evaluación Docente</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold ml-0.5">
                                            {checklistScore.toFixed(1)}
                                        </Badge>
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        </div>

                        {/* TAB 1: Evaluación IA */}
                        <TabsContent value="ai_eval" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {/* Selector de Modo y Botón Calificar */}
                            <div className="p-3 bg-muted/30 rounded-xl border space-y-3">
                                <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={handleGradeWithAI}
                                    disabled={isEvaluatingAI || !videoUrl}
                                    className="w-full font-bold text-xs gap-2 shadow-xs h-9 cursor-pointer"
                                >
                                    {isEvaluatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {isEvaluatingAI ? "Evaluando con IA..." : (aiFeedbackInput ? "Reevaluar con IA" : "Evaluar con IA (Gemini)")}
                                </Button>
                            </div>

                            {/* Reporte IA Activo */}
                            {(aiResult || aiFeedbackInput) ? (
                                <div className="space-y-4 animate-in fade-in">
                                    {/* Header de Reporte con Botones de Exportar */}
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            <h4 className="font-bold text-xs">Reporte de Evaluación Multimodal (Gemini)</h4>
                                        </div>
                                        {submission && (
                                            <ExportFeedbackButtons
                                                activity={activity}
                                                submission={submission}
                                                studentName={student?.name || "Estudiante"}
                                                studentEmail={student?.email}
                                                size="sm"
                                            />
                                        )}
                                    </div>

                                    {/* Métricas destacadas (si aiResult está en memoria) */}
                                    {aiResult && (
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-2 rounded-xl border bg-rose-500/5 border-rose-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Estructura</span>
                                                <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                                                    {aiResult.structureScore?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-blue-500/5 border-blue-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Claridad</span>
                                                <span className="text-sm font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                                    {aiResult.technicalClarityScore?.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-center space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground block font-semibold">Cobertura</span>
                                                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                                    {aiResult.coveragePercentage}%
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cobertura de Temas */}
                                    {Array.isArray(aiResult?.topicsCoverage) && aiResult.topicsCoverage.length > 0 && (
                                        <div className="p-3 bg-muted/20 rounded-xl border space-y-2">
                                            <span className="text-xs font-bold text-foreground block">
                                                Verificación de Temas Solicitados:
                                            </span>
                                            <div className="space-y-1.5">
                                                {aiResult.topicsCoverage.map((tc: any, idx: number) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                                        {tc.covered ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                        ) : (
                                                            <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                                                        )}
                                                        <div className="space-y-0.5">
                                                            <span className="font-semibold text-foreground text-[11px]">{tc.topic}</span>
                                                            <p className="text-[10px] text-muted-foreground leading-tight">{tc.comment}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Retroalimentación en Markdown */}
                                    <div className="rounded-xl border bg-background p-3">
                                        <FeedbackViewer feedback={aiFeedbackInput || aiResult?.feedback || ""} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Bot className="h-8 w-8 text-rose-600/40 animate-pulse" />
                                    <p className="text-xs font-semibold text-foreground">Aún no evaluado con IA</p>
                                    <p className="text-[11px] max-w-xs">
                                        Haz clic en el botón superior para que Gemini evalúe la narrativa, cobertura y dominio técnico del estudiante.
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 2: Evaluación Docente (Solo si está habilitada en la actividad) */}
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
