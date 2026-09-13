"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Users, 
    BookOpen, 
    Activity, 
    ShieldCheck, 
    UserCheck, 
    GraduationCap, 
    Settings,
    TrendingUp,
    Clock,
    UserPlus,
    FileText,
    Shield,
    FileSpreadsheet,
    Loader2
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import { pdf } from "@react-pdf/renderer";
import { exportMultiSheetExcel } from "@/lib/export-utils";
import { AdminExecutiveReportPDFDocument } from "./AdminExecutiveReportPDFDocument";
import { toast } from "sonner";

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
    const [isExportingPDF, setIsExportingPDF] = React.useState(false);
    const [isExportingExcel, setIsExportingExcel] = React.useState(false);

    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        toast.info("Generando balance ejecutivo institucional en PDF...");
        try {
            const blob = await pdf(
                <AdminExecutiveReportPDFDocument
                    stats={stats}
                    recentActivity={recentActivity}
                    generatedAt={format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Balance_Ejecutivo_Institucional_${format(new Date(), "yyyy-MM-dd")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Balance ejecutivo en PDF descargado exitosamente");
        } catch (error) {
            console.error("Executive PDF Error:", error);
            toast.error("Error al generar el balance ejecutivo en PDF");
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            const metricsData = [
                { "Indicador": "Total de Usuarios Registrados", "Valor": stats.users.total, "Detalle": "Cuentas en el sistema" },
                { "Indicador": "Estudiantes Matriculados", "Valor": stats.users.student, "Detalle": `${stats.users.total > 0 ? Math.round((stats.users.student / stats.users.total) * 100) : 0}% de la comunidad` },
                { "Indicador": "Cuerpo Docente", "Valor": stats.users.teacher, "Detalle": "Profesores e instructores" },
                { "Indicador": "Administradores del Sistema", "Valor": stats.users.admin, "Detalle": "Gestores de control global" },
                { "Indicador": "Total de Cursos Registrados", "Valor": stats.courses.total, "Detalle": "Catálogo general" },
                { "Indicador": "Cursos Activos", "Valor": stats.courses.active, "Detalle": "En periodo lectivo vigente" },
                { "Indicador": "Cursos Archivados", "Valor": stats.courses.archived, "Detalle": "Periodos culminados" },
                { "Indicador": "Entregas Totales Evaluadas", "Valor": stats.activity.submissions, "Detalle": "Evidencias y tareas" },
                { "Indicador": "Estado Servidor & Base de Datos", "Valor": stats.health.connected ? "Operativo (100%)" : "Atención Requerida", "Detalle": "Infraestructura Cloud" },
            ];

            const activityData = recentActivity && recentActivity.length > 0
                ? recentActivity.map((act: any, idx: number) => ({
                    "#": idx + 1,
                    "Usuario": formatName(act.user?.name, act.user?.profile),
                    "Correo": act.user?.email || "Sin email",
                    "Actividad / Evidencia": act.details?.activity || "Acción registrada",
                    "Curso Asociado": act.details?.course || "Plataforma General",
                    "Fecha y Hora": format(new Date(act.timestamp), "dd/MM/yyyy HH:mm:ss")
                }))
                : [
                    { "#": 1, "Usuario": "Sin actividad reciente", "Correo": "-", "Actividad / Evidencia": "-", "Curso Asociado": "-", "Fecha y Hora": "-" }
                ];

            await exportMultiSheetExcel(
                [
                    { name: "Indicadores Generales", data: metricsData },
                    { name: "Auditoría de Actividad", data: activityData },
                ],
                `Consolidado_Institucional_SmartClass_${format(new Date(), "yyyy-MM-dd")}.xlsx`
            );

            toast.success("Matriz consolidada en Excel exportada exitosamente");
        } catch (error) {
            console.error("Executive Excel Error:", error);
            toast.error("Error al exportar consolidado en Excel");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const kpis = [
        {
            title: "Usuarios Totales",
            description: "Comunidad activa en SmartClass v3",
            value: stats.users.total,
            icon: Users,
            badge: "Comunidad",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
            link: "/dashboard/admin/users"
        },
        {
            title: "Cursos Activos",
            description: `${stats.courses.total} cursos registrados en total`,
            value: stats.courses.active,
            icon: BookOpen,
            badge: "Académico",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
            link: "/dashboard/admin/courses"
        },
        {
            title: "Entregas Totales",
            description: "Trabajos y actividades evaluadas",
            value: stats.activity.submissions,
            icon: Activity,
            badge: "Actividad",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
            link: "/dashboard/admin"
        },
        {
            title: "Documentación IA",
            description: "Proyectos e informes generados",
            value: (stats as any).documentation?.total || 0,
            icon: FileText,
            badge: "Recursos",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
            accentColor: "from-primary/30 via-primary/15 to-transparent",
            iconBgColor: "bg-primary/10",
            iconTextColor: "text-primary",
            link: "/dashboard/admin/docs"
        }
    ];

    const userDistribution = [
        { label: "Estudiantes", value: stats.users.student, icon: GraduationCap, color: "bg-primary/80", text: "text-primary" },
        { label: "Profesores", value: stats.users.teacher, icon: UserCheck, color: "bg-primary/60", text: "text-primary" },
        { label: "Administradores", value: stats.users.admin, icon: ShieldCheck, color: "bg-primary", text: "text-primary" },
    ];

    return (
        <DashboardContainer>
            {/* Header Banner - AI Canvas Ambient Lighting */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 left-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Panel de Administración Central</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Gestión Global del Sistema
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Supervisa usuarios, cursos activos, actividad reciente e infraestructura del servidor.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={isExportingExcel}
                            className="text-xs rounded-xl gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                        >
                            {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                            <span>Exportar Excel</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isExportingPDF}
                            className="text-xs rounded-xl gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 font-medium"
                        >
                            {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />}
                            <span>Balance PDF</span>
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs rounded-xl" asChild>
                            <Link href="/dashboard/admin/settings">
                                <Settings className="h-4 w-4 mr-1.5" />
                                Ajustes
                            </Link>
                        </Button>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-lg border-none" asChild>
                            <Link href="/dashboard/admin/users">
                                <UserPlus className="h-4 w-4 mr-1.5" />
                                Nuevo Usuario
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Bento Grid (Compact & Low Height) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((kpi, idx) => (
                    <Link href={kpi.link} key={idx} className="block group h-full">
                        <AICanvasCard
                            title={kpi.title}
                            description={kpi.description}
                            icon={kpi.icon}
                            badge={kpi.badge}
                            badgeColor={kpi.badgeColor}
                            accentColor={kpi.accentColor}
                            iconBgColor={kpi.iconBgColor}
                            iconTextColor={kpi.iconTextColor}
                            compact={true}
                            className="h-full"
                        >
                            <div className="pt-0.5">
                                <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                                    {kpi.value}
                                </div>
                            </div>
                        </AICanvasCard>
                    </Link>
                ))}
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Distribution */}
                <Card className="lg:col-span-1 border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Distribución de Usuarios
                        </CardTitle>
                        <CardDescription className="text-xs">Composición por roles en la plataforma</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-4">
                            {userDistribution.map((dist, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <div className="flex items-center gap-2">
                                            <dist.icon className={`h-4 w-4 ${dist.text}`} />
                                            <span className="text-foreground">{dist.label}</span>
                                        </div>
                                        <span className="text-muted-foreground">{dist.value} ({((dist.value / (stats.users.total || 1)) * 100).toFixed(1)}%)</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(dist.value / (stats.users.total || 1)) * 100}%` }}
                                            transition={{ duration: 0.8, delay: 0.2 }}
                                            className={`h-full ${dist.color}`} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-emerald-500" />
                                Actividad Reciente del Sistema
                            </CardTitle>
                            <CardDescription className="text-xs">Últimas acciones registradas en tiempo real</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                                    No se ha registrado actividad reciente.
                                </div>
                            ) : (
                                recentActivity.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="group flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-sm truncate text-foreground">{formatName(activity.user.name, activity.user.profile)}</span>
                                                <span className="text-[11px] text-muted-foreground shrink-0 capitalize">
                                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Entregó la actividad <span className="font-semibold text-emerald-600 dark:text-emerald-400">"{activity.details.activity}"</span> en el curso <span className="font-medium">{activity.details.course}</span>.
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardContainer>
    );
}
