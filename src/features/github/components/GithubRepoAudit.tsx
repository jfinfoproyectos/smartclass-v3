"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    GitCommit, Users, Calendar, Clock, Crown, ExternalLink, Search, RotateCcw, 
    Loader2, AlertCircle, ArrowUpRight, BarChart3, PieChart as PieIcon, Check, Copy,
    TrendingUp, ShieldCheck, Sun, Moon, CalendarDays, Filter, Maximize2, Minimize2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { getRepoAuditAction } from "@/features/github/actions/githubActions";
import { 
    getRegionalDateOnly, 
    getRegionalHour, 
    getRegionalDayOfWeek, 
    formatDayMonthDate 
} from "@/lib/dateUtils";
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface GithubRepoAuditProps {
    repoUrl: string;
    activityId?: string;
    title?: string;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

// Colores armoniosos y modernos para colaboradores en gráficos
const CHART_COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#84cc16"  // Lime
];

// Tooltip personalizado para el gráfico Donut de distribución
function CustomPieTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0];
    const item = entry.payload;
    return (
        <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-lg text-xs space-y-1.5 min-w-[170px]">
            <p className="font-bold text-foreground flex items-center gap-1.5 truncate">
                <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: item.fill || entry.color || 'var(--primary)' }} 
                />
                <span className="truncate">{item.name}</span>
            </p>
            <div className="flex items-center justify-between gap-3 text-muted-foreground font-mono text-[11px] pt-1 border-t border-border/50">
                <span>{item.value} {item.value === 1 ? 'commit' : 'commits'}</span>
                <span className="font-bold text-primary">{item.percentage}%</span>
            </div>
        </div>
    );
}

// Tooltip personalizado para el gráfico de barras Timeline
function CustomTimelineTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const contribs = item.contributors || [];
    return (
        <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xl text-xs space-y-2 min-w-[210px]">
            <div className="flex items-center justify-between border-b border-border/60 pb-1 gap-2">
                <span className="font-bold text-foreground">{item.formattedDate || item.date}</span>
                <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                    {item.total} {item.total === 1 ? 'commit' : 'commits'}
                </Badge>
            </div>
            {contribs.length > 0 ? (
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Colaboradores:
                    </p>
                    {contribs.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-medium text-foreground truncate max-w-[130px]">{c.name}</span>
                            <span className="font-mono font-bold text-primary shrink-0">{c.count} {c.count === 1 ? 'commit' : 'commits'}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[11px] text-muted-foreground italic">Sin detalle de colaboradores</p>
            )}
        </div>
    );
}

