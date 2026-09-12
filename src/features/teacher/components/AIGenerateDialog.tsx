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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Sparkles,
    Bot,
    Check,
    Copy,
    ArrowRight,
    RotateCcw,
    GitBranch,
    FileText,
    Code2,
    Video,
    Mic,
    MessageSquareQuote,
    Database,
    Pencil,
    GraduationCap,
    Lightbulb,
    CheckCircle2,
    Send,
    Undo2,
    User,
    Sparkle,
    BookOpen
} from "lucide-react";
import {
    generateActivityDescriptionAction,
    generateActivityStatementAction,
    refineActivityStatementAction
} from "@/app/activity-ai-actions";
import { getTeacherCredentialsAction } from "@/app/teacher-actions";
import MDEditor from "@uiw/react-md-editor";
import { toast } from "sonner";

interface AIGenerateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUseContent: (content: string) => void;
    type: "description" | "statement";
    activityType: string;
    initialPrompt?: string;
    initialContent?: string;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string;
}

const ACTIVITY_TYPE_INFO: Record<string, { label: string; icon: any; color: string; badgeColor: string }> = {
    GITHUB: {
        label: "Repositorio GitHub",
        icon: GitBranch,
        color: "text-blue-600 dark:text-blue-400",
        badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40"
    },
    CODE_CHALLENGE: {
        label: "Desafío de Código en Vivo",
        icon: Code2,
        color: "text-amber-600 dark:text-amber-400",
        badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40"
    },
    DB_MODELING: {
        label: "Base de Datos & SQL",
        icon: Database,
        color: "text-indigo-600 dark:text-indigo-400",
        badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40"
    },
    PDF_REVIEW: {
        label: "Revisión Documento PDF",
        icon: FileText,
        color: "text-emerald-600 dark:text-emerald-400",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
    },
    VIDEO_PITCH: {
        label: "Sustentación Video Pitch",
        icon: Video,
        color: "text-rose-600 dark:text-rose-400",
        badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40"
    },
    AUDIO_DEFENSE: {
        label: "Audio / Podcast",
        icon: Mic,
        color: "text-violet-600 dark:text-violet-400",
        badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40"
    },
    AI_INTERVIEW: {
        label: "Entrevista Técnica IA",
        icon: MessageSquareQuote,
        color: "text-teal-600 dark:text-teal-400",
        badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/40"
    },
    MANUAL: {
        label: "Entrega Libre (Manual)",
        icon: Pencil,
        color: "text-stone-600 dark:text-stone-400",
        badgeColor: "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800/40"
    },
    DOCUMENTATION: {
        label: "Documentación / Lección",
        icon: BookOpen,
        color: "text-primary dark:text-primary",
        badgeColor: "bg-primary/10 text-primary border-primary/20"
    }
};

