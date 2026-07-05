"use client";

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
import { Pie, Line, Bar } from 'react-chartjs-2';
import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Award, Users, Calendar } from "lucide-react";
import { useTheme } from "next-themes";

// Register Chart.js components
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

interface AttendanceStatisticsProps {
    data: any[];
    dateColumns: string[];
    onFilter?: (status: string) => void;
}

export function AttendanceStatistics({ data, dateColumns, onFilter }: AttendanceStatisticsProps) {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    // Ensure component is mounted to avoid hydration mismatch with next-themes
    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = mounted ? (resolvedTheme || theme || 'light') : 'light';
    const isDark = currentTheme === 'dark';

    // Chart.js Theme Options (Updated for maximum compatibility)
    const chartColors = {
        text: isDark ? '#a1a1aa' : '#71717a',
        grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        tooltipBg: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        tooltipText: isDark ? '#fff' : '#000',
        present: isDark ? '#22c55e' : '#16a34a',     // green-500 / green-600
        absent: isDark ? '#ef4444' : '#dc2626',      // red-500 / red-600
        late: isDark ? '#f59e0b' : '#d97706',        // amber-500 / amber-600
        excused: isDark ? '#3b82f6' : '#2563eb',     // blue-500 / blue-600
        trend: isDark ? '#6366f1' : '#4f46e5',       // indigo-500 / indigo-600
        trendBg: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.2)',
        attention: isDark ? '#f97316' : '#ea580c',   // orange-500 / orange-600
        commendation: isDark ? '#a855f7' : '#9333ea', // purple-500 / purple-600
    };

    // 📊 GLOBAL DISTRIBUTION (Pie Chart)
    const globalStats = useMemo(() => {
        let p = 0, a = 0, l = 0, e = 0;
        data.forEach(row => {
            dateColumns.forEach(date => {
                const cell = row[date];
                if (cell && typeof cell === 'object') {
                    if (cell.status === 'P') p++;
                    else if (cell.status === 'A') a++;
                    else if (cell.status === 'L') l++;
                    else if (cell.status === 'E') e++;
                }
            });
        });
        return { p, a, l, e };
    }, [data, dateColumns]);

    const pieData = {
        labels: ['Presente', 'Inasistencia', 'Tarde', 'Excusado'],
        datasets: [{
            data: [globalStats.p, globalStats.a, globalStats.l, globalStats.e],
            backgroundColor: [
                chartColors.present,
                chartColors.absent,
                chartColors.late,
                chartColors.excused,
            ],
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
        }],
    };

    // 📈 TREND BY DATE (Line Chart)
    const trendData = useMemo(() => {
        const sortedDates = [...dateColumns].sort();
        const labels = sortedDates.map(date => {
            const d = new Date(date + 'T12:00:00Z');
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });

        const presenceData = sortedDates.map(date => {
            let presentCount = 0;
            let totalRecords = 0;
            data.forEach(row => {
                const cell = row[date];
                if (cell && typeof cell === 'object' && cell.status !== '-') {
                    totalRecords++;
                    if (cell.status === 'P' || cell.status === 'L') presentCount++;
                }
            });
            return totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
        });

        return { labels, data: presenceData };
    }, [data, dateColumns]);

    const lineData = {
        labels: trendData.labels,
        datasets: [{
            label: '% Asistencia (P+T)',
            data: trendData.data,
            borderColor: chartColors.trend,
            backgroundColor: chartColors.trendBg,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: chartColors.trend,
        }],
    };

    // 🏆 TOP ABSENCES (Bar Chart)
    const topAbsences = useMemo(() => {
        const studentAbsences = data.map(row => {
            let absences = 0;
            dateColumns.forEach(date => {
                if (row[date]?.status === 'A') absences++;
            });
            return { name: row.Estudiante, absences };
        });

        return studentAbsences
            .sort((a, b) => b.absences - a.absences)
            .slice(0, 5)
            .filter(s => s.absences > 0);
    }, [data, dateColumns]);

    const absencesBarData = {
        labels: topAbsences.map(s => s.name.split(' ')[0]), // Use first name for space
        datasets: [{
            label: 'Inasistencias',
            data: topAbsences.map(s => s.absences),
            backgroundColor: chartColors.absent,
            borderColor: chartColors.absent,
            borderWidth: 0,
            borderRadius: 4,
        }],
    };

    // 📣 REMARKS DISTRIBUTION (Bar Chart)
    const remarkStats = useMemo(() => {
        let attention = 0;
        let commendation = 0;
        data.forEach(row => {
            dateColumns.forEach(date => {
                const remarks = row[date]?.remarks;
                if (remarks && Array.isArray(remarks)) {
                    remarks.forEach(r => {
                        if (r.type === 'ATTENTION') attention++;
                        else if (r.type === 'COMMENDATION') commendation++;
                    });
                }
            });
        });
        return { attention, commendation };
    }, [data, dateColumns]);

    const remarksBarData = {
        labels: ['Atenciones', 'Felicitaciones'],
        datasets: [{
            label: 'Cantidad',
            data: [remarkStats.attention, remarkStats.commendation],
            backgroundColor: [
                chartColors.attention,
                chartColors.commendation,
            ],
            borderWidth: 0,
            borderRadius: 4,
        }],
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    boxWidth: 12,
                    font: { size: 10 },
                    color: chartColors.text,
                }
            },
            tooltip: {
                backgroundColor: chartColors.tooltipBg,
                titleColor: chartColors.tooltipText,
                bodyColor: chartColors.tooltipText,
                borderColor: chartColors.grid,
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid: {
                    color: chartColors.grid,
                },
                ticks: {
                    color: chartColors.text,
                    font: { size: 10 }
                }
            },
            y: {
                grid: {
                    color: chartColors.grid,
                },
                ticks: {
                    color: chartColors.text,
                    font: { size: 10 }
                },
                beginAtZero: true
            }
        }
    };

    const pieOptions = {
        ...commonOptions,
        scales: undefined, // Pie charts don't have scales
        onClick: (event: any, elements: any[]) => {
            if (elements.length > 0 && onFilter) {
                const index = elements[0].index;
                // Labels: ['Presente', 'Inasistencia', 'Tarde', 'Excusado']
                const statusMap = ['P', 'A', 'L', 'E'];
                onFilter(statusMap[index]);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-100 dark:border-green-900/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Promedio de Asistencia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {globalStats.p > 0 ? ((globalStats.p + globalStats.l) / (globalStats.p + globalStats.a + globalStats.l + globalStats.e) * 100).toFixed(1) : "0"}%
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Total Inasistencias
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{globalStats.a}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" /> Atenciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{remarkStats.attention}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50/30 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/50">
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
                            <Award className="h-3 w-3" /> Felicitaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{remarkStats.commendation}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Distribución Global</CardTitle>
                        <CardDescription className="text-[10px]">Porcentaje de estados de asistencia</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <Pie data={pieData} options={pieOptions} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Tendencia de Asistencia</CardTitle>
                        <CardDescription className="text-[10px]">% de presencia a lo largo del tiempo</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <Line data={lineData} options={commonOptions} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Top Inasistencias</CardTitle>
                        <CardDescription className="text-[10px]">Estudiantes con mayores ausencias</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        {topAbsences.length > 0 ? (
                            <Bar 
                                data={absencesBarData} 
                                options={{
                                    ...commonOptions,
                                    onClick: (event: any, elements: any[]) => {
                                        if (elements.length > 0 && onFilter) {
                                            const index = elements[0].index;
                                            const studentName = topAbsences[index].name;
                                            // Passing the name to filter by student
                                            onFilter(studentName);
                                        }
                                    }
                                }} 
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
                                No hay inasistencias registradas
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Distribución de Observaciones</CardTitle>
                        <CardDescription className="text-[10px]">Atenciones vs Felicitaciones</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <Bar data={remarksBarData} options={commonOptions} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
