"use client";

import React, { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Unlock, Loader2, AlertTriangle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { toggleEvaluationLockAction } from "../actions/evaluationActions";

interface EvaluationLockToggleButtonProps {
    attemptId: string;
    initialIsLocked?: boolean;
    courseId?: string;
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    onLockChange?: (newIsLocked: boolean) => void;
}

export function EvaluationLockToggleButton({
    attemptId,
    initialIsLocked = false,
    courseId,
    variant,
    size = "sm",
    className,
    onLockChange,
}: EvaluationLockToggleButtonProps) {
    const [isLocked, setIsLocked] = useState(initialIsLocked);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Sync with prop if it updates from parent re-fetch
    React.useEffect(() => {
        setIsLocked(!!initialIsLocked);
    }, [initialIsLocked]);

    const handleConfirmToggle = async () => {
        const nextState = !isLocked;
        setIsLoading(true);
        try {
            const res = await toggleEvaluationLockAction({
                attemptId,
                isLocked: nextState,
                courseId,
            });

            if (res.success) {
                setIsLocked(nextState);
                if (onLockChange) onLockChange(nextState);

                if (nextState) {
                    toast.warning("Evaluación Bloqueada / Pausada", {
                        description: "La pantalla de todos los estudiantes ha sido bloqueada en tiempo real vía SSE. No podrán interactuar ni responder hasta que la desbloquees.",
                    });
                } else {
                    toast.success("Evaluación Desbloqueada / Reanudada", {
                        description: "La prueba ha sido reanudada. Todos los alumnos pueden continuar respondiendo con normalidad.",
                    });
                }
                setDialogOpen(false);
            } else {
                toast.error("Error al cambiar estado de la evaluación", {
                    description: res.error || "No se pudo actualizar el bloqueo.",
                });
            }
        } catch (err: any) {
            toast.error("Error inesperado", {
                description: err?.message || "Ocurrió un problema de comunicación.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant={variant || (isLocked ? "default" : "outline")}
                            size={size}
                            disabled={isLoading}
                            className={
                                className ||
                                (isLocked
                                    ? "h-8.5 px-3.5 text-xs font-bold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all animate-pulse"
                                    : "h-8.5 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-2xs cursor-pointer transition-all")
                            }
                        >
                            {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isLocked ? (
                                <Unlock className="h-3.5 w-3.5 text-white" />
                            ) : (
                                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                            <span>{isLocked ? "Desbloquear Evaluación" : "Bloquear Evaluación"}</span>
                        </Button>
                    </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    <p>
                        {isLocked
                            ? "Reanudar la evaluación para todos los estudiantes en tiempo real"
                            : "Pausar temporalmente la prueba y bloquear la pantalla de los estudiantes"}
                    </p>
                </TooltipContent>
            </Tooltip>

            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2.5 text-base font-bold">
                        {isLocked ? (
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <PlayCircle className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        )}
                        <span>{isLocked ? "¿Reanudar Evaluación en Vivo?" : "¿Bloquear Evaluación en Vivo?"}</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                        {isLocked ? (
                            <>
                                La evaluación se desbloqueará inmediatamente para todos los estudiantes conectados. La cortina de pausa desaparecerá de sus pantallas y podrán continuar trabajando en sus preguntas.
                            </>
                        ) : (
                            <>
                                Se desplegará una pantalla de bloqueo obligatoria en todos los dispositivos de los alumnos conectados vía <strong>SSE</strong>. Las respuestas guardadas permanecerán intactas, pero nadie podrá seguir respondiendo hasta que decidas reanudarla.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel disabled={isLoading} className="text-xs cursor-pointer">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirmToggle();
                        }}
                        disabled={isLoading}
                        className={`text-xs font-bold gap-1.5 cursor-pointer text-white ${
                            isLocked
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-amber-600 hover:bg-amber-700"
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Procesando...
                            </>
                        ) : isLocked ? (
                            <>
                                <Unlock className="w-3.5 h-3.5" />
                                Confirmar y Desbloquear
                            </>
                        ) : (
                            <>
                                <Lock className="w-3.5 h-3.5" />
                                Confirmar y Bloquear
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
