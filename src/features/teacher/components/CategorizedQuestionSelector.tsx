"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sparkles,
    Send,
    BookmarkPlus,
    Settings2,
    Trash2,
    HelpCircle,
    RotateCcw,
    FolderPlus,
    Check,
    Loader2,
    Database,
} from "lucide-react";
import { toast } from "sonner";
import {
    getInspectorQuestionsAction,
    createInspectorQuestionAction,
    deleteInspectorQuestionAction,
    resetInspectorQuestionsAction,
    InspectorQuestionItem,
} from "../actions/inspectorQuestionActions";

export interface CategorizedQuestion {
    id: string;
    category: string;
    label: string;
    prompt: string;
    isCustom?: boolean;
    createdAt?: number;
}

export const DEFAULT_GITHUB_QUESTIONS: CategorizedQuestion[] = [
    // Git y Commits
    {
        id: "git-commits-progressive",
        category: "🔍 Git y Commits",
        label: "Auditoría de Commits progresivos vs masivo",
        prompt: "¿El estudiante realizó commits progresivos a lo largo del tiempo o subió todo el código en un único commit masivo al final?",
    },
    {
        id: "git-commits-messages",
        category: "🔍 Git y Commits",
        label: "Calidad de mensajes de commit",
        prompt: "¿Los mensajes de commit son descriptivos y siguen buenas prácticas (como Conventional Commits) o son genéricos?",
    },
    {
        id: "git-branches-prs",
        category: "🔍 Git y Commits",
        label: "Uso de ramas (branches) y Pull Requests",
        prompt: "¿Qué ramas (branches) y pull requests se utilizaron durante el desarrollo de la entrega y cómo fue el flujo de integración?",
    },

    // Seguridad y Credenciales
    {
        id: "sec-keys-leaks",
        category: "🛡️ Seguridad y Credenciales",
        label: "Fugas de API Keys, tokens o secretos",
        prompt: "¿Hay alguna API Key, token de acceso, credencial o archivo confidencial expuesto en el código o en el historial de commits?",
    },
    {
        id: "sec-env-gitignore",
        category: "🛡️ Seguridad y Credenciales",
        label: "Archivos sensibles y .gitignore",
        prompt: "¿Existen archivos .env, credenciales o carpetas indebidas ignoradas correctamente en el archivo .gitignore?",
    },
    {
        id: "sec-dependencies-vuln",
        category: "🛡️ Seguridad y Credenciales",
        label: "Vulnerabilidades en dependencias",
        prompt: "¿Las dependencias o librerías del proyecto presentan vulnerabilidades de seguridad conocidas o paquetes obsoletos?",
    },

    // Estructura y Arquitectura
    {
        id: "arch-structure-patterns",
        category: "📂 Estructura y Arquitectura",
        label: "Estructura y patrones de diseño",
        prompt: "Describe la estructura principal del repositorio y qué patrones de diseño o arquitectura utilizó el estudiante.",
    },
    {
        id: "arch-modular-separation",
        category: "📂 Estructura y Arquitectura",
        label: "Modularidad y separación de capas",
        prompt: "¿Cómo está organizada la modularidad y la separación de responsabilidades entre componentes, controladores y modelos?",
    },
    {
        id: "arch-clean-code",
        category: "📂 Estructura y Arquitectura",
        label: "Clean Code y estándares",
        prompt: "¿El código cumple con convenciones de nombres claras, estructura de carpetas coherente y buenas prácticas de legibilidad?",
    },

    // Pruebas y Calidad
    {
        id: "test-unit-tests",
        category: "🧪 Pruebas y Calidad",
        label: "Pruebas unitarias y automatizadas",
        prompt: "¿El proyecto cuenta con pruebas unitarias/automatizadas y qué cobertura o casos de prueba implementa?",
    },
    {
        id: "test-readme-docs",
        category: "🧪 Pruebas y Calidad",
        label: "Documentación y archivo README",
        prompt: "¿El archivo README contiene instrucciones claras de instalación, ejecución, dependencias y justificación del proyecto?",
    },
    {
        id: "test-error-handling",
        category: "🧪 Pruebas y Calidad",
        label: "Manejo de errores y consistencia",
        prompt: "¿Existe un manejo robusto de excepciones, errores y consistencia en el tipado de datos en la aplicación?",
    },

    // Rendimiento y Dependencias
    {
        id: "perf-dependencies-audit",
        category: "⚡ Rendimiento y Dependencias",
        label: "Auditoría de dependencias principales",
        prompt: "¿Qué dependencias externas principales utiliza el proyecto y están debidamente justificadas para su propósito?",
    },
    {
        id: "perf-dead-code",
        category: "⚡ Rendimiento y Dependencias",
        label: "Código muerto o duplicaciones",
        prompt: "¿Detectas funciones no utilizadas, imports innecesarios o duplicación evidente en el código del repositorio?",
    },
];

