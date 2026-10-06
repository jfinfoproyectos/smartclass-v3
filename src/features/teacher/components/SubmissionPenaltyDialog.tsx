"use client";

import React, { useState } from "react";
import { 
    Gavel, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldAlert, 
    Loader2, 
    RotateCcw,
    Scale,
    FileText,
    Sparkles,
    Wand2,
    Bookmark,
    ChevronDown
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
    updateSubmissionPenaltyAction,
    refinePenaltyCommentAction
} from "@/features/teacher/actions/evaluationActions";

const PENALTY_TEMPLATES = [
    {
        label: "Fraude / Copia comprobada",
        category: "Integridad",
        text: "Se aplica penalización debido a conducta contraria a la integridad académica y fraude comprobado durante el desarrollo de la prueba.",
    },
    {
        label: "Pérdida de foco / Salidas reiteradas",
        category: "Monitoreo",
        text: "Descuento aplicado por reiteradas salidas de pantalla completa y pérdida de foco injustificadas durante la sesión de evaluación.",
    },
    {
        label: "Material de apoyo no autorizado",
        category: "Normativa",
        text: "Penalización por consulta o tenencia indebida de material externo y fuentes no permitidas durante el examen.",
    },
    {
        label: "Comunicación no autorizada",
        category: "Colaboración",
        text: "Se descuenta puntaje debido a comunicación o intercambio de respuestas con otros estudiantes durante la prueba.",
    },
    {
        label: "Incumplimiento de instrucciones de entrega",
        category: "Protocolo",
        text: "Ajuste disciplinario de calificación por omisión o incumplimiento de las directrices y normas de presentación establecidas.",
    },
    {
        label: "Anulación total de la prueba",
        category: "Falta grave",
        text: "Anulación de la evaluación por falta grave contra la honestidad académica conforme al reglamento de evaluación institucional.",
    },
];

const QUICK_TEMPLATE_CHIPS = [
    { label: "Fraude comprobado", text: "Conducta contraria a la integridad académica y fraude comprobado durante la prueba." },
    { label: "Salidas de pantalla", text: "Reiteradas salidas de la ventana de evaluación y pérdida de foco sin justificación." },
    { label: "Material no permitido", text: "Uso o consulta de material externo no autorizado durante el examen." },
    { label: "Anulación total", text: "Anulación de la evaluación por falta grave contra el código de honestidad académica." },
];

interface SubmissionPenaltyDialogProps {
    submission: any;
    courseId: string;
    studentName: string;
    trigger?: React.ReactNode;
    onSuccess?: (updated: { finalScore: number; baseScore: number; penalty: number; comment: string }) => void;
}

