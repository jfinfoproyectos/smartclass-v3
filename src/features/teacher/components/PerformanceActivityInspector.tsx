"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
    getPerformanceEvaluationDataAction,
    saveStudentPerformanceAction,
    batchSavePerformanceAction,
} from "../actions/performanceActions";
import {
    type StudentPerformanceRecord,
    type StudentDayPerformance,
} from "../utils/performanceUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    TrendingUp,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserX,
    Users,
    Search,
    RefreshCw,
    Save,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    Table as TableIcon,
    LineChart as LineChartIcon,
    Award,
    Check,
    Info,
    ShieldAlert,
    Download,
    X,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ReferenceLine,
    Area,
    AreaChart,
} from "recharts";

interface PerformanceActivityInspectorProps {
    activity: any;
    studentsList: any[];
    onClose?: () => void;
    initialStudentId?: string | null;
}

export function PerformanceActivityInspector({
    activity,
    studentsList,
    onClose,
    initialStudentId,
}: PerformanceActivityInspectorProps) {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [data, setData] = useState<{
        performanceConfig: any;
        classDates: any[];
        students: StudentPerformanceRecord[];
    } | null>(null);

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"detail" | "matrix">("detail");
    const [editedDays, setEditedDays] = useState<Record<string, Record<string, { grade: number; note: string }>>>({});

    // Load performance data from database
    const loadData = async (showToast = false) => {
        setLoading(true);
        try {
            const res = await getPerformanceEvaluationDataAction(activity.id, activity.courseId);
            setData(res);
            if (!selectedStudentId && res.students.length > 0) {
                setSelectedStudentId(res.students[0].studentId);
            }
            if (showToast) {
                toast.success("Asistencias y desempeño sincronizados correctamente");
            }
        } catch (error: any) {
            console.error("Error loading performance data:", error);
            toast.error("Error al cargar datos de desempeño: " + (error?.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activity.id, activity.courseId]);

    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!data?.students) return [];
        if (!searchQuery.trim()) return data.students;
        const q = searchQuery.toLowerCase();
        return data.students.filter(
            s => s.studentName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.identificacion.includes(q)
        );
    }, [data?.students, searchQuery]);

    // Active selected student
    const currentStudent = useMemo(() => {
        if (!data?.students) return null;
        return data.students.find(s => s.studentId === selectedStudentId) || data.students[0] || null;
    }, [data?.students, selectedStudentId]);

    // Current days for the active student, applying local unsaved edits
    const activeStudentDays: StudentDayPerformance[] = useMemo(() => {
        if (!currentStudent) return [];
        const studentEdits = editedDays[currentStudent.studentId] || {};

        return currentStudent.days.map(d => {
            const edit = studentEdits[d.date];
            if (edit) {
                return {
                    ...d,
                    finalDayGrade: d.lockedByAbsence ? 0.0 : edit.grade,
                    manualGrade: d.lockedByAbsence ? null : edit.grade,
                    teacherNote: edit.note !== undefined ? edit.note : d.teacherNote,
                };
            }
            return d;
        });
    }, [currentStudent, editedDays]);

    // Live calculated final average for the active student
    const activeFinalAverage = useMemo(() => {
        if (activeStudentDays.length === 0) return 5.0;
        const sum = activeStudentDays.reduce((acc, d) => acc + d.finalDayGrade, 0);
        return Number((sum / activeStudentDays.length).toFixed(2));
    }, [activeStudentDays]);

    // Live stats for the active student
    const activeStats = useMemo(() => {
        let present = 0;
        let late = 0;
        let absent = 0;
        let excused = 0;

        activeStudentDays.forEach(d => {
            if (d.attendanceStatus === "ABSENT") absent++;
            else if (d.attendanceStatus === "LATE") late++;
            else if (d.attendanceStatus === "EXCUSED") excused++;
            else if (d.attendanceStatus === "PRESENT") present++;
        });

        return {
            total: activeStudentDays.length,
            present,
            late,
            absent,
            excused,
        };
    }, [activeStudentDays]);

    // Chart data for Behavior progression graph
    const chartData = useMemo(() => {
        return activeStudentDays.map(d => {
            let statusLabel = "Asistencia";
            if (d.attendanceStatus === "ABSENT") statusLabel = "Inasistencia (0.0)";
            else if (d.attendanceStatus === "LATE") statusLabel = `Llegada Tarde (-${d.penalty.toFixed(1)})`;
            else if (d.attendanceStatus === "EXCUSED") statusLabel = "Excusa";

            return {
                date: d.formattedDate,
                fullDate: d.date,
                grade: d.finalDayGrade,
                baseGrade: d.baseGrade,
                status: d.attendanceStatus,
                statusLabel,
                note: d.teacherNote || "",
                isAbsent: d.lockedByAbsence,
            };
        });
    }, [activeStudentDays]);

    // Course summary metrics
    const courseStats = useMemo(() => {
        if (!data?.students || data.students.length === 0) return { avg: 0, passingCount: 0, total: 0 };
        const total = data.students.length;
        const avg = data.students.reduce((acc, s) => acc + s.finalAverage, 0) / total;
        const passingCount = data.students.filter(s => s.finalAverage >= 3.0).length;
        return {
            avg: Number(avg.toFixed(2)),
            passingCount,
            total,
        };
    }, [data?.students]);

    // Edit a day's grade or note
    const handleDayGradeChange = (date: string, newGrade: number) => {
        if (!currentStudent) return;
        const clamped = Math.min(5.0, Math.max(0.0, Number(newGrade)));
        setEditedDays(prev => {
            const studentEdits = prev[currentStudent.studentId] || {};
            const existing = studentEdits[date] || {
                grade: activeStudentDays.find(d => d.date === date)?.finalDayGrade ?? 5.0,
                note: activeStudentDays.find(d => d.date === date)?.teacherNote ?? ""
            };
            return {
                ...prev,
                [currentStudent.studentId]: {
                    ...studentEdits,
                    [date]: { ...existing, grade: clamped },
                }
            };
        });
    };

    const handleDayNoteChange = (date: string, note: string) => {
        if (!currentStudent) return;
        setEditedDays(prev => {
            const studentEdits = prev[currentStudent.studentId] || {};
            const existing = studentEdits[date] || {
                grade: activeStudentDays.find(d => d.date === date)?.finalDayGrade ?? 5.0,
                note: ""
            };
            return {
                ...prev,
                [currentStudent.studentId]: {
                    ...studentEdits,
                    [date]: { ...existing, note },
                }
            };
        });
    };

    // Save individual student
    const handleSaveCurrentStudent = async () => {
        if (!currentStudent) return;
        setIsSaving(true);
        try {
            await saveStudentPerformanceAction({
                activityId: activity.id,
                courseId: activity.courseId,
                studentId: currentStudent.studentId,
                finalGrade: activeFinalAverage,
                days: activeStudentDays,
            });

            // Update local state to reflect saved grade
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    students: prev.students.map(s => {
                        if (s.studentId === currentStudent.studentId) {
                            return {
                                ...s,
                                days: activeStudentDays,
                                finalAverage: activeFinalAverage,
                                currentGrade: activeFinalAverage,
                                lastSubmittedAt: new Date().toISOString(),
                            };
                        }
                        return s;
                    })
                };
            });

            // Clean local edits for this student
            setEditedDays(prev => {
                const next = { ...prev };
                delete next[currentStudent.studentId];
                return next;
            });

            toast.success(`✓ Calificación de desempeño guardada para ${currentStudent.studentName}: ${activeFinalAverage.toFixed(1)} / 5.0`);
        } catch (error: any) {
            console.error("Error saving student performance:", error);
            toast.error("Error al guardar: " + (error?.message || "Error desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    // Batch save all students
    const handleBatchSaveAll = async () => {
        if (!data?.students) return;
        setIsSaving(true);
        try {
            const evaluations = data.students.map(s => {
                const isSelected = s.studentId === currentStudent?.studentId;
                const daysToSave = isSelected ? activeStudentDays : s.days;
                const avgToSave = isSelected ? activeFinalAverage : s.finalAverage;
                return {
                    studentId: s.studentId,
                    finalGrade: avgToSave,
                    days: daysToSave,
                };
            });

            const res = await batchSavePerformanceAction({
                activityId: activity.id,
                courseId: activity.courseId,
                evaluations,
            });

            setEditedDays({});
            await loadData(false);
            toast.success(`✓ Calificaciones de desempeño guardadas para ${res.count} aprendices del curso`);
        } catch (error: any) {
            console.error("Error in batch save:", error);
            toast.error("Error al guardar en lote: " + (error?.message || "Error desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    // Quick score pills
    const quickScores = [5.0, 4.5, 4.0, 3.5, 3.0, 2.0, 0.0];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-semibold text-muted-foreground">Cargando datos de desempeño y asistencia...</p>
            </div>
        );
    }

    if (!data || data.students.length === 0) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                <h3 className="text-base font-bold">No hay estudiantes en este curso</h3>
                <p className="text-xs text-muted-foreground">
                    Para evaluar desempeño, debe haber al menos un estudiante matriculado y aprobado en el curso.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs py-1 px-2.5 font-bold">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Actividad de Desempeño en Clase
                    </Badge>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 font-semibold">
                        <Calendar className="h-3 w-3 mr-1 text-primary" />
                        {data.classDates.length} Sesiones programadas
                    </Badge>
                    <Badge variant="secondary" className="text-xs py-1 px-2 font-mono">
                        Base: {data.performanceConfig.defaultDailyGrade ?? 5.0} | Tardanza: -{data.performanceConfig.tardinessPenalty ?? 1.0} | Falta: 0.0
                    </Badge>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "detail" ? "default" : "ghost"}
                            onClick={() => setViewMode("detail")}
                            className="h-7 text-xs px-2.5 font-semibold gap-1"
                        >
                            <LineChartIcon className="h-3.5 w-3.5" />
                            Detalle & Gráfico
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "matrix" ? "default" : "ghost"}
                            onClick={() => setViewMode("matrix")}
                            className="h-7 text-xs px-2.5 font-semibold gap-1"
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            Matriz Global
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={loading}
                        className="h-7 text-xs font-semibold gap-1.5"
                        title="Recargar registros de asistencia del curso"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Sincronizar Asistencia</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleBatchSaveAll}
                        disabled={isSaving}
                        className="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>Guardar Todo</span>
                    </Button>

                    {onClose && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-7 text-xs font-semibold gap-1 hover:bg-muted"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Cerrar</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* MATRIX VIEW */}
            {viewMode === "matrix" ? (
                <Card className="border shadow-xs overflow-hidden">
                    <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TableIcon className="h-4 w-4 text-primary" />
                                    Matriz de Desempeño y Asistencia del Curso
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Visualiza el comportamiento de todos los estudiantes a lo largo de las {data.classDates.length} fechas de clase.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-bold">
                                    Promedio General: {courseStats.avg.toFixed(2)} / 5.0
                                </Badge>
                                <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    Aprobados: {courseStats.passingCount} / {courseStats.total}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="font-bold min-w-[180px] sticky left-0 bg-background z-10 border-r">
                                        Aprendiz
                                    </TableHead>
                                    {data.classDates.map(cd => (
                                        <TableHead key={cd.date} className="text-center font-bold px-2 whitespace-nowrap min-w-[70px]">
                                            <div className="text-[10px] text-muted-foreground">{cd.dayName.slice(0, 3)}</div>
                                            <div className="text-xs">{cd.date.slice(5)}</div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold min-w-[90px] bg-primary/5 sticky right-0 z-10 border-l">
                                        Promedio
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.students.map(st => {
                                    const isSelected = st.studentId === selectedStudentId;
                                    return (
                                        <TableRow
                                            key={st.studentId}
                                            className={`hover:bg-muted/50 cursor-pointer ${isSelected ? "bg-primary/5 font-semibold" : ""}`}
                                            onClick={() => {
                                                setSelectedStudentId(st.studentId);
                                                setViewMode("detail");
                                            }}
                                        >
                                            <TableCell className="font-medium sticky left-0 bg-background z-10 border-r py-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={st.image || undefined} />
                                                        <AvatarFallback className="text-[10px]">{st.studentName.slice(0, 2)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="truncate max-w-[140px]">
                                                        <div className="truncate font-semibold">{st.studentName}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{st.identificacion}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {st.days.map(d => {
                                                let cellBg = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                                                let text = d.finalDayGrade.toFixed(1);
                                                if (d.attendanceStatus === "ABSENT") {
                                                    cellBg = "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold";
                                                    text = "0.0";
                                                } else if (d.attendanceStatus === "LATE") {
                                                    cellBg = "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold";
                                                }

                                                return (
                                                    <TableCell key={d.date} className="text-center p-1">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono ${cellBg}`} title={`${d.dayName} ${d.date}: ${d.attendanceStatus} - Nota: ${d.finalDayGrade}`}>
                                                            {text}
                                                        </span>
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-right font-bold sticky right-0 bg-background z-10 border-l">
                                                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${st.finalAverage >= 3.0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-rose-600 dark:text-rose-400 bg-rose-500/10"}`}>
                                                    {st.finalAverage.toFixed(2)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                /* DETAIL & BEHAVIOR CHART VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Column: Student Selector & List */}
                    <div className="lg:col-span-4 space-y-3">
                        <Card className="border shadow-xs">
                            <CardHeader className="p-3 pb-2 border-b bg-muted/20">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="text-xs font-bold flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                        Aprendices ({data.students.length})
                                    </Label>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        Prom. Curso: {courseStats.avg.toFixed(1)}
                                    </Badge>
                                </div>
                                <div className="relative mt-2">
                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre o doc..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="h-8 pl-8 text-xs bg-background"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-1 max-h-[580px] overflow-y-auto divide-y divide-border/40">
                                {filteredStudents.map(st => {
                                    const isSelected = st.studentId === currentStudent?.studentId;
                                    const avg = isSelected ? activeFinalAverage : st.finalAverage;
                                    const hasEdits = Boolean(editedDays[st.studentId]);

                                    return (
                                        <button
                                            key={st.studentId}
                                            type="button"
                                            onClick={() => setSelectedStudentId(st.studentId)}
                                            className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                                isSelected
                                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                                    : "hover:bg-muted/60 text-foreground"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar className="h-7 w-7 border shrink-0">
                                                    <AvatarImage src={st.image || undefined} />
                                                    <AvatarFallback className="text-[10px] font-bold">
                                                        {st.studentName.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="truncate min-w-0">
                                                    <div className="truncate text-xs font-semibold leading-tight flex items-center gap-1.5">
                                                        <span>{st.studentName}</span>
                                                        {hasEdits && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Cambios sin guardar" />
                                                        )}
                                                    </div>
                                                    <div className={`text-[10px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                        {st.identificacion} • {st.stats.absentDays > 0 ? `⚠️ ${st.stats.absentDays} falta(s)` : "Asistencia 100%"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                                                    isSelected
                                                        ? "bg-white/20 text-white"
                                                        : avg >= 3.0
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                                }`}>
                                                    {avg.toFixed(1)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Selected Student Evaluation, Trend Chart & Daily Grades Table */}
                    <div className="lg:col-span-8 space-y-4">
                        {currentStudent && (
                            <>
                                {/* Student Header & KPI Cards */}
                                <Card className="border shadow-xs overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.03]">
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xs">
                                                    <AvatarImage src={currentStudent.image || undefined} />
                                                    <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                                        {currentStudent.studentName.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-base sm:text-lg leading-tight">
                                                            {currentStudent.studentName}
                                                        </h3>
                                                        <Badge variant={activeFinalAverage >= 3.0 ? "default" : "destructive"} className="text-[10px] font-bold">
                                                            {activeFinalAverage >= 4.5 ? "Sobresaliente" : activeFinalAverage >= 3.0 ? "Aprobado" : "Reprobado"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Documento: {currentStudent.identificacion} • Correo: {currentStudent.email}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Score Big Display & Save Button */}
                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                                <div className="text-right">
                                                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                        Nota Promedio Final
                                                    </div>
                                                    <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                                                        activeFinalAverage >= 3.0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                    }`}>
                                                        {activeFinalAverage.toFixed(2)}
                                                        <span className="text-xs text-muted-foreground font-normal ml-1">/ 5.0</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={handleSaveCurrentStudent}
                                                    disabled={isSaving}
                                                    className="h-10 px-4 font-bold gap-2 bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    <span>Guardar Nota</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Attendance & Performance Summary Badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4">
                                            <div className="p-2.5 rounded-xl border bg-background/80 space-y-0.5">
                                                <div className="text-[10px] font-medium text-muted-foreground uppercase">Sesiones Totales</div>
                                                <div className="text-base font-bold font-mono text-foreground flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                                    {activeStats.total} días
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-0.5">
                                                <div className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 uppercase">Asistencias</div>
                                                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    {activeStats.present} (5.0)
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-0.5">
                                                <div className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase">Llegadas Tarde</div>
                                                <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {activeStats.late} (penalizada)
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl border bg-rose-500/5 border-rose-500/20 space-y-0.5">
                                                <div className="text-[10px] font-medium text-rose-700 dark:text-rose-300 uppercase">Inasistencias</div>
                                                <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                                    <UserX className="h-3.5 w-3.5" />
                                                    {activeStats.absent} (0.0)
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl border bg-blue-500/5 border-blue-500/20 space-y-0.5 col-span-2 sm:col-span-1">
                                                <div className="text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase">Escala</div>
                                                <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                    <Award className="h-3.5 w-3.5" />
                                                    0.0 a 5.0
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* GRÁFICO DE COMPORTAMIENTO (Behavior Trend Chart) */}
                                <Card className="border shadow-xs overflow-hidden">
                                    <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-primary" />
                                                Gráfico de Comportamiento y Evolución Diaria
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Asistencia (5.0)
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
                                            Curva de desempeño por sesión de clase. Las inasistencias caen a 0.0 y las tardanzas aplican penalización sobre la base.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-5">
                                        <div className="h-56 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
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
                                                        stroke="var(--primary)"
                                                        strokeWidth={2.5}
                                                        fillOpacity={1}
                                                        fill="url(#performanceGradient)"
                                                        dot={(props: any) => {
                                                            const { cx, cy, payload } = props;
                                                            let fill = "#10b981"; // Green
                                                            if (payload.status === "ABSENT") fill = "#ef4444"; // Red
                                                            else if (payload.status === "LATE") fill = "#f59e0b"; // Amber
                                                            return (
                                                                <circle
                                                                    key={`${cx}-${cy}`}
                                                                    cx={cx}
                                                                    cy={cy}
                                                                    r={4.5}
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

                                {/* DAILY SESSIONS & TEACHER GRADING TABLE */}
                                <Card className="border shadow-xs overflow-hidden">
                                    <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-primary" />
                                                    Calificación por Sesión de Clase
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Las inasistencias califican automáticamente en 0.0. Los días con asistencia inician en 5.0 y puedes ajustar la nota y agregar comentarios.
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span>Ajusta la nota con las píldoras rápidas o el campo numérico</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table className="text-xs">
                                                <TableHeader>
                                                    <TableRow className="bg-muted/30">
                                                        <TableHead className="w-[140px] font-bold">Fecha de Clase</TableHead>
                                                        <TableHead className="w-[130px] font-bold">Estado Asistencia</TableHead>
                                                        <TableHead className="w-[180px] font-bold">Calificación del Día (0.0 - 5.0)</TableHead>
                                                        <TableHead className="font-bold">Observación / Compromiso</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {activeStudentDays.map(d => {
                                                        const isAbsent = d.lockedByAbsence;
                                                        const isLate = d.attendanceStatus === "LATE";
                                                        const isPresent = d.attendanceStatus === "PRESENT";

                                                        return (
                                                            <TableRow key={d.date} className={isAbsent ? "bg-rose-500/[0.04]" : ""}>
                                                                {/* Date */}
                                                                <TableCell className="font-medium">
                                                                    <div className="font-semibold">{d.dayName}</div>
                                                                    <div className="text-[11px] text-muted-foreground font-mono">{d.date}</div>
                                                                </TableCell>

                                                                {/* Attendance Status Badge */}
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
                                                                            <CheckCircle2 className="h-3 w-3" /> Asistió (Base 5.0)
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px]">
                                                                            {d.attendanceStatus === "EXCUSED" ? "Excusa Justificada" : "Sin Registro"}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>

                                                                {/* Grade and Quick Score Buttons */}
                                                                <TableCell>
                                                                    {isAbsent ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                                                0.0
                                                                            </span>
                                                                            <span className="text-[10px] text-rose-600/80 italic">Bloqueado por falta</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <Input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="5"
                                                                                    step="0.1"
                                                                                    value={d.finalDayGrade}
                                                                                    onChange={e => handleDayGradeChange(d.date, parseFloat(e.target.value) || 0)}
                                                                                    className="h-7 w-20 text-xs font-mono font-bold text-center bg-background"
                                                                                />
                                                                                <span className="text-xs text-muted-foreground font-mono">/ 5.0</span>
                                                                            </div>

                                                                            {/* Quick Pills */}
                                                                            <div className="flex flex-wrap items-center gap-1">
                                                                                {quickScores.map(score => (
                                                                                    <button
                                                                                        key={score}
                                                                                        type="button"
                                                                                        onClick={() => handleDayGradeChange(d.date, score)}
                                                                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                                                                            d.finalDayGrade === score
                                                                                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                                                                                : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                                                                                        }`}
                                                                                    >
                                                                                        {score.toFixed(1)}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </TableCell>

                                                                {/* Daily Teacher Note */}
                                                                <TableCell>
                                                                    <Input
                                                                        placeholder={isAbsent ? "Falta registrada en asistencia..." : "Ej: Excelente participación, cumplió con la práctica..."}
                                                                        value={d.teacherNote}
                                                                        onChange={e => handleDayNoteChange(d.date, e.target.value)}
                                                                        className="h-8 text-xs bg-background"
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
