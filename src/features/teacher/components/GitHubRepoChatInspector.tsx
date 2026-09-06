"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Github, Sparkles, Send, Loader2, Bot, User, Trash2, ShieldAlert, GitCommit, Search,
    Copy, Check, Maximize2, Minimize2, History, Plus, ChevronDown, MessageSquare, Clock, Eye, Users
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
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
    askRepoMcpQuestionAction, 
    getMcpChatHistoryAction, 
    deleteMcpChatHistoryAction,
    listMcpChatSessionsAction,
    McpChatSessionSummary
} from "@/features/github/actions/githubMcpActions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    readOnly?: boolean;
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

function getWelcomeMessage(readOnly: boolean, studentName?: string, groupName?: string | null): Message {
    return {
        id: "welcome",
        role: "assistant",
        content: readOnly
            ? `👋 **Historial de Inspección GitHub MCP (estudiante)**\n\nAquí puedes consultar las auditorías y análisis técnicos realizados por tu docente sobre el repositorio de esta entrega${groupName ? ` (Equipo: **${groupName}**)` : ""}.\n\n> ℹ️ *Esta información es de carácter formativo y de consulta compartida para todo el equipo.*`
            : `👋 **Asistente de Inspección GitHub MCP (docente)**\n\nPuedes hacerme cualquier pregunta técnica sobre el repositorio entregado ${studentName ? `por **${studentName}**` : ""}${groupName ? ` (Equipo: **${groupName}**)` : ""}.\n\n> ⚠️ *Recuerda: Todas las respuestas aquí generadas se guardan en el historial para consulta y **no afectan la calificación oficial** a menos que tú lo decidas.*`,
        timestamp: new Date(),
    };
}

