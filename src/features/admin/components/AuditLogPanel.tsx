"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAuditLogsAction, getAuditStatsAction, clearAuditLogsAction } from "@/app/admin-actions";
import { format } from "date-fns";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Filter,
    RefreshCw,
    Download,
    TrendingUp,
    TrendingDown,

    BarChart3,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ExportButton } from "@/components/ui/export-button";
import { formatDateForExport } from "@/lib/export-utils";

const ACTION_LABELS: Record<string, string> = {
    CREATE: "Crear",
    UPDATE: "Actualizar",
    DELETE: "Eliminar",
    LOGIN: "Iniciar Sesión",
    LOGOUT: "Cerrar Sesión",
    EXPORT: "Exportar",
    GRADE: "Calificar",
    SUBMIT: "Entregar",
    ENROLL: "Inscribir",
    UNENROLL: "Desinscribir",
    ATTENDANCE_MARK: "Marcar Asistencia",
    REMARK_CREATE: "Crear Observación",
    NOTIFICATION_SEND: "Enviar Notificación",
    OTHER: "Otro",
};

const ENTITY_LABELS: Record<string, string> = {
    USER: "Usuario",
    COURSE: "Curso",
    ACTIVITY: "Actividad",
    SUBMISSION: "Entrega",
    ENROLLMENT: "Inscripción",
    ATTENDANCE: "Asistencia",
    REMARK: "Observación",
    NOTIFICATION: "Notificación",
    SYSTEM: "Sistema",
    OTHER: "Otro",
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800 border-green-200",
    UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
    DELETE: "bg-red-100 text-red-800 border-red-200",
    LOGIN: "bg-purple-100 text-purple-800 border-purple-200",
    LOGOUT: "bg-gray-100 text-gray-800 border-gray-200",
    EXPORT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    GRADE: "bg-indigo-100 text-indigo-800 border-indigo-200",
    SUBMIT: "bg-cyan-100 text-cyan-800 border-cyan-200",
    ENROLL: "bg-teal-100 text-teal-800 border-teal-200",
    UNENROLL: "bg-orange-100 text-orange-800 border-orange-200",
    ATTENDANCE_MARK: "bg-pink-100 text-pink-800 border-pink-200",
    REMARK_CREATE: "bg-violet-100 text-violet-800 border-violet-200",
    NOTIFICATION_SEND: "bg-amber-100 text-amber-800 border-amber-200",
    OTHER: "bg-slate-100 text-slate-800 border-slate-200",
};

