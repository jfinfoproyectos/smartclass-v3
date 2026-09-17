"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    Github, 
    Bot, 
    Sparkles, 
    Send, 
    Loader2, 
    History, 
    Plus, 
    Trash2, 
    Copy, 
    Check, 
    Download, 
    Maximize2, 
    Minimize2, 
    ChevronDown, 
    ExternalLink, 
    GitBranch, 
    KeyRound, 
    Laptop, 
    MessageSquare, 
    CheckCircle2, 
    FolderGit2, 
    SlidersHorizontal,
    Code2,
    ShieldCheck,
    RotateCcw,
    Clock,
    FileText,
    FileDown,
    Layers,
    User,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
    askRepoMcpQuestionAction, 
    connectRepoForChatAction 
} from "../../actions/githubMcpActions";
import { CategorizedQuestionSelector } from "@/features/teacher/components/CategorizedQuestionSelector";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    toolCallsCount?: number;
}

interface InMemChatSession {
    id: string;
    title: string;
    repoUrl: string;
    branch: string;
    createdAt: string;
    messages: ChatMessage[];
}

interface GitChatToolViewProps {
    initialRepoUrl?: string;
    localAccount?: {
        hasLocalAccount: boolean;
        name: string | null;
        email: string | null;
        label: string;
    };
    hasUserGithubToken?: boolean;
    tokenSource?: "personal" | "system" | "env" | "none";
}

function formatMarkdown(content: string): string {
    if (typeof content !== "string") return content || "";
    let formatted = content.replace(/\\n/g, "\n");
    formatted = formatted.replace(/\|[ \t]*\|[ \t]*/g, "|\n|");
    formatted = formatted.replace(/\|[ \t]*(\|[-: ]+\|)/g, "|\n$1");
    return formatted;
}

const QUICK_SUGGESTIONS = [
    { label: "smartclassv3", url: "https://github.com/JhonFaustinoCaceres/smartclassv3" },
    { label: "AcademixV2", url: "https://github.com/JhonFaustinoCaceres/AcademixV2" },
    { label: "React (FB)", url: "https://github.com/facebook/react" },
    { label: "Next.js", url: "https://github.com/vercel/next.js" },
];

const QUICK_PROMPT_PILLS = [
    { label: "🏛️ Arquitectura & Stack", prompt: "¿Cuál es la arquitectura principal y qué stack de tecnologías y librerías utiliza este proyecto?" },
    { label: "🔍 Auditoría de Commits", prompt: "Inspecciona el historial de commits recientes con autores, fechas y resume si siguen buenas prácticas." },
    { label: "🛡️ Seguridad & Secretos", prompt: "¿Existen archivos sensibles, claves API, tokens o variables de entorno expuestas sin ignorar?" },
    { label: "📦 Dependencias Clave", prompt: "¿Qué dependencias y paquetes esenciales utiliza el proyecto y para qué sirve cada uno?" },
    { label: "📂 Estructura de Carpetas", prompt: "Lista y explica la estructura general de carpetas y el propósito de cada módulo principal." },
];

