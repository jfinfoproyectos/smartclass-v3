"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
    FileText, Calendar, ArrowRight, ShieldAlert, Sparkles, 
    Award, CheckCircle2, Clock, AlertTriangle, Loader2, RefreshCw, Gavel
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOrGenerateEvaluationFeedbackAction } from "@/features/student/actions/evaluationActions";

interface EvaluationStudentCardProps {
    attempt: any;
    index: number;
}

export function EvaluationStudentCard({ attempt, index }: EvaluationStudentCardProps) {
    const submission = attempt.submissions?.[0];
    const isSubmitted = !!submission?.submittedAt;
    const now = new Date();
    const startTime = new Date(attempt.startTime);
    const endTime = new Date(attempt.endTime);
    const isOpen = now >= startTime && now <= endTime;
    const isUpcoming = now < startTime;
    const isExpired = now > endTime && !isSubmitted;

    // Estado del feedback generado por LLM
    const initialFeedback = submission?.wildcardsUsed?.llmFeedback || null;
    const [feedback, setFeedback] = useState<string | null>(initialFeedback);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState(false);
    const [currentScore, setCurrentScore] = useState<number | null>(
        submission?.score !== undefined && submission?.score !== null ? submission.score : null
    );

    useEffect(() => {
        if (isSubmitted && submission?.id && !feedback) {
            let isMounted = true;
            setIsLoadingFeedback(true);
            setFeedbackError(false);

            getOrGenerateEvaluationFeedbackAction(submission.id)
                .then((res) => {
                    if (isMounted && res?.feedback) {
                        setFeedback(res.feedback);
                        if (res.score !== undefined && res.score !== null) {
                            setCurrentScore(res.score);
                        }
                    }
                })
                .catch((err) => {
                    console.error("Error cargando feedback IA de evaluación:", err);
                    if (isMounted) setFeedbackError(true);
                })
                .finally(() => {
                    if (isMounted) setIsLoadingFeedback(false);
                });

            return () => {
                isMounted = false;
            };
        }
    }, [isSubmitted, submission?.id, feedback]);

    const handleRetryFeedback = async () => {
        if (!submission?.id) return;
        setIsLoadingFeedback(true);
        setFeedbackError(false);
        try {
            const res = await getOrGenerateEvaluationFeedbackAction(submission.id);
            if (res?.feedback) {
                setFeedback(res.feedback);
                if (res.score !== undefined && res.score !== null) {
                    setCurrentScore(res.score);
                }
            }
        } catch (e) {
            setFeedbackError(true);
        } finally {
            setIsLoadingFeedback(false);
        }
    };

    // Formato de notas y colores pedagógicos (Escala 0.0 - 5.0)
    const scoreVal = currentScore !== null ? Number(currentScore) : null;
    const isPassing = scoreVal !== null && scoreVal >= 3.0;
    const isExcellent = scoreVal !== null && scoreVal >= 4.5;
    const expulsionsCount = submission?.expulsions || 0;
    const hasSurveillance = attempt.enableSurveillance !== false && attempt.blockTabSwitch !== false;

    // Datos de penalización o ajuste docente
    const wildcards = (submission?.wildcardsUsed as any) || {};
    const penalty = wildcards.penalty !== undefined ? Number(wildcards.penalty) : 0;
    const penaltyComment = (wildcards.penaltyComment as string) || "";
    const baseScore = wildcards.baseScore !== undefined 
        ? Number(wildcards.baseScore) 
        : (scoreVal !== null ? scoreVal : 0);

    return (
        <div className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all duration-300 hover:shadow-md",
            isSubmitted 
                ? isPassing
                    ? "border-emerald-500/30 hover:border-emerald-500/60"
                    : "border-destructive/30 hover:border-destructive/60"
                : isOpen
                    ? "border-primary/40 hover:border-primary shadow-primary/5"
                    : "border-border/80 hover:border-primary/30"
        )}>
            {/* Barra superior de acento con gradiente dinámico */}
            <div className={cn(
                "absolute top-0 inset-x-0 h-1.5 transition-all duration-300",
                isSubmitted
                    ? isPassing
                        ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
                        : "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
                    : isOpen
                        ? "bg-gradient-to-r from-primary via-blue-500 to-primary/80"
                        : "bg-gradient-to-r from-muted-foreground/30 via-muted/20 to-transparent"
            )} />

            {/* Cabecera de la tarjeta */}
            <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs shrink-0 transition-transform group-hover:scale-105",
                            isSubmitted
                                ? isPassing
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-destructive/15 text-destructive"
                                : "bg-primary/10 text-primary"
                        )}>
                            {isSubmitted ? (
                                <Award className="h-4 w-4" />
                            ) : (
                                <FileText className="h-4 w-4" />
                            )}
                        </div>
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                            Evaluación #{index + 1}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {hasSurveillance && (
                            <Badge variant="outline" className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 gap-1",
                                expulsionsCount > 0 
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold" 
                                    : "bg-muted/40 text-muted-foreground border-border/50"
                            )}>
                                <ShieldAlert className={cn("h-3 w-3 shrink-0", expulsionsCount > 0 ? "text-red-500" : "text-muted-foreground")} />
                                <span>{expulsionsCount} {expulsionsCount === 1 ? 'Expulsión' : 'Expulsiones'}</span>
                            </Badge>
                        )}

                        {isSubmitted ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 gap-1 shadow-2xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Presentada</span>
                            </Badge>
                        ) : isExpired ? (
                            <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-0.5">
                                Expirada
                            </Badge>
                        ) : isUpcoming ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Próximamente</span>
                            </Badge>
                        ) : isOpen ? (
                            <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse text-[10px] font-bold px-2 py-0.5">
                                Abierta
                            </Badge>
                        ) : null}
                    </div>
                </div>

                {/* Título de la evaluación */}
                <div className="space-y-1 mb-3">
                    {isOpen || isSubmitted ? (
                        <Link href={`/evaluations/${attempt.id}`} className="block group/link">
                            <h4 className="font-bold text-base text-foreground line-clamp-2 leading-snug group-hover/link:text-primary transition-colors cursor-pointer" title={attempt.evaluation.title}>
                                {attempt.evaluation.title}
                            </h4>
                        </Link>
                    ) : (
                        <h4 className="font-bold text-base text-muted-foreground line-clamp-2 leading-snug" title={attempt.evaluation.title}>
                            {attempt.evaluation.title}
                        </h4>
                    )}

                    {/* Metadatos de fechas */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>Inicio: {format(startTime, "dd MMM, HH:mm", { locale: es })}</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>Límite: {format(endTime, "dd MMM, HH:mm", { locale: es })}</span>
                        </span>
                    </div>
                </div>

                {/* Alerta de expulsiones si hubo pérdida de foco */}
                {hasSurveillance && expulsionsCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20 mb-3">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>Se registraron <strong>{expulsionsCount}</strong> {expulsionsCount === 1 ? 'expulsión' : 'expulsiones'} por cambio de pestaña o ventana.</span>
                    </div>
                )}

                {/* ======================= VISTA CUANDO ESTÁ PRESENTADA ======================= */}
                {isSubmitted && (
                    <div className="space-y-3 pt-1">
                        {/* Tarjeta destacada de Calificación Obtenida */}
                        <div className={cn(
                            "relative overflow-hidden rounded-xl p-3.5 border transition-all",
                            isPassing 
                                ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30" 
                                : "bg-destructive/5 dark:bg-destructive/15 border-destructive/30"
                        )}>
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Nota Obtenida
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                        <span className={cn(
                                            "font-mono text-3xl font-black tracking-tight",
                                            isPassing 
                                                ? "text-emerald-600 dark:text-emerald-400" 
                                                : "text-destructive"
                                        )}>
                                            {scoreVal !== null ? scoreVal.toFixed(1) : "-"}
                                        </span>
                                        <span className="text-xs font-semibold text-muted-foreground font-mono">
                                            / 5.0
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <Badge className={cn(
                                        "text-xs font-bold px-2.5 py-1",
                                        isExcellent
                                            ? "bg-emerald-500 text-white shadow-xs"
                                            : isPassing
                                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                                : "bg-destructive/15 text-destructive border border-destructive/30"
                                    )}>
                                        {isExcellent ? "Sobresaliente" : isPassing ? "Aprobado" : "No Aprobado"}
                                    </Badge>
                                    {submission?.submittedAt && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {format(new Date(submission.submittedAt), "dd MMM, HH:mm", { locale: es })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Barra de Progreso de Calificación */}
                            {scoreVal !== null && (
                                <div className="mt-2.5 w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-700 ease-out",
                                            isPassing ? "bg-emerald-500" : "bg-destructive"
                                        )}
                                        style={{ width: `${Math.min(100, Math.max(0, (scoreVal / 5.0) * 100))}%` }}
                                    />
                                </div>
                            )}

                            {/* Detalle de Sanción / Descuento Docente */}
                            {penalty > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-border/50 dark:border-border/30 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                                            <Gavel className="h-3.5 w-3.5 shrink-0" />
                                            Ajuste aplicado por docente:
                                        </span>
                                        <span className="font-mono font-bold text-destructive">
                                            -{penalty.toFixed(1)} pts
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>Nota base original:</span>
                                        <span className="font-mono font-semibold">{baseScore.toFixed(2)} / 5.0</span>
                                    </div>
                                    {penaltyComment && (
                                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200">
                                            <span className="font-semibold block text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                Motivo docente:
                                            </span>
                                            <p className="italic mt-0.5 leading-snug">&ldquo;{penaltyComment}&rdquo;</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bloque de Retroalimentación IA Generativa Pedagógica */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                                    <span>Retroalimentación Pedagógica IA</span>
                                </div>
                                <span className="text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.2 rounded">
                                    IA Tutor
                                </span>
                            </div>

                            {isLoadingFeedback ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground animate-pulse">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                    <span>Generando análisis pedagógico personalizado...</span>
                                </div>
                            ) : feedback ? (
                                <p className="text-xs text-foreground/90 leading-relaxed italic bg-background/50 dark:bg-card/50 p-2.5 rounded-lg border border-border/40">
                                    "{feedback}"
                                </p>
                            ) : feedbackError ? (
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground py-1">
                                    <span className="text-[11px]">No se pudo cargar el análisis.</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleRetryFeedback}
                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary gap-1"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Reintentar
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* ======================= VISTA SI NO ESTÁ PRESENTADA ======================= */}
                {!isSubmitted && (
                    <div className="pt-2">
                        {hasSurveillance && (
                            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-1">
                                <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span>Supervisión Activa</span>
                                </div>
                                <p className="leading-tight">
                                    Esta prueba supervisa la pérdida de foco. No cambies de pestaña ni uses otras aplicaciones mientras esté en curso.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer con acciones */}
            <div className="pt-4 mt-3 border-t border-border/50 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                    {isSubmitted ? "Estado de entrega: Finalizado" : isOpen ? "Disponible ahora" : isUpcoming ? "Pronto" : "Cerrada"}
                </span>

                <Button 
                    size="sm" 
                    className={cn(
                        "h-8 px-3.5 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer shadow-xs",
                        isSubmitted ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""
                    )}
                    variant={isSubmitted ? "secondary" : isOpen ? "default" : "ghost"}
                    disabled={!isOpen && !isSubmitted}
                    asChild={isOpen || isSubmitted}
                >
                    {isOpen || isSubmitted ? (
                        <Link href={`/evaluations/${attempt.id}`}>
                            <span>{isSubmitted ? "Ver Respuestas" : "Iniciar"}</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    ) : (
                        <span>Bloqueado</span>
                    )}
                </Button>
            </div>
        </div>
    );
}
