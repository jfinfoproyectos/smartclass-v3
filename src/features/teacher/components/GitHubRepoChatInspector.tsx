"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Github, Sparkles, Send, Loader2, Bot, User, Trash2, ShieldAlert, GitCommit, Search, RefreshCw, Copy, Check,
    Maximize2, Minimize2
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
    askRepoMcpQuestionAction, 
    getMcpChatHistoryAction, 
    deleteMcpChatHistoryAction 
} from "@/features/github/actions/githubMcpActions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatMarkdown(content: string): string {
    if (typeof content !== 'string') return content || "";
    let formatted = content.replace(/\\n/g, '\n');
    formatted = formatted.replace(/\|[ \t]*\|[ \t]*/g, '|\n|');
    formatted = formatted.replace(/\|[ \t]*(\|[-: ]+\|)/g, '|\n$1');
    return formatted;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    toolCallsCount?: number;
}

interface GitHubRepoChatInspectorProps {
    repoUrl: string;
    studentName?: string;
    activityId?: string;
    studentId?: string;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

const PRESET_QUESTIONS = [
    {
        label: "🔍 Auditoría de Commits",
        prompt: "¿El estudiante realizó commits progresivos o subió todo el código en un único commit masivo al final?",
        icon: GitCommit,
    },
    {
        label: "🛡️ Seguridad y Claves",
        prompt: "¿Hay alguna API Key, token de acceso o archivo confidencial expuesto en el código o historial?",
        icon: ShieldAlert,
    },
    {
        label: "📂 Estructura del Código",
        prompt: "Describe la estructura principal del repositorio y qué patrones de diseño o arquitectura utilizó el estudiante.",
        icon: Search,
    },
    {
        label: "🧪 Pruebas y Calidad",
        prompt: "¿El proyecto cuenta con pruebas unitarias/automatizadas y documentación adecuada en el README?",
        icon: Sparkles,
    },
];

export function GitHubRepoChatInspector({ 
    repoUrl, 
    studentName, 
    activityId, 
    studentId,
    isFullscreen,
    onToggleFullscreen
}: GitHubRepoChatInspectorProps) {
    const defaultWelcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `👋 **Asistente de Inspección GitHub MCP (docente)**\n\nPuedes hacerme cualquier pregunta técnica sobre el repositorio entregado ${studentName ? `por **${studentName}**` : ""}.\n\n> ⚠️ *Recuerda: Todas las respuestas aquí generadas son herramientas de investigación para ti y **no afectan la calificación ni la retroalimentación oficial**.*`,
        timestamp: new Date(),
    };

