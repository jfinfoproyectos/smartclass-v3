"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FileText, Sparkles, Send, Loader2, Bot, User, Trash2,
    Copy, Check, Maximize2, Minimize2, History, Plus, ChevronDown,
    MessageSquare, Clock, ArrowDownRight, Users
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
    askPdfInspectorQuestionAction,
    getPdfChatHistoryAction,
    deletePdfChatHistoryAction,
    listPdfChatSessionsAction,
    PdfChatSessionSummary,
    PdfChatMessage,
} from "@/features/teacher/actions/pdfChatActions";
import { CategorizedQuestionSelector, DEFAULT_PDF_QUESTIONS } from "./CategorizedQuestionSelector";
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
}

interface PdfChatInspectorProps {
    pdfUrl: string;
    studentName?: string;
    activityId?: string;
    studentId?: string;
    statement?: string;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    onInsertObservation?: (text: string) => void;
    readOnly?: boolean;
}

function getWelcomeMessage(studentName?: string, groupName?: string | null): Message {
    return {
        id: "welcome",
        role: "assistant",
        content: `👋 **Asistente de Inspección de PDF (Gemini Multimodal)**\n\nTengo el documento PDF entregado ${studentName ? `por **${studentName}**` : ""}${groupName ? ` (Equipo: **${groupName}**)` : ""} cargado en mi contexto. Puedes hacerme cualquier consulta analítica, técnica o de verificación sobre su contenido.\n\n> 💡 *Selecciona preguntas del banco por categorías o formula consultas personalizadas. Puedes copiar o transferir cualquier respuesta a tus observaciones docentes oficiales.*`,
        timestamp: new Date(),
    };
}

