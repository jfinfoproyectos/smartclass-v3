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
import { MessageSquare, Send, Loader2, Sparkles, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { sendTeacherMessageAction } from "../actions/evaluationActions";

interface TeacherStudentMessageDialogProps {
    attemptId: string;
    evaluationId?: string;
    submissionId?: string;
    studentId?: string;
    studentName: string;
}

const QUICK_MESSAGES = [
    "⚠️ Por favor mantén el foco en la evaluación y la pantalla completa para evitar sanciones.",
    "📌 Revisa detenidamente el enunciado y las justificaciones de tus respuestas.",
    "⏰ Atención: Quedan pocos minutos antes del cierre definitivo de la prueba.",
    "🚨 Se han registrado advertencias de integridad en tu intento. Continúa con honestidad académica.",
];

export function TeacherStudentMessageDialog({
    attemptId,
    evaluationId,
    submissionId,
    studentId,
    studentName,
}: TeacherStudentMessageDialogProps) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await sendTeacherMessageAction({
                attemptId,
                evaluationId,
                submissionId,
                studentId,
                message: message.trim(),
            });

            if (res.success) {
                toast.success("Mensaje enviado con éxito", {
                    description: `El estudiante ${studentName} lo recibirá en tiempo real vía SSE con bloqueo de lectura de 10s.`,
                });
                setMessage("");
                setOpen(false);
            } else {
                toast.error("Error al enviar mensaje", {
                    description: res.error || "No se pudo transmitir el mensaje vía SSE.",
                });
            }
        } catch (err: any) {
            toast.error("Error inesperado", {
                description: err?.message || "Ocurrió un error al enviar el comunicado.",
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
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-colors"
                        >
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>Enviar mensaje prioritario en tiempo real (SSE)</p>
                </TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <span>Enviar Mensaje a {studentName}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        Este comunicado aparecerá instantáneamente en la pantalla del alumno vía <strong>SSE</strong>.
                        Se abrirá un modal de lectura obligatoria con un temporizador de <strong>10 segundos</strong> antes de permitirle continuar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>Mensaje para el estudiante</span>
                            <span className="text-[10px] text-muted-foreground">{message.length} caracteres</span>
                        </label>
                        <Textarea
                            placeholder="Escribe el mensaje o indicación que debe leer el estudiante..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="text-xs leading-relaxed resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Mensajes rápidos sugeridos:
                        </p>
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {QUICK_MESSAGES.map((msg, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setMessage(msg)}
                                    className="text-left text-[11px] p-2 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
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
                        onClick={handleSend}
                        disabled={!message.trim() || isSending}
                        className="text-xs font-semibold gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Enviar Vía SSE
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