export interface CategorizedQuestionSelectorProps {
    onSelectAndSend: (prompt: string) => void;
    onFillInput?: (prompt: string) => void;
    currentInput?: string;
    isLoading?: boolean;
    scope?: string;
    initialQuestions?: CategorizedQuestion[];
}

export function CategorizedQuestionSelector({
    onSelectAndSend,
    onFillInput,
    currentInput = "",
    isLoading = false,
    scope = "GITHUB",
    initialQuestions = DEFAULT_GITHUB_QUESTIONS,
}: CategorizedQuestionSelectorProps) {
    const [customQuestions, setCustomQuestions] = useState<CategorizedQuestion[]>([]);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
    const [isFetchingDb, setIsFetchingDb] = useState(false);
    const [isSavingDb, setIsSavingDb] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal para guardar pregunta
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCategoryType, setNewCategoryType] = useState<"existing" | "new">("existing");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [customCategoryName, setCustomCategoryName] = useState<string>("");
    const [newLabel, setNewLabel] = useState<string>("");
    const [newPrompt, setNewPrompt] = useState<string>("");

    // Modal para gestionar banco
    const [isManageOpen, setIsManageOpen] = useState(false);

    // Cargar preguntas guardadas en la base de datos
    const loadQuestionsFromDb = useCallback(async () => {
        setIsFetchingDb(true);
        try {
            const res = await getInspectorQuestionsAction(scope);
            if (res.success && Array.isArray(res.questions)) {
                setCustomQuestions(res.questions);
            }
        } catch (e) {
            console.error("Error al cargar preguntas de BD:", e);
        } finally {
            setIsFetchingDb(false);
        }
    }, [scope]);

    useEffect(() => {
        loadQuestionsFromDb();
    }, [loadQuestionsFromDb]);

    // Combinar preguntas iniciales predeterminadas + personalizadas de BD
    const allQuestions = useMemo(() => {
        return [...initialQuestions, ...customQuestions];
    }, [initialQuestions, customQuestions]);

    // Extraer lista única de categorías ordenadas
    const categories = useMemo(() => {
        const unique = Array.from(new Set(allQuestions.map((q) => q.category)));
        return unique;
    }, [allQuestions]);

    // Pregunta seleccionada actualmente
    const currentSelectedQuestion = useMemo(() => {
        return allQuestions.find((q) => q.id === selectedQuestionId) || null;
    }, [allQuestions, selectedQuestionId]);

    // Al seleccionar una pregunta en el selector
    const handleSelectQuestion = (questionId: string) => {
        setSelectedQuestionId(questionId);
        const q = allQuestions.find((item) => item.id === questionId);
        if (q && onFillInput) {
            onFillInput(q.prompt);
        }
    };

    // Ejecutar la pregunta seleccionada
    const handleAskSelected = () => {
        if (!currentSelectedQuestion || isLoading) return;
        onSelectAndSend(currentSelectedQuestion.prompt);
    };

    // Abrir modal de guardar pregunta
    const handleOpenAddModal = () => {
        if (currentInput.trim()) {
            setNewPrompt(currentInput.trim());
            setNewLabel(
                currentInput.trim().length > 40
                    ? currentInput.trim().slice(0, 37) + "..."
                    : currentInput.trim()
            );
        } else {
            setNewPrompt("");
            setNewLabel("");
        }

        if (categories.length > 0) {
            setSelectedCategory(categories[0]);
            setNewCategoryType("existing");
        } else {
            setNewCategoryType("new");
        }
        setCustomCategoryName("");
        setIsAddOpen(true);
    };

    // Guardar nueva pregunta en la BASE DE DATOS
    const handleSaveNewQuestion = async (e: React.FormEvent) => {
        e.preventDefault();

        const categoryToUse =
            newCategoryType === "new"
                ? customCategoryName.trim()
                : selectedCategory.trim();

        if (!categoryToUse) {
            toast.error("Por favor ingresa o selecciona una categoría.");
            return;
        }

        if (!newLabel.trim()) {
            toast.error("Por favor ingresa un título o etiqueta para la pregunta.");
            return;
        }

        if (!newPrompt.trim()) {
            toast.error("Por favor ingresa el texto de la pregunta (prompt).");
            return;
        }

        setIsSavingDb(true);
        try {
            const res = await createInspectorQuestionAction({
                category: categoryToUse,
                label: newLabel.trim(),
                prompt: newPrompt.trim(),
                scope,
            });

            if (res.success && res.question) {
                setCustomQuestions((prev) => [...prev, res.question!]);
                setSelectedQuestionId(res.question.id);

                if (onFillInput) {
                    onFillInput(res.question.prompt);
                }

                toast.success(`Pregunta guardada en la base de datos ("${categoryToUse}").`);
                setIsAddOpen(false);
            } else {
                toast.error(res.error || "No se pudo guardar la pregunta en la base de datos.");
            }
        } catch (err: any) {
            console.error("Error guardando en BD:", err);
            toast.error("Error de comunicación al guardar en la base de datos.");
        } finally {
            setIsSavingDb(false);
        }
    };

    // Eliminar una pregunta personalizada de la BASE DE DATOS
    const handleDeleteCustomQuestion = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await deleteInspectorQuestionAction(id);
            if (res.success) {
                setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
                if (selectedQuestionId === id) {
                    setSelectedQuestionId("");
                }
                toast.info("Pregunta eliminada de la base de datos.");
            } else {
                toast.error(res.error || "No se pudo eliminar la pregunta.");
            }
        } catch (err) {
            toast.error("Error al eliminar la pregunta.");
        } finally {
            setDeletingId(null);
        }
    };

    // Restablecer preguntas personalizadas en la BASE DE DATOS
    const handleResetToDefaults = async () => {
        try {
            const res = await resetInspectorQuestionsAction(scope);
            if (res.success) {
                setCustomQuestions([]);
                setSelectedQuestionId("");
                toast.success("Preguntas personalizadas eliminadas de la base de datos.");
                setIsManageOpen(false);
            } else {
                toast.error(res.error || "No se pudo restablecer.");
            }
        } catch (err) {
            toast.error("Error al restablecer las preguntas.");
        }
    };

    return (
        <div className="p-2 sm:p-2.5 bg-muted/20 border-b border-border text-xs shrink-0">
            <div className="w-full flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden md:inline">Preguntas:</span>
                </div>

                {/* El selector ocupa todo el ancho disponible del contenedor */}
                <div className="flex-1 min-w-0">
                    <Select value={selectedQuestionId} onValueChange={handleSelectQuestion}>
                        <SelectTrigger className="h-8 text-xs bg-background border-border w-full truncate">
                            <SelectValue placeholder="Seleccionar pregunta por categoría..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[380px] w-[var(--radix-select-trigger-width)] min-w-[300px] max-w-[90vw]">
                            {categories.map((cat) => {
                                const catQuestions = allQuestions.filter((q) => q.category === cat);
                                return (
                                    <SelectGroup key={cat}>
                                        <SelectLabel className="font-semibold text-xs text-primary px-2.5 py-1.5 flex items-center gap-1.5 bg-muted/60 sticky top-0 backdrop-blur-xs z-10 border-b border-border/40">
                                            {cat}
                                        </SelectLabel>
                                        {catQuestions.map((q) => (
                                            <SelectItem
                                                key={q.id}
                                                value={q.id}
                                                title={q.prompt}
                                                className="text-xs py-1.5 pl-3 cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between gap-2 w-full max-w-[420px]">
                                                    <span className="font-medium text-foreground truncate">
                                                        {q.label}
                                                    </span>
                                                    {q.isCustom && (
                                                        <span className="text-[9px] px-1 py-0 rounded-xs bg-primary/10 text-primary font-normal shrink-0 border border-primary/20 flex items-center gap-1">
                                                            <Database className="h-2.5 w-2.5" />
                                                            Guardada
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Botón de ejecución rápida */}
                <Button
                    size="sm"
                    variant="default"
                    disabled={isLoading || !currentSelectedQuestion}
                    onClick={handleAskSelected}
                    className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    title={
                        currentSelectedQuestion
                            ? `Consultar: "${currentSelectedQuestion.label}"`
                            : "Selecciona una pregunta para consultar"
                    }
                >
                    <Send className="h-3 w-3" />
                    <span>Preguntar</span>
                </Button>

                {/* Botón Guardar Pregunta */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenAddModal}
                    className="h-8 px-2 sm:px-2.5 text-xs gap-1 bg-background hover:bg-accent border-border text-foreground shrink-0 cursor-pointer"
                    title="Guardar una nueva pregunta en la base de datos organizada por categoría"
                >
                    <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Guardar</span>
                </Button>

                {/* Botón Gestionar en BD */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsManageOpen(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer relative"
                    title="Gestionar banco de preguntas en base de datos"
                >
                    <Settings2 className="h-4 w-4" />
                    {customQuestions.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                </Button>
            </div>

            {/* Modal: Guardar Nueva Pregunta por Categoría en BD */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FolderPlus className="h-5 w-5 text-primary" />
                            Guardar Pregunta en Base de Datos
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Organiza y almacena tus preguntas técnicas en la base de datos de SmartClass para que estén disponibles de forma permanente en todas tus sesiones.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveNewQuestion} className="space-y-4 py-2">
                        {/* Selección o Creación de Categoría */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Categoría</Label>

                            <div className="flex items-center gap-2 mb-1.5 text-xs">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="categoryType"
                                        checked={newCategoryType === "existing"}
                                        onChange={() => setNewCategoryType("existing")}
                                        disabled={categories.length === 0}
                                        className="text-primary"
                                    />
                                    <span>Elegir existente</span>
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer ml-3">
                                    <input
                                        type="radio"
                                        name="categoryType"
                                        checked={newCategoryType === "new"}
                                        onChange={() => setNewCategoryType("new")}
                                        className="text-primary"
                                    />
                                    <span>+ Nueva categoría</span>
                                </label>
                            </div>

                            {newCategoryType === "existing" ? (
                                <Select
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                >
                                    <SelectTrigger className="h-9 text-xs w-full">
                                        <SelectValue placeholder="Selecciona una categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat} className="text-xs">
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    value={customCategoryName}
                                    onChange={(e) => setCustomCategoryName(e.target.value)}
                                    placeholder="Ej. 🐳 Docker y Despliegue, 🗄️ Base de Datos, etc."
                                    className="h-9 text-xs"
                                    autoFocus
                                />
                            )}
                        </div>

                        {/* Etiqueta / Nombre Corto */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Título / Etiqueta Corta</Label>
                            <Input
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Ej. Verificación de Dockerfile y Compose"
                                className="h-9 text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Este título es el que verás en la lista desplegable del selector.
                            </p>
                        </div>

                        {/* Pregunta / Prompt Detallado */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Pregunta o Prompt Completo</Label>
                            <Textarea
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                placeholder="Escribe aquí la consulta técnica detallada que se enviará al asistente de GitHub MCP..."
                                className="text-xs min-h-[90px] resize-y"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddOpen(false)}
                                disabled={isSavingDb}
                                className="text-xs cursor-pointer"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSavingDb}
                                className="text-xs gap-1.5 cursor-pointer"
                            >
                                {isSavingDb ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Check className="h-3.5 w-3.5" />
                                )}
                                Guardar en Base de Datos
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Gestionar Banco de Preguntas en BD */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Database className="h-5 w-5 text-primary" />
                            Preguntas Guardadas en Base de Datos
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Revisa y administra tus preguntas personalizadas guardadas permanentemente en tu cuenta docente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 max-h-[350px] overflow-y-auto pr-1">
                        {isFetchingDb ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span>Cargando preguntas de la base de datos...</span>
                            </div>
                        ) : customQuestions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground space-y-2 bg-muted/20 rounded-lg border border-dashed p-4">
                                <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                <p className="text-xs font-medium">No tienes preguntas guardadas en la base de datos</p>
                                <p className="text-[11px]">
                                    Usa el botón &quot;Guardar pregunta&quot; para añadir tus propias consultas organizadas por categorías.
                                </p>
                            </div>
                        ) : (
                            customQuestions.map((cq) => (
                                <div
                                    key={cq.id}
                                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                                >
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-muted border border-border font-medium">
                                                {cq.category}
                                            </span>
                                            <span className="font-medium text-xs text-foreground truncate">
                                                {cq.label}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                                            {cq.prompt}
                                        </p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        disabled={deletingId === cq.id}
                                        onClick={() => handleDeleteCustomQuestion(cq.id)}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                                        title="Eliminar de la base de datos"
                                    >
                                        {deletingId === cq.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border">
                        {customQuestions.length > 0 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetToDefaults}
                                className="text-xs text-destructive hover:bg-destructive/10 gap-1 cursor-pointer"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Eliminar todas las mías en BD
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsManageOpen(false)}
                            className="text-xs cursor-pointer"
                        >
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