export function AuditLogPanel() {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Filters
    const [action, setAction] = useState<string>("ALL");
    const [entity, setEntity] = useState<string>("ALL");
    const [userId, setUserId] = useState<string>("");
    const [success, setSuccess] = useState<string>("ALL");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [page, setPage] = useState(0);
    const limit = 50;

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isPending, startTransition] = useTransition();

    const canDelete = deleteConfirmation === "ELIMINAR LOGS";

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const result = await getAuditLogsAction({
                action: action !== "ALL" ? action : undefined,
                entity: entity !== "ALL" ? entity : undefined,
                userId: userId || undefined,
                success: success === "true" ? true : success === "false" ? false : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                limit,
                offset: page * limit,
            });
            setLogs(result.logs);
            setTotal(result.total);
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const result = await getAuditStatsAction(
                startDate || undefined,
                endDate || undefined
            );
            setStats(result);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [page]);

    const handleFilter = () => {
        setPage(0);
        fetchLogs();
        fetchStats();
    };

    const handleReset = () => {
        setAction("ALL");
        setEntity("ALL");
        setUserId("");
        setSuccess("ALL");
        setStartDate("");
        setEndDate("");
        setPage(0);
        setPage(0);
    };

    const handleClearLogs = async () => {
        startTransition(async () => {
            try {
                await clearAuditLogsAction();

                // Refresh data
                setPage(0);
                fetchLogs();
                fetchStats();

                toast.success("Historial eliminado", {
                    description: "Se han eliminado todos los registros de auditoría"
                });

                setDeleteDialogOpen(false);
                setDeleteConfirmation("");
            } catch (error) {
                toast.error("Error", {
                    description: "No se pudo eliminar el historial"
                });
            }
        });
    };

    // Prepare export data
    const exportData = logs.map(log => ({
        'Fecha': formatDateForExport(log.createdAt),
        'Hora': format(new Date(log.createdAt), 'HH:mm:ss'),
        'Acción': ACTION_LABELS[log.action] || log.action,
        'Entidad': ENTITY_LABELS[log.entity] || log.entity,
        'Usuario': log.userName || '-',
        'Rol': log.userRole || '-',
        'Descripción': log.description,
        'Estado': log.success ? 'Exitoso' : 'Fallido',
        'Error': log.errorMessage || '-',
        'IP': log.ipAddress || '-',
    }));

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? "..." : stats?.totalLogs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            En el período seleccionado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Operaciones Exitosas</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {statsLoading ? "..." : stats?.successfulLogs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {statsLoading ? "..." : `${stats?.successRate}% de éxito`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Operaciones Fallidas</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {statsLoading ? "..." : stats?.failedLogs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requieren atención
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? "..." : `${stats?.successRate}%`}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {stats && parseFloat(stats.successRate) >= 95 ? (
                                <><TrendingUp className="h-3 w-3 text-green-600" /> Excelente</>
                            ) : (
                                <><TrendingDown className="h-3 w-3 text-red-600" /> Revisar</>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Búsqueda
                    </CardTitle>
                    <CardDescription>
                        Filtra los registros de auditoría por diferentes criterios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="action">Acción</Label>
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger id="action">
                                    <SelectValue placeholder="Todas las acciones" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas</SelectItem>
                                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="entity">Entidad</Label>
                            <Select value={entity} onValueChange={setEntity}>
                                <SelectTrigger id="entity">
                                    <SelectValue placeholder="Todas las entidades" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todas</SelectItem>
                                    {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="success">Estado</Label>
                            <Select value={success} onValueChange={setSuccess}>
                                <SelectTrigger id="success">
                                    <SelectValue placeholder="Todos los estados" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="true">Exitoso</SelectItem>
                                    <SelectItem value="false">Fallido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="userId">ID de Usuario</Label>
                            <Input
                                id="userId"
                                placeholder="Filtrar por usuario..."
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startDate">Fecha Inicio</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">Fecha Fin</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleFilter} className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Aplicar Filtros
                        </Button>
                        <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Limpiar
                        </Button>
                        <div className="flex-1" />
                        <ExportButton
                            data={exportData}
                            filename={`Audit_Logs_${format(new Date(), 'yyyy-MM-dd')}`}
                            sheetName="Registros de Auditoría"
                        />
                        <Button
                            variant="destructive"
                            className="flex items-center gap-2"
                            onClick={() => {
                                setDeleteConfirmation("");
                                setDeleteDialogOpen(true);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar Historial
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Clear Logs Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Historial de Auditoría</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente <span className="font-bold">TODOS</span> los registros de auditoría del sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">
                            Para confirmar, escribe <span className="font-mono font-bold select-all">ELIMINAR LOGS</span> abajo:
                        </label>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Escribe ELIMINAR LOGS para confirmar"
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearLogs}
                            disabled={!canDelete || isPending}
                        >
                            {isPending ? "Eliminando..." : "Eliminar Todo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Registros de Auditoría</CardTitle>
                    <CardDescription>
                        Mostrando {logs.length} de {total.toLocaleString()} registros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Cargando registros...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No se encontraron registros con los filtros aplicados
                        </div>
                    ) : (
                        <>
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table className="min-w-[900px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Fecha/Hora</TableHead>
                                            <TableHead>Acción</TableHead>
                                            <TableHead>Entidad</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="w-[100px]">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">
                                                    <div>{format(new Date(log.createdAt), 'dd/MM/yyyy')}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={ACTION_COLORS[log.action] || ACTION_COLORS.OTHER}>
                                                        {ACTION_LABELS[log.action] || log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium">
                                                        {ENTITY_LABELS[log.entity] || log.entity}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm max-w-[150px]">
                                                        <div className="font-medium truncate">{log.userName || '-'}</div>
                                                        {log.userRole && (
                                                            <div className="text-xs text-muted-foreground capitalize">
                                                                {log.userRole}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-md">
                                                    <div className="text-sm truncate" title={log.description}>
                                                        {log.description}
                                                    </div>
                                                    {log.errorMessage && (
                                                        <div className="text-xs text-red-600 mt-1 truncate" title={log.errorMessage}>
                                                            Error: {log.errorMessage}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {log.success ? (
                                                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Éxito
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            <AlertCircle className="h-3 w-3 mr-1" />
                                                            Fallo
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Página {page + 1} de {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= totalPages - 1}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
