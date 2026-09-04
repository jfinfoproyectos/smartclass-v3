"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Database, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, Code2,
    CheckCircle, AlertCircle, Layers, Check, ExternalLink,
    Upload, Download, FileCode, Play, Terminal
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

const DEFAULT_MERMAID = `erDiagram
    USUARIOS ||--o{ TRANSACCIONES : realiza
    ROLES ||--o{ USUARIOS : asigna
    
    USUARIOS {
        int id PK
        string nombre
        string email UK
        int rol_id FK
    }
    ROLES {
        int id PK
        string nombre
    }
    TRANSACCIONES {
        int id PK
        int usuario_id FK
        decimal monto
        datetime fecha
    }`;

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

    const targetEngine = dbConfig?.targetEngine || "PostgreSQL";
    const requiredNormalization = dbConfig?.requiredNormalization || "3FN";
    const requiredEntities: string[] = dbConfig?.requiredEntities || [
        "Usuarios",
        "Roles",
        "Transacciones",
        "Auditoría",
    ];

    // Cargar datos entregados previamente
    const savedData = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    const [diagramCode, setDiagramCode] = useState<string>(
        savedData?.diagramCode || DEFAULT_MERMAID
    );
    const [sqlScript, setSqlScript] = useState<string>(
        savedData?.sqlScript || DEFAULT_SQL
    );
    const [editorTab, setEditorTab] = useState<"sql" | "diagram">("sql");
    const [diagramSubTab, setDiagramSubTab] = useState<"preview" | "code">("preview");
    const [activeRightTab, setActiveRightTab] = useState<"statement" | "results">("statement");
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
                toast.success(`✓ Archivo "${file.name}" cargado correctamente en el editor SQL.`);
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
        if (!diagramCode.trim() && !sqlScript.trim()) {
            toast.warning("Debes incluir al menos el script SQL o el diagrama.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = JSON.stringify({
                diagramCode: diagramCode.trim(),
                sqlScript: sqlScript.trim(),
                submittedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            await submitActivityAction(null, formData);
            toast.success("✓ ¡Modelo y script SQL entregados exitosamente!");
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
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                            <Database className="h-3.5 w-3.5 mr-1" />
                            Base de Datos & SQL
                        </Badge>
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

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[660px]">
                {/* Columna Izquierda: Editor Monaco SQL y Diagrama ER (7 columnas) */}
                <div className="lg:col-span-7 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    {/* Barra superior de pestañas */}
                    <div className="flex items-center justify-between p-2.5 border-b bg-muted/30">
                        <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as any)}>
                            <TabsList className="h-8">
                                <TabsTrigger value="sql" className="text-xs font-bold gap-1.5 px-3">
                                    <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Script SQL (.sql)
                                </TabsTrigger>
                                <TabsTrigger value="diagram" className="text-xs font-bold gap-1.5 px-3">
                                    <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Diagrama ER (Mermaid)
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Botones de acción según pestaña */}
                        {editorTab === "sql" ? (
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
                                    className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                >
                                    <Download className="h-3 w-3" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant={diagramSubTab === "preview" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setDiagramSubTab("preview")}
                                    className="h-7 text-[11px] px-2"
                                >
                                    Gráfico
                                </Button>
                                <Button
                                    type="button"
                                    variant={diagramSubTab === "code" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setDiagramSubTab("code")}
                                    className="h-7 text-[11px] px-2"
                                >
                                    Código
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Contenido del editor */}
                    <div className="flex-1 flex flex-col p-3 min-h-[460px]">
                        {editorTab === "sql" ? (
                            <div className="flex-1 flex flex-col space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                                    <span>
                                        Editor Monaco para sentencias <strong>DDL</strong> (tablas, PK/FK), <strong>DML</strong> (inserts de prueba) y <strong>DQL</strong> (consultas).
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSqlScript(DEFAULT_SQL)}
                                        disabled={isDeadlinePassed}
                                        className="text-primary hover:underline font-mono text-[10px]"
                                    >
                                        Restablecer plantilla
                                    </button>
                                </div>

                                <div className="flex-1 rounded-xl border border-border/80 overflow-hidden min-h-[420px] bg-background">
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
                        ) : diagramSubTab === "code" ? (
                            <div className="flex-1 flex flex-col space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                                    <span>Escribe la sintaxis Mermaid para el modelo relacional (<code>erDiagram</code>).</span>
                                    <button
                                        type="button"
                                        onClick={() => setDiagramCode(DEFAULT_MERMAID)}
                                        disabled={isDeadlinePassed}
                                        className="text-primary hover:underline text-[10px]"
                                    >
                                        Restablecer plantilla
                                    </button>
                                </div>
                                <Textarea
                                    value={diagramCode}
                                    onChange={(e) => setDiagramCode(e.target.value)}
                                    disabled={isDeadlinePassed}
                                    rows={18}
                                    className="flex-1 font-mono text-xs leading-relaxed resize-none bg-background p-3"
                                    placeholder="erDiagram&#10;    USUARIOS ||--o{ TRANSACCIONES : realiza&#10;..."
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col rounded-xl border bg-background p-4 overflow-auto min-h-[420px]">
                                <div data-color-mode={mode} className="prose prose-sm dark:prose-invert max-w-none flex items-center justify-center min-h-[380px]">
                                    <MDEditor.Markdown
                                        source={`\`\`\`mermaid\n${diagramCode}\n\`\`\``}
                                        style={{ background: 'transparent' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Barra inferior de envío */}
                    <div className="p-3 border-t bg-card flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                            {isSubmitted ? "✓ Script SQL y modelo entregados. Puedes actualizarlos antes del límite." : "Verifica que el script SQL contenga DDL y DML antes de enviar."}
                        </span>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isDeadlinePassed}
                            className="font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        >
                            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {isSubmitted ? "Actualizar Entrega" : "Enviar Base de Datos"}
                        </Button>
                    </div>
                </div>

                {/* Columna Derecha: Enunciado, Entidades y Calificación (5 columnas) */}
                <div className="lg:col-span-5 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as any)} className="flex-1 flex flex-col">
                        <div className="border-b p-2 bg-muted/30 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Calificación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado y Entidades */}
                        <TabsContent value="statement" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {/* Requerimientos de la actividad */}
                            <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Requerimientos de Base de Datos:</span>
                                    <Badge variant="outline" className="text-[10px] font-mono border-indigo-300">
                                        {targetEngine}
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground space-y-1">
                                    <p>• Motor: <strong>{targetEngine}</strong></p>
                                    <p>• Normalización exigida: <strong>{requiredNormalization}</strong></p>
                                    <p>• Alcance: <strong>DDL</strong> (Estructura), <strong>DML</strong> (Datos de prueba) y <strong>Modelo ER</strong>.</p>
                                </div>
                            </div>

                            {/* Entidades Obligatorias */}
                            {requiredEntities.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-foreground block">
                                        Tablas / Entidades Requeridas:
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

                        {/* Pestaña 2: Calificación */}
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
                                    <p className="text-xs font-semibold">Script SQL y Modelo Entregados</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu entrega está lista para ser evaluada por el docente mediante auditoría con IA.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has enviado tu entrega</p>
                                    <p className="text-[11px] max-w-xs">
                                        Escribe o carga tu script SQL a la izquierda y pulsa el botón para entregar.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
