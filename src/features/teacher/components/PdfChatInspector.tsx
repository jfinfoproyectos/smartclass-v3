"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FileText, Sparkles, Send, Loader2, Bot, User, Trash2, Search, Copy, Check,
    HelpCircle, BookOpen, AlertTriangle, ArrowDownRight, ClipboardCheck
} from "lucide-react";
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
import { toast } from "sonner";
import {
    askPdfInspectorQuestionAction,
    getPdfChatHistoryAction,
    deletePdfChatHistoryAction,
    PdfChatMessage,
} from "@/features/teacher/actions/pdfChatActions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PdfChatInspectorProps {
    pdfUrl: string;
    studentName?: string;
    activityId?: string;
    studentId?: string;
    statement?: string;
    onInsertObservation?: (text: string) => void;
}

const PRESET_QUESTIONS = [
    {
        label: "📑 Cumplimiento de Rúbrica",
        prompt: "¿El documento cumple con todos los requerimientos y secciones solicitadas en el enunciado de la actividad?",
        icon: ClipboardCheck,
    },
    {
        label: "🔍 Síntesis y Conclusiones",
        prompt: "¿Cuáles son las conclusiones principales y los aportes más relevantes presentados en el informe?",
        icon: Search,
    },
    {
        label: "📚 Citas y Bibliografía",
        prompt: "¿El documento cita fuentes bibliográficas de manera adecuada (normas APA) y están sustentadas en el texto?",
        icon: BookOpen,
    },
    {
        label: "⚠️ Inconsistencias y Calidad",
        prompt: "¿Detectas inconsistencias conceptuales, errores graves de redacción o indicios de contenido superficial?",
        icon: AlertTriangle,
    },
    {
        label: "💡 Sugerencia de Calificación",
        prompt: "¿Qué calificación cuantitativa (de 0.0 a 5.0) sugerirías para este trabajo y cuáles son los motivos principales?",
        icon: Sparkles,
    },
];

