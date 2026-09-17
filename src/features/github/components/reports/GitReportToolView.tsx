"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    Square,
    ListFilter,
    FileCode,
    ChevronDown,
    ChevronRight,
    GraduationCap,
    Briefcase,
    Code2,
    Hash,
    SlidersHorizontal,
    Lightbulb,
    Eye,
    Github,
    Settings
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
import { 
    getRepoReportDataAction, 
    generateGitAiReportAction, 
    GitAiReportResult,
    GitReportMode 
} from "../../actions/gitReportActions";
import type { GitReportData, GitReportCommit, GitReportContributor } from "../../services/gitReportService";
import { LiveCodeInspectorModal } from "./LiveCodeInspectorModal";
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

const MONTHS_LIST = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" }
];

interface GitReportToolViewProps {
    initialRepoUrl?: string;
    hasUserGithubToken?: boolean;
    tokenSource?: "personal" | "system" | "env" | "none";
}

export function GitReportToolView({ 
    initialRepoUrl = "", 
    hasUserGithubToken = false,
    tokenSource = "none"
}: GitReportToolViewProps) {
    const router = useRouter();

    // Estado del formulario
    const [repoUrl, setRepoUrl] = useState(initialRepoUrl);
    const [reportData, setReportData] = useState<GitReportData | null>(null);
    const [customPat, setCustomPat] = useState("");
    const [showPatInput, setShowPatInput] = useState(false);

    const [selectedBranch, setSelectedBranch] = useState("all");
    const [selectedPreset, setSelectedPreset] = useState<"today" | "week" | "month" | "last-month" | "month-week" | "custom" | "all">("week");
    const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
    const [selectedWeekOfMonth, setSelectedWeekOfMonth] = useState<number | "all">("all");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Límites de commits reales del repositorio (fecha más antigua y fecha más reciente)
    const bounds = useMemo(() => {
        const oldestStr = reportData?.repoBounds?.oldestDate || (reportData?.commits?.length ? reportData.commits[reportData.commits.length - 1].regionalDate : null);
        const latestStr = reportData?.repoBounds?.latestDate || (reportData?.commits?.length ? reportData.commits[0].regionalDate : null);

        if (!oldestStr || !latestStr) return null;

        const [oldY, oldM, oldD] = oldestStr.split("-").map(Number);
        const [newY, newM, newD] = latestStr.split("-").map(Number);

        return {
            oldestDateStr: oldestStr,
            latestDateStr: latestStr,
            oldestYear: oldY,
            oldestMonth: oldM,
            oldestDay: oldD,
            latestYear: newY,
            latestMonth: newM,
            latestDay: newD,
            activeDates: reportData?.repoBounds?.activeDates || []
        };
    }, [reportData]);

    // Años disponibles basados exclusivamente en los commits reales del repositorio
    const availableYears = useMemo(() => {
        if (!bounds) {
            const currentYear = new Date().getFullYear();
            return [currentYear];
        }
        const years: number[] = [];
        for (let y = bounds.latestYear; y >= bounds.oldestYear; y--) {
            years.push(y);
        }
        return years.length > 0 ? years : [bounds.latestYear];
    }, [bounds]);

    const daysInSelectedMonth = useMemo(() => {
        return new Date(selectedYear, selectedMonth, 0).getDate();
    }, [selectedYear, selectedMonth]);

    // Valida si un mes está deshabilitado según los commits del repo
    const isMonthDisabled = (monthNum: number) => {
        if (!bounds) return false;
        if (selectedYear === bounds.oldestYear && monthNum < bounds.oldestMonth) return true;
        if (selectedYear === bounds.latestYear && monthNum > bounds.latestMonth) return true;
        if (selectedYear < bounds.oldestYear || selectedYear > bounds.latestYear) return true;

        // Deshabilitar meses que no tengan commits reales registrados
        if (bounds.activeDates && bounds.activeDates.length > 0) {
            const pad = (n: number) => String(n).padStart(2, "0");
            const mPrefix = `${selectedYear}-${pad(monthNum)}`;
            const hasCommitInMonth = bounds.activeDates.some(d => d.startsWith(mPrefix));
            if (!hasCommitInMonth) return true;
        }

        return false;
    };

    // Valida si una semana específica tiene commits registrados
    const checkWeekHasCommits = (week: number | "all", m = selectedMonth, y = selectedYear) => {
        if (!bounds) return true;
        const pad = (n: number) => String(n).padStart(2, "0");
        const daysInM = new Date(y, m, 0).getDate();

        if (week === "all") {
            if (bounds.activeDates && bounds.activeDates.length > 0) {
                const mPrefix = `${y}-${pad(m)}`;
                return bounds.activeDates.some(d => d.startsWith(mPrefix));
            }
            return true;
        }

        let startDay = 1;
        let endDay = 7;
        if (week === 1) { startDay = 1; endDay = Math.min(7, daysInM); }
        else if (week === 2) { startDay = 8; endDay = Math.min(14, daysInM); }
        else if (week === 3) { startDay = 15; endDay = Math.min(21, daysInM); }
        else if (week === 4) { startDay = 22; endDay = Math.min(28, daysInM); }
        else if (week === 5) {
            if (daysInM < 29) return false;
            startDay = 29; endDay = daysInM;
        }

        const weekStartDate = `${y}-${pad(m)}-${pad(startDay)}`;
        const weekEndDate = `${y}-${pad(m)}-${pad(endDay)}`;

        if (weekEndDate < bounds.oldestDateStr || weekStartDate > bounds.latestDateStr) return false;

        if (bounds.activeDates && bounds.activeDates.length > 0) {
            return bounds.activeDates.some(d => d >= weekStartDate && d <= weekEndDate);
        }

        return true;
    };

    // Valida si una semana está deshabilitada (SOLO activa si tiene commits reales)
    const isWeekDisabled = (week: number | "all") => {
        if (!bounds) return false;
        if (isMonthDisabled(selectedMonth)) return true;
        return !checkWeekHasCommits(week, selectedMonth, selectedYear);
    };

    // Selección interactiva de commits en la tabla para auditoría puntual
    const [selectedCommitShas, setSelectedCommitShas] = useState<Set<string>>(new Set());
    const [onlyShowSelectedCommits, setOnlyShowSelectedCommits] = useState(false);

    const toggleCommitSelection = (sha: string) => {
        setSelectedCommitShas(prev => {
            const next = new Set(prev);
            if (next.has(sha)) {
                next.delete(sha);
            } else {
                next.add(sha);
            }
            return next;
        });
        setAiReport(null);
    };

    const selectAllCommits = () => {
        if (!reportData?.commits) return;
        setSelectedCommitShas(new Set(reportData.commits.map(c => c.sha)));
        setAiReport(null);
    };

    const clearCommitSelection = () => {
        setSelectedCommitShas(new Set());
        setAiReport(null);
    };

    const invertCommitSelection = () => {
        if (!reportData?.commits) return;
        setSelectedCommitShas(prev => {
            const next = new Set<string>();
            for (const c of reportData.commits) {
                if (!prev.has(c.sha)) {
                    next.add(c.sha);
                }
            }
            return next;
        });
        setAiReport(null);
    };

    // Opciones del Informe con IA
    const [reportMode, setReportMode] = useState<GitReportMode>("pedagogical");
    const [includeAuthors, setIncludeAuthors] = useState(true);
    const [includeCommitHashes, setIncludeCommitHashes] = useState(true);

    // Estado de carga y datos
    const [isLoadingRepo, setIsLoadingRepo] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
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

    // Inspección de Código en Vivo
    const [inspectingCommit, setInspectingCommit] = useState<GitReportCommit | null>(null);
    const [inspectingFilename, setInspectingFilename] = useState<string | null>(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);

    // El botón de generar informe con IA solo se habilita después de haber escaneado commits y si encuentra
    const canGenerateAiReport = useMemo(() => {
        if (isLoadingRepo) return false;
        if (isGeneratingAi) return false;
        if (!reportData) return false;
        if (reportData.commits.length === 0) return false;
        if (selectedCommitShas.size === 0 && reportData.commits.length > 0) return false;
        return true;
    }, [isLoadingRepo, isGeneratingAi, reportData, selectedCommitShas]);

    // El botón de PDF sólo se habilita si se genera un nuevo informe y se deshabilita si cambia el filtro
    const canExportPdf = useMemo(() => {
        if (!reportData) return false;
        if (!aiReport) return false;
        if (isLoadingRepo) return false;
        if (isGeneratingAi) return false;
        if (isExportingPdf) return false;
        if (reportData.commits.length === 0) return false;
        return true;
    }, [reportData, aiReport, isLoadingRepo, isGeneratingAi, isExportingPdf]);

    const handleOpenInspector = (commit: GitReportCommit, filename?: string) => {
        setInspectingCommit(commit);
        setInspectingFilename(filename || null);
        setIsInspectorOpen(true);
    };

    const handleOpenInspectorBySha = (sha: string, filename?: string) => {
        if (!reportData) return;
        const targetCommit = reportData.commits.find(c => 
            c.sha.toLowerCase().startsWith(sha.toLowerCase()) || 
            sha.toLowerCase().startsWith(c.sha.toLowerCase()) || 
            c.shortSha.toLowerCase() === sha.toLowerCase()
        );
        if (targetCommit) {
            handleOpenInspector(targetCommit, filename);
        } else {
            handleOpenInspector({
                sha,
                shortSha: sha.slice(0, 7),
                title: `Commit ${sha.slice(0, 7)}`,
                body: "",
                date: new Date().toISOString(),
                regionalDate: "",
                regionalTime: "",
                authorName: "Autor",
                authorEmail: "",
                authorLogin: null,
                authorAvatar: null,
                authorHtmlUrl: null,
                commitUrl: `https://github.com/${reportData.repoInfo.owner}/${reportData.repoInfo.repo}/commit/${sha}`,
                branches: []
            }, filename);
        }
    };

    // 1. Cargar datos del repositorio
    const handleLoadRepo = async (
        overrideBranch?: string, 
        overridePreset?: "today" | "week" | "month" | "last-month" | "month-week" | "custom" | "all",
        dateOptions?: {
            month?: number;
            year?: number;
            weekOfMonth?: number | "all";
        }
    ) => {
        if (!repoUrl.trim()) {
            toast.error("Por favor ingresa la URL de un repositorio de GitHub.");
            return;
        }

        setIsLoadingRepo(true);
        try {
            const branchToUse = overrideBranch !== undefined ? overrideBranch : selectedBranch;
            const presetToUse = overridePreset !== undefined ? overridePreset : selectedPreset;

            const monthToUse = dateOptions?.month !== undefined ? dateOptions.month : selectedMonth;
            const yearToUse = dateOptions?.year !== undefined ? dateOptions.year : selectedYear;
            const weekToUse = dateOptions?.weekOfMonth !== undefined ? dateOptions.weekOfMonth : selectedWeekOfMonth;

            const data = await getRepoReportDataAction(
                repoUrl.trim(),
                {
                    branch: branchToUse,
                    filterType: "dates",
                    preset: presetToUse,
                    month: monthToUse,
                    year: yearToUse,
                    weekOfMonth: weekToUse,
                    startDate: customStartDate || undefined,
                    endDate: customEndDate || undefined
                },
                customPat.trim() || undefined
            );

            setReportData(data);
            setSelectedBranch(data.selectedBranch);
            setSelectedPreset(data.selectedPreset);
            if (data.selectedMonth) setSelectedMonth(data.selectedMonth);
            if (data.selectedYear) setSelectedYear(data.selectedYear);
            if (data.selectedWeekOfMonth !== undefined) setSelectedWeekOfMonth(data.selectedWeekOfMonth);
            // Seleccionar todos los commits por defecto
            setSelectedCommitShas(new Set(data.commits.map(c => c.sha)));
            setOnlyShowSelectedCommits(false);

            // Reiniciar informe de IA si cambió el conjunto de datos
            setAiReport(null);

            if (data.commits.length === 0) {
                toast.info("No se encontraron commits para el rango de fechas seleccionado.");
            } else {
                toast.success(`Se cargaron ${data.commits.length} commits exitosamente.`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al consultar el repositorio de GitHub.");
            if (reportData && reportData.commits.length > 0) {
                setActiveTab("commits");
            }
        } finally {
            setIsLoadingRepo(false);
        }
    };

    // Cambio de preset rápido
    const handlePresetChange = (preset: "today" | "week" | "month" | "last-month" | "month-week" | "custom" | "all") => {
        setSelectedPreset(preset);
        setAiReport(null);
        if (reportData && preset !== "custom") {
            handleLoadRepo(selectedBranch, preset, {
                month: selectedMonth,
                year: selectedYear,
                weekOfMonth: selectedWeekOfMonth
            });
        }
    };

    // Manejo interactivo de cambios en Mes y Semanas
    const handleSelectMonthWeekPreset = () => {
        setSelectedPreset("month-week");
        setAiReport(null);
        let targetYear = selectedYear;
        let targetMonth = selectedMonth;
        let targetWeek: number | "all" = selectedWeekOfMonth;

        if (bounds) {
            // Asegurar que el año y mes inicial caigan dentro del rango de commits del repo
            if (targetYear > bounds.latestYear || targetYear < bounds.oldestYear) {
                targetYear = bounds.latestYear;
                setSelectedYear(targetYear);
            }
            if (targetYear === bounds.latestYear && targetMonth > bounds.latestMonth) {
                targetMonth = bounds.latestMonth;
                setSelectedMonth(targetMonth);
            } else if (targetYear === bounds.oldestYear && targetMonth < bounds.oldestMonth) {
                targetMonth = bounds.oldestMonth;
                setSelectedMonth(targetMonth);
            }

            // Si el mes no tiene commits, buscar el último mes activo
            if (bounds.activeDates && bounds.activeDates.length > 0) {
                const pad = (n: number) => String(n).padStart(2, "0");
                const hasMonthCommits = bounds.activeDates.some(d => d.startsWith(`${targetYear}-${pad(targetMonth)}`));
                if (!hasMonthCommits) {
                    targetMonth = bounds.latestMonth;
                    setSelectedMonth(targetMonth);
                }
            }
        }

        // Si la semana seleccionada no tiene commits, seleccionar la primera activa o "all"
        if (!checkWeekHasCommits(targetWeek, targetMonth, targetYear)) {
            const activeWeek = ([1, 2, 3, 4, 5] as const).find(w => checkWeekHasCommits(w, targetMonth, targetYear));
            targetWeek = activeWeek || "all";
            setSelectedWeekOfMonth(targetWeek);
        }

        if (reportData && repoUrl.trim()) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: targetMonth,
                year: targetYear,
                weekOfMonth: targetWeek
            });
        }
    };

    const handleMonthSelect = (monthNum: number) => {
        setSelectedMonth(monthNum);
        setAiReport(null);
        let weekToUse: number | "all" = selectedWeekOfMonth;
        
        // Si la semana seleccionada no tiene commits en el nuevo mes, pasar a la primera semana activa o 'all'
        if (!checkWeekHasCommits(weekToUse, monthNum, selectedYear)) {
            const activeWeek = ([1, 2, 3, 4, 5] as const).find(w => checkWeekHasCommits(w, monthNum, selectedYear));
            weekToUse = activeWeek || "all";
        }

        if (weekToUse !== selectedWeekOfMonth) {
            setSelectedWeekOfMonth(weekToUse);
        }
        if (selectedPreset === "month-week" && repoUrl.trim() && reportData) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: monthNum,
                year: selectedYear,
                weekOfMonth: weekToUse
            });
        }
    };

    const handleYearSelect = (yearNum: number) => {
        setSelectedYear(yearNum);
        setAiReport(null);
        let monthToUse = selectedMonth;
        if (bounds) {
            if (yearNum === bounds.oldestYear && monthToUse < bounds.oldestMonth) {
                monthToUse = bounds.oldestMonth;
                setSelectedMonth(monthToUse);
            } else if (yearNum === bounds.latestYear && monthToUse > bounds.latestMonth) {
                monthToUse = bounds.latestMonth;
                setSelectedMonth(monthToUse);
            }
        }
        let weekToUse: number | "all" = selectedWeekOfMonth;
        if (!checkWeekHasCommits(weekToUse, monthToUse, yearNum)) {
            const activeWeek = ([1, 2, 3, 4, 5] as const).find(w => checkWeekHasCommits(w, monthToUse, yearNum));
            weekToUse = activeWeek || "all";
        }
        if (weekToUse !== selectedWeekOfMonth) {
            setSelectedWeekOfMonth(weekToUse);
        }
        if (selectedPreset === "month-week" && repoUrl.trim() && reportData) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: monthToUse,
                year: yearNum,
                weekOfMonth: weekToUse
            });
        }
    };

    const handleWeekSelect = (week: number | "all") => {
        setSelectedWeekOfMonth(week);
        setAiReport(null);
        if (selectedPreset === "month-week" && repoUrl.trim() && reportData) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: selectedMonth,
                year: selectedYear,
                weekOfMonth: week
            });
        }
    };

    const handleQuickCurrentMonth = () => {
        const m = bounds ? bounds.latestMonth : (new Date().getMonth() + 1);
        const y = bounds ? bounds.latestYear : new Date().getFullYear();
        setSelectedMonth(m);
        setSelectedYear(y);
        setSelectedWeekOfMonth("all");
        setSelectedPreset("month-week");
        setAiReport(null);
        if (repoUrl.trim() && reportData) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: m,
                year: y,
                weekOfMonth: "all"
            });
        }
    };

    const handleQuickPreviousMonth = () => {
        let m = selectedMonth - 1;
        let y = selectedYear;
        if (m === 0) {
            m = 12;
            y -= 1;
        }
        if (bounds) {
            if (y < bounds.oldestYear || (y === bounds.oldestYear && m < bounds.oldestMonth)) {
                toast.info(`El repositorio no tiene commits antes de ${bounds.oldestDateStr}.`);
                return;
            }
        }
        setSelectedMonth(m);
        setSelectedYear(y);
        setSelectedWeekOfMonth("all");
        setSelectedPreset("month-week");
        setAiReport(null);
        if (repoUrl.trim() && reportData) {
            handleLoadRepo(selectedBranch, "month-week", {
                month: m,
                year: y,
                weekOfMonth: "all"
            });
        }
    };

    // Cambio de rama
    const handleBranchChange = (branch: string) => {
        setSelectedBranch(branch);
        setAiReport(null);
        if (reportData) {
            handleLoadRepo(branch, selectedPreset);
        }
    };

    // 2. Generar Informe con IA
    const handleGenerateAiReport = async (overrideMode?: GitReportMode, scope: "all" | "selected" = "all") => {
        if (!reportData || reportData.commits.length === 0) {
            toast.error("Primero carga un repositorio con commits para analizar.");
            return;
        }

        // Determinar qué commits enviar a la IA
        let targetCommits = reportData.commits;
        const hasSubset = selectedCommitShas.size > 0 && selectedCommitShas.size < reportData.commits.length;
        if (scope === "selected" || (hasSubset && scope !== "all")) {
            targetCommits = reportData.commits.filter(c => selectedCommitShas.has(c.sha));
            if (targetCommits.length === 0) {
                toast.error("No hay commits seleccionados. Selecciona al menos un commit en la tabla.");
                return;
            }
        }

        const modeToUse = overrideMode || reportMode;
        setIsGeneratingAi(true);
        const modeLabel = modeToUse === "pedagogical" 
            ? "Pedagógica y Formativa" 
            : modeToUse === "technical" 
            ? "Técnica de Arquitectura" 
            : "Ejecutiva de Negocio";

        const countLabel = targetCommits.length === reportData.commits.length 
            ? `${targetCommits.length} commits` 
            : `${targetCommits.length} de ${reportData.commits.length} seleccionados`;

        const toastId = toast.loading(`Auditoría ${modeLabel} con IA (${countLabel})...`, {
            description: "Indagando en los archivos, diffs y líneas de código en múltiples fases analíticas."
        });

        try {
            // Contribuidores activos en el subconjunto
            const activeContributors = reportData.contributors.filter(contrib =>
                targetCommits.some(c => (c.authorLogin && c.authorLogin === contrib.login) || c.authorName === contrib.name)
            );

            // Días activos en el subconjunto
            const activeDays = new Set(targetCommits.map(c => c.regionalDate));

            const periodLabel = targetCommits.length === reportData.commits.length
                ? reportData.dateRange.label
                : `${reportData.dateRange.label} (Grupo de ${targetCommits.length} commits seleccionados)`;

            const result = await generateGitAiReportAction({
                repoInfo: reportData.repoInfo,
                dateRangeLabel: periodLabel,
                summary: {
                    totalCommits: targetCommits.length,
                    totalContributors: activeContributors.length > 0 ? activeContributors.length : reportData.summary.totalContributors,
                    activeDaysCount: activeDays.size > 0 ? activeDays.size : reportData.summary.activeDaysCount,
                },
                commits: targetCommits,
                contributors: activeContributors.length > 0 ? activeContributors : reportData.contributors,
                reportMode: modeToUse,
                includeAuthors,
                includeCommitHashes
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
        if (!reportData || !aiReport) return;
        setIsExportingPdf(true);
        const toastId = toast.loading("Compilando documento corporativo en PDF...", {
            description: "Aplicando maquetación ejecutiva SmartClass de alta resolución"
        });

        try {
            const { pdf } = await import("@react-pdf/renderer");
            const { GitReportCorporatePDF } = await import("../pdf/GitReportCorporatePDF");

            const hasSubset = selectedCommitShas.size > 0 && selectedCommitShas.size < reportData.commits.length;
            const pdfCommits = hasSubset
                ? reportData.commits.filter(c => selectedCommitShas.has(c.sha))
                : reportData.commits;

            const pdfData: GitReportData = {
                ...reportData,
                commits: pdfCommits,
                summary: {
                    ...reportData.summary,
                    totalCommits: pdfCommits.length
                },
                dateRange: {
                    ...reportData.dateRange,
                    label: hasSubset 
                        ? `${reportData.dateRange.label} (${pdfCommits.length} commits seleccionados)` 
                        : reportData.dateRange.label
                }
            };

            const docElement = (
                <GitReportCorporatePDF
                    reportData={pdfData}
                    aiReport={aiReport}
                    includeAuthors={includeAuthors}
                    includeCommitHashes={includeCommitHashes}
                    reportMode={reportMode}
                />
            );

            const blob = await pdf(docElement).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const cleanRepoName = reportData.repoInfo.repo.replace(/[^a-zA-Z0-9_-]/g, "_");
            const dateTag = reportData.dateRange.startDate || "grupo";
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

        if (onlyShowSelectedCommits) {
            list = list.filter(c => selectedCommitShas.has(c.sha));
        }

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
                c.sha.toLowerCase().includes(q) ||
                c.authorName.toLowerCase().includes(q) ||
                (c.authorLogin && c.authorLogin.toLowerCase().includes(q))
            );
        }

        return list;
    }, [reportData?.commits, authorFilter, commitSearch, onlyShowSelectedCommits, selectedCommitShas]);

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
            {/* Barra de Cabecera Ejecutiva Unificada */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push("/dashboard/teacher/tools")}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer h-8 px-2.5"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Herramientas</span>
                    </Button>
                    <div className="h-4 w-px bg-border/80 hidden sm:block" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
                                <Github className="h-5 w-5 text-primary" />
                                Auditoría de Repositorios Git
                            </h1>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono bg-primary/10 text-primary border-primary/25">
                                IA Report
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground hidden md:block">
                            Inspección en vivo de commits, diffs de código y generación de reportes ejecutivos con Inteligencia Artificial
                        </p>
                    </div>
                </div>

                {/* Token Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                    {hasUserGithubToken ? (
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 gap-1.5 py-1 px-2.5 shadow-xs">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span>
                                    Token Activo 
                                    {tokenSource === "personal" && " (Docente)"}
                                    {tokenSource === "system" && " (Sistema)"}
                                    {tokenSource === "env" && " (Servidor)"}
                                </span>
                            </Badge>
                            <Link 
                                href="/dashboard/teacher/settings" 
                                className="text-xs text-muted-foreground hover:text-foreground p-1 transition-colors rounded-md hover:bg-muted"
                                title="Configuración de Token en Ajustes"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <Link href="/dashboard/teacher/settings">
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 gap-1.5 py-1 px-2.5 hover:bg-amber-500/20 transition-colors cursor-pointer shadow-xs">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span>Configurar Token en Ajustes →</span>
                            </Badge>
                        </Link>
                    )}
                </div>
            </div>

            {/* Centro de Búsqueda y Filtrado Unificado */}
            <Card className="border-border/80 shadow-xs bg-card/70 backdrop-blur-xs">
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                    {/* Cabecera del Centro de Búsqueda */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">Filtro por Rango de Fechas</span>
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                — Audita la actividad histórica por marco temporal y selecciona commits individuales con checkbox en la tabla
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPatInput(!showPatInput)}
                                            className={`h-7 px-2 text-[11px] gap-1 cursor-pointer ${showPatInput ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                                        >
                                            <KeyRound className="h-3 w-3" />
                                            <span>PAT Opcional</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {hasUserGithubToken 
                                            ? `Token conectado automáticamente (${tokenSource === 'personal' ? 'Ajustes Docentes' : 'Ajustes del Sistema'}). Clic para sobrescribir temporalmente.` 
                                            : "Configurar Token de Acceso Personal (PAT) para repositorios privados"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Input opcional de Personal Access Token */}
                    {showPatInput && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2 animate-in fade-in duration-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                <label className="font-semibold text-foreground flex items-center gap-1.5">
                                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                                    <span>Personal Access Token (PAT) de GitHub</span>
                                </label>
                                <span className="text-[10px] text-muted-foreground">
                                    {hasUserGithubToken ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Usando token configurado en la app ({tokenSource === 'personal' ? 'Ajustes Docentes' : 'Ajustes del Sistema'})
                                        </span>
                                    ) : (
                                        "Permite acceder a repositorios privados o ampliar límites de cuota"
                                    )}
                                </span>
                            </div>

                            <Input
                                type="password"
                                value={customPat}
                                onChange={(e) => setCustomPat(e.target.value)}
                                placeholder={hasUserGithubToken ? "Sobrescribir token para este análisis (opcional)..." : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                                className="text-xs bg-background font-mono h-8"
                            />
                        </div>
                    )}

                    {/* Fila Principal de Búsqueda: Input Repo + Selector de Rama + Botón Analizar */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                        {/* Input de Repositorio */}
                        <div className="lg:col-span-7 relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                value={repoUrl}
                                onChange={(e) => {
                                    setRepoUrl(e.target.value);
                                    setAiReport(null);
                                }}
                                placeholder="usuario/repositorio o https://github.com/usuario/mi-proyecto"
                                className="pl-9 pr-8 text-xs font-mono bg-background h-9"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleLoadRepo();
                                }}
                            />
                            {repoUrl && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setRepoUrl("");
                                        setAiReport(null);
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5"
                                    title="Limpiar repositorio"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Selector de Rama */}
                        <div className="lg:col-span-3">
                            <Select 
                                value={selectedBranch} 
                                onValueChange={handleBranchChange}
                                disabled={isLoadingRepo}
                            >
                                <SelectTrigger className="text-xs bg-background h-9">
                                    <GitBranch className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
                                    <SelectValue placeholder="Rama" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-semibold text-primary">
                                        ⭐ Todas las ramas (Global)
                                    </SelectItem>
                                    {reportData?.branches.map((b) => (
                                        <SelectItem key={b} value={b} className="text-xs font-mono">
                                            {b} {b === reportData.repoInfo.defaultBranch ? "(default)" : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Botón Principal de Acción Unificado */}
                        <div className="lg:col-span-2">
                            <Button
                                onClick={() => handleLoadRepo(selectedBranch, selectedPreset)}
                                disabled={isLoadingRepo || !repoUrl.trim()}
                                className="w-full font-bold text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
                            >
                                {isLoadingRepo ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Consultando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-3.5 w-3.5" />
                                        <span>Analizar</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Fila de Parámetros Contextuales de Fecha */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-bold text-muted-foreground mr-1">Rango:</span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "today" ? "default" : "outline"}
                                        onClick={() => handlePresetChange("today")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                    >
                                        Hoy
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "week" ? "default" : "outline"}
                                        onClick={() => handlePresetChange("week")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                    >
                                        Esta Semana (7 días)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "month" ? "default" : "outline"}
                                        onClick={() => handlePresetChange("month")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                    >
                                        Este Mes (30 días)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "last-month" ? "default" : "outline"}
                                        onClick={() => handlePresetChange("last-month")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                        title="Mes calendario anterior completo"
                                    >
                                        Mes Anterior
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "month-week" ? "default" : "outline"}
                                        onClick={handleSelectMonthWeekPreset}
                                        className={`text-xs h-7 px-2.5 cursor-pointer ${
                                            selectedPreset === "month-week" 
                                                ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                                                : "border-primary/40 text-primary hover:bg-primary/10"
                                        }`}
                                    >
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Por Mes y Semanas
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "all" ? "default" : "outline"}
                                        onClick={() => handlePresetChange("all")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                    >
                                        Todo el Historial
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={selectedPreset === "custom" ? "default" : "outline"}
                                        onClick={() => setSelectedPreset("custom")}
                                        className="text-xs h-7 px-2.5 cursor-pointer"
                                    >
                                        <SlidersHorizontal className="h-3 w-3 mr-1" />
                                        Personalizado
                                    </Button>
                                </div>

                                {selectedPreset === "custom" && (
                                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto p-1.5 rounded-lg bg-muted/40 border border-border/60 animate-in fade-in duration-150">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">Desde:</span>
                                            <Input
                                                type="date"
                                                value={customStartDate}
                                                min={bounds?.oldestDateStr || undefined}
                                                max={bounds?.latestDateStr || undefined}
                                                onChange={(e) => {
                                                    setCustomStartDate(e.target.value);
                                                    setAiReport(null);
                                                }}
                                                className="text-xs h-7 w-32 bg-background"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground font-medium">Hasta:</span>
                                            <Input
                                                type="date"
                                                value={customEndDate}
                                                min={bounds?.oldestDateStr || undefined}
                                                max={bounds?.latestDateStr || undefined}
                                                onChange={(e) => {
                                                    setCustomEndDate(e.target.value);
                                                    setAiReport(null);
                                                }}
                                                className="text-xs h-7 w-32 bg-background"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleLoadRepo(selectedBranch, "custom")}
                                            disabled={isLoadingRepo || !customStartDate}
                                            className="text-xs h-7 px-2.5 font-bold cursor-pointer"
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Panel Dedicado para Filtro por Mes y Semanas del Mes */}
                            {selectedPreset === "month-week" && (
                                <div className="w-full mt-1 p-3 rounded-xl bg-card/90 border border-primary/25 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                    {/* Fila 1: Selectores de Mes, Año y Accesos Directos */}
                                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Selector de Mes */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-muted-foreground font-semibold">Mes:</span>
                                                <Select 
                                                    value={String(selectedMonth)} 
                                                    onValueChange={(val) => handleMonthSelect(Number(val))}
                                                >
                                                    <SelectTrigger className="h-8 w-36 text-xs bg-background">
                                                        <SelectValue placeholder="Mes" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MONTHS_LIST.map((m) => {
                                                            const disabled = isMonthDisabled(m.value);
                                                            return (
                                                                <SelectItem 
                                                                    key={m.value} 
                                                                    value={String(m.value)} 
                                                                    disabled={disabled}
                                                                    className={`text-xs ${disabled ? "opacity-35" : ""}`}
                                                                >
                                                                    {m.label} {disabled ? "(Sin commits)" : ""}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Selector de Año */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-muted-foreground font-semibold">Año:</span>
                                                <Select 
                                                    value={String(selectedYear)} 
                                                    onValueChange={(val) => handleYearSelect(Number(val))}
                                                >
                                                    <SelectTrigger className="h-8 w-24 text-xs bg-background font-mono">
                                                        <SelectValue placeholder="Año" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableYears.map((yr) => (
                                                            <SelectItem key={yr} value={String(yr)} className="text-xs font-mono">
                                                                {yr}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Atajos Rápidos y Límites */}
                                            <div className="flex items-center gap-1 pl-1 border-l border-border/50 flex-wrap">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleQuickCurrentMonth}
                                                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                                                    title={bounds ? "Ir al mes más reciente con actividad" : "Mes Actual"}
                                                >
                                                    {bounds ? "Último Mes Activo" : "Mes Actual"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleQuickPreviousMonth}
                                                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                                                    title="Mes Anterior"
                                                >
                                                    Mes Anterior
                                                </Button>
                                                {bounds && (
                                                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1" title="Rango total de actividad de commits en el repositorio">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {bounds.oldestDateStr} al {bounds.latestDateStr}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={() => handleLoadRepo(selectedBranch, "month-week", {
                                                month: selectedMonth,
                                                year: selectedYear,
                                                weekOfMonth: selectedWeekOfMonth
                                            })}
                                            disabled={isLoadingRepo || !repoUrl.trim()}
                                            className="text-xs h-7 px-3 font-semibold cursor-pointer shrink-0"
                                        >
                                            {isLoadingRepo ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                            ) : (
                                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                            )}
                                            Aplicar Filtro
                                        </Button>
                                    </div>

                                    {/* Fila 2: Selector de Semanas del Mes */}
                                    <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-primary" />
                                            Semana:
                                        </span>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedWeekOfMonth === "all" ? "default" : "outline"}
                                            onClick={() => handleWeekSelect("all")}
                                            disabled={isMonthDisabled(selectedMonth)}
                                            className={`text-xs h-7 px-2.5 cursor-pointer ${isMonthDisabled(selectedMonth) ? "opacity-35 cursor-not-allowed" : ""}`}
                                        >
                                            Todo el Mes (1 al {daysInSelectedMonth})
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedWeekOfMonth === 1 ? "default" : "outline"}
                                            onClick={() => handleWeekSelect(1)}
                                            disabled={isWeekDisabled(1)}
                                            className={`text-xs h-7 px-2.5 cursor-pointer ${isWeekDisabled(1) ? "opacity-35 cursor-not-allowed bg-muted/20 border-dashed" : ""}`}
                                            title={isWeekDisabled(1) ? "Sin commits registrados en esta semana" : "Semana 1 (1 al 7)"}
                                        >
                                            Semana 1 (1 - 7)
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedWeekOfMonth === 2 ? "default" : "outline"}
                                            onClick={() => handleWeekSelect(2)}
                                            disabled={isWeekDisabled(2)}
                                            className={`text-xs h-7 px-2.5 cursor-pointer ${isWeekDisabled(2) ? "opacity-35 cursor-not-allowed bg-muted/20 border-dashed" : ""}`}
                                            title={isWeekDisabled(2) ? "Sin commits registrados en esta semana" : "Semana 2 (8 al 14)"}
                                        >
                                            Semana 2 (8 - 14)
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedWeekOfMonth === 3 ? "default" : "outline"}
                                            onClick={() => handleWeekSelect(3)}
                                            disabled={isWeekDisabled(3)}
                                            className={`text-xs h-7 px-2.5 cursor-pointer ${isWeekDisabled(3) ? "opacity-35 cursor-not-allowed bg-muted/20 border-dashed" : ""}`}
                                            title={isWeekDisabled(3) ? "Sin commits registrados en esta semana" : "Semana 3 (15 al 21)"}
                                        >
                                            Semana 3 (15 - 21)
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={selectedWeekOfMonth === 4 ? "default" : "outline"}
                                            onClick={() => handleWeekSelect(4)}
                                            disabled={isWeekDisabled(4)}
                                            className={`text-xs h-7 px-2.5 cursor-pointer ${isWeekDisabled(4) ? "opacity-35 cursor-not-allowed bg-muted/20 border-dashed" : ""}`}
                                            title={isWeekDisabled(4) ? "Sin commits registrados en esta semana" : "Semana 4 (22 al 28)"}
                                        >
                                            Semana 4 (22 - 28)
                                        </Button>

                                        {daysInSelectedMonth >= 29 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={selectedWeekOfMonth === 5 ? "default" : "outline"}
                                                onClick={() => handleWeekSelect(5)}
                                                disabled={isWeekDisabled(5)}
                                                className={`text-xs h-7 px-2.5 cursor-pointer ${isWeekDisabled(5) ? "opacity-35 cursor-not-allowed bg-muted/20 border-dashed" : ""}`}
                                                title={isWeekDisabled(5) ? "Sin commits registrados en esta semana" : `Semana 5 (29 al ${daysInSelectedMonth})`}
                                            >
                                                Semana 5 (29 al {daysInSelectedMonth})
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                </CardContent>
            </Card>

            {/* Vista de Datos y Pestañas de Trabajo */}
            {reportData && (
                <div className="space-y-3.5">
                    {/* Franja Ejecutiva de Resumen del Repositorio */}
                    <Card className="border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
                        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                    <Github className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <a 
                                            href={reportData.repoInfo.repoUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-sm sm:text-base font-bold text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1.5 truncate"
                                            title="Ver repositorio en GitHub"
                                        >
                                            <span>{reportData.repoInfo.owner}/{reportData.repoInfo.repo}</span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </a>
                                        <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
                                            🌿 {reportData.selectedBranch === "all" ? "Todas las ramas" : reportData.selectedBranch}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                                            {reportData.dateRange.label}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <GitCommit className="h-3.5 w-3.5 text-primary" />
                                            <strong className="text-foreground">{reportData.summary.totalCommits}</strong> commits
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 text-blue-500" />
                                            <strong className="text-foreground">{reportData.summary.totalContributors}</strong> autores
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                                            <strong className="text-foreground">{reportData.summary.activeDaysCount}</strong> días activos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones Rápidas Globales */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDownloadPdf}
                                                    disabled={!canExportPdf}
                                                    className={`text-xs h-8 font-semibold gap-1.5 border-border/80 cursor-pointer ${
                                                        canExportPdf 
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-xs" 
                                                            : "opacity-40 cursor-not-allowed hover:bg-transparent"
                                                    }`}
                                                >
                                                    {isExportingPdf ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <FileDown className={`h-3.5 w-3.5 ${canExportPdf ? "text-emerald-500" : "text-muted-foreground"}`} />
                                                    )}
                                                    <span>PDF Corporativo</span>
                                                    {canExportPdf && <Check className="h-3 w-3 text-emerald-500 ml-0.5" />}
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {!canExportPdf && (
                                            <TooltipContent side="bottom" className="text-xs max-w-xs">
                                                {!reportData
                                                    ? "Primero debes escanear el repositorio"
                                                    : reportData.commits.length === 0
                                                        ? "No hay commits disponibles para generar el informe"
                                                        : "El filtro cambió o no se ha generado el informe. Genera el informe con IA abajo para habilitar la descarga en PDF"}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleLoadRepo()}
                                    disabled={isLoadingRepo}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Recargar datos de GitHub"
                                >
                                    <RotateCcw className={`h-3.5 w-3.5 ${isLoadingRepo ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pestañas de Trabajo */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid grid-cols-4 max-w-xl bg-muted/60 p-1 rounded-xl">
                            <TabsTrigger value="ai-report" className="text-xs gap-1.5 font-bold">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                Informe IA {aiReport && "✓"}
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="text-xs gap-1.5 font-bold">
                                <ListTodo className="h-3.5 w-3.5 text-emerald-500" />
                                Tareas ({aiReport?.detailedTasks?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="commits" className="text-xs gap-1.5 font-bold">
                                <GitCommit className="h-3.5 w-3.5 text-blue-500" />
                                Commits ({selectedCommitShas.size < reportData.commits.length ? `${selectedCommitShas.size}/${reportData.commits.length}` : reportData.commits.length})
                            </TabsTrigger>
                            <TabsTrigger value="charts" className="text-xs gap-1.5 font-bold">
                                <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                                Métricas
                            </TabsTrigger>
                        </TabsList>

                        {/* PESTAÑA 1: INFORME EJECUTIVO IA */}
                        <TabsContent value="ai-report" className="mt-4 space-y-4">
                            {/* Panel de Configuración de Síntesis IA Contextual */}
                            <Card className="border-border bg-card/70 shadow-xs">
                                <CardContent className="p-3.5 sm:p-4 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                <h3 className="text-xs font-bold text-foreground">
                                                    Modo de Síntesis y Enfoque del Informe
                                                </h3>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Selecciona el rol analítico del modelo y los elementos a incluir en la síntesis y en el PDF.
                                            </p>
                                        </div>

                                        {/* Switches de Visibilidad */}
                                        <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-lg border border-border/60">
                                            <div className="flex items-center gap-1.5">
                                                <Switch
                                                    id="toggle-authors"
                                                    checked={includeAuthors}
                                                    onCheckedChange={setIncludeAuthors}
                                                />
                                                <label 
                                                    htmlFor="toggle-authors" 
                                                    className="text-[11px] font-semibold text-foreground flex items-center gap-1 cursor-pointer select-none"
                                                    title="Muestra u oculta los nombres de los autores/estudiantes"
                                                >
                                                    <Users className="h-3 w-3 text-blue-500" />
                                                    <span>Autores</span>
                                                </label>
                                            </div>

                                            <div className="h-3 w-px bg-border/80" />

                                            <div className="flex items-center gap-1.5">
                                                <Switch
                                                    id="toggle-hashes"
                                                    checked={includeCommitHashes}
                                                    onCheckedChange={setIncludeCommitHashes}
                                                />
                                                <label 
                                                    htmlFor="toggle-hashes" 
                                                    className="text-[11px] font-semibold text-foreground flex items-center gap-1 cursor-pointer select-none"
                                                    title="Muestra u oculta los códigos SHA de los commits"
                                                >
                                                    <Hash className="h-3 w-3 text-primary" />
                                                    <span>Hashes</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selector de Modo en Tarjetas Compactas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {/* Modo 1: Pedagógico */}
                                        <div 
                                            onClick={() => setReportMode("pedagogical")}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                                                reportMode === "pedagogical" 
                                                    ? 'border-emerald-500/70 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/40' 
                                                    : 'border-border/70 bg-background/40 hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                    <GraduationCap className="h-3.5 w-3.5" />
                                                    Pedagógico / Docente
                                                </span>
                                                {reportMode === "pedagogical" && (
                                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-snug">
                                                Evalúa rúbricas docentes, buenas prácticas de commit, constancia y retroalimentación pedagógica.
                                            </p>
                                        </div>

                                        {/* Modo 2: Ejecutivo */}
                                        <div 
                                            onClick={() => setReportMode("executive")}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                                                reportMode === "executive" 
                                                    ? 'border-blue-500/70 bg-blue-500/10 shadow-xs ring-1 ring-blue-500/40' 
                                                    : 'border-border/70 bg-background/40 hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                    <Briefcase className="h-3.5 w-3.5" />
                                                    Ejecutivo / Gerencial
                                                </span>
                                                {reportMode === "executive" && (
                                                    <Check className="h-3.5 w-3.5 text-blue-500" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-snug">
                                                Sintetiza valor de negocio entregado, hitos clave y avance general sin excesiva jerga técnica.
                                            </p>
                                        </div>

                                        {/* Modo 3: Técnico */}
                                        <div 
                                            onClick={() => setReportMode("technical")}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                                                reportMode === "technical" 
                                                    ? 'border-purple-500/70 bg-purple-500/10 shadow-xs ring-1 ring-purple-500/40' 
                                                    : 'border-border/70 bg-background/40 hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                                    <Code2 className="h-3.5 w-3.5" />
                                                    Técnico & Arquitectura
                                                </span>
                                                {reportMode === "technical" && (
                                                    <Check className="h-3.5 w-3.5 text-purple-500" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-snug">
                                                Indaga en diffs de código, refactorizaciones, calidad de código y control de deuda técnica.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botones de Generación y Copia */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border/50 flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground">
                                                Auditoría para:
                                            </span>
                                            <Badge variant="outline" className="text-xs font-mono">
                                                {!reportData || reportData.commits.length === 0
                                                    ? "0 commits encontrados"
                                                    : selectedCommitShas.size > 0 && selectedCommitShas.size < reportData.commits.length
                                                        ? `${selectedCommitShas.size} de ${reportData.commits.length} commits seleccionados`
                                                        : `${reportData.commits.length} commits del repositorio`}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span>
                                                            <Button
                                                                onClick={() => handleGenerateAiReport(reportMode, "selected")}
                                                                disabled={!canGenerateAiReport}
                                                                className={`font-bold text-xs h-8.5 px-4 gap-2 shadow-xs cursor-pointer ${
                                                                    canGenerateAiReport
                                                                        ? "bg-gradient-to-r from-primary to-teal-500 text-primary-foreground hover:opacity-95"
                                                                        : "opacity-40 cursor-not-allowed"
                                                                }`}
                                                            >
                                                                {isGeneratingAi ? (
                                                                    <>
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        Sintetizando...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Sparkles className="h-3.5 w-3.5" />
                                                                        {aiReport ? "Regenerar Informe con IA" : "Generar Informe con IA"}
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </span>
                                                    </TooltipTrigger>
                                                    {!canGenerateAiReport && (
                                                        <TooltipContent side="top" className="text-xs max-w-xs">
                                                            {isLoadingRepo
                                                                ? "Escaneando commits del repositorio..."
                                                                : !reportData
                                                                    ? "Primero escanea el repositorio"
                                                                    : reportData.commits.length === 0
                                                                        ? "No se encontraron commits en este rango de fechas"
                                                                        : "Selecciona al menos un commit en la tabla para auditar"}
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>

                                            {aiReport && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCopyMarkdown}
                                                    className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                                    title="Copiar Informe en Markdown"
                                                >
                                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                                    Copiar MD
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

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
                                            {reportData.commits.length === 0
                                                ? "No se encontraron commits en este período de fechas. Selecciona otro rango para cargar actividad."
                                                : selectedCommitShas.size > 0 && selectedCommitShas.size < reportData.commits.length
                                                    ? `Configura el modo arriba y presiona "Generar Informe con IA" para auditar los ${selectedCommitShas.size} commits seleccionados.`
                                                    : `Configura el modo arriba y presiona "Generar Informe con IA" para auditar los ${reportData.commits.length} commits encontrados.`}
                                        </p>
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
                                                                    {includeAuthors && (
                                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                                            Por {task.author}
                                                                        </span>
                                                                    )}
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
                                    {includeAuthors && aiReport.contributorHighlights && aiReport.contributorHighlights.length > 0 && (
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
                                            onClick={() => setActiveTab("ai-report")}
                                            className="font-bold text-xs gap-2 cursor-pointer mt-2"
                                            variant="outline"
                                        >
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Ir a Pestaña Informe IA
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

                                                                {includeAuthors && (
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className="font-semibold text-foreground">
                                                                            Responsable: {task.author}
                                                                        </span>
                                                                    </div>
                                                                )}
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
                                                                            <button
                                                                                key={fIdx}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const associatedSha = task.relatedCommits?.[0];
                                                                                    if (associatedSha) {
                                                                                        handleOpenInspectorBySha(associatedSha, fPath);
                                                                                    } else if (reportData && reportData.commits.length > 0) {
                                                                                        handleOpenInspector(reportData.commits[0], fPath);
                                                                                    }
                                                                                }}
                                                                                className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:border-primary/40 hover:text-primary border border-border text-foreground/90 font-medium cursor-pointer transition-colors"
                                                                                title={`Inspeccionar diff de ${fPath}`}
                                                                            >
                                                                                <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                                                                                <span>{fPath}</span>
                                                                                <Eye className="h-2.5 w-2.5 opacity-60 ml-0.5 text-primary" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {includeCommitHashes && task.relatedCommits && task.relatedCommits.length > 0 && (
                                                                <div className="pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap text-xs">
                                                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                                                        Commits asociados:
                                                                    </span>
                                                                    {task.relatedCommits.map((sha, sIdx) => (
                                                                        <div key={sIdx} className="inline-flex items-center rounded-md bg-muted border border-border/70 overflow-hidden">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenInspectorBySha(sha)}
                                                                                className="font-mono text-[10px] px-2 py-0.5 hover:bg-primary/10 text-primary font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                                                                title="Inspeccionar commit en vivo"
                                                                            >
                                                                                <Eye className="h-2.5 w-2.5" />
                                                                                <span>{sha}</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCopySha(sha)}
                                                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer border-l border-border/50"
                                                                                title="Copiar SHA"
                                                                            >
                                                                                {copiedSha === sha ? (
                                                                                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                                                                                ) : (
                                                                                    <Copy className="h-2.5 w-2.5" />
                                                                                )}
                                                                            </button>
                                                                        </div>
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
                                    {includeAuthors && (
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
                                    )}

                                    {(commitSearch || (includeAuthors && authorFilter !== "all")) && (
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

                            {/* Barra de Selección Interactiva de Commits */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                        <span>Selección:</span>
                                    </div>
                                    <Badge 
                                        variant={selectedCommitShas.size > 0 ? "default" : "outline"} 
                                        className="text-xs font-mono font-bold"
                                    >
                                        {selectedCommitShas.size} de {reportData.commits.length} seleccionados
                                    </Badge>
                                    {selectedCommitShas.size > 0 && selectedCommitShas.size < reportData.commits.length && (
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
                                            (Subgrupo activo para IA y PDF)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={selectAllCommits}
                                        className="text-[11px] h-7 px-2 cursor-pointer"
                                    >
                                        Seleccionar Todos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={clearCommitSelection}
                                        disabled={selectedCommitShas.size === 0}
                                        className="text-[11px] h-7 px-2 cursor-pointer"
                                    >
                                        Limpiar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={invertCommitSelection}
                                        className="text-[11px] h-7 px-2 cursor-pointer"
                                    >
                                        Invertir
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={onlyShowSelectedCommits ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setOnlyShowSelectedCommits(!onlyShowSelectedCommits)}
                                        disabled={selectedCommitShas.size === 0 && !onlyShowSelectedCommits}
                                        className="text-[11px] h-7 px-2.5 cursor-pointer"
                                    >
                                        {onlyShowSelectedCommits ? "Mostrar Todos" : "Aislar Seleccionados"}
                                    </Button>
                                    {selectedCommitShas.size > 0 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setActiveTab("ai-report");
                                            }}
                                            className="text-[11px] h-7 px-3 font-bold gap-1 cursor-pointer bg-primary text-primary-foreground"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                            Configurar Auditoría IA ({selectedCommitShas.size})
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
                                                <th className="py-2.5 px-3 w-10 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        checked={filteredCommits.length > 0 && filteredCommits.every(c => selectedCommitShas.has(c.sha))}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedCommitShas(prev => {
                                                                    const next = new Set(prev);
                                                                    filteredCommits.forEach(c => next.add(c.sha));
                                                                    return next;
                                                                });
                                                            } else {
                                                                setSelectedCommitShas(prev => {
                                                                    const next = new Set(prev);
                                                                    filteredCommits.forEach(c => next.delete(c.sha));
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                        title="Seleccionar / Deseleccionar todos los visibles"
                                                    />
                                                </th>
                                                <th className="py-2.5 px-3">Fecha y Hora</th>
                                                {includeAuthors && <th className="py-2.5 px-3">Autor</th>}
                                                <th className="py-2.5 px-3">Ramas</th>
                                                <th className="py-2.5 px-3">Commit</th>
                                                <th className="py-2.5 px-3 text-right">
                                                    {includeCommitHashes ? "Diff / Hash" : "Acciones"}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {filteredCommits.length === 0 ? (
                                                <tr>
                                                    <td colSpan={1 + 2 + (includeAuthors ? 1 : 0) + 1 + 1} className="py-8 text-center text-muted-foreground text-xs">
                                                        No se encontraron commits coincidentes con los filtros.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredCommits.map((cm) => (
                                                    <tr 
                                                        key={cm.sha} 
                                                        className={`hover:bg-muted/40 transition-colors cursor-pointer ${
                                                            selectedCommitShas.has(cm.sha) 
                                                                ? 'bg-primary/10 border-l-2 border-l-primary font-medium' 
                                                                : ''
                                                        }`}
                                                        onClick={(e) => {
                                                            const target = e.target as HTMLElement;
                                                            if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
                                                                toggleCommitSelection(cm.sha);
                                                            }
                                                        }}
                                                    >
                                                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={selectedCommitShas.has(cm.sha)}
                                                                onChange={() => toggleCommitSelection(cm.sha)}
                                                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                                                                title={selectedCommitShas.has(cm.sha) ? "Deseleccionar commit" : "Seleccionar commit para informe"}
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                                                            {cm.regionalDate} {cm.regionalTime}
                                                        </td>
                                                        {includeAuthors && (
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
                                                        )}
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
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                                    Archivos y cambios comprobados:
                                                                                </p>
                                                                                <span className="text-[10px] text-primary font-medium">
                                                                                    Clic en archivo para inspeccionar diff
                                                                                </span>
                                                                            </div>
                                                                            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                                                                                {cm.files.map((file, fIdx) => (
                                                                                    <div 
                                                                                        key={fIdx} 
                                                                                        onClick={() => handleOpenInspector(cm, file.filename)}
                                                                                        className="flex items-center justify-between gap-2 p-1.5 rounded bg-background hover:bg-primary/5 hover:border-primary/40 border border-border/50 text-[11px] cursor-pointer transition-colors group"
                                                                                        title={`Inspeccionar diff en vivo de ${file.filename}`}
                                                                                    >
                                                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                                                                                                file.status === 'added' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' :
                                                                                                file.status === 'removed' ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' :
                                                                                                'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                                                                                            }`}>
                                                                                                {file.status}
                                                                                            </span>
                                                                                            <span className="font-mono text-foreground font-medium truncate group-hover:text-primary transition-colors" title={file.filename}>
                                                                                                {file.filename}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="font-mono text-[10px] whitespace-nowrap">
                                                                                                <span className="text-emerald-500 font-bold">+{file.additions}</span>
                                                                                                <span className="text-muted-foreground mx-1">/</span>
                                                                                                <span className="text-rose-500 font-bold">-{file.deletions}</span>
                                                                                            </div>
                                                                                            <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                                                                                <Eye className="h-3 w-3" /> Diff
                                                                                            </span>
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
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleOpenInspector(cm)}
                                                                    className="h-6 px-2 text-[11px] font-semibold gap-1 hover:bg-primary/10 hover:text-primary border-border/80 cursor-pointer"
                                                                    title="Inspeccionar código y diffs en vivo"
                                                                >
                                                                    <Eye className="h-3 w-3 text-primary" />
                                                                    <span>Diff</span>
                                                                </Button>

                                                                {includeCommitHashes && (
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
                                                                )}

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

            {!reportData && !isLoadingRepo && (
                <Card className="border-border/80 bg-card/60 backdrop-blur-xs p-6 sm:p-8 rounded-2xl shadow-xs text-center">
                    <div className="max-w-2xl mx-auto space-y-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-xs">
                            <Sparkles className="h-6 w-6" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                Auditoría & Síntesis Inteligente de Repositorios Git
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                                Ingresa un repositorio en la barra superior y selecciona si deseas evaluar la actividad por marco temporal o por commits y entregas puntuales.
                            </p>
                        </div>

                        {/* 3 Pasos Claros y Concisos */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                            <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px]">1</span>
                                    <span>Ingresa Repositorio</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Pega la URL completa o el formato <code>usuario/repo</code> de GitHub.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px]">2</span>
                                    <span>Define el Alcance</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Filtra por fechas (Hoy, 7d, 30d) o por hashes específicos / rango <code>base..head</code>.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl border border-border/80 bg-background/50 space-y-1">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[11px]">3</span>
                                    <span>Audita con IA y PDF</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Inspecciona diffs en vivo, sintetiza tareas y exporta informes ejecutivos corporativos.
                                </p>
                            </div>
                        </div>

                        {/* Características Adicionales */}
                        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                                Visibilidad de autores personalizable
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                Inspección de código diff en vivo
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                                <FileDown className="h-3.5 w-3.5 text-emerald-500" />
                                Descarga en PDF Corporativo
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Modal de Inspección de Código en Vivo */}
            {reportData && (
                <LiveCodeInspectorModal
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    commit={inspectingCommit}
                    initialFilename={inspectingFilename}
                    repoFullName={`${reportData.repoInfo.owner}/${reportData.repoInfo.repo}`}
                    repoUrl={reportData.repoInfo.repoUrl}
                    customToken={customPat.trim() || undefined}
                />
            )}
        </div>
    );
}
