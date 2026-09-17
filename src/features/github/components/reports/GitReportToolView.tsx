"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
    GitBranch, 
    Calendar, 
    Sparkles, 
    FileDown, 
    Copy, 
    Search, 
    ExternalLink, 
    Check, 
    Loader2, 
    AlertCircle, 
    ArrowLeft, 
    GitCommit, 
    Users, 
    Clock, 
    ShieldCheck, 
    Layers, 
    CheckCircle2, 
    BarChart3, 
    Flame,
    RotateCcw,
    FileText,
    KeyRound,
    ListTodo,
    CheckSquare,
    FileCode,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getRepoReportDataAction, generateGitAiReportAction, GitAiReportResult } from "../../actions/gitReportActions";
import type { GitReportData, GitReportCommit, GitReportContributor } from "../../services/gitReportService";
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    PieChart, 
    Pie, 
    Cell, 
    Legend 
} from "recharts";

const CHART_COLORS = [
    "#0d9488", // Teal
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#f97316", // Orange
];

interface GitReportToolViewProps {
    initialRepoUrl?: string;
    hasUserGithubToken?: boolean;
}

export function GitReportToolView({ initialRepoUrl = "", hasUserGithubToken = false }: GitReportToolViewProps) {
    const router = useRouter();

    // Estado del formulario
    const [repoUrl, setRepoUrl] = useState(initialRepoUrl);
    const [customPat, setCustomPat] = useState("");
    const [showPatInput, setShowPatInput] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [selectedPreset, setSelectedPreset] = useState<"today" | "week" | "month" | "custom" | "all">("week");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Estado de carga y datos
    const [isLoadingRepo, setIsLoadingRepo] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [reportData, setReportData] = useState<GitReportData | null>(null);
    const [aiReport, setAiReport] = useState<GitAiReportResult | null>(null);
    const [copiedSha, setCopiedSha] = useState<string | null>(null);

    // Filtros de búsqueda en la lista de commits
    const [commitSearch, setCommitSearch] = useState("");
    const [authorFilter, setAuthorFilter] = useState("all");

    // Filtros de búsqueda en tareas realizadas
    const [taskSearch, setTaskSearch] = useState("");
    const [taskCategoryFilter, setTaskCategoryFilter] = useState("all");

    // Estado para expandir/colapsar archivos inspeccionados en commits
    const [expandedCommits, setExpandedCommits] = useState<Record<string, boolean>>({});
    const toggleExpandCommit = (sha: string) => {
        setExpandedCommits(prev => ({ ...prev, [sha]: !prev[sha] }));
    };

    const [activeTab, setActiveTab] = useState<"ai-report" | "tasks" | "commits" | "charts">("ai-report");

    // 1. Cargar datos del repositorio
    const handleLoadRepo = async (overrideBranch?: string, overridePreset?: "today" | "week" | "month" | "custom" | "all") => {
        if (!repoUrl.trim()) {
            toast.error("Por favor ingresa la URL de un repositorio de GitHub.");
            return;
        }

        setIsLoadingRepo(true);
        try {
            const branchToUse = overrideBranch !== undefined ? overrideBranch : selectedBranch;
            const presetToUse = overridePreset !== undefined ? overridePreset : selectedPreset;

            const data = await getRepoReportDataAction(
                repoUrl.trim(),
                {
                    branch: branchToUse,
                    preset: presetToUse,
                    startDate: customStartDate || undefined,
                    endDate: customEndDate || undefined
                },
                customPat.trim() || undefined
            );

            setReportData(data);
            setSelectedBranch(data.selectedBranch);
            setSelectedPreset(data.selectedPreset);

            // Reiniciar informe de IA si cambió el rango o rama
            setAiReport(null);

            if (data.commits.length === 0) {
                toast.info("No se encontraron commits para el rango de fechas y rama seleccionados.");
            } else {
                toast.success(`Se cargaron ${data.commits.length} commits exitosamente.`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al consultar el repositorio de GitHub.");
        } finally {
            setIsLoadingRepo(false);
        }
    };

    // Cambio de preset rápido
    const handlePresetChange = (preset: "today" | "week" | "month" | "custom" | "all") => {
        setSelectedPreset(preset);
        if (reportData) {
            handleLoadRepo(selectedBranch, preset);
        }
    };

    // Cambio de rama
    const handleBranchChange = (branch: string) => {
        setSelectedBranch(branch);
        if (reportData) {
            handleLoadRepo(branch, selectedPreset);
        }
    };

    // 2. Generar Informe con IA
    const handleGenerateAiReport = async () => {
        if (!reportData || reportData.commits.length === 0) {
            toast.error("Primero carga un repositorio con commits para analizar.");
            return;
        }

        setIsGeneratingAi(true);
        const toastId = toast.loading("Auditoría técnica profunda con IA...", {
            description: "Indagando en los archivos, diffs y líneas de código en múltiples fases analíticas."
        });

        try {
            const result = await generateGitAiReportAction({
                repoInfo: reportData.repoInfo,
                dateRangeLabel: reportData.dateRange.label,
                summary: {
                    totalCommits: reportData.summary.totalCommits,
                    totalContributors: reportData.summary.totalContributors,
                    activeDaysCount: reportData.summary.activeDaysCount,
                },
                commits: reportData.commits,
                contributors: reportData.contributors
            });

            setAiReport(result);
            setActiveTab("ai-report");
            toast.success("¡Informe con IA generado exitosamente!", { id: toastId });
        } catch (err: any) {
            toast.error(err.message || "No se pudo generar el informe con IA.", { id: toastId });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // 3. Exportar PDF Corporativo
    const handleDownloadPdf = async () => {
        if (!reportData) return;
        setIsExportingPdf(true);
        const toastId = toast.loading("Compilando documento corporativo en PDF...", {
            description: "Aplicando maquetación ejecutiva SmartClass de alta resolución"
        });

        try {
            const { pdf } = await import("@react-pdf/renderer");
            const { GitReportCorporatePDF } = await import("../pdf/GitReportCorporatePDF");

            const docElement = (
                <GitReportCorporatePDF
                    reportData={reportData}
                    aiReport={aiReport}
                />
            );

            const blob = await pdf(docElement).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const cleanRepoName = reportData.repoInfo.repo.replace(/[^a-zA-Z0-9_-]/g, "_");
            const dateTag = reportData.dateRange.startDate || "completo";
            a.href = url;
            a.download = `Reporte_GitHub_${cleanRepoName}_${dateTag}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("PDF descargado correctamente", { id: toastId });
        } catch (err: any) {
            console.error("Error generando PDF:", err);
            toast.error(err.message || "Error al compilar el archivo PDF.", { id: toastId });
        } finally {
            setIsExportingPdf(false);
        }
    };

    // 4. Copiar Markdown al portapapeles
    const handleCopyMarkdown = () => {
        if (!aiReport?.markdownText) {
            toast.error("Primero genera el informe con IA para poder copiar el contenido.");
            return;
        }
        navigator.clipboard.writeText(aiReport.markdownText);
        toast.success("Informe en formato Markdown copiado al portapapeles.");
    };

    // Copiar SHA
    const handleCopySha = (sha: string) => {
        navigator.clipboard.writeText(sha);
        setCopiedSha(sha);
        toast.success("Hash del commit copiado");
        setTimeout(() => setCopiedSha(null), 2000);
    };

    // Filtro interactivo de commits en la tabla
    const filteredCommits = useMemo(() => {
        if (!reportData?.commits) return [];
        let list = reportData.commits;

        if (authorFilter !== "all") {
            list = list.filter(c => 
                (c.authorLogin && c.authorLogin.toLowerCase() === authorFilter.toLowerCase()) ||
                (c.authorName && c.authorName.toLowerCase() === authorFilter.toLowerCase())
            );
        }

        if (commitSearch.trim()) {
            const q = commitSearch.toLowerCase().trim();
            list = list.filter(c => 
                c.title.toLowerCase().includes(q) ||
                c.shortSha.toLowerCase().includes(q) ||
                c.authorName.toLowerCase().includes(q) ||
                (c.authorLogin && c.authorLogin.toLowerCase().includes(q))
            );
        }

        return list;
    }, [reportData?.commits, authorFilter, commitSearch]);

    // Filtro interactivo de tareas realizadas
    const filteredTasks = useMemo(() => {
        if (!aiReport?.detailedTasks) return [];
        let list = aiReport.detailedTasks;

        if (taskCategoryFilter !== "all") {
            list = list.filter(t => t.category === taskCategoryFilter);
        }

        if (taskSearch.trim()) {
            const q = taskSearch.toLowerCase().trim();
            list = list.filter(t => 
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                (t.technicalDetails && t.technicalDetails.toLowerCase().includes(q)) ||
                t.author.toLowerCase().includes(q) ||
                (t.impact && t.impact.toLowerCase().includes(q))
            );
        }

        return list;
    }, [aiReport?.detailedTasks, taskCategoryFilter, taskSearch]);

    return (
        <div className="w-full flex-1 flex flex-col space-y-4 p-1 sm:p-2 min-h-0">
            {/* Barra superior de navegación */}
            <div className="flex items-center justify-between gap-3">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push("/dashboard/teacher/tools")}
                    className="gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Herramientas
                </Button>

                <div className="flex items-center gap-2">
                    {hasUserGithubToken ? (
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            GitHub Token Activo
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1.5 py-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Modo Público (Sin Token)
                        </Badge>
                    )}
                </div>
            </div>

            {/* Banner de Cabecera */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-5 sm:p-7 shadow-xl">
                <div className="pointer-events-none absolute -top-28 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auditoría & Reportes de GitHub con IA</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        Reporte Ejecutivo de Repositorios y Commits
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                        Ingresa cualquier repositorio de GitHub, selecciona una rama individual o <strong>todas las ramas</strong> a la vez, filtra por día, semana, mes o rangos personalizados, y sintetiza el trabajo en un informe claro asistido por Inteligencia Artificial con descarga en PDF corporativo.
                    </p>
                </div>
            </div>

            {/* Panel de Configuración y Filtros */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Fila 1: Input URL y Botón de Carga */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                        <div className="lg:col-span-8 space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                Repositorio de GitHub
                                <span className="text-muted-foreground font-normal text-[11px]">(URL completa o usuario/repositorio)</span>
                            </label>
                            <div className="relative">
                                <Input
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/usuario/mi-proyecto o usuario/mi-proyecto"
                                    className="pr-10 text-xs sm:text-sm bg-background/60 font-mono"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleLoadRepo();
                                    }}
                                />
                                {repoUrl && (
                                    <button 
                                        type="button" 
                                        onClick={() => setRepoUrl("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex items-center gap-2">
                            <Button
                                onClick={() => handleLoadRepo()}
                                disabled={isLoadingRepo || !repoUrl.trim()}
                                className="flex-1 font-bold text-xs gap-2 cursor-pointer"
                            >
                                {isLoadingRepo ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Consultando GitHub...
                                    </>
                                ) : (
                                    <>
                                        <GitCommit className="h-4 w-4" />
                                        Cargar Commits
                                    </>
                                )}
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowPatInput(!showPatInput)}
                                            className={`shrink-0 cursor-pointer ${showPatInput ? 'border-primary text-primary' : ''}`}
                                        >
                                            <KeyRound className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Token de Acceso Personal (PAT) para repositorios privados
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Input opcional de Personal Access Token */}
                    {showPatInput && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 animate-in fade-in duration-200">
                            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                                <span>Personal Access Token (PAT) de GitHub</span>
                                <span className="text-[10px] text-muted-foreground">Permite acceder a repositorios privados o saltarse límites de cuota</span>
                            </label>
                            <Input
                                type="password"
                                value={customPat}
                                onChange={(e) => setCustomPat(e.target.value)}
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                className="text-xs bg-background font-mono"
                            />
                        </div>
                    )}

                    {/* Fila 2: Selectores de Rama y Rangos de Fecha */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border/60">
                        {/* Selector de Rama */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <GitBranch className="h-3.5 w-3.5 text-primary" />
                                Rama a evaluar
                            </label>
                            <Select 
                                value={selectedBranch} 
                                onValueChange={handleBranchChange}
                                disabled={isLoadingRepo}
                            >
                                <SelectTrigger className="text-xs bg-background">
                                    <SelectValue placeholder="Seleccionar rama" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-semibold text-primary">
                                        ⭐ Todas las ramas (Global)
                                    </SelectItem>
                                    {reportData?.branches.map((b) => (
                                        <SelectItem key={b} value={b} className="text-xs font-mono">
                                            {b} {b === reportData.repoInfo.defaultBranch ? "(por defecto)" : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Botones de Rangos de Fechas */}
                        <div className="md:col-span-8 space-y-1.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                Rango de Fechas
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedPreset === "today" ? "default" : "outline"}
                                    onClick={() => handlePresetChange("today")}
                                    className="text-xs h-8 cursor-pointer"
                                >
                                    Hoy (Día)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedPreset === "week" ? "default" : "outline"}
                                    onClick={() => handlePresetChange("week")}
                                    className="text-xs h-8 cursor-pointer"
                                >
                                    Esta Semana (7 días)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedPreset === "month" ? "default" : "outline"}
                                    onClick={() => handlePresetChange("month")}
                                    className="text-xs h-8 cursor-pointer"
                                >
                                    Este Mes (30 días)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedPreset === "custom" ? "default" : "outline"}
                                    onClick={() => setSelectedPreset("custom")}
                                    className="text-xs h-8 cursor-pointer"
                                >
                                    Personalizado
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedPreset === "all" ? "default" : "outline"}
                                    onClick={() => handlePresetChange("all")}
                                    className="text-xs h-8 cursor-pointer"
                                >
                                    Todo el Historial
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Inputs de fecha personalizado si está seleccionado */}
                    {selectedPreset === "custom" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/80 animate-in fade-in duration-200">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Fecha Inicial (Desde)</label>
                                <Input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="text-xs bg-background"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Fecha Final (Hasta)</label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="text-xs bg-background"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleLoadRepo(selectedBranch, "custom")}
                                        disabled={isLoadingRepo || !customStartDate}
                                        className="text-xs h-9 font-bold shrink-0 cursor-pointer"
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Vista de Datos y Acciones */}
            {reportData && (
                <div className="space-y-4">
                    {/* Tarjetas KPI de Resumen */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="border-border bg-card/60">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                    <GitCommit className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xl sm:text-2xl font-black text-foreground">
                                        {reportData.summary.totalCommits}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Commits en el rango</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card/60">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xl sm:text-2xl font-black text-foreground">
                                        {reportData.summary.totalContributors}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Autores activos</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card/60">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xl sm:text-2xl font-black text-foreground">
                                        {reportData.summary.activeDaysCount}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-medium">Días con actividad</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card/60">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate" title={reportData.dateRange.label}>
                                        {reportData.dateRange.label}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        Rama: {reportData.selectedBranch === "all" ? "Todas" : reportData.selectedBranch}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Barra de Acciones Principales */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleGenerateAiReport}
                                disabled={isGeneratingAi || reportData.commits.length === 0}
                                className="font-bold text-xs gap-2 bg-gradient-to-r from-primary to-teal-500 text-primary-foreground shadow-md hover:opacity-95 transition-all cursor-pointer"
                            >
                                {isGeneratingAi ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sintetizando con IA...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        {aiReport ? "Regenerar Informe con IA" : "Generar Informe con IA"}
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleDownloadPdf}
                                disabled={isExportingPdf || reportData.commits.length === 0}
                                className="font-bold text-xs gap-2 border-border/80 hover:bg-muted cursor-pointer"
                            >
                                {isExportingPdf ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Compilando PDF...
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="h-4 w-4 text-emerald-500" />
                                        Descargar PDF Corporativo
                                    </>
                                )}
                            </Button>

                            {aiReport && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCopyMarkdown}
                                    className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Copiar Informe en Markdown"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Pestañas de Vista */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid grid-cols-4 max-w-xl bg-muted/60 p-1 rounded-xl">
                            <TabsTrigger value="ai-report" className="text-xs gap-1.5 font-bold">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                Informe IA
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="text-xs gap-1.5 font-bold">
                                <ListTodo className="h-3.5 w-3.5 text-emerald-500" />
                                Tareas ({aiReport?.detailedTasks?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="commits" className="text-xs gap-1.5 font-bold">
                                <GitCommit className="h-3.5 w-3.5 text-blue-500" />
                                Commits ({reportData.commits.length})
                            </TabsTrigger>
                            <TabsTrigger value="charts" className="text-xs gap-1.5 font-bold">
                                <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                                Métricas
                            </TabsTrigger>
                        </TabsList>

                        {/* PESTAÑA 1: INFORME EJECUTIVO IA */}
                        <TabsContent value="ai-report" className="mt-4 space-y-4">
                            {!aiReport ? (
                                <Card className="border-border border-dashed p-8 text-center bg-card/40">
                                    <div className="max-w-md mx-auto space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-foreground">
                                            Aún no has generado el informe con Inteligencia Artificial
                                        </h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            El modelo LLM analizará los {reportData.commits.length} commits del período seleccionado para estructurar un informe claro, categorizar las características desarrolladas y describir el esfuerzo de cada integrante.
                                        </p>
                                        <Button
                                            onClick={handleGenerateAiReport}
                                            disabled={isGeneratingAi}
                                            className="font-bold text-xs gap-2 cursor-pointer mt-2"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generar Informe Ahora
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {/* Resumen Ejecutivo Card */}
                                    <Card className="border-border shadow-sm border-l-4 border-l-primary">
                                        <CardHeader className="pb-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                                                    Resumen Ejecutivo Oficial
                                                </Badge>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {aiReport.periodLabel}
                                                </span>
                                            </div>
                                            <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground pt-1">
                                                {aiReport.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                                                {aiReport.executiveSummary}
                                            </p>

                                            {/* Hitos Destacados */}
                                            {aiReport.keyAchievements && aiReport.keyAchievements.length > 0 && (
                                                <div className="pt-3 border-t border-border/60 space-y-2">
                                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                        Hitos y Entregas Destacadas:
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {aiReport.keyAchievements.map((ach, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 text-xs text-foreground">
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                                <span>{ach}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Sección Destacada de Tareas Realizadas */}
                                    {aiReport.detailedTasks && aiReport.detailedTasks.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <ListTodo className="h-4 w-4 text-emerald-500" />
                                                    Tareas Realizadas en el Repositorio ({aiReport.detailedTasks.length})
                                                </h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setActiveTab("tasks")}
                                                    className="text-xs text-primary font-semibold hover:underline p-0 h-auto cursor-pointer"
                                                >
                                                    Explorar todas las tareas en detalle →
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {aiReport.detailedTasks.slice(0, 4).map((task, idx) => {
                                                    const isEmerald = task.badgeColor === "emerald";
                                                    const isBlue = task.badgeColor === "blue";
                                                    const isAmber = task.badgeColor === "amber";
                                                    const isPurple = task.badgeColor === "purple";

                                                    return (
                                                        <Card key={idx} className="border-border hover:border-emerald-500/40 transition-colors">
                                                            <CardContent className="p-4 space-y-2">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`text-[10px] font-bold ${
                                                                            isEmerald ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                                                            isBlue ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                                                                            isAmber ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                                                            isPurple ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' :
                                                                            'bg-muted text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {task.category}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                                        Por {task.author}
                                                                    </span>
                                                                </div>

                                                                <h4 className="text-sm font-bold text-foreground">
                                                                    {task.title}
                                                                </h4>

                                                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                                    {task.description}
                                                                </p>

                                                                {task.impact && (
                                                                    <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium line-clamp-1">
                                                                        <strong>Impacto:</strong> {task.impact}
                                                                    </p>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Desglose por Categorías de Trabajo */}
                                    {aiReport.categories && aiReport.categories.length > 0 && (
                                        <div className="space-y-2.5">
                                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-primary" />
                                                Desglose de Trabajo por Categorías
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {aiReport.categories.map((cat, idx) => {
                                                    const isEmerald = cat.badgeColor === "emerald";
                                                    const isBlue = cat.badgeColor === "blue";
                                                    const isAmber = cat.badgeColor === "amber";
                                                    const isPurple = cat.badgeColor === "purple";

                                                    return (
                                                        <Card key={idx} className="border-border hover:border-primary/40 transition-colors">
                                                            <CardContent className="p-4 space-y-2">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`text-[10px] font-bold ${
                                                                            isEmerald ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                                                            isBlue ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                                                                            isAmber ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                                                            isPurple ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' :
                                                                            'bg-muted text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {cat.category}
                                                                    </Badge>
                                                                    {cat.commitsCount > 0 && (
                                                                        <span className="text-[10px] font-mono text-muted-foreground">
                                                                            ~{cat.commitsCount} commits
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <h4 className="text-sm font-bold text-foreground">
                                                                    {cat.title}
                                                                </h4>

                                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                                    {cat.description}
                                                                </p>

                                                                {cat.impact && (
                                                                    <div className="pt-2 border-t border-border/50 text-[11px] text-primary font-medium">
                                                                        <strong>Impacto:</strong> {cat.impact}
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contribuciones por Integrante */}
                                    {aiReport.contributorHighlights && aiReport.contributorHighlights.length > 0 && (
                                        <div className="space-y-2.5">
                                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                Foco y Aportes por Integrante
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {aiReport.contributorHighlights.map((c, idx) => (
                                                    <Card key={idx} className="border-border">
                                                        <CardContent className="p-4 space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-bold text-foreground">
                                                                        {c.name}
                                                                    </p>
                                                                    {c.login && (
                                                                        <p className="text-[11px] text-muted-foreground font-mono">
                                                                            @{c.login}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <Badge variant="secondary" className="font-mono text-xs font-bold text-primary">
                                                                    {c.commitsCount} ({c.percentage}%)
                                                                </Badge>
                                                            </div>

                                                            <p className="text-xs font-semibold text-muted-foreground">
                                                                {c.roleDescription}
                                                            </p>

                                                            {c.mainDeliveries && c.mainDeliveries.length > 0 && (
                                                                <ul className="text-[11px] text-muted-foreground space-y-1 pt-1 list-disc list-inside">
                                                                    {c.mainDeliveries.map((del, dIdx) => (
                                                                        <li key={dIdx} className="leading-snug">{del}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cadencia y Salud */}
                                    {aiReport.cadenceAndHealth && (
                                        <Card className="border-border bg-muted/20">
                                            <CardContent className="p-4 sm:p-5 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Flame className="h-4 w-4 text-amber-500" />
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Cadencia de Trabajo: {aiReport.cadenceAndHealth.status}
                                                    </h3>
                                                </div>

                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {aiReport.cadenceAndHealth.velocityDescription}
                                                </p>

                                                {aiReport.cadenceAndHealth.recommendations?.length > 0 && (
                                                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                                                        <p className="text-xs font-bold text-foreground">Próximos Pasos Sugeridos:</p>
                                                        <div className="space-y-1">
                                                            {aiReport.cadenceAndHealth.recommendations.map((rec, rIdx) => (
                                                                <p key={rIdx} className="text-xs text-muted-foreground flex items-center gap-2">
                                                                    <span className="text-primary font-bold">→</span>
                                                                    {rec}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* PESTAÑA 2: INVENTARIO DETALLADO DE TAREAS */}
                        <TabsContent value="tasks" className="mt-4 space-y-4">
                            {!aiReport ? (
                                <Card className="border-border border-dashed p-8 text-center bg-card/40">
                                    <div className="max-w-md mx-auto space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                                            <ListTodo className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-foreground">
                                            Aún no has generado el desglose de tareas con IA
                                        </h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            El modelo de Inteligencia Artificial analizará cada commit del repositorio para listar con exactitud qué tareas específicas se realizaron, quién las hizo y qué partes del sistema fueron impactadas.
                                        </p>
                                        <Button
                                            onClick={handleGenerateAiReport}
                                            disabled={isGeneratingAi}
                                            className="font-bold text-xs gap-2 cursor-pointer mt-2"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generar Informe Ahora
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {/* Barra de Filtro y Búsqueda de Tareas */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                                        <div className="relative w-full sm:w-80">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                value={taskSearch}
                                                onChange={(e) => setTaskSearch(e.target.value)}
                                                placeholder="Buscar por tarea, detalle técnico o autor..."
                                                className="pl-8 text-xs bg-background"
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {[
                                                { label: "Todas", val: "all" },
                                                { label: "Nuevas Funcionalidades", val: "Nueva Funcionalidad" },
                                                { label: "Mejoras / Refactor", val: "Mejora / Refactor" },
                                                { label: "Corrección de Errores", val: "Corrección de Error" },
                                                { label: "DevOps / Infraestructura", val: "DevOps / Infraestructura" },
                                                { label: "Documentación", val: "Documentación / Tests" }
                                            ].map((cat) => (
                                                <Button
                                                    key={cat.val}
                                                    type="button"
                                                    size="sm"
                                                    variant={taskCategoryFilter === cat.val ? "default" : "outline"}
                                                    onClick={() => setTaskCategoryFilter(cat.val)}
                                                    className="text-[11px] h-7 px-2.5 cursor-pointer"
                                                >
                                                    {cat.label}
                                                </Button>
                                            ))}

                                            {(taskSearch || taskCategoryFilter !== "all") && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setTaskSearch("");
                                                        setTaskCategoryFilter("all");
                                                    }}
                                                    className="text-xs text-muted-foreground hover:text-foreground h-7 cursor-pointer"
                                                >
                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                    Limpiar
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Listado de Tarjetas de Tareas */}
                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredTasks.length === 0 ? (
                                            <Card className="p-8 text-center border-border text-xs text-muted-foreground">
                                                No se encontraron tareas con los filtros seleccionados.
                                            </Card>
                                        ) : (
                                            filteredTasks.map((task, idx) => {
                                                const isEmerald = task.badgeColor === "emerald";
                                                const isBlue = task.badgeColor === "blue";
                                                const isAmber = task.badgeColor === "amber";
                                                const isPurple = task.badgeColor === "purple";

                                                return (
                                                    <Card key={idx} className="border-border hover:border-primary/40 transition-all shadow-xs">
                                                        <CardContent className="p-4 sm:p-5 space-y-3">
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="font-mono text-[10px] font-bold">
                                                                        TAREA #{idx + 1}
                                                                    </Badge>
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={`text-[10px] font-bold ${
                                                                            isEmerald ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                                                            isBlue ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                                                                            isAmber ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                                                            isPurple ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' :
                                                                            'bg-muted text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {task.category}
                                                                    </Badge>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span className="font-semibold text-foreground">
                                                                        Responsable: {task.author}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <h4 className="text-base font-bold text-foreground">
                                                                    {task.title}
                                                                </h4>
                                                                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed mt-1.5 whitespace-pre-line">
                                                                    {task.description}
                                                                </p>
                                                            </div>

                                                            {task.technicalDetails && (
                                                                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                                                                    <p className="font-bold text-[11px] text-foreground uppercase tracking-wide">
                                                                        Detalles Técnicos & Archivos Modificados:
                                                                    </p>
                                                                    <p className="text-muted-foreground leading-relaxed">
                                                                        {task.technicalDetails}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {task.impact && (
                                                                <div className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                                                                    <strong>Impacto / Utilidad en el Sistema:</strong> {task.impact}
                                                                </div>
                                                            )}

                                                            {task.filesTouched && task.filesTouched.length > 0 && (
                                                                <div className="space-y-1.5 pt-1">
                                                                    <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                                        <FileCode className="h-3.5 w-3.5 text-primary" />
                                                                        Archivos Modificados Verificados ({task.filesTouched.length}):
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {task.filesTouched.map((fPath, fIdx) => (
                                                                            <span
                                                                                key={fIdx}
                                                                                className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/90 font-medium"
                                                                            >
                                                                                <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                                                                                {fPath}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {task.relatedCommits && task.relatedCommits.length > 0 && (
                                                                <div className="pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap text-xs">
                                                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                                                        Commits asociados:
                                                                    </span>
                                                                    {task.relatedCommits.map((sha, sIdx) => (
                                                                        <button
                                                                            key={sIdx}
                                                                            type="button"
                                                                            onClick={() => handleCopySha(sha)}
                                                                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-primary font-bold flex items-center gap-1 cursor-pointer"
                                                                            title="Copiar SHA"
                                                                        >
                                                                            {copiedSha === sha ? (
                                                                                <Check className="h-3 w-3 text-emerald-500" />
                                                                            ) : (
                                                                                sha
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* PESTAÑA 3: LISTA DE COMMITS AUDITADOS */}
                        <TabsContent value="commits" className="mt-4 space-y-3">
                            {/* Filtros de la lista */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={commitSearch}
                                        onChange={(e) => setCommitSearch(e.target.value)}
                                        placeholder="Buscar por mensaje, autor o hash..."
                                        className="pl-8 text-xs bg-background"
                                    />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Select value={authorFilter} onValueChange={setAuthorFilter}>
                                        <SelectTrigger className="text-xs w-full sm:w-48 bg-background">
                                            <SelectValue placeholder="Filtrar por autor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los autores</SelectItem>
                                            {reportData.contributors.map((c) => (
                                                <SelectItem key={c.name} value={c.login || c.name} className="text-xs">
                                                    {c.name} ({c.commitsCount})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {(commitSearch || authorFilter !== "all") && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setCommitSearch("");
                                                setAuthorFilter("all");
                                            }}
                                            className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                                        >
                                            <RotateCcw className="h-3 w-3 mr-1" />
                                            Restablecer
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Tabla de commits */}
                            <div className="rounded-xl border border-border overflow-hidden bg-card">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/60 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
                                            <tr>
                                                <th className="py-2.5 px-3">Fecha y Hora</th>
                                                <th className="py-2.5 px-3">Autor</th>
                                                <th className="py-2.5 px-3">Ramas</th>
                                                <th className="py-2.5 px-3">Commit</th>
                                                <th className="py-2.5 px-3 text-right">Hash</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {filteredCommits.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                                                        No se encontraron commits coincidentes con los filtros.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredCommits.map((cm) => (
                                                    <tr key={cm.sha} className="hover:bg-muted/30 transition-colors">
                                                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                                                            {cm.regionalDate} {cm.regionalTime}
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                {cm.authorAvatar ? (
                                                                    <img 
                                                                        src={cm.authorAvatar} 
                                                                        alt={cm.authorName} 
                                                                        className="w-5 h-5 rounded-full ring-1 ring-border"
                                                                    />
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                                                        {cm.authorName.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <span className="font-semibold text-foreground">
                                                                    {cm.authorName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1 flex-wrap max-w-[160px]">
                                                                {cm.branches.map((br) => (
                                                                    <Badge key={br} variant="secondary" className="text-[9px] py-0 px-1 font-mono">
                                                                        {br}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <p className="font-medium text-foreground text-xs line-clamp-2">
                                                                {cm.title}
                                                            </p>
                                                            {cm.body && (
                                                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                                    {cm.body}
                                                                </p>
                                                            )}

                                                            {cm.files && cm.files.length > 0 && (
                                                                <div className="mt-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleExpandCommit(cm.sha)}
                                                                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 px-2.5 py-0.5 rounded-md cursor-pointer transition-colors"
                                                                    >
                                                                        <FileCode className="h-3.5 w-3.5" />
                                                                        {cm.files.length} {cm.files.length === 1 ? 'archivo modificado' : 'archivos modificados'}
                                                                        {cm.stats && (
                                                                            <span className="font-mono text-[10px] ml-1">
                                                                                (<span className="text-emerald-500 font-bold">+{cm.stats.additions}</span> / <span className="text-rose-500 font-bold">-{cm.stats.deletions}</span>)
                                                                            </span>
                                                                        )}
                                                                        {expandedCommits[cm.sha] ? (
                                                                            <ChevronDown className="h-3 w-3 ml-0.5" />
                                                                        ) : (
                                                                            <ChevronRight className="h-3 w-3 ml-0.5" />
                                                                        )}
                                                                    </button>

                                                                    {expandedCommits[cm.sha] && (
                                                                        <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-1.5 text-xs animate-in fade-in duration-200">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                                Archivos y cambios comprobados:
                                                                            </p>
                                                                            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                                                                                {cm.files.map((file, fIdx) => (
                                                                                    <div key={fIdx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-background border border-border/50 text-[11px]">
                                                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                                                                                                file.status === 'added' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' :
                                                                                                file.status === 'removed' ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' :
                                                                                                'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                                                                                            }`}>
                                                                                                {file.status}
                                                                                            </span>
                                                                                            <span className="font-mono text-foreground font-medium truncate" title={file.filename}>
                                                                                                {file.filename}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-mono text-[10px] whitespace-nowrap">
                                                                                            <span className="text-emerald-500 font-bold">+{file.additions}</span>
                                                                                            <span className="text-muted-foreground mx-1">/</span>
                                                                                            <span className="text-rose-500 font-bold">-{file.deletions}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => handleCopySha(cm.sha)}
                                                                    className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-primary font-bold flex items-center gap-1 cursor-pointer"
                                                                    title="Copiar SHA"
                                                                >
                                                                    {copiedSha === cm.sha ? (
                                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                                    ) : (
                                                                        cm.shortSha
                                                                    )}
                                                                </button>
                                                                <a
                                                                    href={cm.commitUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                                                                    title="Ver en GitHub"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </a>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>

                        {/* PESTAÑA 3: MÉTRICAS Y GRÁFICOS */}
                        <TabsContent value="charts" className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Gráfico de Timeline de Commits */}
                                <Card className="lg:col-span-7 border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                            Actividad de Commits en el Tiempo
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Número de commits registrados por fecha
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-64 sm:h-72">
                                        {reportData.timeline.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                                Sin datos para graficar
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={reportData.timeline}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "11px", borderRadius: "8px" }}
                                                    />
                                                    <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Commits" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Gráfico Donut de Contribuidores */}
                                <Card className="lg:col-span-5 border-border">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <Users className="h-4 w-4 text-blue-500" />
                                            Distribución por Colaborador
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Porcentaje de commits por integrante
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-64 sm:h-72">
                                        {reportData.contributors.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                                Sin datos de colaboradores
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={reportData.contributors}
                                                        dataKey="commitsCount"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={75}
                                                        paddingAngle={3}
                                                    >
                                                        {reportData.contributors.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "11px", borderRadius: "8px" }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
