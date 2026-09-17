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
    ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, ListChecks, HelpCircle, CheckCircle2, MinusCircle, XCircle, Info, ZoomIn, ZoomOut,
    GitCommitVertical, ArrowUp, ArrowDown, GripVertical, ListOrdered, ArrowUpDown, GitBranch, UserCheck, SlidersHorizontal,
    Terminal, Video, Mic, MessageSquareQuote, Database
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import { scanRepositoryAction, fetchRepoFilesAction, getRepoBranchesAction } from "@/features/github/actions/githubActions";
import { githubService } from "@/features/github/services/githubService";
import { analyzeGitHubFileAction, finalizeGitHubGradingAction, improveFeedbackAction } from "@/features/teacher/actions/gradingActions";
import { 
    getActivityChecklistConfig, 
    extractEvaluationMetadata, 
    stripEvaluationMetadata, 
    embedEvaluationMetadata, 
    calculateChecklistScore, 
    calculateCombinedFinalGrade,
    type EvaluationMetadata 
} from "@/features/teacher/utils/checklistGradingUtils";
import { GradingModeSelector } from "@/features/teacher/components/GradingModeSelector";
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { ExportFeedbackButtons } from "@/components/ui/export-feedback-buttons";
import { GitHubRepoChatInspector } from "@/features/teacher/components/GitHubRepoChatInspector";
import { GithubRepoAudit } from "@/features/github/components/GithubRepoAudit";
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
    const cleanRaw = stripEvaluationMetadata(rawFeedback).replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "");
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

