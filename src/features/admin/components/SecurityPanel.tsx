"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Ban,
    CheckCircle2,
    Clock,
    Flame,
    Globe,
    Lock,
    RefreshCw,
    Search,
    Sliders,
    Trash2,
    UserCheck,
    Plus,
    Activity,
    FileSpreadsheet,
    Zap,
    Radio,
    Terminal,
    Eye,
    Info,
    Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import { exportToExcel } from "@/lib/export-utils";

import {
    blockIpAction,
    unblockIpAction,
    addWhitelistedIpAction,
    removeWhitelistedIpAction,
    getSecurityAttackLogsAction,
    clearExpiredBlockedIpsAction,
    clearAllSecurityLogsAction,
    updateSecurityPolicyAction,
    simulateAttackAction,
    getSecurityOverviewAction,
    getBlockedIpsAction,
    getWhitelistedIpsAction,
} from "../actions/securityActions";
import { AttackType, SecuritySeverity } from "../services/ipSecurityService";

interface SecurityPanelProps {
    initialOverview: any;
    initialBlockedIps: any[];
    initialWhitelistedIps: any[];
    initialAttackLogs: { logs: any[]; total: number; page: number; totalPages: number };
    currentAdminIp: string;
}

const ATTACK_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
    BRUTE_FORCE: { label: "Fuerza Bruta (Login)", badge: "border-amber-500/30 text-amber-500 bg-amber-500/10" },
    RATE_LIMIT_EXCEEDED: { label: "Exceso de Peticiones (DDoS)", badge: "border-orange-500/30 text-orange-500 bg-orange-500/10" },
    MALICIOUS_SCANNER: { label: "Escaneo Sospechoso (.env / web)", badge: "border-rose-500/30 text-rose-500 bg-rose-500/10" },
    SQL_INJECTION_PROBE: { label: "Intento Inyección SQL", badge: "border-red-600/40 text-red-500 bg-red-600/15" },
    PATH_TRAVERSAL: { label: "Path Traversal (Archivos)", badge: "border-purple-500/30 text-purple-500 bg-purple-500/10" },
    ADMIN_UNAUTHORIZED: { label: "Acceso No Autorizado Admin", badge: "border-blue-500/30 text-blue-500 bg-blue-500/10" },
    BLOCKED_IP_ATTEMPT: { label: "Reincidencia IP Bloqueada", badge: "border-red-500/30 text-red-400 bg-red-500/10" },
    MANUAL_BLOCK: { label: "Bloqueo Administrativo", badge: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10" },
};

