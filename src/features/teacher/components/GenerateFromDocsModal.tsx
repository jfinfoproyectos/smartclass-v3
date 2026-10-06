"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Sparkles, BookOpen, Code2, Type, FileText, CheckCircle2, 
    Trash2, ArrowLeft, Loader2, Check, Search, Layers, Sliders, 
    ChevronDown, ChevronRight, AlertCircle, RefreshCw, Folder, HelpCircle,
    Plus, Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
    getEvaluationGroupDocsAction, 
    generateQuestionsFromDocAction, 
    saveBatchQuestionsAction 
} from "@/features/teacher/actions/evaluationActions";
import MDEditor from "@uiw/react-md-editor";

interface PageItem {
    id: string;
    title: string;
    slug: string;
    category?: string | null;
    order: number;
}

interface DocProjectItem {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    description?: string | null;
    pages: PageItem[];
}

interface GroupItem {
    courseId: string;
    courseTitle: string;
    isDirectlyAssigned: boolean;
    docProjects: DocProjectItem[];
}

interface GeneratedQuestion {
    type: "Code" | "Text";
    language?: string;
    text: string;
    referenceAnswer: string;
}

interface GenerateFromDocsModalProps {
    isOpen: boolean;
    onClose: () => void;
    evaluationId: string;
    evaluationTitle: string;
    userModelName?: string;
    onInsertIntoEditor?: (question: GeneratedQuestion) => void;
}

