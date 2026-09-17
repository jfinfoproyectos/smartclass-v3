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
    Laptop
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
    generateRepoDocsAction 
} from "../../actions/gitDocsActions";
import type { 
    RepoAnalysisResult, 
    DocsGenerationOptions, 
    GeneratedDocsResult 
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

type DocTabKey = "readme" | "license" | "gitignore" | "envExample" | "contributing" | "codeOfConduct";

const TAB_CONFIG: Record<DocTabKey, { label: string; filename: string; icon: React.ComponentType<any>; color: string }> = {
    readme: { label: "README.md", filename: "README.md", icon: BookOpen, color: "text-blue-500" },
    license: { label: "LICENSE", filename: "LICENSE", icon: ShieldCheck, color: "text-emerald-500" },
    gitignore: { label: ".gitignore", filename: ".gitignore", icon: FileCode, color: "text-amber-500" },
    envExample: { label: ".env.example", filename: ".env.example", icon: KeyRound, color: "text-purple-500" },
    contributing: { label: "CONTRIBUTING.md", filename: "CONTRIBUTING.md", icon: Layers, color: "text-indigo-500" },
    codeOfConduct: { label: "CODE_OF_CONDUCT.md", filename: "CODE_OF_CONDUCT.md", icon: FileText, color: "text-rose-500" }
};

export function GitDocsToolView({
    initialRepoUrl = "",
    localAccount,
    hasUserGithubToken = false,
    tokenSource = "none"
}: GitDocsToolViewProps) {
    const router = useRouter();

    // Input States
    const [repoUrl, setRepoUrl] = useState<string>(initialRepoUrl);
    const [branch, setBranch] = useState<string>("");
    const [availableBranches, setAvailableBranches] = useState<string[]>([]);
    const [customToken, setCustomToken] = useState<string>("");
    const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

    // Generation Configuration Options
    const [language, setLanguage] = useState<"es" | "en">("es");
    const [licenseType, setLicenseType] = useState<DocsGenerationOptions["licenseType"]>("MIT");
    const [authorName, setAuthorName] = useState<string>("");
    const [includeMermaid, setIncludeMermaid] = useState<boolean>(true);
    const [projectScope, setProjectScope] = useState<string>("");
    const [targetFiles, setTargetFiles] = useState<{
        readme: boolean;
        license: boolean;
        gitignore: boolean;
        envExample: boolean;
        contributing: boolean;
        codeOfConduct: boolean;
    }>({
        readme: true,
        license: true,
        gitignore: true,
        envExample: true,
        contributing: true,
        codeOfConduct: true
    });

    // Loading & Data States
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStage, setLoadingStage] = useState<string>("");
    const [analysis, setAnalysis] = useState<RepoAnalysisResult | null>(null);
    const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocsResult | null>(null);
    const [activeTab, setActiveTab] = useState<DocTabKey>("readme");
    const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Editable content buffers (allowing users to edit each file before downloading)
    const [editedContent, setEditedContent] = useState<Partial<Record<DocTabKey, string>>>({});
    const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);

    // Dynamic list of files ready to commit / push to GitHub
    const filesToPush: PushFileItem[] = useMemo(() => {
        const list: PushFileItem[] = [];
        if (targetFiles.readme && (editedContent.readme || generatedDocs?.readme)) {
            list.push({ path: "README.md", content: editedContent.readme ?? generatedDocs?.readme ?? "" });
        }
        if (targetFiles.license && (editedContent.license || generatedDocs?.license)) {
            list.push({ path: "LICENSE", content: editedContent.license ?? generatedDocs?.license ?? "" });
        }
        if (targetFiles.gitignore && (editedContent.gitignore || generatedDocs?.gitignore)) {
            list.push({ path: ".gitignore", content: editedContent.gitignore ?? generatedDocs?.gitignore ?? "" });
        }
        if (targetFiles.envExample && (editedContent.envExample || generatedDocs?.envExample)) {
            list.push({ path: ".env.example", content: editedContent.envExample ?? generatedDocs?.envExample ?? "" });
        }
        if (targetFiles.contributing && (editedContent.contributing || generatedDocs?.contributing)) {
            list.push({ path: "CONTRIBUTING.md", content: editedContent.contributing ?? generatedDocs?.contributing ?? "" });
        }
        if (targetFiles.codeOfConduct && (editedContent.codeOfConduct || generatedDocs?.codeOfConduct)) {
            list.push({ path: "CODE_OF_CONDUCT.md", content: editedContent.codeOfConduct ?? generatedDocs?.codeOfConduct ?? "" });
        }
        return list;
    }, [targetFiles, editedContent, generatedDocs]);

    const handleTargetFileToggle = (key: keyof typeof targetFiles) => {
        setTargetFiles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Trigger analysis and doc generation
    const handleAnalyzeAndGenerate = async () => {
        if (!repoUrl || !repoUrl.trim().includes("github.com")) {
            toast.error("Ingresa una URL válida de repositorio en GitHub (ej: https://github.com/usuario/repo)");
            return;
        }

        try {
            setIsLoading(true);
            setLoadingStage("Inspeccionando repositorio, dependencias y arquitectura...");

            // 1. Análisis estructural
            const analysisResult = await analyzeRepoForDocsAction(
                repoUrl.trim(),
                branch.trim() || undefined,
                customToken.trim() || undefined
            );

            setAnalysis(analysisResult.analysis);
            setAvailableBranches(analysisResult.availableBranches);
            if (!branch) {
                setBranch(analysisResult.defaultBranch);
            }

            // 2. Generación con IA
            setLoadingStage("Generando README, arquitectura Mermaid y gobernanza con IA...");

            const options: DocsGenerationOptions = {
                language,
                licenseType,
                authorName: authorName.trim() || analysisResult.analysis.owner,
                includeMermaid,
                projectScope: projectScope.trim() || undefined,
                targetFiles
            };

            const docs = await generateRepoDocsAction(analysisResult.analysis, options);
            setGeneratedDocs(docs);

            // Inicializar buffers editables
            setEditedContent({
                readme: docs.readme || "",
                license: docs.license || "",
                gitignore: docs.gitignore || "",
                envExample: docs.envExample || "",
                contributing: docs.contributing || "",
                codeOfConduct: docs.codeOfConduct || ""
            });

            // Establecer tab activo al primer archivo disponible
            const firstAvailable = (Object.keys(targetFiles) as DocTabKey[]).find(k => targetFiles[k] && docs[k]);
            if (firstAvailable) {
                setActiveTab(firstAvailable);
            }

            toast.success("¡Documentación generada con éxito!");
        } catch (error: any) {
            console.error("Error al generar documentación:", error);
            toast.error(error.message || "Error al procesar el repositorio con IA.");
        } finally {
            setIsLoading(false);
            setLoadingStage("");
        }
    };

    // Regenerar solo con nuevos parámetros
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
                projectScope: projectScope.trim() || undefined,
                targetFiles
            };

            const docs = await generateRepoDocsAction(analysis, options);
            setGeneratedDocs(docs);
            setEditedContent(prev => ({
                ...prev,
                readme: docs.readme || prev.readme,
                license: docs.license || prev.license,
                gitignore: docs.gitignore || prev.gitignore,
                envExample: docs.envExample || prev.envExample,
                contributing: docs.contributing || prev.contributing,
                codeOfConduct: docs.codeOfConduct || prev.codeOfConduct
            }));

            toast.success("Documentación actualizada.");
        } catch (error: any) {
            toast.error(error.message || "Error al regenerar documentos.");
        } finally {
            setIsLoading(false);
            setLoadingStage("");
        }
    };

    // Current active content
    const currentContent = editedContent[activeTab] ?? (generatedDocs ? (generatedDocs[activeTab] || "") : "");

    const handleContentChange = (newVal: string) => {
        setEditedContent(prev => ({ ...prev, [activeTab]: newVal }));
    };

    // Copy current file to clipboard
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

    // Download single file
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

    // Download all generated files as a single ZIP
    const handleDownloadAllZip = async () => {
        if (!generatedDocs && Object.keys(editedContent).length === 0) return;
        try {
            const zip = new JSZip();
            const repoName = analysis?.repo || "repo";

            if (targetFiles.readme && editedContent.readme) {
                zip.file("README.md", editedContent.readme);
            }
            if (targetFiles.license && editedContent.license) {
                zip.file("LICENSE", editedContent.license);
            }
            if (targetFiles.gitignore && editedContent.gitignore) {
                zip.file(".gitignore", editedContent.gitignore);
            }
            if (targetFiles.envExample && editedContent.envExample) {
                zip.file(".env.example", editedContent.envExample);
            }
            if (targetFiles.contributing && editedContent.contributing) {
                zip.file("CONTRIBUTING.md", editedContent.contributing);
            }
            if (targetFiles.codeOfConduct && editedContent.codeOfConduct) {
                zip.file("CODE_OF_CONDUCT.md", editedContent.codeOfConduct);
            }

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${repoName}-documentation.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Paquete ${repoName}-documentation.zip generado con éxito`);
        } catch (err) {
            console.error("Error empaquetando zip:", err);
            toast.error("Error al generar el archivo comprimido ZIP.");
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-4 p-0.5 sm:p-2 min-h-0">
            {/* 1. Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => router.push("/dashboard/teacher/tools")}
                                className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Herramientas
                            </Button>
                            <span className="text-muted-foreground/40">•</span>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Docs & Gobernanza IA</span>
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                            Generador Inteligente de README & Docs
                            <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                            Analiza cualquier repositorio de GitHub, detecta dependencias, scripts y arquitectura, y genera con IA el README.md profesional con diagramas Mermaid, Licencia, .gitignore, .env.example y guías de contribución.
                        </p>
                    </div>

                    {/* Indicador de Cuenta Activa en la Computadora */}
                    <div className="flex items-center gap-2">
                        {localAccount?.hasLocalAccount ? (
                            <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                <Laptop className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                                Cuenta del Equipo: {localAccount.name || localAccount.email || "Git Local"}
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
                            {showTokenInput ? "Ocultar Token" : "Token Temporal (Opcional)"}
                        </Button>
                    </div>
                </div>

                {/* Token Temporal Input Collapsible */}
                {showTokenInput && (
                    <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

            {/* 2. Barra de Entrada de Repositorio & Controles */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                    <div className="relative flex-1">
                        <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            type="text"
                            placeholder="https://github.com/propietario/repositorio"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleAnalyzeAndGenerate(); }}
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

                    <Button 
                        variant="outline" 
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="h-11 px-3 text-xs gap-1.5 shrink-0 cursor-pointer"
                    >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span>Opciones</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-0.5">
                            {Object.values(targetFiles).filter(Boolean).length} arch.
                        </Badge>
                    </Button>

                    <Button 
                        onClick={handleAnalyzeAndGenerate}
                        disabled={isLoading || !repoUrl.trim()}
                        className="h-11 px-6 font-bold text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer shrink-0"
                    >
                        {isLoading ? (
                            <>
                                <RotateCcw className="w-4 h-4 animate-spin" />
                                <span>{loadingStage || "Procesando con IA..."}</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Analizar y Generar Docs</span>
                            </>
                        )}
                    </Button>
                </div>

                {/* Advanced Options Accordion */}
                {showAdvancedOptions && (
                    <div className="pt-3 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Column 1: Parametros de Generacion */}
                        <div className="space-y-2">
                            <label className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Configuración de Idioma y Licencia</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[11px] text-muted-foreground block mb-1">Idioma</span>
                                    <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">Inglés</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <span className="text-[11px] text-muted-foreground block mb-1">Tipo de Licencia</span>
                                    <Select value={licenseType} onValueChange={(v: any) => setLicenseType(v)}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MIT">MIT License</SelectItem>
                                            <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                                            <SelectItem value="GPL-3.0">GNU GPLv3</SelectItem>
                                            <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
                                            <SelectItem value="ISC">ISC</SelectItem>
                                            <SelectItem value="Unlicense">The Unlicense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <span className="text-[11px] text-muted-foreground block mb-1">Autor / Organización</span>
                                <Input 
                                    placeholder="ej: SENA / SmartClass Devs"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Column 2: Archivos a Generar */}
                        <div className="space-y-2">
                            <label className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Archivos de la Suite</label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.readme} 
                                        onChange={() => handleTargetFileToggle("readme")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">README.md</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.license} 
                                        onChange={() => handleTargetFileToggle("license")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">LICENSE</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.gitignore} 
                                        onChange={() => handleTargetFileToggle("gitignore")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">.gitignore</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.envExample} 
                                        onChange={() => handleTargetFileToggle("envExample")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">.env.example</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.contributing} 
                                        onChange={() => handleTargetFileToggle("contributing")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">CONTRIBUTING</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <input 
                                        type="checkbox" 
                                        checked={targetFiles.codeOfConduct} 
                                        onChange={() => handleTargetFileToggle("codeOfConduct")}
                                        className="rounded border-border"
                                    />
                                    <span className="font-mono text-[11px]">CONDUCT.md</span>
                                </label>
                            </div>
                        </div>

                        {/* Column 3: Extras */}
                        <div className="space-y-2">
                            <label className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Contexto y Diagramas</label>
                            <div className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                                <div>
                                    <p className="font-semibold text-foreground">Diagrama de Arquitectura Mermaid</p>
                                    <p className="text-[10px] text-muted-foreground">Genera flujo interactivo en el README</p>
                                </div>
                                <Switch 
                                    checked={includeMermaid} 
                                    onCheckedChange={setIncludeMermaid}
                                />
                            </div>

                            <div>
                                <span className="text-[11px] text-muted-foreground block mb-1">Instrucciones o Alcance Adicional (Opcional)</span>
                                <Input 
                                    placeholder="ej: Enfocar el README en la API GraphQL..."
                                    value={projectScope}
                                    onChange={(e) => setProjectScope(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Panel de Resumen Técnico del Repositorio (Si fue analizado) */}
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
                                className="h-8 text-xs gap-1.5 cursor-pointer"
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

                    {/* Stack Badges Radar */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-blue-500" /> Stack Detectado:
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

                        {analysis.uiLibraries.map(ui => (
                            <Badge key={ui} variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                <Palette className="w-3 h-3 mr-1" />
                                {ui}
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
                                {analysis.envVars.length} variables de entorno
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Área de Trabajo Multidocumento */}
            {generatedDocs && (
                <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-h-[550px]">
                    {/* Toolbar de Pestañas y Acciones */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border bg-muted/30 p-2 gap-2">
                        {/* Selector de Pestañas Dinámicas */}
                        <div className="flex flex-wrap items-center gap-1">
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
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-background text-foreground shadow-xs border border-border"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                        <span>{cfg.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Botones de Control del Archivo Actual */}
                        <div className="flex items-center gap-1.5 justify-end">
                            {/* Toggle Vista Previa / Editor (solo para Markdown) */}
                            {(activeTab === "readme" || activeTab === "contributing" || activeTab === "codeOfConduct") && (
                                <div className="flex items-center rounded-lg border border-border p-0.5 bg-background text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("preview")}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                            viewMode === "preview" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <Eye className="w-3 h-3" />
                                        Vista Previa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("raw")}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                            viewMode === "raw" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <Code2 className="w-3 h-3" />
                                        Editor / Código
                                    </button>
                                </div>
                            )}

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

                            {/* Subir a Repositorio */}
                            <Button 
                                size="sm" 
                                onClick={() => setIsPushModalOpen(true)}
                                className="h-7 px-2.5 text-xs gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer font-semibold shadow-xs"
                                title="Subir cambios directamente al repositorio en GitHub"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Subir a Repositorio</span>
                            </Button>
                        </div>
                    </div>

                    {/* Contenedor del Archivo Activo */}
                    <div className="flex-1 p-4 sm:p-6 overflow-auto bg-background/50">
                        {/* Vista Previa Renderizada (Markdown + Mermaid) */}
                        {viewMode === "preview" && (activeTab === "readme" || activeTab === "contributing" || activeTab === "codeOfConduct") ? (
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
                                                                <Badge variant="outline" className="text-[10px] text-muted-foreground">Mermaid.js</Badge>
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
                            /* Editor de Código / Texto Plano */
                            <div className="h-full flex flex-col space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="font-mono">{TAB_CONFIG[activeTab].filename} — Modo Edición Directa</span>
                                    <span>{currentContent.split("\n").length} líneas • {currentContent.length} caracteres</span>
                                </div>
                                <textarea
                                    value={currentContent}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    className="w-full flex-1 min-h-[420px] p-4 font-mono text-xs leading-relaxed bg-muted/20 text-foreground border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary resize-y"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 5. Estado Vacío / Instrucciones Iniciales */}
            {!generatedDocs && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/10 min-h-[400px]">
                    <div className="p-4 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-4">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-foreground mb-2">
                        Genera la Documentación Oficial de tu Proyecto en Segundos
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                        Pega la URL de tu repositorio de GitHub arriba. SmartClass analizará automáticamente tus paquetes, Docker, variables y estructura para crear la suite completa de documentación con diagramas Mermaid interactivos.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl w-full text-left text-xs">
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> README.md
                            </p>
                            <p className="text-[11px] text-muted-foreground">Badges, stack, arquitectura Mermaid, setup paso a paso.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <KeyRound className="w-3.5 h-3.5 text-purple-500" /> .env.example
                            </p>
                            <p className="text-[11px] text-muted-foreground">Variables de entorno detectadas y documentadas.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> LICENSE
                            </p>
                            <p className="text-[11px] text-muted-foreground">MIT, Apache 2.0, GPLv3 y licencias abiertas oficiales.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <FileCode className="w-3.5 h-3.5 text-amber-500" /> .gitignore
                            </p>
                            <p className="text-[11px] text-muted-foreground">Compilado a medida según el stack detectado.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <Layers className="w-3.5 h-3.5 text-indigo-500" /> CONTRIBUTING
                            </p>
                            <p className="text-[11px] text-muted-foreground">Conventional Commits, ramas y reglas de PRs.</p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/70 bg-card">
                            <p className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                                <FileArchive className="w-3.5 h-3.5 text-teal-500" /> Descarga .ZIP
                            </p>
                            <p className="text-[11px] text-muted-foreground">Descarga toda la suite empaquetada en un solo click.</p>
                        </div>
                    </div>
                </div>
            )}
            {/* 6. Modal para Confirmar y Subir Cambios a GitHub */}
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
                        toast.success("¡Operación completada en GitHub!");
                    }}
                />
            )}
        </div>
    );
}