const QUICK_SUGGESTIONS: Record<string, string[]> = {
    DOCUMENTATION: [
        "Introducción completa a Jetpack Compose con arquitectura declarativa, estado, recomposición y ejemplos de código.",
        "Guía paso a paso sobre desarrollo de APIs RESTful con Node.js, Express y TypeScript, incluyendo autenticación y base de datos.",
        "Arquitectura MVVM en Android: ViewModel, LiveData, StateFlow y conexión con servicios Retrofit con buenas prácticas."
    ],
    GITHUB: [
        "API REST con autenticación JWT, operaciones CRUD y validación de esquemas en Node.js/Express o Python FastAPI.",
        "Arquitectura MVC limpia con TypeScript, inyección de dependencias y pruebas unitarias de servicios.",
        "Microservicio de procesamiento de pedidos con dockerfile, variables de entorno y persistencia relacional."
    ],
    CODE_CHALLENGE: [
        "Implementar algoritmo de búsqueda y ordenamiento eficiente con casos de prueba para valores duplicados y arrays vacíos.",
        "Estructura de datos personalizada (Cola de Prioridad o LRU Cache) con métodos optimizados en tiempo y memoria.",
        "Procesador de expresiones aritméticas o validador de sintaxis con manejo robusto de excepciones."
    ],
    DB_MODELING: [
        "Sistema de historias clínicas y citas médicas hospitalarias: Pacientes, Médicos, Consultas y Recetas con 3FN y consultas con agregación.",
        "Plataforma de comercio electrónico: Clientes, Productos, Carrito, Órdenes y Pagos con integridad referencial ON DELETE.",
        "Gestión académica universitaria: Estudiantes, Cursos, Matrículas y Calificaciones con vistas y DDL completo."
    ],
    PDF_REVIEW: [
        "Informe técnico sobre comparación de arquitecturas Monolíticas vs Microservicios en sistemas distribuidos de alta concurrencia.",
        "Ensayo académico sobre seguridad en aplicaciones web: Principales vulnerabilidades OWASP Top 10 y medidas de mitigación.",
        "Reporte de investigación sobre el impacto y optimización de modelos de lenguaje LLM en entornos de producción."
    ],
    VIDEO_PITCH: [
        "Pitch de 5 minutos explicando la arquitectura de la solución, demostración en vivo de la pasarela de pago y lecciones aprendidas.",
        "Defensa audiovisual del MVP de una plataforma SaaS, destacando la justificación del stack tecnológico y retos superados.",
        "Presentación técnica demostrando el flujo de datos desde el frontend Next.js hasta la base de datos PostgreSQL."
    ],
    AUDIO_DEFENSE: [
        "Podcast de 5 minutos analizando las decisiones arquitectónicas tomadas, balance de carga y cómo se resolvió la persistencia de datos.",
        "Sustentación oral técnica explicando la elección de bases de datos relacionales vs NoSQL para el proyecto desarrollado.",
        "Defensa de ingeniería explicando la estrategia de caché con Redis y el manejo de concurrencia en el sistema."
    ],
    AI_INTERVIEW: [
        "Simulación de entrevista técnica para Desarrollador Backend Junior/Mid: POO, asincronía, promesas y transacciones ACID.",
        "Entrevista técnica orientada a Frontend con React: ciclo de vida de componentes, gestión de estado, renderizado y optimización.",
        "Examen oral sobre bases de datos: índices, normalización, planes de ejecución y diferencias entre claves foráneas."
    ],
    MANUAL: [
        "Taller práctico de diseño de software: Diagramas de casos de uso y diagramas de secuencia para un sistema de reservas.",
        "Laboratorio de pruebas de software: Matriz de casos de prueba manuales, caja negra y escenarios de prueba de integración.",
        "Guía de ejercicios prácticos sobre estructuras de datos lineales y análisis de complejidad Big O."
    ]
};

// Sugerencias rápidas para el chat de adaptación de actividades
const REFINEMENT_CHIPS = [
    "⚡ Simplificar y hacer más accesible",
    "📝 Resumir y acortar la extensión",
    "🔥 Subir el nivel de exigencia técnica",
    "🛡️ Añadir más casos límite y validaciones",
    "🎯 Ajustar rúbrica a 3 criterios clave",
    "💡 Añadir ejemplos de entrada y salida"
];

// Sugerencias rápidas para el chat de redacción y edición de documentos/lecciones
const DOCUMENTATION_REFINEMENT_CHIPS = [
    "💡 Añadir ejemplos de código prácticos",
    "⚡ Explicar paso a paso de forma didáctica",
    "📝 Resumir y sintetizar conceptos clave",
    "📊 Crear tabla comparativa o resumen",
    "🔥 Profundizar en conceptos técnicos",
    "🧩 Añadir esquema visual o diagrama Mermaid"
];