export function GitChatToolView({
    initialRepoUrl = "",
    localAccount,
    hasUserGithubToken = false,
    tokenSource = "none",
}: GitChatToolViewProps) {
    const router = useRouter();

    // Repository connection states
    const [repoUrlInput, setRepoUrlInput] = useState<string>(initialRepoUrl);
    const [connectedRepo, setConnectedRepo] = useState<{
        owner: string;
        repo: string;
        fullName: string;
        url: string;
        activeBranch: string;
        branches: string[];
    } | null>(null);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [customToken, setCustomToken] = useState<string>("");
    const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

    // In-memory sessions (NO DATABASE WRITE)
    const [sessions, setSessions] = useState<InMemChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

    const scrollBottomRef = useRef<HTMLDivElement>(null);

    // Initialize in-memory session when connected to a repo
    const initSessionForRepo = useCallback((fullName: string, currentBranch: string, repoUrl: string) => {
        const welcomeMessage: ChatMessage = {
            id: "welcome-" + Date.now(),
            role: "assistant",
            content: `👋 ¡Hola! Soy el **Asistente de Inspección GitHub MCP** conectado a [**${fullName}**](${repoUrl}) en la rama \`${currentBranch}\`.\n\nPuedo ejecutar herramientas MCP en tiempo real para:\n- 📂 **Estructura**: Listar carpetas y archivos del proyecto.\n- 📄 **Código**: Leer y analizar el contenido de cualquier archivo específico.\n- 🔍 **Búsqueda**: Encontrar funciones, clases y patrones de código.\n- 📜 **Git Commits**: Inspeccionar hashes, autores, fechas y mensajes de commit.\n- 🛡️ **Seguridad**: Auditar secretos, tokens y dependencias.\n\n> ℹ️ *Esta sesión opera de forma transitoria en memoria (no se guarda nada en la base de datos). Puedes exportar la conversación a Markdown o PDF corporativo en cualquier momento.*`,
            timestamp: new Date().toISOString(),
        };

        const newSession: InMemChatSession = {
            id: "sess-" + Date.now(),
            title: `Consulta - ${currentBranch}`,
            repoUrl,
            branch: currentBranch,
            createdAt: new Date().toISOString(),
            messages: [welcomeMessage],
        };

        setSessions([newSession]);
        setActiveSessionId(newSession.id);
        setMessages([welcomeMessage]);
    }, []);

    // Auto-scroll
    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Auto-connect if initialRepoUrl is provided
    useEffect(() => {
        if (initialRepoUrl && !connectedRepo) {
            handleConnectRepo(initialRepoUrl);
        }
    }, [initialRepoUrl]);

    // Connect to GitHub Repository
    const handleConnectRepo = async (targetUrl?: string) => {
        const urlToConnect = (targetUrl || repoUrlInput).trim();
        if (!urlToConnect) {
            toast.error("Por favor ingresa la URL del repositorio.");
            return;
        }

        setIsConnecting(true);
        try {
            const res = await connectRepoForChatAction({
                repoUrl: urlToConnect,
                customToken: customToken.trim() || undefined,
            });

            if (!res.success) {
                toast.error(res.error || "No se pudo conectar con el repositorio.");
                return;
            }

            const activeBranch = res.activeBranch || res.defaultBranch || "main";
            const branches = res.branches && res.branches.length > 0 ? res.branches : [activeBranch];

            const newRepo = {
                owner: res.owner,
                repo: res.repo,
                fullName: res.fullName || `${res.owner}/${res.repo}`,
                url: urlToConnect.startsWith("http") ? urlToConnect : `https://github.com/${res.owner}/${res.repo}`,
                activeBranch,
                branches,
            };

            setConnectedRepo(newRepo);
            setRepoUrlInput(newRepo.url);
            toast.success(`Conectado a ${newRepo.fullName}`);

            // Initialize in-memory session
            initSessionForRepo(newRepo.fullName, newRepo.activeBranch, newRepo.url);
        } catch (err: any) {
            toast.error(err.message || "Error al verificar el repositorio.");
        } finally {
            setIsConnecting(false);
        }
    };

    // Switch branch
    const handleChangeBranch = (newBranch: string) => {
        if (!connectedRepo || newBranch === connectedRepo.activeBranch) return;

        const updatedRepo = {
            ...connectedRepo,
            activeBranch: newBranch,
        };
        setConnectedRepo(updatedRepo);
        toast.info(`Cambiado a rama: ${newBranch}`);

        const branchMsg: ChatMessage = {
            id: "branch-change-" + Date.now(),
            role: "assistant",
            content: `🔀 **Rama cambiada**: Ahora consultando en la rama \`${newBranch}\`. Las siguientes herramientas MCP inspeccionarán los archivos y commits de esta rama.`,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...messages, branchMsg];
        setMessages(updatedMessages);

        if (activeSessionId) {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === activeSessionId
                        ? { ...s, branch: newBranch, messages: updatedMessages }
                        : s
                )
            );
        }
    };

    // Start fresh in-memory chat session
    const handleStartNewSession = () => {
        if (!connectedRepo || isLoading) return;

        const welcomeMessage: ChatMessage = {
            id: "welcome-" + Date.now(),
            role: "assistant",
            content: `👋 Nueva conversación iniciada para **${connectedRepo.fullName}** (\`${connectedRepo.activeBranch}\`). Puedes hacerme cualquier consulta técnica con herramientas MCP.`,
            timestamp: new Date().toISOString(),
        };

        const newSession: InMemChatSession = {
            id: "sess-" + Date.now(),
            title: `Conversación ${sessions.length + 1}`,
            repoUrl: connectedRepo.url,
            branch: connectedRepo.activeBranch,
            createdAt: new Date().toISOString(),
            messages: [welcomeMessage],
        };

        setSessions([newSession, ...sessions]);
        setActiveSessionId(newSession.id);
        setMessages([welcomeMessage]);
        setInput("");
        toast.success("Nueva conversación iniciada (en memoria)");
    };

    // Switch session
    const handleSelectSession = (sessionId: string) => {
        const target = sessions.find((s) => s.id === sessionId);
        if (!target) return;

        setActiveSessionId(target.id);
        setMessages(target.messages);
        if (connectedRepo && target.branch && target.branch !== connectedRepo.activeBranch) {
            setConnectedRepo({
                ...connectedRepo,
                activeBranch: target.branch,
            });
        }
    };

    // Send question to GitHub MCP (zero DB persistence)
    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || input).trim();
        if (!query || isLoading || !connectedRepo) return;

        const userMsg: ChatMessage = {
            id: "user-" + Date.now(),
            role: "user",
            content: query,
            timestamp: new Date().toISOString(),
        };

        const updatedMessagesWithUser = [...messages, userMsg];
        setMessages(updatedMessagesWithUser);
        if (!textToSend) setInput("");
        setIsLoading(true);

        try {
            const chatHistory = updatedMessagesWithUser
                .filter((m) => !m.id.startsWith("welcome") && !m.id.startsWith("branch-change"))
                .map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

            // Notice activityId and studentId are NOT provided, ensuring ZERO database persistence
            const res = await askRepoMcpQuestionAction({
                repoUrl: connectedRepo.url,
                question: query,
                chatHistory,
                branch: connectedRepo.activeBranch,
                customToken: customToken.trim() || undefined,
            });

            if (!res.success) {
                const errorMsg: ChatMessage = {
                    id: "error-" + Date.now(),
                    role: "assistant",
                    content: `❌ **Error al consultar MCP:** ${res.error || "No se pudo obtener respuesta del servidor de inspección."}`,
                    timestamp: new Date().toISOString(),
                };
                const finalMessages = [...updatedMessagesWithUser, errorMsg];
                setMessages(finalMessages);
                updateActiveSession(finalMessages);
                toast.error(res.error || "Fallo en la consulta MCP");
            } else {
                const assistantMsg: ChatMessage = {
                    id: "asst-" + Date.now(),
                    role: "assistant",
                    content: res.answer || "Consulta completada con éxito.",
                    timestamp: new Date().toISOString(),
                    toolCallsCount: res.toolCallsCount,
                };
                const finalMessages = [...updatedMessagesWithUser, assistantMsg];
                setMessages(finalMessages);
                updateActiveSession(finalMessages, query);
            }
        } catch (err: any) {
            console.error("Error invoking MCP question:", err);
            const commErrorMsg: ChatMessage = {
                id: "comm-error-" + Date.now(),
                role: "assistant",
                content: `❌ **Error de comunicación:** ${err.message || "Error al conectar con la API de IA."}`,
                timestamp: new Date().toISOString(),
            };
            const finalMessages = [...updatedMessagesWithUser, commErrorMsg];
            setMessages(finalMessages);
            updateActiveSession(finalMessages);
            toast.error("Error al procesar la consulta con el servidor MCP");
        } finally {
            setIsLoading(false);
        }
    };

    // Update session in memory
    const updateActiveSession = (newMessages: ChatMessage[], newPromptForTitle?: string) => {
        if (!connectedRepo || !activeSessionId) return;

        setSessions((prev) =>
            prev.map((s) => {
                if (s.id === activeSessionId) {
                    let title = s.title;
                    if (newPromptForTitle && (s.title.startsWith("Consulta") || s.title.startsWith("Conversación"))) {
                        title = newPromptForTitle.length > 35
                            ? newPromptForTitle.slice(0, 35).trim() + "..."
                            : newPromptForTitle.trim();
                    }
                    return {
                        ...s,
                        title,
                        messages: newMessages,
                    };
                }
                return s;
            })
        );
    };

    // Export conversation to Markdown
    const handleExportMarkdown = () => {
        if (!connectedRepo || messages.length === 0) return;

        const currentSession = sessions.find((s) => s.id === activeSessionId);
        let md = `# Reporte de Auditoría e Inspección GitHub MCP\n\n`;
        md += `- **Repositorio:** [${connectedRepo.fullName}](${connectedRepo.url})\n`;
        md += `- **Rama Consultada:** \`${connectedRepo.activeBranch}\`\n`;
        md += `- **Fecha de Exportación:** ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}\n`;
        md += `- **Herramienta:** SmartClass GitHub MCP Inspector (Modo en memoria)\n\n`;
        md += `---\n\n`;

        messages.forEach((msg) => {
            const roleName = msg.role === "user" ? "👨‍🏫 Docente / Auditor" : "🤖 Asistente GitHub MCP";
            const time = format(new Date(msg.timestamp), "HH:mm:ss");
            md += `### ${roleName} (${time})\n\n`;
            if (msg.toolCallsCount && msg.toolCallsCount > 0) {
                md += `> ⚡ *Herramientas MCP invocadas: ${msg.toolCallsCount}*\n\n`;
            }
            md += `${msg.content}\n\n`;
            md += `---\n\n`;
        });

        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `Reporte_MCP_${connectedRepo.repo}_${format(new Date(), "yyyyMMdd-HHmm")}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        toast.success("Conversación exportada a archivo Markdown (.md)");
    };

    // Export conversation to Corporate PDF
    const handleExportPdf = async () => {
        if (!connectedRepo || messages.length === 0) return;

        setIsExportingPdf(true);
        const toastId = toast.loading("Compilando documento corporativo en PDF...");

        try {
            const { pdf } = await import("@react-pdf/renderer");
            const { GitChatCorporatePDF } = await import("../pdf/GitChatCorporatePDF");

            const currentSession = sessions.find((s) => s.id === activeSessionId);
            const sessionTitle = currentSession?.title || `Auditoría GitHub MCP - ${connectedRepo.repo}`;

            const docElement = (
                <GitChatCorporatePDF
                    repoInfo={{
                        fullName: connectedRepo.fullName,
                        owner: connectedRepo.owner,
                        repo: connectedRepo.repo,
                        url: connectedRepo.url,
                        branch: connectedRepo.activeBranch,
                    }}
                    messages={messages}
                    sessionTitle={sessionTitle}
                    generatedAt={format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                    userName={localAccount?.name || "Docente SmartClass"}
                />
            );

            const blob = await pdf(docElement).toBlob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `Reporte_Corporativo_MCP_${connectedRepo.repo}_${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            toast.success("PDF corporativo compilado y descargado exitosamente", { id: toastId });
        } catch (err: any) {
            console.error("Error generando PDF corporativo:", err);
            toast.error(err.message || "Error al generar el archivo PDF corporativo.", { id: toastId });
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Copiado al portapapeles");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const currentSession = sessions.find((s) => s.id === activeSessionId);

    return (
        <div className={cn(
            "w-full flex flex-col min-h-0 transition-all",
            isFullscreen 
                ? "fixed inset-0 z-50 bg-background p-3 sm:p-4 h-screen" 
                : "flex-1 space-y-2.5 p-0.5 sm:p-1 h-[calc(100vh-80px)] min-h-[600px]"
        )}>
            {/* Split Screen Layout: Izquierda = Configuración & Controles | Derecha = Chat MCP */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 h-full overflow-hidden">
                
                {/* ======================================================== */}
                {/* COLUMNA IZQUIERDA: CONFIGURACIONES Y HERRAMIENTAS        */}
                {/* ======================================================== */}
                <div className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[450px] shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                    
                    {/* Header Compacto */}
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/dashboard/teacher/tools")}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                                <span>Herramientas</span>
                            </Button>
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-mono">
                                GitHub MCP Protocol
                            </Badge>
                        </div>

                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                                <Github className="h-5 w-5 text-foreground shrink-0" />
                                <span>Chat Repositorio MCP</span>
                            </h2>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Conecta cualquier repositorio y dialoga en vivo con herramientas MCP.
                            </p>
                        </div>

                        {/* Indicador de privacidad: NO guarda en base de datos */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border/80 text-[10px] text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Modo en memoria: no se almacena en base de datos</span>
                        </div>
                    </div>

                    {/* Tarjeta 1: Conexión y Selección de Repositorio */}
                    <Card className="border-border shadow-xs shrink-0">
                        <CardHeader className="p-3.5 pb-2">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                                <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                                <span>Repositorio de GitHub</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 space-y-2.5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">
                                    URL o Propietario/Repo:
                                </label>
                                <div className="relative">
                                    <Input
                                        placeholder="usuario/repo o https://github.com/..."
                                        value={repoUrlInput}
                                        onChange={(e) => setRepoUrlInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleConnectRepo();
                                            }
                                        }}
                                        className="text-xs font-mono h-8 bg-muted/30 focus-visible:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Selector de Rama */}
                            {connectedRepo && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <GitBranch className="h-3 w-3" />
                                            <span>Rama Activa:</span>
                                        </span>
                                        <span className="font-mono text-[10px] text-primary font-bold">
                                            {connectedRepo.branches.length} ramas
                                        </span>
                                    </label>
                                    <Select 
                                        value={connectedRepo.activeBranch} 
                                        onValueChange={handleChangeBranch}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-mono">
                                            <SelectValue placeholder="Rama" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {connectedRepo.branches.map((b) => (
                                                <SelectItem key={b} value={b} className="text-xs font-mono">
                                                    {b}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Botón de Conectar / Cambiar */}
                            <Button
                                onClick={() => handleConnectRepo()}
                                disabled={isConnecting || !repoUrlInput.trim()}
                                className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer shadow-xs"
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Conectando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>{connectedRepo ? "Reconectar / Cambiar Repo" : "Conectar Repositorio"}</span>
                                    </>
                                )}
                            </Button>

                            {/* Estado Conectado */}
                            {connectedRepo && (
                                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-1 truncate font-mono">
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                        {connectedRepo.fullName}
                                    </span>
                                    <a
                                        href={connectedRepo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline shrink-0 ml-1"
                                        title="Abrir en GitHub"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            )}

                            {/* Sugerencias Rápidas */}
                            <div className="pt-1.5 border-t border-border/50 text-[10px] space-y-1">
                                <span className="text-muted-foreground font-medium">Ejemplos:</span>
                                <div className="flex flex-wrap gap-1">
                                    {QUICK_SUGGESTIONS.map((sug) => (
                                        <button
                                            key={sug.label}
                                            type="button"
                                            onClick={() => {
                                                setRepoUrlInput(sug.url);
                                                handleConnectRepo(sug.url);
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-muted/70 hover:bg-muted text-foreground/80 hover:text-foreground text-[10px] cursor-pointer border border-border/60 transition-colors"
                                        >
                                            {sug.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 2: Token Personal Opcional */}
                    <Card className="border-border/80 shadow-xs shrink-0">
                        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                                <span>Token de Acceso</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTokenInput(!showTokenInput)}
                                className="h-6 text-[10px] px-2 cursor-pointer"
                            >
                                {showTokenInput ? "Ocultar" : "Configurar"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            {showTokenInput ? (
                                <div className="space-y-1.5">
                                    <Input
                                        type="password"
                                        placeholder="ghp_xxxxxxxx (opcional para repos privados)"
                                        value={customToken}
                                        onChange={(e) => setCustomToken(e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Solo se procesa en memoria volátil para inspeccionar repositorios privados.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-[11px] text-muted-foreground">
                                    {customToken.trim() ? "🟢 Token personalizado configurado" : (hasUserGithubToken ? `Token activo (${tokenSource})` : "Modo público por defecto")}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tarjeta 3: Acciones & Suite de Exportación */}
                    <Card className="border-border shadow-xs shrink-0">
                        <CardHeader className="p-3.5 pb-2">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                                <Download className="h-3.5 w-3.5 text-indigo-500" />
                                <span>Exportación e Historial</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0 space-y-2">
                            {/* Botón Nueva Conversación */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartNewSession}
                                disabled={!connectedRepo || isLoading}
                                className="w-full h-8 text-xs justify-start gap-2 cursor-pointer font-semibold"
                            >
                                <Plus className="h-3.5 w-3.5 text-indigo-500" />
                                <span>+ Nueva Conversación (Limpiar)</span>
                            </Button>

                            {/* Selector de Sesiones en Memoria */}
                            {sessions.length > 1 && (
                                <Select 
                                    value={activeSessionId || ""} 
                                    onValueChange={handleSelectSession}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Cambiar conversación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((s) => (
                                            <SelectItem key={s.id} value={s.id} className="text-xs">
                                                {s.title} ({s.messages.length} msgs)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Botones de Exportación */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportMarkdown}
                                    disabled={messages.length <= 1}
                                    className="h-8 text-[11px] gap-1.5 cursor-pointer"
                                    title="Descargar conversación en formato Markdown"
                                >
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                    <span>Exportar .MD</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportPdf}
                                    disabled={messages.length <= 1 || isExportingPdf}
                                    className="h-8 text-[11px] gap-1.5 cursor-pointer font-semibold hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30"
                                    title="Compilar y descargar PDF corporativo estilo SmartClass"
                                >
                                    {isExportingPdf ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                                    ) : (
                                        <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                                    )}
                                    <span>Exportar PDF</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 4: Preguntas Rápidas Categorizadas */}
                    <Card className="border-border shadow-xs shrink-0">
                        <CardHeader className="p-3.5 pb-2">
                            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span>Auditorías & Preguntas por Categoría</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-0">
                            <CategorizedQuestionSelector
                                onSelectAndSend={(prompt) => handleSendMessage(prompt)}
                                onFillInput={(prompt) => setInput(prompt)}
                                currentInput={input}
                                isLoading={isLoading || !connectedRepo}
                                scope="GITHUB"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* ======================================================== */}
                {/* COLUMNA DERECHA: ESPACIO DE CHAT MCP AMPLIO             */}
                {/* ======================================================== */}
                <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-full">
                    
                    {/* Barra Superior del Chat */}
                    <div className="p-2.5 sm:p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate flex items-center gap-2">
                                    <span>{currentSession ? currentSession.title : "Sesión de Inspección GitHub MCP"}</span>
                                    {connectedRepo && (
                                        <Badge variant="outline" className="text-[10px] font-mono bg-background text-foreground/80">
                                            rama: {connectedRepo.activeBranch}
                                        </Badge>
                                    )}
                                </h3>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {connectedRepo 
                                        ? `Inspeccionando ${connectedRepo.fullName} con herramientas MCP activas` 
                                        : "Conecta un repositorio en el panel izquierdo para comenzar"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="secondary" className="text-[10px] font-mono hidden sm:inline-flex">
                                {messages.filter(m => !m.id.startsWith("welcome") && !m.id.startsWith("branch")).length} mensajes
                            </Badge>

                            {/* Botón Pantalla Completa */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? "Restaurar vista" : "Pantalla completa"}
                            >
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Flujo de Mensajes Desplazable (Ocupa todo el alto) */}
                    <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3">
                        <div className="space-y-3.5 w-full">
                            {messages.map((msg) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn("flex gap-2.5 sm:gap-3", isUser ? "justify-end" : "justify-start")}
                                    >
                                        {!isUser && (
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                                                <Bot className="h-4 w-4" />
                                            </div>
                                        )}

                                        <div className={cn(
                                            "group relative rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs transition-all",
                                            isUser
                                                ? "max-w-[85%] bg-primary text-primary-foreground rounded-tr-xs"
                                                : "w-full max-w-full bg-muted/60 border border-border text-foreground rounded-tl-xs"
                                        )}>
                                            {/* Badge de invocación de herramientas MCP */}
                                            {!isUser && msg.toolCallsCount && msg.toolCallsCount > 0 ? (
                                                <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-background/80 px-2.5 py-0.5 rounded-full border border-border/80 shadow-xs">
                                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                                    <span>Herramientas MCP utilizadas: <strong>{msg.toolCallsCount}</strong></span>
                                                </div>
                                            ) : null}

                                            {/* Contenido en Markdown Enriquecido */}
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words text-xs sm:text-sm leading-relaxed">
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
                                                        code: ({ node, ...props }: any) => {
                                                            const isInline = !props.className;
                                                            return isInline ? (
                                                                <code className="bg-muted/80 px-1 py-0.5 rounded text-[11px] font-mono text-primary" {...props} />
                                                            ) : (
                                                                <code className="text-xs font-mono" {...props} />
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {formatMarkdown(msg.content)}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Pie del mensaje: hora y copiar */}
                                            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] opacity-70">
                                                <span>
                                                    {format(new Date(msg.timestamp), "HH:mm")}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(msg.content, msg.id)}
                                                    className="hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer p-0.5 rounded hover:bg-muted"
                                                    title="Copiar texto"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                    <span className="text-[9px]">{copiedId === msg.id ? "Copiado" : "Copiar"}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {isUser && (
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border mt-0.5">
                                                <User className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Estado de Carga con Animación */}
                            {isLoading && (
                                <div className="flex gap-2.5 sm:gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-xs p-3.5 text-xs sm:text-sm flex items-center gap-2.5 text-muted-foreground shadow-xs">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                        <span>Ejecutando herramientas GitHub MCP y analizando repositorio...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={scrollBottomRef} />
                        </div>
                    </div>

                    {/* Chips de Preguntas Frecuentes Rápidas */}
                    <div className="p-2 bg-muted/20 border-t border-border/50 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap pl-1">
                            Sugerencias:
                        </span>
                        {QUICK_PROMPT_PILLS.map((pill, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={isLoading || !connectedRepo}
                                onClick={() => handleSendMessage(pill.prompt)}
                                className="px-2.5 py-1 rounded-full text-[11px] bg-background hover:bg-muted text-foreground/80 hover:text-foreground border border-border/70 whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50"
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>

                    {/* Barra de Entrada / Formulario */}
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
                                    connectedRepo
                                        ? `Pregunta sobre ${connectedRepo.fullName} (rama ${connectedRepo.activeBranch})...`
                                        : "Conecta un repositorio en el panel izquierdo para chatear..."
                                }
                                disabled={isLoading || !connectedRepo}
                                className="flex-1 bg-muted/30 focus-visible:ring-indigo-500 text-xs sm:text-sm h-10"
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !input.trim() || !connectedRepo}
                                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-semibold gap-1.5 cursor-pointer shadow-xs"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span className="hidden sm:inline">Enviar</span>
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}
