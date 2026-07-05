"use client";

import { useState, useRef, forwardRef, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Edit, AlertCircle, Type, Code2, ArrowLeft, Loader2, Zap, MessageSquare, Sparkles, CheckCircle2, XCircle, Info, Eye, GripVertical, Cpu, Bug, RefreshCw, Box, BookOpen, Terminal, Lightbulb, Check } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createQuestionAction, deleteQuestionAction, updateQuestionAction, testQuestionWithAIAction, generateQuestionAction, generateAnswerAction, updateQuestionsOrderAction } from "@/features/teacher/actions/evaluationActions";

// Text Editor
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Code Editor
import Editor from "@monaco-editor/react";

export function QuestionManager({ evaluation }: { evaluation: any }) {
    const [isMounted, setIsMounted] = useState(false);
    const modelName = evaluation.userAIModel || "IA";
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState("");

    // Question Form State
    const [type, setType] = useState("Text"); // "Text" | "Code"
    const [language, setLanguage] = useState("javascript");
    const [text, setText] = useState("**Enunciado de la Pregunta**\n\nEscribe aquí...");
    const [codeValue, setCodeValue] = useState("// Escribe el código aquí...");
    const [referenceAnswer, setReferenceAnswer] = useState("");

    // AI Status
    const [testAnswer, setTestAnswer] = useState("");
    const [isTestingAI, setIsTestingAI] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<{ scoreContribution: number, feedback: string, isCorrect: boolean } | null>(null);
    const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
    const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [assistantPrompt, setAssistantPrompt] = useState("");

    // AI Config
    const [questionSize, setQuestionSize] = useState<"short" | "medium" | "long">("medium");
    const [questionOpenness, setQuestionOpenness] = useState<"concrete" | "balanced" | "open">("balanced");
    const [includeCode, setIncludeCode] = useState(false);
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
    const [bloomTaxonomy, setBloomTaxonomy] = useState<"remember" | "understand" | "apply" | "analyze" | "evaluate" | "create">("apply");
    const [includeBoilerplate, setIncludeBoilerplate] = useState(false);
    const [includeTestCases, setIncludeTestCases] = useState(false);
    const [activeTestTab, setActiveTestTab] = useState("test");

    // Edit mode state
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState("design");
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";
    const formRef = useRef<HTMLFormElement>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleOpenForm = (question?: any, index?: number) => {
        if (question) {
            setEditingQuestionId(question.id);
            setEditingQuestionIndex(index ?? null);
            setType(question.type);
            setLanguage(question.language || "javascript");
            setText(question.text);
            // No reset codeValue here to preserve what might be there, 
            // although Code questions should ideally have their content in 'text' or a specific field.
            // For now, let's just avoid hardcoding the instructional string if we are editing.
        } else {
            setEditingQuestionId(null);
            setEditingQuestionIndex(null);
            setType("Text");
            setLanguage("javascript");
            setText("**Enunciado de la Pregunta**\n\nEscribe aquí...");
            setCodeValue("// Escribe el código aquí...");
            setReferenceAnswer("");
        }
        if (question) {
            setReferenceAnswer(question.referenceAnswer || "");
        }
        setTestAnswer("");
        setAiTestResult(null);
        setActiveTab("design");
        setIsFormSheetOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormSheetOpen(false);
        setEditingQuestionId(null);
        setEditingQuestionIndex(null);
    };

    const handleTestWithAI = async () => {
        if (!text) return;
        setIsTestingAI(true);
        setAiTestResult(null);
        try {
            setActiveTestTab("result");
            const answerToTest = testAnswer || (type === "Code" ? codeValue : "");
            const res = await testQuestionWithAIAction(text, type, answerToTest, referenceAnswer);

            if (res && typeof res === "object" && "success" in res && !res.success) {
                setErrorModalMessage((res as any).error || "No se pudo realizar la evaluación");
                setErrorModalOpen(true);
                return;
            }

            const result = res && typeof res === "object" && "success" in res ? (res as any).data : res;
            setAiTestResult(result);
        } catch (error: any) {
            console.error("Error testing with AI:", error);
            setErrorModalMessage(error.message || "No se pudo realizar la evaluación");
            setErrorModalOpen(true);
        } finally {
            setIsTestingAI(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = evaluation.questions.findIndex((q: any) => q.id === active.id);
            const newIndex = evaluation.questions.findIndex((q: any) => q.id === over.id);

            const newQuestions = arrayMove(evaluation.questions, oldIndex, newIndex);
            const questionOrders = newQuestions.map((q: any, i) => ({
                id: q.id,
                order: i + 1
            }));

            try {
                await updateQuestionsOrderAction(evaluation.id, questionOrders);
            } catch (error) {
                console.error("Error al reordenar:", error);
            }
        }
    };

    const handleGenerateQuestion = async (styleModifier?: string) => {
        setIsGeneratingQuestion(true);
        try {
            const combinedPrompt = styleModifier
                ? `${styleModifier}${assistantPrompt ? ` Basado en: ${assistantPrompt}` : ""}`
                : assistantPrompt;

            const res = await generateQuestionAction(
                evaluation.title, type, language, combinedPrompt,
                questionSize, questionOpenness, includeCode,
                difficulty, bloomTaxonomy, includeBoilerplate, includeTestCases
            );

            if (res && typeof res === "object" && !res.success) {
                setErrorModalMessage(res.error || "No se pudo generar la pregunta");
                setErrorModalOpen(true);
                return;
            }

            const generatedText = (typeof res === "object" ? res.data : res) || "";
            setText(generatedText);
            setIsAssistantOpen(false);
            setAssistantPrompt("");
        } catch (error: any) {
            console.error("Error generating question:", error);
            setErrorModalMessage(error.message || "No se pudo generar la pregunta");
            setErrorModalOpen(true);
        } finally {
            setIsGeneratingQuestion(false);
        }
    };

    const handleGenerateAnswer = async (target: "test" | "reference" = "test") => {
        if (!text) return;
        setIsGeneratingAnswer(true);
        try {
            const res = await generateAnswerAction(text, type, language);

            if (res && typeof res === "object" && !res.success) {
                setErrorModalMessage(res.error || "No se pudo generar la respuesta");
                setErrorModalOpen(true);
                return;
            }

            const generatedAnswer = (typeof res === "object" ? res.data : res) || "";
            if (target === "reference") {
                setReferenceAnswer(generatedAnswer);
            } else {
                setTestAnswer(generatedAnswer);
            }
        } catch (error: any) {
            console.error("Error generating answer:", error);
            setErrorModalMessage(error.message || "No se pudo generar la respuesta");
            setErrorModalOpen(true);
        } finally {
            setIsGeneratingAnswer(false);
        }
    };

    if (!isMounted) return null;

    return (
        <div className="space-y-4">
            {/* --- Form Sheet for Creating/Editing --- */}
            <Sheet open={isFormSheetOpen} onOpenChange={setIsFormSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-full px-3 py-2 flex flex-col h-full bg-background [&>button]:hidden">
                    <SheetHeader className="sr-only">
                        <SheetTitle>
                            {editingQuestionId
                                ? `Editar Pregunta ${editingQuestionIndex !== null ? editingQuestionIndex + 1 : ''}`
                                : "Nueva Pregunta"
                            }
                        </SheetTitle>
                        <SheetDescription>Configura el enunciado y valida con IA la evaluación</SheetDescription>
                    </SheetHeader>
                    <div className="flex items-center justify-between flex-shrink-0 border-b pb-1.5 mb-2">
                        <div className="flex items-center gap-4 text-left">
                            <h2 className="text-base font-bold tracking-tight">
                                {editingQuestionId
                                    ? `Editar Pregunta ${editingQuestionIndex !== null ? editingQuestionIndex + 1 : ''}`
                                    : "Nueva Pregunta"
                                }
                            </h2>
                            <p className="text-muted-foreground text-xs leading-none border-l pl-3 hidden md:block">
                                Configura el enunciado y valida con IA la evaluación: <span className="font-semibold text-foreground/90">{evaluation.title}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                form="question-form"
                                type="submit"
                                size="sm"
                                className="h-7 px-3 font-bold text-xs"
                            >
                                {editingQuestionId ? "Guardar Cambios" : "Guardar Pregunta"}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCloseForm}>
                                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Volver
                            </Button>
                        </div>
                    </div>

                    <form
                        ref={formRef}
                        id="question-form"
                        action={async (formData) => {
                            if (editingQuestionId) {
                                await updateQuestionAction(formData);
                            } else {
                                await createQuestionAction(formData);
                            }
                            handleCloseForm();
                        }}
                        className="flex-1 flex flex-col gap-1.5 overflow-hidden"
                    >

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0">
                            {/* Left: Editor */}
                            <div className="flex flex-col gap-1.5 border p-2.5 rounded-lg bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between border-b pb-0.5 mb-0.5 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                                            <Edit className="h-4 w-4 text-primary" /> Diseño y Enunciado
                                        </h3>

                                        <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-[10px] gap-1 px-2 text-amber-600 hover:bg-amber-500/10 transition-all font-bold border border-amber-500/20"
                                                >
                                                    <Sparkles className="h-3 w-3" /> Asistente IA
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl">
                                                <div className="flex flex-col h-[520px]">
                                                    {/* Super clean header */}
                                                    <div className="p-5 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between">
                                                        <div>
                                                            <DialogTitle className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                                                                ✨ Creador de Preguntas Conversacional
                                                            </DialogTitle>
                                                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                                                Describe tu objetivo y la IA creará una pregunta lista para evaluar.
                                                            </DialogDescription>
                                                        </div>
                                                        <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">IA Activa</span>
                                                    </div>

                                                    {/* Minimalist conversational wizard form */}
                                                    <div className="flex-1 min-h-0 p-5 overflow-y-auto flex flex-col gap-5">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-foreground">1. ¿Qué deseas evaluar en esta pregunta?</Label>
                                                            <textarea
                                                                required
                                                                className="w-full h-24 rounded-xl border p-3.5 text-xs bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 resize-none transition-all outline-none leading-relaxed border-muted-foreground/20"
                                                                placeholder="Ej. 'Un problema de bucles anidados en Python para calcular números primos' o 'Teoría sobre los principios SOLID'..."
                                                                value={assistantPrompt}
                                                                onChange={(e) => setAssistantPrompt(e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Pill switches/buttons (instead of dropdown selects) */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Pill Row for Type */}
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-bold text-foreground">2. Tipo de evaluación</Label>
                                                                <div className="flex bg-muted/40 p-1 rounded-xl border border-muted-foreground/10 gap-1 select-none">
                                                                    {["Text", "Code"].map((t) => (
                                                                        <button
                                                                            key={t}
                                                                            type="button"
                                                                            onClick={() => setType(t)}
                                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${type === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                                                                        >
                                                                            {t === "Text" ? "Texto / Teoría" : "Código"}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Pill Row for Difficulty */}
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-bold text-foreground">3. Nivel de dificultad</Label>
                                                                <div className="flex bg-muted/40 p-1 rounded-xl border border-muted-foreground/10 gap-1 select-none">
                                                                    {["easy", "medium", "hard", "expert"].map((diff) => (
                                                                        <button
                                                                            key={diff}
                                                                            type="button"
                                                                            onClick={() => setDifficulty(diff as any)}
                                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${difficulty === diff ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                                                                        >
                                                                            {diff === "easy" ? "Fácil" : diff === "medium" ? "Medio" : diff === "hard" ? "Difícil" : "Experto"}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Inline Pill Row for Language, shown only if Code type is selected */}
                                                        {type === "Code" && (
                                                            <div className="space-y-2 border-t pt-3.5">
                                                                <Label className="text-xs font-bold text-foreground">4. Lenguaje de programación</Label>
                                                                <div className="flex flex-wrap gap-1.5 select-none">
                                                                    {["javascript", "typescript", "python", "java", "cpp", "csharp", "arduino", "sql", "html"].map((lang) => (
                                                                        <button
                                                                            key={lang}
                                                                            type="button"
                                                                            onClick={() => setLanguage(lang)}
                                                                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all capitalize ${language === lang ? "bg-primary/5 text-primary border-primary/40 shadow-sm" : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted/20"}`}
                                                                        >
                                                                            {lang === "cpp" ? "C++" : lang === "csharp" ? "C#" : lang}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Sleek bottom footer with two simple actions */}
                                                    <div className="p-4 border-t bg-muted/20 flex items-center justify-between flex-shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => setIsAssistantOpen(false)}
                                                            className="h-9 text-xs font-semibold px-4 rounded-xl hover:bg-muted/40 transition-all select-none"
                                                        >
                                                            Cancelar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            className="bg-amber-600 hover:bg-amber-700 hover:shadow-lg text-white font-extrabold h-9 text-xs px-5 rounded-xl flex items-center gap-2 transition-all duration-200 select-none shadow"
                                                            onClick={() => handleGenerateQuestion()}
                                                            disabled={isGeneratingQuestion || !assistantPrompt}
                                                        >
                                                            {isGeneratingQuestion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                            {isGeneratingQuestion ? "Construyendo Pregunta..." : "Generar Pregunta Inteligente"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[9px] uppercase font-bold text-muted-foreground">Modo:</Label>
                                            <Select value={type} onValueChange={setType}>
                                                <SelectTrigger className="h-7 text-[10px] w-24 bg-muted/30">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Text">Texto</SelectItem>
                                                    <SelectItem value="Code">Código</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {type === "Code" && (
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[9px] uppercase font-bold text-muted-foreground">Lg:</Label>
                                                <Select value={language} onValueChange={setLanguage}>
                                                    <SelectTrigger className="h-7 text-[10px] w-28 bg-muted/30">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                                        <SelectItem value="python">Python</SelectItem>
                                                        <SelectItem value="java">Java</SelectItem>
                                                        <SelectItem value="cpp">C++</SelectItem>
                                                        <SelectItem value="arduino">Arduino</SelectItem>
                                                        <SelectItem value="sql">SQL</SelectItem>
                                                        <SelectItem value="html">HTML/CSS</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col pt-1 min-h-0" data-color-mode={mode}>
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                                        <TabsList className="grid w-full grid-cols-2 h-8 flex-shrink-0 mb-1">
                                            <TabsTrigger value="design" className="text-xs font-bold uppercase gap-2">
                                                <Edit className="h-3 w-3" /> Diseño y Enunciado
                                            </TabsTrigger>
                                            <TabsTrigger value="reference" className="text-xs font-bold uppercase gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" /> Respuesta de Referencia
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="design" className="flex-1 flex flex-col overflow-hidden m-0 focus-visible:outline-none focus-visible:ring-0">
                                            <MDEditor
                                                value={text}
                                                onChange={(val) => setText(val || "")}
                                                height="100%"
                                                preview="edit"
                                                className="flex-1 border-none shadow-none"
                                            />
                                        </TabsContent>

                                        <TabsContent value="reference" className="flex-1 flex flex-col overflow-hidden m-0 focus-visible:outline-none focus-visible:ring-0">
                                            <div className="flex flex-col gap-2 h-full">
                                                <div className="flex items-center justify-between px-1">
                                                    <p className="text-[10px] text-muted-foreground italic">
                                                        Este es el "Gold Standard" que {modelName} usará para calificar.
                                                    </p>
                                                    <span className="text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                        {type === "Code" ? `Editor ${language}` : "Editor Texto"}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex-1 border rounded-md overflow-hidden bg-muted/5 group focus-within:border-primary/50 transition-colors">
                                                    {type === "Code" ? (
                                                        <Editor
                                                            height="100%"
                                                            language={language === "arduino" ? "cpp" : (language || "javascript")}
                                                            theme={mode === "dark" ? "vs-dark" : "light"}
                                                            value={referenceAnswer}
                                                            onChange={(val) => setReferenceAnswer(val || "")}
                                                            options={{ 
                                                                minimap: { enabled: false }, 
                                                                fontSize: 13, 
                                                                wordWrap: "on",
                                                                scrollBeyondLastLine: false,
                                                                stickyScroll: { enabled: false }
                                                            }}
                                                        />
                                                    ) : (
                                                        <textarea
                                                            className="w-full h-full p-4 text-sm bg-transparent focus:outline-none resize-none font-sans"
                                                            placeholder="Escribe aquí la respuesta ideal esperada..."
                                                            value={referenceAnswer}
                                                            onChange={(e) => setReferenceAnswer(e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] font-bold uppercase tracking-wider bg-primary/5 hover:bg-primary/10 border-primary/20"
                                                    onClick={() => handleGenerateAnswer("reference")}
                                                    disabled={isGeneratingAnswer || !text}
                                                >
                                                    {isGeneratingAnswer ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3 text-amber-500" />}
                                                     {isGeneratingAnswer ? "Generando..." : `Sugerir Respuesta Ideal con ${modelName}`}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </div>

                            {/* Right: Preview/Test */}
                            <div className="flex flex-col gap-1.5 border p-2.5 rounded-lg bg-card shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between border-b pb-0.5 mb-0.5 flex-shrink-0">
                                    <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight text-muted-foreground">
                                        <Sparkles className="h-4 w-4 text-amber-500" /> Validación IA
                                    </h3>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-xs font-bold"
                                        onClick={handleTestWithAI}
                                        disabled={isTestingAI || !text}
                                    >
                                        {isTestingAI ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                                        {isTestingAI ? "Analizando..." : `Probar con ${modelName}`}
                                    </Button>
                                </div>

                                <Tabs value={activeTestTab} onValueChange={setActiveTestTab} className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="grid w-full grid-cols-2 h-7 flex-shrink-0 mb-1">
                                        <TabsTrigger value="test" className="text-[10px] font-bold uppercase">Entrada</TabsTrigger>
                                        <TabsTrigger value="result" className="text-[10px] font-bold uppercase">Evaluación IA</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="test" className="flex-1 flex flex-col overflow-hidden m-0 pt-2 pb-0">
                                        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                                            {type === "Text" ? (
                                                <textarea
                                                    className="flex-1 w-full rounded-md border bg-muted/10 p-4 text-sm focus:outline-none resize-none"
                                                    placeholder="Escribe una respuesta para validar..."
                                                    value={testAnswer}
                                                    onChange={(e) => setTestAnswer(e.target.value)}
                                                />
                                            ) : (
                                                <div className="flex-1 border rounded-md overflow-hidden bg-background">
                                                    <Editor
                                                        height="100%"
                                                        language={language === "arduino" ? "cpp" : (language || "javascript")}
                                                        theme={mode === "dark" ? "vs-dark" : "light"}
                                                        value={testAnswer}
                                                        onChange={(val) => setTestAnswer(val || "")}
                                                        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false, stickyScroll: { enabled: false } }}
                                                    />
                                                </div>
                                            )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                                                    onClick={() => handleGenerateAnswer("test")}
                                                    disabled={isGeneratingAnswer || !text}
                                                >
                                                {isGeneratingAnswer ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3 text-amber-500" />}
                                                {isGeneratingAnswer ? "Generando..." : `Sugerir Respuesta Ideal con ${modelName}`}
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="result" className="flex-1 flex flex-col overflow-y-auto m-0 pt-2 pr-1">
                                        {aiTestResult ? (
                                            <div className={`p-4 rounded-lg border flex flex-col gap-3 ${aiTestResult.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className="flex items-center justify-between border-b pb-2">
                                                    <div className="flex items-center gap-2">
                                                        {aiTestResult.isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                                        <span className="text-xs font-black uppercase text-primary">{modelName} Score</span>
                                                    </div>
                                                    <span className="text-xl font-black text-primary">{aiTestResult.scoreContribution.toFixed(1)}/5.0</span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground italic">"{aiTestResult.feedback}"</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center opacity-40 border border-dashed rounded-lg">
                                                <Info className="h-6 w-6 mb-2" />
                                                <p className="text-[10px] text-center max-w-[150px]">Pulsa 'Probar con {modelName}' para analizar tu pregunta.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>

                        {/* Hidden Inputs moved to the end for better reliability */}
                        {editingQuestionId && <input type="hidden" name="questionId" value={editingQuestionId} />}
                        <input type="hidden" name="evaluationId" value={evaluation.id} />
                        <input type="hidden" name="text" value={text} />
                        <input type="hidden" name="type" value={type} />
                        <input type="hidden" name="language" value={language} />
                        <input type="hidden" name="referenceAnswer" value={referenceAnswer} />
                    </form>
                </SheetContent>
            </Sheet>

            {/* --- Main Contents: Table and Header --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Link href="/dashboard/teacher/evaluations">
                        <Button variant="link" className="p-0 h-auto text-muted-foreground mb-1 text-xs">
                            <ArrowLeft className="h-3 w-3 mr-1" /> Volver a Evaluaciones
                        </Button>
                    </Link>
                    <h2 className="text-xl font-bold tracking-tight">Preguntas de: {evaluation.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Pregunta
                    </Button>

                    <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> Vista Previa</Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-4xl p-6 flex flex-col h-full bg-background overflow-hidden">
                            <SheetHeader className="mb-4">
                                <SheetTitle>Vista Previa de Preguntas</SheetTitle>
                                <SheetDescription>Así verá el estudiante la evaluación.</SheetDescription>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2" data-color-mode={mode}>
                                {evaluation.questions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <Info className="h-10 w-10 mb-2" />
                                        <p className="text-sm">No hay preguntas creadas.</p>
                                    </div>
                                ) : (
                                    evaluation.questions.map((q: any, i: number) => (
                                        <div key={q.id} className="border p-5 rounded-lg bg-card shadow-sm space-y-4">
                                            <div className="flex justify-between items-center border-b pb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-lg text-primary">#{i + 1}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.type === 'Text' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                        {q.type} {q.type === 'Code' ? `(${q.language})` : ''}
                                                    </span>
                                                </div>
                                                <Button variant="secondary" size="sm" onClick={() => { setIsPreviewOpen(false); handleOpenForm(q, i); }}>
                                                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
                                                </Button>
                                            </div>
                                            <div className="p-1">
                                                <MDEditor.Markdown source={q.text} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <div className="w-full overflow-x-auto rounded-md border bg-card">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="w-12 text-center text-[10px] uppercase font-bold">Orden</TableHead>
                                <TableHead className="w-24 text-[10px] uppercase font-bold">Tipo</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Enunciado</TableHead>
                                <TableHead className="w-40 text-[10px] uppercase font-bold">Creado</TableHead>
                                <TableHead className="text-right text-[10px] uppercase font-bold w-24">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={evaluation.questions.map((q: any) => q.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {evaluation.questions.map((question: any, index: number) => (
                                    <SortableQuestionRow
                                        key={question.id}
                                        question={question}
                                        index={index}
                                        onEdit={() => handleOpenForm(question, index)}
                                        evaluationId={evaluation.id}
                                    />
                                ))}
                            </SortableContext>
                            {evaluation.questions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 opacity-50">
                                    <Info className="h-6 w-6" />
                                    <p className="text-xs uppercase tracking-widest">No hay preguntas en esta evaluación</p>
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    <DragOverlay adjustScale={true}>
                        {activeId ? (
                            <table className="w-full border-collapse">
                                <tbody>
                                    <QuestionRowUI
                                        question={evaluation.questions.find((q: any) => q.id === activeId)}
                                        index={evaluation.questions.findIndex((q: any) => q.id === activeId)}
                                        isOverlay={true}
                                    />
                                </tbody>
                            </table>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" /> Error en la IA
                        </DialogTitle>
                        <DialogDescription className="text-sm pt-2 text-foreground font-medium">
                            {errorModalMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setErrorModalOpen(false)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SortableQuestionRow({ question, index, onEdit, evaluationId }: { question: any, index: number, onEdit: () => void, evaluationId: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <QuestionRowUI
            ref={setNodeRef}
            style={style}
            question={question}
            index={index}
            onEdit={onEdit}
            evaluationId={evaluationId}
            attributes={attributes}
            listeners={listeners}
            isDragging={isDragging}
        />
    );
}

const QuestionRowUI = forwardRef<HTMLTableRowElement, any>(({
    question,
    index,
    onEdit,
    evaluationId,
    attributes,
    listeners,
    isDragging,
    isOverlay,
    style
}, ref) => {
    if (!question) return null;

    return (
        <TableRow
            ref={ref}
            style={style}
            className={`
                hover:bg-muted/5 transition-colors
                ${isDragging ? "bg-muted/50 border-primary/20" : ""}
                ${isOverlay ? "bg-card shadow-2xl border-primary ring-2 ring-primary/20 cursor-grabbing list-none" : ""}
            `}
        >
            <TableCell className="w-10">
                <button
                    {...attributes}
                    {...listeners}
                    className={`p-1 hover:bg-muted rounded transition-colors ${isOverlay ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
            </TableCell>
            <TableCell className="text-center font-bold text-muted-foreground w-12">{index + 1}</TableCell>
            <TableCell className="w-24">
                <div className="flex items-center gap-2">
                    {question.type === "Text" ? <Type className="h-3 w-3 text-blue-500" /> : <Code2 className="h-3 w-3 text-orange-500" />}
                    <span className={`text-[10px] font-bold uppercase ${question.type === "Text" ? "text-blue-500" : "text-orange-500"}`}>
                        {question.type === "Text" ? "Texto" : question.language}
                    </span>
                </div>
            </TableCell>
            <TableCell className="max-w-[400px] truncate text-xs text-muted-foreground italic">
                {question.text.replace(/[#*`_~]/g, "").substring(0, 80)}...
            </TableCell>
            <TableCell className="text-[10px] text-muted-foreground w-40">
                {format(new Date(question.createdAt), "dd/MM/yyyy HH:mm")}
            </TableCell>
            <TableCell className="text-right w-24">
                {!isOverlay && (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Eliminar Pregunta</DialogTitle>
                                    <DialogDescription>Esta acción no se puede deshacer. Escribe ELIMINAR para continuar.</DialogDescription>
                                </DialogHeader>
                                <form action={async (formData) => { await deleteQuestionAction(formData); }}>
                                    <input type="hidden" name="questionId" value={question.id} />
                                    <input type="hidden" name="evaluationId" value={evaluationId} />
                                    <div className="py-4">
                                        <Input name="confirmText" placeholder="ELIMINAR" pattern="^ELIMINAR$" required />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" variant="destructive" className="w-full">Eliminar permanentemente</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </TableCell>
        </TableRow>
    );
});

QuestionRowUI.displayName = "QuestionRowUI";