export function GithubRepoAudit({ repoUrl, activityId, title, isFullscreen, onToggleFullscreen }: GithubRepoAuditProps) {
    const [data, setData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedSha, setCopiedSha] = useState<string | null>(null);

    // Filtros de fecha
    const [datePreset, setDatePreset] = useState<"all" | "7d" | "15d" | "30d" | "custom">("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Filtros de búsqueda en commits
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
    const [activeChartTab, setActiveChartTab] = useState<"distribution" | "timeline" | "habits">("distribution");

    const loadAudit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getRepoAuditAction(repoUrl, activityId);
            setData(result);
        } catch (err: any) {
            setError(err.message || "Error al cargar la auditoría del repositorio.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (repoUrl) {
            loadAudit();
        }
    }, [repoUrl, activityId]);

    const handleCopySha = (sha: string) => {
        navigator.clipboard.writeText(sha);
        setCopiedSha(sha);
        toast.success("SHA copiado al portapapeles");
        setTimeout(() => setCopiedSha(null), 2000);
    };

    const handlePresetChange = (preset: "all" | "7d" | "15d" | "30d" | "custom") => {
        setDatePreset(preset);
        if (preset === "all") {
            setStartDate("");
            setEndDate("");
            return;
        }
        if (preset === "custom") {
            return;
        }
        const today = new Date();
        const todayStr = getRegionalDateOnly(today);
        setEndDate(todayStr);

        let daysAgo = 7;
        if (preset === "15d") daysAgo = 15;
        if (preset === "30d") daysAgo = 30;

        const past = new Date(today);
        past.setDate(past.getDate() - daysAgo);
        setStartDate(getRegionalDateOnly(past));
    };

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        setDatePreset("custom");
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        setDatePreset("custom");
    };

    const handleResetDateFilter = () => {
        setDatePreset("all");
        setStartDate("");
        setEndDate("");
    };

    const isDateFiltered = datePreset !== "all" || Boolean(startDate || endDate);

    // Commits dentro del rango de fechas
    const commitsInDateRange = useMemo(() => {
        if (!data?.commits) return [];
        if (!isDateFiltered) {
            return data.commits;
        }
        return data.commits.filter((c: any) => {
            const cDate = c.regionalDate || getRegionalDateOnly(c.date);
            if (startDate && cDate < startDate) return false;
            if (endDate && cDate > endDate) return false;
            return true;
        });
    }, [data?.commits, isDateFiltered, startDate, endDate]);

    // Commits filtrados por autor y búsqueda dentro del rango de fechas
    const filteredCommits = useMemo(() => {
        let list = commitsInDateRange;

        if (selectedContributor) {
            list = list.filter((c: any) => 
                (c.authorLogin && c.authorLogin.toLowerCase() === selectedContributor.toLowerCase()) ||
                (c.authorName && c.authorName.toLowerCase() === selectedContributor.toLowerCase())
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((c: any) => 
                c.title.toLowerCase().includes(q) ||
                (c.body && c.body.toLowerCase().includes(q)) ||
                c.sha.toLowerCase().includes(q) ||
                c.authorName.toLowerCase().includes(q) ||
                (c.authorLogin && c.authorLogin.toLowerCase().includes(q))
            );
        }

        return list;
    }, [commitsInDateRange, selectedContributor, searchQuery]);

    // Recálculo reactivo de métricas y gráficos según el período de fechas seleccionado
    const activeStats = useMemo(() => {
        if (!data) return null;
        if (!isDateFiltered) {
            return {
                summary: data.summary,
                contributors: data.contributors,
                pieData: (data.contributors || []).map((c: any) => ({
                    name: c.login || c.name,
                    value: c.commitsCount,
                    percentage: c.percentage
                })),
                timeline: (data.timeline || []).map((item: any) => ({
                    ...item,
                    formattedDate: formatDayMonthDate(item.date)
                })),
                dayOfWeekStats: data.dayOfWeekStats,
                hourStats: data.hourStats
            };
        }

        const totalInRange = commitsInDateRange.length;
        const contribMap = new Map<string, any>();
        const activeDays = new Set<string>();
        const timeMap = new Map<string, any>();
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const dayContribs: Map<string, any>[] = Array.from({ length: 7 }, () => new Map());
        const hoursMap = {
            madrugada: 0,
            manana: 0,
            tarde: 0,
            noche: 0
        };
        const hourContribs = {
            madrugada: new Map<string, any>(),
            manana: new Map<string, any>(),
            tarde: new Map<string, any>(),
            noche: new Map<string, any>()
        };

        for (const c of commitsInDateRange) {
            const key = (c.authorLogin || c.authorEmail || c.authorName).toLowerCase();
            const dStr = c.regionalDate || getRegionalDateOnly(c.date);
            activeDays.add(dStr);

            let cItem = contribMap.get(key);
            if (!cItem) {
                cItem = {
                    name: c.authorName,
                    login: c.authorLogin,
                    avatar: c.authorAvatar,
                    profileUrl: c.authorHtmlUrl,
                    email: c.authorEmail,
                    commitsCount: 0,
                    activeDates: new Set<string>(),
                    lastCommitDate: c.date
                };
                contribMap.set(key, cItem);
            }
            cItem.commitsCount += 1;
            cItem.activeDates.add(dStr);
            if (new Date(c.date) > new Date(cItem.lastCommitDate)) {
                cItem.lastCommitDate = c.date;
            }

            let tEntry = timeMap.get(dStr);
            if (!tEntry) {
                tEntry = { date: dStr, total: 0, contribs: new Map<string, any>() };
                timeMap.set(dStr, tEntry);
            }
            tEntry.total += 1;
            const authorKey = c.authorLogin || c.authorName;
            const existT = tEntry.contribs.get(authorKey);
            if (existT) existT.count += 1;
            else tEntry.contribs.set(authorKey, { name: c.authorName, login: c.authorLogin, count: 1 });

            const dObj = new Date(c.date);
            const dayIdx = getRegionalDayOfWeek(dObj);
            dayCounts[dayIdx] += 1;
            const existD = dayContribs[dayIdx].get(authorKey);
            if (existD) existD.count += 1;
            else dayContribs[dayIdx].set(authorKey, { name: c.authorName, login: c.authorLogin, count: 1 });

            const hour = getRegionalHour(dObj);
            let slot: "madrugada" | "manana" | "tarde" | "noche";
            if (hour >= 0 && hour < 6) { hoursMap.madrugada += 1; slot = "madrugada"; }
            else if (hour >= 6 && hour < 12) { hoursMap.manana += 1; slot = "manana"; }
            else if (hour >= 12 && hour < 18) { hoursMap.tarde += 1; slot = "tarde"; }
            else { hoursMap.noche += 1; slot = "noche"; }

            const existH = hourContribs[slot].get(authorKey);
            if (existH) existH.count += 1;
            else hourContribs[slot].set(authorKey, { name: c.authorName, login: c.authorLogin, count: 1 });
        }

        const contributorsList = Array.from(contribMap.values()).map(contrib => {
            const pct = totalInRange > 0 ? (contrib.commitsCount / totalInRange) * 100 : 0;
            return {
                name: contrib.name,
                login: contrib.login,
                avatar: contrib.avatar,
                profileUrl: contrib.profileUrl,
                email: contrib.email,
                commitsCount: contrib.commitsCount,
                percentage: Number(pct.toFixed(1)),
                activeDaysCount: contrib.activeDates.size,
                lastCommitDate: contrib.lastCommitDate
            };
        }).sort((a, b) => b.commitsCount - a.commitsCount);

        const pieDataList = contributorsList.map(c => ({
            name: c.login || c.name,
            value: c.commitsCount,
            percentage: c.percentage
        }));

        const sortedTimelineDates = Array.from(timeMap.keys()).sort();
        const timelineList = sortedTimelineDates.map(dStr => {
            const entry = timeMap.get(dStr)!;
            return {
                date: dStr,
                formattedDate: formatDayMonthDate(dStr),
                total: entry.total,
                contributors: Array.from(entry.contribs.values()).sort((a: any, b: any) => b.count - a.count)
            };
        });

        const reorderedDays = [
            { day: "Lun", fullName: "Lunes", count: dayCounts[1], contributors: Array.from(dayContribs[1].values()).sort((a, b) => b.count - a.count) },
            { day: "Mar", fullName: "Martes", count: dayCounts[2], contributors: Array.from(dayContribs[2].values()).sort((a, b) => b.count - a.count) },
            { day: "Mié", fullName: "Miércoles", count: dayCounts[3], contributors: Array.from(dayContribs[3].values()).sort((a, b) => b.count - a.count) },
            { day: "Jue", fullName: "Jueves", count: dayCounts[4], contributors: Array.from(dayContribs[4].values()).sort((a, b) => b.count - a.count) },
            { day: "Vie", fullName: "Viernes", count: dayCounts[5], contributors: Array.from(dayContribs[5].values()).sort((a, b) => b.count - a.count) },
            { day: "Sáb", fullName: "Sábado", count: dayCounts[6], contributors: Array.from(dayContribs[6].values()).sort((a, b) => b.count - a.count) },
            { day: "Dom", fullName: "Domingo", count: dayCounts[0], contributors: Array.from(dayContribs[0].values()).sort((a, b) => b.count - a.count) }
        ];

        const hourSlotStats = [
            { slot: "Madrugada", range: "00:00 - 06:00", count: hoursMap.madrugada, contributors: Array.from(hourContribs.madrugada.values()).sort((a, b) => b.count - a.count) },
            { slot: "Mañana", range: "06:00 - 12:00", count: hoursMap.manana, contributors: Array.from(hourContribs.manana.values()).sort((a, b) => b.count - a.count) },
            { slot: "Tarde", range: "12:00 - 18:00", count: hoursMap.tarde, contributors: Array.from(hourContribs.tarde.values()).sort((a, b) => b.count - a.count) },
            { slot: "Noche", range: "18:00 - 24:00", count: hoursMap.noche, contributors: Array.from(hourContribs.noche.values()).sort((a, b) => b.count - a.count) }
        ];

        const summaryObj = {
            totalCommits: totalInRange,
            totalContributors: contributorsList.length,
            activeDaysCount: activeDays.size,
            daysSpan: activeDays.size > 0 ? (sortedTimelineDates.length > 1 ? Math.max(1, Math.ceil((new Date(sortedTimelineDates[sortedTimelineDates.length - 1]).getTime() - new Date(sortedTimelineDates[0]).getTime()) / (1000 * 60 * 60 * 24))) : 1) : 0,
            topContributor: contributorsList[0] || null,
            repoInfo: data.summary.repoInfo
        };

        return {
            summary: summaryObj,
            contributors: contributorsList,
            pieData: pieDataList,
            timeline: timelineList,
            dayOfWeekStats: reorderedDays,
            hourStats: hourSlotStats
        };
    }, [data, isDateFiltered, commitsInDateRange]);

    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-card">
                <div className="relative mb-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <GitCommit className="h-5 w-5 text-primary absolute inset-0 m-auto" />
                </div>
                <h3 className="font-bold text-base text-foreground">Analizando historial de Git...</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Consultando commits, autores, ramas y porcentaje de contribución directamente desde GitHub.
                </p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[380px] p-8 text-center bg-card">
                <div className="p-3 bg-destructive/10 text-destructive rounded-full mb-3">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-base text-foreground">No se pudo auditar el repositorio</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {error || "Verifica que la URL del repositorio sea pública y accesible."}
                </p>
                <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={loadAudit} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reintentar
                    </Button>
                    {repoUrl && (
                        <Button asChild size="sm" variant="default" className="gap-1.5">
                            <a href={repoUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Abrir en GitHub
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const warning = data.warning;
    const summary = activeStats?.summary || data.summary;
    const contributors = activeStats?.contributors || data.contributors || [];
    const dayOfWeekStats = activeStats?.dayOfWeekStats || data.dayOfWeekStats || [];
    const hourStats = activeStats?.hourStats || data.hourStats || [];
    const pieData = activeStats?.pieData || [];
    const timelineData = activeStats?.timeline || [];

    return (
        <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2 space-y-2">
                {/* Header & Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs">
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-bold tracking-tight text-foreground">
                                Auditoría Git de Colaboración y Commits
                            </h2>
                            <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                                Rama: {summary.repoInfo?.branch || "HEAD"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            Repositorio: <a href={summary.repoInfo?.repoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono inline-flex items-center gap-1">
                                {summary.repoInfo?.owner}/{summary.repoInfo?.repo}
                                <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                            </a>
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={loadAudit}
                            disabled={isLoading}
                            className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-border/80 shadow-2xs hover:bg-muted"
                            title="Volver a escanear commits de GitHub"
                        >
                            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                            <span>Re-auditar</span>
                        </Button>
                        <Button
                            asChild
                            type="button"
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1.5 rounded-lg shadow-2xs font-semibold"
                        >
                            <a href={summary.repoInfo?.repoUrl} target="_blank" rel="noreferrer">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                <span>Ver en GitHub</span>
                            </a>
                        </Button>
                        {onToggleFullscreen && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onToggleFullscreen}
                                className="h-8 w-8 p-0 rounded-lg border-border/80"
                                title={isFullscreen ? "Restaurar vista dividida" : "Pantalla completa para este panel"}
                            >
                                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Barra de Filtro de Fechas y Conteo de Commits */}
                <div className="p-2 sm:p-2.5 rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-xs font-bold text-foreground mr-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span>Período:</span>
                            </div>

                            {/* Presets rápidos */}
                            <div className="flex items-center gap-1 flex-wrap">
                                <Button
                                    type="button"
                                    variant={datePreset === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetChange("all")}
                                    className="h-7 px-2.5 text-[11px] rounded-lg cursor-pointer"
                                >
                                    Todos los commits ({data.commits?.length || 0})
                                </Button>
                                <Button
                                    type="button"
                                    variant={datePreset === "7d" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetChange("7d")}
                                    className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                >
                                    Últimos 7 días
                                </Button>
                                <Button
                                    type="button"
                                    variant={datePreset === "15d" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetChange("15d")}
                                    className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                >
                                    Últimos 15 días
                                </Button>
                                <Button
                                    type="button"
                                    variant={datePreset === "30d" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePresetChange("30d")}
                                    className="h-7 px-2 text-[11px] rounded-lg cursor-pointer"
                                >
                                    Últimos 30 días
                                </Button>
                            </div>
                        </div>

                        {/* Controles de Rango de Fechas (Desde / Hasta) */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] text-muted-foreground font-medium">Desde:</span>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="h-7 text-xs w-32 bg-background border-border/80 px-2 py-0"
                                />
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] text-muted-foreground font-medium">Hasta:</span>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    className="h-7 text-xs w-32 bg-background border-border/80 px-2 py-0"
                                />
                            </div>

                            {isDateFiltered && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetDateFilter}
                                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 rounded-lg"
                                    title="Restablecer y ver todos los commits"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Ver todos</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Detalle del filtro activo */}
                    {isDateFiltered && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1.5 border-t border-border/50 text-[11px]">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="gap-1 font-normal bg-primary/10 text-primary border-primary/20">
                                    <Filter className="h-3 w-3" />
                                    <span>
                                        Mostrando <strong>{commitsInDateRange.length}</strong> de {data.commits?.length || 0} commits
                                        {startDate ? ` a partir del ${startDate}` : ""}
                                        {endDate ? ` hasta el ${endDate}` : ""}
                                    </span>
                                </Badge>
                                <span className="text-muted-foreground text-[10px]">
                                    (Métricas, gráficos y colaboradores recalculados para este período)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetDateFilter}
                                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                            >
                                Quitar filtro de fecha ✕
                            </button>
                        </div>
                    )}
                </div>

            {/* Aviso opcional */}
            {warning && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-snug">{warning}</p>
                </div>
            )}

            {/* Tarjetas Bento de Métricas Clave Compactas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Total Commits */}
                <Card className="rounded-xl border-border/80 bg-card shadow-2xs">
                    <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Total Commits
                            </span>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                <GitCommit className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">{summary.totalCommits}</span>
                            <span className="text-[10px] text-muted-foreground">registrados</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Colaboradores Activos */}
                <Card className="rounded-xl border-border/80 bg-card shadow-2xs">
                    <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Colaboradores
                            </span>
                            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">{summary.totalContributors}</span>
                            <span className="text-[10px] text-muted-foreground">autores únicos</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Días Activos de Trabajo */}
                <Card className="rounded-xl border-border/80 bg-card shadow-2xs">
                    <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Días Activos
                            </span>
                            <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                                <CalendarDays className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">{summary.activeDaysCount}</span>
                            <span className="text-[10px] text-muted-foreground">de {summary.daysSpan} días lapso</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Mayor Aportador */}
                <Card className="rounded-xl border-border/80 bg-card shadow-2xs">
                    <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Líder de Commits
                            </span>
                            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                <Crown className="h-3.5 w-3.5 fill-amber-500/40" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-foreground leading-snug break-words" title={summary.topContributor?.name}>
                                {summary.topContributor?.name || "Sin datos"}
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-tight mt-0.5">
                                {summary.topContributor?.commitsCount || 0} commits ({summary.topContributor?.percentage || 0}%)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Colaboradores y Porcentaje de Contribución */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Lista Detallada de Colaboradores */}
                <Card className="lg:col-span-7 rounded-2xl border-border/80 shadow-xs flex flex-col">
                    <CardHeader className="p-4 pb-2 border-b border-border/60">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    Participación por Colaborador
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Porcentaje de aportes y constancia en el desarrollo
                                </CardDescription>
                            </div>
                            {selectedContributor && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedContributor(null)}
                                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                    Limpiar filtro
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
                        {contributors.map((contrib: any, idx: number) => {
                            const isSelected = selectedContributor === (contrib.login || contrib.name);
                            const color = CHART_COLORS[idx % CHART_COLORS.length];

                            return (
                                <div
                                    key={contrib.login || contrib.name || idx}
                                    onClick={() => setSelectedContributor(isSelected ? null : (contrib.login || contrib.name))}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected 
                                            ? "border-primary bg-primary/5 shadow-xs" 
                                            : "border-border/60 bg-card hover:bg-muted/40"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {contrib.avatar ? (
                                                <img 
                                                    src={contrib.avatar} 
                                                    alt={contrib.name} 
                                                    className="w-7 h-7 rounded-full border border-border shrink-0 object-cover"
                                                />
                                            ) : (
                                                <div 
                                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-2xs"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {(contrib.name || "A")[0].toUpperCase()}
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-xs text-foreground truncate">
                                                        {contrib.name}
                                                    </span>
                                                    {idx === 0 && (
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-bold">
                                                            👑 Top 1
                                                        </Badge>
                                                    )}
                                                </div>
                                                {contrib.login && (
                                                    <a
                                                        href={contrib.profileUrl || `https://github.com/${contrib.login}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                                    >
                                                        @{contrib.login}
                                                        <ExternalLink className="h-2 w-2 opacity-60" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="flex items-baseline gap-1 justify-end">
                                                <span className="font-extrabold text-sm text-foreground">{contrib.commitsCount}</span>
                                                <span className="text-[10px] text-muted-foreground">commits</span>
                                            </div>
                                            <span className="text-xs font-black" style={{ color }}>
                                                {contrib.percentage}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Barra de progreso de participación */}
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-500" 
                                            style={{ width: `${contrib.percentage}%`, backgroundColor: color }}
                                        />
                                    </div>

                                    {/* Metadatos adicionales de constancia */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-1.5 border-t border-border/40">
                                        <span>Días activos: <strong className="text-foreground">{contrib.activeDaysCount}</strong></span>
                                        <span>
                                            Último aporte: {contrib.lastCommitDate ? formatDistanceToNow(new Date(contrib.lastCommitDate), { addSuffix: true, locale: es }) : "-"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Panel de Gráficos de Colaboración */}
                <Card className="lg:col-span-5 rounded-2xl border-border/80 shadow-xs flex flex-col">
                    <CardHeader className="p-4 pb-2 border-b border-border/60">
                        <Tabs value={activeChartTab} onValueChange={(v) => setActiveChartTab(v as any)} className="w-full">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    Análisis Visual
                                </CardTitle>
                                <TabsList className="h-7 p-0.5 bg-muted/60">
                                    <TabsTrigger value="distribution" className="text-[10px] px-2 py-1 h-6">
                                        Distribución
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="text-[10px] px-2 py-1 h-6">
                                        Tiempo
                                    </TabsTrigger>
                                    <TabsTrigger value="habits" className="text-[10px] px-2 py-1 h-6">
                                        Periodicidad
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col justify-center min-h-[320px]">
                        {activeChartTab === "distribution" && (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <div className="w-full h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry: any, index: number) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                                        stroke="var(--card)"
                                                        strokeWidth={2}
                                                    />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomPieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 max-h-[80px] overflow-y-auto">
                                    {contributors.map((c: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} 
                                            />
                                            <span className="font-medium text-foreground truncate max-w-[100px]">{c.login || c.name}</span>
                                            <span className="text-muted-foreground font-mono">({c.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeChartTab === "timeline" && (
                            <div className="w-full h-[260px] flex flex-col justify-center">
                                <p className="text-[11px] text-muted-foreground text-center mb-2 font-medium">
                                    Frecuencia de commits por fecha de desarrollo
                                </p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis 
                                            dataKey="formattedDate" 
                                            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} 
                                            tickLine={false} 
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} 
                                            tickLine={false} 
                                            allowDecimals={false}
                                        />
                                        <RechartsTooltip content={<CustomTimelineTooltip />} />
                                        <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {activeChartTab === "habits" && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Actividad por Día de la Semana
                                    </p>
                                    <TooltipProvider delayDuration={50}>
                                        <div className="grid grid-cols-7 gap-1">
                                            {dayOfWeekStats.map((d: any) => {
                                                const maxDay = Math.max(...dayOfWeekStats.map((s: any) => s.count), 1);
                                                const intensity = d.count / maxDay;
                                                const contribs = d.contributors || [];

                                                return (
                                                    <Tooltip key={d.day}>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex flex-col items-center gap-1 cursor-pointer group">
                                                                <div 
                                                                    className="w-full h-12 rounded-lg flex items-end justify-center pb-1 transition-all border border-border/40 group-hover:ring-2 group-hover:ring-primary/40 group-hover:border-primary/50"
                                                                    style={{
                                                                        backgroundColor: intensity > 0 
                                                                            ? `color-mix(in srgb, var(--primary) ${Math.max(15, Math.round(intensity * 100))}%, transparent)` 
                                                                            : 'var(--muted)'
                                                                    }}
                                                                >
                                                                    <span className="text-[10px] font-bold text-foreground">{d.count}</span>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground font-semibold group-hover:text-primary transition-colors">{d.day}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="p-3 bg-card border border-border/80 shadow-xl text-xs rounded-xl space-y-2 max-w-xs z-50 text-foreground">
                                                            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
                                                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                                                    {d.fullName}
                                                                </span>
                                                                <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                                                                    {d.count} {d.count === 1 ? 'commit' : 'commits'}
                                                                </Badge>
                                                            </div>
                                                            {contribs.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                        Colaboradores:
                                                                    </p>
                                                                    {contribs.map((c: any, i: number) => (
                                                                        <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                                                                            <span className="font-medium text-foreground truncate max-w-[150px]">{c.name}</span>
                                                                            <span className="font-mono font-bold text-primary shrink-0">{c.count} {c.count === 1 ? 'commit' : 'commits'}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-muted-foreground italic">Sin commits este día</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </TooltipProvider>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Franjas Horarias de Trabajo
                                    </p>
                                    <TooltipProvider delayDuration={50}>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {hourStats.map((h: any) => {
                                                const contribs = h.contributors || [];
                                                return (
                                                    <Tooltip key={h.slot}>
                                                        <TooltipTrigger asChild>
                                                            <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 text-center space-y-0.5 cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-all">
                                                                <div className="flex justify-center text-primary mb-1">
                                                                    {h.slot === "Madrugada" || h.slot === "Noche" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                                                                </div>
                                                                <p className="font-bold text-xs text-foreground">{h.count}</p>
                                                                <p className="text-[10px] font-semibold text-foreground/80">{h.slot}</p>
                                                                <p className="text-[9px] text-muted-foreground">{h.range}</p>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="p-3 bg-card border border-border/80 shadow-xl text-xs rounded-xl space-y-2 max-w-xs z-50 text-foreground">
                                                            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
                                                                <span className="font-bold text-foreground flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                                                    {h.slot} ({h.range})
                                                                </span>
                                                                <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">
                                                                    {h.count} {h.count === 1 ? 'commit' : 'commits'}
                                                                </Badge>
                                                            </div>
                                                            {contribs.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                        Colaboradores:
                                                                    </p>
                                                                    {contribs.map((c: any, i: number) => (
                                                                        <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                                                                            <span className="font-medium text-foreground truncate max-w-[150px]">{c.name}</span>
                                                                            <span className="font-mono font-bold text-primary shrink-0">{c.count} {c.count === 1 ? 'commit' : 'commits'}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-muted-foreground italic">Sin commits en esta franja</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </TooltipProvider>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Listado Completo de Commits Auditados */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
                <CardHeader className="p-4 pb-3 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <GitCommit className="h-4 w-4 text-primary" />
                                <span>
                                    Historial Detallado de Commits ({filteredCommits.length}
                                    {isDateFiltered && filteredCommits.length !== (data.commits?.length || 0)
                                        ? ` de ${data.commits?.length || 0}`
                                        : ""}
                                    )
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Cada commit incluye su identificador único, fecha regional calibrada y enlace directo en GitHub
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Buscador de commits */}
                            <div className="relative w-full sm:w-64">
                                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por mensaje, SHA o autor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 text-xs pl-8 bg-background border-border/80"
                                />
                            </div>

                            {selectedContributor && (
                                <Badge 
                                    variant="secondary" 
                                    onClick={() => setSelectedContributor(null)}
                                    className="cursor-pointer gap-1 text-[10px] h-8 px-2 shrink-0 bg-primary/10 text-primary border-primary/20"
                                    title="Quitar filtro de colaborador"
                                >
                                    Filtro: {selectedContributor} ✕
                                </Badge>
                            )}

                            {isDateFiltered && (
                                <Badge 
                                    variant="outline" 
                                    onClick={handleResetDateFilter}
                                    className="cursor-pointer gap-1 text-[10px] h-8 px-2 shrink-0 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                                    title="Quitar filtro de fecha y ver todos los commits"
                                >
                                    <Calendar className="h-3 w-3" />
                                    <span>Filtro fecha activo ✕</span>
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredCommits.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">No se encontraron commits coincidentes con los filtros.</p>
                            {isDateFiltered && (
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={handleResetDateFilter}
                                    className="mt-1 text-xs text-primary"
                                >
                                    Restablecer y ver todos los commits
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                            {filteredCommits.map((commit: any) => {
                                const isCopied = copiedSha === commit.sha;

                                return (
                                    <div 
                                        key={commit.sha}
                                        className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            {/* Avatar */}
                                            {commit.authorAvatar ? (
                                                <img 
                                                    src={commit.authorAvatar} 
                                                    alt={commit.authorName} 
                                                    className="w-8 h-8 rounded-full border border-border shrink-0 mt-0.5 object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                    {(commit.authorName || "A")[0].toUpperCase()}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* SHA corto con botón de copia */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopySha(commit.sha)}
                                                        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold py-0.5 px-1.5 rounded-md bg-muted text-foreground border border-border/60 hover:bg-accent cursor-pointer transition-colors"
                                                        title="Copiar SHA completo"
                                                    >
                                                        {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
                                                        <span>{commit.shortSha}</span>
                                                    </button>

                                                    {/* Mensaje de commit */}
                                                    <p className="font-semibold text-xs text-foreground tracking-tight break-words">
                                                        {commit.title}
                                                    </p>
                                                </div>

                                                {commit.body && (
                                                    <p className="text-[11px] text-muted-foreground line-clamp-2 pl-1 border-l-2 border-primary/30">
                                                        {commit.body}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                    <span className="font-medium text-foreground">
                                                        {commit.authorName}
                                                    </span>
                                                    {commit.authorLogin && (
                                                        <span className="opacity-75 font-mono">(@{commit.authorLogin})</span>
                                                    )}
                                                    <span>•</span>
                                                    <span 
                                                        className="font-semibold text-foreground/90 font-mono bg-muted/60 px-1 py-0.5 rounded border border-border/40" 
                                                        title={`Fecha regional: ${commit.regionalDate || getRegionalDateOnly(commit.date)} ${commit.regionalTime || ""}`}
                                                    >
                                                        {commit.regionalDate || getRegionalDateOnly(commit.date)}
                                                        {commit.regionalTime ? ` ${commit.regionalTime}` : ""}
                                                    </span>
                                                    <span>•</span>
                                                    <span title={format(new Date(commit.date), "PPpp", { locale: es })}>
                                                        {formatDistanceToNow(new Date(commit.date), { addSuffix: true, locale: es })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botón directo a GitHub */}
                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <Button
                                                asChild
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2.5 text-[11px] gap-1.5 rounded-lg border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all cursor-pointer font-semibold"
                                                title="Abrir este commit específico en GitHub (nueva pestaña)"
                                            >
                                                <a 
                                                    href={commit.commitUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                >
                                                    <span>Ver Commit</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
