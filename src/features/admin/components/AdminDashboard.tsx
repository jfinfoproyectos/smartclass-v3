"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Users, 
    BookOpen, 
    Activity, 
    ShieldCheck, 
    UserCheck, 
    GraduationCap, 
    Settings,
    ArrowUpRight,
    TrendingUp,
    Server,
    Clock,
    UserPlus,
    FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";

interface AdminDashboardProps {
    stats: {
        users: {
            admin: number;
            teacher: number;
            student: number;
            total: number;
        };
        courses: {
            total: number;
            active: number;
            archived: number;
        };
        activity: {
            submissions: number;
        };
        health: {
            connected: boolean;
        };
    };
    recentActivity: any[];
}

export function AdminDashboard({ stats, recentActivity }: AdminDashboardProps) {
    const kpis = [
        {
            title: "Usuarios Totales",
            value: stats.users.total,
            description: "Comunidad SmartClass",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: "/dashboard/admin/users"
        },
        {
            title: "Cursos Activos",
            value: stats.courses.active,
            description: `${stats.courses.total} cursos en total`,
            icon: BookOpen,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: "/dashboard/admin/courses"
        },
        {
            title: "Entregas Totales",
            value: stats.activity.submissions,
            description: "Actividad acumulada",
            icon: Activity,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: "/dashboard/admin"
        },
        {
            title: "Documentación",
            value: (stats as any).documentation?.total || 0,
            description: "Proyectos generados",
            icon: FileText,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            link: "/dashboard/admin/docs"
        }
    ];

    const userDistribution = [
        { label: "Estudiantes", value: stats.users.student, icon: GraduationCap, color: "bg-blue-500" },
        { label: "Profesores", value: stats.users.teacher, icon: UserCheck, color: "bg-indigo-500" },
        { label: "Administradores", value: stats.users.admin, icon: ShieldCheck, color: "bg-purple-500" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
                    <p className="text-muted-foreground">
                        Métricas globales y gestión del sistema SmartClass
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/admin/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Configuración
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/admin/users">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Nuevo Usuario
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <Link href={kpi.link} key={idx} className="block group">
                        <Card className="h-full border-none shadow-xl bg-card overflow-hidden hover:scale-[1.02] transition-all duration-300 relative">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    {kpi.description}
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary font-bold flex items-center gap-0.5">
                                        Gestionar <ArrowUpRight className="h-3 w-3" />
                                    </span>
                                </p>
                            </CardContent>
                            <div className={`h-1 w-full absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-${kpi.color.split('-')[1]}-500/30 transition-all duration-500`} />
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Distribution */}
                <Card className="lg:col-span-1 border-none shadow-xl bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Distribución de Usuarios
                        </CardTitle>
                        <CardDescription>Composición de la comunidad educativa</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {userDistribution.map((dist, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <dist.icon className={`h-4 w-4 ${dist.color.replace('bg-', 'text-')}`} />
                                            {dist.label}
                                        </div>
                                        <span>{dist.value} ({((dist.value / stats.users.total) * 100 || 0).toFixed(1)}%)</span>
                                    </div>
                                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${dist.color} transition-all duration-1000`} 
                                            style={{ width: `${(dist.value / stats.users.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border-none shadow-xl bg-card overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Actividad Global Reciente
                            </CardTitle>
                            <CardDescription>Últimas interacciones registradas en el sistema</CardDescription>
                        </div>

                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border-dashed border-2">
                                    No se ha registrado actividad reciente.
                                </div>
                            ) : (
                                recentActivity.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="group flex items-start gap-4 p-4 hover:bg-muted/30 rounded-2xl transition-all duration-300 border border-transparent hover:border-primary/10">
                                        <div className="p-2.5 bg-background border shadow-sm rounded-xl group-hover:scale-110 transition-transform">
                                            <Activity className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-base">{formatName(activity.user.name, activity.user.profile)}</span>
                                                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full capitalize">
                                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/80 leading-relaxed">
                                                Entregó la actividad <span className="font-bold text-primary">"{activity.details.activity}"</span> en el curso <span className="font-medium">"{activity.details.course}"</span>.
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