export function GenerateFromDocsModal({
    isOpen,
    onClose,
    evaluationId,
    evaluationTitle,
    userModelName = "IA",
    onInsertIntoEditor
}: GenerateFromDocsModalProps) {
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedDocId, setSelectedDocId] = useState<string>("");
    const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
    const [searchFileQuery, setSearchFileQuery] = useState("");

    // Configuration state
    const [questionTypeMode, setQuestionTypeMode] = useState<"both" | "Code" | "Text">("both");
    const [textCount, setTextCount] = useState<number>(1);
    const [codeCount, setCodeCount] = useState<number>(1);
    const [language, setLanguage] = useState<string>("java");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
    const [includeBoilerplate, setIncludeBoilerplate] = useState<boolean>(true);
    const [includeTestCases, setIncludeTestCases] = useState<boolean>(false);
    const [customPrompt, setCustomPrompt] = useState<string>("");

    // Generation & Review State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
    const [step, setStep] = useState<"config" | "review">("config");
    const [expandedAnswerIndices, setExpandedAnswerIndices] = useState<Record<number, boolean>>({});

    // Load documentation when modal opens
    useEffect(() => {
        if (!isOpen) {
            setStep("config");
            setGeneratedQuestions([]);
            return;
        }

        async function loadDocs() {
            setIsLoadingData(true);
            try {
                const res = await getEvaluationGroupDocsAction(evaluationId);
                if (res.success && res.data) {
                    setGroups(res.data);
                    
                    // Pre-select group
                    const directGroup = res.data.find(g => g.isDirectlyAssigned && g.docProjects.length > 0) || res.data[0];
                    if (directGroup) {
                        setSelectedCourseId(directGroup.courseId);
                        if (directGroup.docProjects.length > 0) {
                            setSelectedDocId(directGroup.docProjects[0].id);
                            // Auto-select first 3 pages by default if available
                            const firstPages = directGroup.docProjects[0].pages.slice(0, 3).map(p => p.id);
                            setSelectedPageIds(firstPages);
                        }
                    }
                } else {
                    toast.error(res.error || "No se pudieron cargar las documentaciones del grupo");
                }
            } catch (err: any) {
                console.error("Error loading group docs:", err);
                toast.error("Error al cargar documentaciones");
            } finally {
                setIsLoadingData(false);
            }
        }

        loadDocs();
    }, [isOpen, evaluationId]);

    // Current active group and documentation
    const activeGroup = useMemo(() => {
        return groups.find(g => g.courseId === selectedCourseId) || groups[0];
    }, [groups, selectedCourseId]);

    const activeDocProject = useMemo(() => {
        if (!activeGroup) return null;
        return activeGroup.docProjects.find(d => d.id === selectedDocId) || activeGroup.docProjects[0] || null;
    }, [activeGroup, selectedDocId]);

    // Filter pages based on search
    const filteredPages = useMemo(() => {
        if (!activeDocProject) return [];
        if (!searchFileQuery.trim()) return activeDocProject.pages;
        const q = searchFileQuery.toLowerCase();
        return activeDocProject.pages.filter(
            p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
        );
    }, [activeDocProject, searchFileQuery]);

    // Handle course change
    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        const group = groups.find(g => g.courseId === courseId);
        if (group && group.docProjects.length > 0) {
            setSelectedDocId(group.docProjects[0].id);
            setSelectedPageIds(group.docProjects[0].pages.slice(0, 3).map(p => p.id));
        } else {
            setSelectedDocId("");
            setSelectedPageIds([]);
        }
    };

    // Handle doc change
    const handleDocChange = (docId: string) => {
        setSelectedDocId(docId);
        if (activeGroup) {
            const doc = activeGroup.docProjects.find(d => d.id === docId);
            if (doc) {
                setSelectedPageIds(doc.pages.slice(0, 3).map(p => p.id));
            } else {
                setSelectedPageIds([]);
            }
        }
    };

    // Toggle single page selection
    const togglePageSelection = (pageId: string) => {
        setSelectedPageIds(prev => 
            prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
        );
    };

    // Select all / Deselect all
    const selectAllPages = () => {
        if (!activeDocProject) return;
        setSelectedPageIds(activeDocProject.pages.map(p => p.id));
    };

    const deselectAllPages = () => {
        setSelectedPageIds([]);
    };

    // Trigger AI Generation
    const handleGenerate = async () => {
        if (!activeDocProject) {
            toast.error("Selecciona una documentación.");
            return;
        }
        if (selectedPageIds.length === 0) {
            toast.error("Selecciona al menos un archivo de la documentación.");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await generateQuestionsFromDocAction(
                evaluationId,
                activeDocProject.id,
                selectedPageIds,
                {
                    type: questionTypeMode,
                    codeCount: questionTypeMode === "Text" ? 0 : codeCount,
                    textCount: questionTypeMode === "Code" ? 0 : textCount,
                    difficulty,
                    language,
                    customPrompt,
                    includeBoilerplate,
                    includeTestCases,
                }
            );

            if (!res.success || !res.data) {
                toast.error(res.error || "No se pudieron generar las preguntas.");
                return;
            }

            setGeneratedQuestions(res.data);
            setStep("review");
            toast.success(`¡${res.data.length} preguntas generadas! Revisa y confirma para añadirlas.`);
        } catch (error: any) {
            console.error("Error during generation:", error);
            toast.error(error.message || "Error al generar preguntas.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Save batch of questions to the evaluation
    const handleSaveBatch = async () => {
        if (generatedQuestions.length === 0) {
            toast.error("No hay preguntas para guardar.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await saveBatchQuestionsAction(evaluationId, generatedQuestions);
            if (res.success) {
                toast.success(`¡${res.count} preguntas añadidas a la evaluación exitosamente!`);
                onClose();
            } else {
                toast.error(res.error || "Error al guardar las preguntas.");
            }
        } catch (error: any) {
            console.error("Error saving batch:", error);
            toast.error(error.message || "Error al guardar preguntas.");
        } finally {
            setIsSaving(false);
        }
    };

    // Remove single generated question from review list
    const handleRemoveQuestion = (index: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const toggleExpandAnswer = (index: number) => {
        setExpandedAnswerIndices(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const totalQuestionsToGenerate = questionTypeMode === "both" 
        ? textCount + codeCount 
        : questionTypeMode === "Code" ? codeCount : textCount;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isGenerating && !isSaving) onClose(); }}>
            <DialogContent className="sm:max-w-[850px] max-h-[92vh] p-0 overflow-hidden flex flex-col bg-background border shadow-2xl rounded-2xl">
                {/* Header */}
                <div className="p-5 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            {step === "config" 
                                ? "Generar Preguntas desde Documentación del Grupo" 
                                : `Revisar Preguntas Generadas (${generatedQuestions.length})`
                            }
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            {step === "config"
                                ? `Crea preguntas de código y texto basadas en la documentación asignada a tus grupos.`
                                : `Revisa los enunciados y respuestas modelo antes de agregarlos a la evaluación.`
                            }
                        </DialogDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold uppercase tracking-wider">
                        {userModelName}
                    </Badge>
                </div>

                {/* Content body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
                    {isLoadingData ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Cargando documentaciones del grupo...</p>
                        </div>
                    ) : groups.length === 0 || !groups.some(g => g.docProjects.length > 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-base">No hay documentaciones asignadas al grupo</h3>
                            <p className="text-xs text-muted-foreground max-w-md">
                                Esta evaluación no tiene un grupo con documentaciones vinculadas, o el grupo aún no cuenta con módulos de documentación asignados. Puedes asignar documentación desde la sección de cursos.
                            </p>
                        </div>
                    ) : step === "config" ? (
                        <div className="flex flex-col gap-6">
                            {/* 1. Group & Documentation Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Group selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-primary" /> 1. Grupo / Curso
                                    </Label>
                                    <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                                        <SelectTrigger className="text-xs h-9 bg-muted/20">
                                            <SelectValue placeholder="Selecciona un grupo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map(g => (
                                                <SelectItem key={g.courseId} value={g.courseId}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{g.courseTitle}</span>
                                                        {g.isDirectlyAssigned && (
                                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                                                                Asignado
                                                            </span>
                                                        )}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Documentation selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5 text-primary" /> 2. Documentación Asignada
                                    </Label>
                                    {activeGroup && activeGroup.docProjects.length > 0 ? (
                                        <Select value={selectedDocId} onValueChange={handleDocChange}>
                                            <SelectTrigger className="text-xs h-9 bg-muted/20">
                                                <SelectValue placeholder="Selecciona una documentación" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeGroup.docProjects.map(doc => (
                                                    <SelectItem key={doc.id} value={doc.id}>
                                                        {doc.name} ({doc.pages.length} archivos)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/10">
                                            Este grupo no tiene documentaciones asignadas.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. File / Pages Selection from Documentation */}
                            {activeDocProject && (
                                <div className="space-y-2.5 border rounded-xl p-3.5 bg-muted/10">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-xs font-bold flex items-center gap-1.5">
                                                <Folder className="h-3.5 w-3.5 text-primary" /> 3. Archivos de la Documentación a Evaluar
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Seleccionados: <span className="font-bold text-foreground">{selectedPageIds.length}</span> de {activeDocProject.pages.length} archivos
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <div className="relative flex-1 sm:w-44">
                                                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                                <Input 
                                                    placeholder="Filtrar archivos..." 
                                                    value={searchFileQuery}
                                                    onChange={e => setSearchFileQuery(e.target.value)}
                                                    className="h-7 text-xs pl-7"
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-7 text-[10px] px-2 font-semibold"
                                                onClick={selectAllPages}
                                            >
                                                Todos
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px] px-2"
                                                onClick={deselectAllPages}
                                            >
                                                Ninguno
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Pages List Box */}
                                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border rounded-lg p-2 bg-background custom-scrollbar">
                                        {filteredPages.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-muted-foreground">
                                                No se encontraron archivos con ese criterio de búsqueda.
                                            </div>
                                        ) : (
                                            filteredPages.map(page => {
                                                const isSelected = selectedPageIds.includes(page.id);
                                                return (
                                                    <div
                                                        key={page.id}
                                                        onClick={() => togglePageSelection(page.id)}
                                                        className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer border transition-all ${
                                                            isSelected 
                                                                ? "bg-primary/5 border-primary/30 text-foreground font-medium" 
                                                                : "bg-muted/10 border-transparent hover:bg-muted/30 text-muted-foreground"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                                                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                                            }`}>
                                                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                                            </div>
                                                            <div className="truncate">
                                                                <span className="font-semibold text-foreground">{page.title}</span>
                                                                <span className="text-[10px] text-muted-foreground ml-2 truncate">({page.slug})</span>
                                                            </div>
                                                        </div>
                                                        {page.category && (
                                                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold flex-shrink-0">
                                                                {page.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 3. Question Type & Quantities Configuration */}
                            <div className="space-y-4 border rounded-xl p-4 bg-muted/10">
                                <Label className="text-xs font-bold flex items-center gap-1.5">
                                    <Sliders className="h-3.5 w-3.5 text-primary" /> 4. Configuración de Preguntas
                                </Label>

                                {/* Question Mode Selector: Both, Code only, Text only */}
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-semibold text-muted-foreground">Tipo de preguntas a generar:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setQuestionTypeMode("both")}
                                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                                                questionTypeMode === "both"
                                                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/30"
                                                    : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 text-xs font-extrabold">
                                                <Type className="h-3.5 w-3.5 text-blue-500" /> + <Code2 className="h-3.5 w-3.5 text-orange-500" />
                                            </div>
                                            <span className="text-xs font-bold">Ambas (Código y Texto)</span>
                                            <span className="text-[10px] text-muted-foreground">Preguntas teóricas y prácticas</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setQuestionTypeMode("Code")}
                                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                                                questionTypeMode === "Code"
                                                    ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-xs ring-1 ring-orange-500/30"
                                                    : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted/30"
                                            }`}
                                        >
                                            <Code2 className="h-4 w-4 text-orange-500" />
                                            <span className="text-xs font-bold">Solo Código</span>
                                            <span className="text-[10px] text-muted-foreground">Ejercicios prácticos de programación</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setQuestionTypeMode("Text")}
                                            className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                                                questionTypeMode === "Text"
                                                    ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-1 ring-blue-500/30"
                                                    : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted/30"
                                            }`}
                                        >
                                            <Type className="h-4 w-4 text-blue-500" />
                                            <span className="text-xs font-bold">Solo Texto</span>
                                            <span className="text-[10px] text-muted-foreground">Conceptos y razonamiento</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Quantities Configurator */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {(questionTypeMode === "both" || questionTypeMode === "Text") && (
                                        <div className="flex items-center justify-between p-3 border rounded-xl bg-background">
                                            <div className="flex items-center gap-2">
                                                <Type className="h-4 w-4 text-blue-500" />
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Preguntas de Texto</p>
                                                    <p className="text-[10px] text-muted-foreground">Teoría y conceptos</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setTextCount(c => Math.max(1, c - 1))}
                                                    disabled={textCount <= 1}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center font-bold text-xs">{textCount}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setTextCount(c => Math.min(5, c + 1))}
                                                    disabled={textCount >= 5}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {(questionTypeMode === "both" || questionTypeMode === "Code") && (
                                        <div className="flex items-center justify-between p-3 border rounded-xl bg-background">
                                            <div className="flex items-center gap-2">
                                                <Code2 className="h-4 w-4 text-orange-500" />
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Preguntas de Código</p>
                                                    <p className="text-[10px] text-muted-foreground">Ejercicios de programación</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setCodeCount(c => Math.max(1, c - 1))}
                                                    disabled={codeCount <= 1}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center font-bold text-xs">{codeCount}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setCodeCount(c => Math.min(5, c + 1))}
                                                    disabled={codeCount >= 5}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Language Selector (for code questions) */}
                                {(questionTypeMode === "both" || questionTypeMode === "Code") && (
                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-xs font-bold text-foreground">Lenguaje de Programación para Código:</Label>
                                        <div className="flex flex-wrap gap-1.5 select-none">
                                            {["java", "javascript", "typescript", "python", "csharp", "cpp", "arduino", "sql", "html"].map((lang) => (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => setLanguage(lang)}
                                                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all capitalize ${
                                                        language === lang 
                                                            ? "bg-primary/10 text-primary border-primary shadow-xs" 
                                                            : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted/20"
                                                    }`}
                                                >
                                                    {lang === "cpp" ? "C++" : lang === "csharp" ? "C#" : lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Difficulty & Pedagogical Switches */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Nivel de Dificultad:</Label>
                                        <div className="flex bg-muted/40 p-1 rounded-xl border border-muted-foreground/10 gap-1 select-none">
                                            {["easy", "medium", "hard", "expert"].map((diff) => (
                                                <button
                                                    key={diff}
                                                    type="button"
                                                    onClick={() => setDifficulty(diff as any)}
                                                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                                                        difficulty === diff 
                                                            ? "bg-background text-primary shadow-xs" 
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                                    }`}
                                                >
                                                    {diff === "easy" ? "Fácil" : diff === "medium" ? "Medio" : diff === "hard" ? "Difícil" : "Experto"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 flex flex-col justify-center">
                                        {(questionTypeMode === "both" || questionTypeMode === "Code") && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-foreground font-semibold">Incluir plantilla / código base (Boilerplate)</span>
                                                    <Switch checked={includeBoilerplate} onCheckedChange={setIncludeBoilerplate} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-foreground font-semibold">Incluir casos de prueba de ejemplo</span>
                                                    <Switch checked={includeTestCases} onCheckedChange={setIncludeTestCases} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Teacher Prompt (optional) */}
                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                        <span>Indicaciones adicionales (Opcional):</span>
                                        <span className="text-[10px] text-muted-foreground font-normal">Ajusta el enfoque o los temas específicos</span>
                                    </Label>
                                    <Textarea
                                        className="h-16 text-xs bg-background resize-none border-muted-foreground/20"
                                        placeholder="Ej: 'Enfócate en la sobrecarga de constructores y clases abstractas vistas en la lección 2'..."
                                        value={customPrompt}
                                        onChange={e => setCustomPrompt(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step: REVIEW & CONFIRM */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border">
                                <div>
                                    <p className="text-xs font-bold text-foreground">
                                        {generatedQuestions.length} preguntas listas para incorporar
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Basadas en {activeDocProject?.name} ({selectedPageIds.length} archivos analizados)
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs gap-1 font-semibold"
                                    onClick={() => setStep("config")}
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Reconfigurar
                                </Button>
                            </div>

                            {/* List of generated questions */}
                            <div className="space-y-4">
                                {generatedQuestions.map((q, idx) => (
                                    <div key={idx} className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-xs text-primary">#{idx + 1}</span>
                                                <Badge className={`text-[10px] font-bold uppercase ${
                                                    q.type === "Text" 
                                                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                                                        : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                                }`}>
                                                    {q.type === "Text" ? (
                                                        <span className="flex items-center gap-1"><Type className="h-3 w-3" /> Texto</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1"><Code2 className="h-3 w-3" /> Código ({q.language || language})</span>
                                                    )}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {onInsertIntoEditor && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[10px] px-2 font-bold text-primary border-primary/30 hover:bg-primary/10"
                                                        onClick={() => {
                                                            onInsertIntoEditor(q);
                                                            onClose();
                                                        }}
                                                    >
                                                        Cargar en Editor
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    title="Eliminar esta pregunta"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Statement */}
                                        <div className="text-xs bg-muted/10 p-3 rounded-lg border">
                                            <MDEditor.Markdown source={q.text} />
                                        </div>

                                        {/* Reference Answer Accordion */}
                                        {q.referenceAnswer && (
                                            <div className="border rounded-lg p-2.5 bg-muted/20">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpandAnswer(idx)}
                                                    className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground text-left"
                                                >
                                                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Respuesta / Solución de Referencia
                                                    </span>
                                                    {expandedAnswerIndices[idx] ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                                {expandedAnswerIndices[idx] && (
                                                    <div className="mt-2 text-xs font-mono bg-background p-2.5 rounded border whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                                        {q.referenceAnswer}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={onClose}
                        disabled={isGenerating || isSaving}
                        className="text-xs font-semibold px-4"
                    >
                        Cancelar
                    </Button>

                    {step === "config" ? (
                        <Button
                            type="button"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-5 rounded-xl flex items-center gap-2 shadow-md transition-all"
                            onClick={handleGenerate}
                            disabled={isGenerating || !activeDocProject || selectedPageIds.length === 0}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Analizando y Generando...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Generar {totalQuestionsToGenerate} Preguntas</span>
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setStep("config")}
                                disabled={isSaving}
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Reconfigurar
                            </Button>
                            <Button
                                type="button"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 rounded-xl flex items-center gap-2 shadow-md transition-all"
                                onClick={handleSaveBatch}
                                disabled={isSaving || generatedQuestions.length === 0}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Guardando Preguntas...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Agregar {generatedQuestions.length} a la Evaluación</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
