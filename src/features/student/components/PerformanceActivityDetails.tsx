"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    TrendingUp,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserX,
    Award,
    Info,
    LineChart as LineChartIcon,
    Sparkles,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ReferenceLine,
} from "recharts";
import { generatePerformanceClassDates, type StudentDayPerformance } from "@/features/teacher/utils/performanceUtils";

interface PerformanceActivityDetailsProps {
    activity: any;
    userId: string;
    studentName?: string;
}

export function PerformanceActivityDetails({
    activity,
    userId,
    studentName,
}: PerformanceActivityDetailsProps) {
    // Parse configuration from description
    const config = useMemo(() => {
        let conf = {
            startDate: activity.openDate ? new Date(activity.openDate).toISOString().split("T")[0] : "",
            endDate: activity.deadline ? new Date(activity.deadline).toISOString().split("T")[0] : "",
            daysOfWeek: [1, 2, 3, 4, 5],
            defaultDailyGrade: 5.0,
            absenceGrade: 0.0,
            tardinessPenalty: 1.0,
            scaleMin: 0.0,
            scaleMax: 5.0,
        };
        if (activity.description) {
            try {
                const parsed = JSON.parse(activity.description);
                if (parsed.performanceConfig) {
                    conf = { ...conf, ...parsed.performanceConfig };
                }
            } catch {}
        }
        return conf;
    }, [activity]);

    // Student's submission data
    const submission = activity.submissions?.[0] || null;

    const savedPerformance = useMemo(() => {
        if (!submission?.url || !submission.url.startsWith("{")) return null;
        try {
            return JSON.parse(submission.url);
        } catch {
            return null;
        }
    }, [submission?.url]);

    // Generate class dates
    const classDates = useMemo(() => {
        return generatePerformanceClassDates(
            config.startDate,
            config.endDate,
            config.daysOfWeek
        );
    }, [config]);

    // Merge saved days with generated dates
    const dailyBreakdown: StudentDayPerformance[] = useMemo(() => {
        const savedDaysMap = new Map<string, any>();
        if (savedPerformance && Array.isArray(savedPerformance.days)) {
            savedPerformance.days.forEach((d: any) => {
                if (d && d.date) savedDaysMap.set(d.date, d);
            });
        }

        return classDates.map(cd => {
            const saved = savedDaysMap.get(cd.date);
            if (saved) {
                return {
                    date: cd.date,
                    dayOfWeek: cd.dayOfWeek,
                    dayName: cd.dayName,
                    formattedDate: cd.formattedDate,
                    attendanceStatus: saved.attendanceStatus || "NONE",
                    baseGrade: saved.baseGrade ?? config.defaultDailyGrade ?? 5.0,
                    penalty: saved.penalty ?? 0,
                    manualGrade: saved.manualGrade ?? null,
                    finalDayGrade: saved.finalDayGrade ?? (saved.attendanceStatus === "ABSENT" ? 0.0 : 5.0),
                    teacherNote: saved.teacherNote || "",
                    lockedByAbsence: saved.attendanceStatus === "ABSENT",
                };
            }

            // Default fallback if not yet graded
            return {
                date: cd.date,
                dayOfWeek: cd.dayOfWeek,
                dayName: cd.dayName,
                formattedDate: cd.formattedDate,
                attendanceStatus: "NONE",
                baseGrade: config.defaultDailyGrade ?? 5.0,
                penalty: 0,
                manualGrade: null,
                finalDayGrade: config.defaultDailyGrade ?? 5.0,
                teacherNote: "",
                lockedByAbsence: false,
            };
        });
    }, [classDates, savedPerformance, config]);

    // Final Grade (from submission or computed from breakdown)
    const finalGrade = useMemo(() => {
        if (typeof submission?.grade === "number") {
            return Number(submission.grade.toFixed(2));
        }
        if (dailyBreakdown.length === 0) return 5.0;
        const sum = dailyBreakdown.reduce((acc, d) => acc + d.finalDayGrade, 0);
        return Number((sum / dailyBreakdown.length).toFixed(2));
    }, [submission?.grade, dailyBreakdown]);

    // Statistics
    const stats = useMemo(() => {
        let present = 0;
        let late = 0;
        let absent = 0;
        let excused = 0;

        dailyBreakdown.forEach(d => {
            if (d.attendanceStatus === "ABSENT") absent++;
            else if (d.attendanceStatus === "LATE") late++;
            else if (d.attendanceStatus === "EXCUSED") excused++;
            else if (d.attendanceStatus === "PRESENT") present++;
        });

        return {
            total: dailyBreakdown.length,
            present,
            late,
            absent,
            excused,
        };
    }, [dailyBreakdown]);

    // Chart Data
    const chartData = useMemo(() => {
        return dailyBreakdown.map(d => {
            let statusLabel = "Asistencia";
            if (d.attendanceStatus === "ABSENT") statusLabel = "Inasistencia (0.0)";
            else if (d.attendanceStatus === "LATE") statusLabel = `Llegada Tarde (-${d.penalty.toFixed(1)})`;
            else if (d.attendanceStatus === "EXCUSED") statusLabel = "Excusa";

            return {
                date: d.formattedDate,
                grade: d.finalDayGrade,
                status: d.attendanceStatus,
                statusLabel,
                note: d.teacherNote,
            };
        });
    }, [dailyBreakdown]);

    const isPassing = finalGrade >= 3.0;

    return (
        <div className="space-y-4 max-w-6xl mx-auto p-1 sm:p-3">
            {/* Main Header Banner */}
            <Card className="border shadow-xs overflow-hidden bg-gradient-to-br from-card via-card to-emerald-500/[0.04]">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 text-xs font-bold py-1 px-3">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Evaluación de Desempeño en Clase
                                </Badge>
                                <Badge variant="outline" className="text-xs font-semibold">
                                    <Calendar className="h-3 w-3 mr-1 text-primary" />
                                    {config.startDate} al {config.endDate}
                                </Badge>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                                {activity.title}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Aprendiz: <strong className="text-foreground">{studentName || "Estudiante"}</strong> • Evaluación continua vinculada a asistencia
                            </p>
                        </div>

                        {/* Final Average Grade Card */}
                        <div className="p-3.5 sm:p-4 rounded-2xl border bg-background/90 shadow-sm flex items-center gap-4 self-stretch sm:self-auto">
                            <div className="space-y-0.5">
                                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                    Nota Promedio Final
                                </div>
                                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
                                    isPassing ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}>
                                    {finalGrade.toFixed(2)}
                                    <span className="text-xs text-muted-foreground font-normal ml-1">/ 5.0</span>
                                </div>
                            </div>
                            <Badge
                                variant={isPassing ? "default" : "destructive"}
                                className="text-xs font-bold px-2.5 py-1 self-center"
                            >
                                {finalGrade >= 4.5 ? "Sobresaliente" : isPassing ? "Aprobado" : "Reprobado"}
                            </Badge>
                        </div>
                    </div>

                    {/* KPI Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                        <div className="p-3 rounded-xl border bg-background/80 space-y-1">
                            <div className="text-[11px] font-medium text-muted-foreground uppercase">Sesiones de Clase</div>
                            <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-primary" />
                                {stats.total} días
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1">
                            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 uppercase">Asistencias</div>
                            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4" />
                                {stats.present} (5.0)
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-1">
                            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300 uppercase">Llegadas Tarde</div>
                            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {stats.late} (penalizada)
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-rose-500/5 border-rose-500/20 space-y-1">
                            <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300 uppercase">Inasistencias</div>
                            <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                <UserX className="h-4 w-4" />
                                {stats.absent} (0.0)
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* BEHAVIOR TREND CHART */}
            <Card className="border shadow-xs overflow-hidden">
                <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <LineChartIcon className="h-4 w-4 text-primary" />
                            Gráfico de Comportamiento y Evolución Diaria
                        </CardTitle>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Asistió (5.0)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Tardanza
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Inasistencia (0.0)
                            </span>
                        </div>
                    </div>
                    <CardDescription className="text-xs">
                        Comportamiento de tu calificación a lo largo de las sesiones del periodo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-5">
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="studentPerformanceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={{ opacity: 0.3 }}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    ticks={[0, 1, 2, 3, 4, 5]}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={{ opacity: 0.3 }}
                                />
                                <ReferenceLine
                                    y={3.0}
                                    stroke="#e11d48"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{ value: "Mínimo Aprobatorio (3.0)", fill: "#e11d48", fontSize: 10, position: "insideBottomLeft" }}
                                />
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const p = payload[0].payload;
                                            return (
                                                <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1">
                                                    <div className="font-bold text-foreground flex items-center justify-between gap-3">
                                                        <span>{p.date}</span>
                                                        <span className="font-mono font-bold text-primary">{p.grade.toFixed(2)} / 5.0</span>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <span>Estado:</span>
                                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                            {p.statusLabel}
                                                        </Badge>
                                                    </div>
                                                    {p.note && (
                                                        <div className="text-[11px] text-muted-foreground border-t pt-1 mt-1">
                                                            <em>"{p.note}"</em>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="grade"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#studentPerformanceGradient)"
                                    dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        let fill = "#10b981";
                                        if (payload.status === "ABSENT") fill = "#ef4444";
                                        else if (payload.status === "LATE") fill = "#f59e0b";
                                        return (
                                            <circle
                                                key={`${cx}-${cy}`}
                                                cx={cx}
                                                cy={cy}
                                                r={5}
                                                fill={fill}
                                                stroke="#ffffff"
                                                strokeWidth={2}
                                            />
                                        );
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* CLASS SESSIONS BREAKDOWN TABLE */}
            <Card className="border shadow-xs overflow-hidden">
                <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Historial y Desglose por Sesión de Clase
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Detalle de asistencia y notas registradas en cada fecha de clase programada.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[150px] font-bold">Fecha de Clase</TableHead>
                                    <TableHead className="w-[140px] font-bold">Asistencia</TableHead>
                                    <TableHead className="w-[110px] text-center font-bold">Nota del Día</TableHead>
                                    <TableHead className="font-bold">Observación del Docente</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyBreakdown.map(d => {
                                    const isAbsent = d.lockedByAbsence;
                                    const isLate = d.attendanceStatus === "LATE";
                                    const isPresent = d.attendanceStatus === "PRESENT";

                                    return (
                                        <TableRow key={d.date} className={isAbsent ? "bg-rose-500/[0.04]" : ""}>
                                            <TableCell className="font-medium">
                                                <div className="font-semibold">{d.dayName}</div>
                                                <div className="text-[11px] text-muted-foreground font-mono">{d.date}</div>
                                            </TableCell>
                                            <TableCell>
                                                {isAbsent ? (
                                                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-[10px]">
                                                        <UserX className="h-3 w-3" /> Inasistencia (0.0)
                                                    </Badge>
                                                ) : isLate ? (
                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[10px]">
                                                        <Clock className="h-3 w-3" /> Tardanza (-{d.penalty})
                                                    </Badge>
                                                ) : isPresent ? (
                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px]">
                                                        <CheckCircle2 className="h-3 w-3" /> Presente (5.0)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {d.attendanceStatus === "EXCUSED" ? "Excusa Justificada" : "Sin Registro"}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-bold text-sm">
                                                <span className={`inline-block px-2 py-0.5 rounded ${
                                                    isAbsent
                                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                        : d.finalDayGrade >= 3.0
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                }`}>
                                                    {d.finalDayGrade.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {d.teacherNote ? (
                                                    <span className="text-xs text-foreground font-medium italic">
                                                        "{d.teacherNote}"
                                                    </span>
                                                ) : isAbsent ? (
                                                    <span className="text-[11px] text-rose-500/70 italic">Falta registrada en el sistema de asistencia</span>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground/60">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Rules / Grading Policy info */}
            <div className="p-4 rounded-xl border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" />
                    Criterios y Reglas de Calificación de Desempeño
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                    <li>Cada sesión de clase inicia con una nota base por defecto de <strong>5.0</strong>.</li>
                    <li>Las inasistencias injustificadas registran automáticamente una calificación de <strong>0.0</strong> para ese día.</li>
                    <li>Las llegadas tarde aplican una penalización de <strong>-{config.tardinessPenalty ?? 1.0}</strong> sobre la nota del día.</li>
                    <li>El docente puede ajustar la nota del día en función de tu participación, actividades realizadas y actitud en el aula.</li>
                    <li>La nota promedio final se calcula promediando todas las sesiones del periodo (Escala de 0.0 a 5.0).</li>
                </ul>
            </div>
        </div>
    );
}
