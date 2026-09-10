"use client";

import React from "react";
import { Sparkles, ListChecks, CheckCircle2 } from "lucide-react";
import { ActivityChecklistConfig } from "../utils/checklistGradingUtils";

interface TeacherEvaluationHeaderBadgesProps {
    checklistConfig: ActivityChecklistConfig | null;
    aiGrade: number | null | undefined;
    checklistScore: number;
    combinedFinalScore: number;
}

export function TeacherEvaluationHeaderBadges({
    checklistConfig,
    aiGrade,
    checklistScore,
    combinedFinalScore,
}: TeacherEvaluationHeaderBadgesProps) {
    if (!checklistConfig) return null;

    const aiWeight = checklistConfig.aiWeight ?? 30;
    const checklistWeight = checklistConfig.checklistWeight ?? 70;
    const aiScoreVal = typeof aiGrade === "number" ? aiGrade : 0;

    return (
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap animate-in fade-in">
            {/* Nota IA con porcentaje */}
            <div 
                className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                title={`Evaluación IA: ${aiScoreVal.toFixed(1)} / 5.0 (${aiWeight}% de la nota final)`}
            >
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">IA</span>
                <span className="text-[10px] font-mono opacity-80">({aiWeight}%):</span>
                <span className="text-xs font-black font-mono">{aiScoreVal.toFixed(1)}</span>
            </div>

            {/* Nota Docente / Sustentación con porcentaje */}
            <div 
                className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                title={`Sustentación Oral Docente: ${checklistScore.toFixed(1)} / 5.0 (${checklistWeight}% de la nota final)`}
            >
                <ListChecks className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">Docente</span>
                <span className="text-[10px] font-mono opacity-80">({checklistWeight}%):</span>
                <span className="text-xs font-black font-mono">{checklistScore.toFixed(1)}</span>
            </div>

            {/* Nota Final Ponderada Consolidada */}
            <div 
                className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-extrabold shadow-2xs"
                title={`Nota Final Ponderada: ${combinedFinalScore.toFixed(1)} / 5.0 (${aiWeight}% IA + ${checklistWeight}% Docente)`}
            >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider hidden sm:inline">FINAL:</span>
                <span className="text-sm font-black font-mono">{combinedFinalScore.toFixed(1)}</span>
                <span className="text-[10px] opacity-75 font-mono">/ 5.0</span>
            </div>
        </div>
    );
}
