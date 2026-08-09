"use client";

import React from "react";
import { FileText, CheckCircle2, Award } from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { EvaluationManager } from "./EvaluationManager";
import { DashboardContainer } from "@/components/ui/dashboard-container";

interface TeacherEvaluationsViewProps {
    evaluations: any[];
}

export function TeacherEvaluationsView({ evaluations }: TeacherEvaluationsViewProps) {
    const activeEvaluationsCount = evaluations.filter((e: any) => e.status === "ACTIVE" || !e.status).length;

    const evaluationStats = [
        {
            title: "Evaluaciones Creadas",
            description: "Total de pruebas e instrumentos",
            value: `${evaluations.length} Pruebas`,
            icon: FileText,
            badge: "Historial",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
        {
            title: "Exámenes Activos",
            description: "Disponibles para respuesta",
            value: `${activeEvaluationsCount} Activos`,
            icon: CheckCircle2,
            badge: "En curso",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
        {
            title: "Calificación Automática",
            description: "Corrección asistida por modelos IA",
            value: "IA Integrada",
            icon: Award,
            badge: "Inteligente",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
        },
    ];

    return (
        <DashboardContainer>
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-900/90 text-white p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Módulo de Evaluaciones</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                        Gestión de Exámenes & Evaluaciones
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Diseña exámenes con preguntas abiertas y cerradas, califica automáticamente y revisa resultados.
                    </p>
                </div>
            </div>

            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {evaluationStats.map((stat, idx) => (
                    <AICanvasCard
                        key={idx}
                        title={stat.title}
                        description={stat.description}
                        icon={stat.icon}
                        badge={stat.badge}
                        badgeColor={stat.badgeColor}
                        accentColor={stat.accentColor}
                        iconBgColor={stat.iconBgColor}
                        iconTextColor={stat.iconTextColor}
                        className="h-full"
                    >
                        <div className="pt-2">
                            <div className="text-3xl font-black tracking-tight text-foreground">
                                {stat.value}
                            </div>
                        </div>
                    </AICanvasCard>
                ))}
            </div>

            {/* Evaluation Manager */}
            <div className="space-y-6">
                <EvaluationManager evaluations={evaluations} />
            </div>
        </DashboardContainer>
    );
}
