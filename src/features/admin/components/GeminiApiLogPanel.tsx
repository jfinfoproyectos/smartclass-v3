"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGeminiApiLogsAction } from "@/app/admin-actions";
import { format } from "date-fns";
import {
    Activity,
    Filter,
    RefreshCw,
    Bot
} from "lucide-react";

export function GeminiApiLogPanel() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalRequests, setTotalRequests] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [page, setPage] = useState(0);
    const limit = 50;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const result = await getGeminiApiLogsAction({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                limit,
                offset: page * limit,
            });
            setLogs(result.logs);
            setTotal(result.total);
            setTotalRequests(result.totalRequests);
        } catch (error) {
            console.error("Error fetching Gemini API logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const handleFilter = () => {
        setPage(0);
        fetchLogs();
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
        setPage(0);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eventos de Uso de IA</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loading ? "..." : total.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Evaluaciones realizadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Peticiones a la API Gemini</CardTitle>
                        <Bot className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {loading ? "..." : totalRequests.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Consumo de la Key Global
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Fecha
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

                        <div className="flex items-end gap-2">
                            <Button onClick={handleFilter} className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Aplicar
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Consumo API</CardTitle>
                    <CardDescription>
                        Mostrando {logs.length} de {total.toLocaleString()} eventos ({totalRequests} peticiones en total)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Cargando registros...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No hay registros de uso de la API Gemini con la configuración global
                        </div>
                    ) : (
                        <>
                            <div className="w-full overflow-x-auto rounded-md border">
                                <Table className="min-w-[800px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Fecha/Hora</TableHead>
                                            <TableHead>Usuario/Alumno</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Peticiones Consumidas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => {
                                            let requestsCount = 0;
                                            try {
                                                const meta = JSON.parse(log.metadata || "{}");
                                                requestsCount = meta.requestsCount || 0;
                                            } catch (e) { }

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-sm">
                                                        <div>{format(new Date(log.createdAt), 'dd/MM/yyyy')}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">{log.userName || '-'}</div>
                                                        {log.userRole && (
                                                            <div className="text-xs text-muted-foreground capitalize">
                                                                {log.userRole}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-md">
                                                        <div className="text-sm" title={log.description}>
                                                            {log.description}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {requestsCount}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
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
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
