"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, 
    Sparkles, 
    BookOpen, 
    FileCode, 
    ShieldCheck, 
    Download, 
    Copy, 
    Check, 
    RotateCcw, 
    FileArchive, 
    Layers, 
    Settings, 
    KeyRound, 
    ExternalLink, 
    AlertCircle, 
    Cpu, 
    Boxes, 
    Eye, 
    Code2, 
    CheckSquare, 
    Square, 
    FileText, 
    Terminal, 
    GitBranch,
    Github,
    FolderGit2,
    Database,
    Palette,
    UploadCloud,
    Laptop,
    Wand2,
    Plus,
    X,
    Server,
    Shield,
    History,
    SlidersHorizontal,
    Hammer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { MermaidBlock } from "@/features/documentation/components/BlockComponents";
import { 
    analyzeRepoForDocsAction, 
    generateRepoDocsAction,
    generateDocsFromManualAction,
    refineDocWithAiAction
} from "../../actions/gitDocsActions";
import type { 
    RepoAnalysisResult, 
    DocsGenerationOptions, 
    GeneratedDocsResult,
    ReadmeSectionKey,
    MermaidDiagramType,
    DocumentationTone,
    ManualProjectInput
} from "../../services/gitDocsService";
import { PushToGitHubModal, PushFileItem } from "./PushToGitHubModal";

interface GitDocsToolViewProps {
    initialRepoUrl?: string;
    localAccount?: {
        hasLocalAccount: boolean;
        name: string | null;
        email: string | null;
        label: string;
    };
    hasUserGithubToken?: boolean;
    tokenSource?: "personal" | "system" | "env" | "none";
}

export type DocTabKey = 
    | "readme" 
    | "architecture" 
    | "apiDocs" 
    | "deployment" 
    | "security" 
    | "changelog" 
    | "contributing" 
    | "codeOfConduct" 
    | "license" 
    | "gitignore" 
    | "envExample";

const TAB_CONFIG: Record<DocTabKey, { label: string; filename: string; icon: React.ComponentType<any>; color: string }> = {
    readme: { label: "README.md", filename: "README.md", icon: BookOpen, color: "text-blue-500" },
    architecture: { label: "ARCHITECTURE.md", filename: "ARCHITECTURE.md", icon: Boxes, color: "text-cyan-500" },
    apiDocs: { label: "API.md", filename: "API.md", icon: Server, color: "text-emerald-500" },
    deployment: { label: "DEPLOYMENT.md", filename: "DEPLOYMENT.md", icon: UploadCloud, color: "text-orange-500" },
    security: { label: "SECURITY.md", filename: "SECURITY.md", icon: Shield, color: "text-red-500" },
    changelog: { label: "CHANGELOG.md", filename: "CHANGELOG.md", icon: History, color: "text-amber-500" },
    contributing: { label: "CONTRIBUTING.md", filename: "CONTRIBUTING.md", icon: Layers, color: "text-indigo-500" },
    codeOfConduct: { label: "CODE_OF_CONDUCT.md", filename: "CODE_OF_CONDUCT.md", icon: FileText, color: "text-rose-500" },
    license: { label: "LICENSE", filename: "LICENSE", icon: ShieldCheck, color: "text-emerald-500" },
    gitignore: { label: ".gitignore", filename: ".gitignore", icon: FileCode, color: "text-amber-500" },
    envExample: { label: ".env.example", filename: ".env.example", icon: KeyRound, color: "text-purple-500" }
};

const README_SECTION_ITEMS: Array<{ id: ReadmeSectionKey; label: string; desc: string; icon: string }> = [
    { id: "badges", label: "Badges Oficiales", desc: "Licencia, versión, tech logos shields.io", icon: "🏷️" },
    { id: "description", label: "Resumen & Propósito", desc: "Problema que resuelve y propuesta de valor", icon: "🎯" },
    { id: "features", label: "Características Clave", desc: "Viñetas con emojis de funcionalidades", icon: "✨" },
    { id: "architecture", label: "Arquitectura Mermaid", desc: "Diagrama visual interactivo", icon: "🏗️" },
    { id: "techStack", label: "Stack Tecnológico", desc: "Tabla organizada de tecnologías y herramientas", icon: "💻" },
    { id: "projectStructure", label: "Estructura de Carpetas", desc: "Árbol ASCII con comentarios descriptivos", icon: "📂" },
    { id: "prerequisites", label: "Requisitos Previos", desc: "Versiones requeridas de runtime y base de datos", icon: "📋" },
    { id: "installation", label: "Guía de Instalación", desc: "Paso a paso: clone, dependencias y ejecución", icon: "🚀" },
    { id: "environmentVariables", label: "Variables de Entorno", desc: "Resumen y referencia a .env.example", icon: "🔐" },
    { id: "scripts", label: "Scripts y Comandos", desc: "Tabla detallada con dev, build, test", icon: "⚡" },
    { id: "apiEndpoints", label: "Endpoints de API", desc: "Rutas principales y métodos HTTP", icon: "🔌" },
    { id: "testing", label: "Pruebas y Calidad", desc: "Cómo correr pruebas unitarias y de integración", icon: "🧪" },
    { id: "troubleshooting", label: "Solución de Problemas", desc: "FAQ y resolución de errores comunes", icon: "💡" },
    { id: "roadmap", label: "Hoja de Ruta (Roadmap)", desc: "Hitos y próximas funcionalidades", icon: "🗺️" },
    { id: "contributing", label: "Guía de Contribución", desc: "Mención y enlace a CONTRIBUTING.md", icon: "🤝" },
    { id: "license", label: "Licencia del Proyecto", desc: "Mención y enlace a LICENSE", icon: "📜" },
];

