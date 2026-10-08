"use client";

import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Megaphone, Send, Loader2, Sparkles, Radio, Users } from "lucide-react";
import { toast } from "sonner";
import { sendTeacherMessageAction } from "../actions/evaluationActions";

interface TeacherBroadcastMessageDialogProps {
    attemptId: string;
    evaluationId?: string;
    evaluationTitle?: string;
    variant?: "default" | "outline" | "secondary" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

const BROADCAST_QUICK_MESSAGES = [
    "⏰ Atención: Quedan 10 minutos para finalizar la prueba. Administren bien su tiempo.",
    "⚠️ Recuerden revisar detenidamente todas sus respuestas y verificar que queden guardadas.",
    "🔇 Por favor mantengan silencio y concentración en la sala de evaluación.",
    "📌 Lean con atención cada pregunta y asegúrense de justificar claramente sus respuestas.",
    "🚨 Aviso de Integridad: Las salidas de la ventana del examen quedan registradas con telemetría.",
];

export function TeacherBroadcastMessageDialog({
    attemptId,
    evaluationId,
    evaluationTitle,
    variant = "outline",
    size = "sm",
    className,
}: TeacherBroadcastMessageDialogProps) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSendBroadcast = async () => {
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await sendTeacherMessageAction({
                attemptId,
                evaluationId,
                message: message.trim(),
            });

            if (res.success) {
                toast.success("Mensaje global transmitido con éxito", {
                    description: "Todos los estudiantes conectados recibirán la indicación instantáneamente vía SSE.",
                });
                setMessage("");
                setOpen(false);
            } else {
                toast.error("Error al transmitir mensaje global", {
                    description: res.error || "No se pudo emitir el comunicado a la sala.",
                });
            }
        } catch (err: any) {
            toast.error("Error inesperado", {
                description: err?.message || "Ocurrió un error al enviar el comunicado global.",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant={variant}
                            size={size}
                            className={className || "h-8.5 px-3 text-xs font-bold gap-1.5 rounded-xl border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-2xs cursor-pointer transition-all"}
                        >
                            <Megaphone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Mensaje a Todos</span>
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    <p>Transmitir un comunicado urgente a todos los alumnos en vivo vía SSE</p>
                </TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <span>Transmitir Mensaje a Todos los Estudiantes</span>
                            {evaluationTitle && (
                                <p className="text-xs font-normal text-muted-foreground truncate max-w-sm mt-0.5">
                                    {evaluationTitle}
                                </p>
                            )}
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                        Este aviso aparecerá instantáneamente en la pantalla de <strong>todos los estudiantes conectados</strong> mediante el canal SSE en tiempo real. Se desplegará un modal prioritario con lectura obligatoria de <strong>10 segundos</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                Mensaje para toda la clase
                            </span>
                            <span className="text-[10px] text-muted-foreground">{message.length} caracteres</span>
                        </label>
                        <Textarea
                            placeholder="Escribe el aviso o instrucción general que deben atender todos los estudiantes..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="text-xs leading-relaxed resize-none focus-visible:ring-blue-500/40"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Mensajes rápidos recomendados para el grupo:
                        </p>
                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {BROADCAST_QUICK_MESSAGES.map((msg, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setMessage(msg)}
                                    className="text-left text-[11px] p-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(false)}
                        disabled={isSending}
                        className="text-xs cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSendBroadcast}
                        disabled={!message.trim() || isSending}
                        className="text-xs font-bold gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Transmitiendo a la sala...
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Transmitir a Todos (SSE)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
