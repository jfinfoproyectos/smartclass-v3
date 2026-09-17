"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Terminal, Send, CheckCircle2, Clock, RotateCcw,
    FileText, Award, Sparkles, Loader2, Info, Code2, Plus, Trash2,
    CheckCircle, AlertCircle, FileCode, Check, Lock, Keyboard, ChevronLeft
} from "lucide-react";
import Link from "next/link";
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
import { getActivityChecklistConfig, extractEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { StudentTeacherEvaluationSection } from "./StudentTeacherEvaluationSection";

interface CodeChallengeActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
    isTeacherPreview?: boolean;
    onClosePreview?: () => void;
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

function extractCodeChallengeFilesFromMarkdown(markdown: string): StudentFile[] {
    if (!markdown) return [];
    const files: StudentFile[] = [];
    const seen = new Set<string>();

    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\s*\n(?:\/\/|#|--|\/\*)\s*([a-zA-Z0-9_\-]+\.(?:java|py|js|ts|tsx|jsx|cpp|c|h|hpp|cs|kt|php|go|rs|sql|html|css|json|yaml|yml|md|txt))[\s*\/]*\n([\s\S]*?)```/gi;
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        const rawFileName = match[1].trim();
        const baseName = rawFileName.split(/[\/\\]/).pop() || rawFileName;
        if (baseName && !seen.has(baseName.toLowerCase()) && baseName.includes('.')) {
            seen.add(baseName.toLowerCase());
            files.push({
                id: String(files.length + 1),
                name: baseName,
                content: match[2].trim()
            });
        }
    }

    const fileListRegex = /(?:^|\n)\s*(?:[-*•]|\d+[.)])\s*(?:\*\*)?`?([a-zA-Z0-9_\-]+\.(?:java|py|js|ts|tsx|jsx|cpp|c|h|hpp|cs|kt|php|go|rs|sql|html|css|json|yaml|yml|md|txt))`?(?:\*\*)?(?:\s*[:\-–—]\s*(.*?))?(?=\n|$)/gi;
    let fileMatch;
    while ((fileMatch = fileListRegex.exec(markdown)) !== null) {
        const fileName = fileMatch[1].trim();
        const desc = fileMatch[2]?.trim() || "";
        if (!seen.has(fileName.toLowerCase())) {
            seen.add(fileName.toLowerCase());
            files.push({
                id: String(files.length + 1),
                name: fileName,
                content: desc ? `// ${fileName}\n// ${desc}\n` : `// ${fileName}\n`
            });
        }
    }

    return files;
}

