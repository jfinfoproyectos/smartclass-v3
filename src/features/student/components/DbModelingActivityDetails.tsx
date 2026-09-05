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
    Upload, Download, FileCode, Cloud, Eye, EyeOff, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { FeedbackViewer } from "./FeedbackViewer";
import { submitActivityAction } from "../actions/submissionActions";

interface DbModelingActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

const DEFAULT_SQL = `-- ============================================================
-- 1. ESTRUCTURA Y DEFINICIÓN DE TABLAS (DDL)
-- ============================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transacciones (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. INSERCIÓN DE DATOS DE PRUEBA Y MANIPULACIÓN (DML)
-- ============================================================
INSERT INTO roles (nombre) VALUES 
('Administrador'),
('Docente'),
('Estudiante');

INSERT INTO usuarios (nombre, email, rol_id) VALUES 
('Carlos Mendoza', 'carlos@smartclass.edu', 1),
('Ana Gómez', 'ana@smartclass.edu', 2),
('David López', 'david@smartclass.edu', 3);

INSERT INTO transacciones (usuario_id, monto) VALUES 
(1, 1500.00),
(2, 320.50),
(3, 85.00);

-- ============================================================
-- 3. CONSULTAS Y VERIFICACIÓN (DQL)
-- ============================================================
SELECT 
    u.id, 
    u.nombre, 
    u.email, 
    r.nombre AS rol,
    COALESCE(SUM(t.monto), 0) AS total_transacciones
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
LEFT JOIN transacciones t ON u.id = t.usuario_id
GROUP BY u.id, u.nombre, u.email, r.nombre
ORDER BY total_transacciones DESC;
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

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Cargar datos entregados previamente
    const savedData = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    const [connectionString, setConnectionString] = useState<string>(
        savedData?.connectionString || ""
    );
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const [sqlScript, setSqlScript] = useState<string>(
        savedData?.sqlScript || DEFAULT_SQL
    );
    const [activeLeftTab, setActiveLeftTab] = useState<"statement" | "results">(
        isGraded ? "results" : "statement"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Manejar carga de archivo .sql desde el disco
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setSqlScript(content);
                toast.success(`✓ Archivo "${file.name}" cargado en el editor SQL.`);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

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
            if (!sqlScript.trim()) {
                toast.warning("Debes incluir tu script SQL antes de enviar.");
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

            await submitActivityAction(null, formData);
            toast.success(isCloudMode ? "✓ ¡Conexión a Base de Datos Cloud entregada exitosamente!" : "✓ ¡Script SQL entregado exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al enviar la entrega.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Input oculto para carga de archivos .sql */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".sql,.txt"
                className="hidden"
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isCloudMode ? (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200">
                                <Cloud className="h-3.5 w-3.5 mr-1" />
                                Cloud PostgreSQL MCP
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                                <Database className="h-3.5 w-3.5 mr-1" />
                                Base de Datos & SQL
                            </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs font-mono">
                            Motor: {targetEngine}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">
                            Norm: {requiredNormalization}
                        </Badge>
                        {isGraded ? (
                            <Badge className="bg-emerald-600 text-white font-bold">
                                Calificado: {submission.grade.toFixed(1)} / 5.0
                            </Badge>
                        ) : isSubmitted ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Entregado (Pendiente de Calificación)
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                                Sin entregar
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {activity.title}
                    </h1>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Límite: {activity.deadline ? format(new Date(activity.deadline), "PPp", { locale: es }) : "Sin fecha"}</span>
                    </div>
                </div>
            </div>

            {/* Layout principal: Izquierda Enunciado / Derecha Entrega */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
                {/* Columna Izquierda: Enunciado, Requerimientos y Calificación (5 columnas) */}
                <div className="lg:col-span-5 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    <Tabs value={activeLeftTab} onValueChange={(v) => setActiveLeftTab(v as any)} className="flex-1 flex flex-col">
                        <div className="border-b p-2 bg-muted/30">
                            <TabsList className="grid grid-cols-2 h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1.5 px-3">
                                    <FileText className="h-3.5 w-3.5" /> <span>Enunciado</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1.5 px-3">
                                    <Award className="h-3.5 w-3.5" /> <span>Calificación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado y Requisitos */}
                        <TabsContent value="statement" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
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
                            <div className="space-y-1.5 pt-2">
                                <span className="text-xs font-bold text-foreground block">
                                    Descripción del Proyecto:
                                </span>
                                <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No hay enunciado disponible para esta actividad.**"}
                                        style={{ background: 'transparent' }}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Calificación y Feedback */}
                        <TabsContent value="results" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {isGraded ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                        <span className="text-xs font-semibold text-muted-foreground">Calificación Final</span>
                                        <div className="text-3xl font-extrabold font-mono text-primary">
                                            {submission.grade.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                                        </div>
                                    </div>

                                    {submission.feedback && (
                                        <div className="space-y-2">
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                    )}
                                </div>
                            ) : isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                                    <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                                    <p className="text-xs font-semibold">Entrega Registrada</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        {isCloudMode
                                            ? "La conexión a tu base de datos en la nube está lista para ser auditada por el docente con PostgreSQL MCP."
                                            : "Tu script SQL está registrado y listo para ser evaluado en el sandbox del docente."}
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
                <div className="lg:col-span-7 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    {isCloudMode ? (
                        <div className="flex-1 flex flex-col p-4 space-y-4">
                            <div className="p-3.5 bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 rounded-xl space-y-2">
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
                            <div className="space-y-2 bg-background p-4 rounded-xl border">
                                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Cadena de Conexión PostgreSQL (URI) *</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">postgresql://usuario:password@host:5432/db</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={connectionString}
                                        onChange={(e) => setConnectionString(e.target.value)}
                                        disabled={isDeadlinePassed}
                                        placeholder="postgresql://postgres:[password]@db.supabase.co:5432/postgres"
                                        className="pr-10 font-mono text-xs bg-muted/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        title={showPassword ? "Ocultar credenciales" : "Mostrar credenciales"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Tip: Puedes crear un usuario de base de datos con permisos de lectura o usar tu base de datos de desarrollo/staging.
                                </p>
                            </div>

                            {/* Editor Monaco Opcional para Scripts de Migración o Notas */}
                            <div className="flex-1 flex flex-col space-y-1.5 min-h-[260px]">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                                        Scripts de Migración / Consultas de Demostración (Opcional)
                                    </span>
                                    <span className="text-[10px]">SQL / Notas</span>
                                </div>
                                <div className="flex-1 rounded-xl border border-border/80 overflow-hidden min-h-[220px] bg-background">
                                    <Editor
                                        key={`sql_cloud_notes_${monacoTheme}`}
                                        path="cloud_notes.sql"
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
                        <div className="flex-1 flex flex-col">
                            {/* Barra superior de herramientas del editor */}
                            <div className="flex items-center justify-between p-2.5 border-b bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-xs font-bold text-foreground">Editor de Script SQL (.sql)</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isDeadlinePassed}
                                        className="h-7 text-[11px] gap-1 px-2.5 font-semibold text-foreground"
                                    >
                                        <Upload className="h-3 w-3 text-indigo-600" /> Cargar .sql
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDownloadSql}
                                        title="Descargar script actual"
                                        className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSqlScript(DEFAULT_SQL)}
                                        disabled={isDeadlinePassed}
                                        title="Restablecer plantilla inicial"
                                        className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Contenido del Editor Monaco */}
                            <div className="flex-1 flex flex-col p-3 min-h-[500px]">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-2">
                                    <span>
                                        Redacta las sentencias <strong>DDL</strong> (tablas, constraints), <strong>DML</strong> (inserts) y <strong>DQL</strong> (consultas).
                                    </span>
                                </div>

                                <div className="flex-1 rounded-xl border border-border/80 overflow-hidden min-h-[460px] bg-background">
                                    <Editor
                                        key={`sql_editor_${monacoTheme}`}
                                        path="script.sql"
                                        height="100%"
                                        language="sql"
                                        theme={monacoTheme}
                                        value={sqlScript}
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
                                            formatOnPaste: true,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Barra inferior de envío */}
                    <div className="p-3 border-t bg-card flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground truncate">
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
                            className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0"
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