const SEVERITY_BADGES: Record<string, { label: string; class: string }> = {
    CRITICAL: { label: "Crítica", class: "bg-red-500/15 text-red-500 border-red-500/30 animate-pulse" },
    HIGH: { label: "Alta", class: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
    MEDIUM: { label: "Media", class: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    LOW: { label: "Baja", class: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
};

export function SecurityPanel({
    initialOverview,
    initialBlockedIps,
    initialWhitelistedIps,
    initialAttackLogs,
    currentAdminIp,
}: SecurityPanelProps) {
    const [isPending, startTransition] = useTransition();

    // Estado principal
    const [overview, setOverview] = useState(initialOverview);
    const [blockedIps, setBlockedIps] = useState(initialBlockedIps);
    const [whitelistedIps, setWhitelistedIps] = useState(initialWhitelistedIps);
    const [attackLogsData, setAttackLogsData] = useState(initialAttackLogs);

    // Filtros de búsqueda
    const [blockedSearch, setBlockedSearch] = useState("");
    const [whitelistSearch, setWhitelistSearch] = useState("");
    const [logSearchIp, setLogSearchIp] = useState("");
    const [logFilterType, setLogFilterType] = useState("ALL");
    const [logFilterSeverity, setLogFilterSeverity] = useState("ALL");

    // Diálogos modales
    const [blockModalOpen, setBlockModalOpen] = useState(false);
    const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);

    // Formulario de Bloqueo Manual
    const [newBlockIp, setNewBlockIp] = useState("");
    const [newBlockReason, setNewBlockReason] = useState("");
    const [newBlockSeverity, setNewBlockSeverity] = useState<SecuritySeverity>("HIGH");
    const [newBlockDuration, setNewBlockDuration] = useState("24"); // horas o '0' para permanente

    // Formulario de Whitelist
    const [newWhiteIp, setNewWhiteIp] = useState("");
    const [newWhiteDescription, setNewWhiteDescription] = useState("");

    // Configuración del Firewall
    const [policyForm, setPolicyForm] = useState(overview.policy || {
        enabled: true,
        rateLimitMaxRequests: 100,
        rateLimitWindowSeconds: 60,
        authMaxAttempts: 5,
        autoBanDurationMinutes: 60,
        strictAdminWhitelist: false,
        blockMaliciousScanners: true,
    });

    // Refrescar todos los datos
    const refreshAll = () => {
        startTransition(async () => {
            try {
                const [newOv, newBlocked, newWhite, newLogs] = await Promise.all([
                    getSecurityOverviewAction(),
                    getBlockedIpsAction(),
                    getWhitelistedIpsAction(),
                    getSecurityAttackLogsAction({
                        page: 1,
                        limit: 25,
                        attackType: logFilterType,
                        severity: logFilterSeverity,
                        searchIp: logSearchIp,
                    }),
                ]);
                setOverview(newOv);
                setBlockedIps(newBlocked);
                setWhitelistedIps(newWhite);
                setAttackLogsData(newLogs);
                if (newOv.policy) setPolicyForm(newOv.policy);
                toast.success("Panel de seguridad actualizado");
            } catch (err: any) {
                toast.error("Error al refrescar datos: " + err.message);
            }
        });
    };

    // Manejar bloqueo manual de IP
    const handleManualBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBlockIp.trim()) {
            toast.error("Ingresa una dirección IP válida");
            return;
        }

        const isPerm = newBlockDuration === "0";
        const durationHours = parseInt(newBlockDuration, 10) || 24;

        startTransition(async () => {
            try {
                await blockIpAction({
                    ip: newBlockIp.trim(),
                    reason: newBlockReason.trim() || "Bloqueado manualmente por el Administrador",
                    severity: newBlockSeverity,
                    durationHours,
                    isPermanent: isPerm,
                });
                toast.success(`IP ${newBlockIp} bloqueada correctamente`);
                setBlockModalOpen(false);
                setNewBlockIp("");
                setNewBlockReason("");
                // Refrescar listas
                const [bList, ov] = await Promise.all([getBlockedIpsAction(), getSecurityOverviewAction()]);
                setBlockedIps(bList);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al bloquear IP: " + err.message);
            }
        });
    };

    // Manejar desbloqueo de IP
    const handleUnblock = (ip: string) => {
        startTransition(async () => {
            try {
                await unblockIpAction(ip);
                toast.success(`IP ${ip} desbloqueada`);
                const [bList, ov] = await Promise.all([getBlockedIpsAction(), getSecurityOverviewAction()]);
                setBlockedIps(bList);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al desbloquear: " + err.message);
            }
        });
    };

    // Manejar adición a Whitelist
    const handleAddWhitelist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWhiteIp.trim()) {
            toast.error("Ingresa una IP válida");
            return;
        }

        startTransition(async () => {
            try {
                await addWhitelistedIpAction(newWhiteIp.trim(), newWhiteDescription.trim() || undefined);
                toast.success(`IP ${newWhiteIp} añadida a la lista blanca`);
                setWhitelistModalOpen(false);
                setNewWhiteIp("");
                setNewWhiteDescription("");
                const [wList, bList, ov] = await Promise.all([
                    getWhitelistedIpsAction(),
                    getBlockedIpsAction(),
                    getSecurityOverviewAction(),
                ]);
                setWhitelistedIps(wList);
                setBlockedIps(bList);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al añadir IP: " + err.message);
            }
        });
    };

    // Manejar eliminación de Whitelist
    const handleRemoveWhitelist = (ip: string) => {
        startTransition(async () => {
            try {
                await removeWhitelistedIpAction(ip);
                toast.success(`IP ${ip} removida de la lista blanca`);
                const [wList, ov] = await Promise.all([getWhitelistedIpsAction(), getSecurityOverviewAction()]);
                setWhitelistedIps(wList);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al remover IP: " + err.message);
            }
        });
    };

    // Purgar IPs expiradas
    const handleClearExpired = () => {
        startTransition(async () => {
            try {
                const res = await clearExpiredBlockedIpsAction();
                toast.success(`Se purgaron ${res.purgedCount} bloqueos expirados`);
                const [bList, ov] = await Promise.all([getBlockedIpsAction(), getSecurityOverviewAction()]);
                setBlockedIps(bList);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al purgar expirados: " + err.message);
            }
        });
    };

    // Limpiar logs de ataques
    const handleClearLogs = () => {
        if (!confirm("¿Estás seguro de que deseas vaciar todos los registros forenses de ataques?")) return;
        startTransition(async () => {
            try {
                await clearAllSecurityLogsAction();
                toast.success("Registros forenses de ataques vaciados");
                const [logs, ov] = await Promise.all([
                    getSecurityAttackLogsAction({ page: 1, limit: 25 }),
                    getSecurityOverviewAction(),
                ]);
                setAttackLogsData(logs);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al limpiar registros: " + err.message);
            }
        });
    };

    // Guardar política de firewall
    const handleSavePolicy = () => {
        startTransition(async () => {
            try {
                await updateSecurityPolicyAction(policyForm);
                toast.success("Políticas del Firewall actualizadas con éxito");
                const ov = await getSecurityOverviewAction();
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error al guardar políticas: " + err.message);
            }
        });
    };

    // Simular un ataque para verificación
    const handleSimulateAttack = (type: AttackType) => {
        startTransition(async () => {
            try {
                const dummyIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
                await simulateAttackAction(type, dummyIp);
                toast.info(`Simulación de ataque (${type}) enviada desde IP de prueba ${dummyIp}`);
                const [logs, ov] = await Promise.all([
                    getSecurityAttackLogsAction({ page: 1, limit: 25 }),
                    getSecurityOverviewAction(),
                ]);
                setAttackLogsData(logs);
                setOverview(ov);
            } catch (err: any) {
                toast.error("Error en la simulación: " + err.message);
            }
        });
    };

    // Exportar logs a Excel
    const handleExportExcel = async () => {
        try {
            const dataToExport = attackLogsData.logs.map((log: any, idx: number) => ({
                "#": idx + 1,
                "IP Atacante": log.ip,
                "Tipo de Amenaza": ATTACK_TYPE_LABELS[log.attackType]?.label || log.attackType,
                "Severidad": log.severity,
                "Ruta Solicitada": log.endpoint,
                "Método": log.method,
                "Detalles / Payload": log.payload || "-",
                "Resultado": log.blocked ? "BLOQUEADO" : "REGISTRADO",
                "Fecha": format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss"),
            }));

            await exportToExcel(
                dataToExport,
                `Reporte_Ataques_Firewall_SmartClass_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
                "Ataques Interceptados"
            );
            toast.success("Reporte de seguridad exportado a Excel");
        } catch (e: any) {
            toast.error("Error al exportar: " + e.message);
        }
    };

    // Filtrar listas en frontend
    const filteredBlocked = blockedIps.filter((b: any) =>
        b.ip.toLowerCase().includes(blockedSearch.toLowerCase()) ||
        b.reason.toLowerCase().includes(blockedSearch.toLowerCase())
    );

    const filteredWhitelist = whitelistedIps.filter((w: any) =>
        w.ip.toLowerCase().includes(whitelistSearch.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(whitelistSearch.toLowerCase()))
    );

    const isCurrentAdminWhitelisted = whitelistedIps.some((w: any) => w.ip === currentAdminIp);

    return (
        <DashboardContainer>
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent blur-3xl opacity-60" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 backdrop-blur-md">
                            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                            <span>Defensa Perimetral & Anti-DDoS</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                            Seguridad de Red & Firewall de IPs
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                            Monitoreo en tiempo real de ataques, mitigación de fuerza bruta, rate limiting adaptativo y control de listas de acceso para proteger el sistema institucional.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={isPending || attackLogsData.logs.length === 0}
                            className="text-xs rounded-xl gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Exportar Excel</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshAll}
                            disabled={isPending}
                            className="text-xs rounded-xl gap-1.5 hover:bg-muted font-medium"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                            <span>Actualizar</span>
                        </Button>

                        {/* Diálogo de Bloqueo Manual */}
                        <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-lg shadow-red-500/20 border-none"
                                >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span>Bloquear IP</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[480px] rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-red-500 font-bold">
                                        <Ban className="h-5 w-5" />
                                        Bloquear Dirección IP Manualmente
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        La IP será inmediatamente restringida en la capa de red del firewall.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleManualBlock} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="blockIp" className="text-xs font-semibold">Dirección IP o Rango</Label>
                                        <Input
                                            id="blockIp"
                                            placeholder="Ej: 198.51.100.25"
                                            value={newBlockIp}
                                            onChange={(e) => setNewBlockIp(e.target.value)}
                                            required
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="blockReason" className="text-xs font-semibold">Motivo del Bloqueo</Label>
                                        <Input
                                            id="blockReason"
                                            placeholder="Ej: Intentos reiterados de explotación SQLi / DDoS"
                                            value={newBlockReason}
                                            onChange={(e) => setNewBlockReason(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold">Nivel de Severidad</Label>
                                            <Select value={newBlockSeverity} onValueChange={(v: any) => setNewBlockSeverity(v)}>
                                                <SelectTrigger className="text-xs">
                                                    <SelectValue placeholder="Severidad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LOW">Baja (Monitoreo)</SelectItem>
                                                    <SelectItem value="MEDIUM">Media</SelectItem>
                                                    <SelectItem value="HIGH">Alta (Recomendado)</SelectItem>
                                                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold">Duración del Baneo</Label>
                                            <Select value={newBlockDuration} onValueChange={setNewBlockDuration}>
                                                <SelectTrigger className="text-xs">
                                                    <SelectValue placeholder="Duración" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1 Hora</SelectItem>
                                                    <SelectItem value="6">6 Horas</SelectItem>
                                                    <SelectItem value="24">24 Horas (1 Día)</SelectItem>
                                                    <SelectItem value="168">7 Días</SelectItem>
                                                    <SelectItem value="0">Permanente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter className="pt-3">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setBlockModalOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" size="sm" disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                                            Confirmar Bloqueo
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Banner de IP Actual del Administrador */}
                <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Tu dirección IP detectada:</span>
                        <code className="px-2 py-0.5 rounded-md bg-muted font-mono font-bold text-foreground">
                            {currentAdminIp}
                        </code>
                        {isCurrentAdminWhitelisted ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
                                <Check className="w-3 h-3" /> En Lista Blanca
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
                                No registrada en Whitelist
                            </Badge>
                        )}
                    </div>

                    {!isCurrentAdminWhitelisted && (
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                                setNewWhiteIp(currentAdminIp);
                                setNewWhiteDescription("Mi dispositivo administrador actual");
                                setWhitelistModalOpen(true);
                            }}
                            className="text-xs h-7 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir mi IP a la Lista Blanca</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <AICanvasCard
                    title="IPs Bloqueadas Activas"
                    description={`${overview.stats.totalBlocked} registradas en total`}
                    icon={Ban}
                    badge="Blacklist"
                    badgeColor="bg-red-500/10 text-red-500 border-red-500/20"
                    accentColor="from-red-500/30 via-red-500/15 to-transparent"
                    iconBgColor="bg-red-500/10"
                    iconTextColor="text-red-500"
                    compact={true}
                >
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        {overview.stats.activeBlockedCount}
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Ataques en 24 Horas"
                    description="Intentos neutralizados hoy"
                    icon={Flame}
                    badge="Tiempo Real"
                    badgeColor="bg-orange-500/10 text-orange-500 border-orange-500/20"
                    accentColor="from-orange-500/30 via-orange-500/15 to-transparent"
                    iconBgColor="bg-orange-500/10"
                    iconTextColor="text-orange-500"
                    compact={true}
                >
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        {overview.stats.attacksLast24h}
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Ataques Acumulados"
                    description="Eventos registrados en auditoría"
                    icon={Activity}
                    badge="Forense"
                    badgeColor="bg-blue-500/10 text-blue-500 border-blue-500/20"
                    accentColor="from-blue-500/30 via-blue-500/15 to-transparent"
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-500"
                    compact={true}
                >
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        {overview.stats.totalAttacks}
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="IPs en Lista Blanca"
                    description="Dispositivos exentos de límites"
                    icon={ShieldCheck}
                    badge="Whitelist"
                    badgeColor="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    accentColor="from-emerald-500/30 via-emerald-500/15 to-transparent"
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-500"
                    compact={true}
                >
                    <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        {overview.stats.whitelistedCount}
                    </div>
                </AICanvasCard>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="blacklist" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/60">
                        <TabsTrigger value="blacklist" className="rounded-xl text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Ban className="w-3.5 h-3.5 text-red-500" />
                            <span>IPs Bloqueadas ({overview.stats.activeBlockedCount})</span>
                        </TabsTrigger>
                        <TabsTrigger value="whitelist" className="rounded-xl text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Lista Blanca ({overview.stats.whitelistedCount})</span>
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-xl text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Terminal className="w-3.5 h-3.5 text-blue-500" />
                            <span>Registro Forense de Ataques ({attackLogsData.total})</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-xl text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Sliders className="w-3.5 h-3.5 text-amber-500" />
                            <span>Reglas del Firewall</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Botón de Pruebas / Simulación */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSimulateAttack("BRUTE_FORCE")}
                            disabled={isPending}
                            className="text-xs h-8 gap-1.5 border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Probar Detección (Simular)</span>
                        </Button>
                    </div>
                </div>

                {/* TAB 1: LISTA NEGRA (IPs BLOQUEADAS) */}
                <TabsContent value="blacklist" className="space-y-4">
                    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Ban className="h-4 w-4 text-red-500" />
                                        Lista de IPs Bloqueadas (Blacklist)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Direcciones bloqueadas automáticamente por el firewall o añadidas manualmente.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar IP o motivo..."
                                            value={blockedSearch}
                                            onChange={(e) => setBlockedSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs rounded-xl"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearExpired}
                                        disabled={isPending}
                                        className="h-8 text-xs rounded-xl shrink-0"
                                        title="Eliminar bloqueos que ya superaron su tiempo"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Limpiar Expirados
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead className="font-bold">Dirección IP</TableHead>
                                            <TableHead className="font-bold">Motivo del Bloqueo</TableHead>
                                            <TableHead className="font-bold">Severidad</TableHead>
                                            <TableHead className="font-bold text-center">Infracciones</TableHead>
                                            <TableHead className="font-bold">Tipo de Baneo</TableHead>
                                            <TableHead className="font-bold">Bloqueado Por</TableHead>
                                            <TableHead className="font-bold text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBlocked.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                                    No hay direcciones IP bloqueadas activamente.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBlocked.map((item: any) => {
                                                const isExpired = item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now();
                                                const severityBadge = SEVERITY_BADGES[item.severity] || SEVERITY_BADGES.HIGH;

                                                return (
                                                    <TableRow key={item.id} className="text-xs hover:bg-muted/40">
                                                        <TableCell className="font-mono font-bold text-foreground">
                                                            {item.ip}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-muted-foreground" title={item.reason}>
                                                            {item.reason}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[10px] font-bold ${severityBadge.class}`}>
                                                                {severityBadge.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center font-semibold">
                                                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-mono text-[11px]">
                                                                {item.attackCount}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.isPermanent ? (
                                                                <Badge variant="secondary" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">
                                                                    Permanente
                                                                </Badge>
                                                            ) : isExpired ? (
                                                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                                                                    Expirado
                                                                </Badge>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                    <Clock className="w-3 h-3 text-amber-500" />
                                                                    <span>Expira {formatDistanceToNow(new Date(item.expiresAt), { addSuffix: true, locale: es })}</span>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-[11px]">
                                                            {item.blockedBy}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleUnblock(item.ip)}
                                                                disabled={isPending}
                                                                className="h-7 text-[11px] rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                                                            >
                                                                Desbloquear
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: LISTA BLANCA (WHITELIST) */}
                <TabsContent value="whitelist" className="space-y-4">
                    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                        Lista Blanca de IPs Confiables (Whitelist)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Las IPs en esta lista tienen inmunidad: nunca serán bloqueadas ni limitadas por el rate limiter.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar en lista blanca..."
                                            value={whitelistSearch}
                                            onChange={(e) => setWhitelistSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs rounded-xl"
                                        />
                                    </div>

                                    {/* Modal Añadir Whitelist */}
                                    <Dialog open={whitelistModalOpen} onOpenChange={setWhitelistModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 h-8"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>Añadir IP Confiable</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[450px] rounded-2xl">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-emerald-500 font-bold">
                                                    <ShieldCheck className="h-5 w-5" />
                                                    Añadir IP a la Lista Blanca
                                                </DialogTitle>
                                                <DialogDescription className="text-xs">
                                                    Esta dirección quedará autorizada y exenta de restricciones.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handleAddWhitelist} className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor="whiteIp" className="text-xs font-semibold">Dirección IP</Label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setNewWhiteIp(currentAdminIp)}
                                                            className="text-[11px] text-primary hover:underline font-medium"
                                                        >
                                                            Usar mi IP actual ({currentAdminIp})
                                                        </button>
                                                    </div>
                                                    <Input
                                                        id="whiteIp"
                                                        placeholder="Ej: 190.158.20.12"
                                                        value={newWhiteIp}
                                                        onChange={(e) => setNewWhiteIp(e.target.value)}
                                                        required
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="whiteDesc" className="text-xs font-semibold">Descripción o Etiqueta</Label>
                                                    <Input
                                                        id="whiteDesc"
                                                        placeholder="Ej: Red institucional, VPN de Rectoría, IP de Jhon"
                                                        value={newWhiteDescription}
                                                        onChange={(e) => setNewWhiteDescription(e.target.value)}
                                                    />
                                                </div>
                                                <DialogFooter className="pt-3">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setWhitelistModalOpen(false)}>
                                                        Cancelar
                                                    </Button>
                                                    <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                                        Guardar en Lista Blanca
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead className="font-bold">Dirección IP</TableHead>
                                            <TableHead className="font-bold">Descripción / Etiqueta</TableHead>
                                            <TableHead className="font-bold">Agregado Por</TableHead>
                                            <TableHead className="font-bold">Fecha de Registro</TableHead>
                                            <TableHead className="font-bold text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredWhitelist.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                                                    <Info className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-80" />
                                                    No hay direcciones IP en la lista blanca todavía.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredWhitelist.map((item: any) => (
                                                <TableRow key={item.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-mono font-bold text-foreground flex items-center gap-2">
                                                        {item.ip}
                                                        {item.ip === currentAdminIp && (
                                                            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">
                                                                Tu IP Actual
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {item.description || "IP Confiable Autorizada"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-[11px]">
                                                        {item.addedBy || "Administrador"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-[11px]">
                                                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveWhitelist(item.ip)}
                                                            disabled={isPending}
                                                            className="h-7 text-[11px] rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-medium"
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: REGISTROS FORENSES DE ATAQUES */}
                <TabsContent value="logs" className="space-y-4">
                    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-blue-500" />
                                        Registro Forense de Amenazas & Ataques Detectados
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Historial pormenorizado de sondas, ataques de fuerza bruta y violaciones de tasa de solicitudes.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-36 sm:w-44">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Filtrar por IP..."
                                            value={logSearchIp}
                                            onChange={(e) => setLogSearchIp(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") refreshAll();
                                            }}
                                            className="h-8 pl-8 text-xs rounded-xl"
                                        />
                                    </div>
                                    <Select
                                        value={logFilterType}
                                        onValueChange={(v) => {
                                            setLogFilterType(v);
                                            startTransition(async () => {
                                                const res = await getSecurityAttackLogsAction({
                                                    page: 1,
                                                    limit: 25,
                                                    attackType: v,
                                                    severity: logFilterSeverity,
                                                    searchIp: logSearchIp,
                                                });
                                                setAttackLogsData(res);
                                            });
                                        }}
                                    >
                                        <SelectTrigger className="h-8 text-xs w-36 rounded-xl">
                                            <SelectValue placeholder="Tipo de Ataque" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Todos los Tipos</SelectItem>
                                            <SelectItem value="BRUTE_FORCE">Fuerza Bruta</SelectItem>
                                            <SelectItem value="RATE_LIMIT_EXCEEDED">Rate Limit (DDoS)</SelectItem>
                                            <SelectItem value="MALICIOUS_SCANNER">Escaneo Sospechoso</SelectItem>
                                            <SelectItem value="SQL_INJECTION_PROBE">Inyección SQL</SelectItem>
                                            <SelectItem value="ADMIN_UNAUTHORIZED">No Autorizado Admin</SelectItem>
                                            <SelectItem value="BLOCKED_IP_ATTEMPT">Reincidencia IP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearLogs}
                                        disabled={isPending || attackLogsData.logs.length === 0}
                                        className="h-8 text-xs rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                        Vaciar Logs
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead className="font-bold">Fecha / Hora</TableHead>
                                            <TableHead className="font-bold">IP de Origen</TableHead>
                                            <TableHead className="font-bold">Tipo de Ataque</TableHead>
                                            <TableHead className="font-bold">Severidad</TableHead>
                                            <TableHead className="font-bold">Endpoint & Método</TableHead>
                                            <TableHead className="font-bold">Detalle Forense</TableHead>
                                            <TableHead className="font-bold text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attackLogsData.logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                                                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                                    No se han registrado eventos o ataques con los filtros seleccionados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            attackLogsData.logs.map((log: any) => {
                                                const typeInfo = ATTACK_TYPE_LABELS[log.attackType] || { label: log.attackType, badge: "border-slate-500/30 text-slate-400" };
                                                const severityBadge = SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.HIGH;
                                                const isAlreadyBlocked = blockedIps.some((b: any) => b.ip === log.ip);

                                                return (
                                                    <TableRow key={log.id} className="text-xs hover:bg-muted/40">
                                                        <TableCell className="font-mono text-muted-foreground text-[11px] shrink-0">
                                                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                                                        </TableCell>
                                                        <TableCell className="font-mono font-bold text-foreground">
                                                            {log.ip}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[10px] font-semibold ${typeInfo.badge}`}>
                                                                {typeInfo.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[10px] font-bold ${severityBadge.class}`}>
                                                                {severityBadge.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                                                            <span className="font-bold text-foreground">{log.method}</span> {log.endpoint}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-[11px] text-muted-foreground" title={log.payload || "-"}>
                                                            {log.payload || "-"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isAlreadyBlocked ? (
                                                                <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-500 border-none">
                                                                    Bloqueada
                                                                </Badge>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setNewBlockIp(log.ip);
                                                                        setNewBlockReason(`Detectado en log: ${typeInfo.label}`);
                                                                        setNewBlockSeverity(log.severity || "HIGH");
                                                                        setBlockModalOpen(true);
                                                                    }}
                                                                    disabled={isPending}
                                                                    className="h-6 text-[10px] rounded-lg border-red-500/30 text-red-500 hover:bg-red-500/10"
                                                                >
                                                                    <Ban className="w-3 h-3 mr-1" />
                                                                    Bloquear IP
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: REGLAS DEL FIREWALL */}
                <TabsContent value="settings" className="space-y-4">
                    <Card className="rounded-2xl border border-border bg-card shadow-sm">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Sliders className="h-4 w-4 text-amber-500" />
                                Configuración de Reglas y Políticas del Firewall
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Ajusta los umbrales de detección automática, tiempos de baneo y restricciones de acceso.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Switches de Control Global */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold flex items-center gap-1.5">
                                            <Shield className="w-4 h-4 text-emerald-500" />
                                            Activar Firewall Global de IPs
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Inspecciona todas las solicitudes entrantes y aplica rate limiting y bloqueo de IPs.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={policyForm.enabled}
                                        onCheckedChange={(checked) => setPolicyForm({ ...policyForm, enabled: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold flex items-center gap-1.5">
                                            <Flame className="w-4 h-4 text-red-500" />
                                            Bloqueo Automático de Escáneres
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Banea instantáneamente IPs que sondeen rutas críticas (.env, /wp-admin, SQLi).
                                        </p>
                                    </div>
                                    <Switch
                                        checked={policyForm.blockMaliciousScanners}
                                        onCheckedChange={(checked) => setPolicyForm({ ...policyForm, blockMaliciousScanners: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/20 md:col-span-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold flex items-center gap-1.5 text-amber-500">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            Restricción Estricta del Panel de Administrador (Solo Whitelist)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Al activarse, únicamente las IPs registradas en la Lista Blanca podrán acceder a las rutas de administración. (¡Asegúrate de haber añadido tu IP!).
                                        </p>
                                    </div>
                                    <Switch
                                        checked={policyForm.strictAdminWhitelist}
                                        onCheckedChange={(checked) => setPolicyForm({ ...policyForm, strictAdminWhitelist: checked })}
                                    />
                                </div>
                            </div>

                            {/* Umbrales y Tiempos */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                                <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
                                    <Label className="text-xs font-semibold">Límite de Peticiones (Rate Limit)</Label>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={1000}
                                        value={policyForm.rateLimitMaxRequests}
                                        onChange={(e) => setPolicyForm({ ...policyForm, rateLimitMaxRequests: parseInt(e.target.value, 10) || 100 })}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Máximo de solicitudes permitidas por IP</span>
                                </div>

                                <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
                                    <Label className="text-xs font-semibold">Ventana de Rate Limit (Segundos)</Label>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={300}
                                        value={policyForm.rateLimitWindowSeconds}
                                        onChange={(e) => setPolicyForm({ ...policyForm, rateLimitWindowSeconds: parseInt(e.target.value, 10) || 60 })}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Periodo de conteo por ventana</span>
                                </div>

                                <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
                                    <Label className="text-xs font-semibold">Intentos de Login Fallidos Máximos</Label>
                                    <Input
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={policyForm.authMaxAttempts}
                                        onChange={(e) => setPolicyForm({ ...policyForm, authMaxAttempts: parseInt(e.target.value, 10) || 5 })}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Fuerza bruta: baneo tras N fallos</span>
                                </div>

                                <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
                                    <Label className="text-xs font-semibold">Duración del Autobloqueo (Minutos)</Label>
                                    <Input
                                        type="number"
                                        min={5}
                                        max={1440}
                                        value={policyForm.autoBanDurationMinutes}
                                        onChange={(e) => setPolicyForm({ ...policyForm, autoBanDurationMinutes: parseInt(e.target.value, 10) || 60 })}
                                        className="h-8 text-xs font-mono"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Tiempo de penalidad para la IP atacante</span>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border/60">
                                <Button
                                    onClick={handleSavePolicy}
                                    disabled={isPending}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md"
                                >
                                    Guardar Cambios de Configuración
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardContainer>
    );
}