function SortableEvaluationFileItem({
    id,
    path,
    index,
    total,
    onMoveUp,
    onMoveDown,
    onRemove,
    onPreview,
    isPreviewing,
}: {
    id: string;
    path: string;
    index: number;
    total: number;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (path: string) => void;
    onPreview: (path: string) => void;
    isPreviewing: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.7 : 1,
    };

    const isPrimaryCode = PRIMARY_CODE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onPreview(path)}
            className={cn(
                "flex items-center gap-1.5 p-1.5 rounded-lg border bg-background/95 text-xs font-mono group transition-colors select-none min-w-0 w-full cursor-pointer",
                isDragging ? "ring-2 ring-primary border-transparent shadow-lg" : "hover:border-primary/40",
                isPreviewing && "border-primary/50 bg-primary/5"
            )}
        >
            <div 
                {...attributes} 
                {...listeners} 
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0"
                title="Arrastra para reordenar prioridad"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </div>

            <Badge 
                variant="secondary" 
                className="h-5 min-w-5 px-1 flex items-center justify-center font-bold text-[10px] shrink-0 bg-primary/10 text-primary border border-primary/20 font-mono"
            >
                #{index + 1}
            </Badge>

            {isPrimaryCode ? (
                <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}

            <span 
                onClick={() => onPreview(path)} 
                className={cn(
                    "flex-1 min-w-0 truncate cursor-pointer text-[11px] transition-colors",
                    isPreviewing ? "font-bold text-primary" : "text-foreground hover:text-primary"
                )}
                title={path}
            >
                {path}
            </span>

            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp(index);
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Subir prioridad"
                >
                    <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === total - 1}
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown(index);
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                    title="Bajar prioridad"
                >
                    <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPreview(path);
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Ver código"
                >
                    <Eye className="h-3 w-3" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(path);
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Quitar de la evaluación"
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
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
    const [fileViewMode, setFileViewMode] = useState<"required" | "explorer" | "order">(
        activity?.filePaths ? "required" : "explorer"
    );
    const showAllRepoFiles = fileViewMode === "explorer";
    const setShowAllRepoFiles = (show: boolean) => setFileViewMode(show ? "explorer" : "required");
    const [fullscreenSection, setFullscreenSection] = useState<"none" | "explorer" | "content">("none");
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);

    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        setSelectedFiles(prev => {
            const next = [...prev];
            const temp = next[index - 1];
            next[index - 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    const handleMoveDown = (index: number) => {
        setSelectedFiles(prev => {
            if (index >= prev.length - 1) return prev;
            const next = [...prev];
            const temp = next[index + 1];
            next[index + 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    const handleDragEndOrder = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSelectedFiles((items) => {
                const oldIndex = items.indexOf(active.id.toString());
                const newIndex = items.indexOf(over.id.toString());
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleRemoveSelectedFile = (path: string) => {
        setSelectedFiles(prev => prev.filter(p => p !== path));
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Extraer Lista de Chequeo, Criterios y Ponderaciones configuradas (por defecto: 30% IA / 70% Docente)
    const checklistConfig = useMemo(() => {
        return getActivityChecklistConfig(activity?.description);
    }, [activity?.description]);

    const isTeacherGradingEnabled = Boolean(checklistConfig);

    const checklistData = checklistConfig?.criteria ?? null;
    const aiWeight = checklistConfig?.aiWeight ?? 30;
    const checklistWeight = checklistConfig?.checklistWeight ?? 70;

    // Metadatos persistidos en el feedback de la entrega
    const storedMeta = useMemo(() => {
        return extractEvaluationMetadata(submission?.feedback);
    }, [submission?.feedback]);

    // Evaluación por niveles en sustentación (1.0 = Sabe, 0.75 = Aceptable, 0.5 = Parcial, 0.0 = No Sabe)
    const [criteriaLevels, setCriteriaLevels] = useState<Record<string, number | undefined>>(() => {
        return storedMeta?.criteriaLevels ?? {};
    });
    const [manualSustentacionScore, setManualSustentacionScore] = useState<number | null>(() => {
        return storedMeta?.manualSustentacionScore ?? null;
    });

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
    const [activeTab, setActiveTab] = useState<"statement" | "preview" | "ai_report" | "teacher_grade" | "mcp_chat" | "git_audit">("preview");
    const [gradingLogs, setGradingLogs] = useState<string[]>([]);
    const [gradingResult, setGradingResult] = useState<any>(null);
    const [showLogs, setShowLogs] = useState(false);

    // Nota obtenida de la evaluación de la IA (0.0 - 5.0)
    const aiGrade = useMemo(() => {
        if (gradingResult?.grade !== undefined && gradingResult?.grade !== null) {
            return Number(gradingResult.rawAiGrade ?? gradingResult.grade);
        }
        if (storedMeta?.aiGrade !== undefined && storedMeta?.aiGrade !== null) {
            return Number(storedMeta.aiGrade);
        }
        if (!checklistConfig && submission?.grade !== undefined && submission?.grade !== null) {
            return Number(submission.grade);
        }
        return 0;
    }, [gradingResult, storedMeta, checklistConfig, submission?.grade]);

    // Nota obtenida exclusivamente en la sustentación oral (0.0 - 5.0) de forma proporcional
    const checklistScore = useMemo(() => {
        return calculateChecklistScore(checklistData, criteriaLevels, manualSustentacionScore);
    }, [checklistData, criteriaLevels, manualSustentacionScore]);

    // Nota final combinada ponderada: (IA * aiWeight%) + (Sustentación * checklistWeight%)
    const combinedFinalScore = useMemo(() => {
        if (!checklistConfig) return checklistScore;
        return calculateCombinedFinalGrade(aiGrade, checklistScore, aiWeight, checklistWeight);
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

    // Sincronizar estado completo al cambiar de estudiante o entrega
    useEffect(() => {
        const parsed = parseInitialFeedback(submission?.feedback);
        const meta = extractEvaluationMetadata(submission?.feedback);
        setCriteriaLevels(meta?.criteriaLevels ?? {});
        setManualSustentacionScore(meta?.manualSustentacionScore ?? null);
        setAiFeedbackInput(parsed.aiFeedback);
        setTeacherNotesInput(parsed.teacherNotes);
        setGradingResult(null);
        setGradeInput(
            submission?.grade !== null && submission?.grade !== undefined
                ? String(submission.grade)
                : ""
        );
    }, [student?.id, submission?.id, submission?.feedback, submission?.grade]);

    // Actualiza niveles de criterios y sincroniza automáticamente la nota final ponderada
    const handleUpdateCriteriaLevels = (nextLevels: Record<string, number | undefined>) => {
        setManualSustentacionScore(null);
        const cleaned: Record<string, number> = {};
        for (const [k, v] of Object.entries(nextLevels)) {
            if (typeof v === "number") cleaned[k] = v;
        }
        setCriteriaLevels(cleaned);

        if (checklistConfig) {
            const nextScore = calculateChecklistScore(checklistData, cleaned, null);
            const nextCombined = calculateCombinedFinalGrade(aiGrade, nextScore, aiWeight, checklistWeight);
            setGradeInput(nextCombined.toFixed(1));
        }
    };

    // Mantener sincronizado gradeInput con la nota combinada en tiempo real cuando la sustentación/checklist esté activa
    useEffect(() => {
        if (checklistConfig) {
            setGradeInput(combinedFinalScore.toFixed(1));
        }
    }, [checklistConfig, combinedFinalScore]);

    // Redirigir si la calificación docente está deshabilitada y la pestaña activa era teacher_grade
    useEffect(() => {
        if (!isTeacherGradingEnabled && activeTab === "teacher_grade") {
            setActiveTab("preview");
        }
    }, [isTeacherGradingEnabled, activeTab]);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [gradingLogs]);

    // Effective repo URL with selected branch
    const effectiveRepoUrl = useMemo(() => {
        if (!submission?.url) return "";
        try {
            const parsed = githubService.parseGitHubUrl(submission.url);
            if (!parsed) return submission.url;
            if (!selectedBranch || selectedBranch === "HEAD") return submission.url;
            return `https://github.com/${parsed.owner}/${parsed.repo}/tree/${selectedBranch}`;
        } catch {
            return submission.url;
        }
    }, [submission?.url, selectedBranch]);

    // Auto scan repository on mount and fetch branches if submission exists
    useEffect(() => {
        if (submission?.url) {
            initRepoAndBranches(submission.url);
        }
    }, [submission?.url]);

    const initRepoAndBranches = async (url: string) => {
        setIsLoadingBranches(true);
        let branchToUse = "main";
        try {
            const parsed = githubService.parseGitHubUrl(url);
            const branchRes = await getRepoBranchesAction(url, activity?.id);
            const availableBranches = branchRes.branches || [];
            setBranches(availableBranches);

            if (parsed && parsed.branch && parsed.branch !== "HEAD") {
                branchToUse = parsed.branch;
            } else if (branchRes.activeBranch) {
                branchToUse = branchRes.activeBranch;
            } else if (branchRes.defaultBranch) {
                branchToUse = branchRes.defaultBranch;
            } else if (availableBranches.length > 0) {
                branchToUse = availableBranches[0];
            }
            setSelectedBranch(branchToUse);
        } catch (err: any) {
            console.warn("No se pudieron cargar ramas:", err);
            const parsed = githubService.parseGitHubUrl(url);
            if (parsed && parsed.branch && parsed.branch !== "HEAD") {
                branchToUse = parsed.branch;
                setSelectedBranch(branchToUse);
            }
        } finally {
            setIsLoadingBranches(false);
        }

        await handleScanRepo(branchToUse);
    };

    const handleSelectBranch = async (newBranch: string) => {
        if (newBranch === selectedBranch || isScanning) return;
        setSelectedBranch(newBranch);
        fileCache.current = {};
        toast.info(`Cambiando a la rama "${newBranch}"...`);
        await handleScanRepo(newBranch);
    };

    const handleScanRepo = async (branchOverride?: string) => {
        if (!submission?.url) return;
        setIsScanning(true);
        const branchToUse = branchOverride || selectedBranch || undefined;
        try {
            const res = await scanRepositoryAction(submission.url, branchToUse);
            const files = res.files || [];
            setRepoFiles(files);
            
            // Extract required files configured for activity
            const configuredList: string[] = typeof activity?.filePaths === "string"
                ? activity.filePaths.split(',').map((s: string) => s.trim()).filter(Boolean)
                : Array.isArray(activity?.filePaths)
                ? activity.filePaths.map((s: any) => String(s).trim()).filter(Boolean)
                : [];

            // In "Requeridos" mode, auto-select required files found in repo, strictly preserving configured order
            let initialSelection: string[] = [];
            if (configuredList.length > 0) {
                const matches: string[] = [];
                const seen = new Set<string>();
                for (const cp of configuredList) {
                    for (const rf of files) {
                        if (isPathMatch(rf, cp) && !seen.has(rf)) {
                            seen.add(rf);
                            matches.push(rf);
                        }
                    }
                }
                initialSelection = matches;
            }

            setSelectedFiles(initialSelection);

            if (initialSelection.length > 0) {
                handleLoadFilePreview(initialSelection[0], branchToUse, false);
            } else if (files.length > 0) {
                handleLoadFilePreview(files[0], branchToUse, false);
            }
            
            toast.success(`${files.length} archivos en la rama "${branchToUse || 'principal'}"`);
        } catch (err: any) {
            toast.error("Error al escanear el repositorio", { description: err.message });
        } finally {
            setIsScanning(false);
        }
    };

    const handleLoadFilePreview = async (filePath: string, branchOverride?: string, shouldSwitchTab: boolean = true) => {
        setPreviewFile(filePath);
        if (shouldSwitchTab) {
            setActiveTab("preview");
        }
        const branchToUse = branchOverride || selectedBranch || undefined;
        const cacheKey = `${branchToUse || 'HEAD'}:${filePath}`;

        if (fileCache.current[cacheKey]) {
            setPreviewContent(fileCache.current[cacheKey]);
            return;
        }

        setIsLoadingPreview(true);
        try {
            const res = await fetchRepoFilesAction(submission.url, filePath, activity.id, branchToUse);
            if (res.validFiles && res.validFiles.length > 0) {
                const content = res.validFiles[0].content;
                fileCache.current[cacheKey] = content;
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
        if (primary.length > 0) {
            handleLoadFilePreview(primary[0]);
        }
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
            if (selectedBranch) {
                addLog(`🌿 Rama seleccionada para evaluación: "${selectedBranch}"`);
            }
            addLog(`📂 Descargando los ${selectedFiles.length} archivos seleccionados del proyecto...`);

            const { validFiles, missingFiles, warning } = await fetchRepoFilesAction(
                submission.url,
                selectedFiles.join(','),
                activity.id,
                selectedBranch || undefined
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
                    effectiveRepoUrl || submission.url,
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
                effectiveRepoUrl || submission.url,
                activity.statement || "",
                analyses,
                missingFilesForEval,
                totalExpectedFiles,
                activity.courseId,
                gradingMode
            );

            setGradingResult(result);
            const rawAi = result.rawAiGrade ?? result.grade;
            const effectiveCombined = checklistConfig
                ? calculateCombinedFinalGrade(rawAi, checklistScore, aiWeight, checklistWeight)
                : result.grade;
            setGradeInput(effectiveCombined.toFixed(1));
            setAiFeedbackInput(stripEvaluationMetadata(result.feedback));
            setActiveTab("ai_report");
            router.refresh();

            addLog(`🎉 Calificación final completada: ${effectiveCombined.toFixed(1)} / 5.0 (IA: ${rawAi.toFixed(1)})`);
            toast.success(`Evaluación completada: Nota ${effectiveCombined.toFixed(1)} / 5.0`);
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
        let gradeToSave = checklistConfig ? combinedFinalScore.toFixed(1) : gradeInput;
        if (!gradeToSave || isNaN(parseFloat(gradeToSave))) {
            gradeToSave = combinedFinalScore.toFixed(1);
        }

        if (!gradeToSave) {
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

            const currentGrade = parseFloat(gradeToSave);

            if (
                gradingResult && 
                !isNaN(currentGrade) && 
                currentGrade !== gradingResult.grade && 
                teacherObservationInput.trim()
            ) {
                finalFeedback += `\n\n---\n\n> 📝 **Justificación del Ajuste de Nota (Profesor):**\n> ${teacherObservationInput.trim()} *(Nota IA: ${(gradingResult.rawAiGrade ?? gradingResult.grade).toFixed(1)} → Nota Definitiva: ${currentGrade.toFixed(1)})*`;
            }

            // Si la actividad tiene lista de chequeo, embeber metadatos para persistir los criterios y notas individuales
            if (checklistConfig) {
                const metaToSave: EvaluationMetadata = {
                    aiGrade: aiGrade,
                    checklistScore: checklistScore,
                    criteriaLevels: criteriaLevels,
                    manualSustentacionScore: manualSustentacionScore,
                    calculatedFinalGrade: currentGrade,
                };
                finalFeedback = embedEvaluationMetadata(finalFeedback, metaToSave);
            }

            await onGradeManual(gradeToSave, finalFeedback, student.id, activity.id);
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

    // Matching files found in repo using smart path/basename matching, strictly preserving configured order
    const foundConfiguredFiles = useMemo(() => {
        if (configuredPathsList.length === 0) return repoFiles;
        const matches: string[] = [];
        const seen = new Set<string>();
        for (const cp of configuredPathsList) {
            for (const rf of repoFiles) {
                if (isPathMatch(rf, cp) && !seen.has(rf)) {
                    seen.add(rf);
                    matches.push(rf);
                }
            }
        }
        return matches;
    }, [repoFiles, configuredPathsList]);

    // Missing files required for the activity, preserving configured order
    const missingConfiguredFiles = useMemo(() => {
        if (configuredPathsList.length === 0) return [];
        return configuredPathsList.filter(cp => {
            return !repoFiles.some(rf => isPathMatch(rf, cp));
        });
    }, [repoFiles, configuredPathsList]);

    const targetFilesList = (fileViewMode === "explorer" || configuredPathsList.length === 0)
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
                                {activity.type === "CODE_CHALLENGE" && <Terminal className="h-3 w-3 text-primary" />}
                                {activity.type === "VIDEO_PITCH" && <Video className="h-3 w-3 text-primary" />}
                                {activity.type === "AUDIO_DEFENSE" && <Mic className="h-3 w-3 text-primary" />}
                                {activity.type === "AI_INTERVIEW" && <MessageSquareQuote className="h-3 w-3 text-primary" />}
                                {(activity.type === "DB_MODELING" || activity.type === "DATABASE") && <Database className="h-3 w-3 text-primary" />}
                                {activity.type === "WORKSHOP_CODE" && <Terminal className="h-3 w-3 text-cyan-500" />}
                                {activity.type === "WORKSHOP_GITHUB" && <GitBranch className="h-3 w-3 text-orange-500" />}
                                {activity.type === "MANUAL" && <LinkIcon className="h-3 w-3 text-primary" />}
                                <span>
                                    {activity.type === "GITHUB"
                                        ? "GitHub"
                                        : activity.type === "CODE_PROJECT"
                                        ? "Proyecto Código"
                                        : activity.type === "PDF_REVIEW"
                                        ? "PDF"
                                        : activity.type === "CODE_CHALLENGE"
                                        ? "Code Challenge"
                                        : activity.type === "WORKSHOP_CODE"
                                        ? "Taller Codelab"
                                        : activity.type === "WORKSHOP_GITHUB"
                                        ? "Taller Git & GitHub"
                                        : activity.type === "VIDEO_PITCH"
                                        ? "Video Pitch"
                                        : activity.type === "AUDIO_DEFENSE"
                                        ? "Defensa Oral"
                                        : activity.type === "AI_INTERVIEW"
                                        ? "Entrevista IA"
                                        : (activity.type === "DB_MODELING" || activity.type === "DATABASE")
                                        ? "Base de Datos"
                                        : "Manual"}
                                </span>
                            </Badge>
                        )}
                    </div>

                    {submission?.url && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1.5 shrink-0"
                                title="Abrir repositorio en GitHub en la rama seleccionada"
                            >
                                <a 
                                    href={effectiveRepoUrl || submission.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                >
                                    <Github className="h-3.5 w-3.5 text-primary" />
                                    <span>Ver Repo</span>
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                </a>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={isLoadingBranches || isScanning}
                                        className="h-7 px-2 text-xs gap-1.5 shrink-0 font-mono border-border/80 hover:border-primary/50 bg-background/80 max-w-[170px]"
                                        title={`Rama seleccionada: ${selectedBranch || 'default'}. Clic para cambiar de rama.`}
                                    >
                                        {isLoadingBranches ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                        ) : (
                                            <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                                        )}
                                        <span className="truncate font-semibold text-xs">
                                            {selectedBranch || "Rama"}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
                                    <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                        <span>Ramas del Repositorio</span>
                                        {branches.length > 0 && (
                                            <Badge variant="outline" className="text-[9px] font-mono py-0 px-1">
                                                {branches.length}
                                            </Badge>
                                        )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {branches.length === 0 ? (
                                        <div className="py-2 px-3 text-xs text-muted-foreground text-center">
                                            {isLoadingBranches ? "Cargando ramas..." : "No se detectaron ramas adicionales"}
                                        </div>
                                    ) : (
                                        branches.map((branchName) => {
                                            const isCurrent = (selectedBranch || "").toLowerCase() === branchName.toLowerCase();
                                            return (
                                                <DropdownMenuItem
                                                    key={branchName}
                                                    onClick={() => handleSelectBranch(branchName)}
                                                    className={cn(
                                                        "text-xs font-mono flex items-center justify-between cursor-pointer py-1.5",
                                                        isCurrent && "bg-primary/10 text-primary font-bold"
                                                    )}
                                                >
                                                    <span className="truncate flex items-center gap-1.5">
                                                        <GitBranch className="h-3 w-3 shrink-0 opacity-70" />
                                                        {branchName}
                                                    </span>
                                                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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

                    {checklistConfig ? (
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap animate-in fade-in">
                            {/* Nota IA con porcentaje */}
                            <div 
                                className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Evaluación IA: ${aiGrade.toFixed(1)} / 5.0 (${aiWeight}% de la nota final)`}
                            >
                                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">IA</span>
                                <span className="text-[10px] font-mono opacity-80">({aiWeight}%):</span>
                                <span className="text-xs font-black font-mono">{aiGrade.toFixed(1)}</span>
                            </div>

                            {/* Nota Profesor / Sustentación con porcentaje */}
                            <div 
                                className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Sustentación Docente: ${checklistScore.toFixed(1)} / 5.0 (${checklistWeight}% de la nota final)`}
                            >
                                <UserCheck className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-[10px] font-medium opacity-90 hidden sm:inline">Docente</span>
                                <span className="text-[10px] font-mono opacity-80">({checklistWeight}%):</span>
                                <span className="text-xs font-black font-mono">{checklistScore.toFixed(1)}</span>
                            </div>

                            {/* Nota Final Ponderada */}
                            <div 
                                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold shadow-2xs"
                                title={`Nota Final Ponderada: ${combinedFinalScore.toFixed(1)} / 5.0`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Final:</span>
                                <span className="text-sm font-black font-mono">{combinedFinalScore.toFixed(1)}</span>
                                <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                            </div>
                        </div>
                    ) : currentDisplayedGrade !== null ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold animate-in fade-in">
                            <span className="text-[10px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-sm font-black">{currentDisplayedGrade.toFixed(1)}</span>
                            <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : null}

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

                        {/* Mode Switcher */}
                        {configuredPathsList.length > 0 ? (
                            <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 text-[10px] w-full">
                                <button
                                    type="button"
                                    onClick={() => setFileViewMode("required")}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        fileViewMode === "required"
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Mostrar archivos requeridos por la actividad"
                                >
                                    🎯 Requeridos ({foundConfiguredFiles.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFileViewMode("explorer")}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        fileViewMode === "explorer" 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Explorar todos los archivos del repositorio"
                                >
                                    📂 Explorar ({repoFiles.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFileViewMode("order")}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        fileViewMode === "order" 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Definir y priorizar el orden de evaluación para la IA"
                                >
                                    🔢 Orden ({selectedFiles.length})
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center rounded-lg border bg-muted/60 p-0.5 text-[10px] w-full">
                                <button
                                    type="button"
                                    onClick={() => setFileViewMode("explorer")}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        fileViewMode === "explorer" 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Explorar todos los archivos del repositorio"
                                >
                                    📂 Explorar Repositorio ({repoFiles.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFileViewMode("order")}
                                    className={`flex-1 py-1 rounded-md font-medium transition-all text-center ${
                                        fileViewMode === "order" 
                                            ? "bg-background text-foreground shadow-xs font-bold border border-border/50" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="Definir y priorizar el orden de evaluación para la IA"
                                >
                                    🔢 Orden Eval. ({selectedFiles.length})
                                </button>
                            </div>
                        )}

                        {/* Branch Indicator in Left Sidebar Toolbar */}
                        {submission?.url && (
                            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground bg-muted/30 rounded-md border border-border/40">
                                <span className="flex items-center gap-1.5 font-mono text-[11px] truncate min-w-0">
                                    <GitBranch className="h-3 w-3 text-primary shrink-0" />
                                    <span className="opacity-70 text-[10px]">Rama:</span>
                                    <strong className="text-foreground font-semibold truncate">{selectedBranch || "default"}</strong>
                                </span>
                                {branches.length > 1 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:text-primary gap-0.5 shrink-0 font-medium">
                                                <span>Cambiar</span>
                                                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 max-h-60 overflow-y-auto">
                                            <DropdownMenuLabel className="text-[10px]">Ramas del repositorio</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {branches.map(b => (
                                                <DropdownMenuItem
                                                    key={b}
                                                    onClick={() => handleSelectBranch(b)}
                                                    className={cn("text-xs font-mono flex items-center justify-between cursor-pointer", selectedBranch === b && "bg-accent font-bold")}
                                                >
                                                    <span className="truncate">{b}</span>
                                                    {selectedBranch === b && <Check className="h-3 w-3 text-primary shrink-0" />}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )}

                        {fileViewMode !== "order" && (
                            /* Search Input & Re-scan Button */
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                    <Search className="h-[14px] w-[14px] absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder={fileViewMode === "explorer" ? "Buscar en todo el repositorio..." : "Buscar archivo requerido..."}
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
                                    onClick={() => handleScanRepo()}
                                    className="h-8 px-2.5 text-xs gap-1.5 shrink-0"
                                    title="Volver a escanear archivos del repositorio"
                                >
                                    {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
                                    <span>Re-escanear</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Left Column Body: Order View OR File List / Tree */}
                    {fileViewMode === "order" ? (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-2.5 border-b bg-muted/20 text-[11px] text-muted-foreground flex items-center justify-between shrink-0">
                                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    Orden de Evaluación IA
                                </span>
                                <span className="font-mono font-bold text-xs text-primary">
                                    {selectedFiles.length} {selectedFiles.length === 1 ? 'archivo' : 'archivos'}
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 scrollbar-thin">
                                {selectedFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground space-y-2">
                                        <ListOrdered className="h-8 w-8 text-muted-foreground/40" />
                                        <p className="font-semibold text-xs text-foreground">Sin archivos seleccionados</p>
                                        <p className="text-[11px] max-w-xs leading-relaxed">
                                            Selecciona archivos desde <strong>{configuredPathsList.length > 0 ? "Requeridos o Explorar" : "Explorar"}</strong> para definir el orden secuencial en que la IA los evaluará.
                                        </p>
                                        {foundConfiguredFiles.length > 0 && (
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-xs h-7 gap-1 mt-1 font-semibold"
                                                onClick={() => {
                                                    setSelectedFiles(foundConfiguredFiles);
                                                    if (foundConfiguredFiles.length > 0) {
                                                        handleLoadFilePreview(foundConfiguredFiles[0]);
                                                    }
                                                }}
                                            >
                                                Cargar requeridos ({foundConfiguredFiles.length})
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOrder}>
                                        <SortableContext items={selectedFiles} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-1.5 w-full min-w-0">
                                                {selectedFiles.map((filePath, index) => (
                                                    <SortableEvaluationFileItem
                                                        key={filePath}
                                                        id={filePath}
                                                        path={filePath}
                                                        index={index}
                                                        total={selectedFiles.length}
                                                        onMoveUp={handleMoveUp}
                                                        onMoveDown={handleMoveDown}
                                                        onRemove={handleRemoveSelectedFile}
                                                        onPreview={handleLoadFilePreview}
                                                        isPreviewing={previewFile === filePath}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>

                            <div className="p-2.5 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-between items-center shrink-0">
                                <span className="truncate">Arrastra o usa flechas para priorizar</span>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    disabled={selectedFiles.length === 0}
                                    onClick={() => setSelectedFiles([])}
                                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-30"
                                >
                                    Limpiar orden
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* File List / Tree */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs min-h-0 scrollbar-thin">
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
                                        const orderIndex = selectedFiles.indexOf(path);
                                        const isSelected = orderIndex !== -1;
                                        const isPreviewing = previewFile === path;
                                        const isPrimaryCode = PRIMARY_CODE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));

                                        return (
                                            <div
                                                key={path}
                                                onClick={() => handleLoadFilePreview(path)}
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
                                                            if (checked) {
                                                                setSelectedFiles(prev => [...prev, path]);
                                                                handleLoadFilePreview(path);
                                                            } else {
                                                                setSelectedFiles(prev => prev.filter(p => p !== path));
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {isSelected && (
                                                        <Badge 
                                                            variant="outline" 
                                                            className="h-4 min-w-4 px-1 text-[9px] font-mono font-bold bg-primary/10 text-primary border-primary/30 flex items-center justify-center shrink-0"
                                                            title={`Orden de evaluación: #${orderIndex + 1}`}
                                                        >
                                                            #{orderIndex + 1}
                                                        </Badge>
                                                    )}
                                                    {isPrimaryCode ? (
                                                        <FileCode className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    ) : (
                                                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    )}
                                                    <span 
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleLoadFilePreview(path);
                                                    }}
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
                                {missingConfiguredFiles.length > 0 && fileViewMode === "required" && (
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
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground font-mono">{selectedFiles.length}</span>
                                    <span>para IA</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {selectedFiles.length > 0 && (
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => setFileViewMode("order")}
                                            className="h-6 px-2 text-[10px] gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                                            title="Ajustar y definir orden de evaluación"
                                        >
                                            <ArrowUpDown className="h-3 w-3" />
                                            Ordenar ({selectedFiles.length})
                                        </Button>
                                    )}
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setSelectedFiles([])}
                                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                                    >
                                        Desmarcar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`flex flex-col h-full min-h-0 overflow-hidden transition-all ${
                    fullscreenSection === 'content' 
                        ? "lg:col-span-12" 
                        : fullscreenSection === 'explorer' 
                        ? "hidden" 
                        : "lg:col-span-8"
                }`}>
                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "statement" | "preview" | "ai_report" | "teacher_grade" | "mcp_chat" | "git_audit")} className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 border-b border-border/60 shrink-0 overflow-x-auto scrollbar-none">
                            <TabsList className={cn(
                                "flex w-max lg:w-full h-8 sm:h-9 lg:h-10 !bg-transparent !p-0 !border-0 !rounded-none !shadow-none gap-0.5 lg:gap-0",
                                isTeacherGradingEnabled ? "lg:grid lg:grid-cols-6" : "lg:grid lg:grid-cols-5"
                            )}>
                                <TabsTrigger 
                                    value="statement" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Enunciado</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="ai_report" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Evaluación IA</span>
                                    {isTeacherGradingEnabled && aiGrade > 0 && (
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold ml-0.5 shrink-0">
                                            {aiGrade.toFixed(1)}
                                        </Badge>
                                    )}
                                </TabsTrigger>

                                {isTeacherGradingEnabled && (
                                    <TabsTrigger 
                                        value="teacher_grade" 
                                        className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                    >
                                        <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                        <span className="truncate">Evaluación Docente</span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold ml-0.5 shrink-0">
                                            {checklistScore.toFixed(1)}
                                        </Badge>
                                    </TabsTrigger>
                                )}

                                <TabsTrigger 
                                    value="preview" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Code2 className="h-3.5 w-3.5 text-blue-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Código</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="mcp_chat" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <Bot className="h-3.5 w-3.5 text-sky-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Inspector</span>
                                </TabsTrigger>

                                <TabsTrigger 
                                    value="git_audit" 
                                    className="group relative flex items-center justify-center gap-1.5 h-full px-2.5 sm:px-3 lg:px-1 text-[11px] sm:text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none cursor-pointer shrink-0 lg:shrink whitespace-nowrap lg:whitespace-normal truncate"
                                >
                                    <GitCommitVertical className="h-3.5 w-3.5 text-indigo-500 shrink-0 transition-colors group-data-[state=active]:text-primary" />
                                    <span className="truncate">Auditoría Git</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab 0: Activity Statement / Rubric Instructions */}
                        <TabsContent value="statement" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
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
                        <TabsContent value="preview" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
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
                        <TabsContent value="ai_report" className="mt-1 flex-1 min-h-0 overflow-y-auto">
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
                                        {submission && (
                                            <ExportFeedbackButtons
                                                activity={activity}
                                                submission={submission}
                                                studentName={student?.name || student?.email || "Estudiante"}
                                                studentEmail={student?.email}
                                                size="sm"
                                            />
                                        )}
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

                                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3" style={{ zoom: textZoom }}>
                                    {isTeacherGradingEnabled && (
                                        <div className="p-3 rounded-xl border border-primary/20 bg-muted/20 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold flex items-center gap-1.5 text-foreground">
                                                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                    Ponderación: {aiWeight}% IA + {checklistWeight}% Sustentación Docente
                                                </span>
                                                <span className="text-[11px] font-mono">
                                                    Nota Final: <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{combinedFinalScore.toFixed(1)} / 5.0</strong>
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                                <div className="p-2 rounded-lg bg-purple-500/[0.06] border border-purple-500/20 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                        <Sparkles className="h-3 w-3" /> Evaluación IA ({aiWeight}%)
                                                    </span>
                                                    <span className="font-mono font-black">{aiGrade.toFixed(1)}</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-blue-500/[0.06] border border-blue-500/20 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                        <UserCheck className="h-3 w-3" /> Sustentación ({checklistWeight}%)
                                                    </span>
                                                    <span className="font-mono font-black">{checklistScore.toFixed(1)}</span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Nota Final Ponderada
                                                    </span>
                                                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">{combinedFinalScore.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {aiFeedbackInput ? (
                                        <FeedbackViewer 
                                            feedback={aiFeedbackInput} 
                                            repoUrl={effectiveRepoUrl || submission.url}
                                            configuredPaths={activity.filePaths}
                                        />
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
                        {isTeacherGradingEnabled && (
                        <TabsContent value="teacher_grade" className="mt-1 flex-1 min-h-0 overflow-y-auto">
                            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 h-full overflow-y-auto">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-sm">Asignación de Nota y Observaciones Docentes</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Revisa la calificación y agrega observaciones personalizadas para {student?.name || "el estudiante"}.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        {submission && (
                                            <ExportFeedbackButtons
                                                activity={activity}
                                                submission={submission}
                                                studentName={student?.name || student?.email || "Estudiante"}
                                                studentEmail={student?.email}
                                                size="sm"
                                            />
                                        )}
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
                                                        const allSabe: Record<string, number> = {};
                                                        checklistData.forEach((c: any) => { allSabe[c.id] = 1.0; });
                                                        handleUpdateCriteriaLevels(allSabe);
                                                    }}
                                                    className="text-primary hover:underline cursor-pointer"
                                                >
                                                    Todos Sabe (100%)
                                                </button>
                                                <span>•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleUpdateCriteriaLevels({});
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
                                                                            const isCurrentSelected = currentFactor === lvl.factor;
                                                                            const nextLevels = {
                                                                                ...criteriaLevels,
                                                                                [crit.id]: isCurrentSelected ? undefined : lvl.factor
                                                                            };
                                                                            handleUpdateCriteriaLevels(nextLevels);
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

                                                            const combined = calculateCombinedFinalGrade(aiGrade, num, aiWeight, checklistWeight);
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
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="grade-input" className="text-xs font-semibold">Nota Final (0.0 - 5.0)</Label>
                                            {checklistConfig && (
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                                                    Ponderada automática: {aiWeight}% IA + {checklistWeight}% Sustentación
                                                </span>
                                            )}
                                        </div>
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
                                            {checklistConfig 
                                                ? (submission?.grade !== null && submission?.grade !== undefined 
                                                    ? `Actualizar Nota (${combinedFinalScore.toFixed(1)})` 
                                                    : `Guardar Nota (${combinedFinalScore.toFixed(1)})`)
                                                : (submission?.grade !== null && submission?.grade !== undefined 
                                                    ? "Actualizar Nota" 
                                                    : "Guardar Nota")
                                            }
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
                        )}

                        {/* Tab 4: GitHub MCP Inspector */}
                        <TabsContent value="mcp_chat" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                            {submission?.url ? (
                                <GitHubRepoChatInspector
                                    repoUrl={effectiveRepoUrl || submission.url}
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

                        {/* Tab 5: GitHub Repo Audit */}
                        <TabsContent value="git_audit" className="mt-1 flex-1 min-h-0 overflow-hidden flex flex-col h-full">
                            {submission?.url ? (
                                <div className="rounded-xl border bg-card text-card-foreground shadow-xs overflow-hidden flex flex-col h-full flex-1 min-h-0">
                                    <GithubRepoAudit
                                        repoUrl={effectiveRepoUrl || submission.url}
                                        activityId={activity?.id}
                                        isFullscreen={fullscreenSection === "content"}
                                        onToggleFullscreen={() => setFullscreenSection(prev => prev === "content" ? "none" : "content")}
                                    />
                                </div>
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
            <Dialog open={isAIGradingDialogOpen} onOpenChange={(open) => {
                if (!isEvaluating) setIsAIGradingDialogOpen(open);
            }}>
                <DialogContent className="sm:max-w-xl md:max-w-2xl w-full max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
                            Evaluación con IA (Gemini)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Se analizarán los <strong>{selectedFiles.length} archivos</strong> seleccionados frente a la rúbrica de la actividad.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 flex-1 min-h-0 overflow-y-auto pr-1 min-w-0">
                        <div className="space-y-2 min-w-0">
                            <Label className="text-xs font-semibold">Nivel de Exigencia</Label>
                            <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                        </div>

                        {/* Ordered Evaluation Files List */}
                        <div className="space-y-2 min-w-0">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <ListOrdered className="h-3.5 w-3.5 text-primary" />
                                    Archivos y Orden de Evaluación ({selectedFiles.length})
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Arrastra o usa flechas
                                </span>
                            </div>
                            <div className="max-h-44 overflow-y-auto rounded-xl border p-1.5 bg-muted/20 space-y-1 scrollbar-thin min-w-0">
                                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOrder}>
                                    <SortableContext items={selectedFiles} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-col gap-1 w-full min-w-0">
                                            {selectedFiles.map((filePath, index) => (
                                                <SortableEvaluationFileItem
                                                    key={filePath}
                                                    id={filePath}
                                                    path={filePath}
                                                    index={index}
                                                    total={selectedFiles.length}
                                                    onMoveUp={handleMoveUp}
                                                    onMoveDown={handleMoveDown}
                                                    onRemove={handleRemoveSelectedFile}
                                                    onPreview={handleLoadFilePreview}
                                                    isPreviewing={previewFile === filePath}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                La IA evaluará los archivos en este orden secuencial, acumulando el análisis de cada uno para aplicar la rúbrica.
                            </p>
                        </div>

                        {/* Progress logs stream console */}
                        {gradingLogs.length > 0 && (
                            <div className="space-y-2 pt-2 border-t min-w-0">
                                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                                    <span className="flex items-center gap-1.5 font-bold">
                                        {isEvaluating && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />}
                                        Progreso de IA
                                    </span>
                                    <span>{gradingLogs.length} eventos</span>
                                </div>
                                <div 
                                    ref={logRef}
                                    className="max-h-40 overflow-y-auto overflow-x-hidden bg-slate-950 text-slate-300 font-mono text-[10.5px] p-2.5 rounded-lg border border-slate-800 space-y-1 w-full min-w-0 select-text"
                                >
                                    {gradingLogs.map((log, index) => (
                                        <div key={index} className="border-b border-slate-800/50 pb-0.5 break-all whitespace-pre-wrap leading-relaxed">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-2 border-t">
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
