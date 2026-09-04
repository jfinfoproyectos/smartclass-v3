"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Terminal, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, Code2, Plus, Trash2,
    CheckCircle, AlertCircle, FileCode, Check, Lock, Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { FeedbackViewer } from "./FeedbackViewer";
import { submitActivityAction } from "../actions/submissionActions";

interface CodeChallengeActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

interface StudentFile {
    id: string;
    name: string;
    content: string;
}

function getLanguageFromFileName(filename: string): string {
    if (!filename) return "javascript";
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case "js":
        case "jsx":
        case "mjs":
        case "cjs":
            return "javascript";
        case "ts":
        case "tsx":
            return "typescript";
        case "py":
        case "pyw":
        case "python":
            return "python";
        case "html":
        case "htm":
            return "html";
        case "css":
        case "scss":
        case "sass":
        case "less":
            return "css";
        case "json":
            return "json";
        case "sql":
            return "sql";
        case "java":
            return "java";
        case "cpp":
        case "cc":
        case "cxx":
        case "c":
        case "h":
        case "hpp":
            return "cpp";
        case "cs":
            return "csharp";
        case "php":
            return "php";
        case "rb":
            return "ruby";
        case "go":
            return "go";
        case "rs":
            return "rust";
        case "md":
        case "markdown":
            return "markdown";
        case "xml":
        case "kt":
        case "kts":
            return "kotlin";
        case "yaml":
        case "yml":
            return "yaml";
        case "xml":
        case "xsd":
        case "svg":
            return "xml";
        case "ini":
        case "toml":
        case "env":
        case "properties":
            return "ini";
        case "sh":
        case "bash":
        case "zsh":
            return "shell";
        case "dockerfile":
            return "dockerfile";
        default:
            return "javascript";
    }
}

function getExtensionFromLanguage(lang: string): string {
    switch (lang) {
        case "kotlin": return "kt";
        case "python": return "py";
        case "typescript": return "ts";
        case "java": return "java";
        case "cpp": return "cpp";
        case "csharp": return "cs";
        case "php": return "php";
        case "go": return "go";
        case "rust": return "rs";
        case "sql": return "sql";
        case "yaml": return "yaml";
        case "xml": return "xml";
        case "json": return "json";
        case "ini": return "env";
        case "shell": return "sh";
        case "dockerfile": return "dockerfile";
        case "html": return "html";
        case "css": return "css";
        case "markdown": return "md";
        case "javascript":
        default: return "js";
    }
}

