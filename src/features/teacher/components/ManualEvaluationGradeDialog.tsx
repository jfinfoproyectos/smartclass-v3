"use client";

import React, { useState } from "react";
import { 
    Pencil, 
    CheckCircle2, 
    AlertTriangle, 
    RotateCcw, 
    Loader2, 
    GraduationCap, 
    Sparkles,
    FileText,
    Award
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { updateManualEvaluationGradeAction } from "@/features/teacher/actions/evaluationActions";

const QUICK_GRADE_PRESETS = [
    { label: "0.0", val: 0.0, desc: "No presentó / Anulada" },
    { label: "2.5", val: 2.5, desc: "Bajo" },
    { label: "3.0", val: 3.0, desc: "Mínima aprobatoria" },
    { label: "3.5", val: 3.5, desc: "Aceptable" },
    { label: "4.0", val: 4.0, desc: "Sobresaliente" },
    { label: "4.5", val: 4.5, desc: "Muy alto" },
    { label: "5.0", val: 5.0, desc: "Excelente / Máxima" },
];

const QUICK_OBSERVATION_CHIPS = [
    { label: "Sustentación oral", text: "Nota asignada por sustentación oral satisfactoria en clase." },
    { label: "Entrega física / presencial", text: "Presentación y entrega del examen en formato físico." },
    { label: "Revisión y ajuste docente", text: "Revisión personalizada de respuestas y ajuste consensuado." },
    { label: "Supletorio / Justificado", text: "Examen presentado bajo permiso o justificación académica." },
    { label: "Anulación de prueba", text: "Calificación disciplinaria o anulación por incumplimiento de protocolo." }
];

interface ManualEvaluationGradeDialogProps {
    courseId: string;
    attemptId: string;
    submissionId?: string;
    studentId: string;
    studentName: string;
    studentEmail?: string;
    currentScore?: number | null;
    wildcardsUsed?: any;
    trigger?: React.ReactNode;
    triggerTooltip?: React.ReactNode;
    onSuccess?: (updated: { score: number | null; isManual: boolean; comment?: string }) => void;
}

export function ManualEvaluationGradeDialog({
    courseId,
    attemptId,
    submissionId,
    studentId,
    studentName,
    studentEmail,
    currentScore,
    wildcardsUsed,
    trigger,
    triggerTooltip,
    onSuccess
}: ManualEvaluationGradeDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const wildcards = typeof wildcardsUsed === "string" 
        ? JSON.parse(wildcardsUsed || "{}") 
        : (wildcardsUsed || {});

    const isManualGrade = Boolean(wildcards.isManualGrade);
    const originalScore = wildcards.originalScore !== undefined ? wildcards.originalScore : null;
    const manualGradeComment = wildcards.manualGradeComment || "";
    const manualGradedBy = wildcards.manualGradedBy || "";

    const [scoreInput, setScoreInput] = useState<string>(
        currentScore !== null && currentScore !== undefined ? String(currentScore) : "5.0"
    );
    const [comment, setComment] = useState<string>(manualGradeComment || "");

    const parsedScore = parseFloat(String(scoreInput || "").trim().replace(",", "."));
    const isValidScore = !isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 5.0;
    const isPassing = isValidScore && parsedScore >= 3.0;

    const handleOpen = (nextOpen: boolean) => {
        if (nextOpen) {
            setScoreInput(currentScore !== null && currentScore !== undefined ? String(currentScore) : "5.0");
            setComment(manualGradeComment || "");
        }
        setOpen(nextOpen);
    };

    const handleSaveManualGrade = async () => {
        if (!isValidScore) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await updateManualEvaluationGradeAction({
                attemptId,
                submissionId,
                studentId,
                courseId,
                manualScore: parsedScore,
                comment: comment.trim()
            });

            if (!res.success) {
                toast.error(res.error || "No se pudo actualizar la nota definitiva");
                return;
            }

            toast.success(`Nota definitiva de ${studentName} actualizada a ${parsedScore.toFixed(2)}`);
            setOpen(false);
            if (onSuccess) {
                onSuccess({
                    score: res.score,
                    isManual: true,
                    comment: comment.trim()
                });
            }
        } catch (err: any) {
            console.error("Error al guardar nota manual:", err);
            toast.error(err.message || "Error al conectar con el servidor");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevertToOriginal = async () => {
        if (!confirm(`¿Estás seguro de restablecer la nota de ${studentName} a su valor original calculado (${originalScore !== null ? Number(originalScore).toFixed(2) : "Sin nota"})?`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await updateManualEvaluationGradeAction({
                attemptId,
                submissionId,
                studentId,
                courseId,
                revertToOriginal: true
            });

            if (!res.success) {
                toast.error(res.error || "No se pudo restablecer la nota original");
                return;
            }

            toast.success(`Nota original restablecida para ${studentName}`);
            setOpen(false);
            if (onSuccess) {
                onSuccess({
                    score: res.score,
                    isManual: false
                });
            }
        } catch (err: any) {
            console.error("Error al restablecer nota:", err);
            toast.error(err.message || "Error al conectar con el servidor");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            {triggerTooltip ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            {trigger || (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {triggerTooltip}
                    </TooltipContent>
                </Tooltip>
            ) : trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Asignar / Modificar Nota Definitiva Manual</p>
                    </TooltipContent>
                </Tooltip>
            )}

            <DialogContent className="sm:max-w-[480px] p-5 sm:p-6 gap-4">
                <DialogHeader className="space-y-1.5 text-left">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Award className="h-5 w-5" />
                        </div>
                        <div>
                            <span>Calificación Definitiva Manual</span>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        Establece la nota definitiva para <strong className="text-foreground font-semibold">{studentName}</strong>
                        {studentEmail && <span className="block font-mono text-[11px] text-muted-foreground/80">{studentEmail}</span>}
                    </DialogDescription>
                </DialogHeader>

                {/* Banner de Estado Actual */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Estado actual en plataforma:</span>
                        {currentScore !== null && currentScore !== undefined ? (
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-sm">
                                    {Number(currentScore).toFixed(2)} / 5.0
                                </span>
                                {isManualGrade ? (
                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 px-1.5 py-0">
                                        Manual
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border/80 px-1.5 py-0">
                                        Calculada
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                Sin entrega / No iniciado
                            </Badge>
                        )}
                    </div>

                    {isManualGrade && (
                        <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-0.5">
                            <p className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                ℹ️ Nota manual previa establecida por: {manualGradedBy || "Profesor"}
                            </p>
                            {originalScore !== null && (
                                <p>Nota original calculada por el examen: <strong className="font-mono">{Number(originalScore).toFixed(2)}</strong></p>
                            )}
                            {manualGradeComment && (
                                <p className="italic text-foreground/80">&quot;{manualGradeComment}&quot;</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Entrada de la Calificación */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span>Nueva Nota Definitiva (Escala 0.0 a 5.0)</span>
                        </label>
                        {isValidScore && (
                            <Badge 
                                className={`text-[10px] font-bold px-2 py-0.5 ${
                                    isPassing 
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" 
                                        : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                                }`}
                            >
                                {isPassing ? "Aprobatoria (≥ 3.0)" : "Reprobatoria (< 3.0)"}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            step="any"
                            min="0"
                            max="5"
                            value={scoreInput}
                            onChange={(e) => setScoreInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveManualGrade();
                                }
                            }}
                            placeholder="Ej: 4.5"
                            className="h-10 text-lg font-black font-mono text-center tracking-wider bg-background rounded-xl border-border/80 focus-visible:ring-primary"
                            autoFocus
                        />
                        <span className="text-sm font-bold text-muted-foreground">/ 5.0</span>
                    </div>

                    {/* Chips de Selección Rápida */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Rápido:</span>
                        {QUICK_GRADE_PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => setScoreInput(String(p.val))}
                                title={p.desc}
                                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                    scoreInput === String(p.val)
                                        ? "bg-primary text-primary-foreground border-primary shadow-2xs scale-105"
                                        : "bg-muted/40 hover:bg-muted text-foreground border-border/70"
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Motivo u Observación */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Motivo u Observación Docente (Opcional)</span>
                    </label>

                    <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ej: Aprobó mediante sustentación oral presencial en la clase del 11 de Octubre..."
                        rows={2}
                        className="text-xs bg-background rounded-xl border-border/80 resize-none"
                    />

                    {/* Chips de sugerencias */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {QUICK_OBSERVATION_CHIPS.map((chip) => (
                            <button
                                key={chip.label}
                                type="button"
                                onClick={() => setComment(chip.text)}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
                            >
                                + {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div>
                        {isManualGrade && originalScore !== null && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={handleRevertToOriginal}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Restablecer ({Number(originalScore).toFixed(2)})</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => setOpen(false)}
                            className="h-9 text-xs rounded-xl cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!isValidScore || isSubmitting}
                            onClick={handleSaveManualGrade}
                            className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Asignar Nota Definitiva</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
