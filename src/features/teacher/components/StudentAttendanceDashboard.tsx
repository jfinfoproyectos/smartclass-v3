"use client";

import { useMemo } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { 
    Chart as ChartJS, 
    ArcElement, 
    Tooltip, 
    Legend, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    BarElement,
    Title
} from 'chart.js';

ChartJS.register(
    ArcElement, 
    Tooltip, 
    Legend, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    BarElement,
    Title
);
import { Pie, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Calendar, 
    AlertTriangle, 
    Award, 
    Clock, 
    CheckCircle2, 
    XCircle,
    User,
    BarChart3,
    TrendingDown,
    PieChart
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface StudentAttendanceDashboardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    studentData: any;
    dateColumns: string[];
}

export function StudentAttendanceDashboard({ 
    isOpen, 
    onOpenChange, 
    studentData, 
    dateColumns 
}: StudentAttendanceDashboardProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = (resolvedTheme || theme) === 'dark';

    const stats = useMemo(() => {
        if (!studentData) return null;

        let p = 0, a = 0, l = 0, e = 0;
        let totalRemarks = 0;
        let attention = 0;
        let commendation = 0;

        const history: any[] = [];

        dateColumns.forEach(date => {
            const record = studentData[date];
            if (record && typeof record === 'object' && record.status !== '-') {
                if (record.status === 'P') p++;
                else if (record.status === 'A') a++;
                else if (record.status === 'L') l++;
                else if (record.status === 'E') e++;

                if (record.remarks) {
                    record.remarks.forEach((r: any) => {
                        totalRemarks++;
                        if (r.type === 'ATTENTION') attention++;
                        else if (r.type === 'COMMENDATION') commendation++;
                    });
                }

                history.push({
                    date,
                    ...record
                });
            }
        });

        const totalDays = p + a + l + e;
        const attendanceRate = totalDays > 0 ? ((p + l) / totalDays) * 100 : 0;

        return { 
            p, a, l, e, 
            totalRemarks, 
            attention, 
            commendation, 
            attendanceRate,
            history: history.sort((a, b) => b.date.localeCompare(a.date))
        };
    }, [studentData, dateColumns]);

    if (!studentData || !stats) return null;

    const chartColors = {
        text: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    };

    const pieData = {
        labels: ['Asistencias', 'Fallas', 'Tardes', 'Excusas'],
        datasets: [{
            data: [stats.p, stats.a, stats.l, stats.e],
            backgroundColor: [
                'rgba(34, 197, 94, 0.7)',
                'rgba(239, 68, 68, 0.7)',
                'rgba(249, 115, 22, 0.7)',
                'rgba(59, 130, 246, 0.7)',
            ],
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
        }],
    };

    const barData = {
        labels: ['Atenciones', 'Felicitaciones'],
        datasets: [{
            label: 'Observaciones',
            data: [stats.attention, stats.commendation],
            backgroundColor: [
                'rgba(245, 158, 11, 0.7)',
                'rgba(168, 85, 247, 0.7)',
            ],
            borderRadius: 4,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { color: chartColors.text, font: { size: 10 } }
            }
        },
        scales: {
            x: { 
                grid: { display: false },
                ticks: { color: chartColors.text, font: { size: 10 } }
            },
            y: { 
                grid: { color: chartColors.grid },
                ticks: { color: chartColors.text, font: { size: 10 }, stepSize: 1 }
            }
        }
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none bg-background/95 backdrop-blur-xl shadow-2xl custom-scrollbar">
                <DialogHeader className="p-6 border-b bg-primary/5 relative overflow-hidden shrink-0 sticky top-0 z-50 backdrop-blur-md">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <User className="h-32 w-32 rotate-12" />
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                                <User className="h-7 w-7 text-white" />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                                    {studentData.Estudiante}
                                </DialogTitle>
                                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border shadow-sm font-mono">
                                        ID: {studentData.ID}
                                    </span>
                                    <span className="flex items-center gap-1.5 opacity-70">
                                        {studentData.Correo}
                                    </span>
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Integrated Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                            <div className="flex flex-col px-4 py-2 rounded-xl bg-background/50 border shadow-sm">
                                <span className="text-[9px] uppercase font-black text-green-600/70 tracking-widest mb-0.5">Asistencia</span>
                                <span className={cn(
                                    "text-lg font-black tabular-nums leading-none",
                                    stats.attendanceRate > 85 ? "text-green-600" : stats.attendanceRate > 75 ? "text-amber-600" : "text-red-600"
                                )}>
                                    {stats.attendanceRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex flex-col px-4 py-2 rounded-xl bg-background/50 border shadow-sm">
                                <span className="text-[9px] uppercase font-black text-red-600/70 tracking-widest mb-0.5">Inasistencias</span>
                                <span className="text-lg font-black tabular-nums leading-none text-red-600">{stats.a}</span>
                            </div>
                            <div className="flex flex-col px-4 py-2 rounded-xl bg-background/50 border shadow-sm">
                                <span className="text-[9px] uppercase font-black text-amber-600/70 tracking-widest mb-0.5">Atenciones</span>
                                <span className="text-lg font-black tabular-nums leading-none text-amber-600">{stats.attention}</span>
                            </div>
                            <div className="flex flex-col px-4 py-2 rounded-xl bg-background/50 border shadow-sm">
                                <span className="text-[9px] uppercase font-black text-purple-600/70 tracking-widest mb-0.5">Felicitaciones</span>
                                <span className="text-lg font-black tabular-nums leading-none text-purple-600">{stats.commendation}</span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 bg-muted/5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Distribution Chart */}
                        <Card className="border-none bg-background shadow-sm ring-1 ring-border flex flex-col">
                            <CardHeader className="p-4 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <PieChart className="h-3.5 w-3.5 text-primary" />
                                    Distribución
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex items-center justify-center">
                                <div className="w-full h-[250px]">
                                    <Pie data={pieData} options={{ ...chartOptions, scales: undefined }} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Observations Chart */}
                        <Card className="border-none bg-background shadow-sm ring-1 ring-border flex flex-col">
                            <CardHeader className="p-4 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <TrendingDown className="h-3.5 w-3.5 text-primary" />
                                    Observaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex items-center justify-center">
                                <div className="w-full h-[250px]">
                                    <Bar data={barData} options={chartOptions} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent History */}
                        <Card className="border-none bg-background shadow-sm ring-1 ring-border flex flex-col">
                            <CardHeader className="p-4 border-b">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        Registro de Sesiones
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0">
                                        {stats.history.length} Sesiones
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/50">
                                    {stats.history.map((record, i) => (
                                        <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors group/row">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center shadow-sm",
                                                    record.status === 'P' ? "bg-green-500/10 text-green-600" :
                                                    record.status === 'A' ? "bg-red-500/10 text-red-600" :
                                                    record.status === 'L' ? "bg-orange-500/10 text-orange-600" :
                                                    "bg-blue-500/10 text-blue-600"
                                                )}>
                                                    {record.status === 'P' ? <CheckCircle2 className="h-4 w-4" /> :
                                                     record.status === 'A' ? <XCircle className="h-4 w-4" /> :
                                                     record.status === 'L' ? <Clock className="h-4 w-4" /> :
                                                     <Calendar className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold tracking-tight">
                                                        {format(new Date(record.date + 'T12:00:00Z'), "d 'de' MMM", { locale: es })}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground font-medium uppercase">
                                                        {record.status === 'P' ? 'Presente' :
                                                         record.status === 'A' ? 'Falla' :
                                                         record.status === 'L' ? 'Tarde' :
                                                         'Excusado'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {record.remarks?.length > 0 && (
                                                    <div className="flex -space-x-1.5">
                                                        {record.remarks.map((r: any, ri: number) => (
                                                            <div key={ri} className={cn(
                                                                "w-5 h-5 rounded-md border border-background flex items-center justify-center shadow-sm",
                                                                r.type === 'ATTENTION' ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"
                                                            )}>
                                                                {r.type === 'ATTENTION' ? <AlertTriangle className="h-2.5 w-2.5" /> : <Award className="h-2.5 w-2.5" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
