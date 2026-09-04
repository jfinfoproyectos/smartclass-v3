"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Github, Code2, FileCode, FileText, Folder, Search, Sparkles, Bot,
    Loader2, CheckCircle, Eye, Copy, Check, RotateCcw, ExternalLink, Zap, X, Link as LinkIcon, AlertTriangle, ClipboardList,
    ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, ListChecks, HelpCircle, CheckCircle2, MinusCircle, XCircle, Info, ZoomIn, ZoomOut
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import { scanRepositoryAction, fetchRepoFilesAction } from "@/features/github/actions/githubActions";
import { analyzeGitHubFileAction, finalizeGitHubGradingAction, improveFeedbackAction } from "@/features/teacher/actions/gradingActions";
import { GradingModeSelector } from "@/features/teacher/components/GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { GitHubRepoChatInspector } from "@/features/teacher/components/GitHubRepoChatInspector";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Editor, { loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

loader.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });

function getMonacoLanguage(filePath: string | null): string {
    if (!filePath) return "plaintext";
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
        case "js":
        case "jsx":
            return "javascript";
        case "ts":
        case "tsx":
            return "typescript";
        case "py":
            return "python";
        case "java":
            return "java";
        case "c":
        case "h":
            return "c";
        case "cpp":
        case "hpp":
        case "cc":
            return "cpp";
        case "cs":
            return "csharp";
        case "html":
        case "htm":
            return "html";
        case "css":
        case "scss":
        case "less":
            return "css";
        case "json":
            return "json";
        case "sql":
            return "sql";
        case "php":
            return "php";
        case "go":
            return "go";
        case "rs":
            return "rust";
        case "rb":
            return "ruby";
        case "kt":
            return "kotlin";
        case "swift":
            return "swift";
        case "md":
            return "markdown";
        case "xml":
            return "xml";
        case "yaml":
        case "yml":
            return "yaml";
        default:
            return "plaintext";
    }
}

export const RUBRIC_LEVELS = [
    { key: "sabe", label: "Sabe", factor: 1.0, pct: "100%", icon: CheckCircle2 },
    { key: "aceptable", label: "Aceptable", factor: 0.75, pct: "75%", icon: Check },
    { key: "parcial", label: "Parcial", factor: 0.50, pct: "50%", icon: MinusCircle },
    { key: "no_sabe", label: "No Sabe", factor: 0.0, pct: "0%", icon: XCircle },
] as const;

interface CodeProjectInspectorProps {
    student: any;
    submission: any;
    activity: any;
    gradingMode: "normal" | "moderate" | "strict";
    setGradingMode: (mode: "normal" | "moderate" | "strict") => void;
    onGradeManual: (grade: string, feedback: string, studentId: string, activityId: string) => Promise<void>;
    onReject: (studentId: string, feedback?: string) => Promise<void>;
    onClose?: () => void;
    studentsList?: { student: any; submission: any; status: string }[];
    onSelectStudent?: (studentId: string) => void;
}

// Extract basename from file path
function getBasename(pathStr: string): string {
    if (!pathStr) return "";
    const clean = pathStr.replace(/\\/g, '/');
    const parts = clean.split('/');
    return parts[parts.length - 1].toLowerCase();
}

// Smart path matcher: exact match, endsWith match, or filename/basename match
function isPathMatch(rf: string, cp: string): boolean {
    const rfLower = rf.toLowerCase();
    const cpLower = cp.toLowerCase();
    if (rfLower === cpLower) return true;
    if (rfLower.endsWith(cpLower)) return true;
    if (cpLower.endsWith(rfLower)) return true;
    const rfBase = getBasename(rfLower);
    const cpBase = getBasename(cpLower);
    if (rfBase && cpBase && rfBase === cpBase) return true;
    return false;
}

// Extensions considered primary source code files
const PRIMARY_CODE_EXTENSIONS = [
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".h", ".hpp", 
    ".cs", ".html", ".css", ".php", ".go", ".rs", ".rb", ".sql", ".kt", ".swift", ".vue", ".svelte"
];

// Helper to split stored feedback into AI portion and Teacher Notes portion
function parseInitialFeedback(rawFeedback: string | null | undefined) {
    if (!rawFeedback) return { aiFeedback: "", teacherNotes: "" };
    const cleanRaw = rawFeedback.replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "");
    const marker = "### 👨‍🏫 Observaciones del Profesor";
    const dividerMarker = "---";
    
    if (cleanRaw.includes(marker)) {
        const parts = cleanRaw.split(marker);
        let aiPart = parts[0].trim();
        if (aiPart.endsWith(dividerMarker)) {
            aiPart = aiPart.slice(0, -dividerMarker.length).trim();
        }
        const teacherPart = parts.slice(1).join(marker).trim();
        return { aiFeedback: aiPart, teacherNotes: teacherPart };
    }
    
    return { aiFeedback: cleanRaw, teacherNotes: "" };
}

