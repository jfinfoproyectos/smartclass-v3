"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Trash2,
    Github,
    ShieldAlert,
    KeyRound,
    CheckCircle2,
    ExternalLink,
    AlertTriangle,
    Loader2,
    Search,
    GitFork,
    Lock,
    Globe,
    Archive,
    Star,
    Download,
    Eye,
    EyeOff,
    CheckSquare,
    Square,
    Sparkles,
    Check,
    Clock,
    FileText,
    Copy,
    X,
    Filter,
    HardDrive,
    AlertCircle,
    CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
    validateCleanerTokenAction,
    fetchUserReposForCleanerAction,
    deleteSelectedReposAction,
} from "../../actions/gitCleanerActions";
import type { CleanerRepoItem, CleanerUserProfile, DeleteRepoResult } from "../../services/gitCleanerService";

type FilterTab = "all" | "forks" | "stale" | "small" | "public" | "private" | "archived";

const TOKEN_CREATOR_URL = "https://github.com/settings/tokens/new?scopes=delete_repo,repo&description=SmartClass+Repo+Cleaner";

function getLanguageColor(language: string | null): string {
    if (!language) return "bg-muted-foreground";
    switch (language.toLowerCase()) {
        case "typescript": return "bg-blue-500";
        case "javascript": return "bg-yellow-400";
        case "python": return "bg-emerald-500";
        case "java": return "bg-amber-600";
        case "c#": return "bg-purple-600";
        case "c++": return "bg-pink-600";
        case "php": return "bg-indigo-500";
        case "html": return "bg-orange-500";
        case "css": return "bg-pink-500";
        case "go": return "bg-cyan-500";
        case "rust": return "bg-rose-500";
        case "ruby": return "bg-red-500";
        default: return "bg-primary";
    }
}