export function SubmissionPenaltyDialog({
    submission,
    courseId,
    studentName,
    trigger,
    onSuccess
}: SubmissionPenaltyDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefining, setIsRefining] = useState(false);

    // Obtener valores iniciales guardados
    const wildcards = (submission?.wildcardsUsed as any) || {};
    const existingPenalty = wildcards.penalty !== undefined ? Number(wildcards.penalty) : 0;
    const existingComment = wildcards.penaltyComment || "";

    // Base score: si ya había descuento, usar baseScore guardado; de lo contrario, el score actual
    const initialBaseScore = wildcards.baseScore !== undefined 
        ? Number(wildcards.baseScore) 
        : (submission?.score !== null && submission?.score !== undefined ? Number(submission.score) : 0);

    const [penalty, setPenalty] = useState<number>(existingPenalty);
    const [comment, setComment] = useState<string>(existingComment);

    const expulsions = submission?.expulsions || 0;
    const finalCalculatedScore = Math.max(0, Number((initialBaseScore - penalty).toFixed(2)));
    const isPassing = finalCalculatedScore >= 3.0;

    const handleApplyPredefined = (value: number) => {
        setPenalty(Math.min(initialBaseScore, value));
    };

    const handleCancelExam = () => {
        // Descontar toda la nota para que quede en 0.0
        setPenalty(initialBaseScore);
        if (!comment) {
            setComment("Anulación de prueba por fraude detectado durante la aplicación de la evaluación.");
        }
    };

    const handleReset = () => {
        setPenalty(0);
        setComment("");
    };

    const handleSave = async () => {
        if (penalty > 0 && !comment.trim()) {
            toast.error("Motivo obligatorio", {
                description: "Debes ingresar una justificación o comentario para el descuento de nota.",
            });
            return;
        }

        setIsSaving(true);
        try {
            const res = await updateSubmissionPenaltyAction(
                submission.id,
                penalty,
                comment.trim(),
                courseId
            );

            if (res.success) {
                const displayScore = res.finalScore !== undefined ? res.finalScore : finalCalculatedScore;
                toast.success(penalty > 0 ? "Penalización aplicada con éxito" : "Ajuste restablecido", {
                    description: `Nueva nota final: ${displayScore.toFixed(2)} / 5.0`,
                });
                onSuccess?.(res as any);
                setOpen(false);
            } else {
                toast.error("Error al aplicar el ajuste", {
                    description: res.error || "Ocurrió un error inesperado.",
                });
            }
        } catch (err: any) {
            toast.error("Error al guardar", {
                description: err.message || "Error al comunicarse con el servidor.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRefineWithAI = async () => {
        if (!comment.trim()) {
            toast.info("Ingresa un texto a corregir", {
                description: "Escribe el motivo para que la IA revise su ortografía, puntuación y redacción.",
            });
            return;
        }

        setIsRefining(true);
        try {
            const res = await refinePenaltyCommentAction(comment.trim());

            if (res.success && res.refinedComment) {
                setComment(res.refinedComment);
                toast.success("Redacción corregida", {
                    description: "Se ha corregido la ortografía y redacción del texto sin alterar su contenido.",
                });
            } else {
                toast.error("No se pudo corregir la redacción", {
                    description: res.error || "Intenta nuevamente.",
                });
            }
        } catch (err: any) {
            toast.error("Error al conectar con la IA", {
                description: err.message || "Error inesperado.",
            });
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                            >
                                <Gavel className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Descontar / Penalizar Nota por Fraude</p>
                    </TooltipContent>
                </Tooltip>
            )}

            <DialogContent className="sm:max-w-[540px] bg-card text-card-foreground border-border shadow-xl">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">
                                Ajuste y Penalización de Calificación
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Asigna un descuento de nota por fraude, pérdida de foco o incumplimiento de normas.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2 text-sm">
                    {/* Tarjeta de Resumen del Estudiante */}
                    <div className="p-3.5 rounded-xl border bg-muted/30 border-border/70 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Estudiante
                            </span>
                            <span className="font-bold text-sm text-foreground truncate block">
                                {studentName}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                                {submission?.user?.email}
                            </span>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Salidas / Pérdida Foco
                            </span>
                            <Badge variant="outline" className={`text-xs font-bold gap-1 ${
                                expulsions > 0 
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" 
                                    : "bg-muted/40 text-muted-foreground"
                            }`}>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>{expulsions} {expulsions === 1 ? 'falta' : 'faltas'}</span>
                            </Badge>
                        </div>
                    </div>

                    {/* Comparativa de Nota: Base vs Descuento vs Final */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="p-2.5 rounded-xl border bg-background/60 border-border/80 flex flex-col justify-between">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Nota Base Obtenida</span>
                            <span className="text-xl font-black font-mono my-1 text-foreground">
                                {initialBaseScore.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Original</span>
                        </div>

                        <div className="p-2.5 rounded-xl border bg-amber-500/5 border-amber-500/30 flex flex-col justify-between">
                            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Descuento</span>
                            <span className="text-xl font-black font-mono my-1 text-amber-600 dark:text-amber-400">
                                -{Number(penalty || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">A deducir</span>
                        </div>

                        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                            isPassing 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" 
                                : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                        }`}>
                            <span className="text-[10px] uppercase font-bold">Nota Final</span>
                            <span className="text-xl font-black font-mono my-1">
                                {finalCalculatedScore.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold">
                                {isPassing ? "Aprobado" : "Reprobado"}
                            </span>
                        </div>
                    </div>

                    {/* Entrada de Puntos a Descontar */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground">
                                Puntos a descontar (0.0 a {initialBaseScore.toFixed(1)}):
                            </label>
                            {penalty > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button 
                                            type="button" 
                                            onClick={handleReset}
                                            className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Restablecer a 0
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Restablecer descuento y recuperar la nota original del estudiante</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={penalty}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setPenalty(isNaN(val) ? 0 : Math.max(0, Math.min(5, val)));
                                }}
                                className="font-mono text-base font-bold h-9"
                                placeholder="0.0"
                            />
                        </div>

                        {/* Botones rápidos de penalización */}
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            <span className="text-[11px] text-muted-foreground mr-1">Rápido:</span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyPredefined(0.5)}
                                        className="h-6 px-2 text-[11px] rounded cursor-pointer"
                                    >
                                        -0.5
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Deducir 0.5 puntos de la nota</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyPredefined(1.0)}
                                        className="h-6 px-2 text-[11px] rounded cursor-pointer"
                                    >
                                        -1.0
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Deducir 1.0 punto de la nota</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyPredefined(2.0)}
                                        className="h-6 px-2 text-[11px] rounded cursor-pointer"
                                    >
                                        -2.0
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Deducir 2.0 puntos de la nota</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleCancelExam}
                                        className="h-6 px-2 text-[11px] rounded cursor-pointer gap-1"
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        Anular (Nota 0.0)
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Anular examen por fraude detectado (Nota final 0.00)</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Justificación o Comentario */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Motivo o justificación {penalty > 0 ? "*" : "(Opcional)"}:</span>
                            </label>

                            <div className="flex items-center gap-1.5">
                                {/* Menú de Plantillas predefinidas */}
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px] font-semibold gap-1 rounded cursor-pointer border-border/80 hover:bg-muted"
                                                >
                                                    <Bookmark className="w-3 h-3 text-primary" />
                                                    <span>Plantillas</span>
                                                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p>Insertar una plantilla institucional predefinida</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <DropdownMenuContent align="end" className="w-80 p-1.5 text-xs">
                                        <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                                            Plantillas de Justificación
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {PENALTY_TEMPLATES.map((tmpl, idx) => (
                                            <DropdownMenuItem
                                                key={idx}
                                                onClick={() => {
                                                    setComment(tmpl.text);
                                                    toast.info(`Plantilla cargada: ${tmpl.label}`);
                                                }}
                                                className="flex flex-col items-start gap-1 py-1.5 px-2 cursor-pointer focus:bg-accent"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-semibold text-xs text-foreground">{tmpl.label}</span>
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">{tmpl.category}</Badge>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                                    {tmpl.text}
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Botón tipo icono para corregir redacción con LLM del profesor */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isRefining || !comment.trim()}
                                            onClick={handleRefineWithAI}
                                            className="h-6 px-2 text-[11px] font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/30 rounded cursor-pointer disabled:opacity-40"
                                        >
                                            {isRefining ? (
                                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                            ) : (
                                                <Sparkles className="w-3 h-3 text-primary" />
                                            )}
                                            <span>{isRefining ? "Corrigiendo..." : "Corregir redacción"}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p>Corregir ortografía y redacción con el modelo IA del docente</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Chips rápidos de sugerencias */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-semibold">Rápido:</span>
                            {QUICK_TEMPLATE_CHIPS.map((chip, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setComment(chip.text)}
                                    className="text-[10px] font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/70 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Escribe el motivo (ej: 'fraude', 'salidas reiteradas') o selecciona una plantilla..."
                                rows={3}
                                className="text-xs leading-relaxed resize-none pr-9 bg-background focus:bg-background"
                            />
                            {/* Botón flotante tipo icono dentro del textarea */}
                            <div className="absolute right-2 bottom-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={isRefining || !comment.trim()}
                                            onClick={handleRefineWithAI}
                                            className="h-6 w-6 text-primary hover:bg-primary/15 rounded-md cursor-pointer disabled:opacity-30"
                                        >
                                            {isRefining ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                            ) : (
                                                <Wand2 className="w-3.5 h-3.5 text-primary" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                        <p>Pulir y corregir redacción con IA</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Este comentario quedará registrado en la auditoría y será visible en el informe de la evaluación.
                        </p>
                    </div>
                </div>

                <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between w-full">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(false)}
                        disabled={isSaving}
                        className="cursor-pointer text-xs"
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="cursor-pointer gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aplicar Descuento</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