export function AIGenerateDialog({
    isOpen,
    onClose,
    onUseContent,
    type,
    activityType,
    initialPrompt = "",
    initialContent = ""
}: AIGenerateDialogProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [configuredModel, setConfiguredModel] = useState<string>("gemini-2.0-flash");
    const [academicLevel, setAcademicLevel] = useState("Intermedio (Universitario)");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);
    const [historyVersions, setHistoryVersions] = useState<string[]>([]);
    const [previewTab, setPreviewTab] = useState<"rendered" | "raw">("rendered");
    const [copied, setCopied] = useState(false);

    // Estado del chat de adaptación
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Cargar credenciales ya configuradas del docente para mostrar el modelo activo
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

    // Inicializar contenido si se abre para modificar un documento o enunciado existente
    useEffect(() => {
        if (isOpen) {
            if (initialContent && initialContent.trim().length > 0) {
                setGeneratedContent(initialContent);
                setHistoryVersions([initialContent]);
                setChatMessages([
                    {
                        id: "initial-loaded-msg",
                        role: "assistant",
                        text: activityType === "DOCUMENTATION"
                            ? "He cargado el contenido actual de tu lección. Puedes usar este chat para pedirme cualquier cambio: por ejemplo, explicar conceptos paso a paso, añadir ejemplos de código prácticos y comentados, resumir, crear tablas o agregar diagramas."
                            : "He cargado el enunciado actual de tu actividad. Puedes usar este chat para pedirme cualquier cambio: por ejemplo, simplificar la actividad, resumir, cambiar requerimientos, agregar casos borde o ajustar los porcentajes de la rúbrica.",
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
            } else {
                setGeneratedContent(null);
                setHistoryVersions([]);
                setChatMessages([]);
            }
        }
    }, [isOpen, initialContent, activityType]);

    useEffect(() => {
        if (initialPrompt && !prompt) {
            setPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    // Auto-scroll al final del chat cuando se agregue un mensaje
    useEffect(() => {
        if (chatMessages.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isRefining]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const result = type === "description"
                ? await generateActivityDescriptionAction(prompt, activityType)
                : await generateActivityStatementAction(prompt, activityType, undefined, academicLevel);

            if (result.error) {
                setError(result.error);
                setIsGenerating(false);
            } else if (result.content) {
                setGeneratedContent(result.content);
                setHistoryVersions([result.content]);
                setChatMessages([
                    {
                        id: "initial-msg",
                        role: "assistant",
                        text: `He generado el enunciado inicial según tus requerimientos. Puedes usar este chat para pedirme cualquier cambio: por ejemplo, simplificar la actividad, resumir, agregar casos límite o ajustar la rúbrica.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
                setIsGenerating(false);
            }
        } catch (err: any) {
            setError(err.message || "Error al comunicarse con el servicio de IA.");
            setIsGenerating(false);
        }
    };

    // Chat de adaptación continua
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
            const result = await refineActivityStatementAction(
                generatedContent,
                textToSend,
                activityType
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
                // Guardar la versión previa en el historial para permitir deshacer
                setHistoryVersions((prev) => [...prev, result.content!]);
                setGeneratedContent(result.content);
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        text: `✓ He adaptado el enunciado según lo solicitado ("${textToSend.length > 60 ? textToSend.slice(0, 60) + '...' : textToSend}"). La vista previa se ha actualizado en tiempo real.`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
                toast.success("Enunciado adaptado con éxito.");
            }
        } catch (err: any) {
            setError(err.message || "Error al adaptar el enunciado.");
        } finally {
            setIsRefining(false);
        }
    };

    // Deshacer al último estado
    const handleUndo = () => {
        if (historyVersions.length <= 1) return;
        const newHistory = [...historyVersions];
        newHistory.pop(); // quitar la actual
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

    const handleApplyContent = () => {
        if (!generatedContent) return;
        onUseContent(generatedContent);
        toast.success("Enunciado generado aplicado exitosamente.");
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
        setPrompt("");
        setChatInput("");
        setChatMessages([]);
        setHistoryVersions([]);
        setError(null);
        setIsGenerating(false);
        setIsRefining(false);
        setGeneratedContent(null);
        onClose();
    };

    const currentTypeInfo = ACTIVITY_TYPE_INFO[activityType] || ACTIVITY_TYPE_INFO.MANUAL;
    const TypeIcon = currentTypeInfo.icon;
    const suggestions = QUICK_SUGGESTIONS[activityType] || QUICK_SUGGESTIONS.MANUAL;

    // Detectar conteo de criterios generados en el markdown
    const criteriaCount = generatedContent
        ? (generatedContent.match(/[\*\-]\s+\*\*([^(]+?)(?:\s*\(([0-9]+)%\))?\*\*/g) || []).length
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-7xl w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/70">
                {/* Cabecera con Degradado, Tipo de Actividad y Modelo Activo */}
                <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    {activityType === "DOCUMENTATION"
                                        ? (initialContent ? "Modificar Lección con Chat IA" : "Generar Contenido de Lección con IA")
                                        : (initialContent ? "Modificar Enunciado con Chat IA" : "Generar Enunciado y Rúbrica con IA")
                                    }
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {activityType === "DOCUMENTATION"
                                        ? (generatedContent
                                            ? "Adapta y perfecciona el contenido de la lección conversando con la IA."
                                            : "Crea explicaciones detalladas, guías pedagógicas y ejemplos prácticos para tu documento.")
                                        : (generatedContent
                                            ? "Adapta y perfecciona el resultado de forma interactiva conversando con la IA."
                                            : "Crea objetivos, requerimientos técnicos y criterios con ponderación al 100%.")
                                    }
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <Badge 
                                variant="outline" 
                                className={`text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5 ${currentTypeInfo.badgeColor}`}
                            >
                                <TypeIcon className="h-3.5 w-3.5" />
                                {currentTypeInfo.label}
                            </Badge>

                            <Badge 
                                variant="secondary" 
                                className="text-xs px-2.5 py-1 font-mono flex items-center gap-1.5 bg-muted text-muted-foreground border border-border/50"
                                title="Modelo de IA activo según los ajustes de la aplicación"
                            >
                                <Bot className="h-3.5 w-3.5 text-primary" />
                                {configuredModel}
                            </Badge>
                        </div>
                    </div>
                </DialogHeader>

                {/* Contenido Principal */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Si ya se generó contenido: Vista en 2 Columnas (Previa + Chat de Adaptación) */}
                    {generatedContent ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                            {/* Columna Izquierda: Vista Previa del Documento (7 de 12 columnas) */}
                            <div className="lg:col-span-7 flex flex-col space-y-2.5">
                                <div className="flex items-center justify-between bg-muted/30 border border-border/60 p-2.5 rounded-xl">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="default" className="text-[10px] font-mono gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Versión #{historyVersions.length}
                                        </Badge>
                                        {criteriaCount > 0 && (
                                             <Badge variant="secondary" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                {criteriaCount} criterios (100%)
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setGeneratedContent(null);
                                                setHistoryVersions([]);
                                                setChatMessages([]);
                                                setPrompt("");
                                            }}
                                            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                                            title="Empezar a redactar un nuevo enunciado desde cero con un prompt"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                            Nuevo Prompt
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopy}
                                            className="h-7 text-xs px-2.5 gap-1 shadow-2xs"
                                        >
                                            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                            {copied ? "Copiado" : "Copiar"}
                                        </Button>
                                    </div>
                                </div>

                                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full flex-1 flex flex-col">
                                    <div className="flex items-center justify-between pb-1">
                                        <span className="text-xs font-bold text-foreground">Documento Markdown</span>
                                        <TabsList className="h-6.5 bg-muted/80 p-0.5">
                                            <TabsTrigger value="rendered" className="text-[10px] h-5.5 px-2 font-semibold">
                                                Visualización
                                            </TabsTrigger>
                                            <TabsTrigger value="raw" className="text-[10px] h-5.5 px-2 font-semibold">
                                                Código
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent value="rendered" className="mt-0 flex-1">
                                        <div className="border border-border/80 rounded-xl p-4 bg-background h-[480px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed shadow-inner">
                                            <MDEditor.Markdown source={generatedContent} />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="raw" className="mt-0 flex-1">
                                        <pre className="border border-border/80 rounded-xl p-3.5 bg-muted/40 font-mono text-[11px] h-[480px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                            {generatedContent}
                                        </pre>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Columna Derecha: Chat Interactivo para Adaptar y Cambiar (5 de 12 columnas) */}
                            <div className="lg:col-span-5 flex flex-col h-full bg-card border border-border/70 rounded-2xl p-3.5 space-y-3 shadow-xs">
                                {/* Cabecera del Chat */}
                                <div className="flex items-center justify-between pb-2 border-b border-border/60">
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
                                            className="h-6.5 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                                            title="Revertir al cambio anterior"
                                        >
                                            <Undo2 className="h-3 w-3" />
                                            Deshacer
                                        </Button>
                                    )}
                                </div>

                                {/* Historial de Mensajes del Chat */}
                                <div className="h-[250px] overflow-y-auto space-y-2.5 pr-1 text-xs">
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
                                            <span className="text-[11px]">Adaptando el enunciado según tu prompt...</span>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chips de Atajos Rápidos de Adaptación */}
                                <div className="space-y-1.5 pt-1 border-t border-border/50">
                                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                        <Sparkle className="h-3 w-3 text-amber-500" /> Atajos rápidos:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {(activityType === "DOCUMENTATION" ? DOCUMENTATION_REFINEMENT_CHIPS : REFINEMENT_CHIPS).map((chip, i) => (
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

                                {/* Caja de Entrada del Chat */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="relative">
                                        <Textarea
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder={activityType === "DOCUMENTATION"
                                                ? "Escribe cómo deseas adaptar la lección... (ej: agrega ejemplos de código, explica paso a paso, añade diagrama Mermaid o resume conceptos)"
                                                : "Escribe cómo deseas adaptar el enunciado... (ej: simplifica para principiantes, enfócate solo en arrays, o añade ejemplos de código)"}
                                            disabled={isRefining}
                                            rows={2}
                                            className="text-xs resize-none pr-10 min-h-[64px] bg-background leading-relaxed"
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
                    ) : (
                        /* Formulario Inicial para ingresar el Prompt */
                        <div className="space-y-4">
                            {/* Nivel Académico */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border/60 bg-muted/15">
                                <div className="space-y-0.5">
                                    <Label htmlFor="academic-level-select" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                        Nivel Académico del Taller
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Ajusta la complejidad técnica de los requerimientos y rúbrica.
                                    </p>
                                </div>
                                <select
                                    id="academic-level-select"
                                    value={academicLevel}
                                    onChange={(e) => setAcademicLevel(e.target.value)}
                                    disabled={isGenerating}
                                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring w-full sm:w-auto"
                                >
                                    <option value="Principiante / Introductorio">Principiante / Introductorio</option>
                                    <option value="Intermedio (Universitario)">Intermedio (Universitario)</option>
                                    <option value="Avanzado / Profesional">Avanzado / Profesional</option>
                                </select>
                            </div>

                            {/* Campo de Prompt Principal */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="ai-prompt" className="text-xs font-bold text-foreground">
                                        ¿Qué debe tratar y evaluar esta actividad?
                                    </Label>
                                    <span className="text-[11px] text-muted-foreground">
                                        Ctrl + Enter para generar
                                    </span>
                                </div>
                                <Textarea
                                    id="ai-prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={`Describe el tema, requerimientos, tecnologías o caso de estudio para este taller de ${currentTypeInfo.label.toLowerCase()}...`}
                                    className="min-h-[130px] max-h-[260px] text-xs leading-relaxed resize-y font-normal"
                                    disabled={isGenerating}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isGenerating && prompt.trim()) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                            </div>

                            {/* Sugerencias Rápidas / Ideas de Inspiración en Cuadrícula de 3 Columnas */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Ideas rápidas para {currentTypeInfo.label}:</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {suggestions.map((sug, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setPrompt(sug)}
                                            disabled={isGenerating}
                                            className="text-left text-[11px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 p-2.5 rounded-xl border border-border/50 transition-colors flex flex-col gap-1.5 cursor-pointer"
                                        >
                                            <span className="font-mono text-primary font-bold text-[10px]">Idea #{idx + 1}</span>
                                            <span className="line-clamp-3 leading-snug">{sug}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mensaje de Error si ocurre */}
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                            <span>⚠️ {error}</span>
                        </div>
                    )}
                </div>

                {/* Footer con Botones */}
                <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-muted/10 gap-2 flex-row justify-between items-center">
                    <div>
                        {generatedContent && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setGeneratedContent(null);
                                    setChatMessages([]);
                                    setHistoryVersions([]);
                                }}
                                disabled={isRefining}
                                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reiniciar con otro Prompt
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleClose} 
                            disabled={isGenerating || isRefining} 
                            className="text-xs h-8"
                        >
                            Cancelar
                        </Button>

                        {generatedContent ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApplyContent}
                                disabled={isRefining}
                                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {activityType === "DOCUMENTATION" ? "Insertar en el Documento" : "Insertar en el Enunciado"}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isGenerating}
                                className="text-xs h-8 gap-1.5 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary text-primary-foreground font-semibold shadow-xs transition-all"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Generando con {configuredModel}...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {activityType === "DOCUMENTATION" ? "Generar Contenido" : "Generar Enunciado"}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
