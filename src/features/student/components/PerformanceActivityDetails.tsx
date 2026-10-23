"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    FileText,
    ShieldAlert,
    Check,
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
import {
    generatePerformanceClassDates,
    DEFAULT_PERFORMANCE_CRITERIA,
    type PerformancePenaltyCriterion,
    type StudentDayPerformance,
} from "@/features/teacher/utils/performanceUtils";
import { getRegionalDateOnly } from "@/lib/dateUtils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useTheme } from "next-themes";

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
    const { theme, resolvedTheme } = useTheme();
    const mode = (theme === "dark" || resolvedTheme === "dark") ? "dark" : "light";
    const [activeTab, setActiveTab] = useState<string>("my_performance");

    // Parse configuration from description
    const config = useMemo(() => {
        let conf: {
            startDate: string;
            endDate: string;
            daysOfWeek: number[];
            defaultDailyGrade: number;
            absenceGrade: number;
            tardinessPenalty: number;
            scaleMin: number;
            scaleMax: number;
            criteria: PerformancePenaltyCriterion[];
        } = {
            startDate: activity.openDate ? getRegionalDateOnly(activity.openDate) : "",
            endDate: activity.deadline ? getRegionalDateOnly(activity.deadline) : "",
            daysOfWeek: [1, 2, 3, 4, 5],
            defaultDailyGrade: 5.0,
            absenceGrade: 0.0,
            tardinessPenalty: 1.0,
            scaleMin: 0.0,
            scaleMax: 5.0,
            criteria: DEFAULT_PERFORMANCE_CRITERIA,
        };
        if (activity.description) {
            try {
                const parsed = JSON.parse(activity.description);
                if (parsed.performanceConfig) {
                    conf = {
                        ...conf,
                        ...parsed.performanceConfig,
                        criteria: (parsed.performanceConfig.criteria && Array.isArray(parsed.performanceConfig.criteria) && parsed.performanceConfig.criteria.length > 0)
                            ? parsed.performanceConfig.criteria
                            : DEFAULT_PERFORMANCE_CRITERIA,
                    };
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
        const extraDates = savedPerformance && Array.isArray(savedPerformance.days)
            ? savedPerformance.days.map((d: any) => d.date).filter(Boolean)
            : [];
        return generatePerformanceClassDates(
            config.startDate,
            config.endDate,
            config.daysOfWeek,
            extraDates
        );
    }, [config, savedPerformance]);

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
                const isAbsent = saved.attendanceStatus === "ABSENT" || Boolean(saved.lockedByAbsence);
                const isLate = saved.attendanceStatus === "LATE";
                const penalty = saved.penalty ?? (isLate ? (config.tardinessPenalty ?? 1.0) : 0);
                const dayGrade = isAbsent ? 0.0 : (typeof saved.finalDayGrade === "number" ? saved.finalDayGrade : 5.0);

                return {
                    date: cd.date,
                    dayOfWeek: cd.dayOfWeek,
                    dayName: cd.dayName,
                    formattedDate: cd.formattedDate,
                    attendanceStatus: saved.attendanceStatus || "NONE",
                    baseGrade: saved.baseGrade ?? config.defaultDailyGrade ?? 5.0,
                    penalty,
                    manualGrade: saved.manualGrade ?? null,
                    finalDayGrade: dayGrade,
                    teacherNote: saved.teacherNote || "",
                    lockedByAbsence: isAbsent,
                    appliedCriteria: Array.isArray(saved.appliedCriteria) ? saved.appliedCriteria : [],
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
                appliedCriteria: [],
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
                                <Badge variant="secondary" className="text-xs font-mono font-bold">
                                    Base Diaria: 5.0 pts
                                </Badge>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                                {activity.title}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Aprendiz: <strong className="text-foreground">{studentName || "Estudiante"}</strong> • Evaluación continua vinculada a asistencia y criterios de desempeño
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

            {/* Navigation Tabs between Student Dashboard and Statement / Rubric */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 max-w-md h-9 p-0.5 bg-muted/60">
                    <TabsTrigger value="my_performance" className="text-xs font-semibold gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mi Desempeño y Asistencia</span>
                    </TabsTrigger>
                    <TabsTrigger value="statement" className="text-xs font-semibold gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-amber-500" />
                        <span>Enunciado y Rúbrica de Criterios</span>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: MI DESEMPEÑO Y ASISTENCIA */}
                <TabsContent value="my_performance" className="space-y-4 mt-3">
                    {/* BEHAVIOR TREND CHART */}
                    <Card className="border shadow-xs overflow-hidden">
                        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <LineChartIcon className="h-4 w-4 text-primary" />
                                    Gráfico de Comportamiento y Evolución Diaria
                                </CardTitle>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Asistió (5.0)
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Tardanza / Penalizada
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

                    {/* CLASS SESSIONS BREAKDOWN TABLE WITH APPLIED CRITERIA */}
                    <Card className="border shadow-xs overflow-hidden">
                        <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        Historial y Desglose por Sesión de Clase
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Detalle de asistencia, criterios disciplinarios aplicados y nota obtenida en cada día.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                                    Nota Base Diaria: 5.0
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-[140px] font-bold">Fecha de Clase</TableHead>
                                            <TableHead className="w-[130px] font-bold">Asistencia</TableHead>
                                            <TableHead className="min-w-[220px] font-bold">Criterios de Desempeño Aplicados</TableHead>
                                            <TableHead className="w-[100px] text-center font-bold">Nota del Día</TableHead>
                                            <TableHead className="font-bold">Observación del Docente</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailyBreakdown.map(d => {
                                            const isAbsent = d.lockedByAbsence;
                                            const isLate = d.attendanceStatus === "LATE";
                                            const isPresent = d.attendanceStatus === "PRESENT";
                                            const applied = d.appliedCriteria || [];

                                            return (
                                                <TableRow key={d.date} className={isAbsent ? "bg-rose-500/[0.04]" : ""}>
                                                    {/* Date */}
                                                    <TableCell className="font-medium">
                                                        <div className="font-semibold">{d.dayName}</div>
                                                        <div className="text-[11px] text-muted-foreground font-mono">{d.date}</div>
                                                    </TableCell>

                                                    {/* Attendance */}
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
                                                                <CheckCircle2 className="h-3 w-3" /> Presente
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {d.attendanceStatus === "EXCUSED" ? "Excusa Justificada" : "Sin Registro"}
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* Applied Criteria */}
                                                    <TableCell>
                                                        {isAbsent ? (
                                                            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                                Inasistencia injustificada: 0.0 automático
                                                            </span>
                                                        ) : applied.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 py-0.5">
                                                                {applied.map((critId, i) => {
                                                                    const matched = config.criteria.find(c => c.id === critId || c.name === critId);
                                                                    const name = matched ? matched.name : critId;
                                                                    const penaltyVal = matched ? matched.penalty : null;

                                                                    return (
                                                                        <Badge
                                                                            key={i}
                                                                            variant="outline"
                                                                            className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 text-[10px] font-medium gap-1 py-0.5"
                                                                        >
                                                                            <span>{name}</span>
                                                                            {penaltyVal !== null && (
                                                                                <span className="font-mono font-bold text-rose-800 dark:text-rose-200">
                                                                                    (-{penaltyVal.toFixed(1)} pts)
                                                                                </span>
                                                                            )}
                                                                        </Badge>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : isLate ? (
                                                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                                                Penalización por llegada tarde (-{config.tardinessPenalty.toFixed(1)} pts)
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                                <Check className="h-3 w-3" />
                                                                Cumplimiento total (Base 5.0)
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Day Final Grade */}
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

                                                    {/* Teacher Observation */}
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

                    {/* Rules info */}
                    <div className="p-4 rounded-xl border bg-muted/20 text-xs text-muted-foreground space-y-1.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-primary" />
                            Reglas Generales de Calificación
                        </div>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                            <li>Cada sesión de clase inicia con una nota base máxima de <strong>5.0</strong>.</li>
                            <li>Las inasistencias injustificadas registran automáticamente <strong>0.0</strong> para ese día.</li>
                            <li>Las llegadas tarde descuentan <strong>-{config.tardinessPenalty ?? 1.0} pts</strong> de la nota del día.</li>
                            <li>Las faltas a los criterios de convivencia o presentación institucional restan la penalización fijada por el instructor.</li>
                            <li>La nota promedio final se calcula promediando todas las sesiones del curso.</li>
                        </ul>
                    </div>
                </TabsContent>

                {/* TAB 2: ENUNCIADO Y RÚBRICA DE CRITERIOS */}
                <TabsContent value="statement" className="space-y-4 mt-3">
                    {/* CRITERIA RUBRIC CARD */}
                    <Card className="border shadow-xs overflow-hidden">
                        <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Award className="h-4 w-4 text-primary" />
                                        Rúbrica de Criterios y Penalizaciones Diarias
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Criterios definidos por el instructor que penalizan la nota máxima del día (5.0).
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="font-mono text-xs font-bold shrink-0">
                                    Nota Máxima del Día: 5.0
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-3 bg-primary/[0.03] border-b text-xs text-muted-foreground">
                                <p>
                                    Cada sesión inicia con una calificación de <strong>5.0 puntos</strong>. En caso de cometer alguna de las faltas descritas a continuación, el docente aplicará el descuento correspondiente sobre la nota del día actual.
                                </p>
                            </div>

                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="font-bold min-w-[200px]">Criterio de Desempeño</TableHead>
                                        <TableHead className="w-[140px] text-center font-bold">Penalización</TableHead>
                                        <TableHead className="w-[140px] text-center font-bold">Nota Resultante</TableHead>
                                        <TableHead className="font-bold min-w-[220px]">Descripción / Alcance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {config.criteria.map((crit, index) => {
                                        const resultingGrade = Math.max(0.0, 5.0 - crit.penalty);
                                        return (
                                            <TableRow key={crit.id || index} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="font-semibold text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                                        <span>{crit.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-bold">
                                                        -{crit.penalty.toFixed(1)} pts
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                    <span className="font-semibold text-muted-foreground">
                                                        5.0 - {crit.penalty.toFixed(1)} ={" "}
                                                    </span>
                                                    <strong className="text-foreground font-bold">
                                                        {resultingGrade.toFixed(1)} / 5.0
                                                    </strong>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {crit.description || "Aplica descuento directo sobre la nota máxima diaria de 5.0"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {/* Standard Institutional Attendance Rules */}
                                    <TableRow className="bg-muted/15 font-medium">
                                        <TableCell className="font-semibold text-amber-700 dark:text-amber-300">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                <span>Llegada Tarde (Tardanza en Asistencia)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                                                -{(config.tardinessPenalty ?? 1.0).toFixed(1)} pts
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs">
                                            <span className="font-semibold text-muted-foreground">
                                                5.0 - {(config.tardinessPenalty ?? 1.0).toFixed(1)} ={" "}
                                            </span>
                                            <strong className="text-foreground font-bold">
                                                {(5.0 - (config.tardinessPenalty ?? 1.0)).toFixed(1)} / 5.0
                                            </strong>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            Retardo en el ingreso a la jornada de clase
                                        </TableCell>
                                    </TableRow>

                                    <TableRow className="bg-rose-500/[0.04] font-medium">
                                        <TableCell className="font-semibold text-rose-700 dark:text-rose-400">
                                            <div className="flex items-center gap-2">
                                                <UserX className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                <span>Inasistencia Injustificada a Clase</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                                            <Badge className="bg-rose-600 text-white text-xs font-bold">
                                                0.0 Automático
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs">
                                            <strong className="text-rose-600 dark:text-rose-400 font-bold">
                                                0.0 / 5.0
                                            </strong>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            Falta no justificada a la sesión de clase. Bloquea la nota en cero.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* ENUNCIADO MARKDOWN SECTION */}
                    {activity.statement && (
                        <div data-color-mode={mode} className="rounded-xl border p-4 sm:p-5 bg-card w-full max-w-full overflow-x-auto shadow-xs">
                            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-foreground">
                                <FileText className="h-4 w-4 text-primary" />
                                Enunciado de la Actividad
                            </h3>
                            <MDEditor.Markdown
                                source={activity.statement}
                                style={{ background: "transparent" }}
                            />
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
