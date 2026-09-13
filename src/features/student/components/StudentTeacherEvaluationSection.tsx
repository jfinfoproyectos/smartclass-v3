"use client";

import React, { useMemo } from "react";
import { 
    ActivityChecklistConfig, 
    extractEvaluationMetadata, 
    RUBRIC_LEVELS,
    stripEvaluationMetadata 
} from "@/features/teacher/utils/checklistGradingUtils";
import { Badge } from "@/components/ui/badge";
import { ListChecks, UserCheck, CheckCircle2, HelpCircle, AlertCircle } from "lucide-react";
import { FeedbackViewer } from "./FeedbackViewer";
import { cn } from "@/lib/utils";

interface StudentTeacherEvaluationSectionProps {
    checklistConfig: ActivityChecklistConfig | null;
    submission: {
        id?: string;
        grade?: number | null;
        feedback?: string | null;
        url?: string;
    } | null | undefined;
    repoUrl?: string;
    configuredPaths?: string | string[];
}

/**
 * Componente que muestra la evaluación docente (criterios de lista de chequeo / sustentación y observaciones)
 * para el estudiante ÚNICAMENTE si está habilitada en la configuración de la actividad.
 */
export function StudentTeacherEvaluationSection({
    checklistConfig,
    submission,
    repoUrl,
    configuredPaths,
}: StudentTeacherEvaluationSectionProps) {
    // Si la actividad no tiene configurada lista de chequeo / evaluación docente, NO mostrar nada
    if (!checklistConfig || !checklistConfig.enabled) {
        return null;
    }

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;

    const teacherGrade = useMemo(() => {
        if (evalMetadata?.checklistScore !== undefined && evalMetadata?.checklistScore !== null) {
            return Number(evalMetadata.checklistScore);
        }
        return null;
    }, [evalMetadata]);

    // Extraer observaciones del profesor
    const teacherPart = useMemo(() => {
        if (!submission?.feedback) return "";
        const cleanRaw = stripEvaluationMetadata(submission.feedback)
            .replace("[ENTREGA RECHAZADA]\n", "")
            .replace("[ENTREGA RECHAZADA]", "");
        
        const teacherMarker = "### 👨‍🏫 Observaciones del Profesor";
        const altTeacherMarker = "### Observaciones del Profesor";
        const activeMarker = cleanRaw.includes(teacherMarker) 
            ? teacherMarker 
            : (cleanRaw.includes(altTeacherMarker) ? altTeacherMarker : null);

        if (activeMarker) {
            const parts = cleanRaw.split(activeMarker);
            return parts.slice(1).join(activeMarker).trim();
        }
        return "";
    }, [submission?.feedback]);

    const aiWeight = checklistConfig.aiWeight ?? 30;
    const checklistWeight = checklistConfig.checklistWeight ?? 70;

    return (
        <div className="space-y-4 animate-in fade-in">
            {/* Banner de Ponderación Oficial */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                <span className="font-semibold flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Ponderación de Calificación:
                </span>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background/80 text-foreground border-border">
                        {aiWeight}% Evaluación IA
                    </Badge>
                    <span className="text-muted-foreground">+</span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/40">
                        {checklistWeight}% Sustentación Docente
                    </Badge>
                </div>
            </div>

            {/* Desglose de Criterios de Sustentación */}
            {checklistConfig.criteria && checklistConfig.criteria.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <ListChecks className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-xs sm:text-sm text-foreground">
                                        Criterios de Sustentación Docente
                                    </h5>
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold">
                                        {checklistConfig.criteria.length} criterios
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Criterios evaluados por el docente durante la sustentación de tu entrega.
                                </p>
                            </div>
                        </div>

                        {teacherGrade !== null && (
                            <Badge variant="outline" className="text-xs font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 py-1 px-2.5">
                                Nota Sustentación: {teacherGrade.toFixed(1)} / 5.0
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        {checklistConfig.criteria.map((crit, idx) => {
                            const factor = evalMetadata?.criteriaLevels?.[crit.id] 
                                ?? evalMetadata?.criteriaLevels?.[`crit-${idx + 1}`] 
                                ?? evalMetadata?.criteriaLevels?.[String(idx + 1)]
                                ?? (typeof evalMetadata?.criteriaLevels?.[crit.name] === "number" ? evalMetadata.criteriaLevels[crit.name] : undefined);
                            const hasLevel = typeof factor === "number";
                            const rubricLevel = hasLevel ? RUBRIC_LEVELS.find(l => l.factor === factor) : null;
                            const weightPct = Number(crit.percentage) || 0;
                            const earnedWeight = hasLevel ? (weightPct * factor) : (teacherGrade !== null ? (weightPct * (teacherGrade / 5.0)) : null);
                            const criterionGrade = hasLevel 
                                ? (factor * 5.0).toFixed(1) 
                                : (teacherGrade !== null ? teacherGrade.toFixed(1) : null);

                            return (
                                <div
                                    key={crit.id || idx}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all space-y-2",
                                        rubricLevel?.key === "sabe"
                                            ? "bg-emerald-500/[0.05] border-emerald-500/30"
                                            : rubricLevel?.key === "aceptable"
                                            ? "bg-blue-500/[0.05] border-blue-500/30"
                                            : rubricLevel?.key === "parcial"
                                            ? "bg-amber-500/[0.05] border-amber-500/30"
                                            : rubricLevel?.key === "no_sabe"
                                            ? "bg-rose-500/[0.05] border-rose-500/30"
                                            : "bg-muted/10 border-border/70"
                                    )}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                            <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0 bg-primary/5 text-primary border-primary/20">
                                                #{idx + 1}
                                            </Badge>
                                            <span className="font-bold text-xs sm:text-sm text-foreground">
                                                {crit.name}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                                            {rubricLevel ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-bold gap-1",
                                                        rubricLevel.key === "sabe"
                                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                            : rubricLevel.key === "aceptable"
                                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                            : rubricLevel.key === "parcial"
                                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                                    )}
                                                >
                                                    <rubricLevel.icon className="h-3 w-3" />
                                                    <span>{rubricLevel.label} ({rubricLevel.pct})</span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border">
                                                    {teacherGrade !== null ? `Global: ${teacherGrade.toFixed(1)} / 5.0` : "Pendiente"}
                                                </Badge>
                                            )}

                                            {earnedWeight !== null ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] font-mono font-bold"
                                                >
                                                    +{earnedWeight.toFixed(1)}% / {crit.percentage}%
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    Peso: {crit.percentage}%
                                                </Badge>
                                            )}

                                            {criterionGrade !== null && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20"
                                                >
                                                    Nota: {criterionGrade} / 5.0
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {crit.question && (
                                        <div className="text-[11px] sm:text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-0.5">
                                            <div className="font-semibold text-primary flex items-center gap-1">
                                                <HelpCircle className="h-3 w-3" />
                                                Pregunta evaluada:
                                            </div>
                                            <p className="text-foreground leading-snug">{crit.question}</p>
                                        </div>
                                    )}

                                    {crit.expectedAnswer && (
                                        <div className="text-[11px] sm:text-xs text-muted-foreground bg-emerald-500/5 p-2 rounded-lg space-y-0.5 border border-emerald-500/10">
                                            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Criterio esperado / Qué se evalúa:
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

            {/* Observaciones Escritas del Docente */}
            {isGraded && teacherPart && (
                <div className="p-3.5 sm:p-4 rounded-xl border bg-card space-y-2.5">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        Comentarios y Observaciones del Profesor
                    </h5>
                    <FeedbackViewer 
                        feedback={teacherPart} 
                        repoUrl={repoUrl}
                        configuredPaths={configuredPaths}
                    />
                </div>
            )}
        </div>
    );
}
