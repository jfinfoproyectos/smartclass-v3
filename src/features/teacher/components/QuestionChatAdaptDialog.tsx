"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Sparkles,
    Bot,
    Check,
    Copy,
    RotateCcw,
    Type,
    Code2,
    CheckCircle2,
    Send,
    Undo2,
    User,
    Sparkle,
    MessageSquareQuote
} from "lucide-react";
import { useTheme } from "next-themes";
import { refineQuestionAction } from "@/features/teacher/actions/evaluationActions";
import { getTeacherCredentialsAction } from "@/app/teacher-actions";
import MDEditor from "@uiw/react-md-editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuestionChatAdaptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUseContent: (content: string) => void;
    initialContent: string;
    type: "Text" | "Code";
    language?: string;
    modelName?: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string;
}

const QUESTION_REFINEMENT_CHIPS = [
    "⚡ Simplificar y hacer más accesible",
    "📝 Resumir y acortar la extensión",
    "🔥 Subir el nivel de exigencia técnica",
    "🛡️ Añadir más casos límite y validaciones",
    "💡 Añadir ejemplos de entrada y salida",
    "🧩 Incluir plantilla base con comentarios TODO",
    "🎯 Enfocar en conceptos específicos y buenas prácticas"
];

export function QuestionChatAdaptDialog({
    isOpen,
    onClose,
    onUseContent,
    initialContent = "",
    type = "Text",
    language = "javascript",
    modelName = "IA"
}: QuestionChatAdaptDialogProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const [configuredModel, setConfiguredModel] = useState<string>(modelName);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string>(initialContent);
    const [historyVersions, setHistoryVersions] = useState<string[]>([]);
    const [previewTab, setPreviewTab] = useState<"rendered" | "raw">("rendered");
    const [copied, setCopied] = useState(false);

    // Chat state
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Load active teacher credentials/model
    useEffect(() => {
        if (isOpen) {
            getTeacherCredentialsAction()
                .then((creds) => {
                    if (creds?.aiModel) {
                        setConfiguredModel(creds.aiModel);
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    // Initialize content when dialog opens
    useEffect(() => {
        if (isOpen) {
            const content = initialContent && initialContent.trim().length > 0 
                ? initialContent 
                : "**Enunciado de la Pregunta**\n\nEscribe aquí...";
            
            setGeneratedContent(content);
            setHistoryVersions([content]);
            setChatMessages([
                {
                    id: "initial-loaded-msg",
                    role: "assistant",
                    text: "He cargado el enunciado actual de tu pregunta. Puedes usar este chat para pedirme cualquier cambio: por ejemplo, simplificar la pregunta, resumir, cambiar requerimientos, subir la dificultad técnica, agregar casos borde o añadir ejemplos de código.",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
            setChatInput("");
            setError(null);
        }
    }, [isOpen, initialContent]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatMessages.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isRefining]);

    // Continuous adaptation chat
    const handleRefineChat = async (customInstruction?: string) => {
        const textToSend = (customInstruction || chatInput).trim();
        if (!textToSend || !generatedContent || isRefining) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            const result = await refineQuestionAction(
                generatedContent,
                textToSend,
                type,
                language
            );

            if (result.error) {
                setError(result.error);
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `err-${Date.now()}`,
                        role: "assistant",
                        text: `⚠️ No pude aplicar el cambio: ${result.error}`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
            } else if (result.content) {
                setHistoryVersions((prev) => [...prev, result.content!]);
                setGeneratedContent(result.content);
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        text: `✓ He adaptado la pregunta según lo solicitado ("${textToSend.length > 60 ? textToSend.slice(0, 60) + '...' : textToSend}"). La vista previa se ha actualizado en tiempo real.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
                toast.success("Pregunta adaptada con éxito.");
            }
        } catch (err: any) {
            setError(err.message || "Error al adaptar la pregunta.");
        } finally {
            setIsRefining(false);
        }
    };

    // Undo to previous version
    const handleUndo = () => {
        if (historyVersions.length <= 1) return;
        const newHistory = [...historyVersions];
        newHistory.pop();
        const previousVersion = newHistory[newHistory.length - 1];
        setHistoryVersions(newHistory);
        setGeneratedContent(previousVersion);
        setChatMessages((prev) => [
            ...prev,
            {
                id: `undo-${Date.now()}`,
                role: "assistant",
                text: `↩️ Se ha revertido al cambio anterior (Versión ${newHistory.length}).`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        toast.info("Revertido a la versión anterior.");
    };

    // Reset to initial version
    const handleResetToInitial = () => {
        if (historyVersions.length <= 1) return;
        const original = historyVersions[0];
        setHistoryVersions([original]);
        setGeneratedContent(original);
        setChatMessages([
            {
                id: `reset-${Date.now()}`,
                role: "assistant",
                text: "🔄 Se ha restablecido el enunciado a la versión inicial.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        toast.info("Restablecido a la versión inicial.");
    };

    const handleApplyContent = () => {
        if (!generatedContent) return;
        onUseContent(generatedContent);
        toast.success("Enunciado actualizado en el editor.");
        handleClose();
    };

    const handleCopy = () => {
        if (!generatedContent) return;
        navigator.clipboard.writeText(generatedContent);
        setCopied(true);
        toast.success("Copiado al portapapeles");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setChatInput("");
        setChatMessages([]);
        setHistoryVersions([]);
        setError(null);
        setIsRefining(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isRefining) handleClose(); }}>
            <DialogContent className="!max-w-[98vw] w-[98vw] !h-[96vh] !max-h-[97vh] flex flex-col !p-0 !gap-0 overflow-hidden shadow-2xl border-border/70 rounded-2xl">
                {/* Header */}
                <DialogHeader className="px-4 sm:px-5 py-2.5 border-b border-border/60 bg-muted/20 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    Modificar Enunciado con Chat IA
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Adapta y perfecciona el resultado de forma interactiva conversando con la IA.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <Badge 
                                variant="outline" 
                                className={`text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5 ${
                                    type === "Text" 
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40" 
                                        : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/40"
                                }`}
                            >
                                {type === "Text" ? <Type className="h-3.5 w-3.5 text-blue-500" /> : <Code2 className="h-3.5 w-3.5 text-orange-500" />}
                                {type === "Text" ? "Pregunta de Texto" : `Código (${language})`}
                            </Badge>

                            <Badge 
                                variant="secondary" 
                                className="text-xs px-2.5 py-1 font-mono flex items-center gap-1.5 bg-muted text-muted-foreground border border-border/50"
                                title="Modelo de IA activo"
                            >
                                <Bot className="h-3.5 w-3.5 text-primary" />
                                {configuredModel}
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Content: 2 Columns */}
                <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col overflow-hidden">
                    <div className="flex flex-col lg:flex-row gap-3.5 flex-1 min-h-0 w-full items-stretch">
                        {/* Left Column: Markdown Preview */}
                        <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col h-full min-h-0 space-y-2 overflow-hidden">
                            <div className="flex items-center justify-between bg-muted/30 border border-border/60 px-3 py-1.5 rounded-xl shrink-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="default" className="text-[10px] font-mono gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Versión #{historyVersions.length}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                        className="h-6.5 text-xs px-2.5 gap-1 shadow-2xs"
                                    >
                                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                        {copied ? "Copiado" : "Copiar"}
                                    </Button>
                                </div>
                            </div>

                            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between pb-1 shrink-0">
                                    <span className="text-xs font-bold text-foreground">Documento Markdown</span>
                                    <TabsList className="h-6 bg-muted/80 p-0.5">
                                        <TabsTrigger value="rendered" className="text-[10px] h-5 px-2 font-semibold">
                                            Visualización
                                        </TabsTrigger>
                                        <TabsTrigger value="raw" className="text-[10px] h-5 px-2 font-semibold">
                                            Código
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="rendered" className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                                    <div 
                                        data-color-mode={mode}
                                        className="border border-border/80 rounded-xl p-3.5 bg-card text-card-foreground flex-1 min-h-0 h-full overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed shadow-inner custom-scrollbar [&_.wmde-markdown]:bg-transparent! [&_.wmde-markdown]:text-inherit!"
                                    >
                                        <MDEditor.Markdown 
                                            source={generatedContent} 
                                            style={{ background: "transparent", color: "inherit" }}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="raw" className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden data-[state=inactive]:hidden">
                                    <pre className="border border-border/80 rounded-xl p-3 bg-muted/40 font-mono text-[11px] text-foreground flex-1 min-h-0 h-full overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
                                        {generatedContent}
                                    </pre>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Right Column: Adaptation Chat */}
                        <div className="w-full lg:w-[42%] xl:w-[40%] flex flex-col h-full min-h-0 bg-card border border-border/70 rounded-2xl p-3 space-y-2 shadow-xs overflow-hidden">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/60 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <MessageSquareQuote className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground leading-tight">Chat de Adaptación</h4>
                                        <p className="text-[10px] text-muted-foreground">Pide ajustes continuos a la IA</p>
                                    </div>
                                </div>

                                {historyVersions.length > 1 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleUndo}
                                        disabled={isRefining}
                                        className="h-6 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground shrink-0"
                                        title="Revertir al cambio anterior"
                                    >
                                        <Undo2 className="h-3 w-3" />
                                        Deshacer
                                    </Button>
                                )}
                            </div>

                            {/* Chat Messages History */}
                            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 text-xs custom-scrollbar">
                                {chatMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "assistant" && (
                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                <Bot className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                        <div
                                            className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed text-[11px] ${
                                                msg.role === "user"
                                                    ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                                                    : "bg-muted/70 text-foreground border border-border/50 rounded-tl-xs"
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <span className={`text-[9px] block mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                        {msg.role === "user" && (
                                            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                                                <User className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isRefining && (
                                    <div className="flex gap-2 justify-start items-center text-xs text-muted-foreground p-2 bg-muted/40 rounded-xl animate-pulse">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                        <span className="text-[11px]">Adaptando la pregunta según tu solicitud...</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Quick Refinement Chips */}
                            <div className="space-y-1 pt-1 border-t border-border/50 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                    <Sparkle className="h-3 w-3 text-amber-500" /> Atajos rápidos:
                                </span>
                                <div className="flex flex-wrap gap-1 max-h-[54px] overflow-y-auto custom-scrollbar">
                                    {QUESTION_REFINEMENT_CHIPS.map((chip, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={isRefining}
                                            onClick={() => handleRefineChat(chip)}
                                            className="text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/60 hover:border-primary/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat Input Box */}
                            <div className="space-y-1 pt-0.5 shrink-0">
                                <div className="relative">
                                    <Textarea
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Escribe cómo deseas adaptar el enunciado... (ej: simplifica para principiantes, enfócate solo en arrays, o añade ejemplos de código)"
                                        disabled={isRefining}
                                        rows={2}
                                        className="text-xs resize-none pr-10 min-h-[48px] max-h-[64px] bg-background leading-relaxed"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleRefineChat();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleRefineChat()}
                                        disabled={!chatInput.trim() || isRefining}
                                        className="absolute right-1.5 bottom-1.5 h-7 w-7 p-0 bg-primary text-primary-foreground rounded-lg shadow-xs"
                                    >
                                        {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                                <span className="text-[9px] text-muted-foreground block text-right">
                                    Presiona Enter para enviar
                                </span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-2 bg-destructive/10 border border-destructive/20 text-destructive px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                            <span>⚠️ {error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-4 sm:px-5 py-2 sm:py-2.5 border-t border-border/60 bg-muted/10 gap-2 flex-row justify-between items-center shrink-0">
                    <div>
                        {historyVersions.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetToInitial}
                                disabled={isRefining}
                                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reiniciar con versión original
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleClose} 
                            disabled={isRefining} 
                            className="text-xs h-8"
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyContent}
                            disabled={isRefining}
                            className="text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm"
                        >
                            <Check className="h-3.5 w-3.5" />
                            Insertar en el Enunciado
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
