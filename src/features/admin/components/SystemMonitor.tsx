"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Database, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getSystemHealthAction } from "@/app/admin-actions";
import { formatName } from "@/lib/utils";

interface SystemHealth {
    status: 'healthy' | 'unhealthy';
    database: {
        connected: boolean;
        users?: number;
        courses?: number;
        activities?: number;
        error?: string;
    };
    timestamp: Date;
}

interface SystemMonitorProps {
    initialHealth: SystemHealth;
    recentActivity: any[];
}

export function SystemMonitor({ initialHealth, recentActivity }: SystemMonitorProps) {
    const [health, setHealth] = useState<SystemHealth>(initialHealth);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const refreshHealth = async () => {
        setIsRefreshing(true);
        try {
            const newHealth = await getSystemHealthAction();
            setHealth(newHealth);
            toast.success("Estado actualizado");
        } catch (error) {
            toast.error("Error al actualizar el estado");
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Estado del Sistema</h2>
                    <p className="text-muted-foreground">
                        Monitoreo y salud del sistema SmartClass
                    </p>
                </div>
                <Button onClick={refreshHealth} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            {/* System Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Estado General</CardTitle>
                        <Badge
                            variant={health.status === 'healthy' ? 'default' : 'destructive'}
                            className="gap-1"
                        >
                            {health.status === 'healthy' ? (
                                <>
                                    <CheckCircle className="h-3 w-3" />
                                    Sistema Saludable
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-3 w-3" />
                                    Sistema con Problemas
                                </>
                            )}
                        </Badge>
                    </div>
                    <CardDescription>
                        Última actualización: {new Date(health.timestamp).toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Database Status */}
                        <div className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-muted-foreground" />
                                    <h4 className="font-semibold">Base de Datos</h4>
                                </div>
                                <Badge variant={health.database.connected ? 'default' : 'destructive'}>
                                    {health.database.connected ? 'Conectada' : 'Desconectada'}
                                </Badge>
                            </div>

                            {health.database.connected ? (
                                <div className="grid gap-2 md:grid-cols-3 text-sm">
                                    <div className="flex justify-between p-2 bg-muted rounded">
                                        <span className="text-muted-foreground">Usuarios:</span>
                                        <span className="font-medium">{health.database.users}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-muted rounded">
                                        <span className="text-muted-foreground">Cursos:</span>
                                        <span className="font-medium">{health.database.courses}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-muted rounded">
                                        <span className="text-muted-foreground">Actividades:</span>
                                        <span className="font-medium">{health.database.activities}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-destructive">
                                    Error: {health.database.error}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>
                        Últimas acciones en el sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay actividad reciente
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm truncate max-w-[200px]">
                                                {formatName(activity.user.name, activity.user.profile)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(activity.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Entregó: <span className="font-medium">{activity.details.activity}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Curso: {activity.details.course}
                                            {activity.details.grade !== null && (
                                                <span className="ml-2">
                                                    • Nota: <span className="font-medium">{activity.details.grade.toFixed(1)}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* System Info */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Información del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Versión:</span>
                            <span className="font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Entorno:</span>
                            <span className="font-medium">
                                {process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Base de Datos:</span>
                            <span className="font-medium">PostgreSQL</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Servicios Externos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Gemini AI:</span>
                            <Badge variant="default" className="text-xs">Activo</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">GitHub API:</span>
                            <Badge variant="default" className="text-xs">Activo</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Google Colab:</span>
                            <Badge variant="default" className="text-xs">Activo</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