const POPULAR_STACK_CHIPS = [
    "TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Express", 
    "Python", "FastAPI", "Django", "Java", "Spring Boot", "Go", "PostgreSQL", 
    "MongoDB", "MySQL", "Prisma", "Docker", "TailwindCSS", "Redis"
];

const QUICK_REFINEMENT_PROMPTS = [
    "Añadir ejemplos de petición cURL a los endpoints",
    "Incluir configuración de Docker Compose detallada",
    "Traducir toda la documentación a Inglés profesional",
    "Hacer la redacción más concisa, directa y ejecutiva",
    "Optimizar y enriquecer el diagrama Mermaid",
    "Añadir sección de seguridad y buenas prácticas"
];

export function GitDocsToolView({
    initialRepoUrl = "",
    localAccount,
    hasUserGithubToken = false,
    tokenSource = "none"
}: GitDocsToolViewProps) {
    const router = useRouter();

    // Source Mode State
    const [sourceMode, setSourceMode] = useState<"github" | "manual">("github");

    // GitHub Source States
    const [repoUrl, setRepoUrl] = useState<string>(initialRepoUrl);
    const [branch, setBranch] = useState<string>("");
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [customToken, setCustomToken] = useState<string>("");
    const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

    // Manual Project States
    const [manualProjectName, setManualProjectName] = useState<string>("");
    const [manualDescription, setManualDescription] = useState<string>("");
    const [manualAuthor, setManualAuthor] = useState<string>("");
    const [manualSelectedStacks, setManualSelectedStacks] = useState<string[]>(["TypeScript", "Next.js", "React", "TailwindCSS"]);
    const [customStackInput, setCustomStackInput] = useState<string>("");
    const [manualKeyDirs, setManualKeyDirs] = useState<string>("src, components, app, lib, prisma, public");
    const [manualEnvVars, setManualEnvVars] = useState<string>("DATABASE_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_API_URL, PORT");

    // UI Configuration & Accordions
    const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
    const [activeConfigTab, setActiveConfigTab] = useState<"sections" | "style" | "files">("sections");

    // Generator Options
    const [language, setLanguage] = useState<"es" | "en">("es");
    const [licenseType, setLicenseType] = useState<DocsGenerationOptions["licenseType"]>("MIT");
    const [authorName, setAuthorName] = useState<string>("");
    const [includeMermaid, setIncludeMermaid] = useState<boolean>(true);
    const [mermaidType, setMermaidType] = useState<MermaidDiagramType>("flowchart");
    const [documentationStyle, setDocumentationStyle] = useState<DocumentationTone>("professional");
    const [projectScope, setProjectScope] = useState<string>("");

    // Target Files Configuration (All 11 docs)
    const [targetFiles, setTargetFiles] = useState<{
        readme: boolean;
        architecture: boolean;
        apiDocs: boolean;
        deployment: boolean;
        security: boolean;
        changelog: boolean;
        contributing: boolean;
        codeOfConduct: boolean;
        license: boolean;
        gitignore: boolean;
        envExample: boolean;
    }>({
        readme: true,
        architecture: true,
        apiDocs: true,
        deployment: false,
        security: true,
        changelog: true,
        contributing: true,
        codeOfConduct: true,
        license: true,
        gitignore: true,
        envExample: true
    });

    // Granular README Sections Selector
    const [readmeSections, setReadmeSections] = useState<Record<ReadmeSectionKey, boolean>>({
        badges: true,
        description: true,
        features: true,
        architecture: true,
        techStack: true,
        projectStructure: true,
        prerequisites: true,
        installation: true,
        environmentVariables: true,
        scripts: true,
        apiEndpoints: true,
        testing: true,
        troubleshooting: true,
        roadmap: true,
        contributing: true,
        license: true
    });

    // Loading & Processing States
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStage, setLoadingStage] = useState<string>("");
    const [analysis, setAnalysis] = useState<RepoAnalysisResult | null>(null);
    const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocsResult | null>(null);

    // Active Editor / Preview States
    const [activeTab, setActiveTab] = useState<DocTabKey>("readme");
    const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Editable Buffers
    const [editedContent, setEditedContent] = useState<Partial<Record<DocTabKey, string>>>({});
    const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);

    // AI In-Place Refinement States
    const [refinementPrompt, setRefinementPrompt] = useState<string>("");
    const [isRefining, setIsRefining] = useState<boolean>(false);

    // Toggle Readme Section
    const toggleSection = (id: ReadmeSectionKey) => {
        setReadmeSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Preset Applicator for README
    const applyReadmePreset = (preset: "essential" | "academic" | "enterprise" | "all" | "none") => {
        if (preset === "all") {
            const allTrue = {} as Record<ReadmeSectionKey, boolean>;
            README_SECTION_ITEMS.forEach(s => { allTrue[s.id] = true; });
            setReadmeSections(allTrue);
            toast.info("Todas las secciones del README seleccionadas.");
            return;
        }
        if (preset === "none") {
            const allFalse = {} as Record<ReadmeSectionKey, boolean>;
            README_SECTION_ITEMS.forEach(s => { allFalse[s.id] = false; });
            setReadmeSections(allFalse);
            toast.info("Secciones deseleccionadas.");
            return;
        }
        if (preset === "essential") {
            setReadmeSections({
                badges: true,
                description: true,
                features: true,
                architecture: false,
                techStack: true,
                projectStructure: false,
                prerequisites: false,
                installation: true,
                environmentVariables: false,
                scripts: true,
                apiEndpoints: false,
                testing: false,
                troubleshooting: false,
                roadmap: false,
                contributing: false,
                license: true
            });
            toast.success("Plantilla 'Esencial / Rápida' aplicada.");
            return;
        }
        if (preset === "academic") {
            setReadmeSections({
                badges: true,
                description: true,
                features: true,
                architecture: true,
                techStack: true,
                projectStructure: true,
                prerequisites: true,
                installation: true,
                environmentVariables: true,
                scripts: true,
                apiEndpoints: false,
                testing: true,
                troubleshooting: true,
                roadmap: false,
                contributing: true,
                license: true
            });
            setDocumentationStyle("educational");
            toast.success("Plantilla 'Académico / Didáctico' aplicada.");
            return;
        }
        if (preset === "enterprise") {
            const allTrue = {} as Record<ReadmeSectionKey, boolean>;
            README_SECTION_ITEMS.forEach(s => { allTrue[s.id] = true; });
            setReadmeSections(allTrue);
            setDocumentationStyle("enterprise");
            toast.success("Plantilla 'Enterprise Completo' aplicada.");
        }
    };

    // Toggle Target Files
    const handleTargetFileToggle = (key: keyof typeof targetFiles) => {
        setTargetFiles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Add Stack Chip in Manual Mode
    const toggleStackChip = (stack: string) => {
        setManualSelectedStacks(prev => 
            prev.includes(stack) ? prev.filter(s => s !== stack) : [...prev, stack]
        );
    };

    const addCustomStack = () => {
        if (!customStackInput.trim()) return;
        const clean = customStackInput.trim();
        if (!manualSelectedStacks.includes(clean)) {
            setManualSelectedStacks(prev => [...prev, clean]);
        }
        setCustomStackInput("");
    };

    // Compile Files for Push to GitHub
    const filesToPush: PushFileItem[] = useMemo(() => {
        const list: PushFileItem[] = [];
        (Object.keys(TAB_CONFIG) as DocTabKey[]).forEach((key) => {
            if (targetFiles[key] && (editedContent[key] || generatedDocs?.[key])) {
                list.push({
                    path: TAB_CONFIG[key].filename,
                    content: editedContent[key] ?? generatedDocs?.[key] ?? ""
                });
            }
        });
        return list;
    }, [targetFiles, editedContent, generatedDocs]);

    // Handle Generation (GitHub or Manual)
    const handleGenerate = async () => {
        if (sourceMode === "github") {
            if (!repoUrl || !repoUrl.trim().includes("github.com")) {
                toast.error("Ingresa una URL válida de repositorio en GitHub (ej: https://github.com/usuario/repo)");
                return;
            }
        } else {
            if (!manualProjectName.trim()) {
                toast.error("Ingresa el nombre del proyecto.");
                return;
            }
        }

        try {
            setIsLoading(true);
            const options: DocsGenerationOptions = {
                language,
                licenseType,
                authorName: authorName.trim() || (sourceMode === "manual" ? manualAuthor.trim() || "Autor" : ""),
                includeMermaid,
                mermaidType,
                documentationStyle,
                readmeSections,
                projectScope: projectScope.trim() || undefined,
                targetFiles
            };

            let docsResult: GeneratedDocsResult;
            let activeAnalysis: RepoAnalysisResult;

            if (sourceMode === "github") {
                setLoadingStage("Inspeccionando repositorio, paquetes y arquitectura...");
                const analysisResult = await analyzeRepoForDocsAction(
                    repoUrl.trim(),
                    branch.trim() || undefined,
                    customToken.trim() || undefined
                );

                activeAnalysis = analysisResult.analysis;
                setAnalysis(activeAnalysis);
                setAvailableBranches(analysisResult.availableBranches);
                if (!branch) {
                    setBranch(analysisResult.defaultBranch);
                }

                if (!authorName.trim()) {
                    options.authorName = activeAnalysis.owner;
                }

                setLoadingStage("Generando README, diagramas Mermaid y suite de gobernanza con IA...");
                docsResult = await generateRepoDocsAction(activeAnalysis, options);
            } else {
                setLoadingStage("Construyendo arquitectura y generando documentación para proyecto local...");
                const manualData: ManualProjectInput = {
                    name: manualProjectName.trim(),
                    description: manualDescription.trim() || "Proyecto de software con arquitectura moderna.",
                    primaryLanguage: manualSelectedStacks[0] || "TypeScript",
                    stacks: manualSelectedStacks,
                    frameworks: manualSelectedStacks.filter(s => ["Next.js", "React", "Express", "FastAPI", "Django", "Spring Boot"].includes(s)),
                    databases: manualSelectedStacks.filter(s => ["PostgreSQL", "MongoDB", "MySQL", "Redis"].includes(s)),
                    tools: manualSelectedStacks.filter(s => ["Docker", "Prisma"].includes(s)),
                    envVars: manualEnvVars.split(",").map(v => v.trim()).filter(Boolean),
                    keyDirectories: manualKeyDirs.split(",").map(d => d.trim()).filter(Boolean),
                    author: manualAuthor.trim() || "Equipo de Desarrollo"
                };

                const res = await generateDocsFromManualAction(manualData, options);
                activeAnalysis = res.analysis;
                setAnalysis(activeAnalysis);
                docsResult = res.docs;
            }

            setGeneratedDocs(docsResult);

            // Populate Buffers
            const initialBuffers: Partial<Record<DocTabKey, string>> = {};
            (Object.keys(TAB_CONFIG) as DocTabKey[]).forEach(k => {
                if (docsResult[k]) {
                    initialBuffers[k] = docsResult[k];
                }
            });
            setEditedContent(initialBuffers);

            // Set Active Tab to first valid document
            const firstAvailable = (Object.keys(TAB_CONFIG) as DocTabKey[]).find(k => targetFiles[k] && docsResult[k]);
            if (firstAvailable) {
                setActiveTab(firstAvailable);
            }

            toast.success("¡Documentación técnica de alta calidad generada con éxito!");
        } catch (error: any) {
            console.error("Error al generar documentación:", error);
            toast.error(error.message || "Error al generar la suite de documentos.");
        } finally {
            setIsLoading(false);
            setLoadingStage("");
        }
    };

    // Regenerate Suite
    const handleRegenerate = async () => {
        if (!analysis) return;
        try {
            setIsLoading(true);
            setLoadingStage("Regenerando documentación con los nuevos parámetros...");

            const options: DocsGenerationOptions = {
                language,
                licenseType,
                authorName: authorName.trim() || analysis.owner,
                includeMermaid,
                mermaidType,
                documentationStyle,
                readmeSections,
                projectScope: projectScope.trim() || undefined,
                targetFiles
            };

            const docs = await generateRepoDocsAction(analysis, options);
            setGeneratedDocs(docs);
            setEditedContent(prev => {
                const updated = { ...prev };
                (Object.keys(TAB_CONFIG) as DocTabKey[]).forEach(k => {
                    if (docs[k]) updated[k] = docs[k];
                });
                return updated;
            });

            toast.success("Documentación actualizada exitosamente.");
        } catch (error: any) {
            toast.error(error.message || "Error al regenerar documentos.");
        } finally {
            setIsLoading(false);
            setLoadingStage("");
        }
    };

    // In-Place AI Refinement
    const handleRefineDocument = async (instructionToUse?: string) => {
        const instruction = instructionToUse || refinementPrompt;
        if (!instruction || !instruction.trim()) {
            toast.error("Escribe qué deseas modificar o mejorar con IA.");
            return;
        }

        const currentText = editedContent[activeTab] ?? generatedDocs?.[activeTab] ?? "";
        if (!currentText.trim()) {
            toast.error("El documento actual no tiene contenido para refinar.");
            return;
        }

        try {
            setIsRefining(true);
            toast.loading("Refinando documento con IA...", { id: "ai-refine" });

            const refined = await refineDocWithAiAction(currentText, instruction.trim(), language);
            setEditedContent(prev => ({ ...prev, [activeTab]: refined }));
            setRefinementPrompt("");
            toast.success(`¡${TAB_CONFIG[activeTab].filename} refinado con éxito!`, { id: "ai-refine" });
        } catch (err: any) {
            console.error("Error al refinar:", err);
            toast.error(err.message || "No se pudo refinar el documento.", { id: "ai-refine" });
        } finally {
            setIsRefining(false);
        }
    };

    // Content Buffer Helper
    const currentContent = editedContent[activeTab] ?? (generatedDocs ? (generatedDocs[activeTab] || "") : "");

    const handleContentChange = (newVal: string) => {
        setEditedContent(prev => ({ ...prev, [activeTab]: newVal }));
    };

    // Copy to Clipboard
    const handleCopyCurrent = async () => {
        if (!currentContent) return;
        try {
            await navigator.clipboard.writeText(currentContent);
            setCopiedKey(activeTab);
            toast.success(`${TAB_CONFIG[activeTab].filename} copiado al portapapeles`);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            toast.error("No se pudo copiar el contenido.");
        }
    };

    // Download Single File
    const handleDownloadCurrent = () => {
        if (!currentContent) return;
        const filename = TAB_CONFIG[activeTab].filename;
        const blob = new Blob([currentContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Descargando ${filename}...`);
    };

    // Download All ZIP
    const handleDownloadAllZip = async () => {
        if (!generatedDocs && Object.keys(editedContent).length === 0) return;
        try {
            const zip = new JSZip();
            const projectName = analysis?.repo || manualProjectName || "proyecto";

            (Object.keys(TAB_CONFIG) as DocTabKey[]).forEach((key) => {
                const content = editedContent[key] ?? generatedDocs?.[key];
                if (targetFiles[key] && content) {
                    zip.file(TAB_CONFIG[key].filename, content);
                }
            });

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectName}-documentation.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Paquete ${projectName}-documentation.zip descargado con éxito`);
        } catch (err) {
            console.error("Error empaquetando zip:", err);
            toast.error("Error al generar el archivo comprimido ZIP.");
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-4 p-0.5 sm:p-2 min-h-0">
            {/* 1. Header Moderno, Limpio y Compacto */}
            <div className="flex flex-col gap-3 pb-3 border-b border-border/70">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                Generador de README & Docs
                                <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 text-blue-500 border-blue-500/30 bg-blue-500/5">
                                    AI Suite
                                </Badge>
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            Crea documentación oficial, diagramas Mermaid interactivos y gobernanza con refinamiento en tiempo real con IA.
                        </p>
                    </div>

                    {/* Local Git Account Indicator */}
                    <div className="flex items-center gap-2">
                        {localAccount?.hasLocalAccount ? (
                            <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                <Laptop className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                                {localAccount.name || localAccount.email || "Git Local"}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                                <Laptop className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                                Git Local Activo
                            </Badge>
                        )}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowTokenInput(!showTokenInput)}
                            className="h-8 text-xs font-medium cursor-pointer"
                        >
                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                            {showTokenInput ? "Ocultar Token" : "Token GitHub (Opcional)"}
                        </Button>
                    </div>
                </div>

                {/* Collapsible Token Input */}
                {showTokenInput && (
                    <div className="pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full">
                            <Input 
                                type="password" 
                                placeholder="ghp_xxxxxxxxxxxx (GitHub Personal Access Token)"
                                value={customToken}
                                onChange={(e) => setCustomToken(e.target.value)}
                                className="text-xs font-mono h-9 bg-muted/40"
                            />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                            Permite inspeccionar repositorios privados o superar límites de tasa (Rate Limits) de GitHub.
                        </span>
                    </div>
                )}
            </div>

            {/* 2. Selector de Origen (GitHub URL vs Proyecto Manual / Local) */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modo de Entrada:</span>
                        <div className="flex items-center rounded-xl bg-muted/40 p-1 border border-border/60">
                            <button
                                type="button"
                                onClick={() => setSourceMode("github")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    sourceMode === "github" 
                                        ? "bg-background text-foreground shadow-xs border border-border" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Github className="w-3.5 h-3.5" />
                                Repositorio GitHub
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceMode("manual")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    sourceMode === "manual" 
                                        ? "bg-background text-foreground shadow-xs border border-border" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Hammer className="w-3.5 h-3.5 text-blue-500" />
                                Proyecto Manual / Local
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfigPanel(!showConfigPanel)}
                            className={cn(
                                "h-9 px-3 text-xs gap-1.5 cursor-pointer font-semibold",
                                showConfigPanel && "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                            )}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Personalizar Qué Generar</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                                {Object.values(readmeSections).filter(Boolean).length}/16 sec.
                            </Badge>
                        </Button>

                        <Button 
                            onClick={handleGenerate}
                            disabled={isLoading || (sourceMode === "github" ? !repoUrl.trim() : !manualProjectName.trim())}
                            className="h-9 px-5 font-bold text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer shrink-0"
                        >
                            {isLoading ? (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                    <span>{loadingStage || "Procesando..."}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Generar Documentación</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* GitHub Mode Input Bar */}
                {sourceMode === "github" ? (
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                        <div className="relative flex-1">
                            <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                type="text"
                                placeholder="https://github.com/propietario/repositorio"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleGenerate(); }}
                                className="pl-10 text-sm h-11 bg-background font-mono"
                                disabled={isLoading}
                            />
                        </div>

                        {availableBranches.length > 0 && (
                            <div className="w-full md:w-48">
                                <Select value={branch} onValueChange={setBranch} disabled={isLoading}>
                                    <SelectTrigger className="h-11 text-xs">
                                        <GitBranch className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                        <SelectValue placeholder="Rama" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableBranches.map((b) => (
                                            <SelectItem key={b} value={b} className="text-xs font-mono">
                                                {b}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Manual / Local Project Inputs */
                    <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Nombre del Proyecto *</label>
                                <Input 
                                    placeholder="ej: smartclass-core-api"
                                    value={manualProjectName}
                                    onChange={(e) => setManualProjectName(e.target.value)}
                                    className="h-9 text-xs font-medium"
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[11px] font-semibold text-muted-foreground">Descripción / Propósito</label>
                                <Input 
                                    placeholder="ej: Plataforma de gestión educativa modular con microservicios y sincronización de notas en tiempo real."
                                    value={manualDescription}
                                    onChange={(e) => setManualDescription(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Stack Pills Selector */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-muted-foreground">
                                    Stack Tecnológico (Selecciona tus tecnologías):
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <Input 
                                        placeholder="Otra tecnología..."
                                        value={customStackInput}
                                        onChange={(e) => setCustomStackInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") addCustomStack(); }}
                                        className="h-7 text-xs w-36"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={addCustomStack}
                                        className="h-7 px-2 text-xs"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {POPULAR_STACK_CHIPS.map(chip => {
                                    const isSelected = manualSelectedStacks.includes(chip);
                                    return (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => toggleStackChip(chip)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                                                isSelected 
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                                                    : "bg-muted/30 text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                                            )}
                                        >
                                            {chip}
                                        </button>
                                    );
                                })}
                                {manualSelectedStacks.filter(s => !POPULAR_STACK_CHIPS.includes(s)).map(customChip => (
                                    <span 
                                        key={customChip}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/30"
                                    >
                                        {customChip}
                                        <button 
                                            type="button" 
                                            onClick={() => toggleStackChip(customChip)}
                                            className="hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Carpetas Clave (separadas por coma)</label>
                                <Input 
                                    value={manualKeyDirs}
                                    onChange={(e) => setManualKeyDirs(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Variables de Entorno sugeridas</label>
                                <Input 
                                    value={manualEnvVars}
                                    onChange={(e) => setManualEnvVars(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Panel Expandible de Personalización Total */}
                {showConfigPanel && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-4">
                        {/* Subtabs del panel de personalización */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1 border border-border/60 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab("sections")}
                                    className={cn(
                                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                                        activeConfigTab === "sections" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    📑 Secciones del README ({Object.values(readmeSections).filter(Boolean).length}/16)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab("style")}
                                    className={cn(
                                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                                        activeConfigTab === "style" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    🎨 Diagrama Mermaid & Estilo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveConfigTab("files")}
                                    className={cn(
                                        "px-3 py-1 rounded-md font-semibold transition-all cursor-pointer",
                                        activeConfigTab === "files" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    📦 Archivos de la Suite ({Object.values(targetFiles).filter(Boolean).length}/11)
                                </button>
                            </div>

                            {/* Quick Presets for README */}
                            {activeConfigTab === "sections" && (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-[11px] text-muted-foreground font-semibold mr-1">Plantillas rápidas:</span>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => applyReadmePreset("essential")}
                                        className="h-7 px-2 text-[11px] cursor-pointer"
                                    >
                                        ⚡ Esencial
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => applyReadmePreset("academic")}
                                        className="h-7 px-2 text-[11px] cursor-pointer"
                                    >
                                        🎓 Académico
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => applyReadmePreset("enterprise")}
                                        className="h-7 px-2 text-[11px] cursor-pointer"
                                    >
                                        🏢 Enterprise
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => applyReadmePreset("all")}
                                        className="h-7 px-2 text-[11px] cursor-pointer text-blue-600"
                                    >
                                        ✓ Todo
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => applyReadmePreset("none")}
                                        className="h-7 px-2 text-[11px] cursor-pointer text-muted-foreground"
                                    >
                                        ✕ Ninguno
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Content Tab 1: Secciones Granulares del README */}
                        {activeConfigTab === "sections" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                                {README_SECTION_ITEMS.map((item) => {
                                    const isChecked = readmeSections[item.id] !== false;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleSection(item.id)}
                                            className={cn(
                                                "flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none",
                                                isChecked 
                                                    ? "bg-blue-500/5 border-blue-500/30 text-foreground" 
                                                    : "bg-muted/10 border-border/40 text-muted-foreground opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="mt-0.5">
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-muted-foreground/60" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold flex items-center gap-1.5 text-xs truncate">
                                                    <span>{item.icon}</span>
                                                    <span>{item.label}</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Content Tab 2: Diagrama Mermaid & Estilo */}
                        {activeConfigTab === "style" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <label className="font-bold text-foreground flex items-center gap-1.5">
                                            <Boxes className="w-4 h-4 text-blue-500" />
                                            Diagrama Mermaid
                                        </label>
                                        <Switch 
                                            checked={includeMermaid} 
                                            onCheckedChange={setIncludeMermaid}
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Genera un diagrama interactivo dentro del README y la suite.
                                    </p>

                                    {includeMermaid && (
                                        <div className="pt-2 border-t border-border/40 space-y-1">
                                            <span className="text-[11px] font-semibold text-muted-foreground block">Tipo de Diagrama:</span>
                                            <Select value={mermaidType} onValueChange={(v: any) => setMermaidType(v)}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="flowchart">🏗️ Arquitectura por Capas (Flowchart)</SelectItem>
                                                    <SelectItem value="sequence">🔄 Flujo Secuencial (Sequence Diagram)</SelectItem>
                                                    <SelectItem value="erDiagram">🗄️ Modelo Entidad-Relación (ER Diagram)</SelectItem>
                                                    <SelectItem value="c4">🧩 Componentes C4 (C4 Model)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
                                    <label className="font-bold text-foreground flex items-center gap-1.5">
                                        <Palette className="w-4 h-4 text-purple-500" />
                                        Tono y Estilo de Redacción
                                    </label>
                                    <Select value={documentationStyle} onValueChange={(v: any) => setDocumentationStyle(v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="professional">💼 Profesional (Estándar GitHub Top)</SelectItem>
                                            <SelectItem value="educational">🎓 Educativo / Didáctico (Docentes & Alumnos)</SelectItem>
                                            <SelectItem value="minimal">⚡ Minimalista (Directo al Grano)</SelectItem>
                                            <SelectItem value="enterprise">🏢 Enterprise (Gobernanza & Resiliencia)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Modela la profundidad de explicaciones y el nivel de formalidad técnica.
                                    </p>
                                </div>

                                <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
                                    <label className="font-bold text-foreground">Idioma y Licencia</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block mb-0.5">Idioma</span>
                                            <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="es">Español</SelectItem>
                                                    <SelectItem value="en">Inglés</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block mb-0.5">Licencia</span>
                                            <Select value={licenseType} onValueChange={(v: any) => setLicenseType(v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MIT">MIT License</SelectItem>
                                                    <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                                                    <SelectItem value="GPL-3.0">GNU GPLv3</SelectItem>
                                                    <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
                                                    <SelectItem value="ISC">ISC</SelectItem>
                                                    <SelectItem value="Unlicense">Unlicense</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-[10px] text-muted-foreground block mb-0.5">Autor / Organización</span>
                                        <Input 
                                            placeholder="ej: SmartClass Team" 
                                            value={authorName} 
                                            onChange={(e) => setAuthorName(e.target.value)} 
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content Tab 3: Archivos de la Suite Completa */}
                        {activeConfigTab === "files" && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                                {(Object.keys(TAB_CONFIG) as DocTabKey[]).map((key) => {
                                    const cfg = TAB_CONFIG[key];
                                    const Icon = cfg.icon;
                                    const isChecked = Boolean(targetFiles[key]);
                                    return (
                                        <label
                                            key={key}
                                            className={cn(
                                                "flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all",
                                                isChecked 
                                                    ? "bg-blue-500/5 border-blue-500/30 text-foreground" 
                                                    : "bg-muted/10 border-border/40 text-muted-foreground opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleTargetFileToggle(key)}
                                                className="rounded border-border"
                                            />
                                            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                                            <span className="font-mono text-xs font-semibold">{cfg.filename}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* Instrucciones libres opcionales */}
                        <div className="pt-2 flex items-center gap-3">
                            <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                                💬 Instrucciones Libres (Opcional):
                            </span>
                            <Input 
                                placeholder="ej: Enfocar la documentación en cómo correr la aplicación en Docker y los endpoints de autenticación..."
                                value={projectScope}
                                onChange={(e) => setProjectScope(e.target.value)}
                                className="h-8 text-xs flex-1 bg-muted/20"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Panel de Resumen Técnico del Repositorio Analizado */}
            {analysis && (
                <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <FolderGit2 className="w-5 h-5 text-blue-500" />
                            <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    {analysis.fullName}
                                    <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
                                        rama: {analysis.branch}
                                    </Badge>
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">{analysis.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleRegenerate}
                                disabled={isLoading}
                                className="h-8 text-xs gap-1.5 cursor-pointer font-semibold"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Regenerar Suite
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleDownloadAllZip}
                                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-semibold shadow-xs"
                            >
                                <FileArchive className="w-3.5 h-3.5" />
                                Descargar Todo (.ZIP)
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => setIsPushModalOpen(true)}
                                className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer font-semibold shadow-sm"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                Subir a GitHub
                            </Button>
                        </div>
                    </div>

                    {/* Stacks Detectados */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60 text-xs">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-blue-500" /> Stack:
                        </span>

                        {analysis.detectedStacks.map(s => (
                            <Badge key={s} variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                {s}
                            </Badge>
                        ))}

                        {analysis.frameworks.map(f => (
                            <Badge key={f} variant="outline" className="text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                {f}
                            </Badge>
                        ))}

                        {analysis.databases.map(db => (
                            <Badge key={db} variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                <Database className="w-3 h-3 mr-1" />
                                {db}
                            </Badge>
                        ))}

                        {analysis.tools.map(t => (
                            <Badge key={t} variant="outline" className="text-[11px] bg-muted/60 text-muted-foreground border-border">
                                {t}
                            </Badge>
                        ))}

                        {analysis.envVars.length > 0 && (
                            <Badge variant="outline" className="text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                                <KeyRound className="w-3 h-3 mr-1" />
                                {analysis.envVars.length} variables
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Área de Trabajo Multidocumento y Editor con Asistente IA */}
            {generatedDocs && (
                <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-h-[600px]">
                    {/* Toolbar de Pestañas de Documentos */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border bg-muted/30 p-2 gap-2">
                        {/* Selector de Pestañas Dinámicas */}
                        <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                            {(Object.keys(TAB_CONFIG) as DocTabKey[]).map((key) => {
                                const cfg = TAB_CONFIG[key];
                                const hasContent = Boolean(editedContent[key] || generatedDocs[key]);
                                if (!hasContent && !targetFiles[key]) return null;

                                const Icon = cfg.icon;
                                const isActive = activeTab === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActiveTab(key)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                                            isActive
                                                ? "bg-background text-foreground shadow-xs border border-border"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                                        <span>{cfg.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Botones de Control del Archivo Actual */}
                        <div className="flex items-center gap-1.5 justify-end shrink-0">
                            {/* Toggle Vista Previa / Editor */}
                            <div className="flex items-center rounded-lg border border-border p-0.5 bg-background text-xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("preview")}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer",
                                        viewMode === "preview" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Eye className="w-3 h-3" />
                                    Vista Previa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("raw")}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer",
                                        viewMode === "raw" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Code2 className="w-3 h-3" />
                                    Editor
                                </button>
                            </div>

                            {/* Copiar */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCopyCurrent}
                                className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                                title="Copiar archivo al portapapeles"
                            >
                                {copiedKey === activeTab ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-500 font-bold">Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copiar</span>
                                    </>
                                )}
                            </Button>

                            {/* Descargar Archivo Individual */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleDownloadCurrent}
                                className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                                title="Descargar este archivo"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar</span>
                            </Button>
                        </div>
                    </div>

                    {/* Toolbar de Refinamiento en Tiempo Real con IA */}
                    <div className="border-b border-border bg-card/60 p-2.5 space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>Refinar {TAB_CONFIG[activeTab].filename} con IA:</span>
                            </div>
                            <div className="relative flex-1">
                                <Input 
                                    placeholder="ej: Agrega ejemplos curl a los endpoints, hazlo más formal, añade sección de Docker..."
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !isRefining) handleRefineDocument(); }}
                                    className="h-8 text-xs pr-20 bg-background"
                                    disabled={isRefining}
                                />
                                <Button 
                                    size="sm" 
                                    onClick={() => handleRefineDocument()}
                                    disabled={isRefining || !refinementPrompt.trim()}
                                    className="absolute right-1 top-1 h-6 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                >
                                    {isRefining ? <RotateCcw className="w-3 h-3 animate-spin" /> : "✨ Refinar"}
                                </Button>
                            </div>
                        </div>

                        {/* Pills de sugerencias de refinamiento rápido */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="text-muted-foreground font-semibold">Sugerencias rápidas:</span>
                            {QUICK_REFINEMENT_PROMPTS.map((promptText, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={isRefining}
                                    onClick={() => handleRefineDocument(promptText)}
                                    className="px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-all cursor-pointer"
                                >
                                    {promptText}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contenedor del Archivo Activo (Preview vs Raw Editor) */}
                    <div className="flex-1 p-4 sm:p-6 overflow-auto bg-background/50">
                        {viewMode === "preview" ? (
                            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-4">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || "");
                                            const chartCode = String(children).replace(/\n$/, "");
                                            if (!inline && match && match[1] === "mermaid") {
                                                return (
                                                    <div className="my-6 not-prose">
                                                        <div className="rounded-xl border border-blue-500/20 bg-card p-3 shadow-md">
                                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                                                                <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                                                                    <Boxes className="w-3.5 h-3.5" />
                                                                    Diagrama de Arquitectura del Repositorio
                                                                </span>
                                                                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">Mermaid.js</Badge>
                                                            </div>
                                                            <MermaidBlock chart={chartCode} />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        img({ node, className, ...props }: any) {
                                            return (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    {...props}
                                                    className={cn("inline-block mx-0.5 my-1 max-h-7 align-middle shadow-2xs rounded-xs", className)}
                                                    loading="lazy"
                                                />
                                            );
                                        },
                                        p({ node, children, ...props }: any) {
                                            const align = (props as any).align;
                                            return (
                                                <p
                                                    {...props}
                                                    className={cn(
                                                        "my-2.5 leading-relaxed",
                                                        align === "center" && "text-center flex flex-wrap items-center justify-center gap-1.5"
                                                    )}
                                                >
                                                    {children}
                                                </p>
                                            );
                                        },
                                        a({ node, children, ...props }: any) {
                                            return (
                                                <a
                                                    {...props}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary underline hover:opacity-80 font-medium inline-flex items-center gap-0.5"
                                                >
                                                    {children}
                                                </a>
                                            );
                                        },
                                        table({ children }) {
                                            return (
                                                <div className="my-4 overflow-x-auto rounded-xl border border-border">
                                                    <table className="min-w-full divide-y divide-border text-xs">
                                                        {children}
                                                    </table>
                                                </div>
                                            );
                                        }
                                    }}
                                >
                                    {currentContent}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            /* Editor de Código Directo */
                            <div className="h-full flex flex-col space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="font-mono font-semibold text-foreground">
                                        {TAB_CONFIG[activeTab].filename} — Editor Directo
                                    </span>
                                    <span>{currentContent.split("\n").length} líneas • {currentContent.length} caracteres</span>
                                </div>
                                <textarea
                                    value={currentContent}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    className="w-full flex-1 min-h-[460px] p-4 font-mono text-xs leading-relaxed bg-muted/20 text-foreground border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary resize-y"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 6. Estado Vacío / Hero Ilustrativo */}
            {!generatedDocs && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10 min-h-[420px]">
                    <div className="p-4 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-4">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-foreground mb-2">
                        Genera Documentación Profesional con Control Total
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mb-6 leading-relaxed">
                        Selecciona si deseas analizar un <strong>repositorio en GitHub</strong> o especificar un <strong>proyecto local</strong>. Configura las secciones exactas que necesitas y obtén diagramas Mermaid, guías de arquitectura y suite de gobernanza con 1 clic.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full text-left text-xs">
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> README.md
                            </p>
                            <p className="text-[11px] text-muted-foreground">16 secciones seleccionables, badges y setup.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <Boxes className="w-3.5 h-3.5 text-cyan-500" /> Arquitectura
                            </p>
                            <p className="text-[11px] text-muted-foreground">Diagramas Mermaid (Flowchart, Secuencia, ER).</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <Server className="w-3.5 h-3.5 text-emerald-500" /> API & Endpoints
                            </p>
                            <p className="text-[11px] text-muted-foreground">Catálogo REST, headers, payloads y cURL.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Gobernanza
                            </p>
                            <p className="text-[11px] text-muted-foreground">Licencias, .env.example, .gitignore, Changelog.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. Modal para Subir Cambios a GitHub */}
            {generatedDocs && (
                <PushToGitHubModal 
                    isOpen={isPushModalOpen}
                    onClose={() => setIsPushModalOpen(false)}
                    repoUrl={repoUrl}
                    defaultBranch={branch || analysis?.branch || "main"}
                    availableBranches={availableBranches}
                    files={filesToPush}
                    localAccount={localAccount}
                    hasConfiguredToken={false}
                    onSuccess={(res) => {
                        toast.success("¡Operación completada en GitHub con éxito!");
                    }}
                />
            )}
        </div>
    );
}
