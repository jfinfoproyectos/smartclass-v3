"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    FileText, 
    Sparkles, 
    Upload, 
    ArrowLeft, 
    CheckCircle2, 
    MousePointerClick, 
    Cpu, 
    Sliders, 
    Download, 
    Copy, 
    Plus, 
    Trash2, 
    Edit2, 
    Eye, 
    RotateCcw, 
    Check, 
    AlertCircle, 
    Wand2, 
    Layers, 
    FileCheck, 
    FileUp, 
    Calendar, 
    Hash, 
    AlignLeft, 
    HelpCircle,
    Info,
    ChevronRight,
    Search,
    Banknote,
    PenTool,
    GitFork,
    TableProperties,
    CalendarRange,
    Scale,
    FileJson,
    FolderInput,
    Settings2,
    Undo2,
    BookOpen,
    Pencil,
    PlusCircle,
    Brain,
    Lightbulb,
    ShieldAlert,
    Award,
    Languages,
    Type,
    FileDown,
    Printer,
    ShieldCheck,
    CheckCheck,
    Columns2,
    Zap,
    Eraser,
    Filter,
    LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Select, 
    SelectContent, 
    SelectGroup,
    SelectItem, 
    SelectLabel,
    SelectSeparator,
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
    TemplateVariable, 
    TemplateVariableType,
    ParsedDocxResult,
    parseDocxBuffer,
    generateFilledDocx,
    numberToSpanishWords,
    formatCurrencyCOP,
    SmartClassDocxProject,
    exportSmartClassProject,
    parseSmartClassProject,
    base64ToArrayBuffer,
    PromptPreset,
    DEFAULT_PROMPT_PRESETS,
    DigitalSignatureData
} from "../utils/docxUtils";
import { 
    analyzeDocxVariablesAction, 
    fillVariablesFromCaseAction,
    refineNarrativeParagraphAction
} from "../actions/docTemplateActions";
import { WordDocumentViewer } from "./WordDocumentViewer";
import { DigitalSignatureModal } from "./DigitalSignatureModal";
import { generateDocumentPdf, printHtmlElementToPdf, printFaithfulWordDocument } from "../utils/pdfExportUtils";

type StepKey = "upload" | "mark" | "fill" | "download";

// Configuración enriquecida de colores, iconos y categorías por tipo de variable
export interface VariableTypeMeta {
    label: string;
    category: "ai" | "general";
    badgeClass: string;
    cardBorder: string;
    cardBg: string;
    badgeText: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    description: string;
}

const VARIABLE_TYPE_CONFIG: Record<
    NonNullable<TemplateVariable["type"]>,
    VariableTypeMeta
> = {
    // === CATEGORÍA 1: POTENCIADAS POR INTELIGENCIA ARTIFICIAL (IA) ===
    paragraph: {
        label: "Párrafo Narrativo (IA)",
        category: "ai",
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        cardBorder: "border-purple-500/30 hover:border-purple-500/60",
        cardBg: "hover:bg-purple-500/5",
        badgeText: "text-purple-600 dark:text-purple-400",
        icon: Wand2,
        accentColor: "text-purple-500",
        description: "Redacción formal y fluida de hechos, antecedentes o texto argumentativo libre."
    },
    ai_summary: {
        label: "Resumen Ejecutivo / Sinopsis IA",
        category: "ai",
        badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        cardBorder: "border-indigo-500/30 hover:border-indigo-500/60",
        cardBg: "hover:bg-indigo-500/5",
        badgeText: "text-indigo-600 dark:text-indigo-400",
        icon: Brain,
        accentColor: "text-indigo-500",
        description: "Síntesis condensada de antecedentes, hechos clave o justificación general."
    },
    ai_analysis: {
        label: "Análisis Crítico / Consideraciones IA",
        category: "ai",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        cardBorder: "border-amber-500/30 hover:border-amber-500/60",
        cardBg: "hover:bg-amber-500/5",
        badgeText: "text-amber-600 dark:text-amber-400",
        icon: Lightbulb,
        accentColor: "text-amber-500",
        description: "Motivación técnica, consideraciones de hecho y de derecho o juicio fundado."
    },
    ai_risk: {
        label: "Evaluación de Riesgos / Matriz IA",
        category: "ai",
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        cardBorder: "border-red-500/30 hover:border-red-500/60",
        cardBg: "hover:bg-red-500/5",
        badgeText: "text-red-600 dark:text-red-400",
        icon: ShieldAlert,
        accentColor: "text-red-500",
        description: "Hallazgos de auditoría, advertencias contractuales y planes de mitigación."
    },
    ai_conclusion: {
        label: "Dictamen Técnico / Conclusión IA",
        category: "ai",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        cardBorder: "border-emerald-500/30 hover:border-emerald-500/60",
        cardBg: "hover:bg-emerald-500/5",
        badgeText: "text-emerald-600 dark:text-emerald-400",
        icon: Award,
        accentColor: "text-emerald-500",
        description: "Concepto de viabilidad, recomendaciones técnicas y peticiones resolutivas."
    },
    legal_citation: {
        label: "Cita Legal / Jurisprudencia IA",
        category: "ai",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        cardBorder: "border-rose-500/30 hover:border-rose-500/60",
        cardBg: "hover:bg-rose-500/5",
        badgeText: "text-rose-600 dark:text-rose-400",
        icon: Scale,
        accentColor: "text-rose-500",
        description: "Generación y citación de normas, artículos, leyes y jurisprudencia aplicable."
    },
    ai_translation: {
        label: "Traducción Oficial / Resumen Bilingüe IA",
        category: "ai",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        cardBorder: "border-sky-500/30 hover:border-sky-500/60",
        cardBg: "hover:bg-sky-500/5",
        badgeText: "text-sky-600 dark:text-sky-400",
        icon: Languages,
        accentColor: "text-sky-500",
        description: "Traducción o resumen formal en inglés u otro idioma con rigor técnico."
    },

    // === CATEGORÍA 2: VARIABLES GENERALES Y FORMATO ===
    text: {
        label: "Dato Corto (Texto)",
        category: "general",
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        cardBorder: "border-blue-500/30 hover:border-blue-500/60",
        cardBg: "hover:bg-blue-500/5",
        badgeText: "text-blue-600 dark:text-blue-400",
        icon: AlignLeft,
        accentColor: "text-blue-500",
        description: "Nombres propios, entidades, cargos, ciudades o textos breves."
    },
    number: {
        label: "Número / Documento ID",
        category: "general",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        cardBorder: "border-amber-500/30 hover:border-amber-500/60",
        cardBg: "hover:bg-amber-500/5",
        badgeText: "text-amber-600 dark:text-amber-400",
        icon: Hash,
        accentColor: "text-amber-500",
        description: "Cédulas, NIT, teléfonos, radicados o cantidades numéricas."
    },
    currency_words: {
        label: "Moneda + Letras M/CTE",
        category: "general",
        badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
        cardBorder: "border-green-500/30 hover:border-green-500/60",
        cardBg: "hover:bg-green-500/5",
        badgeText: "text-green-600 dark:text-green-400",
        icon: Banknote,
        accentColor: "text-green-500",
        description: "Valores monetarios con transcripción escrita a letras automática."
    },
    date: {
        label: "Fecha Específica",
        category: "general",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        cardBorder: "border-emerald-500/30 hover:border-emerald-500/60",
        cardBg: "hover:bg-emerald-500/5",
        badgeText: "text-emerald-600 dark:text-emerald-400",
        icon: Calendar,
        accentColor: "text-emerald-500",
        description: "Fechas de expedición, radicación o suscripción (DD/MM/AAAA)."
    },
    date_range: {
        label: "Período / Rango Fechas",
        category: "general",
        badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
        cardBorder: "border-teal-500/30 hover:border-teal-500/60",
        cardBg: "hover:bg-teal-500/5",
        badgeText: "text-teal-600 dark:text-teal-400",
        icon: CalendarRange,
        accentColor: "text-teal-500",
        description: "Plazos de ejecución contractual o vigencias temporales."
    },
    signature: {
        label: "Firma / Suscripción",
        category: "general",
        badgeClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
        cardBorder: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
        cardBg: "hover:bg-fuchsia-500/5",
        badgeText: "text-fuchsia-600 dark:text-fuchsia-400",
        icon: PenTool,
        accentColor: "text-fuchsia-500",
        description: "Pie de firma formal con identificación para suscribir."
    },
    conditional: {
        label: "Cláusula Condicional (Sí/No)",
        category: "general",
        badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
        cardBorder: "border-orange-500/30 hover:border-orange-500/60",
        cardBg: "hover:bg-orange-500/5",
        badgeText: "text-orange-600 dark:text-orange-400",
        icon: GitFork,
        accentColor: "text-orange-500",
        description: "Párrafo o cláusula que se incluye o suprime según la condición."
    },
    dynamic_table: {
        label: "Tabla de Filas Dinámica",
        category: "general",
        badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
        cardBorder: "border-violet-500/30 hover:border-violet-500/60",
        cardBg: "hover:bg-violet-500/5",
        badgeText: "text-violet-600 dark:text-violet-400",
        icon: TableProperties,
        accentColor: "text-violet-500",
        description: "Tabla repetitiva con filas de actividades, pagos o evidencias."
    },
    select: {
        label: "Opción / Selección Fija",
        category: "general",
        badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        cardBorder: "border-cyan-500/30 hover:border-cyan-500/60",
        cardBg: "hover:bg-cyan-500/5",
        badgeText: "text-cyan-600 dark:text-cyan-400",
        icon: CheckCircle2,
        accentColor: "text-cyan-500",
        description: "Menú desplegable con alternativas predefinidas."
    }
};

const isAiVariableType = (type?: TemplateVariableType): boolean => {
    return [
        "paragraph", 
        "legal_citation", 
        "ai_summary", 
        "ai_analysis", 
        "ai_risk", 
        "ai_conclusion", 
        "ai_translation"
    ].includes(type as any);
};