export function CodeProjectInspector({
    student,
    submission,
    activity,
    gradingMode,
    setGradingMode,
    onGradeManual,
    onReject,
    onClose,
    studentsList,
    onSelectStudent
}: CodeProjectInspectorProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [repoFiles, setRepoFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllRepoFiles, setShowAllRepoFiles] = useState(false);
    const [fullscreenSection, setFullscreenSection] = useState<"none" | "explorer" | "content">("none");

    useEffect(() => {
        setMounted(true);
    }, []);

    // Extraer Lista de Chequeo, Criterios y Ponderaciones configuradas (por defecto: 30% IA / 70% Docente)
    const checklistConfig = useMemo(() => {
        if (!activity?.description) return null;
        try {
            const data = JSON.parse(activity.description);
            if (data?.hasChecklist && Array.isArray(data?.criteria) && data.criteria.length > 0) {
                const aiWeight = typeof data.aiWeight === "number" ? data.aiWeight : 30;
                const checklistWeight = typeof data.checklistWeight === "number" ? data.checklistWeight : 70;
                return {
                    criteria: data.criteria,
                    aiWeight,
                    checklistWeight,
                };
            }
        } catch {
            return null;
        }
        return null;
    }, [activity?.description]);

    const checklistData = checklistConfig?.criteria ?? null;
    const aiWeight = checklistConfig?.aiWeight ?? 30;
    const checklistWeight = checklistConfig?.checklistWeight ?? 70;

    // Evaluación por niveles en sustentación (1.0 = Sabe, 0.75 = Aceptable, 0.5 = Parcial, 0.0 = No Sabe)
    const [criteriaLevels, setCriteriaLevels] = useState<Record<string, number>>({});
    const [manualSustentacionScore, setManualSustentacionScore] = useState<number | null>(null);

    // Nota obtenida exclusivamente en la sustentación oral (0.0 - 5.0) de forma proporcional
    const checklistScore = useMemo(() => {
        if (!checklistData || checklistData.length === 0) return 0;
        
        // Si el profesor utilizó Calificación Rápida directamente
        if (manualSustentacionScore !== null) {
            return manualSustentacionScore;
        }

        const totalEarnedWeight = checklistData.reduce((acc: number, crit: any) => {
            const factor = criteriaLevels[crit.id];
            if (typeof factor !== "number") return acc;
            const weight = Number(crit.percentage) || 0;
            return acc + (weight * factor);
        }, 0);
        return Math.min(5.0, Math.max(0.0, (totalEarnedWeight / 100) * 5.0));
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Student navigation (previous / next / select)
    const currentIndex = useMemo(() => {
        if (!studentsList || !student) return -1;
        return studentsList.findIndex(item => item.student.id === student.id);
    }, [studentsList, student]);

    const hasPrevStudent = currentIndex > 0;
    const hasNextStudent = studentsList && currentIndex >= 0 && currentIndex < studentsList.length - 1;

    const handlePrevStudent = () => {
        if (hasPrevStudent && studentsList && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex - 1].student.id);
        }
    };

    const handleNextStudent = () => {
        if (hasNextStudent && studentsList && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex + 1].student.id);
        }
    };
    
    // File Code Preview state
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    const [textZoom, setTextZoom] = useState<number>(1.0);
    const fileCache = useRef<Record<string, string>>({});

    // AI Grading state
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isAIGradingDialogOpen, setIsAIGradingDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"statement" | "preview" | "ai_report" | "teacher_grade" | "mcp_chat">("preview");
    const [gradingLogs, setGradingLogs] = useState<string[]>([]);
    const [gradingResult, setGradingResult] = useState<any>(null);
    const [showLogs, setShowLogs] = useState(false);

    // Nota obtenida de la evaluación de la IA (0.0 - 5.0)
    const aiGrade = useMemo(() => {
        if (gradingResult?.grade !== undefined && gradingResult?.grade !== null) {
            return Number(gradingResult.grade);
        }
        if (submission?.grade !== undefined && submission?.grade !== null) {
            return Number(submission.grade);
        }
        return 0;
    }, [gradingResult, submission]);

    // Nota final combinada ponderada: (IA * aiWeight%) + (Sustentación * checklistWeight%)
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) return checklistScore;
        const aiPart = aiGrade * (aiWeight / 100);
        const teacherPart = checklistScore * (checklistWeight / 100);
        return Math.min(5.0, Math.max(0.0, aiPart + teacherPart));
    }, [checklistConfig, aiGrade, aiWeight, checklistScore, checklistWeight]);
    
    // Manual Score & Dual Feedback state
    const initialParsed = parseInitialFeedback(submission?.feedback);
    const [gradeInput, setGradeInput] = useState<string>(
        submission?.grade !== null && submission?.grade !== undefined
            ? String(submission.grade)
            : ""
    );
    const [aiFeedbackInput, setAiFeedbackInput] = useState<string>(initialParsed.aiFeedback);
    const [teacherNotesInput, setTeacherNotesInput] = useState<string>(initialParsed.teacherNotes);
    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [isSavingGrade, setIsSavingGrade] = useState(false);
    const [isImprovingFeedback, setIsImprovingFeedback] = useState(false);
    const [teacherObservationInput, setTeacherObservationInput] = useState<string>("");

    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [gradingLogs]);

    // Auto scan repository on mount if submission exists
    useEffect(() => {
        if (submission?.url) {
            handleScanRepo();
        }
    }, [submission?.url]);

    const handleScanRepo = async () => {
        if (!submission?.url) return;
        setIsScanning(true);
        try {
            const res = await scanRepositoryAction(submission.url);
            const files = res.files || [];
            setRepoFiles(files);
            
            // Extract required files configured for activity
            const configuredList: string[] = typeof activity?.filePaths === "string"
                ? activity.filePaths.split(',').map((s: string) => s.trim()).filter(Boolean)
                : Array.isArray(activity?.filePaths)
                ? activity.filePaths.map((s: any) => String(s).trim()).filter(Boolean)
                : [];

            // In "Requeridos" mode, auto-select required files found in repo
            let initialSelection: string[] = [];
            if (configuredList.length > 0) {
                initialSelection = files.filter(rf => configuredList.some(cp => isPathMatch(rf, cp)));
            }

            setSelectedFiles(initialSelection);

            if (initialSelection.length > 0) {
                handleLoadFilePreview(initialSelection[0]);
            } else if (files.length > 0) {
                handleLoadFilePreview(files[0]);
            }
            
            toast.success(`${files.length} archivos encontrados en el repositorio.`);
        } catch (err: any) {
            toast.error("Error al escanear el repositorio", { description: err.message });
        } finally {
            setIsScanning(false);
        }
    };

    const handleLoadFilePreview = async (filePath: string) => {
        setPreviewFile(filePath);
        if (fileCache.current[filePath]) {
            setPreviewContent(fileCache.current[filePath]);
            return;
        }

        setIsLoadingPreview(true);
        try {
            const res = await fetchRepoFilesAction(submission.url, filePath, activity.id);
            if (res.validFiles && res.validFiles.length > 0) {
                const content = res.validFiles[0].content;
                fileCache.current[filePath] = content;
                setPreviewContent(content);
            } else {
                setPreviewContent("// No se pudo cargar el contenido de este archivo.");
            }
        } catch (err: any) {
            setPreviewContent(`// Error al cargar el archivo: ${err.message}`);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSelectPrimaryFiles = () => {
        const primary = repoFiles.filter(f => 
            PRIMARY_CODE_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext)) &&
            !f.includes("node_modules") && 
            !f.includes(".git/")
        );
        setSelectedFiles(primary);
        toast.info(`${primary.length} archivos de código principal seleccionados.`);
    };

    const handleCopyCode = () => {
        if (!previewContent) return;
        navigator.clipboard.writeText(previewContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Código copiado al portapapeles");
    };

    const handleRunAIEvaluation = async () => {
        if (selectedFiles.length === 0) {
            toast.error("Selecciona al menos un archivo para evaluar.");
            return;
        }

        setIsEvaluating(true);
        setGradingLogs([]);
        setGradingResult(null);
        setShowLogs(true);

        const addLog = (msg: string) => setGradingLogs(prev => [...prev, msg]);

        try {
            addLog("🔍 Iniciando evaluación con Inteligencia Artificial...");
            addLog(`📂 Descargando los ${selectedFiles.length} archivos seleccionados del proyecto...`);

            const { validFiles, missingFiles, warning } = await fetchRepoFilesAction(
                submission.url,
                selectedFiles.join(','),
                activity.id
            );

            if (warning) addLog(`⚠️ Advertencia: ${warning}`);
            addLog(`✅ Archivos obtenidos exitosamente. Iniciando análisis individual...`);

            const analyses = [];
            let accumulatedContext = "";

            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                addLog(`⚙️ Analizando (${i + 1}/${validFiles.length}): ${file.path}...`);

                const analysis = await analyzeGitHubFileAction(
                    file.path,
                    file.content,
                    activity.statement || "",
                    submission.url,
                    accumulatedContext,
                    gradingMode
                );

                analyses.push(analysis);
                accumulatedContext += `\n- **${file.path}**: ${analysis.summary}`;
                addLog(`   └─ ✅ Análisis completado. Aporte estimado: ${analysis.scoreContribution.toFixed(1)}/5.0`);
            }

            const missingFilesForEval = Array.from(new Set([...missingFiles, ...missingConfiguredFiles]));
            const totalExpectedFiles = configuredPathsList.length > 0
                ? Math.max(configuredPathsList.length, selectedFiles.length + missingFilesForEval.length)
                : selectedFiles.length + missingFilesForEval.length;

            if (missingFilesForEval.length > 0) {
                addLog(`⚠️ Detectados ${missingFilesForEval.length} archivo(s) faltante(s) requerido(s). Recibirán nota 0.0 de penalización en el promedio.`);
            }

            addLog("📊 Consolidando rúbrica y retroalimentación final...");
            const result = await finalizeGitHubGradingAction(
                activity.id,
                student.id,
                submission.url,
                activity.statement || "",
                analyses,
                missingFilesForEval,
                totalExpectedFiles,
                activity.courseId,
                gradingMode
            );

            setGradingResult(result);
            setGradeInput(result.grade.toFixed(1));
            setAiFeedbackInput(result.feedback);
            setActiveTab("ai_report");
            router.refresh();

            addLog(`🎉 Calificación final completada: ${result.grade.toFixed(1)} / 5.0`);
            toast.success(`Evaluación completada: Nota ${result.grade.toFixed(1)} / 5.0`);
        } catch (err: any) {
            addLog(`❌ Error en evaluación: ${err.message}`);
            toast.error("Error al evaluar con IA", { description: err.message });
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleImproveTeacherNotes = async () => {
        if (!teacherNotesInput || teacherNotesInput.trim().length < 5) {
            toast.error("Escribe al menos algunas palabras de observaciones para mejorar con IA.");
            return;
        }
        setIsImprovingFeedback(true);
        const toastId = toast.loading("Mejorando redacción de las observaciones del profesor con IA...");
        try {
            const improved = await improveFeedbackAction(teacherNotesInput);
            setTeacherNotesInput(improved);
            toast.success("Redacción del profesor mejorada con IA", { id: toastId });
        } catch (err: any) {
            toast.error("Error al mejorar texto", { id: toastId });
        } finally {
            setIsImprovingFeedback(false);
        }
    };

    const handleSaveScore = async () => {
        if (!gradeInput) {
            toast.error("Ingresa una nota válida.");
            return;
        }
        setIsSavingGrade(true);
        try {
            let finalFeedback = "";

            if (aiFeedbackInput.trim()) {
                finalFeedback += aiFeedbackInput.trim();
            }

            if (teacherNotesInput.trim()) {
                if (finalFeedback) {
                    finalFeedback += `\n\n---\n\n### 👨‍🏫 Observaciones del Profesor\n\n${teacherNotesInput.trim()}`;
                } else {
                    finalFeedback = `### 👨‍🏫 Observaciones del Profesor\n\n${teacherNotesInput.trim()}`;
                }
            }

            const currentGrade = parseFloat(gradeInput);

            if (
                gradingResult && 
                !isNaN(currentGrade) && 
                currentGrade !== gradingResult.grade && 
                teacherObservationInput.trim()
            ) {
                finalFeedback += `\n\n---\n\n> 📝 **Justificación del Ajuste de Nota (Profesor):**\n> ${teacherObservationInput.trim()} *(Nota IA: ${gradingResult.grade.toFixed(1)} → Nota Definitiva: ${currentGrade.toFixed(1)})*`;
            }

            await onGradeManual(gradeInput, finalFeedback, student.id, activity.id);
            router.refresh();
            toast.success("Calificación guardada correctamente.");
        } catch (err: any) {
            toast.error("Error al guardar la nota.", { description: err.message });
        } finally {
            setIsSavingGrade(false);
        }
    };

    // Parse activity.filePaths configured for the activity
    const configuredPathsList: string[] = useMemo(() => {
        if (!activity?.filePaths) return [];
        if (typeof activity.filePaths === "string") {
            return activity.filePaths.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
        if (Array.isArray(activity.filePaths)) {
            return activity.filePaths.map((s: any) => String(s).trim()).filter(Boolean);
        }
        return [];
    }, [activity?.filePaths]);

    // Matching files found in repo using smart path/basename matching
    const foundConfiguredFiles = useMemo(() => {
        if (configuredPathsList.length === 0) return repoFiles;
        return repoFiles.filter(rf => {
            return configuredPathsList.some(cp => isPathMatch(rf, cp));
        });
    }, [repoFiles, configuredPathsList]);

    // Missing files required for the activity
    const missingConfiguredFiles = useMemo(() => {
        if (configuredPathsList.length === 0) return [];
        return configuredPathsList.filter(cp => {
            return !repoFiles.some(rf => isPathMatch(rf, cp));
        });
    }, [repoFiles, configuredPathsList]);

    const targetFilesList = (showAllRepoFiles || configuredPathsList.length === 0)
        ? repoFiles
        : foundConfiguredFiles;

    const filteredFiles = targetFilesList.filter(f => 
        f.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic grade for top bar header: prioritizes AI grading result -> teacher grade input -> initial submission grade
    const currentDisplayedGrade = useMemo(() => {
        if (gradingResult?.grade !== undefined && gradingResult?.grade !== null) {
            return gradingResult.grade;
        }
        if (gradeInput !== "" && !isNaN(parseFloat(gradeInput))) {
            return parseFloat(gradeInput);
        }
        if (submission?.grade !== null && submission?.grade !== undefined) {
            return submission.grade;
        }
        return null;
    }, [gradingResult?.grade, gradeInput, submission?.grade]);

    return (
        <div className="flex flex-col h-full w-full gap-4 overflow-hidden flex-1 min-h-0">
            {/* Single Merged Ultra-Compact Header Bar */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-card text-card-foreground shadow-xs min-h-[40px]">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    
                    <div className="flex items-center gap-1.5 truncate">
                        {/* Student Navigation Controls (Previous / Next / Dropdown) */}
                        {studentsList && studentsList.length > 1 ? (
                            <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={!hasPrevStudent}
                                    onClick={handlePrevStudent}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Estudiante anterior"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <span className="text-[10px] text-muted-foreground font-mono px-0.5">
                                    {currentIndex + 1}/{studentsList.length}
                                </span>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={!hasNextStudent}
                                    onClick={handleNextStudent}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    title="Siguiente estudiante"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 font-bold text-sm tracking-tight gap-1 hover:bg-muted/80 max-w-[180px] sm:max-w-[260px]">
                                            <span className="truncate">{student ? formatName(student.name, student.profile) : "Estudiante"}</span>
                                            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-y-auto z-50">
                                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                                            {activity?.isGroupActivity ? "Líderes de Grupo" : "Seleccionar Estudiante"} ({studentsList.length})
                                        </div>
                                        {studentsList.map((item: any, idx) => {
                                            const isSelected = item.student.id === student?.id;
                                            const subGrade = item.submission?.grade;
                                            const statusText = item.status === 'graded' 
                                                ? `${subGrade !== null && subGrade !== undefined ? subGrade.toFixed(1) : '-'}/5.0`
                                                : item.status === 'submitted'
                                                ? 'Entregado'
                                                : 'Pendiente';

                                            return (
                                                <DropdownMenuItem
                                                    key={item.student.id}
                                                    onClick={() => onSelectStudent && onSelectStudent(item.student.id)}
                                                    className={`flex items-center justify-between text-xs cursor-pointer py-1.5 ${
                                                        isSelected ? "bg-primary/10 font-bold text-primary" : ""
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                                                        <span className="truncate">{formatName(item.student.name, item.student.profile)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                                        {item.group && (
                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold">
                                                                {item.group.name}
                                                            </Badge>
                                                        )}
                                                        <Badge 
                                                            variant={item.status === 'graded' ? "secondary" : "outline"}
                                                            className={`text-[9px] px-1.5 py-0 h-4 font-mono shrink-0 ${
                                                                item.status === 'graded' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold" : "opacity-60"
                                                            }`}
                                                        >
                                                            {statusText}
                                                        </Badge>
                                                    </div>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <span className="font-bold text-sm text-card-foreground tracking-tight shrink-0">
                                {student ? formatName(student.name, student.profile) : "Evaluación de Entrega"}
                            </span>
                        )}

                        {activity?.title && (
                            <span className="text-[11px] text-muted-foreground hidden md:inline truncate">
                                • {activity.title}
                            </span>
                        )}
                        {activity?.type && (
                            <Badge variant="outline" className="text-[10px] font-bold gap-1 shrink-0 bg-primary/10 text-primary border-primary/30 uppercase tracking-wider hidden sm:inline-flex">
                                {activity.type === "GITHUB" && <Github className="h-3 w-3 text-primary" />}
                                {activity.type === "CODE_PROJECT" && <Code2 className="h-3 w-3 text-primary" />}
                                {activity.type === "PDF_REVIEW" && <FileText className="h-3 w-3 text-primary" />}
                                {activity.type === "MANUAL" && <LinkIcon className="h-3 w-3 text-primary" />}
                                <span>
                                    {activity.type === "GITHUB"
                                        ? "GitHub"
                                        : activity.type === "CODE_PROJECT"
                                        ? "Proyecto Código"
                                        : activity.type === "PDF_REVIEW"
                                        ? "PDF"
                                        : "Manual"}
                                </span>
                            </Badge>
                        )}
                    </div>

                    {submission?.url && (
                        <Button
                            asChild
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
                            title="Abrir repositorio en GitHub (nueva pestaña)"
                        >
                            <a 
                                href={submission.url} 
                                target="_blank" 
                                rel="noreferrer"
                            >
                                <Github className="h-3.5 w-3.5 text-primary" />
                                <span>Ver Repo</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                        </Button>
                    )}

                    <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex shrink-0 ml-1">
                        {repoFiles.length} archivos
                    </Badge>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsAIGradingDialogOpen(true)}
                        disabled={selectedFiles.length === 0 || isEvaluating}
                        variant="default"
                        className="h-7 px-3 text-xs gap-1.5 font-bold shadow-xs transition-all"
                        title={selectedFiles.length === 0 ? "Selecciona al menos un archivo para calificar con IA" : "Calificar archivos seleccionados con IA"}
                    >
                        {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Calificar con IA {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                    </Button>

                    {currentDisplayedGrade !== null && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold animate-in fade-in">
                            <span className="text-[10px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-sm font-black">{currentDisplayedGrade.toFixed(1)}</span>
                            <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    )}

                    {onClose && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                            className="h-7 px-3 text-xs gap-1.5 font-bold ml-1 transition-all"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Interactive IDE Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch overflow-hidden h-full">
                
                {/* Left Column: Repo Tree Explorer & Selector */}
                <div className={`rounded-xl border bg-card shadow-sm flex flex-col h-full min-h-0 overflow-hidden transition-all ${
                    fullscreenSection === 'explorer' 
                        ? "lg:col-span-12" 
                        : fullscreenSection === 'content' 
                        ? "hidden" 
                        : "lg:col-span-4"
                }`}>
                    <div className="p-3 border-b bg-muted/30 space-y-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Folder className="h-3.5 w-3.5 text-primary" />
                                Archivos ({selectedFiles.length} sel.)
                            </span>
                            <div className="flex items-center gap-1">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleSelectPrimaryFiles}
                                    className="h-6 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium gap-1 px-1.5"
                                    title="Seleccionar automáticamente los archivos fuente principales"
                                >
                                    <Zap className="h-3 w-3 fill-current" />
                                    Código Fuente
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFullscreenSection(prev => prev === "explorer" ? "none" : "explorer")}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title={fullscreenSection === "explorer" ? "Restaurar vista dividida" : "Pantalla completa para el explorador"}
                                >
                                    {fullscreenSection === "explorer" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        </div>

                        {/* Mode Switcher & Search Bar */}
                        {configuredPathsList.length > 0 && (
                            <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 text-[10px] w-full">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAllRepoFiles(false);
                                        if (foundConfiguredFiles.length > 0) {
                                            setSelectedFiles(foundConfiguredFiles);
                                            handleLoadFilePreview(foundConfiguredFiles[0]);
                                        }
                                    }}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        !showAllRepoFiles 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Mostrar y seleccionar archivos requeridos por la actividad"
                                >
                                    🎯 Requeridos ({foundConfiguredFiles.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAllRepoFiles(true);
                                        setSelectedFiles([]);
                                    }}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        showAllRepoFiles 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Explorar todos los archivos del repositorio (sin selección previa)"
                                >
                                    📂 Explorar Repositorio ({repoFiles.length})
                                </button>
                            </div>
                        )}

                        {/* Search Input & Re-scan Button */}
                        <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                                <Search className="h-[14px] w-[14px] absolute left-2.5 top-2.5 text-muted-foreground" />
                                <Input
                                    placeholder={showAllRepoFiles ? "Buscar en todo el repositorio..." : "Buscar archivo requerido..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 text-xs pl-8 bg-background"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isScanning || isEvaluating}
                                onClick={handleScanRepo}
                                className="h-8 px-2.5 text-xs gap-1.5 shrink-0"
                                title="Volver a escanear archivos del repositorio"
                            >
                                {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span>Re-escanear</span>
                            </Button>
                        </div>
                    </div>

                    {/* File List / Tree */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs min-h-0">
                        {isScanning ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <p className="text-xs">Cargando árbol de archivos...</p>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-xs">
                                No se encontraron archivos.
                            </div>
                        ) : (
                            filteredFiles.map((path) => {
                                const isSelected = selectedFiles.includes(path);
                                const isPreviewing = previewFile === path;
                                const isPrimaryCode = PRIMARY_CODE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));

                                return (
                                    <div
                                        key={path}
                                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer group ${
                                            isPreviewing 
                                                ? "bg-primary/10 border-primary/40" 
                                                : "hover:bg-muted/60 border-transparent"
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                            <Checkbox
                                                id={`check-${path}`}
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedFiles(prev => [...prev, path]);
                                                    else setSelectedFiles(prev => prev.filter(p => p !== path));
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {isPrimaryCode ? (
                                                <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                                            ) : (
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            )}
                                            <span 
                                                onClick={() => handleLoadFilePreview(path)}
                                                className={`truncate select-none text-[11px] ${
                                                    isPreviewing ? "font-bold text-primary" : "text-foreground"
                                                }`}
                                                title={path}
                                            >
                                                {path}
                                            </span>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleLoadFilePreview(path)}
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                            title="Ver código"
                                        >
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })
                        )}

                        {/* Missing Required Files Warning Box */}
                        {missingConfiguredFiles.length > 0 && (
                            <div className="mt-2 p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 space-y-1.5 animate-in fade-in shrink-0">
                                <div className="flex items-center gap-1.5 text-destructive font-bold text-[11px]">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{missingConfiguredFiles.length} Archivo(s) Faltante(s) Requerido(s):</span>
                                </div>
                                <div className="space-y-1">
                                    {missingConfiguredFiles.map((path) => (
                                        <div key={path} className="flex items-center justify-between text-[10px] text-destructive font-mono bg-background/60 p-1.5 rounded border border-destructive/20">
                                            <span className="truncate font-semibold" title={path}>{path}</span>
                                            <Badge variant="outline" className="text-[9px] text-destructive border-destructive/40 bg-destructive/10 shrink-0 ml-1 font-sans font-bold">
                                                No encontrado
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-2.5 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between items-center shrink-0">
                        <span>{selectedFiles.length} seleccionados para IA</span>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedFiles([])}
                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                            Desmarcar todos
                        </Button>
                    </div>
                </div>

                <div className={`flex flex-col h-full min-h-0 overflow-hidden transition-all ${
                    fullscreenSection === 'content' 
                        ? "lg:col-span-12" 
                        : fullscreenSection === 'explorer' 
                        ? "hidden" 
                        : "lg:col-span-8"
                }`}>
                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "statement" | "ai_report" | "teacher_grade" | "preview" | "mcp_chat")} className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                        <div className="w-full overflow-x-auto scrollbar-none pb-1 shrink-0 -mx-1 px-1">
                            <TabsList className="inline-flex w-max min-w-full lg:grid lg:grid-cols-5 h-auto min-h-10 p-1 gap-1">
                                <TabsTrigger value="statement" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                    <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span>Enunciado</span>
                                </TabsTrigger>
                                <TabsTrigger value="ai_report" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                    <span>Evaluación IA</span>
                                </TabsTrigger>
                                <TabsTrigger value="teacher_grade" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span>Evaluación Docente</span>
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                    <Code2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span>Código</span>
                                </TabsTrigger>
                                <TabsTrigger value="mcp_chat" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 shrink-0 whitespace-nowrap">
                                    <Bot className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                    <span>Inspector</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab 0: Activity Statement / Rubric Instructions */}
                        <TabsContent value="statement" className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                            <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                                <div className="p-3 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
                                    <div className="flex items-center gap-2 truncate">
                                        <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                                        <span className="font-semibold text-muted-foreground truncate">
                                            {activity.title} — Enunciado y Rúbrica de Evaluación
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <div className="flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5 bg-background/80 shadow-2xs">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Reducir texto (Zoom -)"
                                            >
                                                <ZoomOut className="h-3.5 w-3.5" />
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => setTextZoom(1.0)}
                                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                                title="Restablecer tamaño (100%)"
                                            >
                                                {Math.round(textZoom * 100)}%
                                            </button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Aumentar texto (Zoom +)"
                                            >
                                                <ZoomIn className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                            title={fullscreenSection === "content" ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                                        >
                                            {fullscreenSection === "content" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ zoom: textZoom }}>
                                    <FeedbackViewer 
                                        feedback={activity.statement || "**No hay un enunciado o rúbrica cargada para esta actividad.**"} 
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 1: Live Code Inspection */}
                        <TabsContent value="preview" className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                            <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                                <div className="p-3 bg-muted/40 border-b flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileCode className="h-4 w-4 text-primary shrink-0" />
                                        <span className="font-mono text-foreground font-medium truncate">
                                            {previewFile || "Selecciona un archivo para inspeccionar..."}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {previewContent && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCopyCode}
                                                className="h-7 text-xs gap-1"
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copied ? "Copiado" : "Copiar"}
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                            title={fullscreenSection === "content" ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                                        >
                                            {fullscreenSection === "content" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden min-h-0 h-full relative">
                                    {isLoadingPreview ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <p className="text-xs">Descargando archivo desde GitHub...</p>
                                        </div>
                                    ) : previewContent ? (
                                        <Editor
                                            height="100%"
                                            language={getMonacoLanguage(previewFile)}
                                            value={previewContent}
                                            theme={mounted && resolvedTheme === "dark" ? "vs-dark" : "light"}
                                            options={{
                                                readOnly: true,
                                                domReadOnly: true,
                                                minimap: { enabled: true },
                                                lineNumbers: "on",
                                                scrollBeyondLastLine: false,
                                                wordWrap: "on",
                                                fontFamily: "'Fira Code', 'Monaco', 'Cascadia Code', monospace",
                                                fontSize: 12,
                                                padding: { top: 12, bottom: 12 },
                                                folding: true,
                                                contextmenu: true,
                                                automaticLayout: true,
                                                renderLineHighlight: "all",
                                                cursorStyle: "line",
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                                            <Code2 className="h-10 w-10 opacity-30" />
                                            <p className="text-center max-w-xs text-xs">
                                                Haz clic en cualquier archivo de la lista de la izquierda para ver su código fuente con resaltado Monaco aquí.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 2: Read-Only AI Evaluation Report */}
                        <TabsContent value="ai_report" className="mt-3 flex-1 min-h-0 overflow-y-auto">
                            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 h-full flex flex-col min-h-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2 shrink-0 border-b pb-3">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Reporte de Evaluación de la IA (Gemini)
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Análisis automático generado basándose en la rúbrica y los archivos inspeccionados.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono shrink-0">
                                            Solo Lectura
                                        </Badge>
                                        <div className="flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5 bg-background/80 shadow-2xs">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Reducir texto (Zoom -)"
                                            >
                                                <ZoomOut className="h-3.5 w-3.5" />
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => setTextZoom(1.0)}
                                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                                title="Restablecer tamaño (100%)"
                                            >
                                                {Math.round(textZoom * 100)}%
                                            </button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Aumentar texto (Zoom +)"
                                            >
                                                <ZoomIn className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                            title={fullscreenSection === "content" ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                                        >
                                            {fullscreenSection === "content" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto pr-1" style={{ zoom: textZoom }}>
                                    {aiFeedbackInput ? (
                                        <FeedbackViewer feedback={aiFeedbackInput} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                                            <Sparkles className="h-10 w-10 text-primary opacity-40 animate-pulse" />
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Aún no se ha ejecutado la evaluación inteligente para este estudiante.
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => setIsAIGradingDialogOpen(true)}
                                                disabled={selectedFiles.length === 0}
                                                variant="default"
                                                className="font-bold gap-2 text-xs"
                                            >
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Iniciar Evaluación con IA
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 3: Grade Assignment & Teacher Notes */}
                        <TabsContent value="teacher_grade" className="mt-3 flex-1 min-h-0 overflow-y-auto">
                            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 h-full overflow-y-auto">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm">Asignación de Nota y Observaciones Docentes</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Revisa la calificación y agrega observaciones personalizadas para {student?.name || "el estudiante"}.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <div className="flex items-center gap-0.5 border border-border/80 rounded-lg p-0.5 bg-background/80 shadow-2xs">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Reducir tamaño del texto (Zoom -)"
                                            >
                                                <ZoomOut className="h-3.5 w-3.5" />
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => setTextZoom(1.0)}
                                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                                title="Restablecer tamaño normal (100%)"
                                            >
                                                {Math.round(textZoom * 100)}%
                                            </button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setTextZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Aumentar tamaño del texto (Zoom +)"
                                            >
                                                <ZoomIn className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                            title={fullscreenSection === "content" ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                                        >
                                            {fullscreenSection === "content" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Widget de Lista de Chequeo y Sustentación Oral con Ponderación de Nota */}
                                {checklistData && checklistData.length > 0 && (
                                    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/[0.02] space-y-3.5 shadow-2xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                    <ListChecks className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h5 className="text-xs font-bold text-foreground">
                                                            Lista de Chequeo y Sustentación Oral
                                                        </h5>
                                                        <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                            {checklistWeight}% Docente / {aiWeight}% IA
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Formula estas preguntas al estudiante. La nota final se calcula combinando la IA y la sustentación.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {/* Zoom para preguntas de sustentación */}
                                                <div className="flex items-center gap-0.5 border border-primary/20 rounded-lg p-0.5 bg-background/90 shadow-2xs">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setTextZoom(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Reducir tamaño de preguntas (Zoom -)"
                                                    >
                                                        <ZoomOut className="h-3 w-3" />
                                                    </Button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTextZoom(1.0)}
                                                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title="Restablecer tamaño normal (100%)"
                                                    >
                                                        {Math.round(textZoom * 100)}%
                                                    </button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setTextZoom(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Aumentar tamaño de preguntas (Zoom +)"
                                                    >
                                                        <ZoomIn className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        const questionDetails = checklistData.map((c: any, i: number) => {
                                                            const factor = criteriaLevels[c.id];
                                                            const lvl = RUBRIC_LEVELS.find(l => l.factor === factor);
                                                            const lvlName = lvl ? `${lvl.label} (${lvl.pct})` : "Sin calificar";
                                                            return `  • #${i + 1} ${c.name} (${c.percentage}%): ${lvlName}`;
                                                        }).join("\n");
                                                        const breakdownText = `\n\n📊 Desglose de Evaluación Ponderada:\n• Evaluación Automática IA (${aiWeight}%): ${aiGrade.toFixed(1)} / 5.0\n• Sustentación Oral Docente (${checklistWeight}%): ${checklistScore.toFixed(1)} / 5.0\n• NOTA FINAL CONSOLIDADA: ${combinedFinalScore.toFixed(1)} / 5.0\n\nPreguntas de Sustentación:\n${questionDetails}`;
                                                        setTeacherNotesInput(prev => prev ? prev + breakdownText : breakdownText.trim());
                                                        toast.success("Desglose copiado a las observaciones docentes.");
                                                    }}
                                                    className="h-7 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-foreground"
                                                    title="Copiar el desglose matemático a las observaciones del profesor"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    Copiar a Observaciones
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => {
                                                        setGradeInput(combinedFinalScore.toFixed(1));
                                                        toast.success(`Nota final ponderada aplicada: ${combinedFinalScore.toFixed(1)} / 5.0 (${aiWeight}% IA + ${checklistWeight}% Sustentación)`);
                                                    }}
                                                    className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Aplicar Nota Final ({combinedFinalScore.toFixed(1)})
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Tarjeta de Cálculo Ponderado en Tiempo Real */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-background/80 border border-primary/15 text-xs">
                                            <div className="p-2 rounded-lg bg-purple-500/[0.05] border border-purple-500/20 flex flex-col justify-between">
                                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" /> Evaluación IA ({aiWeight}%)
                                                </span>
                                                <div className="flex items-baseline justify-between mt-1">
                                                    <span className="text-sm font-black font-mono">{aiGrade.toFixed(1)}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">+{(aiGrade * (aiWeight / 100)).toFixed(2)} pts</span>
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-lg bg-blue-500/[0.05] border border-blue-500/20 flex flex-col justify-between">
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
                                                    <ListChecks className="h-3 w-3" /> Sustentación ({checklistWeight}%)
                                                </span>
                                                <div className="flex items-baseline justify-between mt-1">
                                                    <span className="text-sm font-black font-mono">{checklistScore.toFixed(1)}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">+{(checklistScore * (checklistWeight / 100)).toFixed(2)} pts</span>
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 flex flex-col justify-between">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Nota Final Ponderada
                                                </span>
                                                <div className="flex items-baseline justify-between mt-1">
                                                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                        {combinedFinalScore.toFixed(1)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground font-mono">/ 5.0</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                                            <span>Evalúa cada pregunta según la sustentación del estudiante:</span>
                                            <div className="flex items-center gap-1.5 font-semibold text-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setManualSustentacionScore(null);
                                                        const allSabe: Record<string, number> = {};
                                                        checklistData.forEach((c: any) => { allSabe[c.id] = 1.0; });
                                                        setCriteriaLevels(allSabe);
                                                    }}
                                                    className="text-primary hover:underline cursor-pointer"
                                                >
                                                    Todos Sabe (100%)
                                                </button>
                                                <span>•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setManualSustentacionScore(null);
                                                        setCriteriaLevels({});
                                                    }}
                                                    className="hover:underline cursor-pointer"
                                                >
                                                    Limpiar
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 transition-all" style={{ zoom: textZoom }}>
                                            {checklistData.map((crit: any, idx: number) => {
                                                const currentFactor = criteriaLevels[crit.id];
                                                const hasValue = typeof currentFactor === "number";
                                                const earnedWeight = hasValue ? (Number(crit.percentage) || 0) * currentFactor : 0;

                                                return (
                                                    <div 
                                                        key={crit.id || idx}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all space-y-2.5",
                                                            currentFactor === 1.0 
                                                                ? "bg-emerald-500/[0.07] border-emerald-500/35" 
                                                                : currentFactor === 0.75 
                                                                ? "bg-blue-500/[0.07] border-blue-500/35" 
                                                                : currentFactor === 0.5 
                                                                ? "bg-amber-500/[0.07] border-amber-500/35" 
                                                                : currentFactor === 0.0 
                                                                ? "bg-rose-500/[0.07] border-rose-500/35" 
                                                                : "bg-card border-border/70"
                                                        )}
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                                                <Badge variant="outline" className="text-[10px] font-mono font-bold shrink-0 bg-primary/5 text-primary border-primary/20">
                                                                    #{idx + 1}
                                                                </Badge>
                                                                <span className="font-bold text-xs text-foreground">
                                                                    {crit.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {hasValue && (
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={cn(
                                                                            "text-[10px] font-mono font-bold",
                                                                            currentFactor === 1.0
                                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                                                : currentFactor === 0.75
                                                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                                                                : currentFactor === 0.5
                                                                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                                                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                                                        )}
                                                                    >
                                                                        +{earnedWeight.toFixed(1)}% / {crit.percentage}%
                                                                    </Badge>
                                                                )}
                                                                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                                                                    Peso: {crit.percentage}%
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {/* 4 Niveles Proporcionales: Sabe, Aceptable, Parcial, No Sabe */}
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                            {RUBRIC_LEVELS.map((lvl) => {
                                                                const isSelected = currentFactor === lvl.factor;
                                                                return (
                                                                    <button
                                                                        key={lvl.key}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setManualSustentacionScore(null);
                                                                            setCriteriaLevels(prev => ({
                                                                                ...prev,
                                                                                [crit.id]: isSelected ? undefined : lvl.factor
                                                                            }));
                                                                        }}
                                                                        className={cn(
                                                                            "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                                                            isSelected
                                                                                ? lvl.key === "sabe"
                                                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                                                    : lvl.key === "aceptable"
                                                                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                                                    : lvl.key === "parcial"
                                                                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                                                                    : "bg-rose-600 text-white border-rose-600 shadow-xs"
                                                                                : lvl.key === "sabe"
                                                                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                                                                                : lvl.key === "aceptable"
                                                                                ? "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                                                                                : lvl.key === "parcial"
                                                                                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                                                                                : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                                                                        )}
                                                                        title={`${lvl.label} (${lvl.pct}) - Aporta ${((Number(crit.percentage) || 0) * lvl.factor).toFixed(1)}%`}
                                                                    >
                                                                        <lvl.icon className="h-3.5 w-3.5" />
                                                                        <span>{lvl.label}</span>
                                                                        <span className="text-[10px] opacity-80">({lvl.pct})</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {crit.question && (
                                                            <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg space-y-1">
                                                                <div className="font-semibold text-primary flex items-center gap-1">
                                                                    <HelpCircle className="h-3 w-3" />
                                                                    Pregunta de sustentación:
                                                                </div>
                                                                <p className="text-foreground leading-snug">{crit.question}</p>
                                                            </div>
                                                        )}

                                                        {crit.expectedAnswer && (
                                                            <div className="text-[11px] text-muted-foreground bg-emerald-500/5 p-2 rounded-lg space-y-0.5 border border-emerald-500/10">
                                                                <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Respuesta esperada / Qué verificar:
                                                                </div>
                                                                <p className="text-foreground/90 leading-snug">{crit.expectedAnswer}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Score Presets Pills */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold">Calificación Rápida</Label>
                                        {checklistConfig && manualSustentacionScore !== null && (
                                            <button
                                                type="button"
                                                onClick={() => setManualSustentacionScore(null)}
                                                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                                            >
                                                Restablecer
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {["5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.0"].map((score) => {
                                            const num = parseFloat(score);
                                            const isSelected = checklistConfig 
                                                ? (manualSustentacionScore !== null && Math.abs(manualSustentacionScore - num) < 0.05)
                                                : (gradeInput === score);

                                            return (
                                                <button
                                                    key={score}
                                                    type="button"
                                                    onClick={() => {
                                                        if (checklistConfig) {
                                                            setManualSustentacionScore(num);
                                                            const closestFactor = num >= 4.5 ? 1.0 : num >= 3.5 ? 0.75 : num >= 2.0 ? 0.5 : 0.0;
                                                            const updatedLevels: Record<string, number> = {};
                                                            checklistData?.forEach((crit: any) => {
                                                                updatedLevels[crit.id] = closestFactor;
                                                            });
                                                            setCriteriaLevels(updatedLevels);

                                                            const aiPart = aiGrade * (aiWeight / 100);
                                                            const teacherPart = num * (checklistWeight / 100);
                                                            const combined = Math.min(5.0, Math.max(0.0, aiPart + teacherPart));
                                                            setGradeInput(combined.toFixed(1));
                                                            toast.info(`Sustentación asignada: ${num.toFixed(1)} / 5.0 (${checklistWeight}%). Nota final ponderada con IA: ${combined.toFixed(1)}`);
                                                        } else {
                                                            setGradeInput(score);
                                                        }
                                                    }}
                                                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                                        isSelected 
                                                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                            : "bg-background hover:bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                    {score}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Mensaje en pantalla para la sustentación oral */}
                                    {checklistConfig && (
                                        <div className="p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/25 text-xs space-y-1.5 shadow-2xs">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                                                <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                                <span>Regla de Sustentación Oral ({checklistWeight}%):</span>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                Al utilizar la <strong>Calificación Rápida</strong>, la <strong>Sustentación Oral</strong> adquiere automáticamente esa nota{" "}
                                                {manualSustentacionScore !== null ? (
                                                    <strong className="text-blue-600 dark:text-blue-400">({manualSustentacionScore.toFixed(1)} / 5.0)</strong>
                                                ) : (
                                                    "(según el botón presionado)"
                                                )}
                                                , y la <strong>Nota Final</strong> se calcula ponderándola automáticamente con la <strong>Evaluación IA ({aiWeight}% = {aiGrade.toFixed(1)})</strong>.
                                            </p>
                                            {manualSustentacionScore !== null && (
                                                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                                                    <span className="bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-bold border border-blue-500/30">
                                                        Sustentación ({checklistWeight}%): {manualSustentacionScore.toFixed(1)}
                                                    </span>
                                                    <span className="text-muted-foreground">+</span>
                                                    <span className="bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-bold border border-purple-500/30">
                                                        IA ({aiWeight}%): {aiGrade.toFixed(1)}
                                                    </span>
                                                    <span className="text-muted-foreground">=</span>
                                                    <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold border border-emerald-500/30">
                                                        Nota Final Ponderada: {combinedFinalScore.toFixed(1)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Grade input */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="grade-input" className="text-xs">Nota Final (0.0 - 5.0)</Label>
                                        <Input
                                            id="grade-input"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            value={gradeInput}
                                            onChange={(e) => setGradeInput(e.target.value)}
                                            placeholder="Ej: 4.5"
                                            className="font-bold text-base"
                                        />

                                        {gradingResult && gradeInput && !isNaN(parseFloat(gradeInput)) && parseFloat(gradeInput) !== gradingResult.grade && (
                                            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs animate-in fade-in">
                                                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                                                    <Zap className="h-4 w-4 shrink-0 text-amber-600" />
                                                    Nota modificada respecto a la sugerida por la IA ({gradingResult.grade.toFixed(1)} → {parseFloat(gradeInput).toFixed(1)})
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="teacher-observation" className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                                                        Justificación / Observación del Ajuste:
                                                    </Label>
                                                    <Textarea
                                                        id="teacher-observation"
                                                        rows={2}
                                                        value={teacherObservationInput}
                                                        onChange={(e) => setTeacherObservationInput(e.target.value)}
                                                        placeholder="Explica el motivo del cambio de nota (ej: Se otorgó crédito parcial por la estructura general del proyecto)..."
                                                        className="bg-white dark:bg-slate-900 text-xs leading-relaxed border-amber-300 dark:border-amber-700"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 👨‍🏫 Section: Observaciones del Profesor */}
                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="teacher-notes-input" className="text-xs font-bold flex items-center gap-1.5">
                                                    👨‍🏫 Observaciones / Retroalimentación del Profesor
                                                </Label>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Escribe comentarios u observaciones personales para el estudiante.
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={isImprovingFeedback || !teacherNotesInput || teacherNotesInput.trim().length < 5}
                                                onClick={handleImproveTeacherNotes}
                                                className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-semibold gap-1"
                                            >
                                                {isImprovingFeedback ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Sparkles className="w-3 h-3 text-primary" />}
                                                Mejorar Redacción con IA
                                            </Button>
                                        </div>

                                        <Textarea
                                            id="teacher-notes-input"
                                            rows={5}
                                            value={teacherNotesInput}
                                            onChange={(e) => setTeacherNotesInput(e.target.value)}
                                            placeholder="Ingresa tus observaciones docentes (ej: Excelente desempeño en la estructuración de clases. Recuerda entregar los commits con nombres descriptivos)..."
                                            className="text-xs leading-relaxed bg-background"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            type="button"
                                            size="lg"
                                            disabled={isSavingGrade}
                                            onClick={handleSaveScore}
                                            className="flex-1 font-bold shadow-sm"
                                        >
                                            {isSavingGrade ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            {submission?.grade !== null && submission?.grade !== undefined ? "Actualizar Nota" : "Guardar Nota"}
                                        </Button>

                                        {submission && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                onClick={() => onReject(student.id, teacherNotesInput || aiFeedbackInput)}
                                                className="text-destructive hover:bg-destructive/10"
                                            >
                                                Rechazar Entrega
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 4: GitHub MCP Inspector */}
                        <TabsContent value="mcp_chat" className="mt-3 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                            {submission?.url ? (
                                <GitHubRepoChatInspector
                                    repoUrl={submission.url}
                                    studentName={student?.name}
                                    activityId={activity?.id}
                                    studentId={student?.id}
                                    isFullscreen={fullscreenSection === "content"}
                                    onToggleFullscreen={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-card rounded-xl border">
                                    <Github className="h-10 w-10 text-muted-foreground/40 mb-2" />
                                    <p className="text-sm font-semibold">No se encontró una URL de GitHub asociada a esta entrega.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modal de Selección de Exigencia IA y Ejecución */}
            <Dialog open={isAIGradingDialogOpen} onOpenChange={setIsAIGradingDialogOpen}>
                <DialogContent className="max-w-md w-full p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            Evaluación con IA (Gemini)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Se analizarán los <strong>{selectedFiles.length} archivos</strong> seleccionados frente a la rúbrica de la actividad.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Nivel de Exigencia</Label>
                            <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                        </div>

                        {/* Progress logs stream console */}
                        {gradingLogs.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                                    <span className="flex items-center gap-1.5 font-bold">
                                        {isEvaluating && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />}
                                        Progreso de IA
                                    </span>
                                    <span>{gradingLogs.length} eventos</span>
                                </div>
                                <div 
                                    ref={logRef}
                                    className="max-h-36 overflow-y-auto bg-slate-950 text-slate-300 font-mono text-[10px] p-2.5 rounded-lg border border-slate-800 space-y-1"
                                >
                                    {gradingLogs.map((log, index) => (
                                        <div key={index} className="border-b border-slate-800/50 pb-0.5">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isEvaluating}
                            onClick={() => setIsAIGradingDialogOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={isEvaluating || selectedFiles.length === 0}
                            onClick={async () => {
                                await handleRunAIEvaluation();
                                setIsAIGradingDialogOpen(false);
                                setActiveTab("ai_report");
                            }}
                            variant="default"
                            className="font-bold gap-2"
                        >
                            {isEvaluating ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Evaluando...</>
                            ) : (
                                <><Sparkles className="h-4 w-4" /> Iniciar Evaluación con IA</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
