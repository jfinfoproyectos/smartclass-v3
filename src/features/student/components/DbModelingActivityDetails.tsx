"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Database, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Loader2, Info, Code2,
    Download, FileCode, Cloud, Eye, EyeOff, ShieldCheck, ChevronLeft,
    Play, ShieldAlert, AlertTriangle, Terminal, X, RefreshCw, CheckCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { FeedbackViewer } from "./FeedbackViewer";
import { submitActivityAction, testStudentSqlAction } from "../actions/submissionActions";
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { StudentTeacherEvaluationSection } from "./StudentTeacherEvaluationSection";
import { cn } from "@/lib/utils";

interface DbModelingActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

const DEFAULT_SQL = `-- ============================================================
-- MODELADO Y PROGRAMACIÓN SQL (POSTGRESQL)
-- Digita aquí tus sentencias directamente (el pegado está deshabilitado)
-- ============================================================

-- 1. ESTRUCTURA Y DEFINICIÓN DE TABLAS (DDL)
-- Crea aquí tus tablas con sus llaves primarias, foráneas y restricciones


-- 2. INSERCIÓN DE DATOS DE PRUEBA (DML)
-- Inserta registros de prueba para validar el funcionamiento


-- 3. CONSULTAS Y VERIFICACIÓN (DQL)
-- Redacta las consultas solicitadas en el enunciado
`;

