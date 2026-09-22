"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Sparkles,
    Bot,
    Send,
    Undo2,
    CheckCircle2,
    FolderGit2,
    FileCode,
    Terminal,
    FileText,
    AlertCircle,
    Check,
    Layers,
    SlidersHorizontal,
    GitBranch,
    ArrowRight
} from "lucide-react";
import { refineWorkshopStepsAction } from "@/features/teacher/actions/activityActions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface WorkshopMilestoneItem {
    id: string;
    title: string;
    instructions: string;
    starterCode?: string;
    expectedSolution?: string;
    requiresFile?: boolean;
    requiresGitCommands?: boolean;
    targetFilePath?: string;
    targetFileContent?: string;
    codeExplanation?: string;
    localVerification?: string;
    gitCommands?: Array<{ command: string; explanation: string }>;
    validationRule?: string;
    hints: string[];
    order: number;
}

interface AIModifyStepsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    steps: WorkshopMilestoneItem[];
    statement?: string;
    workshopType: "WORKSHOP_CODE" | "WORKSHOP_GITHUB";
    techStack?: string;
    onApply: (updatedSteps: WorkshopMilestoneItem[]) => void;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string;
}

const STEP_REFINEMENT_CHIPS = [
    "➕ Añadir paso de pruebas al final",
    "⚙️ Agregar paso inicial de setup / configuración",
    "🚫 Quitar archivos de pasos que son solo explicativos",
    "📝 Hacer las explicaciones más detalladas y paso a paso",
    "⚡ Reducir a menos pasos (más directo y conciso)",
    "🧩 Desglosar el paso más largo en dos pasos separados"
];

