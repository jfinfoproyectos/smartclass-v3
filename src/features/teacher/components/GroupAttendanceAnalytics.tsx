"use client";

import { useMemo, useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip as ChartTooltip, 
    Legend 
} from "chart.js";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    TrendingUp, 
    AlertTriangle, 
    Award, 
    Users, 
    Clock, 
    LogOut,
    CheckCircle2,
    FileText,
    BrainCircuit,
    Lightbulb
} from "lucide-react";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend
);

interface GroupAttendanceAnalyticsProps {
    data: any[];
    dateColumns: string[];
}

export function GroupAttendanceAnalytics({ data, dateColumns }: GroupAttendanceAnalyticsProps) {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = mounted ? (resolvedTheme || theme || "light") : "light";
    const isDark = currentTheme === "dark";

    const chartColors = {
        grid: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
        text: isDark ? "#a1a1aa" : "#717172",
        good: isDark ? "#22c55e" : "#16a34a",     // Green
        warning: isDark ? "#eab308" : "#ca8a04",  // Yellow
        danger: isDark ? "#ef4444" : "#dc2626",   // Red
    };

    // Calculate detailed stats per student
    const studentMetrics = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map(row => {
            let presents = 0;
            let absences = 0;
            let lates = 0;
            let leaveEarly = 0;
            let excused = 0;
            let total = 0;

            dateColumns.forEach(date => {
                const cell = row[date];
                if (cell && cell !== "-" && cell.status) {
                    total++;
                    if (cell.status === "P") presents++;
                    else if (cell.status === "A") absences++;
                    else if (cell.status === "L") lates++;
                    else if (cell.status === "R") leaveEarly++;
                    else if (cell.status === "E") excused++;
                }
            });

            // Excuses and lates count as attendance in smartclass percentage, absences do not
            const attended = presents + lates + leaveEarly + excused;
            const percentage = total > 0 ? (attended / total) * 100 : 100;

            return {
                id: row.ID,
                name: row.Estudiante || "Estudiante",
                presents,
                absences,
                lates,
                leaveEarly,
                excused,
                total,
                percentage
            };
        }).sort((a, b) => b.percentage - a.percentage);
    }, [data, dateColumns]);

    // Group calculations
    const analyticsSummary = useMemo(() => {
        if (studentMetrics.length === 0) {
            return {
                avgAttendance: 0,
                perfectAttendance: [],
                atRisk: [],
                totalLates: 0,
                totalLeaveEarly: 0,
                totalAbsences: 0
            };
        }

        let sumPercentage = 0;
        const perfectAttendance: any[] = [];
        const atRisk: any[] = [];
        let totalLates = 0;
        let totalLeaveEarly = 0;
        let totalAbsences = 0;

        studentMetrics.forEach(student => {
            sumPercentage += student.percentage;
            if (student.percentage === 100) {
                perfectAttendance.push(student);
            }
            if (student.percentage < 80) {
                atRisk.push(student);
            }
            totalLates += student.lates;
            totalLeaveEarly += student.leaveEarly;
            totalAbsences += student.absences;
        });

        const avgAttendance = sumPercentage / studentMetrics.length;

        return {
            avgAttendance,
            perfectAttendance,
            atRisk,
            totalLates,
            totalLeaveEarly,
            totalAbsences
        };
    }, [studentMetrics]);

    // Bar chart dataset showing all students
    const chartData = {
        labels: studentMetrics.map(s => s.name),
        datasets: [
            {
                label: "% Asistencia",
                data: studentMetrics.map(s => s.percentage),
                backgroundColor: studentMetrics.map(s => {
                    if (s.percentage >= 80) return chartColors.good;
                    if (s.percentage >= 70) return chartColors.warning;
                    return chartColors.danger;
                }),
                borderRadius: 6,
                borderWidth: 0,
                maxBarThickness: 32,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const, // Horizontal bar chart is perfect for showing many student names!
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => `Asistencia: ${context.parsed.x.toFixed(1)}%`
                }
            }
        },
        scales: {
            x: {
                min: 0,
                max: 100,
                grid: {
                    color: chartColors.grid
                },
                ticks: {
                    color: chartColors.text,
                    font: { size: 11, weight: 'bold' as const },
                    callback: (value: any) => `${value}%`
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: chartColors.text,
                    font: { size: 10, weight: 'bold' as const }
                }
            }
        }
    };

    // Diagnostic generated analysis text
    const diagnosisText = useMemo(() => {
        const { avgAttendance, atRisk, totalLates, totalLeaveEarly } = analyticsSummary;

        if (studentMetrics.length === 0) {
            return {
                score: "Sin datos",
                color: "text-muted-foreground",
                alertReason: "No hay datos suficientes para generar un diagnóstico.",
                lateReason: "No hay datos suficientes."
            };
        }

        let score = "Excelente";
        let color = "text-green-600";
        if (avgAttendance < 70) {
            score = "Crítico";
            color = "text-red-600";
        } else if (avgAttendance < 80) {
            score = "Alerta";
            color = "text-amber-600";
        } else if (avgAttendance < 90) {
            score = "Aceptable";
            color = "text-blue-600";
        }

        const alertReason = atRisk.length > 0 
            ? `Se identifican ${atRisk.length} estudiantes con un porcentaje de asistencia menor al 80%, colocándolos en riesgo de reprobación.` 
            : "No hay estudiantes en riesgo crítico de asistencia en este periodo.";

        const lateReason = totalLates > 0 || totalLeaveEarly > 0
            ? `Se han registrado ${totalLates} llegadas tarde y ${totalLeaveEarly} retiros tempranos en total, lo cual indica que la puntualidad y la permanencia son factores claves a monitorear.`
            : "El cumplimiento de puntualidad y permanencia ha sido óptimo.";

        return { score, color, alertReason, lateReason };
    }, [analyticsSummary, studentMetrics]);

    return (
        <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avg Attendance */}
                <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Promedio General</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tight">{analyticsSummary.avgAttendance.toFixed(1)}%</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Tasa neta de asistencia grupal</p>
                    </CardContent>
                </Card>

                {/* Perfect Attendance */}
                <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Asistencia Perfecta</CardTitle>
                        <Award className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tight">{analyticsSummary.perfectAttendance.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Estudiantes con 100% de asistencia</p>
                    </CardContent>
                </Card>

                {/* Students At Risk */}
                <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-600" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">En Riesgo (&lt;80%)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tight text-red-600">{analyticsSummary.atRisk.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Estudiantes en zona de reprobación</p>
                    </CardContent>
                </Card>

                {/* Puntualidad / Retiros */}
                <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-600" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Incidencias</CardTitle>
                        <div className="flex gap-1 text-amber-600">
                            <Clock className="h-4 w-4" />
                            <LogOut className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tight">
                            {analyticsSummary.totalLates} <span className="text-sm font-semibold text-muted-foreground">T</span> / {analyticsSummary.totalLeaveEarly} <span className="text-sm font-semibold text-muted-foreground">R</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Total de tardanzas y retiros registrados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart and Diagnostic layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chart Box */}
                <Card className="lg:col-span-7 border border-border/60 shadow-md rounded-[2rem] overflow-hidden bg-card">
                    <CardHeader className="p-6 border-b bg-muted/20">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Rendimiento Individual de Estudiantes
                        </CardTitle>
                        <CardDescription className="text-xs">Porcentaje de asistencia de todos los alumnos inscritos (ordenado de mayor a menor)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 h-[450px]">
                        {studentMetrics.length > 0 ? (
                            <Bar data={chartData} options={chartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No hay datos de alumnos.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Analysis Box */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* General Diagnostic Card */}
                    <Card className="border border-border/60 shadow-md rounded-[2rem] overflow-hidden bg-card flex-1">
                        <CardHeader className="p-6 border-b bg-primary/[0.02]">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-primary" />
                                Diagnóstico Académico
                            </CardTitle>
                            <CardDescription className="text-xs">Análisis heurístico de asistencia y puntualidad grupal</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Estado de Asistencia del Grupo</h4>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-2xl font-black ${diagnosisText.color}`}>{diagnosisText.score}</span>
                                    <span className="text-xs text-muted-foreground">({analyticsSummary.avgAttendance.toFixed(1)}% promedio)</span>
                                </div>
                            </div>

                            <div className="space-y-3.5 pt-2">
                                <div className="flex gap-3 text-xs leading-relaxed text-foreground">
                                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-foreground">Alerta de Riesgo</p>
                                        <p className="text-muted-foreground mt-0.5">{diagnosisText.alertReason}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 text-xs leading-relaxed text-foreground">
                                    <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-foreground">Cumplimiento y Permanencia</p>
                                        <p className="text-muted-foreground mt-0.5">{diagnosisText.lateReason}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pedagogical Recommendations Card */}
                    <Card className="border border-border/60 shadow-md rounded-[2rem] overflow-hidden bg-card flex-1">
                        <CardHeader className="p-6 border-b bg-primary/[0.02]">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-primary" />
                                Recomendaciones Sugeridas
                            </CardTitle>
                            <CardDescription className="text-xs">Acciones para mejorar el rendimiento escolar</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ul className="space-y-3 text-xs leading-relaxed text-muted-foreground list-disc pl-4 font-medium">
                                {analyticsSummary.atRisk.length > 0 ? (
                                    <li>
                                        <strong className="text-foreground">Entrevistas Individuales:</strong> Convocar a los {analyticsSummary.atRisk.length} estudiantes que tienen asistencia crítica (&lt;80%) para conocer las causas de inasistencia.
                                    </li>
                                ) : (
                                    <li>
                                        <strong className="text-foreground">Reconocimiento Positivo:</strong> Continuar promoviendo la buena asistencia y felicitar al grupo por mantener un bajo nivel de inasistencias críticas.
                                    </li>
                                )}
                                
                                {analyticsSummary.totalLates > 0 && (
                                    <li>
                                        <strong className="text-foreground">Estrategia de Puntualidad:</strong> Dado que hay un índice de tardanzas, evaluar correr actividades clave o llamadas de participación al inicio de la sesión para incentivar la puntualidad.
                                    </li>
                                )}

                                {analyticsSummary.totalLeaveEarly > 0 && (
                                    <li>
                                        <strong className="text-foreground">Permanencia (Retiros):</strong> Revisar las justificaciones de los retiros. Si son recurrentes, establecer diálogo con el estudiante para no afectar la entrega de evaluaciones de fin de clase.
                                    </li>
                                )}

                                <li>
                                    <strong className="text-foreground">Exportación de Seguimiento:</strong> Descargar la matriz de asistencia a Excel mensualmente y compartirla con coordinación académica para activar protocolos institucionales.
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