export function GitCleanerToolView() {
    const router = useRouter();

    // Authentication / Token States
    const [token, setToken] = useState<string>("");
    const [showToken, setShowToken] = useState<boolean>(false);
    const [isValidatingToken, setIsValidatingToken] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<CleanerUserProfile | null>(null);
    const [tokenScopes, setTokenScopes] = useState<string[]>([]);
    const [hasDeleteScope, setHasDeleteScope] = useState<boolean>(false);

    // Repositories Data
    const [repos, setRepos] = useState<CleanerRepoItem[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeTab, setActiveTab] = useState<FilterTab>("all");

    // Selection States
    const [selectedRepoIds, setSelectedRepoIds] = useState<Set<number>>(new Set());

    // Deletion Modal and Execution States
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [confirmationText, setConfirmationText] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deletionProgress, setDeletionProgress] = useState<{ current: number; total: number; repoName: string }>({ current: 0, total: 0, repoName: "" });
    const [deletionResults, setDeletionResults] = useState<DeleteRepoResult[] | null>(null);

    // Connect & Load User Repos
    const handleConnectAndLoad = async () => {
        const cleanToken = token.trim();
        if (!cleanToken) {
            toast.error("Por favor ingresa un token de GitHub.");
            return;
        }

        setIsValidatingToken(true);
        try {
            const tokenRes = await validateCleanerTokenAction(cleanToken);
            if (!tokenRes.success || !tokenRes.user) {
                toast.error(tokenRes.error || "Token no válido o no autorizado.");
                return;
            }

            setUserProfile(tokenRes.user);
            setTokenScopes(tokenRes.scopes);
            setHasDeleteScope(tokenRes.hasDeleteScope);

            if (!tokenRes.hasDeleteScope) {
                toast.warning("El token no posee el permiso 'delete_repo'. Podrás ver los repositorios pero no podrás eliminarlos.", {
                    duration: 7000,
                });
            } else {
                toast.success(`Conectado como @${tokenRes.user.login}`);
            }

            // Fetch repositories
            setIsLoadingRepos(true);
            const reposRes = await fetchUserReposForCleanerAction(cleanToken);
            if (reposRes.success) {
                setRepos(reposRes.repos);
                setSelectedRepoIds(new Set());
                toast.info(`${reposRes.repos.length} repositorios encontrados.`);
            } else {
                toast.error(reposRes.error || "Error cargando lista de repositorios.");
            }
        } catch (err: any) {
            toast.error(err.message || "Error al conectar con GitHub.");
        } finally {
            setIsValidatingToken(false);
            setIsLoadingRepos(false);
        }
    };

    // Disconnect Token
    const handleDisconnect = () => {
        setUserProfile(null);
        setRepos([]);
        setSelectedRepoIds(new Set());
        setToken("");
        setDeletionResults(null);
        toast.info("Cuenta desconectada.");
    };

    // Filter Logic
    const filteredRepos = useMemo(() => {
        const now = new Date().getTime();
        const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

        return repos.filter((r) => {
            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = r.name.toLowerCase().includes(q);
                const matchDesc = (r.description || "").toLowerCase().includes(q);
                if (!matchName && !matchDesc) return false;
            }

            // Tab Filters
            switch (activeTab) {
                case "forks":
                    return r.fork;
                case "stale":
                    return new Date(r.updated_at).getTime() < sixMonthsAgo;
                case "small":
                    return r.size <= 50; // Menor a 50 KB
                case "public":
                    return !r.private;
                case "private":
                    return r.private;
                case "archived":
                    return r.archived;
                case "all":
                default:
                    return true;
            }
        });
    }, [repos, searchQuery, activeTab]);

    // Counts for Tabs
    const tabCounts = useMemo(() => {
        const now = new Date().getTime();
        const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

        return {
            all: repos.length,
            forks: repos.filter((r) => r.fork).length,
            stale: repos.filter((r) => new Date(r.updated_at).getTime() < sixMonthsAgo).length,
            small: repos.filter((r) => r.size <= 50).length,
            public: repos.filter((r) => !r.private).length,
            private: repos.filter((r) => r.private).length,
            archived: repos.filter((r) => r.archived).length,
        };
    }, [repos]);

    // Selected Repos Objects
    const selectedRepos = useMemo(() => {
        return repos.filter((r) => selectedRepoIds.has(r.id));
    }, [repos, selectedRepoIds]);

    // Toggle Single Repo
    const handleToggleRepo = (id: number) => {
        const next = new Set(selectedRepoIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedRepoIds(next);
    };

    // Select all currently visible
    const handleSelectAllVisible = () => {
        const next = new Set(selectedRepoIds);
        filteredRepos.forEach((r) => next.add(r.id));
        setSelectedRepoIds(next);
    };

    // Deselect all
    const handleDeselectAll = () => {
        setSelectedRepoIds(new Set());
    };

    // Select all forks
    const handleSelectAllForks = () => {
        const next = new Set(selectedRepoIds);
        repos.filter((r) => r.fork).forEach((r) => next.add(r.id));
        setSelectedRepoIds(next);
        toast.info(`Seleccionados ${repos.filter((r) => r.fork).length} forks.`);
    };

    // Select stale (> 6 months)
    const handleSelectAllStale = () => {
        const now = new Date().getTime();
        const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
        const next = new Set(selectedRepoIds);
        repos.filter((r) => new Date(r.updated_at).getTime() < sixMonthsAgo).forEach((r) => next.add(r.id));
        setSelectedRepoIds(next);
        toast.info(`Seleccionados ${repos.filter((r) => new Date(r.updated_at).getTime() < sixMonthsAgo).length} repositorios inactivos.`);
    };

    // Select small (< 50KB)
    const handleSelectAllSmall = () => {
        const next = new Set(selectedRepoIds);
        repos.filter((r) => r.size <= 50).forEach((r) => next.add(r.id));
        setSelectedRepoIds(next);
        toast.info(`Seleccionados ${repos.filter((r) => r.size <= 50).length} repositorios pequeños (<50KB).`);
    };

    // Invert visible selection
    const handleInvertSelection = () => {
        const next = new Set(selectedRepoIds);
        filteredRepos.forEach((r) => {
            if (next.has(r.id)) {
                next.delete(r.id);
            } else {
                next.add(r.id);
            }
        });
        setSelectedRepoIds(next);
    };

    // Export selected repos to JSON or TXT backup
    const handleExportBackup = (formatType: "json" | "txt") => {
        if (selectedRepos.length === 0) return;

        let content = "";
        let mime = "application/json";
        let extension = "json";

        if (formatType === "json") {
            content = JSON.stringify(
                {
                    exportDate: new Date().toISOString(),
                    account: userProfile?.login,
                    totalSelected: selectedRepos.length,
                    repositories: selectedRepos.map((r) => ({
                        name: r.name,
                        fullName: r.full_name,
                        url: r.html_url,
                        cloneUrl: `${r.html_url}.git`,
                        isFork: r.fork,
                        isPrivate: r.private,
                        sizeKb: r.size,
                        updatedAt: r.updated_at,
                    })),
                },
                null,
                2
            );
        } else {
            mime = "text/plain";
            extension = "txt";
            content = `# Respaldo de Repositorios GitHub para Clonación\n# Cuenta: ${userProfile?.login}\n# Fecha: ${new Date().toLocaleString()}\n# Total: ${selectedRepos.length} repositorios\n\n`;
            selectedRepos.forEach((r) => {
                content += `# ${r.full_name} (${r.private ? "Privado" : "Público"}, ${r.fork ? "Fork" : "Propio"})\n`;
                content += `git clone ${r.html_url}.git\n\n`;
            });
        }

        const blob = new Blob([content], { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `github-backup-${userProfile?.login || "repos"}-${format(new Date(), "yyyyMMdd-HHmm")}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Respaldo descargado (${extension.toUpperCase()})`);
    };

    // Required confirmation string
    const requiredConfirmation = useMemo(() => {
        return userProfile ? userProfile.login : "ELIMINAR";
    }, [userProfile]);

    const isConfirmationValid = confirmationText.trim().toLowerCase() === requiredConfirmation.toLowerCase() ||
        confirmationText.trim().toUpperCase() === `ELIMINAR ${selectedRepos.length} REPOSITORIOS`;

    // Execute Batch Deletion
    const handleExecuteDeletion = async () => {
        if (!isConfirmationValid || selectedRepos.length === 0 || !token.trim()) return;

        setIsDeleting(true);
        setDeletionProgress({ current: 0, total: selectedRepos.length, repoName: "Iniciando..." });

        const targets = selectedRepos.map((r) => ({ owner: r.owner, repo: r.name }));

        try {
            const res = await deleteSelectedReposAction(targets, token.trim());
            setDeletionResults(res.results);

            if (res.deletedCount > 0) {
                // Remove successfully deleted repos from state
                const deletedFullNames = new Set(res.results.filter((r) => r.success).map((r) => r.fullName));
                setRepos((prev) => prev.filter((r) => !deletedFullNames.has(r.full_name)));
                setSelectedRepoIds(new Set());
                toast.success(`${res.deletedCount} de ${res.total} repositorios eliminados exitosamente.`);
            }

            if (res.failedCount > 0) {
                toast.error(`${res.failedCount} repositorios no se pudieron eliminar. Revisa los permisos del token.`);
            }
        } catch (err: any) {
            toast.error(err.message || "Error al procesar la eliminación masiva.");
        } finally {
            setIsDeleting(false);
        }
    };

    const isAllVisibleSelected = filteredRepos.length > 0 && filteredRepos.every((r) => selectedRepoIds.has(r.id));

    return (
        <div className="w-full flex-1 flex flex-col space-y-2.5 p-0.5 sm:p-1 h-[calc(100vh-80px)] min-h-[600px] overflow-hidden">
            {/* Paso 1: Conexión con Token si no está conectado */}
            {!userProfile ? (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                    {/* Header Banner de Bienvenida */}
                    <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-card text-card-foreground p-5 sm:p-6 shadow-xl shrink-0">
                        <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-red-500/20 via-rose-500/10 to-transparent blur-3xl opacity-70" />
                        <div className="relative z-10 space-y-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push("/dashboard/teacher/tools")}
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    <span>Volver a Herramientas</span>
                                </Button>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 backdrop-blur-md">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Zona Administrativa & Limpieza</span>
                                </div>
                            </div>

                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                                <Trash2 className="h-6 w-6 text-red-500" />
                                <span>Limpiador de Repositorios GitHub</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                                Elimina de forma masiva y segura repositorios obsoletos, forks de prácticas pasadas o proyectos de prueba. 
                                Filtra por antigüedad, tamaño o visibilidad y selecciona mediante checkboxes.
                            </p>
                        </div>
                    </div>

                    {/* Tarjeta de Entrada de Token y Permisos */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-red-500" />
                                    <span>Autenticación con Personal Access Token (PAT)</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Para poder eliminar repositorios en tu nombre, GitHub requiere un token con el permiso administrativo <code className="bg-muted px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono">delete_repo</code>.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        <span>Token de Acceso Personal de GitHub:</span>
                                        <span className="text-[11px] text-muted-foreground font-normal">
                                            No se guardará en bases de datos (uso en memoria)
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showToken ? "text" : "password"}
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleConnectAndLoad();
                                                }
                                            }}
                                            className="pr-10 font-mono text-xs h-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                                    <Button
                                        onClick={handleConnectAndLoad}
                                        disabled={isValidatingToken || !token.trim()}
                                        className="h-10 px-5 gap-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm"
                                    >
                                        {isValidatingToken ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Validando Token...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Conectar y Listar Repositorios</span>
                                            </>
                                        )}
                                    </Button>

                                    <a
                                        href={TOKEN_CREATOR_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                        <span>Generar Token Preconfigurado en GitHub</span>
                                    </a>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tarjeta de Instrucciones y Scopes */}
                        <Card className="border-border/80 bg-muted/20 shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Permisos Requeridos</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs leading-relaxed">
                                <p className="text-muted-foreground">
                                    Al hacer clic en el botón de generar token, GitHub abrirá la página con los permisos necesarios pre-seleccionados:
                                </p>
                                <ul className="space-y-2 text-[11px]">
                                    <li className="flex items-start gap-2">
                                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-mono">delete_repo:</strong>
                                            <p className="text-muted-foreground">Permite la eliminación de repositorios personales.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="text-foreground font-mono">repo:</strong>
                                            <p className="text-muted-foreground">Permite listar repositorios públicos y privados.</p>
                                        </div>
                                    </li>
                                </ul>
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
                                    ⚠️ <strong>Importante:</strong> Esta herramienta solo eliminará los repositorios que selecciones manualmente y confirmes explícitamente en el modal.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                /* Paso 2: CONFIGURACIÓN EN 2 COLUMNAS (LAYOUT SPLIT) */
                <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                    
                    {/* Header Ejecutivo Compacto */}
                    <div className="bg-card border border-border rounded-2xl px-4 py-2.5 shadow-xs shrink-0 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/dashboard/teacher/tools")}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer -ml-2 shrink-0"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                                <span>Herramientas</span>
                            </Button>
                            
                            <div className="h-4 w-px bg-border shrink-0" />

                            <div className="flex items-center gap-2 min-w-0">
                                <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                                <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                                    Limpiador de Repositorios GitHub
                                </h1>
                                <Badge variant="outline" className="hidden md:inline-flex text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 py-0 shrink-0">
                                    Zona Administrativa
                                </Badge>
                            </div>
                        </div>

                        {/* Perfil del Usuario Conectado */}
                        <div className="flex items-center gap-2.5 bg-muted/40 px-2.5 py-1 rounded-xl border border-border shrink-0">
                            <img
                                src={userProfile.avatar_url}
                                alt={userProfile.login}
                                className="w-6 h-6 rounded-full border border-border shrink-0"
                            />
                            <div className="text-xs flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-foreground truncate max-w-[130px]">@{userProfile.login}</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                    {repos.length} repos
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDisconnect}
                                className="h-6 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer px-1.5"
                                title="Desconectar token y cambiar de cuenta"
                            >
                                Cambiar
                            </Button>
                        </div>
                    </div>

                    {/* ======================================================== */}
                    {/* LAYOUT EN 2 COLUMNAS                                     */}
                    {/* ======================================================== */}
                    <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
                        
                        {/* ======================================================== */}
                        {/* COLUMNA 1 (IZQUIERDA): CONTROLES, FILTROS Y PELIGRO      */}
                        {/* ======================================================== */}
                        <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-0.5">
                            
                            {/* Card 1: Búsqueda y Filtros de Categoría */}
                            <Card className="border-border shadow-xs shrink-0">
                                <CardHeader className="p-3 pb-2">
                                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Filter className="h-3.5 w-3.5 text-primary" />
                                            <span>Búsqueda & Categorías</span>
                                        </span>
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
                                            >
                                                <X className="h-3 w-3" /> Limpiar
                                            </button>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2.5">
                                    {/* Input de Búsqueda */}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por nombre o descripción..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 pr-7 text-xs h-8 bg-muted/30"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Lista Vertical de Pestañas / Filtros */}
                                    <div className="space-y-1 pt-1 border-t border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("all")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "all"
                                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Github className="h-3.5 w-3.5" />
                                                <span>Todos los repositorios</span>
                                            </span>
                                            <Badge variant={activeTab === "all" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.all}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("forks")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "forks"
                                                    ? "bg-purple-600 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <GitFork className="h-3.5 w-3.5 text-purple-400" />
                                                <span>Forks de prácticas</span>
                                            </span>
                                            <Badge variant={activeTab === "forks" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.forks}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("stale")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "stale"
                                                    ? "bg-amber-600 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 text-amber-400" />
                                                <span>Inactivos (&gt; 6 meses)</span>
                                            </span>
                                            <Badge variant={activeTab === "stale" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.stale}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("small")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "small"
                                                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                                                <span>Pequeños (&lt; 50 KB)</span>
                                            </span>
                                            <Badge variant={activeTab === "small" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.small}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("public")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "public"
                                                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                                                <span>Públicos</span>
                                            </span>
                                            <Badge variant={activeTab === "public" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.public}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("private")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "private"
                                                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                                                <span>Privados</span>
                                            </span>
                                            <Badge variant={activeTab === "private" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.private}
                                            </Badge>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("archived")}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                                                activeTab === "archived"
                                                    ? "bg-slate-700 text-white font-semibold shadow-xs"
                                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Archive className="h-3.5 w-3.5" />
                                                <span>Archivados</span>
                                            </span>
                                            <Badge variant={activeTab === "archived" ? "outline" : "secondary"} className="text-[10px] py-0 px-1.5 font-mono">
                                                {tabCounts.archived}
                                            </Badge>
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 2: Selección Masiva & Respaldos */}
                            <Card className="border-border shadow-xs shrink-0">
                                <CardHeader className="p-3 pb-2">
                                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                                            <span>Acciones de Selección</span>
                                        </span>
                                        <button
                                            onClick={handleDeselectAll}
                                            disabled={selectedRepoIds.size === 0}
                                            className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-40"
                                        >
                                            Limpiar ({selectedRepoIds.size})
                                        </button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 space-y-2">
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllVisible}
                                            className="h-8 text-[11px] justify-start gap-1.5 cursor-pointer px-2"
                                        >
                                            <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="truncate">Visibles ({filteredRepos.length})</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleInvertSelection}
                                            className="h-8 text-[11px] justify-start gap-1.5 cursor-pointer px-2"
                                        >
                                            <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="truncate">Invertir Visibles</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllForks}
                                            className="h-8 text-[11px] justify-start gap-1.5 cursor-pointer px-2"
                                        >
                                            <GitFork className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                            <span className="truncate">Solo Forks ({tabCounts.forks})</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllStale}
                                            className="h-8 text-[11px] justify-start gap-1.5 cursor-pointer px-2"
                                        >
                                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            <span className="truncate">Inactivos ({tabCounts.stale})</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllSmall}
                                            className="h-8 text-[11px] justify-start gap-1.5 cursor-pointer px-2 col-span-2"
                                        >
                                            <HardDrive className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                            <span className="truncate">Solo Pequeños &lt;50KB ({tabCounts.small})</span>
                                        </Button>
                                    </div>

                                    {/* Respaldo de los seleccionados */}
                                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                                <Download className="h-3 w-3 text-emerald-500" />
                                                <span>Respaldar Selección:</span>
                                            </span>
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {selectedRepoIds.size} seleccionados
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportBackup("json")}
                                                disabled={selectedRepoIds.size === 0}
                                                className="h-7 text-[10px] gap-1 cursor-pointer"
                                                title="Descargar respaldo JSON de los repositorios seleccionados"
                                            >
                                                <Download className="h-3 w-3" />
                                                <span>Descargar .JSON</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportBackup("txt")}
                                                disabled={selectedRepoIds.size === 0}
                                                className="h-7 text-[10px] gap-1 cursor-pointer"
                                                title="Descargar lista de comandos git clone en TXT"
                                            >
                                                <FileText className="h-3 w-3" />
                                                <span>Descargar .TXT</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Zona de Peligro & Eliminación Permanente */}
                            <Card className="border-2 border-red-500/40 bg-red-500/5 dark:bg-red-950/20 shadow-sm shrink-0">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <ShieldAlert className="h-4 w-4 text-red-500" />
                                            <span>Zona de Peligro</span>
                                        </span>
                                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                            Irreversible
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-2 space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <div>
                                            <div className="text-2xl font-black text-foreground tracking-tight flex items-baseline gap-1">
                                                <span>{selectedRepoIds.size}</span>
                                                <span className="text-xs font-normal text-muted-foreground">de {repos.length}</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {selectedRepoIds.size === 1 ? "repositorio marcado" : "repositorios marcados"}
                                            </p>
                                        </div>

                                        {!hasDeleteScope && (
                                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                                Solo Lectura
                                            </Badge>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => {
                                            setConfirmationText("");
                                            setDeletionResults(null);
                                            setIsConfirmModalOpen(true);
                                        }}
                                        disabled={selectedRepoIds.size === 0 || !hasDeleteScope}
                                        className="w-full h-10 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-2 cursor-pointer shadow-md disabled:opacity-40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Eliminar {selectedRepoIds.size} Repositorios</span>
                                    </Button>

                                    <p className="text-[10px] text-muted-foreground text-center leading-tight">
                                        {hasDeleteScope
                                            ? "Se solicitará confirmación explícita con nombre de usuario antes de borrar."
                                            : "⚠️ Token sin permiso 'delete_repo'. Conecta un token con permisos para eliminar."}
                                    </p>
                                </CardContent>
                            </Card>

                        </div>

                        {/* ======================================================== */}
                        {/* COLUMNA 2 (DERECHA): CUADRÍCULA DE REPOSITORIOS          */}
                        {/* ======================================================== */}
                        <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                            
                            {/* Header del Panel de Repositorios */}
                            <div className="p-3 sm:px-4 py-2.5 border-b border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-foreground">
                                        {activeTab === "all" && "Todos los Repositorios"}
                                        {activeTab === "forks" && "Forks de Prácticas"}
                                        {activeTab === "stale" && "Inactivos (> 6 meses)"}
                                        {activeTab === "small" && "Pequeños (< 50 KB)"}
                                        {activeTab === "public" && "Repositorios Públicos"}
                                        {activeTab === "private" && "Repositorios Privados"}
                                        {activeTab === "archived" && "Repositorios Archivados"}
                                    </span>
                                    <Badge variant="secondary" className="text-[11px] font-mono py-0 px-2">
                                        {filteredRepos.length} visibles
                                    </Badge>
                                    {searchQuery && (
                                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                            filtrado por &quot;{searchQuery}&quot;
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={isAllVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
                                        className="h-7 text-[11px] gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                                    >
                                        <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                        <span>{isAllVisibleSelected ? "Deseleccionar Visibles" : "Seleccionar Visibles"}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Contenedor con Scroll de Tarjetas en 2 Columnas */}
                            <div className="flex-1 overflow-y-auto min-h-0 p-3">
                                {isLoadingRepos ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 py-16">
                                        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                                        <p className="text-xs">Cargando repositorios de tu cuenta de GitHub...</p>
                                    </div>
                                ) : filteredRepos.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 py-16 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                                            <Github className="h-6 w-6 opacity-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-foreground">No se encontraron repositorios</p>
                                            <p className="text-xs text-muted-foreground max-w-xs">
                                                No hay repositorios que coincidan con la categoría activa o el término de búsqueda.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setActiveTab("all");
                                            }}
                                            className="h-8 text-xs cursor-pointer"
                                        >
                                            Restablecer Filtros
                                        </Button>
                                    </div>
                                ) : (
                                    /* Cuadrícula en 2 Columnas Responsiva */
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {filteredRepos.map((repo) => {
                                            const isSelected = selectedRepoIds.has(repo.id);
                                            const hasStars = repo.stargazers_count > 0;

                                            return (
                                                <div
                                                    key={repo.id}
                                                    onClick={() => handleToggleRepo(repo.id)}
                                                    className={cn(
                                                        "group relative rounded-xl border p-3 transition-all cursor-pointer select-none flex flex-col justify-between gap-2",
                                                        isSelected
                                                            ? "bg-red-500/10 border-red-500/60 shadow-xs ring-1 ring-red-500/30"
                                                            : "bg-card border-border hover:border-border/90 hover:bg-muted/30"
                                                    )}
                                                >
                                                    {/* Cabecera de la Tarjeta */}
                                                    <div className="flex items-start gap-2.5">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => handleToggleRepo(repo.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-0.5 shrink-0 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                                        />

                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <a
                                                                    href={repo.html_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="font-bold text-xs sm:text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1 truncate"
                                                                    title={`Abrir ${repo.name} en GitHub`}
                                                                >
                                                                    <span className="truncate">{repo.name}</span>
                                                                    <ExternalLink className="h-3 w-3 opacity-60 shrink-0 group-hover:opacity-100" />
                                                                </a>

                                                                {/* Badges de Estado */}
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {repo.fork && (
                                                                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 py-0 px-1.5 gap-0.5">
                                                                            <GitFork className="h-2.5 w-2.5" />
                                                                            <span>Fork</span>
                                                                        </Badge>
                                                                    )}

                                                                    {repo.private ? (
                                                                        <Badge variant="outline" className="text-[10px] bg-muted py-0 px-1.5 gap-0.5">
                                                                            <Lock className="h-2.5 w-2.5" />
                                                                            <span>Privado</span>
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 py-0 px-1.5 gap-0.5">
                                                                            <Globe className="h-2.5 w-2.5" />
                                                                            <span>Público</span>
                                                                        </Badge>
                                                                    )}

                                                                    {repo.archived && (
                                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                                                            Archivado
                                                                        </Badge>
                                                                    )}

                                                                    {hasStars && (
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 py-0 px-1.5 gap-0.5 font-semibold">
                                                                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                                            <span>{repo.stargazers_count}</span>
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Descripción */}
                                                            {repo.description ? (
                                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                    {repo.description}
                                                                </p>
                                                            ) : (
                                                                <p className="text-[11px] text-muted-foreground/60 italic">
                                                                    Sin descripción
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Pie de la Tarjeta */}
                                                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                                                        <div className="flex items-center gap-2 truncate">
                                                            {repo.language && (
                                                                <span className="flex items-center gap-1 font-medium text-foreground">
                                                                    <span className={cn("w-2 h-2 rounded-full", getLanguageColor(repo.language))} />
                                                                    <span>{repo.language}</span>
                                                                </span>
                                                            )}
                                                            <span>•</span>
                                                            <span>{repo.size > 1024 ? `${(repo.size / 1024).toFixed(1)} MB` : `${repo.size} KB`}</span>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className="hidden sm:inline">
                                                                {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true, locale: es })}
                                                            </span>
                                                        </div>

                                                        <span className={cn(
                                                            "text-[10px] font-semibold shrink-0 ml-2",
                                                            isSelected ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground group-hover:text-foreground"
                                                        )}>
                                                            {isSelected ? "✓ Seleccionado" : "Seleccionar"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Modal Crítico de Seguridad y Confirmación de Eliminación */}
            <Dialog open={isConfirmModalOpen} onOpenChange={(open) => { if (!isDeleting) setIsConfirmModalOpen(open); }}>
                <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span>¿Confirmas la eliminación permanente?</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Esta acción es <strong>completamente irreversible</strong>. Los repositorios seleccionados, su código, ramas, commits e historial serán destruidos en GitHub.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumen de Repositorios a Eliminar */}
                    <div className="my-2 space-y-3 flex-1 overflow-y-auto max-h-60 pr-1">
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-300 text-xs">
                            <p className="font-bold">
                                Estás a punto de eliminar {selectedRepos.length} {selectedRepos.length === 1 ? "repositorio" : "repositorios"}:
                            </p>
                            <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                                {selectedRepos.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-red-500/10 last:border-0">
                                        <span className="font-mono font-semibold">{r.full_name}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {r.private ? "Privado" : "Público"} {r.fork ? "• Fork" : ""} {r.stargazers_count > 0 ? `• ${r.stargazers_count} ⭐` : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mensaje de Respaldo Recomendado */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                            <span className="text-muted-foreground">¿Deseas descargar un respaldo de los enlaces antes de borrar?</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportBackup("txt")}
                                className="h-7 text-[11px] gap-1 cursor-pointer"
                            >
                                <Download className="h-3 w-3" />
                                <span>Descargar Respaldo</span>
                            </Button>
                        </div>

                        {/* Frase de Confirmación Requerida */}
                        {!isDeleting && !deletionResults && (
                            <div className="space-y-2 pt-2 border-t border-border">
                                <label className="text-xs font-semibold text-foreground">
                                    Para confirmar, escribe tu nombre de usuario de GitHub (<strong className="text-red-600 dark:text-red-400 font-mono">{requiredConfirmation}</strong>) o <strong className="font-mono">ELIMINAR {selectedRepos.length} REPOSITORIOS</strong>:
                                </label>
                                <Input
                                    placeholder={requiredConfirmation}
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    className="text-xs font-mono h-9"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Progreso en Tiempo Real */}
                        {isDeleting && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-xl text-xs">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                        <span>Eliminando repositorios en GitHub...</span>
                                    </span>
                                    <span>{deletionProgress.current} / {deletionProgress.total}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">
                                    {deletionProgress.repoName}
                                </p>
                            </div>
                        )}

                        {/* Resultados de la Eliminación */}
                        {deletionResults && (
                            <div className="space-y-2 p-3 bg-background border rounded-xl text-xs">
                                <p className="font-bold text-foreground">Resultados de la operación:</p>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                    {deletionResults.map((res, i) => (
                                        <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b last:border-0">
                                            <span className="font-mono truncate max-w-[280px]">{res.fullName}</span>
                                            {res.success ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px] py-0">
                                                    Eliminado
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-[10px] py-0" title={res.error}>
                                                    Error ({res.status})
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        {!deletionResults ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    disabled={isDeleting}
                                    className="cursor-pointer"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleExecuteDeletion}
                                    disabled={!isConfirmationValid || isDeleting}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer gap-2 disabled:opacity-40"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Eliminando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" />
                                            <span>Destruir Repositorios Seleccionados</span>
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setDeletionResults(null);
                                }}
                                className="w-full cursor-pointer font-bold"
                            >
                                Entendido y Cerrar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