export function PdfChatInspector({
    pdfUrl,
    studentName,
    activityId,
    studentId,
    statement = "",
    isFullscreen,
    onToggleFullscreen,
    onInsertObservation,
    readOnly = false,
}: PdfChatInspectorProps) {
    const [groupName, setGroupName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(studentName, null)]);
    const [sessions, setSessions] = useState<PdfChatSessionSummary[]>([]);
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
            const res = await getPdfChatHistoryAction({ activityId, studentId, chatId });
            if (res.success) {
                const gName = res.groupName || null;
                if (gName) setGroupName(gName);

                if (Array.isArray(res.messages) && res.messages.length > 0) {
                    const loadedMsgs: Message[] = res.messages.map((m: any) => ({
                        id: m.id || String(Date.now()),
                        role: m.role,
                        content: m.content,
                        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                    }));
                    setMessages(loadedMsgs);
                    setActiveChatId(chatId);
                } else {
                    setMessages([getWelcomeMessage(studentName, gName)]);
                    setActiveChatId(chatId);
                }
            }
        } catch (err) {
            console.error("Error cargando mensajes de la sesión PDF:", err);
            toast.error("No se pudo cargar la conversación seleccionada.");
        } finally {
            setIsFetchingHistory(false);
        }
    }, [activityId, studentId, studentName]);

    // Cargar la lista de sesiones históricas
    const refreshSessions = useCallback(async (autoSelectLatest = false) => {
        if (!activityId || !studentId) return;

        setIsFetchingHistory(true);
        try {
            const res = await listPdfChatSessionsAction({ activityId, studentId });
            if (res.success && Array.isArray(res.sessions)) {
                setSessions(res.sessions);
                const gName = res.groupName || null;
                if (gName) setGroupName(gName);

                if (autoSelectLatest) {
                    if (res.sessions.length > 0) {
                        await loadSessionMessages(res.sessions[0].id);
                    } else {
                        setActiveChatId(null);
                        setMessages([getWelcomeMessage(studentName, gName)]);
                    }
                }
            }
        } catch (err) {
            console.error("Error listando sesiones de chat PDF:", err);
        } finally {
            setIsFetchingHistory(false);
        }
    }, [activityId, studentId, loadSessionMessages, studentName]);

    // Carga inicial y cambio de estudiante/actividad
    useEffect(() => {
        refreshSessions(true);
    }, [activityId, studentId, refreshSessions]);

    // Auto-scroll al fondo
    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Iniciar una nueva conversación en limpio
    const handleStartNewChat = () => {
        if (isLoading) return;
        setActiveChatId(null);
        setMessages([getWelcomeMessage(studentName, groupName)]);
        setInput("");
        toast.info("Nueva sesión de consulta iniciada.");
    };

    // Enviar pregunta
    const handleSendMessage = async (textToSend?: string) => {
        if (readOnly) return;
        const query = textToSend || input.trim();
        if (!query || isLoading) return;

        if (!pdfUrl) {
            toast.error("No hay documento PDF disponible para este estudiante.");
            return;
        }

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
            const chatHistory: PdfChatMessage[] = messages
                .filter((m) => m.id !== "welcome")
                .map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp.toISOString(),
                }));

            const res = await askPdfInspectorQuestionAction({
                pdfUrl,
                question: query,
                chatHistory,
                activityId,
                studentId,
                statement,
                chatId: activeChatId || undefined,
            });

            if (!res.success) {
                toast.error(res.error || "Fallo en la consulta con Gemini");
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
                        content: res.answer || "No se obtuvo respuesta del modelo.",
                        timestamp: new Date(),
                    },
                ]);

                if (res.chatId && res.chatId !== activeChatId) {
                    setActiveChatId(res.chatId);
                }
                // Actualizar lista de sesiones
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

    // Confirmar eliminación
    const handleConfirmDelete = async () => {
        if (!deleteTarget || readOnly) return;
        setIsDeletingHistory(true);

        try {
            const targetChatId = deleteTarget.isAll ? undefined : deleteTarget.id;
            const res = await deletePdfChatHistoryAction({
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

            await refreshSessions(true);
        } catch (err: any) {
            toast.error("Error al eliminar la conversación", { description: err.message });
        } finally {
            setIsDeletingHistory(false);
        }
    };

    const currentSession = sessions.find((s) => s.id === activeChatId);

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            {/* Header del Inspector de PDF */}
            <div className="p-1.5 sm:p-2 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm tracking-tight truncate">
                                Inspector Interactivo del PDF
                            </h3>
                            <Badge variant="outline" className="text-[10px] bg-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20 font-mono shrink-0">
                                Gemini Multimodal
                            </Badge>
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
                            {groupName 
                                ? `Inspección del equipo ${groupName} sin afectar calificación oficial`
                                : "Inspección interactiva de PDF sin afectar calificación oficial"}
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
                                className="h-8 gap-1.5 text-xs font-semibold max-w-[200px] sm:max-w-[240px] truncate cursor-pointer"
                                title="Ver histórico de conversaciones"
                            >
                                <History className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
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
                                        className="gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
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
                                    No hay conversaciones guardadas aún.
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

                    {/* Botón Nueva Consulta */}
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs cursor-pointer"
                            onClick={handleStartNewChat}
                            title="Iniciar una nueva sesión de consulta en limpio"
                        >
                            <Plus className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span className="hidden sm:inline">Nueva</span>
                        </Button>
                    )}

                    {/* Botón Pantalla Completa */}
                    {onToggleFullscreen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={onToggleFullscreen}
                            title={isFullscreen ? "Restaurar vista dividida" : "Pantalla completa para el inspector de PDF"}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    )}

                    {/* Botón Eliminar Conversación Activa */}
                    {!readOnly && activeChatId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => setDeleteTarget({ id: activeChatId, title: currentSession?.title })}
                            title="Eliminar conversación activa de la base de datos"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Selector de Preguntas Organizado por Categorías */}
            {!readOnly && (
                <CategorizedQuestionSelector
                    scope="PDF"
                    initialQuestions={DEFAULT_PDF_QUESTIONS}
                    onSelectAndSend={(prompt) => handleSendMessage(prompt)}
                    onFillInput={(prompt) => setInput(prompt)}
                    currentInput={input}
                    isLoading={isLoading || !pdfUrl}
                />
            )}

            {/* Área de Mensajes Desplazable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2.5 sm:p-4 space-y-3">
                <div className="space-y-4 w-full">
                    {messages.map((msg) => {
                        const isUser = msg.role === "user";
                        const isWelcome = msg.id === "welcome";

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                            >
                                {!isUser && (
                                    <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                )}

                                <div className={`group relative ${isUser ? "max-w-[85%]" : "w-full max-w-full"} rounded-2xl p-3.5 text-sm shadow-xs ${
                                    isUser
                                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                                        : isWelcome
                                        ? "bg-muted/40 border border-border text-foreground rounded-tl-xs"
                                        : "bg-muted/60 border border-border text-foreground rounded-tl-xs"
                                }`}>
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

                                    {!isUser && (
                                        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-[10px] opacity-70">
                                            <span>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCopy(msg.content, msg.id)}
                                                    className="hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer text-muted-foreground hover:text-foreground"
                                                    title="Copiar respuesta"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                    <span>{copiedId === msg.id ? "Copiado" : "Copiar"}</span>
                                                </button>

                                                {onInsertObservation && !isWelcome && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onInsertObservation(msg.content);
                                                            toast.success("Insertado en Observaciones Docentes");
                                                        }}
                                                        className="hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-700 font-semibold"
                                                        title="Transferir a observaciones docentes oficiales"
                                                    >
                                                        <ArrowDownRight className="h-3 w-3" />
                                                        <span>Insertar en Observaciones</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isUser && (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border mt-0.5">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 animate-pulse">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-xs p-3.5 text-sm flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400" />
                                <span>Inspeccionando PDF con Gemini y generando respuesta técnica...</span>
                            </div>
                        </div>
                    )}

                    <div ref={scrollBottomRef} />
                </div>
            </div>

            {/* Pie / Entrada */}
            <div className="p-3 bg-background border-t border-border shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-center gap-2 w-full"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            pdfUrl
                                ? "Escribe tu pregunta sobre el contenido del PDF..."
                                : "No hay PDF disponible para consultar..."
                        }
                        disabled={isLoading || !pdfUrl}
                        className="flex-1 bg-muted/30 focus-visible:ring-sky-500 text-xs sm:text-sm h-10"
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !input.trim() || !pdfUrl}
                        size="icon"
                        className="h-10 w-10 bg-sky-600 hover:bg-sky-700 text-white shadow-xs shrink-0 cursor-pointer"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>

            {/* Diálogo de Confirmación de Eliminación */}
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
                                    ? "Esta acción eliminará permanentemente todas las conversaciones históricas sobre el PDF de este estudiante o equipo."
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