export function AIModifyStepsDialog({
    isOpen,
    onClose,
    steps,
    statement,
    workshopType,
    techStack,
    onApply
}: AIModifyStepsDialogProps) {
    const [currentSteps, setCurrentSteps] = useState<WorkshopMilestoneItem[]>(steps);
    const [history, setHistory] = useState<WorkshopMilestoneItem[][]>([steps]);
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Reinicializar cuando se abre el modal con los pasos actuales
    useEffect(() => {
        if (isOpen) {
            setCurrentSteps(steps);
            setHistory([steps]);
            setError(null);
            setChatInput("");
            setChatMessages([
                {
                    id: "welcome-steps-chat",
                    role: "assistant",
                    text: `He cargado la estructura actual de **${steps.length} pasos**. Puedes pedirme que agregue nuevos pasos, elimine o divida etapas, ajuste archivos o comandos Git, o reestructure el orden didáctico.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
            ]);
        }
    }, [isOpen, steps]);

    // Auto scroll en el chat
    useEffect(() => {
        if (chatMessages.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isRefining]);

    const handleSendMessage = async (customText?: string) => {
        const textToSend = (customText || chatInput).trim();
        if (!textToSend || isRefining) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            text: textToSend,
            timestamp: timeStr
        };

        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput("");
        setIsRefining(true);
        setError(null);

        try {
            const result = await refineWorkshopStepsAction({
                steps: currentSteps,
                instruction: textToSend,
                statement,
                workshopType,
                techStack
            });

            if (result && result.steps && result.steps.length > 0) {
                const newStepList = result.steps as WorkshopMilestoneItem[];
                setHistory((prev) => [...prev, newStepList]);
                setCurrentSteps(newStepList);

                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        text: result.message || `Estructura actualizada. Ahora el proyecto cuenta con ${newStepList.length} pasos.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    }
                ]);
                toast.success("Estructura de pasos adaptada con éxito");
            } else {
                throw new Error("No se obtuvieron pasos actualizados.");
            }
        } catch (err: any) {
            console.error("Error al adaptar pasos con IA:", err);
            const errMsg = err?.message || "No se pudo procesar la solicitud de adaptación.";
            setError(errMsg);
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `err-${Date.now()}`,
                    role: "assistant",
                    text: `⚠️ No se pudo aplicar el cambio: ${errMsg}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
            ]);
        } finally {
            setIsRefining(false);
        }
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = [...history];
        newHistory.pop();
        const previousVersion = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        setCurrentSteps(previousVersion);
        setChatMessages((prev) => [
            ...prev,
            {
                id: `undo-${Date.now()}`,
                role: "assistant",
                text: `↩️ Se ha revertido al cambio anterior (${previousVersion.length} pasos).`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
        ]);
        toast.info("Revertido a la versión anterior de pasos.");
    };

    const handleApply = () => {
        onApply(currentSteps);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-5xl! w-[94vw] h-[88vh] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border-border/80 shadow-2xl">
                {/* Header */}
                <DialogHeader className="px-5 py-3 border-b border-border bg-card/60 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold flex items-center gap-2">
                                    <span>Modificar Estructura de Pasos con Chat IA</span>
                                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                                        {workshopType === "WORKSHOP_GITHUB" ? "Tutorial GitHub" : "Codelab Monaco"}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                                    Chatea con la IA para agregar, eliminar, reordenar, dividir o ajustar los archivos y comandos de la secuencia de pasos.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Botón Aplicar en Header para acceso rápido */}
                        <div className="flex items-center gap-2">
                            {history.length > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUndo}
                                    disabled={isRefining}
                                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                                    title="Deshacer el último cambio de pasos"
                                >
                                    <Undo2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Deshacer</span>
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApply}
                                disabled={isRefining || currentSteps.length === 0}
                                className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-xs cursor-pointer"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Aplicar Estructura ({currentSteps.length} pasos)</span>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body: Split View (Chat izquierda, Pasos derecha) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden bg-background">
                    {/* Panel Izquierdo: Chat Interactivo (5 cols) */}
                    <div className="md:col-span-5 flex flex-col min-h-0 h-full bg-muted/20">
                        {/* Chips de sugerencias rápidas */}
                        <div className="p-2.5 border-b border-border/60 bg-card/40 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                Acciones Rápidas
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {STEP_REFINEMENT_CHIPS.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={isRefining}
                                        onClick={() => handleSendMessage(chip)}
                                        className="text-[11px] px-2 py-1 rounded-lg border border-border/70 bg-background/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-muted-foreground text-left cursor-pointer disabled:opacity-50"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Historial de Mensajes del Chat */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 custom-scrollbar">
                            {chatMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-2.5 max-w-[92%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px]",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-primary/15 text-primary border border-primary/20"
                                        )}
                                    >
                                        {msg.role === "user" ? "Tú" : <Bot className="h-3.5 w-3.5" />}
                                    </div>
                                    <div
                                        className={cn(
                                            "rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-2xs",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-xs"
                                                : "bg-card border border-border text-foreground rounded-tl-xs"
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        <span
                                            className={cn(
                                                "text-[9px] mt-1 block opacity-70",
                                                msg.role === "user" ? "text-primary-foreground/80 text-right" : "text-muted-foreground"
                                            )}
                                        >
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isRefining && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-xl bg-card border border-border w-fit animate-pulse">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    <span>Adaptando la estructura de pasos con IA...</span>
                                </div>
                            )}

                            {error && (
                                <div className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input de Chat */}
                        <div className="p-3 border-t border-border bg-card/60 shrink-0 space-y-1.5">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex gap-2 items-end"
                            >
                                <Textarea
                                    rows={2}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ej: Agrega un paso entre el 1 y 2 para configurar docker-compose, y quita git del paso 3..."
                                    disabled={isRefining}
                                    className="text-xs resize-none min-h-[44px] max-h-[100px] bg-background"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={isRefining || !chatInput.trim()}
                                    className="h-9 w-9 shrink-0 bg-primary text-primary-foreground cursor-pointer shadow-xs"
                                    title="Enviar instrucción a la IA"
                                >
                                    {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </form>
                            <span className="text-[10px] text-muted-foreground block text-right">
                                Presiona <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Enter</kbd> para enviar
                            </span>
                        </div>
                    </div>

                    {/* Panel Derecho: Vista en tiempo real de los Pasos (7 cols) */}
                    <div className="md:col-span-7 flex flex-col min-h-0 h-full bg-background">
                        {/* Barra de estado de los pasos */}
                        <div className="px-4 py-2.5 border-b border-border/70 bg-card/40 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold text-foreground">
                                    Estructura del Proyecto
                                </span>
                                <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.5">
                                    {currentSteps.length} {currentSteps.length === 1 ? "paso" : "pasos"}
                                </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                Vista previa actualizada en tiempo real
                            </span>
                        </div>

                        {/* Lista scrolleable de Pasos */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
                            {currentSteps.map((step, idx) => {
                                const hasFile = step.requiresFile !== false && Boolean(step.targetFilePath && step.targetFilePath.trim().length > 0);
                                const hasGit = step.requiresGitCommands !== false && Boolean(step.gitCommands && step.gitCommands.length > 0);

                                return (
                                    <div
                                        key={step.id || `step-preview-${idx}`}
                                        className="p-3.5 rounded-xl border border-border/80 bg-card/70 hover:bg-card hover:border-primary/40 transition-all shadow-2xs space-y-2 group"
                                    >
                                        {/* Header del Paso: Número, Título y Badges */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <span className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                                                        {step.title}
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Badges de archivo y git */}
                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                                {hasFile ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 font-mono border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                                        title={`Archivo objetivo: ${step.targetFilePath}`}
                                                    >
                                                        <FileCode className="h-3 w-3" />
                                                        <span className="max-w-[130px] truncate">{step.targetFilePath}</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 border-border bg-muted/50 text-muted-foreground"
                                                        title="Paso conceptual o explicativo sin archivo de código"
                                                    >
                                                        <FileText className="h-3 w-3" />
                                                        <span>Sin archivo</span>
                                                    </Badge>
                                                )}

                                                {hasGit ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                                        title={`${step.gitCommands?.length || 0} comandos Git incluidos`}
                                                    >
                                                        <Terminal className="h-3 w-3" />
                                                        <span>{step.gitCommands?.length} Git</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 border-border bg-muted/50 text-muted-foreground"
                                                    >
                                                        <span>Sin Git</span>
                                                    </Badge>
                                                )}

                                                {step.codeExplanation && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                        title="Incluye desglose y explicación didáctica del código"
                                                    >
                                                        <span>📘 Explicación</span>
                                                    </Badge>
                                                )}

                                                {step.localVerification && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] h-5 px-1.5 gap-1 border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                                                        title="Incluye instrucción de prueba local"
                                                    >
                                                        <span>🧪 Prueba local</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Instrucciones del Paso */}
                                        {step.instructions && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-8">
                                                {step.instructions.replace(/^[#*\s-]+/gm, "").trim()}
                                            </p>
                                        )}

                                        {/* Comandos Git si tiene */}
                                        {hasGit && step.gitCommands && step.gitCommands.length > 0 && (
                                            <div className="pl-8 pt-1 flex flex-wrap gap-1.5">
                                                {step.gitCommands.slice(0, 3).map((cmd, cIdx) => (
                                                    <code
                                                        key={cIdx}
                                                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 border border-border/60 text-foreground font-mono"
                                                    >
                                                        {cmd.command}
                                                    </code>
                                                ))}
                                                {step.gitCommands.length > 3 && (
                                                    <span className="text-[10px] text-muted-foreground self-center">
                                                        +{step.gitCommands.length - 3} más
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer del panel de pasos */}
                        <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between gap-3 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                className="text-xs h-8 cursor-pointer"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApply}
                                disabled={isRefining || currentSteps.length === 0}
                                className="text-xs font-bold h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                            >
                                <Check className="h-3.5 w-3.5" />
                                <span>Aplicar Cambios al Proyecto</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
