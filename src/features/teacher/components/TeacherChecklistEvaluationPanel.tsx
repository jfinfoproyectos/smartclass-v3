"use client";

import React, { useState } from "react";
import {
    ListChecks,
    Sparkles,
    CheckCircle2,
    ZoomIn,
    ZoomOut,
    Copy,
    CheckCircle,
    Maximize2,
    Minimize2,
    Loader2,
    HelpCircle,
    Info,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { improveFeedbackAction } from "../actions/gradingActions";
import {
    RUBRIC_LEVELS,
    calculateChecklistScore,
    calculateCombinedFinalGrade,
    ActivityChecklistConfig,
} from "../utils/checklistGradingUtils";

export interface TeacherChecklistEvaluationPanelProps {
    activity: any;
    student: any;
    submission: any;
    aiGrade: number | null | undefined;
    aiFeedbackInput?: string;
    gradingResult?: { grade: number; rawAiGrade?: number; feedback?: string } | null;
    checklistConfig: ActivityChecklistConfig | null;
    criteriaLevels: Record<string, number | undefined>;
    onUpdateCriteriaLevels: (nextLevels: Record<string, number | undefined>) => void;
    manualSustentacionScore: number | null;
    onSetManualSustentacionScore: (score: number | null) => void;
    gradeInput: string;
    onSetGradeInput: (val: string) => void;
    teacherNotesInput: string;
    onSetTeacherNotesInput: (val: string | ((prev: string) => string)) => void;
    teacherObservationInput?: string;
    onSetTeacherObservationInput?: (val: string) => void;
    isSavingGrade: boolean;
    onSaveGrade: () => void | Promise<void>;
    onReject?: () => void | Promise<void>;
    fullscreenSection?: string;
    onToggleFullscreen?: () => void;
}

export function TeacherChecklistEvaluationPanel({
    activity,
    student,
    submission,
    aiGrade,
    aiFeedbackInput = "",
    gradingResult,
    checklistConfig,
    criteriaLevels,
    onUpdateCriteriaLevels,
    manualSustentacionScore,
    onSetManualSustentacionScore,
    gradeInput,
    onSetGradeInput,
    teacherNotesInput,
    onSetTeacherNotesInput,
    teacherObservationInput = "",
    onSetTeacherObservationInput,
    isSavingGrade,
    onSaveGrade,
    onReject,
    fullscreenSection,
    onToggleFullscreen,
}: TeacherChecklistEvaluationPanelProps) {
    const [textZoom, setTextZoom] = useState<number>(1.0);
    const [isImprovingFeedback, setIsImprovingFeedback] = useState<boolean>(false);

    const checklistData = checklistConfig?.criteria ?? [];
    const aiWeight = checklistConfig?.aiWeight ?? 30;
    const checklistWeight = checklistConfig?.checklistWeight ?? 70;
    const aiScoreVal = typeof aiGrade === "number" ? aiGrade : 0;

    const checklistScore = calculateChecklistScore(checklistData, criteriaLevels, manualSustentacionScore);
    const combinedFinalScore = checklistConfig
        ? calculateCombinedFinalGrade(aiScoreVal, checklistScore, aiWeight, checklistWeight)
        : (parseFloat(gradeInput) || 0);

    const handleImproveNotes = async () => {
        if (!teacherNotesInput || teacherNotesInput.trim().length < 5) return;
        setIsImprovingFeedback(true);
        try {
            const improved = await improveFeedbackAction(teacherNotesInput);
            if (improved) {
                onSetTeacherNotesInput(improved);
                toast.success("Redacción mejorada con IA.");
            }
        } catch (err: any) {
            toast.error("Error al mejorar texto con IA.", { description: err.message });
        } finally {
            setIsImprovingFeedback(false);
        }
    };

    return (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-5 h-full overflow-y-auto">
            {/* Header: Title, Export and Zoom controls */}
            <div className="flex items-center justify-between border-b pb-3 gap-2">
                <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">
                        Asignación de Nota y Observaciones Docentes
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                        Revisa la calificación y agrega observaciones personalizadas para {student?.name || "el estudiante"}.
                    </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {submission && (
                        <ExportFeedbackButtons
                            activity={activity}
                            submission={submission}
                            studentName={student?.name || student?.email || "Estudiante"}
                            studentEmail={student?.email}
                            size="sm"
                        />
                    )}

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5 bg-background/80 shadow-2xs">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setTextZoom((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Reducir tamaño del texto (Zoom -)"
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <button
                            type="button"
                            onClick={() => setTextZoom(1.0)}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Restablecer tamaño normal (100%)"
                        >
                            {Math.round(textZoom * 100)}%
                        </button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setTextZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Aumentar tamaño del texto (Zoom +)"
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {onToggleFullscreen && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onToggleFullscreen}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title={fullscreenSection === "content" ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                        >
                            {fullscreenSection === "content" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Widget de Lista de Chequeo y Sustentación Oral con Ponderación de Nota */}
            {checklistConfig && checklistData.length > 0 && (
                <div className="p-4 rounded-2xl border border-primary/20 bg-primary/[0.02] space-y-3.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <ListChecks className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs font-bold text-foreground">
                                        Lista de Chequeo y Sustentación Oral
                                    </h5>
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                        {checklistWeight}% Docente / {aiWeight}% IA
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Formula estas preguntas al estudiante. La nota final se calcula combinando la IA y la sustentación.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const questionDetails = checklistData
                                        .map((c: any, i: number) => {
                                            const factor = criteriaLevels[c.id];
                                            const lvl = RUBRIC_LEVELS.find((l) => l.factor === factor);
                                            const lvlName = lvl ? `${lvl.label} (${lvl.pct})` : "Sin calificar";
                                            return `  • #${i + 1} ${c.name} (${c.percentage}%): ${lvlName}`;
                                        })
                                        .join("\n");
                                    const breakdownText = `\n\n📊 Desglose de Evaluación Ponderada:\n• Evaluación Automática IA (${aiWeight}%): ${aiScoreVal.toFixed(1)} / 5.0\n• Sustentación Oral Docente (${checklistWeight}%): ${checklistScore.toFixed(1)} / 5.0\n• NOTA FINAL CONSOLIDADA: ${combinedFinalScore.toFixed(1)} / 5.0\n\nPreguntas de Sustentación:\n${questionDetails}`;
                                    onSetTeacherNotesInput((prev) => (prev ? prev + breakdownText : breakdownText.trim()));
                                    toast.success("Desglose copiado a las observaciones docentes.");
                                }}
                                className="h-7 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-foreground"
                                title="Copiar el desglose matemático a las observaciones del profesor"
                            >
                                <Copy className="h-3 w-3" />
                                Copiar a Observaciones
                            </Button>
                        </div>
                    </div>

                    {/* Tarjeta de Cálculo Ponderado en Tiempo Real (3 Bento Cards) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-background/80 border border-primary/15 text-xs">
                        <div className="p-2 rounded-lg bg-purple-500/[0.05] border border-purple-500/20 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Evaluación IA ({aiWeight}%)
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-sm font-black font-mono">{aiScoreVal.toFixed(1)}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    +{(aiScoreVal * (aiWeight / 100)).toFixed(2)} pts
                                </span>
                            </div>
                        </div>

                        <div className="p-2 rounded-lg bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
                                <ListChecks className="h-3 w-3" /> Sustentación ({checklistWeight}%)
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-sm font-black font-mono">{checklistScore.toFixed(1)}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    +{(checklistScore * (checklistWeight / 100)).toFixed(2)} pts
                                </span>
                            </div>
                        </div>

                        <div className="p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Nota Final Ponderada
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                    {combinedFinalScore.toFixed(1)}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground font-mono">/ 5.0</span>
                            </div>
                        </div>
                    </div>

                    {/* Acciones Rápidas: Todos Sabe / Limpiar */}
                    <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                        <span>Evalúa cada pregunta según la sustentación del estudiante:</span>
                        <div className="flex items-center gap-1.5 font-semibold text-[10px]">
                            <button
                                type="button"
                                onClick={() => {
                                    const allSabe: Record<string, number> = {};
                                    checklistData.forEach((c: any) => {
                                        allSabe[c.id] = 1.0;
                                    });
                                    onSetManualSustentacionScore(null);
                                    onUpdateCriteriaLevels(allSabe);
                                    const nextCombined = calculateCombinedFinalGrade(aiScoreVal, 5.0, aiWeight, checklistWeight);
                                    onSetGradeInput(nextCombined.toFixed(1));
                                }}
                                className="text-primary hover:underline cursor-pointer"
                            >
                                Todos Sabe (100%)
                            </button>
                            <span>•</span>
                            <button
                                type="button"
                                onClick={() => {
                                    onSetManualSustentacionScore(null);
                                    onUpdateCriteriaLevels({});
                                    const nextCombined = calculateCombinedFinalGrade(aiScoreVal, 0.0, aiWeight, checklistWeight);
                                    onSetGradeInput(nextCombined.toFixed(1));
                                }}
                                className="hover:underline cursor-pointer"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    {/* Listado interactivo de Criterios */}
                    <div className="space-y-3 transition-all" style={{ zoom: textZoom }}>
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
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono font-bold shrink-0 bg-primary/5 text-primary border-primary/20"
                                            >
                                                #{idx + 1}
                                            </Badge>
                                            <span className="font-bold text-xs text-foreground">{crit.name}</span>
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

                                    {/* 4 Niveles: Sabe, Aceptable, Parcial, No Sabe */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        {RUBRIC_LEVELS.map((lvl) => {
                                            const isSelected = currentFactor === lvl.factor;
                                            return (
                                                <button
                                                    key={lvl.key}
                                                    type="button"
                                                    onClick={() => {
                                                        const isCurrentSelected = currentFactor === lvl.factor;
                                                        const nextLevels = {
                                                            ...criteriaLevels,
                                                            [crit.id]: isCurrentSelected ? undefined : lvl.factor,
                                                        };
                                                        onSetManualSustentacionScore(null);
                                                        onUpdateCriteriaLevels(nextLevels);
                                                        const nextChecklist = calculateChecklistScore(checklistData, nextLevels, null);
                                                        const nextCombined = calculateCombinedFinalGrade(aiScoreVal, nextChecklist, aiWeight, checklistWeight);
                                                        onSetGradeInput(nextCombined.toFixed(1));
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
                </div>
            )}

            {/* Score Presets Pills */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Calificación Rápida</Label>
                    {checklistConfig && manualSustentacionScore !== null && (
                        <button
                            type="button"
                            onClick={() => {
                                onSetManualSustentacionScore(null);
                                const recalc = calculateChecklistScore(checklistData, criteriaLevels, null);
                                const nextCombined = calculateCombinedFinalGrade(aiScoreVal, recalc, aiWeight, checklistWeight);
                                onSetGradeInput(nextCombined.toFixed(1));
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        >
                            Restablecer a Criterios
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {["5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.0"].map((score) => {
                        const num = parseFloat(score);
                        const isSelected = checklistConfig
                            ? manualSustentacionScore !== null && Math.abs(manualSustentacionScore - num) < 0.05
                            : gradeInput === score;

                        return (
                            <button
                                key={score}
                                type="button"
                                onClick={() => {
                                    if (checklistConfig) {
                                        onSetManualSustentacionScore(num);
                                        const closestFactor = num >= 4.5 ? 1.0 : num >= 3.5 ? 0.75 : num >= 2.0 ? 0.5 : 0.0;
                                        const updatedLevels: Record<string, number> = {};
                                        checklistData.forEach((crit: any) => {
                                            updatedLevels[crit.id] = closestFactor;
                                        });
                                        onUpdateCriteriaLevels(updatedLevels);

                                        const combined = calculateCombinedFinalGrade(aiScoreVal, num, aiWeight, checklistWeight);
                                        onSetGradeInput(combined.toFixed(1));
                                        toast.info(
                                            `Sustentación asignada: ${num.toFixed(1)} / 5.0 (${checklistWeight}%). Nota final ponderada con IA: ${combined.toFixed(1)}`
                                        );
                                    } else {
                                        onSetGradeInput(score);
                                    }
                                }}
                                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background hover:bg-muted text-muted-foreground"
                                }`}
                            >
                                {score}
                            </button>
                        );
                    })}
                </div>

                {/* Banner explicativo de la sustentación oral */}
                {checklistConfig && (
                    <div className="p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/25 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                            <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>Regla de Sustentación Oral ({checklistWeight}%):</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Al utilizar la <strong>Calificación Rápida</strong>, la <strong>Sustentación Oral</strong> adquiere automáticamente esa nota{" "}
                            {manualSustentacionScore !== null ? (
                                <strong className="text-blue-600 dark:text-blue-400">({manualSustentacionScore.toFixed(1)} / 5.0)</strong>
                            ) : (
                                "(según el botón presionado)"
                            )}
                            , y la <strong>Nota Final</strong> se calcula ponderándola automáticamente con la <strong>Evaluación IA ({aiWeight}% = {aiScoreVal.toFixed(1)})</strong>.
                        </p>
                        {manualSustentacionScore !== null && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                                <span className="bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold border border-blue-500/30">
                                    Sustentación ({checklistWeight}%): {manualSustentacionScore.toFixed(1)}
                                </span>
                                <span className="text-muted-foreground">+</span>
                                <span className="bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-bold border border-purple-500/30">
                                    IA ({aiWeight}%): {aiScoreVal.toFixed(1)}
                                </span>
                                <span className="text-muted-foreground">=</span>
                                <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">
                                    Nota Final Ponderada: {combinedFinalScore.toFixed(1)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input de Nota Final */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="grade-input-field" className="text-xs font-semibold">
                            Nota Final (0.0 - 5.0)
                        </Label>
                        {checklistConfig && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                                Ponderada automática: {aiWeight}% IA + {checklistWeight}% Sustentación
                            </span>
                        )}
                    </div>
                    <Input
                        id="grade-input-field"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={gradeInput}
                        onChange={(e) => onSetGradeInput(e.target.value)}
                        placeholder="Ej: 4.5"
                        className="font-bold text-base"
                    />

                    {gradingResult &&
                        gradeInput &&
                        !isNaN(parseFloat(gradeInput)) &&
                        parseFloat(gradeInput) !== gradingResult.grade && (
                            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs animate-in fade-in">
                                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                                    <Zap className="h-4 w-4 shrink-0 text-amber-600" />
                                    Nota modificada respecto a la sugerida por la IA ({gradingResult.grade.toFixed(1)} →{" "}
                                    {parseFloat(gradeInput).toFixed(1)})
                                </div>
                                {onSetTeacherObservationInput && (
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                                            Justificación / Observación del Ajuste:
                                        </Label>
                                        <Textarea
                                            rows={2}
                                            value={teacherObservationInput}
                                            onChange={(e) => onSetTeacherObservationInput(e.target.value)}
                                            placeholder="Explica el motivo del cambio de nota..."
                                            className="bg-white dark:bg-slate-900 text-xs leading-relaxed border-amber-300 dark:border-amber-700"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                </div>

                {/* Observaciones del Profesor */}
                <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="teacher-notes-field" className="text-xs font-bold flex items-center gap-1.5">
                                👨‍🏫 Observaciones / Retroalimentación del Profesor
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Escribe comentarios u observaciones personales para el estudiante.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isImprovingFeedback || !teacherNotesInput || teacherNotesInput.trim().length < 5}
                            onClick={handleImproveNotes}
                            className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-semibold gap-1"
                        >
                            {isImprovingFeedback ? (
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            ) : (
                                <Sparkles className="w-3 h-3 text-primary" />
                            )}
                            Mejorar Redacción con IA
                        </Button>
                    </div>

                    <Textarea
                        id="teacher-notes-field"
                        rows={5}
                        value={teacherNotesInput}
                        onChange={(e) => onSetTeacherNotesInput(e.target.value)}
                        placeholder="Ingresa tus observaciones docentes (ej: Excelente sustentación de los requerimientos y solvencia técnica)..."
                        className="text-xs leading-relaxed bg-background"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <Button
                        type="button"
                        size="lg"
                        disabled={isSavingGrade}
                        onClick={onSaveGrade}
                        className="flex-1 font-bold shadow-sm cursor-pointer"
                    >
                        {isSavingGrade ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        {checklistConfig
                            ? submission?.grade !== null && submission?.grade !== undefined
                                ? `Actualizar Nota (${combinedFinalScore.toFixed(1)})`
                                : `Guardar Nota (${combinedFinalScore.toFixed(1)})`
                            : submission?.grade !== null && submission?.grade !== undefined
                            ? "Actualizar Nota"
                            : "Guardar Nota"}
                    </Button>

                    {submission && onReject && (
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={onReject}
                            className="text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                            Rechazar Entrega
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