export function PdfChatInspector({
    pdfUrl,
    studentName,
    activityId,
    studentId,
    statement = "",
    onInsertObservation,
}: PdfChatInspectorProps) {
    const defaultWelcomeMessage: PdfChatMessage = {
        id: "welcome",
        role: "assistant",
        content: `👋 **Asistente de Inspección de PDF (Gemini)**\n\nTengo el documento PDF entregado ${studentName ? `por **${studentName}**` : ""} cargado en mi contexto. Puedes hacerme cualquier consulta analítica, técnica o de verificación sobre su contenido.\n\n> 💡 *Usa las preguntas rápidas arriba o escribe tu propia consulta. Puedes transferir cualquier respuesta a tus observaciones docentes.*`,
        timestamp: new Date().toISOString(),
    };

    const [messages, setMessages] = useState<PdfChatMessage[]>([defaultWelcomeMessage]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [isDeletingHistory, setIsDeletingHistory] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    // Cargar historial previo
    useEffect(() => {
        if (!activityId || !studentId) return;

        let isMounted = true;
        setIsFetchingHistory(true);

        getPdfChatHistoryAction({ activityId, studentId })
            .then((res) => {
                if (!isMounted) return;
                if (res.success && Array.isArray(res.messages) && res.messages.length > 0) {
                    setMessages([defaultWelcomeMessage, ...res.messages]);
                }
            })
            .catch((err) => {
                console.error("Error al cargar historial:", err);
            })
            .finally(() => {
                if (isMounted) setIsFetchingHistory(false);
            });

        return () => {
            isMounted = false;
        };
    }, [activityId, studentId]);

    // Auto-scroll
    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (customPrompt?: string) => {
        const textToSend = customPrompt || input.trim();
        if (!textToSend || isLoading) return;

        if (!pdfUrl) {
            toast.error("No hay documento PDF disponible para este estudiante.");
            return;
        }

        const userMsg: PdfChatMessage = {
            id: "user-" + Date.now(),
            role: "user",
            content: textToSend,
            timestamp: new Date().toISOString(),
        };

        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInput("");
        setIsLoading(true);

        try {
            const res = await askPdfInspectorQuestionAction({
                pdfUrl,
                question: textToSend,
                chatHistory: messages.filter((m) => m.id !== "welcome"),
                activityId,
                studentId,
                statement,
            });

            if (res.success && res.answer) {
                const asstMsg: PdfChatMessage = {
                    id: "asst-" + Date.now(),
                    role: "assistant",
                    content: res.answer,
                    timestamp: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, asstMsg]);
            } else {
                toast.error("Error al consultar al asistente", {
                    description: res.error || "No se pudo obtener respuesta.",
                });
            }
        } catch (error: any) {
            toast.error("Error al enviar mensaje", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyMessage = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success("Respuesta copiada al portapapeles");
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error("No se pudo copiar el texto");
        }
    };

    const handleClearHistory = async () => {
        if (!activityId || !studentId) {
            setMessages([defaultWelcomeMessage]);
            toast.success("Historial reiniciado");
            return;
        }

        setIsDeletingHistory(true);
        try {
            const res = await deletePdfChatHistoryAction({ activityId, studentId });
            if (res.success) {
                setMessages([defaultWelcomeMessage]);
                toast.success("Conversación eliminada");
            } else {
                toast.error("Error al eliminar conversación");
            }
        } catch (err: any) {
            toast.error("Error al limpiar historial", { description: err.message });
        } finally {
            setIsDeletingHistory(false);
            setDeleteConfirmOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-card rounded-xl overflow-hidden min-h-0">
            {/* Top Toolbar */}
            <div className="p-3 bg-muted/20 border-b flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate flex items-center gap-1.5">
                            Inspector Interactivo del PDF
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30">
                                Gemini Multimodal
                            </Badge>
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                            Haz consultas analíticas o pide citas específicas sobre este documento.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {messages.length > 1 && (
                        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                                    title="Limpiar historial de conversación"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Limpiar</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar historial de esta conversación?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se borrarán todos los mensajes intercambiados sobre el PDF de este estudiante. Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleClearHistory}
                                        disabled={isDeletingHistory}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {isDeletingHistory ? "Eliminando..." : "Eliminar"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            {/* Quick Preset Questions Bar */}
            <div className="p-2 border-b bg-muted/10 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 shrink-0 flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" /> Rápidas:
                </span>
                {PRESET_QUESTIONS.map((q, idx) => (
                    <button
                        key={idx}
                        type="button"
                        disabled={isLoading || !pdfUrl}
                        onClick={() => handleSendMessage(q.prompt)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-background hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/60 transition-colors shrink-0 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-2xs"
                        title={q.prompt}
                    >
                        <q.icon className="h-3 w-3" />
                        <span>{q.label}</span>
                    </button>
                ))}
            </div>

            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isFetchingHistory && (
                    <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Cargando conversación previa...</span>
                    </div>
                )}

                {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const isWelcome = msg.id === "welcome";

                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} group`}
                        >
                            {!isUser && (
                                <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 mt-0.5 border border-sky-500/20">
                                    <Bot className="h-4 w-4" />
                                </div>
                            )}

                            <div
                                className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 text-xs shadow-2xs ${
                                    isUser
                                        ? "bg-primary text-primary-foreground rounded-br-xs"
                                        : isWelcome
                                        ? "bg-muted/40 border text-foreground rounded-bl-xs"
                                        : "bg-background border text-foreground rounded-bl-xs"
                                }`}
                            >
                                <div className="leading-relaxed break-words prose prose-sm dark:prose-invert max-w-none text-xs [&_pre]:bg-slate-900 [&_pre]:text-slate-50 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_code]:text-primary [&_ul]:my-1.5 [&_ol]:my-1.5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>

                                {!isUser && !isWelcome && (
                                    <div className="flex items-center justify-end gap-1.5 pt-2 mt-2 border-t border-border/40 text-[10px]">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                                        >
                                            {copiedId === msg.id ? (
                                                <Check className="h-3 w-3 text-emerald-600" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                            <span>{copiedId === msg.id ? "Copiado" : "Copiar"}</span>
                                        </button>

                                        {onInsertObservation && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onInsertObservation(msg.content);
                                                    toast.success("Insertado en Observaciones Docentes");
                                                }}
                                                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-purple-50 dark:hover:bg-purple-950/30 font-semibold"
                                                title="Añadir esta respuesta como retroalimentación oficial del docente"
                                            >
                                                <ArrowDownRight className="h-3 w-3" />
                                                <span>Insertar en Observaciones</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isUser && (
                                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                                    <User className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex gap-2.5 items-start">
                        <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 border border-sky-500/20">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-background border rounded-2xl rounded-bl-xs p-3 text-xs shadow-2xs flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                            <span>Inspeccionando PDF y redactando respuesta...</span>
                        </div>
                    </div>
                )}

                <div ref={scrollBottomRef} />
            </div>

            {/* Input Bar */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                }}
                className="p-3 border-t bg-muted/20 flex items-center gap-2 shrink-0"
            >
                <Input
                    placeholder={
                        pdfUrl
                            ? "Escribe una pregunta sobre el PDF (ej: ¿Cumple con la estructura de introducción y conclusiones?)..."
                            : "No hay PDF disponible para consultar..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || !pdfUrl}
                    className="h-10 text-xs bg-background border-border/80 focus-visible:ring-sky-500"
                />
                <Button
                    type="submit"
                    disabled={isLoading || !input.trim() || !pdfUrl}
                    className="h-10 px-4 gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs shrink-0"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="hidden sm:inline">Preguntar</span>
                </Button>
            </form>
        </div>
    );
}