    const [messages, setMessages] = useState<Message[]>([defaultWelcomeMessage]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [isDeletingHistory, setIsDeletingHistory] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    // Cargar historial de conversación guardado en PostgreSQL si existen activityId y studentId
    useEffect(() => {
        if (!activityId || !studentId) return;

        let isMounted = true;
        setIsFetchingHistory(true);

        getMcpChatHistoryAction({ activityId, studentId })
            .then((res) => {
                if (!isMounted) return;
                if (res.success && Array.isArray(res.messages) && res.messages.length > 0) {
                    const loadedMsgs: Message[] = res.messages.map((m: any) => ({
                        id: m.id || String(Date.now()),
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                        toolCallsCount: m.toolCallsCount,
                    }));
                    setMessages(loadedMsgs);
                }
            })
            .catch((err) => console.error("Error al cargar historial MCP:", err))
            .finally(() => {
                if (isMounted) setIsFetchingHistory(false);
            });

        return () => {
            isMounted = false;
        };
    }, [activityId, studentId]);

    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (textToSend?: string) => {
        const query = textToSend || input.trim();
        if (!query || isLoading) return;

        const userMsgId = Date.now().toString();
        const userMsg: Message = {
            id: userMsgId,
            role: "user",
            content: query,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        if (!textToSend) setInput("");
        setIsLoading(true);

        try {
            // Historial para enviar al backend (excluyendo el mensaje de bienvenida inicial)
            const chatHistory = messages
                .filter((m) => m.id !== "welcome")
                .map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

            const res = await askRepoMcpQuestionAction({
                repoUrl,
                question: query,
                chatHistory,
                activityId,
                studentId,
            });

            if (!res.success) {
                toast.error(res.error || "Fallo en la consulta MCP");
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: `❌ **Error**: ${res.error || "No se pudo procesar la consulta."}`,
                        timestamp: new Date(),
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: res.answer || "No se obtuvo respuesta del servidor MCP.",
                        timestamp: new Date(),
                        toolCallsCount: res.toolCallsCount,
                    },
                ]);
            }
        } catch (err: any) {
            toast.error("Error conectando con la IA de inspección");
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: `❌ **Error de comunicación**: ${err.message || "Error al conectar con la API."}`,
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Copiado al portapapeles");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDeleteChat = async () => {
        setIsDeletingHistory(true);
        try {
            if (activityId && studentId) {
                const res = await deleteMcpChatHistoryAction({ activityId, studentId });
                if (!res.success) {
                    toast.error(res.error || "No se pudo eliminar la conversación.");
                    return;
                }
            }
            setMessages([
                {
                    id: "welcome-" + Date.now(),
                    role: "assistant",
                    content: "Conversación eliminada. Puedes realizar una nueva consulta sobre el repositorio.",
                    timestamp: new Date(),
                },
            ]);
            toast.success("Conversación eliminada de la base de datos.");
        } catch (err: any) {
            toast.error("Error al eliminar la conversación", { description: err.message });
        } finally {
            setIsDeletingHistory(false);
            setDeleteConfirmOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Header del Copiloto MCP */}
            <div className="p-3 sm:p-4 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Github className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm tracking-tight">Inspector GitHub MCP</h3>
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-mono">
                                Protocol MCP
                            </Badge>
                            {isFetchingHistory && (
                                <Badge variant="secondary" className="text-[10px] gap-1 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Inspección libre sin afectar calificación oficial
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {onToggleFullscreen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={onToggleFullscreen}
                            title={isFullscreen ? "Restaurar vista dividida" : "Pantalla completa para el inspector MCP"}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    )}

                    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Eliminar conversación de la base de datos"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar conversación guardada?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará permanentemente todo el historial de consultas de esta entrega guardado en la base de datos.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingHistory}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteChat();
                                    }}
                                    disabled={isDeletingHistory}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isDeletingHistory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Presets Rápidos */}
            <div className="p-2.5 bg-muted/20 border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-xs shrink-0">
                <span className="text-muted-foreground font-medium shrink-0 px-1">Sugerencias:</span>
                {PRESET_QUESTIONS.map((pq, idx) => {
                    const Icon = pq.icon;
                    return (
                        <button
                            key={idx}
                            disabled={isLoading}
                            onClick={() => handleSendMessage(pq.prompt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background hover:bg-accent border border-border text-foreground hover:text-accent-foreground text-[11px] whitespace-nowrap transition-colors disabled:opacity-50"
                        >
                            <Icon className="h-3 w-3 text-primary" />
                            {pq.label}
                        </button>
                    );
                })}
            </div>

            {/* Área de Mensajes Desplazable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                    {messages.map((msg) => {
                        const isUser = msg.role === "user";
                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                            >
                                {!isUser && (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}

                                <div className={`group relative max-w-[88%] rounded-2xl p-3.5 text-sm shadow-xs ${
                                    isUser
                                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                                        : "bg-muted/60 border border-border text-foreground rounded-tl-xs"
                                }`}>
                                    {!isUser && msg.toolCallsCount && msg.toolCallsCount > 0 ? (
                                        <div className="mb-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded border border-border">
                                            <Sparkles className="h-3 w-3 text-amber-500" />
                                            Herramientas MCP invocadas: {msg.toolCallsCount}
                                        </div>
                                    ) : null}

                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words text-xs sm:text-sm">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({ node, ...props }) => (
                                                    <div className="my-3 w-full overflow-x-auto rounded-lg border border-border bg-background/50">
                                                        <table className="w-full text-left text-xs border-collapse" {...props} />
                                                    </div>
                                                ),
                                                thead: ({ node, ...props }) => (
                                                    <thead className="bg-muted/80 border-b border-border font-bold text-foreground" {...props} />
                                                ),
                                                th: ({ node, ...props }) => (
                                                    <th className="px-3 py-2 border-r last:border-r-0 border-border font-semibold" {...props} />
                                                ),
                                                td: ({ node, ...props }) => (
                                                    <td className="px-3 py-2 border-t border-r last:border-r-0 border-border" {...props} />
                                                ),
                                            }}
                                        >
                                            {formatMarkdown(msg.content)}
                                        </ReactMarkdown>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] opacity-70">
                                        <span>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(msg.content, msg.id)}
                                            className="hover:opacity-100 flex items-center gap-1 transition-opacity"
                                            title="Copiar texto"
                                        >
                                            {copiedId === msg.id ? (
                                                <Check className="h-3 w-3 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {isUser && (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-xs p-3.5 text-sm flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>Ejecutando herramientas GitHub MCP y consultando repositorio...</span>
                            </div>
                        </div>
                    )}

                    <div ref={scrollBottomRef} />
                </div>
            </div>

            {/* Formulario de Entrada */}
            <div className="p-3 bg-background border-t border-border shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-center gap-2 max-w-3xl mx-auto"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta sobre el código o los commits..."
                        disabled={isLoading}
                        className="flex-1 bg-muted/30 focus-visible:ring-primary"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="shrink-0"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