export function CodeChallengeActivityDetails({
    activity,
    userId,
    studentName,
}: CodeChallengeActivityDetailsProps) {
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
    const monacoTheme = mode === "dark" ? "vs-dark" : "light";

    // Extraer configuración del desafío desde activity.description
    const challengeConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            return data?.challengeConfig || null;
        } catch {
            return null;
        }
    }, [activity?.description]);

    const initialFiles: StudentFile[] = useMemo(() => {
        if (challengeConfig?.files && Array.isArray(challengeConfig.files) && challengeConfig.files.length > 0) {
            return challengeConfig.files.map((f: any, idx: number) => ({
                id: f.id || String(idx + 1),
                name: f.name || `archivo_${idx + 1}.js`,
                content: f.content || "",
            }));
        }
        if (challengeConfig?.starterCode) {
            const ext = challengeConfig.language === "python" ? "py" : challengeConfig.language === "typescript" ? "ts" : "js";
            return [
                { id: "1", name: `solucion.${ext}`, content: challengeConfig.starterCode }
            ];
        }
        return [
            { id: "1", name: "solucion.js", content: "// Escribe tu solución aquí\n" }
        ];
    }, [challengeConfig]);

    // Extraer datos entregados previamente por el estudiante
    const savedSubmissionData = useMemo(() => {
        if (!submission?.url) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    const [files, setFiles] = useState<StudentFile[]>(() => {
        if (savedSubmissionData?.files && Array.isArray(savedSubmissionData.files) && savedSubmissionData.files.length > 0) {
            return savedSubmissionData.files;
        }
        if (savedSubmissionData?.code) {
            return [
                { id: "1", name: "solucion.js", content: savedSubmissionData.code }
            ];
        }
        return initialFiles;
    });

    const [activeFileId, setActiveFileId] = useState<string>(files[0]?.id || "1");
    const [activeRightTab, setActiveRightTab] = useState<"statement" | "results">("statement");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const activeFile = files.find(f => f.id === activeFileId) || files[0];
    const activeFileIndex = files.findIndex(f => f.id === activeFile?.id);

    // Actualizar contenido del archivo en edición
    const handleCodeChange = (newCode: string | undefined) => {
        if (newCode === undefined || activeFileIndex === -1) return;
        const updated = [...files];
        updated[activeFileIndex] = { ...activeFile, content: newCode };
        setFiles(updated);
    };

    // Bloquear pegado de contenido para forzar digitación manual
    const handleEditorDidMount = (editor: any, monaco: any) => {
        // 1. Bloquear atajos de teclado de pegado (Ctrl+V, Cmd+V, Shift+Insert)
        editor.onKeyDown((e: any) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const isVKey = e.keyCode === monaco.KeyCode.KeyV || e.browserEvent?.key?.toLowerCase() === "v";
            const isShiftInsert = e.shiftKey && (e.keyCode === monaco.KeyCode.Insert || e.browserEvent?.key === "Insert");

            if ((isCtrlOrCmd && isVKey) || isShiftInsert) {
                e.preventDefault();
                e.stopPropagation();
                toast.warning("Pegado deshabilitado", {
                    description: "En este taller de código debes digitar el código manualmente. No está permitido pegar contenido.",
                    duration: 4000,
                });
            }
        });

        // 2. Bloquear evento DOM 'paste' nativo en el contenedor del editor (click derecho, menú de portapapeles, etc.)
        const domNode = editor.getDomNode();
        if (domNode) {
            domNode.addEventListener(
                "paste",
                (e: ClipboardEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.warning("Pegado deshabilitado", {
                        description: "En este taller de código debes digitar el código manualmente. No está permitido pegar contenido.",
                        duration: 4000,
                    });
                },
                true
            );

            // 3. Bloquear arrastrar y soltar texto hacia el editor
            domNode.addEventListener(
                "drop",
                (e: DragEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.warning("Arrastre deshabilitado", {
                        description: "Debes digitar la solución manualmente en este taller.",
                        duration: 4000,
                    });
                },
                true
            );
        }
    };

    // Añadir nuevo archivo
    const handleAddFile = () => {
        const fileName = prompt("Nombre del nuevo archivo (ej: utils.js, data.json):");
        if (!fileName || !fileName.trim()) return;
        const cleanName = fileName.trim();
        if (files.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
            toast.warning("Ya existe un archivo con ese nombre.");
            return;
        }
        const newId = Date.now().toString();
        const newFile: StudentFile = {
            id: newId,
            name: cleanName,
            content: `// Archivo: ${cleanName}\n`,
        };
        setFiles([...files, newFile]);
        setActiveFileId(newId);
    };

    // Eliminar archivo
    const handleDeleteFile = (fileId: string) => {
        if (files.length <= 1) {
            toast.warning("La actividad debe tener al menos un archivo.");
            return;
        }
        const filtered = files.filter(f => f.id !== fileId);
        setFiles(filtered);
        if (activeFileId === fileId) {
            setActiveFileId(filtered[0]?.id || "1");
        }
    };

    // Enviar entrega de la actividad
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = JSON.stringify({
                files: files,
                code: files[0]?.content || "",
                submittedAt: new Date().toISOString(),
            });

            const formData = new FormData();
            formData.append("activityId", activity.id);
            formData.append("url", payload);

            await submitActivityAction(null, formData);
            toast.success("✓ ¡Solución de código entregada exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al entregar la actividad.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200">
                            <Terminal className="h-3.5 w-3.5 mr-1" />
                            Taller de Código (Monaco)
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                            {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
                {/* Columna Izquierda: Monaco Code Editor (7 columnas) */}
                <div className="lg:col-span-7 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    {/* Barra de pestañas de archivos estilo VS Code */}
                    <div className="p-2 border-b bg-muted/40 flex items-center justify-between gap-2 overflow-x-auto">
                        <div className="flex items-center gap-1 min-w-0">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => setActiveFileId(file.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono font-medium cursor-pointer border transition-all select-none",
                                        activeFileId === file.id
                                            ? "bg-background text-foreground border-border shadow-2xs font-bold"
                                            : "bg-muted/30 hover:bg-muted/60 text-muted-foreground border-transparent"
                                    )}
                                >
                                    <FileCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">{file.name}</span>
                                    {files.length > 1 && !isDeadlinePassed && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFile(file.id);
                                            }}
                                            className="h-4 w-4 rounded hover:bg-destructive/20 hover:text-destructive flex items-center justify-center text-[10px]"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}

                            {!isDeadlinePassed && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddFile}
                                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                                >
                                    <Plus className="h-3 w-3" /> Nuevo Archivo
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0" title="En este taller no está permitido pegar código. Debes digitar la solución manualmente.">
                                <Lock className="h-3 w-3 text-amber-500" />
                                <span className="hidden sm:inline">Digitación obligatoria (Pegado bloqueado)</span>
                            </div>

                            <select
                                value={getLanguageFromFileName(activeFile?.name || "")}
                                onChange={(e) => {
                                    const selectedLang = e.target.value;
                                    const ext = getExtensionFromLanguage(selectedLang);
                                    const baseName = activeFile.name.includes('.') ? activeFile.name.substring(0, activeFile.name.lastIndexOf('.')) : activeFile.name;
                                    const newName = `${baseName || "archivo"}.${ext}`;
                                    const updated = [...files];
                                    updated[activeFileIndex] = { ...activeFile, name: newName };
                                    setFiles(updated);
                                }}
                                disabled={isDeadlinePassed}
                                className="h-6 rounded border border-input bg-background px-1.5 text-[10px] font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                            >
                                <optgroup label="Lenguajes de Programación">
                                    <option value="kotlin">Kotlin (.kt)</option>
                                    <option value="python">Python (.py)</option>
                                    <option value="javascript">JavaScript (.js)</option>
                                    <option value="typescript">TypeScript (.ts)</option>
                                    <option value="java">Java (.java)</option>
                                    <option value="cpp">C++ (.cpp)</option>
                                    <option value="csharp">C# (.cs)</option>
                                    <option value="php">PHP (.php)</option>
                                    <option value="go">Go (.go)</option>
                                    <option value="rust">Rust (.rs)</option>
                                    <option value="sql">SQL (.sql)</option>
                                </optgroup>
                                <optgroup label="Archivos de Configuración y Datos">
                                    <option value="json">JSON (.json)</option>
                                    <option value="yaml">YAML (.yaml, .yml)</option>
                                    <option value="xml">XML (.xml)</option>
                                    <option value="ini">Variables de Entorno (.env, .ini)</option>
                                    <option value="dockerfile">Dockerfile</option>
                                    <option value="shell">Script Bash / Shell (.sh)</option>
                                </optgroup>
                                <optgroup label="Web y Documentación">
                                    <option value="html">HTML (.html)</option>
                                    <option value="css">CSS (.css)</option>
                                    <option value="markdown">Markdown (.md)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-[460px] bg-background">
                        {activeFile && (
                            <Editor
                                key={`${activeFile.id}_${getLanguageFromFileName(activeFile.name)}`}
                                path={activeFile.name}
                                height="100%"
                                language={getLanguageFromFileName(activeFile.name)}
                                theme={monacoTheme}
                                value={activeFile.content}
                                onChange={handleCodeChange}
                                onMount={handleEditorDidMount}
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
                                    dragAndDrop: false,
                                    contextmenu: false,
                                }}
                            />
                        )}
                    </div>

                    {/* Barra inferior de envío */}
                    <div className="p-3 border-t bg-card flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                            {isSubmitted
                                ? "✓ Código enviado. Puedes seguir editando y actualizar tu entrega antes del límite."
                                : "Resuelve el código solicitado en el editor y haz clic en entregar."}
                        </span>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isDeadlinePassed}
                            className="font-bold text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        >
                            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {isSubmitted ? "Actualizar Entrega" : "Entregar Actividad"}
                        </Button>
                    </div>
                </div>

                {/* Columna Derecha: Enunciado y Calificación (5 columnas) */}
                <div className="lg:col-span-5 flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden shadow-xs">
                    <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as any)} className="flex-1 flex flex-col">
                        <div className="border-b p-2 bg-muted/30 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-2 h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado e Instrucciones</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1 shrink-0 px-3 py-1.5 whitespace-nowrap">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Evaluación</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado */}
                        <TabsContent value="statement" className="flex-1 p-4 overflow-y-auto m-0 space-y-4">
                            {/* Archivos que componen la actividad */}
                            <div className="p-3 bg-muted/20 rounded-xl border space-y-2">
                                <span className="text-xs font-bold text-foreground block">Archivos del Proyecto:</span>
                                <div className="space-y-1">
                                    {files.map((f) => (
                                        <div key={f.id} className="flex items-center gap-2 text-xs">
                                            <FileCode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            <span className="font-mono text-muted-foreground font-semibold">{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

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
                                    <CheckCircle className="h-8 w-8 text-blue-600" />
                                    <p className="text-xs font-semibold">Código Enviado Exitosamente</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu solución ha sido registrada. El profesor evaluará tu código con asistencia de IA y/o sustentación oral.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs">Aún no has entregado la actividad</p>
                                    <p className="text-[11px] max-w-xs">
                                        Resuelve los archivos en el editor Monaco y haz clic en el botón inferior para entregar.
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