export function GitHubRepoChatInspector({ 
    repoUrl, 
    studentName, 
    activityId, 
    studentId,
    isFullscreen,
    onToggleFullscreen,
    readOnly = false,
}: GitHubRepoChatInspectorProps) {
    const [groupName, setGroupName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(readOnly, studentName, null)]);
    const [sessions, setSessions] = useState<McpChatSessionSummary[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [isDeletingHistory, setIsDeletingHistory] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id?: string; title?: string; isAll?: boolean } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    // Cargar mensajes de una sesión específica
    const loadSessionMessages = useCallback(async (chatId: string) => {
        if (!activityId || !studentId) return;
        setIsFetchingHistory(true);
        try {
            const res = await getMcpChatHistoryAction({ activityId, studentId, chatId });
            if (res.success) {
                const gName = (res as any).groupName || null;
                if (gName) {
                    setGroupName(gName);
                }
                if (Array.isArray(res.messages) && res.messages.length > 0) {
                    const loadedMsgs: Message[] = res.messages.map((m: any) => ({
                        id: m.id || String(Date.now()),
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                        toolCallsCount: m.toolCallsCount,
                    }));
                    setMessages(loadedMsgs);
                    setActiveChatId(chatId);
                } else {
                    setMessages([getWelcomeMessage(readOnly, studentName, gName)]);
                    setActiveChatId(chatId);
                }
            }
        } catch (err) {
            console.error("Error cargando mensajes de la sesión:", err);
            toast.error("No se pudo cargar la conversación seleccionada.");
        } finally {
            setIsFetchingHistory(false);
        }
    }, [activityId, studentId, readOnly, studentName]);

    // Cargar la lista de sesiones históricas
    const refreshSessions = useCallback(async (autoSelectLatest = false) => {
        if (!activityId || !studentId) return;

        setIsFetchingHistory(true);
        try {
            const res = await listMcpChatSessionsAction({ activityId, studentId });
            if (res.success && Array.isArray(res.sessions)) {
                setSessions(res.sessions);
                const gName = (res as any).groupName || null;
                if (gName) {
                    setGroupName(gName);
                }
                if (autoSelectLatest) {
                    if (res.sessions.length > 0) {
                        await loadSessionMessages(res.sessions[0].id);
                    } else {
                        setActiveChatId(null);
                        setMessages([getWelcomeMessage(readOnly, studentName, gName)]);
                    }
                }
            }
        } catch (err) {
            console.error("Error listando sesiones MCP:", err);
        } finally {
            setIsFetchingHistory(false);
        }
    }, [activityId, studentId, loadSessionMessages, readOnly, studentName]);

    // Carga inicial y cambio de estudiante/actividad
    useEffect(() => {
        refreshSessions(true);
    }, [activityId, studentId, refreshSessions]);

    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Iniciar una nueva conversación (modo docente)
    const handleStartNewChat = () => {
        if (isLoading) return;
        setActiveChatId(null);
        setMessages([getWelcomeMessage(readOnly, studentName, groupName)]);
        setInput("");
        toast.info("Nueva sesión de conversación iniciada.");
    };

    // Enviar pregunta
    const handleSendMessage = async (textToSend?: string) => {
        if (readOnly) return;
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
                chatId: activeChatId || undefined,
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

                if (res.chatId && res.chatId !== activeChatId) {
                    setActiveChatId(res.chatId);
                }
                // Actualizar la lista de sesiones
                await refreshSessions(false);
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

    // Ejecutar eliminación confirmada (solo docente)
    const handleConfirmDelete = async () => {
        if (!deleteTarget || readOnly) return;
        setIsDeletingHistory(true);

        try {
            const targetChatId = deleteTarget.isAll ? undefined : deleteTarget.id;
            const res = await deleteMcpChatHistoryAction({
                activityId,
                studentId,
                chatId: targetChatId,
            });

            if (!res.success) {
                toast.error(res.error || "No se pudo eliminar la conversación.");
                return;
            }

            toast.success(deleteTarget.isAll ? "Todas las conversaciones fueron eliminadas." : "Conversación histórica eliminada.");
            setDeleteTarget(null);

            // Refrescar y seleccionar la última o resetear
            await refreshSessions(true);
        } catch (err: any) {
            toast.error("Error al eliminar la conversación", { description: err.message });
        } finally {
            setIsDeletingHistory(false);
        }
    };

    // Sesión activa actual
    const currentSession = sessions.find((s) => s.id === activeChatId);

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Header del Inspector MCP */}
            <div className="p-1.5 sm:p-2 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Github className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm tracking-tight truncate">
                                {readOnly ? "Inspector de Repositorio" : "Inspector GitHub MCP"}
                            </h3>
                            {!readOnly && (
                                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-mono shrink-0">
                                    Protocol MCP
                                </Badge>
                            )}
                            {groupName && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 shrink-0 font-medium">
                                    <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Equipo: {groupName}</span>
                                </Badge>
                            )}
                            {isFetchingHistory && (
                                <Badge variant="secondary" className="text-[10px] gap-1 animate-pulse shrink-0">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {readOnly 
                                ? (groupName 
                                    ? `Histórico de consultas del docente para el equipo ${groupName}`
                                    : "Historial de consultas técnicas generadas por el docente")
                                : (groupName 
                                    ? `Inspección del equipo ${groupName} sin afectar calificación oficial`
                                    : "Inspección libre de repositorios sin afectar calificación oficial")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Selector de Histórico de Conversaciones */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold max-w-[200px] sm:max-w-[240px] truncate"
                                title="Ver histórico de conversaciones"
                            >
                                <History className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">
                                    {currentSession ? currentSession.title : `Historial (${sessions.length})`}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 sm:w-80 max-h-96 overflow-y-auto">
                            <DropdownMenuLabel className="text-xs flex items-center justify-between">
                                <span>Histórico de Conversaciones</span>
                                <Badge variant="outline" className="text-[10px]">{sessions.length}</Badge>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {!readOnly && (
                                <>
                                    <DropdownMenuItem
                                        onClick={handleStartNewChat}
                                        className="gap-2 text-xs font-semibold text-primary cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>+ Nueva Consulta / Sesión</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}

                            {sessions.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    <Clock className="h-6 w-6 mx-auto mb-1 opacity-40" />
                                    No hay conversaciones históricas guardadas aún.
                                </div>
                            ) : (
                                sessions.map((sess) => {
                                    const isSelected = sess.id === activeChatId;
                                    return (
                                        <div
                                            key={sess.id}
                                            className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                                                isSelected ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted/60"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => loadSessionMessages(sess.id)}
                                                className="flex-1 text-left min-w-0 pr-2 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate block font-medium">{sess.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                                    <span>{format(new Date(sess.createdAt), "dd MMM, HH:mm", { locale: es })}</span>
                                                    <span>•</span>
                                                    <span>{sess.messageCount} msgs</span>
                                                    {sess.studentName && sess.studentName !== studentName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[90px] text-foreground/75 font-medium">{sess.studentName}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </button>

                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTarget({ id: sess.id, title: sess.title });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0 cursor-pointer"
                                                    title="Eliminar esta conversación"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {!readOnly && sessions.length > 1 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setDeleteTarget({ isAll: true })}
                                        className="gap-2 text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Eliminar todo el historial</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Botón Nueva Consulta (docente) */}
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={handleStartNewChat}
                            title="Iniciar una nueva sesión de consulta en limpio"
                        >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline">Nueva</span>
                        </Button>
                    )}

                    {/* Botón Pantalla Completa */}
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

                    {/* Botón Eliminar Conversación Activa (docente) */}
                    {!readOnly && activeChatId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: activeChatId, title: currentSession?.title })}
                            title="Eliminar conversación activa de la base de datos"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Presets Rápidos (solo visible para docente para realizar consultas rápidas) */}
            {!readOnly && (
                <div className="p-2.5 bg-muted/20 border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-xs shrink-0">
                    <span className="text-muted-foreground font-medium shrink-0 px-1">Sugerencias:</span>
                    {PRESET_QUESTIONS.map((pq, idx) => {
                        const Icon = pq.icon;
                        return (
                            <button
                                key={idx}
                                disabled={isLoading}
                                onClick={() => handleSendMessage(pq.prompt)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background hover:bg-accent border border-border text-foreground hover:text-accent-foreground text-[11px] whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <Icon className="h-3 w-3 text-primary" />
                                {pq.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Área de Mensajes Desplazable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-1.5 sm:p-2 space-y-3">
                <div className="space-y-4 max-w-3xl mx-auto">
                    {/* Si está en modo estudiante y no hay sesiones guardadas */}
                    {readOnly && sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3 bg-muted/20 rounded-xl border border-dashed my-8">
                            <Bot className="h-10 w-10 text-muted-foreground/40" />
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm text-foreground">Aún no hay inspecciones registradas</h4>
                                <p className="text-xs max-w-sm">
                                    Tu docente aún no ha realizado consultas o análisis para esta entrega.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
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
                                                Herramientas utilizadas: {msg.toolCallsCount}
                                            </div>
                                        ) : null}

                                        <div className="prose prose-sm dark:prose-invert max-w-none break-words text-xs sm:text-sm">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    a: ({ node, ...props }) => (
                                                        <a
                                                            {...props}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary underline hover:opacity-80 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ),
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
                                                className="hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer"
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
                        })
                    )}

                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-xs p-3.5 text-sm flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>Ejecutando herramientas GitHub MCP y analizando repositorio...</span>
                            </div>
                        </div>
                    )}

                    <div ref={scrollBottomRef} />
                </div>
            </div>

            {/* Pie / Entrada */}
            <div className="p-3 bg-background border-t border-border shrink-0">
                {readOnly ? (
                    <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground text-center">
                        <Eye className="h-4 w-4 text-sky-500" />
                        <span>Visualizando histórico de conversación guardado • Modo solo lectura para el estudiante</span>
                    </div>
                ) : (
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
                            className="flex-1 bg-muted/30 focus-visible:ring-primary text-xs sm:text-sm"
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
                )}
            </div>

            {/* Diálogo de Confirmación de Eliminación (exclusivo profesor) */}
            {!readOnly && (
                <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {deleteTarget?.isAll 
                                    ? "¿Eliminar todo el historial de conversaciones?"
                                    : "¿Eliminar conversación guardada?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteTarget?.isAll
                                    ? "Esta acción eliminará permanentemente todas las conversaciones históricas de esta entrega guardadas en la base de datos."
                                    : `Esta acción eliminará la conversación "${deleteTarget?.title || "seleccionada"}" permanentemente.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletingHistory}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirmDelete();
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
            )}
        </div>
    );
}