export function CodeChallengeActivityDetails({
    activity,
    userId,
    studentName,
    isTeacherPreview = false,
    onClosePreview,
}: CodeChallengeActivityDetailsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const submission = activity.submissions?.[0];
    const isSubmitted = !!submission;
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isDeadlinePassed = activity.deadline && new Date(activity.deadline) < new Date();

    // Extraer configuración de lista de chequeo docente
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const evalMetadata = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
    const monacoTheme = mode === "dark" ? "vs-dark" : "light";

    // Bloquear copiado en toda la vista de la actividad (enunciado, archivos y código)
    useEffect(() => {
        if (isTeacherPreview) return; // Permite copiar y atajos al docente en modo de prueba

        const handleCopy = (e: ClipboardEvent) => {
            const container = containerRef.current;
            if (!container) return;

            const selection = window.getSelection();
            const targetNode = e.target instanceof Node ? e.target : null;
            const isTargetInside = targetNode ? container.contains(targetNode) : false;
            const isSelectionInside = selection?.anchorNode ? container.contains(selection.anchorNode) : false;
            const isActiveInside = document.activeElement ? container.contains(document.activeElement) : false;

            if (isTargetInside || isSelectionInside || isActiveInside) {
                e.preventDefault();
                e.stopPropagation();
                selection?.removeAllRanges();
                toast.warning("Copiado deshabilitado", {
                    description: "Por políticas académicas, no está permitido copiar el enunciado ni el contenido de este taller.",
                    duration: 4000,
                });
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            if (isCtrlOrCmd && (e.key === "c" || e.key === "C")) {
                const container = containerRef.current;
                if (!container) return;

                const selection = window.getSelection();
                const targetNode = e.target instanceof Node ? e.target : null;
                const isTargetInside = targetNode ? container.contains(targetNode) : false;
                const isSelectionInside = selection?.anchorNode ? container.contains(selection.anchorNode) : false;
                const isActiveInside = document.activeElement ? container.contains(document.activeElement) : false;

                if (isTargetInside || isSelectionInside || isActiveInside) {
                    e.preventDefault();
                    e.stopPropagation();
                    selection?.removeAllRanges();
                    toast.warning("Copiado deshabilitado", {
                        description: "No está permitido copiar el enunciado ni las instrucciones de este taller.",
                        duration: 4000,
                    });
                }
            }
        };

        document.addEventListener("copy", handleCopy, true);
        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("copy", handleCopy, true);
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, []);

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
            const isJustDefaultJs = challengeConfig.files.length === 1 && challengeConfig.files[0].name === "solucion.js";
            if (!isJustDefaultJs) {
                return challengeConfig.files.map((f: any, idx: number) => ({
                    id: f.id || String(idx + 1),
                    name: f.name || `archivo_${idx + 1}.js`,
                    content: typeof f.content === "string" ? f.content : "",
                }));
            }
        }
        // Fallback: Si no hay archivos o sólo quedó solucion.js por defecto, verificar si el enunciado tiene archivos definidos
        if (activity?.statement) {
            const recovered = extractCodeChallengeFilesFromMarkdown(activity.statement);
            if (recovered.length > 0) {
                return recovered;
            }
        }
        if (challengeConfig?.files && Array.isArray(challengeConfig.files) && challengeConfig.files.length > 0) {
            return challengeConfig.files.map((f: any, idx: number) => ({
                id: f.id || String(idx + 1),
                name: f.name || `archivo_${idx + 1}.js`,
                content: typeof f.content === "string" ? f.content : "",
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
    }, [challengeConfig, activity?.statement]);

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
    const [mobileTab, setMobileTab] = useState<"statement" | "code" | "results">(
        isGraded ? "results" : "statement"
    );
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const editorRef = useRef<any>(null);

    // Suprimir advertencias benignas de cancelación interna de Monaco Editor
    useEffect(() => {
        const isCanceledReason = (val: any): boolean => {
            if (!val) return false;
            if (typeof val === "string") return val.toLowerCase().includes("canceled");
            if (typeof val === "object") {
                const msg = val.message || "";
                const name = val.name || "";
                const str = String(val);
                return (
                    (typeof msg === "string" && msg.toLowerCase().includes("canceled")) ||
                    (typeof name === "string" && name.toLowerCase().includes("canceled")) ||
                    str.toLowerCase().includes("canceled")
                );
            }
            return false;
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            if (isCanceledReason(event.reason)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const hasCanceled = args.some(isCanceledReason);
            if (hasCanceled) {
                return;
            }
            originalConsoleError.apply(console, args);
        };

        window.addEventListener("unhandledrejection", handleUnhandledRejection);
        return () => {
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, []);

    // Redimensionar Monaco de forma segura cuando el estudiante entra a la pestaña de código en móvil
    useEffect(() => {
        if (mobileTab === "code") {
            const timer = setTimeout(() => {
                try {
                    editorRef.current?.layout();
                } catch {
                    // Editor no montado aún
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mobileTab]);

    // Sincronizar automáticamente si el docente actualiza los archivos de plantilla y el alumno aún no ha entregado
    useEffect(() => {
        if (!isSubmitted && initialFiles.length > 0) {
            setFiles(initialFiles);
        }
    }, [initialFiles, isSubmitted]);

    // Mantener sincronizado el archivo activo si la lista de archivos cambia
    useEffect(() => {
        if (files.length > 0 && !files.some(f => f.id === activeFileId)) {
            setActiveFileId(files[0].id);
        }
    }, [files, activeFileId]);

    const activeFile = files.find(f => f.id === activeFileId) || files[0];
    const activeFileIndex = files.findIndex(f => f.id === activeFile?.id);
    const language = challengeConfig?.language || (files[0] ? getLanguageFromFileName(files[0].name) : "javascript");

    // Actualizar contenido del archivo en edición
    const handleCodeChange = (newCode: string | undefined) => {
        if (newCode === undefined || activeFileIndex === -1) return;
        const updated = [...files];
        updated[activeFileIndex] = { ...activeFile, content: newCode };
        setFiles(updated);
    };

    // Bloquear pegado y copiado de contenido para forzar digitación manual
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        if (isTeacherPreview) return; // Permitir al profesor pegar y probar libremente

        // 1. Bloquear atajos de teclado de pegado (Ctrl+V, Cmd+V, Shift+Insert) y copiado (Ctrl+C, Cmd+C)
        editor.onKeyDown((e: any) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const isVKey = e.keyCode === monaco.KeyCode.KeyV || e.browserEvent?.key?.toLowerCase() === "v";
            const isCKey = e.keyCode === monaco.KeyCode.KeyC || e.browserEvent?.key?.toLowerCase() === "c";
            const isShiftInsert = e.shiftKey && (e.keyCode === monaco.KeyCode.Insert || e.browserEvent?.key === "Insert");

            if ((isCtrlOrCmd && isVKey) || isShiftInsert) {
                e.preventDefault();
                e.stopPropagation();
                toast.warning("Pegado deshabilitado", {
                    description: "En este taller de código debes digitar el código manualmente. No está permitido pegar contenido.",
                    duration: 4000,
                });
            }

            if (isCtrlOrCmd && isCKey) {
                e.preventDefault();
                e.stopPropagation();
                toast.warning("Copiado deshabilitado", {
                    description: "En este taller de código no está permitido copiar código.",
                    duration: 4000,
                });
            }
        });

        // 2. Bloquear evento DOM 'paste' y 'copy' nativo en el contenedor del editor
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

            domNode.addEventListener(
                "copy",
                (e: ClipboardEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.warning("Copiado deshabilitado", {
                        description: "En este taller de código no está permitido copiar código.",
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


    // Estados para simulación y pruebas del docente
    const [isGeneratingAllSolutions, setIsGeneratingAllSolutions] = useState(false);
    const [isTestGradingAI, setIsTestGradingAI] = useState(false);
    const [testGradingResult, setTestGradingResult] = useState<any>(null);

    // Generar todas las soluciones con IA
    const handleGenerateAllSolutions = async () => {
        if (files.length === 0) {
            toast.error("No hay archivos configurados en la actividad.");
            return;
        }

        setIsGeneratingAllSolutions(true);
        try {
            const { generateAllCodeChallengeSolutionsAction } = await import("@/features/teacher/actions/activityActions");
            const updatedFiles = await generateAllCodeChallengeSolutionsAction(
                files,
                language,
                activity.statement || "",
                activity.title || "Taller de Código"
            );
            setFiles(updatedFiles);
            toast.success("✓ Soluciones completas generadas para todos los archivos con IA");
        } catch (err: any) {
            toast.error(err.message || "Error al generar las respuestas con IA");
        } finally {
            setIsGeneratingAllSolutions(false);
        }
    };

    // Simular evaluación con IA sin guardar en base de datos
    const handleTestGradeWithAI = async () => {
        if (files.length === 0) {
            toast.error("No hay archivos de código para evaluar.");
            return;
        }

        setIsTestGradingAI(true);
        try {
            const { testGradeCodeChallengeAction } = await import("@/features/teacher/actions/gradingActions");
            const result = await testGradeCodeChallengeAction(
                files,
                language,
                activity.statement || "",
                "moderate"
            );

            setTestGradingResult(result);
            setActiveRightTab("results");
            toast.success(`✓ Calificación simulada: ${result.grade.toFixed(1)} / 5.0 (Sin guardar)`);
        } catch (err: any) {
            toast.error(err.message || "Error al evaluar con IA");
        } finally {
            setIsTestGradingAI(false);
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

            const res = await submitActivityAction(null, formData);
            if (res && res.error) {
                toast.error(res.message || "Error al entregar la actividad.");
                return;
            }

            toast.success("✓ ¡Solución de código entregada exitosamente!");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Error al entregar la actividad.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col min-h-0 overflow-hidden gap-2.5 sm:gap-3">
            {/* Header Bar: Compacta, Moderna y Responsiva */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 sm:px-3.5 rounded-xl border bg-card text-card-foreground shadow-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className="font-semibold text-xs sm:text-sm text-foreground tracking-tight truncate shrink min-w-0" title={activity.title}>
                        {activity.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold gap-1 shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 py-0 px-1.5 sm:px-2 h-5">
                        <Terminal className="h-3 w-3" />
                        <span className="hidden sm:inline">Taller de Código</span>
                        <span className="sm:hidden">Taller</span>
                    </Badge>

                    <Badge variant="secondary" className="text-[10px] font-mono h-5 py-0 px-1.5 sm:px-2 shrink-0 hidden xs:inline-flex">
                        {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                    </Badge>

                    {activity.deadline && (
                        <span className="text-[11px] text-muted-foreground hidden md:inline-flex items-center gap-1.5 shrink-0">
                            <Clock className="h-3 w-3 text-primary/70" />
                            <span>Vence: {format(new Date(activity.deadline), "PPp", { locale: es })}</span>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Status Badge */}
                    {isTeacherPreview ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] px-2 py-0.5 font-bold gap-1 shadow-2xs whitespace-nowrap shrink-0">
                            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="hidden sm:inline">Modo Prueba Docente</span>
                            <span className="sm:hidden">Prueba</span>
                        </Badge>
                    ) : checklistConfig && isGraded && evalMetadata ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {evalMetadata.aiGrade !== undefined && evalMetadata.aiGrade !== null && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-mono font-bold">
                                    IA ({checklistConfig.aiWeight}%): {Number(evalMetadata.aiGrade).toFixed(1)}
                                </Badge>
                            )}
                            {evalMetadata.checklistScore !== undefined && evalMetadata.checklistScore !== null && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 font-mono font-bold">
                                    Docente ({checklistConfig.checklistWeight}%): {Number(evalMetadata.checklistScore).toFixed(1)}
                                </Badge>
                            )}
                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0">
                                <span className="text-[9px] uppercase font-bold opacity-80">Final:</span>
                                <span className="text-xs font-black">{submission.grade.toFixed(1)}</span>
                                <span className="text-[9px] font-bold opacity-75">/ 5.0</span>
                            </div>
                        </div>
                    ) : isGraded ? (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0">
                            <span className="text-[9px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-xs font-black">{submission.grade.toFixed(1)}</span>
                            <span className="text-[9px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : isSubmitted ? (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] px-2 py-0.5 font-bold shrink-0">
                            Entregado
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold text-muted-foreground border-border/70 shrink-0">
                            <span className="hidden sm:inline">Pendiente de Entrega</span>
                            <span className="sm:hidden">Pendiente</span>
                        </Badge>
                    )}

                    {isTeacherPreview ? (
                        onClosePreview && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClosePreview}
                                className="h-6 sm:h-7 px-2 text-xs font-semibold shrink-0 gap-1 rounded-md border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-2xs cursor-pointer"
                                title="Cerrar el modo estudiante y volver a la edición"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Salir de Modo Estudiante</span>
                                <span className="sm:hidden">Salir</span>
                            </Button>
                        )
                    ) : (
                        <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 sm:h-7 px-2 text-xs font-semibold shrink-0 gap-1 rounded-md border-border/80 hover:bg-accent hover:text-accent-foreground shadow-xs cursor-pointer"
                            title="Volver a la lista de actividades"
                        >
                            <Link href={activity.courseId ? `/dashboard/student?courseId=${activity.courseId}&tab=activities` : `/dashboard/student`}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>Volver a actividades</span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Selector de Vistas para Móvil (< lg) */}
            <div className="lg:hidden shrink-0 grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shadow-2xs">
                <button
                    type="button"
                    onClick={() => {
                        setMobileTab("statement");
                        setActiveRightTab("statement");
                    }}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        mobileTab === "statement"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Enunciado</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMobileTab("code")}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative",
                        mobileTab === "code"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Code2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">Editor</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono ml-0.5 shrink-0">
                        {files.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setMobileTab("results");
                        setActiveRightTab("results");
                    }}
                    className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative",
                        mobileTab === "results"
                            ? "bg-background text-foreground shadow-xs font-bold border border-border/80 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Award className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span className="truncate">Feedback</span>
                    {isGraded && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
                            {submission.grade.toFixed(1)}
                        </Badge>
                    )}
                </button>
            </div>

            {/* Layout principal adaptado: en desktop 2 columnas, en móvil vista única a pantalla completa */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
                {/* Columna Izquierda: Enunciado e Instrucciones / Calificación y Feedback (5 columnas en desktop, visible en móvil en pestañas 'statement' o 'results') */}
                <div className={cn(
                    "lg:col-span-5 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs order-2 lg:order-1",
                    mobileTab === "code" ? "hidden lg:flex" : "flex"
                )}>
                    <Tabs
                        value={activeRightTab}
                        onValueChange={(v) => {
                            setActiveRightTab(v as any);
                            if (v === "statement" || v === "results") {
                                setMobileTab(v);
                            }
                        }}
                        className="flex-1 min-h-0 flex flex-col h-full overflow-hidden"
                    >
                        <div className="border-b p-2 bg-muted/30 shrink-0 hidden lg:block">
                            <TabsList className="grid grid-cols-2 w-full h-auto min-h-8 p-1 gap-1">
                                <TabsTrigger value="statement" className="text-xs font-semibold gap-1.5 px-3 py-1.5 whitespace-nowrap justify-center cursor-pointer">
                                    <FileText className="h-3.5 w-3.5 shrink-0" /> <span>Enunciado e Instrucciones</span>
                                </TabsTrigger>
                                <TabsTrigger value="results" className="text-xs font-semibold gap-1.5 px-3 py-1.5 whitespace-nowrap justify-center cursor-pointer">
                                    <Award className="h-3.5 w-3.5 shrink-0" /> <span>Calificación y Feedback</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Pestaña 1: Enunciado con SCROLL INDEPENDIENTE y Protección Anti-Copia */}
                        <TabsContent
                            value="statement"
                            className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4 select-none [&_*]:select-none"
                            style={{ userSelect: "none", WebkitUserSelect: "none" }}
                            onCopy={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toast.warning("Copiado deshabilitado", {
                                    description: "Por políticas académicas, no está permitido copiar el enunciado ni las instrucciones de este taller.",
                                    duration: 4000,
                                });
                            }}
                            onCut={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDragStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            {/* Archivos que componen la actividad */}
                            <div className="p-3 bg-muted/20 rounded-xl border space-y-2 shrink-0 select-none">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground block">Archivos del Proyecto:</span>
                                    <Badge variant="outline" className="text-[10px] font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 py-0 px-1.5 h-5 gap-1 select-none">
                                        <Lock className="h-2.5 w-2.5" />
                                        <span>Copia protegida</span>
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5 select-none">
                                    {files.map((f) => (
                                        <div key={f.id} className="flex items-center gap-1.5 text-xs bg-background px-2 py-1 rounded border select-none">
                                            <FileCode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            <span className="font-mono text-muted-foreground font-semibold select-none">{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div
                                data-color-mode={mode}
                                className="prose prose-sm dark:prose-invert max-w-none text-xs pb-4 select-none [&_*]:select-none"
                                style={{ userSelect: "none", WebkitUserSelect: "none" }}
                            >
                                <MDEditor.Markdown
                                    source={activity.statement || "**No hay enunciado disponible.**"}
                                    style={{ background: 'transparent', userSelect: 'none' }}
                                    disableCopy={true}
                                />
                            </div>

                            {/* Botón para pasar al editor directamente en móvil */}
                            <div className="pt-2 pb-2 lg:hidden">
                                <Button
                                    type="button"
                                    onClick={() => setMobileTab("code")}
                                    className="w-full text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs py-2 h-9 cursor-pointer"
                                >
                                    <Code2 className="h-4 w-4" />
                                    <span>Ir al Editor de Código ({files.length} archivos)</span>
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Calificación con SCROLL INDEPENDIENTE */}
                        <TabsContent value="results" className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto m-0 space-y-4">
                            {isTeacherPreview ? (
                                testGradingResult ? (
                                    <div className="space-y-4">
                                        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                Calificación Simulada con IA (Prueba Docente)
                                            </span>
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-mono">
                                                Sin guardar en BD
                                            </Badge>
                                        </div>

                                        <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1 text-center">
                                            <span className="text-xs font-semibold text-muted-foreground">Nota Sugerida por la IA</span>
                                            <div className="text-3xl font-extrabold font-mono text-primary">
                                                {testGradingResult.grade.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                                            </div>
                                            {testGradingResult.summary && (
                                                <p className="text-xs text-muted-foreground pt-1">{testGradingResult.summary}</p>
                                            )}
                                        </div>

                                        {/* Diagnósticos Big-O y Eficiencia */}
                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="p-2 rounded-lg bg-muted/40 border">
                                                <span className="text-[10px] text-muted-foreground block font-medium">Tiempo</span>
                                                <span className="font-mono font-bold text-foreground">{testGradingResult.timeComplexity || "O(N)"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-muted/40 border">
                                                <span className="text-[10px] text-muted-foreground block font-medium">Espacio</span>
                                                <span className="font-mono font-bold text-foreground">{testGradingResult.spaceComplexity || "O(1)"}</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-muted/40 border">
                                                <span className="text-[10px] text-muted-foreground block font-medium">Eficiencia</span>
                                                <span className="font-bold text-foreground">{testGradingResult.algorithmicEfficiency || "Aceptable"}</span>
                                            </div>
                                        </div>

                                        {testGradingResult.feedback && (
                                            <div className="space-y-2">
                                                <FeedbackViewer feedback={testGradingResult.feedback} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                        <Sparkles className="h-8 w-8 text-primary/60 animate-pulse" />
                                        <p className="text-xs font-semibold text-foreground">Simulador de Calificación con IA</p>
                                        <p className="text-[11px] max-w-xs">
                                            Digita código, o presiona <strong>"Generar Respuestas con IA"</strong> en la barra inferior, y luego haz clic en <strong>"Calificar con IA (Test)"</strong> para ver la nota y feedback simulados sin guardar en la base de datos.
                                        </p>
                                    </div>
                                )
                            ) : isGraded ? (
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
                                    <CheckCircle className="h-8 w-8 text-blue-600" />
                                    <p className="text-xs font-semibold">Código Enviado Exitosamente</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Tu solución ha sido registrada. El profesor evaluará tu código con asistencia de IA y/o sustentación oral.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs font-semibold">Aún no has entregado la actividad</p>
                                    <p className="text-[11px] max-w-xs">
                                        Resuelve los archivos en el editor Monaco y haz clic en el botón inferior para entregar.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() => setMobileTab("code")}
                                        className="mt-2 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer lg:hidden"
                                    >
                                        <Code2 className="h-3.5 w-3.5" />
                                        <span>Abrir Editor de Código</span>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Columna Derecha: Monaco Code Editor (7 columnas en desktop, visible en móvil en pestaña 'code') */}
                <div className={cn(
                    "lg:col-span-7 flex flex-col h-full min-h-0 bg-card rounded-xl border border-border/70 overflow-hidden shadow-xs order-1 lg:order-2",
                    mobileTab !== "code" ? "hidden lg:flex" : "flex"
                )}>
                    {/* Barra de Control / Estado (Fila 1) */}
                    <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Code2 className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-bold text-foreground truncate">Archivos de la Solución</span>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 hidden sm:inline-flex">{files.length} {files.length === 1 ? "archivo" : "archivos"}</Badge>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            {!isTeacherPreview ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0 whitespace-nowrap select-none" title="En este taller no está permitido copiar ni pegar código. Debes digitar la solución manualmente.">
                                    <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="hidden sm:inline">Digitación obligatoria (Copia y pegado bloqueados)</span>
                                    <span className="sm:hidden">Digitación manual</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold shrink-0 whitespace-nowrap select-none" title="El docente puede editar, pegar o generar código con IA para probar el comportamiento.">
                                    <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
                                    <span className="hidden sm:inline">Modo Prueba (Edición libre)</span>
                                    <span className="sm:hidden">Modo Prueba</span>
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const template = initialFiles.find(f => f.id === activeFile?.id || f.name === activeFile?.name);
                                    if (template) {
                                        const updated = files.map(f => (f.id === activeFile?.id || f.name === activeFile?.name) ? { ...f, content: template.content } : f);
                                        setFiles(updated);
                                        toast.success(`Plantilla original restaurada para ${activeFile?.name}`);
                                    } else {
                                        setFiles(initialFiles);
                                        toast.success("Plantillas originales restauradas");
                                    }
                                }}
                                className="h-6 text-[10px] font-semibold gap-1 px-2 border-border/80 hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs shrink-0"
                                title="Cargar o restaurar la plantilla de código asignada por el docente para este archivo"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span className="hidden sm:inline">Restaurar Plantilla</span>
                                <span className="sm:hidden">Restaurar</span>
                            </Button>

                            {activeFile && (
                                <Badge variant="secondary" className="text-[10px] font-mono capitalize h-6 px-2 shrink-0 border border-border/60">
                                    {getLanguageFromFileName(activeFile.name)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Barra de pestañas de archivos horizontal scrollable sin saltos de línea */}
                    <div className="px-2 py-1.5 border-b bg-muted/20 flex items-center gap-1.5 w-full shrink-0 overflow-x-auto scrollbar-none no-scrollbar flex-nowrap">
                        {files.map((file) => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={() => setActiveFileId(file.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium cursor-pointer border transition-all select-none whitespace-nowrap shrink-0",
                                    activeFileId === file.id
                                        ? "bg-background text-foreground border-border shadow-2xs font-bold ring-1 ring-primary/30"
                                        : "bg-muted/30 hover:bg-muted/60 text-muted-foreground border-border/40"
                                )}
                            >
                                <FileCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span>{file.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Monaco Editor: Ocupa todo el espacio restante con scroll interno */}
                    <div className="flex-1 min-h-0 w-full bg-background relative overflow-hidden">
                        {activeFile && (
                            <Editor
                                path={activeFile.name}
                                height="100%"
                                language={getLanguageFromFileName(activeFile.name)}
                                theme={monacoTheme}
                                value={activeFile.content}
                                onChange={handleCodeChange}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    lineNumbers: "on",
                                    lineNumbersMinChars: 3,
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

                    {/* Barra inferior de envío o simulación */}
                    {isTeacherPreview ? (
                        <div className="p-2 sm:p-2.5 border-t bg-card flex items-center justify-between gap-2 shrink-0">
                            <div
                                className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0"
                                title="Prueba docente: genera soluciones con IA o simula la calificación en tiempo real sin guardar en base de datos"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="font-semibold text-foreground/85 hidden sm:inline">Modo Prueba Docente</span>
                                <span className="font-semibold text-foreground/85 sm:hidden">Prueba</span>
                                <span className="text-[11px] text-muted-foreground hidden lg:inline">(Sin guardar en BD)</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateAllSolutions}
                                    disabled={isGeneratingAllSolutions || isTestGradingAI}
                                    className="font-bold text-xs gap-1 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 shadow-xs cursor-pointer h-8 px-2.5"
                                    title="Genera la solución completa para todos los archivos del taller usando la IA"
                                >
                                    {isGeneratingAllSolutions ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span className="hidden sm:inline">Generando Respuestas...</span>
                                            <span className="sm:hidden">Generando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                            <span className="hidden sm:inline">Generar Respuestas con IA</span>
                                            <span className="sm:hidden">Solución IA</span>
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleTestGradeWithAI}
                                    disabled={isTestGradingAI || isGeneratingAllSolutions}
                                    className="font-bold text-xs gap-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xs cursor-pointer h-8 px-2.5"
                                    title="Evalúa el código actual con IA sin guardar en base de datos"
                                >
                                    {isTestGradingAI ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span className="hidden sm:inline">Calificando con IA...</span>
                                            <span className="sm:hidden">Calificando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Award className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Calificar con IA (Test)</span>
                                            <span className="sm:hidden">Calificar (Test)</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2 sm:p-2.5 border-t bg-card flex items-center justify-between gap-2 shrink-0">
                            <span
                                className="text-[11px] sm:text-xs text-muted-foreground truncate"
                                title={isSubmitted ? "Código enviado. Puedes seguir editando y actualizar tu entrega antes del límite." : "Resuelve el código solicitado en el editor y haz clic en entregar."}
                            >
                                {isSubmitted ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Entregado (actualizable)</span>
                                ) : (
                                    <span>Resuelve y entrega tu solución</span>
                                )}
                            </span>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isDeadlinePassed}
                                className="font-bold text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs shrink-0 h-8 sm:h-9 px-3 cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                <span>{isSubmitted ? "Actualizar Entrega" : "Entregar Actividad"}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