export function DbModelingActivityDetails({
    activity,
    userId,
    studentName,
}: DbModelingActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
    const monacoTheme = mode === "dark" ? "vs-dark" : "light";

    // Extraer configuración de BD
    const dbConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.dbConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const isCloudMode = dbConfig?.deliveryMode === "cloud";
    const targetEngine = dbConfig?.targetEngine || "PostgreSQL";
    const requiredNormalization = dbConfig?.requiredNormalization || "3FN";
    const requiredEntities: string[] = dbConfig?.requiredEntities || [];

    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    // Cargar datos entregados previamente
    const savedData = useMemo(() => {
        if (!submission?.url) return null;
        try {
            const parsed = JSON.parse(submission.url);
            if (typeof parsed === "object" && parsed !== null) return parsed;
            return { sqlScript: String(submission.url) };
        } catch {
            return { sqlScript: String(submission.url) };
        }
    }, [submission?.url]);

    const storageKey = useMemo(() => `smartclass_sql_${activity?.id}_${userId}`, [activity?.id, userId]);

    const [connectionString, setConnectionString] = useState<string>(
        savedData?.connectionString || ""
    );
    const [showPassword, setShowPassword] = useState<boolean>(false);

    // Carga inicial: datos guardados en BD > borrador local en localStorage > plantilla limpia
    const [sqlScript, setSqlScript] = useState<string>(() => {
        if (savedData?.sqlScript) return savedData.sqlScript;
        if (typeof window !== "undefined") {
            try {
                const cached = localStorage.getItem(`smartclass_sql_${activity?.id}_${userId}`);
                if (cached && cached.trim()) return cached;
            } catch {}
        }
        return DEFAULT_SQL;
    });

    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // Auto-guardado en LocalStorage continuo para evitar pérdida de trabajo al tipear
    useEffect(() => {
        if (typeof window !== "undefined" && !isSubmitted && sqlScript !== DEFAULT_SQL) {
            try {
                localStorage.setItem(storageKey, sqlScript);
                setLastSavedTime(new Date());
            } catch {}
        }
    }, [sqlScript, storageKey, isSubmitted]);

    const [activeLeftTab, setActiveLeftTab] = useState<"statement" | "results">(
        isGraded ? "results" : "statement"
    );
    const [mobileView, setMobileView] = useState<"workspace" | "info">("workspace");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados de prueba interactiva en Sandbox (PGlite)
    const [isTestingSandbox, setIsTestingSandbox] = useState(false);
    const [sandboxTestResult, setSandboxTestResult] = useState<any>(null);
    const [showSandboxConsole, setShowSandboxConsole] = useState(false);

    const handleTestSandbox = async () => {
        if (!sqlScript.trim()) {
            toast.warning("Digita tus sentencias SQL antes de probarlas.");
            return;
        }
        setIsTestingSandbox(true);
        setShowSandboxConsole(true);
        try {
            const res = await testStudentSqlAction(sqlScript);
            setSandboxTestResult(res);
            if (res.success) {
                toast.success(`✓ SQL ejecutado con éxito en PostgreSQL. ${res.createdTableNames.length} tablas creadas.`);
            } else {
                toast.error("El script contiene errores de sintaxis o ejecución en PostgreSQL.");
            }
        } catch (err: any) {
            toast.error(err?.message || "Error al ejecutar prueba en Sandbox.");
        } finally {
            setIsTestingSandbox(false);
        }
    };

    // Manejador de montaje de Monaco: Anti-Paste estricto
    const handleEditorMount = (editor: any, monaco: any) => {
        // 1. Bloquear atajo Ctrl+V / Cmd+V
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
            toast.warning("El pegado de texto está bloqueado en esta actividad. Debes digitar tus sentencias SQL manualmente.", {
                icon: "✍️",
                duration: 4000,
            });
        });

        // 2. Bloquear atajo Shift+Insert
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {
            toast.warning("El pegado está deshabilitado en esta actividad. Debes digitar tus sentencias SQL manualmente.", {
                icon: "✍️",
                duration: 4000,
            });
        });

        // 3. Bloquear evento 'paste' nativo del DOM dentro del editor
        const domNode = editor.getDomNode();
        if (domNode) {
            domNode.addEventListener(
                "paste",
                (e: ClipboardEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.warning("El pegado de código está bloqueado. Debes redactar cada sentencia manualmente.", {
                        icon: "✍️",
                        duration: 4000,
                    });
                },
                true
            );
        }
    };

    // Métricas en tiempo real de digitación
    const sqlStats = useMemo(() => {
        const lines = sqlScript.split("\n").length;
        const tables = (sqlScript.match(/CREATE\s+TABLE/gi) || []).length;
        const inserts = (sqlScript.match(/INSERT\s+INTO/gi) || []).length;
        const selects = (sqlScript.match(/SELECT\s+/gi) || []).length;
        return { lines, tables, inserts, selects };
    }, [sqlScript]);

    // Descargar el script SQL actual como archivo .sql
    const handleDownloadSql = () => {
        const blob = new Blob([sqlScript], { type: "text/sql;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `script_${targetEngine.toLowerCase()}_${Date.now()}.sql`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Script SQL descargado.");
    };

    // Enviar entrega
    const handleSubmit = async () => {
        if (isCloudMode) {
            if (!connectionString.trim()) {
                toast.warning("Debes ingresar la cadena de conexión de tu base de datos en la nube.");
                return;
            }
            if (!connectionString.trim().startsWith("postgres://") && !connectionString.trim().startsWith("postgresql://")) {
                toast.warning("La URL debe comenzar con postgresql:// o postgres://");
                return;
            }
        } else {
            if (!sqlScript.trim() || sqlScript.trim() === DEFAULT_SQL.trim()) {
                toast.warning("Debes redactar tu solución SQL antes de enviar.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload = JSON.stringify({
                deliveryMode: isCloudMode ? "cloud" : "sandbox",
                connectionString: isCloudMode ? connectionString.trim() : undefined,
                sqlScript: sqlScript.trim(),
                submittedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            const res = await submitActivityAction(null, formData);
            if (res && res.error) {
                toast.error(res.message || "Error al enviar la entrega.");
                return;
            }

            // Limpiar borrador local al entregar con éxito
            try {
                localStorage.removeItem(storageKey);
            } catch {}

            toast.success(isCloudMode ? "✓ ¡Conexión a Base de Datos Cloud entregada exitosamente!" : "✓ ¡Script SQL entregado exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al enviar la entrega.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden flex-1 min-h-0 gap-2 sm:gap-2.5">
            {/* Header: Compacto y Moderno */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/20 p-2.5 sm:p-3 rounded-xl border">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {isCloudMode ? (
                            <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200">
                                <Cloud className="h-3 w-3 mr-1" />
                                Cloud PostgreSQL MCP
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                                <Database className="h-3 w-3 mr-1" />
                                Base de Datos & SQL
                            </Badge>
                        )}
                        <Badge variant="secondary" className="text-[11px] font-mono">
                            Motor: {targetEngine}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] font-mono">
                            Norm: {requiredNormalization}
                        </Badge>
                        {checklistConfig && isGraded && evalMetadata ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {evalMetadata.aiGrade !== undefined && evalMetadata.aiGrade !== null && (
                                    <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-mono font-bold">
                                        IA ({checklistConfig.aiWeight}%): {Number(evalMetadata.aiGrade).toFixed(1)}
                                    </Badge>
                                )}
                                {evalMetadata.checklistScore !== undefined && evalMetadata.checklistScore !== null && (
                                    <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-mono font-bold">
                                        Docente ({checklistConfig.checklistWeight}%): {Number(evalMetadata.checklistScore).toFixed(1)}
                                    </Badge>
                                )}
                                <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                                    Final: {submission.grade.toFixed(1)} / 5.0
                                </Badge>
                            </div>
                        ) : isGraded ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
                                Calificado: {submission.grade.toFixed(1)} / 5.0
                            </Badge>
                        ) : isSubmitted ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                                Entregado (Pendiente de Calificación)
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[11px]">
                                Sin entregar
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-foreground truncate" title={activity.title}>
                        {activity.title}
                    </h1>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground shrink-0">
                    <div className="hidden sm:flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px]">Límite: {activity.deadline ? format(new Date(activity.deadline), "PPp", { locale: es }) : "Sin fecha"}</span>
                    </div>
                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs font-semibold shrink-0 gap-1 rounded-lg border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer bg-background"
                        title="Volver a la lista de actividades"
                    >
                        <Link href={activity.courseId ? `/dashboard/student?courseId=${activity.courseId}&tab=activities` : `/dashboard/student`}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span>Volver a actividades</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Selector de Vistas Móviles (< lg) */}
            <div className="lg:hidden shrink-0 grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shadow-2xs">
                <button
                    type="button"
                    onClick={() => setMobileView("workspace")}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        mobileView === "workspace"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-indigo-600 dark:text-indigo-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Database className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{isCloudMode ? "Conexión Cloud" : "Editor SQL"}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileView("info")}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        mobileView === "info"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-indigo-600 dark:text-indigo-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Enunciado / Calificación</span>
                </button>
            </div>

            {/* Layout principal: Izquierda Enunciado / Derecha Entrega */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
                {/* Columna Izquierda: Enunciado, Requerimientos y Calificación (5 columnas) */}
                <div className={cn(
                    "lg:col-span-5 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs",
                    mobileView === "info" ? "flex" : "hidden lg:flex"
                )}>
                    <Tabs value={activeLeftTab} onValueChange={(v) => setActiveLeftTab(v as any)} className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
                        <div className="border-b p-1.5 sm:p-2 bg-muted/30 shrink-0">
                            <TabsList className="grid grid-cols-2 w-full h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1.5 px-3 py-1.5 justify-center cursor-pointer">
                                    <FileText className="h-3.5 w-3.5" /> <span>Enunciado</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1.5 px-3 py-1.5 justify-center cursor-pointer">
                                    <Award className="h-3.5 w-3.5" /> <span>Calificación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado y Requisitos con scroll vertical independiente */}
                        <TabsContent value="statement" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4">
                            {/* Requerimientos de la actividad */}
                            <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                        {isCloudMode ? "Requerimientos Proyecto Cloud:" : "Requerimientos Técnicos:"}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-mono border-indigo-300">
                                        {targetEngine}
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground space-y-1">
                                    <p>• Motor: <strong>{targetEngine}</strong></p>
                                    <p>• Modalidad: <strong>{isCloudMode ? "Base de Datos en la Nube (Conexión directa vía MCP)" : "Sandbox Local"}</strong></p>
                                    <p>• Normalización exigida: <strong>{requiredNormalization}</strong></p>
                                    {isCloudMode && (
                                        <p>• Proveedores soportados: <strong>Supabase, Neon, Render, Railway, AWS RDS</strong>.</p>
                                    )}
                                </div>
                            </div>

                            {/* Entidades Obligatorias */}
                            {requiredEntities.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-foreground block">
                                        Tablas / Entidades Requeridas en Producción:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {requiredEntities.map((ent, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs font-mono">
                                                {ent}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Enunciado en Markdown */}
                            <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Calificación y Resultados con scroll vertical independiente */}
                        <TabsContent value="results" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4">
                            {isGraded ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Calificación Final</span>
                                        <div className="text-3xl font-extrabold font-mono text-primary">
                                            {submission.grade.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </div>

                                    {/* Sección de Evaluación Docente (Solo si está habilitada en la configuración) */}
                                    {checklistConfig && (
                                        <StudentTeacherEvaluationSection
                                            checklistConfig={checklistConfig}
                                            submission={submission}
                                        />
                                    )}

                                    {submission.feedback && (
                                        <div className="space-y-2">
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                    )}
                                </div>
                            ) : isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                                    <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                                    <p className="text-xs font-semibold">Entrega Enviada</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu base de datos ha sido entregada. El docente y la IA evaluarán la estructura, restricciones y modelo relacional.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has enviado tu entrega</p>
                                    <p className="text-[11px] max-w-xs">
                                        {isCloudMode
                                            ? "Ingresa la cadena de conexión de tu base de datos en el formulario de la derecha."
                                            : "Escribe o carga tu script SQL en el editor de la derecha y pulsa 'Enviar Base de Datos'."}
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Columna Derecha: Entrega (Cloud URI o Editor Monaco) (7 columnas) */}
                <div className={cn(
                    "lg:col-span-7 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs",
                    mobileView === "workspace" ? "flex" : "hidden lg:flex"
                )}>
                    {isCloudMode ? (
                        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 overflow-y-auto space-y-4">
                            <div className="p-3.5 bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 rounded-xl space-y-2 shrink-0">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                                    <Cloud className="h-4 w-4" />
                                    <span>Entrega de Base de Datos en la Nube (PostgreSQL MCP)</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Pega la cadena de conexión (URI) de tu base de datos desplegada en <strong>Supabase</strong>, <strong>Neon</strong>, <strong>Render</strong> o <strong>Railway</strong>. El inspector se conectará en modo de solo lectura para auditar las tablas creadas, índices y volumen de datos reales.
                                </p>
                                <div className="flex items-center gap-1.5 pt-1">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                        Conexión segura SSL. Se audita en modo estricto de solo lectura.
                                    </span>
                                </div>
                            </div>

                            {/* Campo de Cadena de Conexión */}
                            <div className="space-y-2 bg-background p-3 sm:p-4 rounded-xl border shrink-0">
                                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Cadena de Conexión PostgreSQL (URI) *</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">postgresql://usuario:password@host:5432/db</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={connectionString}
                                        onChange={(e) => setConnectionString(e.target.value)}
                                        placeholder="postgresql://postgres:mi-password@db.xxxx.supabase.co:5432/postgres"
                                        disabled={isDeadlinePassed}
                                        className="font-mono text-xs pr-10 h-10 bg-background"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Consejo: En Supabase o Neon, obtén tu connection string con opción <strong>Direct Connection</strong> o <strong>Session Pooler</strong>.
                                </p>
                            </div>

                            {/* Editor de Script de Soporte / DDL Opcional */}
                            <div className="space-y-1.5 flex-1 min-h-[180px] flex flex-col">
                                <Label className="text-xs font-semibold text-foreground flex items-center justify-between shrink-0">
                                    <span>Script de Respaldo / DDL Usado (Opcional):</span>
                                    <span className="text-[10px] text-muted-foreground">Útil si tu base de datos entra en suspensión</span>
                                </Label>
                                <div className="flex-1 rounded-xl border border-border/80 overflow-hidden bg-background min-h-[160px]">
                                    <Editor
                                        key={`cloud_sql_editor_${monacoTheme}`}
                                        path="cloud_backup.sql"
                                        height="100%"
                                        language="sql"
                                        theme={monacoTheme}
                                        value={sqlScript}
                                        onChange={(val) => setSqlScript(val || "")}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 12,
                                            lineNumbers: "on",
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            wordWrap: "on",
                                            readOnly: isDeadlinePassed,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Modo Sandbox Tradicional */
                        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
                            {/* Barra superior de herramientas del editor */}
                            <div className="shrink-0 flex flex-wrap items-center justify-between p-2 sm:p-2.5 border-b bg-muted/30 gap-2">
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-xs font-bold text-foreground">Editor de Script SQL</span>
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 font-semibold gap-1">
                                        <ShieldAlert className="h-3 w-3" /> Digitación manual (Sin pegado)
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={handleTestSandbox}
                                        disabled={isTestingSandbox || isDeadlinePassed}
                                        className="h-7 text-[11px] gap-1 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                                        title="Ejecutar tu script en el motor PostgreSQL en memoria para verificar si compila"
                                    >
                                        {isTestingSandbox ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Play className="h-3 w-3 fill-current" />
                                        )}
                                        <span>Probar SQL (PGlite)</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDownloadSql}
                                        title="Descargar script actual como archivo .sql"
                                        className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSqlScript(DEFAULT_SQL)}
                                        disabled={isDeadlinePassed}
                                        title="Restaurar plantilla inicial"
                                        className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Banner informativo y estadísticas de digitación */}
                            <div className="shrink-0 px-2.5 sm:px-3 py-1.5 bg-muted/10 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 text-foreground/80">
                                    <span className="font-semibold">✍️ Entrada directa:</span>
                                    <span>La subida de archivos y el pegado de texto externo están bloqueados.</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
                                    <span title="Líneas totales redactadas">Líneas: <strong>{sqlStats.lines}</strong></span>
                                    <span>•</span>
                                    <span title="Sentencias CREATE TABLE detectadas">Tablas: <strong>{sqlStats.tables}</strong></span>
                                    <span>•</span>
                                    <span title="Sentencias INSERT INTO detectadas">DML: <strong>{sqlStats.inserts}</strong></span>
                                    {lastSavedTime && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                                                💾 Guardado en tu equipo
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Contenido del Editor Monaco y Consola de Sandbox */}
                            <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-3 overflow-hidden gap-2">
                                <div className="flex-1 min-h-0 rounded-xl border border-border/80 overflow-hidden bg-background">
                                    <Editor
                                        key={`sql_editor_${monacoTheme}`}
                                        path="script.sql"
                                        height="100%"
                                        language="sql"
                                        theme={monacoTheme}
                                        value={sqlScript}
                                        onMount={handleEditorMount}
                                        onChange={(val) => setSqlScript(val || "")}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            lineNumbers: "on",
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            wordWrap: "on",
                                            tabSize: 4,
                                            readOnly: isDeadlinePassed,
                                            suggestOnTriggerCharacters: true,
                                            formatOnPaste: false,
                                            contextmenu: false,
                                        }}
                                    />
                                </div>

                                {/* Consola de Resultados de Ejecución Sandbox (PGlite) */}
                                {showSandboxConsole && (
                                    <div className="shrink-0 max-h-[160px] overflow-y-auto rounded-xl border bg-background p-2.5 space-y-1.5 shadow-xs animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                <Terminal className="h-3.5 w-3.5 text-indigo-600" />
                                                <span>Consola de Verificación Sandbox (PostgreSQL en memoria)</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowSandboxConsole(false)}
                                                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                                                title="Ocultar consola"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {isTestingSandbox ? (
                                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                <span>Ejecutando sentencias SQL en PGlite (WASM)...</span>
                                            </div>
                                        ) : sandboxTestResult ? (
                                            <div className="text-xs space-y-1">
                                                {sandboxTestResult.success ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            <span>¡Script ejecutado sin errores! ({sandboxTestResult.executionTimeMs} ms)</span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Tablas creadas ({sandboxTestResult.createdTableNames.length}):{" "}
                                                            <span className="font-mono text-foreground font-semibold">
                                                                {sandboxTestResult.createdTableNames.join(", ") || "(Ninguna)"}
                                                            </span>
                                                        </div>
                                                        {sandboxTestResult.tables && sandboxTestResult.tables.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                {sandboxTestResult.tables.map((tbl: any, idx: number) => (
                                                                    <Badge key={idx} variant="secondary" className="text-[10px] font-mono">
                                                                        {tbl.tableName} ({tbl.rowCount} filas)
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            <span>Error de sintaxis o ejecución arrojado por PostgreSQL:</span>
                                                        </div>
                                                        <div className="p-2 bg-rose-500/10 border border-rose-200 dark:border-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 font-mono text-[11px] whitespace-pre-wrap">
                                                            {sandboxTestResult.errors?.join("\n") || "Error al ejecutar el script."}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Barra inferior de Entrega */}
                    <div className="shrink-0 p-2.5 sm:p-3 border-t bg-muted/20 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-muted-foreground">
                            {isSubmitted
                                ? "✓ Entrega registrada. Puedes actualizarla antes de la fecha límite."
                                : isCloudMode
                                ? "Verifica que la URI de tu base de datos esté activa y accesible."
                                : "Revisa tu script antes de enviar. Se evaluará en el sandbox del docente."}
                        </span>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isDeadlinePassed}
                            className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0 cursor-pointer"
                        >
                            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {isSubmitted
                                ? (isCloudMode ? "Actualizar Conexión Cloud" : "Actualizar Entrega")
                                : (isCloudMode ? "Enviar Base de Datos Cloud" : "Enviar Base de Datos")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