export function DocxAutofillView() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    // Flujo de pasos
    const [currentStep, setCurrentStep] = useState<StepKey>("upload");
    const [markViewMode, setMarkViewMode] = useState<"word" | "paragraphs">("word");

    // Datos del archivo DOCX cargado
    const [fileName, setFileName] = useState<string>("");
    const [rawZipBuffer, setRawZipBuffer] = useState<ArrayBuffer | null>(null);
    const [parsedDoc, setParsedDoc] = useState<ParsedDocxResult | null>(null);

    // Variables de la plantilla (Taller de marcado)
    const [variables, setVariables] = useState<TemplateVariable[]>([]);

    // Estados de Opción B y Edición de variables
    const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
    const [selectedSnippet, setSelectedSnippet] = useState<string>("");
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState<boolean>(false);
    const [newVarLabel, setNewVarLabel] = useState<string>("");
    const [newVarId, setNewVarId] = useState<string>("");
    const [newVarType, setNewVarType] = useState<TemplateVariable["type"]>("text");
    const [newVarGuideline, setNewVarGuideline] = useState<string>("");
    const [newVarPromptPresetId, setNewVarPromptPresetId] = useState<string>("juridico");

    // Biblioteca Centralizada de Tipos de Prompts de Redacción
    const [promptPresets, setPromptPresets] = useState<PromptPreset[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("smartclass_docx_prompt_presets");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.error("Error cargando presets de prompts:", e);
            }
        }
        return DEFAULT_PROMPT_PRESETS;
    });

    const [isPromptPresetsModalOpen, setIsPromptPresetsModalOpen] = useState<boolean>(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string>("juridico");
    const [isCreatingNewPreset, setIsCreatingNewPreset] = useState<boolean>(false);
    const [presetFormName, setPresetFormName] = useState<string>("");
    const [presetFormDesc, setPresetFormDesc] = useState<string>("");
    const [presetFormInstruction, setPresetFormInstruction] = useState<string>("");
    const [presetSearchQuery, setPresetSearchQuery] = useState<string>("");

    // Selección de Estilo de Prompt y Copiloto de Redacción por Variable en Paso 3
    const [selectedPresetIdForVar, setSelectedPresetIdForVar] = useState<Record<string, string>>({});
    const [refiningVarId, setRefiningVarId] = useState<string | null>(null);
    const [lastRefinedDraft, setLastRefinedDraft] = useState<Record<string, string>>({});

    // Estados de Opción A (Detección automática con IA)
    const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

    // Estados de Diligenciamiento (Paso 3)
    const [fillMode, setFillMode] = useState<"ai-copilot" | "form">("ai-copilot");
    const [fillLayoutMode, setFillLayoutMode] = useState<"split" | "full">("split");
    const [formFilterCategory, setFormFilterCategory] = useState<"all" | "missing" | "ai" | "signatures">("all");
    const [formSearchQuery, setFormSearchQuery] = useState<string>("");
    const [activeFocusedVarId, setActiveFocusedVarId] = useState<string | null>(null);
    const [caseStory, setCaseStory] = useState<string>("");
    const [isFillingWithAi, setIsFillingWithAi] = useState<boolean>(false);
    const [formValues, setFormValues] = useState<Record<string, string>>({});

    const CASE_STORY_PRESETS = [
        {
            title: "📋 Informe Contractual",
            description: "Supervisión técnica de contrato",
            story: "Durante el período del 01 al 30 de septiembre de 2026, el contratista Juan Carlos Pérez Gómez, identificado con cédula 1.098.765.432, cumplió a satisfacción con las actividades pactadas en el contrato de prestación de servicios No. 087 de 2026. Se verificó la entrega de los informes técnicos, soportes de pago de seguridad social y actas de seguimiento por un valor de $4.500.000 (CUATRO MILLONES QUINIENTOS MIL PESOS M/CTE). Se recomienda autorizar el desembolso correspondiente."
        },
        {
            title: "⚖️ Acción de Tutela (Salud)",
            description: "Vulneración y orden médica",
            story: "El accionante Juan Carlos Pérez Gómez, identificado con cédula 1.098.765.432 de Bogotá, acude ante el Juez Constitucional contra EPS Sanitas solicitando la protección inmediata del derecho fundamental a la salud. El médico tratante ordenó con carácter prioritario el procedimiento quirúrgico de reemplazo articular de rodilla izquierda debido a dolores severos e incapacitantes. La entidad accionada no ha emitido autorización oportuna vulnerando el principio de continuidad e integralidad médica."
        },
        {
            title: "🎓 Acta Académica / Compromiso",
            description: "Plan de mejora y entrega",
            story: "En la ciudad de Bogotá a los 15 días del mes de octubre de 2026, se reunieron el docente titular y el estudiante Juan Carlos Pérez Gómez del programa de Ingeniería para formalizar el Acta de Compromiso Académico. Se acuerda la entrega de los talleres pendientes y sustentación del proyecto integrador antes del 30 de noviembre de 2026, comprometiéndose a un promedio de seguimiento superior a 3.8."
        }
    ];

    const handleAutofillOriginals = () => {
        const autoFilled: Record<string, string> = {};
        for (const v of variables) {
            autoFilled[v.id] = v.originalText;
        }
        setFormValues(autoFilled);
        toast.success("Todos los campos han sido autocompletados con el texto original de la plantilla.");
    };

    const handleClearFormValues = () => {
        setFormValues({});
        setSignatures({});
        toast.info("Campos del formulario limpiados.");
    };

    // Documento generado para descarga
    const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [previewOutputText, setPreviewOutputText] = useState<string>("");

    // Validación de Integridad & Requeridos
    const [newVarRequired, setNewVarRequired] = useState<boolean>(true);
    const [isIntegrityWarningOpen, setIsIntegrityWarningOpen] = useState<boolean>(false);
    const [missingRequiredVariables, setMissingRequiredVariables] = useState<TemplateVariable[]>([]);

    // Firmas Digitales
    const [signatures, setSignatures] = useState<Record<string, DigitalSignatureData>>({});
    const [activeSignatureModalVar, setActiveSignatureModalVar] = useState<TemplateVariable | null>(null);

    // Exportación a PDF
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
    const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);

    // 1. Manejo de Carga de Archivo Word
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".docx")) {
            toast.error("Por favor selecciona un archivo con extensión .docx de Microsoft Word.");
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const parsed = await parseDocxBuffer(buffer, file.name);

            setFileName(file.name);
            setRawZipBuffer(buffer);
            setParsedDoc(parsed);

            // Si el documento ya tenía variables escritas como {{variable}}, cargarlas
            if (parsed.detectedPlaceholders.length > 0) {
                const initialVars: TemplateVariable[] = parsed.detectedPlaceholders.map(ph => ({
                    id: ph,
                    label: ph.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                    originalText: `{{${ph}}}`,
                    type: "text",
                    description: `Placeholder detectado en el documento`
                }));
                setVariables(initialVars);
            } else {
                setVariables([]);
            }

            setCurrentStep("mark");
            toast.success(`Documento "${file.name}" cargado exitosamente.`);
        } catch (error: any) {
            console.error("Error al procesar DOCX:", error);
            toast.error(error.message || "Error al leer el archivo Word.");
        }
    };

    // 2. OPCIÓN A: Detección Automática de Variables con IA
    const handleAiAutoDetect = async () => {
        if (!parsedDoc || !parsedDoc.plainText) return;

        try {
            setIsAnalyzingAi(true);
            toast.loading("Analizando estructura jurídica y detectando partes variables con IA...", { id: "ai-detect" });

            const detected = await analyzeDocxVariablesAction(parsedDoc.plainText);

            if (detected.length === 0) {
                toast.info("La IA no detectó nuevas variables automáticas. Puedes marcarlas manualmente seleccionando texto.", { id: "ai-detect" });
            } else {
                // Combinar con las existentes sin duplicar ids
                setVariables(prev => {
                    const existingIds = new Set(prev.map(v => v.id));
                    const newOnes = detected.filter(d => !existingIds.has(d.id));
                    return [...prev, ...newOnes];
                });
                toast.success(`¡Se detectaron ${detected.length} variables automáticas con éxito!`, { id: "ai-detect" });
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al analizar documento con IA.", { id: "ai-detect" });
        } finally {
            setIsAnalyzingAi(false);
        }
    };

    // 3. OPCIÓN B: Marcado Manual por Selección de Texto y Edición
    const handleStartEditVariable = (v: TemplateVariable) => {
        setEditingVariable(v);
        setSelectedSnippet(v.originalText);
        setNewVarId(v.id);
        setNewVarLabel(v.label);
        setNewVarType(v.type || "text");
        setNewVarGuideline(v.aiPromptGuideline || "");
        setNewVarPromptPresetId(v.promptPresetId || "juridico");
        setNewVarRequired(v.required !== false);
        setIsSelectionModalOpen(true);
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const text = selection.toString().trim();
        if (text.length > 0 && text.length < 500) {
            setEditingVariable(null);
            setSelectedSnippet(text);
            // Proponer id en snake_case
            const suggestedId = text
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .slice(0, 30);

            setNewVarId(suggestedId || "variable_campo");
            setNewVarLabel(text.slice(0, 40));
            setNewVarType(text.length > 80 ? "paragraph" : "text");
            setNewVarGuideline("");
            setNewVarRequired(true);
            setIsSelectionModalOpen(true);
        }
    };

    const handleSaveSelectedVariable = () => {
        if (!newVarId.trim() || !selectedSnippet.trim()) {
            toast.error("El identificador y el texto original no pueden estar vacíos.");
            return;
        }

        const cleanId = newVarId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

        const updatedVar: TemplateVariable = {
            id: cleanId,
            label: newVarLabel.trim() || cleanId,
            originalText: selectedSnippet,
            type: newVarType,
            aiPromptGuideline: newVarGuideline.trim() || undefined,
            promptPresetId: newVarType === "paragraph" ? (newVarPromptPresetId || "juridico") : undefined,
            required: newVarRequired
        };

        if (editingVariable) {
            // Modo Edición: reemplazar la variable actual
            setVariables(prev => prev.map(v => v.id === editingVariable.id ? updatedVar : v));
            // Si el ID cambió, migrar también el valor guardado en el formulario
            if (editingVariable.id !== cleanId) {
                setFormValues(prev => {
                    const next = { ...prev };
                    if (next[editingVariable.id] !== undefined) {
                        next[cleanId] = next[editingVariable.id];
                        delete next[editingVariable.id];
                    }
                    return next;
                });
            }
            toast.success(`Variable "${updatedVar.label}" actualizada correctamente.`);
        } else {
            // Modo Creación
            setVariables(prev => [...prev.filter(v => v.id !== cleanId), updatedVar]);
            toast.success(`Variable "${updatedVar.label}" creada correctamente.`);
        }

        setIsSelectionModalOpen(false);
        setEditingVariable(null);
        setSelectedSnippet("");
    };

    // Eliminar variable marcada
    const handleRemoveVariable = (id: string) => {
        setVariables(prev => prev.filter(v => v.id !== id));
        setFormValues(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        toast.info("Variable eliminada de la plantilla.");
    };

    // 4. Paso 3: Diligenciamiento con Copiloto IA por Caso Libre
    const handleFillWithAiCase = async () => {
        if (!caseStory.trim()) {
            toast.error("Por favor escribe o pega los detalles del nuevo caso.");
            return;
        }

        if (variables.length === 0) {
            toast.error("Debes tener al menos una variable definida en la plantilla.");
            return;
        }

        try {
            setIsFillingWithAi(true);
            toast.loading("El Copiloto IA está extrayendo datos y redactando el documento...", { id: "ai-fill" });

            const filled = await fillVariablesFromCaseAction(caseStory, variables);

            setFormValues(prev => ({
                ...prev,
                ...filled
            }));

            toast.success("¡Datos del caso extraídos y redactados con éxito! Puedes revisarlos en el formulario.", { id: "ai-fill" });
            setFillMode("form"); // Pasar a modo formulario para que el usuario pueda auditar
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al diligenciar caso con IA.", { id: "ai-fill" });
        } finally {
            setIsFillingWithAi(false);
        }
    };

    // 5. Paso 4: Generación y Descarga del Documento Final .DOCX y .PDF con Integridad
    const handleTriggerCompileDocx = () => {
        // Validación de Integridad
        const missing = variables.filter(v => {
            if (v.required === false) return false;
            if (v.type === "signature") return !signatures[v.id];
            return !formValues[v.id] || !formValues[v.id].trim();
        });

        if (missing.length > 0) {
            setMissingRequiredVariables(missing);
            setIsIntegrityWarningOpen(true);
            return;
        }

        executeGenerateFinalDocx();
    };

    const executeGenerateFinalDocx = async () => {
        if (!rawZipBuffer) {
            toast.error("No hay archivo original cargado.");
            return;
        }

        try {
            setIsGeneratingDocx(true);
            setIsIntegrityWarningOpen(false);

            // Mapear cada variable al valor diligenciado por el usuario
            const replacements = variables.map(v => {
                let finalVal = formValues[v.id];

                // Si es tipo firma y tiene firma digitalizada registrada
                if (v.type === "signature" && signatures[v.id]) {
                    const sig = signatures[v.id];
                    const dateFormatted = new Date(sig.signedAt).toLocaleDateString("es-CO");
                    finalVal = `[FIRMADO DIGITALMENTE POR: ${sig.signerName} • DOC: ${sig.signerId || "N/A"} • VERIFICACIÓN: ${sig.verificationCode} • ${dateFormatted}]`;
                }

                return {
                    search: v.originalText,
                    replaceWith: finalVal ?? v.originalText
                };
            });

            const blob = await generateFilledDocx(rawZipBuffer, replacements);
            setGeneratedBlob(blob);

            // Construir texto de vista previa
            let preview = parsedDoc?.plainText || "";
            for (const r of replacements) {
                if (r.search && r.replaceWith) {
                    preview = preview.replaceAll(r.search, r.replaceWith);
                }
            }
            setPreviewOutputText(preview);

            setCurrentStep("download");
            toast.success("¡Documento Word final generado exitosamente!");
        } catch (err: any) {
            console.error("Error generando docx:", err);
            toast.error(err.message || "Error al compilar documento final.");
        } finally {
            setIsGeneratingDocx(false);
        }
    };

    // Exportación formal y fiel a PDF (.pdf) y Asistente de Impresión de Alta Fidelidad
    const handleExportFaithfulPdf = (forPrintOnly: boolean = false) => {
        const rootContainer = document.querySelector(".docx-preview-root") as HTMLElement;
        const cleanName = fileName.replace(/\.docx$/i, "");
        const docTitle = forPrintOnly ? cleanName : `${cleanName}_oficial`;

        if (rootContainer) {
            toast.info(
                forPrintOnly 
                    ? "Abriendo ventana de impresión con diseño 100% idéntico al Word original..."
                    : "Para guardar el PDF fiel: En la ventana que se abre selecciona 'Guardar como PDF' en Destino.",
                { duration: 6000 }
            );
            printFaithfulWordDocument(rootContainer, docTitle);
        } else {
            const viewerSheet = document.querySelector(".docx-preview-sheet") as HTMLElement;
            if (viewerSheet) {
                printFaithfulWordDocument(viewerSheet, docTitle);
            } else {
                window.print();
            }
        }
    };

    const handleExportPdf = async () => {
        if (!generatedBlob && !previewOutputText) {
            toast.error("Primero debes compilar el documento.");
            return;
        }
        handleExportFaithfulPdf(false);
    };

    // Asistente de impresión nativa en formato original
    const handlePrintOrSavePdf = () => {
        handleExportFaithfulPdf(true);
    };

    const handleDownloadDocxFile = () => {
        if (!generatedBlob) return;
        const outName = fileName.replace(/\.docx$/i, "") + "_diligenciado.docx";
        const url = URL.createObjectURL(generatedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = outName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Descargando ${outName}...`);
    };

    // Manejo de Persistencia de Estilos de Prompt
    const savePromptPresets = (newPresets: PromptPreset[]) => {
        setPromptPresets(newPresets);
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem("smartclass_docx_prompt_presets", JSON.stringify(newPresets));
            } catch (e) {
                console.error("Error guardando presets:", e);
            }
        }
    };

    const handleOpenPromptPresetsModal = (presetIdToSelect?: string) => {
        setIsPromptPresetsModalOpen(true);
        const targetId = presetIdToSelect || selectedPresetId;
        const target = promptPresets.find(p => p.id === targetId) || promptPresets[0];
        if (target) {
            setSelectedPresetId(target.id);
            setIsCreatingNewPreset(false);
            setPresetFormName(target.name);
            setPresetFormDesc(target.description);
            setPresetFormInstruction(target.systemInstruction);
        }
    };

    const handleSelectPreset = (preset: PromptPreset) => {
        setSelectedPresetId(preset.id);
        setIsCreatingNewPreset(false);
        setPresetFormName(preset.name);
        setPresetFormDesc(preset.description);
        setPresetFormInstruction(preset.systemInstruction);
    };

    const handleStartCreateNewPreset = () => {
        setIsCreatingNewPreset(true);
        setSelectedPresetId("");
        setPresetFormName("✨ Nuevo Estilo de Redacción");
        setPresetFormDesc("Enfoque y directrices especiales para la redacción...");
        setPresetFormInstruction(
            "Actúa como un experto redactor institucional. Transforma las notas o borrador en un texto formal, con claridad sintáctica, conectores lógicos precisos y vocabulario técnico impecable. No agregues afirmaciones o hechos no respaldados en las notas."
        );
    };

    const handleDuplicatePreset = (preset: PromptPreset) => {
        const newId = "custom_" + Date.now().toString(36);
        const duplicated: PromptPreset = {
            id: newId,
            name: `${preset.name} (Copia)`,
            description: preset.description,
            systemInstruction: preset.systemInstruction,
            isBuiltIn: false
        };
        const updated = [...promptPresets, duplicated];
        savePromptPresets(updated);
        setSelectedPresetId(newId);
        setIsCreatingNewPreset(false);
        setPresetFormName(duplicated.name);
        setPresetFormDesc(duplicated.description);
        setPresetFormInstruction(duplicated.systemInstruction);
        toast.success(`Estilo duplicado como "${duplicated.name}". Ya puedes editarlo.`);
    };

    const handleSaveCurrentPreset = () => {
        if (!presetFormName.trim() || !presetFormInstruction.trim()) {
            toast.error("El nombre y la instrucción del prompt son obligatorios.");
            return;
        }

        if (isCreatingNewPreset) {
            const newId = "custom_" + Date.now().toString(36);
            const newPreset: PromptPreset = {
                id: newId,
                name: presetFormName.trim(),
                description: presetFormDesc.trim(),
                systemInstruction: presetFormInstruction.trim(),
                isBuiltIn: false
            };
            savePromptPresets([...promptPresets, newPreset]);
            setSelectedPresetId(newId);
            setIsCreatingNewPreset(false);
            toast.success(`Nuevo estilo "${newPreset.name}" creado con éxito.`);
        } else {
            const updated = promptPresets.map(p => 
                p.id === selectedPresetId 
                    ? { ...p, name: presetFormName.trim(), description: presetFormDesc.trim(), systemInstruction: presetFormInstruction.trim() } 
                    : p
            );
            savePromptPresets(updated);
            toast.success(`Estilo "${presetFormName.trim()}" guardado exitosamente.`);
        }
    };

    const handleDeletePreset = (id: string) => {
        if (promptPresets.length <= 1) {
            toast.error("Debe existir al menos un estilo de prompt de redacción.");
            return;
        }
        const target = promptPresets.find(p => p.id === id);
        const targetName = target?.name || "Estilo de prompt";
        const filtered = promptPresets.filter(p => p.id !== id);
        savePromptPresets(filtered);
        const fallback = filtered[0] || DEFAULT_PROMPT_PRESETS[0];
        if (fallback) {
            handleSelectPreset(fallback);
        }
        toast.info(`"${targetName}" eliminado.`);
    };

    const handleRestoreDefaultPresets = () => {
        savePromptPresets(DEFAULT_PROMPT_PRESETS);
        const first = DEFAULT_PROMPT_PRESETS[0];
        if (first) {
            setSelectedPresetId(first.id);
            setIsCreatingNewPreset(false);
            setPresetFormName(first.name);
            setPresetFormDesc(first.description);
            setPresetFormInstruction(first.systemInstruction);
        }
        toast.success("Se restauraron todos los estilos de prompt predeterminados de fábrica.");
    };

    // Copiloto IA: Mejorar y pulir redacción de un párrafo narrativo según estilo
    const handleRefineParagraphWithAi = async (v: TemplateVariable) => {
        const currentDraft = formValues[v.id] || "";
        if (!currentDraft.trim()) {
            toast.error("Escribe notas o un borrador en el campo antes de mejorar la redacción con IA.");
            return;
        }

        const presetId = selectedPresetIdForVar[v.id] || v.promptPresetId || "juridico";
        const preset = promptPresets.find(p => p.id === presetId) || promptPresets[0];

        try {
            setRefiningVarId(v.id);
            // Guardar borrador actual para permitir deshacer
            setLastRefinedDraft(prev => ({ ...prev, [v.id]: currentDraft }));

            const typeDirectives: Record<string, string> = {
                ai_summary: "Elabora un resumen ejecutivo de alto nivel, sintetizando antecedentes, hechos o justificaciones clave.",
                ai_analysis: "Elabora un análisis crítico y motivación técnica con consideraciones de hecho y de derecho.",
                ai_risk: "Identifica y formula los hallazgos observados, factores de riesgo y medidas de mitigación preventiva.",
                ai_conclusion: "Formula el dictamen técnico o conclusión resolutiva con recomendaciones o peticiones precisas.",
                ai_translation: "Realiza una traducción oficial o versión bilingüe formal con alta precisión técnica y terminológica.",
                legal_citation: "Formula y cita las normas, artículos y jurisprudencia pertinente aplicable al caso."
            };
            const typeSpecific = typeDirectives[v.type || ""] || "";
            const combinedGuideline = [typeSpecific, v.aiPromptGuideline].filter(Boolean).join(" ");

            toast.loading(`Redactando con estilo ${preset.name}...`, { id: `refine-${v.id}` });

            const refined = await refineNarrativeParagraphAction({
                rawText: currentDraft,
                systemInstruction: preset.systemInstruction,
                customGuideline: combinedGuideline || undefined,
                variableLabel: v.label,
                originalSampleText: v.originalText
            });

            setFormValues(prev => ({ ...prev, [v.id]: refined }));
            toast.success(`¡Párrafo redactado con éxito en estilo ${preset.name}!`, { id: `refine-${v.id}` });
        } catch (err: any) {
            console.error("Error refinando párrafo:", err);
            toast.error(err.message || "Error al redactar párrafo con IA.", { id: `refine-${v.id}` });
        } finally {
            setRefiningVarId(null);
        }
    };

    const handleUndoRefine = (varId: string) => {
        const draft = lastRefinedDraft[varId];
        if (draft !== undefined) {
            setFormValues(prev => ({ ...prev, [varId]: draft }));
            setLastRefinedDraft(prev => {
                const next = { ...prev };
                delete next[varId];
                return next;
            });
            toast.info("Se restauró el borrador anterior.");
        }
    };

    // Manejo de Exportación de Proyecto Completo (.json)
    const handleExportProject = () => {
        if (!rawZipBuffer && variables.length === 0) {
            toast.error("Debes cargar un documento o crear variables antes de exportar el proyecto.");
            return;
        }

        try {
            exportSmartClassProject({
                fileName: fileName || "plantilla_documento.docx",
                rawZipBuffer,
                variables,
                formValues,
                signatures,
                caseStory,
                promptPresets,
                paragraphsCount: parsedDoc?.paragraphs?.length
            });
            toast.success("Proyecto exportado exitosamente en archivo .json");
        } catch (err: any) {
            console.error("Error al exportar proyecto:", err);
            toast.error("No se pudo exportar el proyecto: " + (err.message || "Error desconocido"));
        }
    };

    // Manejo de Importación de Proyecto Completo (.json)
    const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limpiar para permitir reseleccionar el mismo archivo si es necesario
        e.target.value = "";

        if (!file.name.toLowerCase().endsWith(".json")) {
            toast.error("Por favor selecciona un archivo con extensión .json");
            return;
        }

        try {
            const text = await file.text();
            const project = parseSmartClassProject(text);

            // Reconstruir el buffer del archivo Word original (.docx) si viene incrustado
            if (project.fileBase64) {
                const buffer = base64ToArrayBuffer(project.fileBase64);
                const docName = project.fileName || file.name.replace(/\.json$/i, ".docx");
                const parsed = await parseDocxBuffer(buffer, docName);

                setRawZipBuffer(buffer);
                setFileName(docName);
                setParsedDoc(parsed);
            } else if (!rawZipBuffer) {
                toast.info("El proyecto no incluye el documento Word integrado. Puedes cargar el archivo .docx base para asociarlo.");
            }

            // Restaurar variables configuradas
            const importedVars = project.variables || [];
            setVariables(importedVars);

            // Restaurar valores del caso si existen
            if (project.formValues) {
                setFormValues(project.formValues);
            }
            if (project.signatures) {
                setSignatures(project.signatures);
            }
            if (project.caseStory) {
                setCaseStory(project.caseStory);
            }

            // Restaurar prompts personalizados si el proyecto los contiene
            if (project.promptPresets && project.promptPresets.length > 0) {
                savePromptPresets(project.promptPresets);
            }

            // Redireccionar al paso más conveniente según el contenido importado
            if (project.fileBase64 && importedVars.length > 0) {
                if (project.formValues && Object.keys(project.formValues).length > 0) {
                    setCurrentStep("fill");
                } else {
                    setCurrentStep("mark");
                }
            } else if (project.fileBase64) {
                setCurrentStep("mark");
            }

            toast.success(
                `Proyecto "${project.projectName || file.name.replace(/\.json$/i, "")}" importado exitosamente (${importedVars.length} variables restauradas)`
            );
        } catch (err: any) {
            console.error("Error importando proyecto JSON:", err);
            toast.error("Error al importar el archivo JSON: " + (err.message || "Estructura no válida"));
        }
    };

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden space-y-2.5 p-1 sm:p-2">
            {/* Header Moderno, Limpio y Compacto (Fijo en la parte superior sin scroll) */}
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2 border-b border-border/70">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.push("/dashboard/teacher/tools")}
                            className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            Herramientas
                        </Button>
                        <span className="text-muted-foreground/30">•</span>
                        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Automatizador de Documentos Word
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 text-indigo-500 border-indigo-500/30 bg-indigo-500/5">
                                .docx
                            </Badge>
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                        Marca datos variables con IA o manualmente y genera nuevos casos manteniendo el formato original intacto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto">
                    {/* Botones de Prompts IA e Importar / Exportar Proyecto JSON */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/70 shadow-2xs">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenPromptPresetsModal()}
                            className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background/80"
                            title="Definir y personalizar tipos de prompts de redacción para párrafos IA"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden sm:inline">Prompts de Redacción</span>
                            <span className="sm:hidden">Prompts</span>
                        </Button>

                        <div className="w-px h-3.5 bg-border mx-0.5" />

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => jsonFileInputRef.current?.click()}
                            className="h-7 px-2 text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background/80"
                            title="Importar proyecto (.json) con documento y variables"
                        >
                            <FolderInput className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="hidden sm:inline">Importar JSON</span>
                            <span className="sm:hidden">Importar</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleExportProject}
                            disabled={!rawZipBuffer && variables.length === 0}
                            className="h-7 px-2 text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-40"
                            title="Exportar proyecto completo (.json)"
                        >
                            <Download className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="hidden sm:inline">Exportar JSON</span>
                            <span className="sm:hidden">Exportar</span>
                        </Button>
                    </div>

                    {/* Pasos / Stepper Compacto & Elegante */}
                    <div className="flex items-center rounded-xl bg-card border border-border/80 p-1 text-xs shadow-2xs shrink-0">
                        <button
                            type="button"
                            onClick={() => rawZipBuffer && setCurrentStep("upload")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                currentStep === "upload" 
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">1</span>
                            <span>Subir Word</span>
                        </button>

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-0.5" />

                        <button
                            type="button"
                            onClick={() => rawZipBuffer && setCurrentStep("mark")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                currentStep === "mark" 
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">2</span>
                            <span>Variables ({variables.length})</span>
                        </button>

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-0.5" />

                        <button
                            type="button"
                            onClick={() => variables.length > 0 && setCurrentStep("fill")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                currentStep === "fill" 
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">3</span>
                            <span>Diligenciar</span>
                        </button>

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-0.5" />

                        <button
                            type="button"
                            onClick={() => generatedBlob && setCurrentStep("download")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all text-xs cursor-pointer",
                                currentStep === "download" 
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">4</span>
                            <span>Descargar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Inputs ocultos para carga de archivos */}
            <input 
                type="file" 
                ref={fileInputRef}
                accept=".docx" 
                onChange={handleFileUpload} 
                className="hidden" 
            />
            <input 
                type="file" 
                ref={jsonFileInputRef}
                accept=".json,application/json" 
                onChange={handleImportProject} 
                className="hidden" 
            />

            {/* PASO 1: SUBIR DOCUMENTO WORD */}
            {currentStep === "upload" && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
                    <div className="max-w-2xl mx-auto text-center space-y-3">
                        <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <FileUp className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            Carga tu Documento Word Base (.docx)
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Sube cualquier formato que utilices recurrentemente o restaura un proyecto previo en formato JSON. Se conservará tu tipografía, imágenes, tablas y formato exacto.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-7 sm:p-8 rounded-2xl border-2 border-dashed border-border hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group shadow-2xs"
                        >
                            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                            <p className="text-sm font-bold text-foreground">Seleccionar Word (.docx)</p>
                            <p className="text-xs text-muted-foreground">Formato original desde tu equipo</p>
                        </div>

                        <div 
                            onClick={() => jsonFileInputRef.current?.click()}
                            className="p-7 sm:p-8 rounded-2xl border border-border hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group shadow-2xs"
                        >
                            <FileJson className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-bold text-foreground">Importar Proyecto (.json)</p>
                            <p className="text-xs text-muted-foreground">Restaura plantilla y variables guardadas</p>
                        </div>
                    </div>

                    {parsedDoc && (
                        <div className="max-w-2xl mx-auto pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="text-xs font-bold text-foreground">{fileName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {parsedDoc.paragraphs.length} párrafos detectados
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => setCurrentStep("mark")}
                                className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                            >
                                Continuar al Taller de Marcado →
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* PASO 2: TALLER DE MARCADO (OPCIÓN A & OPCIÓN B) */}
            {currentStep === "mark" && parsedDoc && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 h-full overflow-hidden">
                    {/* Columna Izquierda: Visor del Documento para Selección Manual (Opción B) */}
                    <div className="lg:col-span-8 flex flex-col h-full min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="p-2.5 sm:p-3 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-mono py-1 px-2.5">
                                    {fileName}
                                </Badge>
                                <div className="flex items-center rounded-lg bg-background border border-border p-0.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setMarkViewMode("word")}
                                        className={cn(
                                            "px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all",
                                            markViewMode === "word" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        📄 Vista Word Real
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMarkViewMode("paragraphs")}
                                        className={cn(
                                            "px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all",
                                            markViewMode === "paragraphs" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        📝 Párrafos
                                    </button>
                                </div>
                            </div>

                            {/* Botón Opción A: Detección Automática con IA */}
                            <Button 
                                size="sm" 
                                onClick={handleAiAutoDetect}
                                disabled={isAnalyzingAi}
                                className="h-8 px-3 text-xs gap-1.5 font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white cursor-pointer shadow-xs"
                            >
                                {isAnalyzingAi ? (
                                    <>
                                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Analizando con IA...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span>✨ Opción A: Detectar Variables con IA</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Contenedor del Documento: Vista Word Real o Lista de Párrafos */}
                        {markViewMode === "word" && rawZipBuffer ? (
                            <div className="flex-1 min-h-0 h-full w-full overflow-hidden">
                                <WordDocumentViewer 
                                    file={rawZipBuffer}
                                    highlightVariables={variables.map(v => ({
                                        id: v.id,
                                        originalText: v.originalText,
                                        type: v.type,
                                        label: v.label
                                    }))}
                                    onVariableClick={(varId) => {
                                        const found = variables.find(v => v.id === varId);
                                        if (found) {
                                            handleStartEditVariable(found);
                                        }
                                    }}
                                    onTextSelect={(text) => {
                                        if (text && text.length > 0 && text.length < 500) {
                                            setEditingVariable(null);
                                            setSelectedSnippet(text);
                                            const suggestedId = text
                                                .toLowerCase()
                                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                                .replace(/[^a-z0-9]+/g, "_")
                                                .replace(/^_+|_+$/g, "")
                                                .slice(0, 30);
                                            setNewVarId(suggestedId || "variable_campo");
                                            setNewVarLabel(text.slice(0, 40));
                                            setNewVarType(text.length > 80 ? "paragraph" : "text");
                                            setNewVarGuideline("");
                                            setIsSelectionModalOpen(true);
                                        }
                                    }}
                                    className="h-full w-full"
                                />
                            </div>
                        ) : (
                            <div 
                                onMouseUp={handleTextSelection}
                                className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto font-serif text-sm leading-relaxed space-y-3 bg-background/50 select-text cursor-text"
                            >
                                {parsedDoc.paragraphs.map((p) => {
                                    // Comprobar si este párrafo contiene variables marcadas
                                    const matchingVars = variables.filter(
                                        v => v.originalText && p.text.includes(v.originalText)
                                    );

                                    if (matchingVars.length === 0) {
                                        return (
                                            <p key={p.index} className="text-foreground/90">
                                                {p.text}
                                            </p>
                                        );
                                    }

                                    // Fragmentar el texto del párrafo para resaltar cada variable
                                    let fragments: Array<{ text: string; variable?: TemplateVariable }> = [
                                        { text: p.text }
                                    ];

                                    for (const mv of matchingVars) {
                                        const newFrags: Array<{ text: string; variable?: TemplateVariable }> = [];
                                        for (const frag of fragments) {
                                            if (frag.variable) {
                                                newFrags.push(frag);
                                                continue;
                                            }
                                            const parts = frag.text.split(mv.originalText);
                                            for (let i = 0; i < parts.length; i++) {
                                                if (parts[i]) {
                                                    newFrags.push({ text: parts[i] });
                                                }
                                                if (i < parts.length - 1) {
                                                    newFrags.push({ text: mv.originalText, variable: mv });
                                                }
                                            }
                                        }
                                        fragments = newFrags;
                                    }

                                    return (
                                        <p key={p.index} className="text-foreground/90">
                                            {fragments.map((frag, idx) => {
                                                if (!frag.variable) {
                                                    return <span key={idx}>{frag.text}</span>;
                                                }
                                                const typeConf = VARIABLE_TYPE_CONFIG[frag.variable.type || "text"] || VARIABLE_TYPE_CONFIG.text;
                                                return (
                                                    <mark
                                                        key={idx}
                                                        onClick={() => handleStartEditVariable(frag.variable!)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all hover:scale-105 border",
                                                            typeConf.badgeClass
                                                        )}
                                                        title={`Variable: {{${frag.variable.id}}} - Clic para editar`}
                                                    >
                                                        <span>{frag.text}</span>
                                                        <span className="text-[9px] font-mono opacity-80">
                                                            {`{{${frag.variable.id}}}`}
                                                        </span>
                                                    </mark>
                                                );
                                            })}
                                        </p>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Columna Derecha: Panel de Variables Marcadas */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="p-2.5 sm:p-3 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                                <Sliders className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-xs font-bold text-foreground">
                                    Variables de la Plantilla ({variables.length})
                                </h3>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                    setEditingVariable(null);
                                    setSelectedSnippet("[Texto por reemplazar]");
                                    setNewVarId("nuevo_campo");
                                    setNewVarLabel("Nuevo Campo");
                                    setNewVarType("text");
                                    setNewVarGuideline("");
                                    setIsSelectionModalOpen(true);
                                }}
                                className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar
                            </Button>
                        </div>

                        <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2">
                            {variables.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
                                    <MousePointerClick className="w-8 h-8 opacity-40 text-indigo-500" />
                                    <p className="text-xs font-semibold">No hay variables marcadas aún</p>
                                    <p className="text-[11px] text-muted-foreground max-w-xs">
                                        Pulsa <strong>"✨ Detectar Variables con IA"</strong> o sombrea cualquier texto en el documento a la izquierda para crearlas.
                                    </p>
                                </div>
                            ) : (
                                variables.map((v) => {
                                    const typeConf = VARIABLE_TYPE_CONFIG[v.type || "text"] || VARIABLE_TYPE_CONFIG.text;
                                    const TypeIcon = typeConf.icon;

                                    return (
                                        <div 
                                            key={v.id}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all space-y-1.5 group bg-card/80",
                                                typeConf.cardBorder,
                                                typeConf.cardBg
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className={cn("p-1 rounded-md bg-muted/60", typeConf.accentColor)}>
                                                        <TypeIcon className="w-3.5 h-3.5" />
                                                    </span>
                                                    <span className={cn("font-mono text-xs font-bold truncate", typeConf.accentColor)}>
                                                        {`{{${v.id}}}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={cn("text-[10px] font-semibold py-0 px-2 rounded-full border", typeConf.badgeClass)}
                                                    >
                                                        {typeConf.label}
                                                    </Badge>
                                                    <button 
                                                        type="button" 
                                                        title="Editar variable"
                                                        onClick={() => handleStartEditVariable(v)}
                                                        className="text-muted-foreground hover:text-indigo-500 p-1 rounded hover:bg-muted/60 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        title="Eliminar variable"
                                                        onClick={() => handleRemoveVariable(v.id)}
                                                        className="text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-muted/60 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div 
                                                className="cursor-pointer"
                                                onClick={() => handleStartEditVariable(v)}
                                                title="Haz clic para editar esta variable"
                                            >
                                                <p className="text-xs font-semibold text-foreground line-clamp-1 hover:text-indigo-500 transition-colors">
                                                    {v.label}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground font-mono bg-muted/40 p-1 rounded line-clamp-2 mt-1">
                                                    Original: &ldquo;{v.originalText}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer de acción hacia el Paso 3 */}
                        <div className="p-2.5 sm:p-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentStep("upload")}
                                className="h-8 text-xs cursor-pointer"
                            >
                                ← Volver
                            </Button>
                            <Button 
                                size="sm" 
                                disabled={variables.length === 0}
                                onClick={() => setCurrentStep("fill")}
                                className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                            >
                                Diligenciar Nuevo Caso →
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* PASO 3: DILIGENCIAR NUEVO CASO (FORMULARIO O COPILOTO IA) */}
            {currentStep === "fill" && (() => {
                const requiredVars = variables.filter(v => v.required !== false);
                const totalRequired = requiredVars.length;
                const filledRequiredCount = requiredVars.filter(v => {
                    if (v.type === "signature") {
                        return Boolean(signatures[v.id]);
                    }
                    return Boolean(formValues[v.id] && formValues[v.id].trim());
                }).length;
                const missingCount = totalRequired - filledRequiredCount;
                const integrityPercent = totalRequired > 0 ? Math.round((filledRequiredCount / totalRequired) * 100) : 100;
                const isFullyComplete = totalRequired > 0 ? filledRequiredCount === totalRequired : true;
                const aiVarsCount = variables.filter(v => isAiVariableType(v.type)).length;
                const signatureVarsCount = variables.filter(v => v.type === "signature").length;

                // Filtrado dinámico de variables para el formulario
                const filteredVariables = variables.filter(v => {
                    if (formSearchQuery.trim()) {
                        const q = formSearchQuery.toLowerCase();
                        const matchLabel = v.label.toLowerCase().includes(q);
                        const matchId = v.id.toLowerCase().includes(q);
                        const matchOrig = v.originalText.toLowerCase().includes(q);
                        if (!matchLabel && !matchId && !matchOrig) return false;
                    }
                    if (formFilterCategory === "missing") {
                        const isRequired = v.required !== false;
                        const isFieldEmpty = v.type === "signature" ? !signatures[v.id] : (!formValues[v.id] || !formValues[v.id].trim());
                        return isRequired && isFieldEmpty;
                    }
                    if (formFilterCategory === "ai") {
                        return isAiVariableType(v.type);
                    }
                    if (formFilterCategory === "signatures") {
                        return v.type === "signature";
                    }
                    return true;
                });

                return (
                    <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden w-full">
                        {/* Cabecera Principal del Paso 3 (Fija) */}
                        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 p-3 sm:p-4 border-b border-border shrink-0 bg-muted/20">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                                        Diligenciamiento de Caso: <span className="text-indigo-500 font-mono text-sm sm:text-base">{fileName}</span>
                                    </h2>
                                    <Badge variant="outline" className="text-xs bg-muted/60 text-muted-foreground border-border">
                                        {variables.length} variables detectadas
                                    </Badge>
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "text-xs font-semibold",
                                            isFullyComplete 
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                        )}
                                    >
                                        {isFullyComplete ? "✓ Completo" : `${filledRequiredCount}/${totalRequired} obligatorios`}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                    Aprovecha la pantalla completa: escribe el caso con IA o diligencia campo por campo mientras visualizas el documento en vivo.
                                </p>
                            </div>

                            {/* Controles de Modo y Disposición de Pantalla */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start xl:self-auto">
                                {/* Selector de Modo: IA vs Formulario */}
                                <div className="flex items-center rounded-xl bg-muted/40 p-1 border border-border">
                                    <button
                                        type="button"
                                        onClick={() => setFillMode("ai-copilot")}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                            fillMode === "ai-copilot" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Copiloto IA</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFillMode("form")}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                            fillMode === "form" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Formulario ({variables.length})</span>
                                    </button>
                                </div>

                                {/* Selector de Disposición: Pantalla Dividida vs Pantalla Completa */}
                                <div className="hidden lg:flex items-center rounded-xl bg-muted/40 p-1 border border-border">
                                    <button
                                        type="button"
                                        onClick={() => setFillLayoutMode("split")}
                                        title="Vista Dividida: Formulario + Documento Word en Vivo"
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                            fillLayoutMode === "split" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Columns2 className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Vista Dividida</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFillLayoutMode("full")}
                                        title="Modo Ampliado: Solo Formulario a Pantalla Completa"
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                            fillLayoutMode === "full" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                        <span>Formulario Amplio</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Contenedor Principal: Split View o Full Width */}
                        <div className={cn(
                            "w-full flex-1 min-h-0 h-full overflow-hidden p-3 sm:p-4",
                            fillLayoutMode === "split" ? "grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch" : "flex flex-col"
                        )}>
                            {/* Panel Izquierdo: Formulario Guiado o Copiloto IA (Con scroll interno independiente) */}
                            <div className={cn(
                                "flex flex-col h-full min-h-0 overflow-y-auto space-y-4 pr-1",
                                fillLayoutMode === "split" ? "lg:col-span-7 xl:col-span-7 2xl:col-span-7" : "w-full flex-1"
                            )}>
                                {/* MODO A: COPILOTO IA */}
                                {fillMode === "ai-copilot" ? (
                                    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                                    Cuéntale a la IA los detalles o la historia del nuevo caso:
                                                </label>
                                                {caseStory && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setCaseStory("")}
                                                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-red-500 cursor-pointer gap-1"
                                                    >
                                                        <Eraser className="w-3.5 h-3.5" />
                                                        Limpiar
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Pega notas, audios transcritos, correos o un resumen informal. El motor de IA extraerá los datos exactos (nombres, cédulas, montos, fechas) y redactará automáticamente los párrafos jurídicos y técnicos en su formato formal.
                                            </p>
                                        </div>

                                        {/* Casos Rápidos Predefinidos (Presets) */}
                                        <div className="space-y-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Zap className="w-3 h-3 text-amber-500" />
                                                Plantillas de Casos Rápidos (Haz clic para probar):
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {CASE_STORY_PRESETS.map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setCaseStory(preset.story);
                                                            toast.success(`Caso cargado: ${preset.title}`);
                                                        }}
                                                        className="p-2.5 rounded-xl border border-border bg-background/80 hover:bg-indigo-500/10 hover:border-indigo-500/40 text-left transition-all cursor-pointer group shadow-2xs"
                                                    >
                                                        <p className="text-xs font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                            {preset.title}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                                            {preset.description}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Área de Texto Principal */}
                                        <div className="space-y-1.5">
                                            <textarea 
                                                rows={9}
                                                placeholder="Ejemplo: Durante el período del 01 al 30 de septiembre de 2026, el contratista Juan Carlos Pérez Gómez, con cédula 1.098.765.432, cumplió a satisfacción con las actividades pactadas en el contrato de prestación de servicios No. 087 de 2026 por valor de $4.500.000..."
                                                value={caseStory}
                                                onChange={(e) => setCaseStory(e.target.value)}
                                                className="w-full p-4 rounded-xl border border-border bg-background text-xs text-foreground font-sans leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                            />
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                                                <span>💡 Incluye nombres, cédulas, fechas, cifras y detalles de los hechos.</span>
                                                <div className="flex items-center gap-3 font-mono text-[10px]">
                                                    <span>{caseStory.trim().split(/\s+/).filter(Boolean).length} palabras</span>
                                                    <span>{caseStory.length} caracteres</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botón de Acción Principal */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setFillMode("form")}
                                                className="w-full sm:w-auto h-10 text-xs cursor-pointer gap-2"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Preferir Diligenciamiento Manual
                                            </Button>

                                            <Button 
                                                onClick={handleFillWithAiCase}
                                                disabled={isFillingWithAi || !caseStory.trim()}
                                                className="w-full sm:w-auto h-10 px-6 font-bold text-xs gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white cursor-pointer shadow-md disabled:opacity-50"
                                            >
                                                {isFillingWithAi ? (
                                                    <>
                                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                                        <span>Extrayendo y diligenciando plantilla...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="w-4 h-4" />
                                                        <span>✨ Diligenciar Formato Automáticamente con IA</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* MODO B: FORMULARIO GUIADO */
                                    <div className="space-y-5">
                                        {/* Barra de Integridad del Documento */}
                                        <div className="p-3.5 rounded-2xl border border-border bg-card/80 shadow-2xs space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn(
                                                        "p-2 rounded-xl border shrink-0",
                                                        isFullyComplete 
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                                                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                                    )}>
                                                        {isFullyComplete ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-bold text-foreground">
                                                                Control de Integridad del Documento
                                                            </h4>
                                                            <Badge 
                                                                variant="outline" 
                                                                className={cn(
                                                                    "text-[10px] font-semibold py-0 px-2",
                                                                    isFullyComplete 
                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                                )}
                                                            >
                                                                {isFullyComplete ? "100% Íntegro" : `${filledRequiredCount}/${totalRequired} Requeridos`}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            {isFullyComplete 
                                                                ? "Todos los campos obligatorios han sido diligenciados correctamente." 
                                                                : `Faltan ${missingCount} campo(s) obligatorio(s) por completar antes de descargar.`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <span className="text-xs font-mono font-bold text-foreground">
                                                        {integrityPercent}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                <div 
                                                    className={cn(
                                                        "h-full transition-all duration-300 rounded-full",
                                                        isFullyComplete 
                                                            ? "bg-emerald-500" 
                                                            : integrityPercent > 50 
                                                                ? "bg-gradient-to-r from-amber-500 to-indigo-500" 
                                                                : "bg-amber-500"
                                                    )}
                                                    style={{ width: `${integrityPercent}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Barra de Herramientas: Búsqueda, Filtros y Acciones Rápidas */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-xl bg-muted/30 border border-border">
                                            {/* Buscador en vivo */}
                                            <div className="relative flex-1">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                                                <Input 
                                                    type="text"
                                                    placeholder="Buscar campo por nombre o variable..."
                                                    value={formSearchQuery}
                                                    onChange={(e) => setFormSearchQuery(e.target.value)}
                                                    className="h-8 pl-8 pr-7 text-xs bg-background"
                                                />
                                                {formSearchQuery && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFormSearchQuery("")}
                                                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>

                                            {/* Filtros de Categoría */}
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                                                <Button
                                                    type="button"
                                                    variant={formFilterCategory === "all" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setFormFilterCategory("all")}
                                                    className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer shrink-0"
                                                >
                                                    Todos ({variables.length})
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={formFilterCategory === "missing" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setFormFilterCategory("missing")}
                                                    className={cn(
                                                        "h-7 px-2.5 text-[11px] font-semibold cursor-pointer shrink-0",
                                                        missingCount > 0 && formFilterCategory !== "missing" && "text-amber-600 dark:text-amber-400"
                                                    )}
                                                >
                                                    Faltantes ({missingCount})
                                                </Button>
                                                {aiVarsCount > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant={formFilterCategory === "ai" ? "default" : "ghost"}
                                                        size="sm"
                                                        onClick={() => setFormFilterCategory("ai")}
                                                        className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer shrink-0"
                                                    >
                                                        IA ({aiVarsCount})
                                                    </Button>
                                                )}
                                                {signatureVarsCount > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant={formFilterCategory === "signatures" ? "default" : "ghost"}
                                                        size="sm"
                                                        onClick={() => setFormFilterCategory("signatures")}
                                                        className="h-7 px-2.5 text-[11px] font-semibold cursor-pointer shrink-0"
                                                    >
                                                        Firmas ({signatureVarsCount})
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Botones de Autocompletado / Limpieza */}
                                            <div className="flex items-center gap-1.5 shrink-0 border-t sm:border-t-0 sm:border-l border-border pt-1.5 sm:pt-0 sm:pl-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleAutofillOriginals}
                                                    title="Llenar todos los campos con los textos originales de la plantilla"
                                                    className="h-7 px-2 text-[11px] cursor-pointer"
                                                >
                                                    <Zap className="w-3 h-3 mr-1 text-amber-500" />
                                                    Originales
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearFormValues}
                                                    title="Limpiar todos los valores del formulario"
                                                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-red-500 cursor-pointer"
                                                >
                                                    <Eraser className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Lista de Campos del Formulario */}
                                        {filteredVariables.length === 0 ? (
                                            <div className="text-center py-12 rounded-2xl border border-dashed border-border p-6 space-y-2">
                                                <Filter className="w-6 h-6 text-muted-foreground mx-auto" />
                                                <p className="text-xs font-bold text-foreground">No se encontraron campos</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Ningún campo coincide con el filtro o búsqueda actual.
                                                </p>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => { setFormFilterCategory("all"); setFormSearchQuery(""); }}
                                                    className="h-7 text-xs cursor-pointer mt-2"
                                                >
                                                    Restablecer Filtros
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "gap-4",
                                                fillLayoutMode === "split" 
                                                    ? "grid grid-cols-1 xl:grid-cols-2" 
                                                    : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                                            )}>
                                                {filteredVariables.map((v) => {
                                                    const val = formValues[v.id] ?? "";
                                                    const isAi = isAiVariableType(v.type);
                                                    const typeConf = VARIABLE_TYPE_CONFIG[v.type || "text"] || VARIABLE_TYPE_CONFIG.text;
                                                    const TypeIcon = typeConf.icon;
                                                    const isRequired = v.required !== false;
                                                    const isFieldEmpty = v.type === "signature" ? !signatures[v.id] : (!val || !val.trim());
                                                    const hasIntegrityIssue = isRequired && isFieldEmpty;
                                                    const isFocused = activeFocusedVarId === v.id;

                                                    return (
                                                        <div 
                                                            key={v.id} 
                                                            id={`var-card-${v.id}`}
                                                            onClick={() => setActiveFocusedVarId(v.id)}
                                                            className={cn(
                                                                "space-y-2.5 p-4 rounded-xl border bg-card/80 shadow-2xs transition-all",
                                                                hasIntegrityIssue ? "border-amber-500/40 bg-amber-500/5" : "border-border/80",
                                                                isFocused && "ring-2 ring-indigo-500 border-indigo-500 shadow-md",
                                                                isAi && (fillLayoutMode === "split" ? "xl:col-span-2" : "md:col-span-2 xl:col-span-3 2xl:col-span-4")
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <span className={cn("p-1.5 rounded-lg bg-muted/70 shrink-0", typeConf.accentColor)}>
                                                                        <TypeIcon className="w-3.5 h-3.5" />
                                                                    </span>
                                                                    <label className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                                                                        <span>{v.label}</span>
                                                                        {isRequired && (
                                                                            <span className="text-red-500 font-bold text-xs" title="Campo Requerido">*</span>
                                                                        )}
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {isRequired ? (
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className={cn(
                                                                                "text-[9px] font-semibold py-0 px-1.5 rounded-full border",
                                                                                hasIntegrityIssue 
                                                                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40" 
                                                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                                            )}
                                                                        >
                                                                            {hasIntegrityIssue ? "Requerido" : "✓ Listo"}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[9px] text-muted-foreground border-border py-0 px-1.5">
                                                                            Opcional
                                                                        </Badge>
                                                                    )}
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={cn("text-[9px] font-semibold py-0 px-2 rounded-full border", typeConf.badgeClass)}
                                                                    >
                                                                        {typeConf.label}
                                                                    </Badge>
                                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                                        {`{{${v.id}}}`}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Control dinámico según el tipo de variable */}
                                                            {isAi ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/70 shadow-2xs">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                                                Estilo:
                                                                            </span>
                                                                            <Select 
                                                                                value={selectedPresetIdForVar[v.id] || v.promptPresetId || "juridico"} 
                                                                                onValueChange={(val) => setSelectedPresetIdForVar(prev => ({ ...prev, [v.id]: val }))}
                                                                            >
                                                                                <SelectTrigger className="h-7 text-xs font-medium max-w-[210px] bg-background">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {promptPresets.map(preset => (
                                                                                        <SelectItem key={preset.id} value={preset.id} className="text-xs">
                                                                                            {preset.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>

                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                onClick={() => handleOpenPromptPresetsModal(selectedPresetIdForVar[v.id] || v.promptPresetId || "juridico")}
                                                                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                                                                title="Definir y personalizar tipos de prompt de redacción"
                                                                            >
                                                                                <Settings2 className="w-3 h-3 mr-1" />
                                                                                Personalizar
                                                                            </Button>
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                                            {lastRefinedDraft[v.id] && (
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="sm" 
                                                                                    onClick={() => handleUndoRefine(v.id)}
                                                                                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                                                                    title="Deshacer y restaurar borrador anterior"
                                                                                >
                                                                                    <Undo2 className="w-3 h-3 mr-1" />
                                                                                    Deshacer
                                                                                </Button>
                                                                            )}
                                                                            <Button 
                                                                                size="sm" 
                                                                                disabled={refiningVarId === v.id || !val?.trim()}
                                                                                onClick={() => handleRefineParagraphWithAi(v)}
                                                                                className="h-7 px-3 text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                                                                            >
                                                                                {refiningVarId === v.id ? (
                                                                                    <>
                                                                                        <RotateCcw className="w-3 h-3 animate-spin" />
                                                                                        <span>Redactando...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Wand2 className="w-3 h-3" />
                                                                                        <span>✨ Corregir con IA</span>
                                                                                    </>
                                                                                )}
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    <textarea 
                                                                        rows={5}
                                                                        value={val}
                                                                        placeholder={(() => {
                                                                            switch (v.type) {
                                                                                case "ai_summary":
                                                                                    return "Escribe o pega los antecedentes y hechos que deseas sintetizar en el resumen ejecutivo...";
                                                                                case "ai_analysis":
                                                                                    return "Escribe las observaciones técnicas, consideraciones de hecho o argumentos clave...";
                                                                                case "ai_risk":
                                                                                    return "Registra los hallazgos observados, factores de riesgo y medidas de mitigación...";
                                                                                case "ai_conclusion":
                                                                                    return "Escribe las conclusiones, concepto de viabilidad o peticiones formales...";
                                                                                case "ai_translation":
                                                                                    return "Escribe el texto a traducir o redactar en versión bilingüe formal...";
                                                                                case "legal_citation":
                                                                                    return "Indica la materia jurídica, sentencias (ej: T-760/08) o normas aplicables a citar...";
                                                                                default:
                                                                                    return v.originalText 
                                                                                        ? `Escribe tu borrador, hechos o notas aquí... (Texto original: "${v.originalText.slice(0, 90)}...")` 
                                                                                        : "Escribe tu borrador, hechos o notas aquí...";
                                                                            }
                                                                        })()}
                                                                        onChange={(e) => setFormValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                        className="w-full p-3 rounded-xl border border-border bg-background text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                                                                    />

                                                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                                                                        <span>
                                                                            💡 Escribe notas o borrador informal. Pulsa <strong>"Corregir con IA"</strong> para redactar.
                                                                        </span>
                                                                        <span>{val?.length || 0} caracteres</span>
                                                                    </div>
                                                                </div>
                                                            ) : v.type === "dynamic_table" ? (
                                                                <div className="space-y-1">
                                                                    <textarea 
                                                                        rows={4}
                                                                        value={val}
                                                                        placeholder="Fila 1: Actividad | Entregable / Evidencia&#10;Fila 2: Actividad | Entregable / Evidencia"
                                                                        onChange={(e) => setFormValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                        className="w-full p-3 rounded-xl border border-border bg-background text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                                                                    />
                                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                        <TableProperties className="w-3 h-3 text-violet-500" />
                                                                        Escribe una fila por línea para que se inserte en la tabla de Word.
                                                                    </p>
                                                                </div>
                                                            ) : v.type === "currency_words" ? (
                                                                <div className="space-y-1.5">
                                                                    <div className="relative">
                                                                        <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">$</span>
                                                                        <Input 
                                                                            type="text"
                                                                            value={val.split(" (")[0].replace("$", "").trim()}
                                                                            placeholder="Ej: 49743719"
                                                                            onChange={(e) => {
                                                                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                                                                if (!raw) {
                                                                                    setFormValues(prev => ({ ...prev, [v.id]: "" }));
                                                                                    return;
                                                                                }
                                                                                const num = parseInt(raw, 10);
                                                                                const formattedCop = formatCurrencyCOP(num);
                                                                                const inWords = numberToSpanishWords(num);
                                                                                const fullValue = `${formattedCop} (${inWords})`;
                                                                                setFormValues(prev => ({ ...prev, [v.id]: fullValue }));
                                                                            }}
                                                                            className="h-9 text-xs pl-7 bg-background font-mono font-medium"
                                                                        />
                                                                    </div>
                                                                    {val && (
                                                                        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-[11px] text-green-700 dark:text-green-300 font-mono leading-tight">
                                                                            {val}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : v.type === "conditional" ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant={val !== "" ? "default" : "outline"}
                                                                            onClick={() => {
                                                                                setFormValues(prev => ({
                                                                                    ...prev,
                                                                                    [v.id]: prev[v.id] ? "" : v.originalText
                                                                                }));
                                                                            }}
                                                                            className={cn(
                                                                                "h-8 text-xs font-semibold cursor-pointer gap-1.5",
                                                                                val !== "" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""
                                                                            )}
                                                                        >
                                                                            <GitFork className="w-3.5 h-3.5" />
                                                                            {val !== "" ? "✓ Cláusula Incluida (SÍ)" : "✗ Cláusula Excluida (NO)"}
                                                                        </Button>
                                                                        <span className="text-[11px] text-muted-foreground">
                                                                            {val !== "" ? "Se incluirá en el documento" : "Se eliminará este bloque"}
                                                                        </span>
                                                                    </div>
                                                                    {val !== "" && (
                                                                        <Input 
                                                                            value={val}
                                                                            onChange={(e) => setFormValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                            className="h-8 text-xs bg-background"
                                                                            placeholder="Texto de la cláusula a incluir"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : v.type === "signature" ? (
                                                                <div className="space-y-2">
                                                                    {signatures[v.id] ? (
                                                                        <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                                                    <span className="text-xs font-bold text-foreground">Firma Digitalizada Estampada</span>
                                                                                </div>
                                                                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                                                                                    Verificada ✓
                                                                                </Badge>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 dark:border-slate-800">
                                                                                {signatures[v.id].signatureDataUrl && (
                                                                                    <img 
                                                                                        src={signatures[v.id].signatureDataUrl} 
                                                                                        alt="Firma" 
                                                                                        className="h-10 max-w-[120px] object-contain"
                                                                                    />
                                                                                )}
                                                                                <div className="text-[11px] leading-tight text-slate-800">
                                                                                    <p className="font-bold">{signatures[v.id].signerName}</p>
                                                                                    {signatures[v.id].signerId && <p className="text-[10px] text-slate-500">ID: {signatures[v.id].signerId}</p>}
                                                                                    <p className="text-[9px] text-slate-400 font-mono">{signatures[v.id].verificationCode}</p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center justify-between pt-1">
                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                    {new Date(signatures[v.id].signedAt).toLocaleDateString("es-CO")}
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => setActiveSignatureModalVar(v)}
                                                                                        className="h-6 text-[10px] px-2 cursor-pointer"
                                                                                    >
                                                                                        <Edit2 className="w-3 h-3 mr-1" />
                                                                                        Modificar
                                                                                    </Button>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            setSignatures(prev => {
                                                                                                const next = { ...prev };
                                                                                                delete next[v.id];
                                                                                                return next;
                                                                                            });
                                                                                            setFormValues(prev => ({ ...prev, [v.id]: "" }));
                                                                                        }}
                                                                                        className="h-6 text-[10px] px-1.5 text-red-500 hover:text-red-600 cursor-pointer"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {isRequired ? "Esta variable requiere firma obligatoria del responsable." : "Puedes estampar tu firma digitalizada en este campo."}
                                                                            </p>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                onClick={() => setActiveSignatureModalVar(v)}
                                                                                className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                                                                            >
                                                                                <PenTool className="w-3.5 h-3.5" />
                                                                                ✍️ Estampar Firma Digitalizada
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : v.type === "date_range" ? (
                                                                <div className="space-y-1.5">
                                                                    <Input 
                                                                        value={val}
                                                                        placeholder='Ej: Del 01 de septiembre al 30 de septiembre de 2026'
                                                                        onChange={(e) => setFormValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                        className="h-9 text-xs bg-background"
                                                                    />
                                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                        <CalendarRange className="w-3 h-3 text-teal-500" />
                                                                        Período de ejecución o vigencia contractual.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <Input 
                                                                    value={val}
                                                                    type={v.type === "date" ? "date" : v.type === "number" ? "number" : "text"}
                                                                    placeholder={`Original: "${v.originalText}"`}
                                                                    onChange={(e) => setFormValues(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                                    className="h-9 text-xs bg-background"
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Barra de Acciones del Formulario */}
                                        <div className="shrink-0 pt-3 pb-1 border-t border-border flex items-center justify-between bg-card/95 backdrop-blur-xs sticky bottom-0 z-10">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setCurrentStep("mark")}
                                                className="h-8 text-xs cursor-pointer"
                                            >
                                                ← Volver al Marcado
                                            </Button>
                                            <Button 
                                                onClick={handleTriggerCompileDocx}
                                                disabled={isGeneratingDocx}
                                                className="h-8 px-5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md"
                                            >
                                                {isGeneratingDocx ? "Generando Word..." : "Compilar y Ver Documento Final →"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Panel Derecho: Previsualizador del Documento Word en Vivo (Split View) */}
                            {fillLayoutMode === "split" && (
                                <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 flex flex-col h-full min-h-0 overflow-hidden">
                                    <div className="rounded-2xl border border-border bg-card shadow-sm p-3 flex flex-col h-full min-h-0 overflow-hidden">
                                        <div className="flex items-center justify-between pb-2.5 border-b border-border shrink-0">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                <h3 className="text-xs font-bold text-foreground">
                                                    Documento Base en Vivo
                                                </h3>
                                                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                                                    {variables.length} variables
                                                </Badge>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <MousePointerClick className="w-3 h-3 text-indigo-500" />
                                                Clic para saltar al campo
                                            </span>
                                        </div>

                                        <div className="flex-1 min-h-0 overflow-hidden pt-2.5">
                                            {rawZipBuffer ? (
                                                <WordDocumentViewer 
                                                    file={rawZipBuffer}
                                                    highlightVariables={variables.map(v => ({
                                                        id: v.id,
                                                        label: v.label,
                                                        type: v.type,
                                                        originalText: v.originalText
                                                    }))}
                                                    onVariableClick={(varId) => {
                                                        setActiveFocusedVarId(varId);
                                                        setFillMode("form");
                                                        setFormFilterCategory("all");
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`var-card-${varId}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                                                            }
                                                        }, 100);
                                                    }}
                                                    className="h-full w-full"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                                                    <p className="text-xs">Cargando documento original...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* PASO 4: PREVISUALIZACIÓN Y DESCARGA .DOCX Y .PDF */}
            {currentStep === "download" && (
                <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden w-full">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 sm:p-4 border-b border-border shrink-0 bg-muted/20">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-base sm:text-lg font-bold text-foreground">
                                    ¡Documento Diligenciado con Éxito!
                                </h2>
                                {missingRequiredVariables.length === 0 ? (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                                        ✓ 100% Íntegro
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium">
                                        ⚠️ {missingRequiredVariables.length} campo(s) omitidos
                                    </Badge>
                                )}
                                {Object.keys(signatures).length > 0 && (
                                    <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-medium">
                                        ✍️ {Object.keys(signatures).length} Firma(s) Verificadas
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                Se aplicaron todas las variables, firmas y estilos conservando la tipografía y formato original.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentStep("fill")}
                                className="h-8 text-xs cursor-pointer"
                            >
                                ← Modificar Datos
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportProject}
                                className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-muted"
                                title="Guardar el proyecto completo con variables, respuestas y firmas en formato JSON"
                            >
                                <FileJson className="w-3.5 h-3.5 text-emerald-500" />
                                Guardar (.json)
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm" 
                                onClick={handlePrintOrSavePdf}
                                className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-muted"
                                title="Abre el diálogo para imprimir o guardar como PDF respetando exactamente los márgenes, fuentes y tablas originales"
                            >
                                <Printer className="w-3.5 h-3.5 text-blue-500" />
                                <span>Imprimir Original</span>
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleExportPdf}
                                className="h-8 px-3 text-xs font-bold gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white cursor-pointer shadow-xs"
                                title="Exporta a PDF respetando estrictamente el 100% del formato, tablas, fuentes y firmas originales de Word"
                            >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>Exportar PDF Fiel</span>
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleDownloadDocxFile}
                                className="h-8 px-3.5 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar Word (.docx)</span>
                            </Button>
                        </div>
                    </div>

                    {/* Previsualización Oficial en Microsoft Word con scroll interno */}
                    <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-2.5 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 shrink-0">
                            <div className="flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="font-semibold">
                                    Fidelidad Estricta Garantizada:
                                </span>
                                <span className="text-muted-foreground text-[11px] line-clamp-1">
                                    Tanto la impresión como el PDF conservan el 100% de las tablas, márgenes, tipografía y firmas del formato original.
                                </span>
                            </div>
                            <span className="text-[10px] font-mono font-medium text-blue-600 dark:text-blue-300 shrink-0">
                                Vectorial · Multi-página · 1:1 Word
                            </span>
                        </div>

                        <div className="flex-1 min-h-0 overflow-hidden w-full rounded-xl border border-border">
                            {generatedBlob ? (
                                <WordDocumentViewer 
                                    file={generatedBlob} 
                                    className="h-full w-full" 
                                />
                            ) : (
                                <div className="p-12 text-center text-xs text-muted-foreground">
                                    Compilando vista previa del documento...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-2.5 sm:p-3 border-t border-border shrink-0 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Archivo generado a partir de: <strong>{fileName}</strong></span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                setFormValues({});
                                setCaseStory("");
                                setCurrentStep("fill");
                            }}
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer"
                        >
                            + Diligenciar otro caso con esta misma plantilla
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal para Crear o Editar Variable (Diseño Amplio, Espacioso y Organizado) */}
            <Dialog 
                open={isSelectionModalOpen} 
                onOpenChange={(open) => {
                    setIsSelectionModalOpen(open);
                    if (!open) {
                        setEditingVariable(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[94vw] p-0 overflow-hidden rounded-2xl border-border bg-background shadow-2xl">
                    <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border bg-card/60 shrink-0">
                        <div className="flex items-center justify-between gap-3 pr-6">
                            <div className="space-y-1">
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    {editingVariable ? (
                                        <>
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                <Edit2 className="w-4 h-4" />
                                            </div>
                                            <span>Editar Variable:</span>
                                            <span className="font-mono text-indigo-500 font-bold">{`{{${editingVariable.id}}}`}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                <MousePointerClick className="w-4 h-4" />
                                            </div>
                                            <span>Convertir Texto en Variable</span>
                                        </>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    {editingVariable 
                                        ? "Modifica el identificador, tipo de variable, etiqueta o directrices para este campo de Word."
                                        : "Define el identificador técnico, clasifica el tipo de dato y configura las directrices de reemplazo."
                                    }
                                </DialogDescription>
                            </div>
                            <Badge 
                                variant="outline" 
                                className={cn(
                                    "text-[10px] font-semibold py-1 px-2.5 rounded-full shrink-0 border",
                                    isAiVariableType(newVarType) 
                                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" 
                                        : "bg-muted/70 text-muted-foreground border-border"
                                )}
                            >
                                {isAiVariableType(newVarType) ? "🤖 Variable con IA" : "📋 Variable General"}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                        {/* 1. Bloque de Texto Original de Word */}
                        <div className="space-y-1.5 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                                    Texto Original en Word (a reemplazar):
                                </label>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {selectedSnippet?.length || 0} caracteres • Coincidencia exacta
                                </span>
                            </div>
                            <textarea 
                                rows={2}
                                value={selectedSnippet}
                                onChange={(e) => setSelectedSnippet(e.target.value)}
                                placeholder="Texto exacto en el documento Word..."
                                className="w-full p-2.5 rounded-lg border border-border bg-background font-mono text-xs max-h-24 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Al diligenciar la plantilla, este texto exacto será sustituido por el nuevo valor ingresado o generado por la IA.
                            </p>
                        </div>

                        {/* 2. Grid de 2 Columnas para Configuración Principal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Columna Izquierda: Identificador y Etiqueta */}
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                        <span>Identificador Técnico (ID):</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">Clave en plantilla</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-xs text-indigo-500 font-mono font-bold">{"{{"}</span>
                                        <Input 
                                            value={newVarId}
                                            onChange={(e) => setNewVarId(e.target.value)}
                                            placeholder="ej: nombre_accionante"
                                            className="h-9 pl-7 pr-7 text-xs font-mono bg-background"
                                        />
                                        <span className="absolute right-2.5 top-2 text-xs text-indigo-500 font-mono font-bold">{"}}"}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                        <span>Etiqueta para el Formulario:</span>
                                        <span className="text-[10px] text-muted-foreground">Visible al usuario</span>
                                    </label>
                                    <Input 
                                        value={newVarLabel}
                                        onChange={(e) => setNewVarLabel(e.target.value)}
                                        placeholder="ej: Nombre Completo del Demandante"
                                        className="h-9 text-xs bg-background"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30">
                                    <div className="space-y-0.5 pr-2">
                                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                            <span>Campo Obligatorio / Requerido</span>
                                            {newVarRequired && <span className="text-red-500 font-bold">*</span>}
                                        </label>
                                        <p className="text-[10px] text-muted-foreground">
                                            Exigir diligenciamiento para garantizar la integridad del documento.
                                        </p>
                                    </div>
                                    <Switch 
                                        checked={newVarRequired}
                                        onCheckedChange={setNewVarRequired}
                                    />
                                </div>
                            </div>

                            {/* Columna Derecha: Tipo de Dato y Tarjeta Informativa */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Tipo de Variable:</span>
                                    <span className="text-[10px] text-muted-foreground">Comportamiento</span>
                                </label>
                                <Select value={newVarType} onValueChange={(v: any) => setNewVarType(v)}>
                                    <SelectTrigger className="h-9 text-xs bg-background w-full">
                                        <SelectValue placeholder="Selecciona el tipo de variable">
                                            {(() => {
                                                const conf = VARIABLE_TYPE_CONFIG[newVarType] || VARIABLE_TYPE_CONFIG.text;
                                                const IconComp = conf.icon;
                                                return (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <IconComp className={cn("w-3.5 h-3.5 shrink-0", conf.accentColor)} />
                                                        <span className="font-semibold truncate">{conf.label}</span>
                                                    </div>
                                                );
                                            })()}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-84 w-[340px]">
                                        {/* GRUPO 1: VARIABLES IA */}
                                        <SelectGroup>
                                            <SelectLabel className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 rounded-md my-1">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                Variables con Inteligencia Artificial (IA)
                                            </SelectLabel>
                                            {Object.entries(VARIABLE_TYPE_CONFIG)
                                                .filter(([_, conf]) => conf.category === "ai")
                                                .map(([typeKey, conf]) => {
                                                    const IconComp = conf.icon;
                                                    return (
                                                        <SelectItem key={typeKey} value={typeKey} className="text-xs py-2 cursor-pointer">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className={cn("p-1 rounded-md bg-muted/60 shrink-0", conf.accentColor)}>
                                                                    <IconComp className="w-3.5 h-3.5" />
                                                                </span>
                                                                <div className="flex flex-col text-left min-w-0">
                                                                    <span className="font-semibold text-foreground text-xs leading-tight">
                                                                        {conf.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">
                                                                        {conf.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                        </SelectGroup>

                                        <SelectSeparator className="my-1.5" />

                                        {/* GRUPO 2: VARIABLES GENERALES */}
                                        <SelectGroup>
                                            <SelectLabel className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-md my-1">
                                                <Layers className="w-3.5 h-3.5 text-blue-500" />
                                                Variables Generales y Formato
                                            </SelectLabel>
                                            {Object.entries(VARIABLE_TYPE_CONFIG)
                                                .filter(([_, conf]) => conf.category === "general")
                                                .map(([typeKey, conf]) => {
                                                    const IconComp = conf.icon;
                                                    return (
                                                        <SelectItem key={typeKey} value={typeKey} className="text-xs py-2 cursor-pointer">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className={cn("p-1 rounded-md bg-muted/60 shrink-0", conf.accentColor)}>
                                                                    <IconComp className="w-3.5 h-3.5" />
                                                                </span>
                                                                <div className="flex flex-col text-left min-w-0">
                                                                    <span className="font-semibold text-foreground text-xs leading-tight">
                                                                        {conf.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">
                                                                        {conf.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>

                                {/* Tarjeta explicativa del tipo seleccionado */}
                                {(() => {
                                    const conf = VARIABLE_TYPE_CONFIG[newVarType] || VARIABLE_TYPE_CONFIG.text;
                                    const IconComp = conf.icon;
                                    return (
                                        <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 flex items-start gap-2">
                                            <span className={cn("p-1 rounded-md bg-background border border-border/60 shrink-0 mt-0.5", conf.accentColor)}>
                                                <IconComp className="w-3.5 h-3.5" />
                                            </span>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                {conf.description}
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 3. Panel de Configuración Especial de Copiloto IA (Sólo para variables IA) */}
                        {isAiVariableType(newVarType) && (
                            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                                <div className="flex items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <h4 className="text-xs font-bold text-foreground">
                                            Copiloto de Redacción IA para este Campo
                                        </h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPromptPresetsModal(newVarPromptPresetId)}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        <Settings2 className="w-3 h-3" />
                                        Gestionar Prompts de Biblioteca
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                            <span>Estilo de Prompt Sugerido:</span>
                                        </label>
                                        <Select 
                                            value={newVarPromptPresetId} 
                                            onValueChange={(v) => setNewVarPromptPresetId(v)}
                                        >
                                            <SelectTrigger className="h-9 text-xs bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {promptPresets.map(preset => (
                                                    <SelectItem key={preset.id} value={preset.id} className="text-xs">
                                                        {preset.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                                            {promptPresets.find(p => p.id === newVarPromptPresetId)?.description}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground">
                                            Directriz Especial para este Campo (Opcional):
                                        </label>
                                        <Input 
                                            value={newVarGuideline}
                                            onChange={(e) => setNewVarGuideline(e.target.value)}
                                            placeholder={(() => {
                                                switch (newVarType) {
                                                    case "ai_summary":
                                                        return "ej: Máximo 3 párrafos, resaltar monto y plazo";
                                                    case "ai_analysis":
                                                        return "ej: Argumentar conveniencia y necesidad pública";
                                                    case "ai_risk":
                                                        return "ej: Clasificar riesgo alto/medio y mitigación";
                                                    case "legal_citation":
                                                        return "ej: Citar sentencias de tutela de la Corte Constitucional";
                                                    default:
                                                        return "ej: Redactar cronológicamente con fechas claras";
                                                }
                                            })()}
                                            className="h-9 text-xs bg-background"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Pautas adicionales que la IA seguirá al redactar este campo en el Paso 3.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between shrink-0">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setIsSelectionModalOpen(false);
                                setEditingVariable(null);
                            }}
                            className="h-8 text-xs cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleSaveSelectedVariable}
                            className="h-8 px-5 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                        >
                            <Check className="w-3.5 h-3.5" />
                            {editingVariable ? "Actualizar Variable" : "Guardar Variable"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Gestión y Biblioteca de Prompts de Redacción (Diseño Master-Detail Amplio y Editable) */}
            <Dialog open={isPromptPresetsModalOpen} onOpenChange={setIsPromptPresetsModalOpen}>
                <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[96vw] h-[88vh] max-h-[88vh] p-0 flex flex-col gap-0 overflow-hidden border-border bg-background shadow-2xl rounded-2xl">
                    <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border bg-card/60 shrink-0">
                        <div className="flex items-center justify-between gap-3 pr-6">
                            <div className="space-y-1">
                                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <Sparkles className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <span>Biblioteca y Editor de Estilos de Prompt para Redacción IA</span>
                                    <Badge variant="outline" className="text-xs font-semibold py-0 px-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                                        {promptPresets.length} estilos
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Visualiza, edita o crea libremente las instrucciones del sistema (System Prompts). Define el rigor jurídico, administrativo, académico o directrices personalizadas para que la IA redacte los párrafos narrativos.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Contenedor Master-Detail de 2 Columnas */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                        {/* COLUMNA IZQUIERDA: Selector de Estilos (Master) */}
                        <div className="md:col-span-5 lg:col-span-4 border-r border-border flex flex-col min-h-0 bg-muted/20">
                            <div className="p-3 border-b border-border space-y-2 bg-card/40 shrink-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                                        Estilos Disponibles
                                    </span>
                                    <Button 
                                        size="sm" 
                                        onClick={handleStartCreateNewPreset}
                                        className="h-7 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        + Nuevo Estilo
                                    </Button>
                                </div>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input 
                                        value={presetSearchQuery}
                                        onChange={(e) => setPresetSearchQuery(e.target.value)}
                                        placeholder="Buscar estilo o instrucción..."
                                        className="h-8 pl-8 text-xs bg-background"
                                    />
                                </div>
                            </div>

                            {/* Lista con scroll de estilos */}
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                                {promptPresets
                                    .filter(p => 
                                        p.name.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
                                        p.description.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
                                        p.systemInstruction.toLowerCase().includes(presetSearchQuery.toLowerCase())
                                    )
                                    .map((preset) => {
                                        const isSelected = !isCreatingNewPreset && selectedPresetId === preset.id;
                                        return (
                                            <div 
                                                key={preset.id}
                                                onClick={() => handleSelectPreset(preset)}
                                                className={cn(
                                                    "group p-3 rounded-xl border text-left cursor-pointer transition-all",
                                                    isSelected 
                                                        ? "border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500/40" 
                                                        : "border-border/80 bg-card hover:bg-muted/60 hover:border-border"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-1.5 mb-1">
                                                    <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1">
                                                        {preset.name}
                                                    </h4>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "text-[9px] py-0 px-1.5 font-medium",
                                                                preset.isBuiltIn 
                                                                    ? "bg-muted/80 text-muted-foreground border-border" 
                                                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                            )}
                                                        >
                                                            {preset.isBuiltIn ? "Predefinido" : "Personalizado"}
                                                        </Badge>
                                                        {promptPresets.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeletePreset(preset.id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-opacity cursor-pointer"
                                                                title={`Eliminar "${preset.name}"`}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                                                    {preset.description}
                                                </p>
                                                <div className="p-1.5 rounded-md bg-muted/40 font-mono text-[10px] text-muted-foreground/80 line-clamp-2 border border-border/40">
                                                    {preset.systemInstruction}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: Editor Completo e Inspector (Detail) */}
                        <div className="md:col-span-7 lg:col-span-8 flex flex-col min-h-0 bg-background overflow-hidden">
                            {/* Barra de herramientas del editor */}
                            <div className="p-3.5 px-5 border-b border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                            <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                                            {isCreatingNewPreset ? "Nuevo Estilo de Prompt" : `Editando: ${presetFormName || "Estilo Seleccionado"}`}
                                        </h3>
                                        {!isCreatingNewPreset && (
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground">
                                                ID: {selectedPresetId}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Modifica directamente el texto y pulsa <strong>Guardar Cambios</strong> para actualizar las directrices de la IA.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isCreatingNewPreset && (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => {
                                                    const target = promptPresets.find(p => p.id === selectedPresetId);
                                                    if (target) handleDuplicatePreset(target);
                                                }}
                                                className="h-8 text-xs font-medium gap-1.5 cursor-pointer hover:bg-muted"
                                                title="Crear una copia personalizada de este estilo"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                Duplicar
                                            </Button>

                                            {promptPresets.length > 1 && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleDeletePreset(selectedPresetId)}
                                                    className="h-8 text-xs font-medium gap-1.5 cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                                                    title="Eliminar este estilo de prompt"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Eliminar
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    <Button 
                                        size="sm" 
                                        onClick={handleSaveCurrentPreset}
                                        className="h-8 px-4 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {isCreatingNewPreset ? "Crear Estilo" : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </div>

                            {/* Campos del editor con visibilidad completa */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                            <span>Nombre con Icono / Emoji:</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Visible en lista</span>
                                        </label>
                                        <Input 
                                            value={presetFormName}
                                            onChange={(e) => setPresetFormName(e.target.value)}
                                            placeholder="ej: ⚖️ Lenguaje Jurídico / Procesal"
                                            className="h-9 text-xs bg-card font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                            <span>Descripción Corta del Enfoque:</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Objetivo del estilo</span>
                                        </label>
                                        <Input 
                                            value={presetFormDesc}
                                            onChange={(e) => setPresetFormDesc(e.target.value)}
                                            placeholder="ej: Rigor procesal formal para demandas y alegatos"
                                            className="h-9 text-xs bg-card"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                            Instrucción del Sistema para la IA (System Prompt Completo):
                                        </label>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                            <span>{presetFormInstruction.length} caracteres</span>
                                            <span>•</span>
                                            <span>{presetFormInstruction.trim().split(/\s+/).filter(Boolean).length} palabras</span>
                                        </div>
                                    </div>

                                    <textarea 
                                        rows={12}
                                        value={presetFormInstruction}
                                        onChange={(e) => setPresetFormInstruction(e.target.value)}
                                        placeholder="Escribe la instrucción exacta del sistema para la IA..."
                                        className="w-full min-h-[280px] p-4 rounded-xl border border-border bg-card font-mono text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 text-foreground resize-y shadow-2xs"
                                    />

                                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-muted-foreground space-y-1 mt-1">
                                        <p className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            Directriz de Redacción en Tiempo Real:
                                        </p>
                                        <p className="text-[11px] leading-relaxed">
                                            Este texto se suministra como prompt de sistema cuando el usuario pulsa <strong>"✨ Corregir / Redactar con IA"</strong> en las variables de párrafo narrativo. Puedes personalizarlo libremente para exigir conectores lógicos, citas jurisprudenciales, estructura de hechos o directrices contractuales.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-3 sm:p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between shrink-0">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleRestoreDefaultPresets}
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurar Estilos de Fábrica
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => setIsPromptPresetsModalOpen(false)}
                            className="h-8 px-5 text-xs font-semibold cursor-pointer"
                        >
                            Listo / Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Advertencia de Integridad (Campos Requeridos Pendientes) */}
            <Dialog open={isIntegrityWarningOpen} onOpenChange={setIsIntegrityWarningOpen}>
                <DialogContent className="sm:max-w-md border-amber-500/30 bg-card shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Campos Obligatorios Pendientes
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    El documento contiene variables requeridas sin diligenciar.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                            Detectamos <strong>{missingRequiredVariables.length} campo(s) obligatorio(s)</strong> vacíos. Si continúas, estas partes se generarán con el texto original del Word base o espacios en blanco.
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-muted/30 border border-border">
                            {missingRequiredVariables.map((v) => (
                                <div key={v.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-background border border-border/60">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                        <span className="font-medium text-foreground truncate">{v.label}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                        {`{{${v.id}}}`}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsIntegrityWarningOpen(false);
                                setFillMode("form");
                            }}
                            className="text-xs font-semibold cursor-pointer w-full sm:w-auto"
                        >
                            Volver y Completar
                        </Button>
                        <Button
                            onClick={() => executeGenerateFinalDocx()}
                            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer w-full sm:w-auto"
                        >
                            Compilar de Todos Modos →
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Firma Digitalizada Interactiva */}
            {activeSignatureModalVar && (
                <DigitalSignatureModal
                    isOpen={Boolean(activeSignatureModalVar)}
                    onClose={() => setActiveSignatureModalVar(null)}
                    variableId={activeSignatureModalVar.id}
                    variableLabel={activeSignatureModalVar.label}
                    initialData={signatures[activeSignatureModalVar.id]}
                    onSaveSignature={(sigData) => {
                        setSignatures(prev => ({ ...prev, [sigData.variableId]: sigData }));
                        setFormValues(prev => ({
                            ...prev,
                            [sigData.variableId]: `[Firma Digitalizada: ${sigData.signerName} - ${sigData.verificationCode}]`
                        }));
                    }}
                />
            )}
        </div>
    );
}
