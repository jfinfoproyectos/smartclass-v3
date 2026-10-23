"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import {
    getPerformanceEvaluationDataAction,
    saveStudentPerformanceAction,
    batchSavePerformanceAction,
    updatePerformanceCriteriaAction,
    recordPerformanceAttendanceAction,
} from "../actions/performanceActions";
import {
    type StudentPerformanceRecord,
    type StudentDayPerformance,
    DEFAULT_PERFORMANCE_CRITERIA,
    computeStudentDayGrade,
    type PerformancePenaltyCriterion,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Table as TableIcon,
    LineChart as LineChartIcon,
    Award,
    Info,
    ShieldAlert,
    X,
    Lock,
    Wand2,
    SlidersHorizontal,
    CheckCheck,
    Check,
    Plus,
    Trash2,
    Tag,
    RotateCcw,
    Loader2,
    Cloud,
    ChevronDown,
    FileText,
    UserCheck,
} from "lucide-react";
import { getTodayDateString } from "@/lib/dateUtils";
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

/**
 * Lightweight SVG sparkline chart displayed in the middle of each student row.
 * Shows daily grade evolution across all sessions with color-coded dots,
 * 3.0 passing threshold, and active session pulse indicator.
 */
function StudentSparkline({
    days,
    activeDate,
}: {
    days: StudentDayPerformance[];
    activeDate?: string;
}) {
    if (!days || days.length === 0) {
        return <span className="text-[10px] text-muted-foreground">—</span>;
    }

    const width = 170;
    const height = 36;
    const padX = 8;
    const padY = 6;
    const n = days.length;

    const getX = (idx: number) => {
        if (n <= 1) return width / 2;
        return padX + (idx / (n - 1)) * (width - 2 * padX);
    };

    const getY = (grade: number) => {
        const clamped = Math.max(0, Math.min(5, grade));
        return (height - padY) - (clamped / 5.0) * (height - 2 * padY);
    };

    const passThresholdY = getY(3.0);

    const points = days.map((d, idx) => ({
        x: getX(idx),
        y: getY(d.finalDayGrade),
        day: d,
    }));

    let pathD = "";
    if (points.length === 1) {
        pathD = `M ${points[0].x} ${points[0].y}`;
    } else {
        pathD = points.reduce((acc, pt, i) => {
            return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
        }, "");
    }

    const areaD = points.length > 1
        ? `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
        : "";

    return (
        <TooltipProvider delayDuration={100}>
            <div className="relative inline-flex items-center justify-center">
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    className="overflow-visible select-none"
                >
                    <defs>
                        <linearGradient id={`grad-${days[0]?.date}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    {/* Minimum passing threshold (3.0) line */}
                    <line
                        x1={padX}
                        y1={passThresholdY}
                        x2={width - padX}
                        y2={passThresholdY}
                        stroke="#e11d48"
                        strokeDasharray="2 2"
                        strokeWidth={0.8}
                        strokeOpacity={0.4}
                    />

                    {/* Soft gradient fill under curve */}
                    {areaD && <path d={areaD} fill={`url(#grad-${days[0]?.date})`} />}

                    {/* Daily evolution line */}
                    {points.length > 1 && (
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Individual points for each day */}
                    {points.map((pt, idx) => {
                        const isSelected = pt.day.date === activeDate;
                        const isAbsent = pt.day.lockedByAbsence || pt.day.attendanceStatus === "ABSENT";
                        const isLate = pt.day.attendanceStatus === "LATE";
                        const grade = pt.day.finalDayGrade;

                        let dotColor = "#10b981";
                        if (isAbsent) dotColor = "#ef4444";
                        else if (isLate || (grade < 4.0 && grade >= 3.0)) dotColor = "#f59e0b";
                        else if (grade < 3.0) dotColor = "#ef4444";

                        return (
                            <g key={idx}>
                                {isSelected && (
                                    <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={6.5}
                                        fill="none"
                                        stroke="var(--primary)"
                                        strokeWidth={1.8}
                                        className="animate-pulse"
                                    />
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <circle
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={isSelected ? 3.8 : 2.6}
                                            fill={dotColor}
                                            stroke="#ffffff"
                                            strokeWidth={1}
                                            className="cursor-pointer hover:r-[5px] transition-all"
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[11px] p-2 space-y-1 shadow-md bg-popover text-popover-foreground border">
                                        <div className="font-bold flex items-center justify-between gap-2">
                                            <span>{pt.day.formattedDate}</span>
                                            <span className="font-mono font-bold text-primary">{grade.toFixed(1)} / 5.0</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {isAbsent ? "⚠️ Inasistencia (0.0)" : isLate ? "⏰ Llegada Tarde" : "✓ Asistió"}
                                        </div>
                                        {pt.day.appliedCriteria && pt.day.appliedCriteria.length > 0 && (
                                            <div className="text-[9px] text-rose-600 dark:text-rose-400 border-t pt-1">
                                                Penalizaciones: {pt.day.appliedCriteria.join(", ")}
                                            </div>
                                        )}
                                        {pt.day.teacherNote && (
                                            <div className="text-[10px] italic border-t pt-0.5 text-muted-foreground">
                                                "{pt.day.teacherNote}"
                                            </div>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </TooltipProvider>
    );
}

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
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const isSaving = saveStatus === "saving";

    const [data, setData] = useState<{
        performanceConfig: any;
        classDates: any[];
        students: StudentPerformanceRecord[];
    } | null>(null);

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId || null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"panel" | "matrix" | "detail">("panel");
    const saveTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

    // Bulk grade custom inputs
    const [bulkDetailCustomGrade, setBulkDetailCustomGrade] = useState("5.0");
    const [bulkMatrixCustomGrade, setBulkMatrixCustomGrade] = useState("5.0");

    // Criteria modal state
    const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
    const [editingCriteria, setEditingCriteria] = useState<PerformancePenaltyCriterion[]>([]);
    const [newCritName, setNewCritName] = useState("");
    const [newCritPenalty, setNewCritPenalty] = useState("1.0");
    const [newCritDesc, setNewCritDesc] = useState("");
    const [isSavingCriteria, setIsSavingCriteria] = useState(false);

    // Auto-save an individual student's performance grades
    const autoSaveStudent = (updatedStudent: StudentPerformanceRecord, immediate = true) => {
        if (saveTimeoutsRef.current[updatedStudent.studentId]) {
            clearTimeout(saveTimeoutsRef.current[updatedStudent.studentId]);
            delete saveTimeoutsRef.current[updatedStudent.studentId];
        }

        const executeSave = async () => {
            setSaveStatus("saving");
            try {
                await saveStudentPerformanceAction({
                    activityId: activity.id,
                    courseId: activity.courseId,
                    studentId: updatedStudent.studentId,
                    finalGrade: updatedStudent.finalAverage,
                    days: updatedStudent.days,
                });
                setSaveStatus("saved");
                setTimeout(() => {
                    setSaveStatus(prev => prev === "saved" ? "idle" : prev);
                }, 2500);
            } catch (err: any) {
                console.error("Auto-save error:", err);
                setSaveStatus("error");
                toast.error("Error al autoguardar calificación");
            }
        };

        if (immediate) {
            executeSave();
        } else {
            setSaveStatus("saving");
            saveTimeoutsRef.current[updatedStudent.studentId] = setTimeout(executeSave, 500);
        }
    };

    // Auto-save batch evaluations
    const autoSaveBatch = async (evaluations: Array<{ studentId: string; finalGrade: number; days: StudentDayPerformance[] }>) => {
        setSaveStatus("saving");
        try {
            await batchSavePerformanceAction({
                activityId: activity.id,
                courseId: activity.courseId,
                evaluations,
            });
            setSaveStatus("saved");
            setTimeout(() => {
                setSaveStatus(prev => prev === "saved" ? "idle" : prev);
            }, 2500);
        } catch (err: any) {
            console.error("Batch auto-save error:", err);
            setSaveStatus("error");
            toast.error("Error al autoguardar en lote");
        }
    };

    // Load performance data from database
    const loadData = async (showToast = false) => {
        setLoading(true);
        try {
            const res = await getPerformanceEvaluationDataAction(activity.id, activity.courseId);
            setData(res);
            if (!selectedStudentId && res.students.length > 0) {
                setSelectedStudentId(res.students[0].studentId);
            }
            if (res.classDates.length > 0 && !selectedDate) {
                // Use regional timezone-safe today string to prevent server/local shifts
                const todayStr = getTodayDateString();
                const todayMatch = res.classDates.find(cd => cd.date === todayStr);
                if (todayMatch) {
                    setSelectedDate(todayMatch.date);
                } else {
                    const pastDates = res.classDates.filter(cd => cd.date <= todayStr);
                    if (pastDates.length > 0) {
                        setSelectedDate(pastDates[pastDates.length - 1].date);
                    } else {
                        setSelectedDate(res.classDates[0].date);
                    }
                }
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

    // Effective days for student (always real-time source of truth)
    const getStudentEffectiveDays = (student: StudentPerformanceRecord): StudentDayPerformance[] => {
        return student.days;
    };

    // Calculate live average for ANY student
    const getStudentAverage = (student: StudentPerformanceRecord): number => {
        if (!student.days || student.days.length === 0) return 5.0;
        const sum = student.days.reduce((acc, d) => acc + d.finalDayGrade, 0);
        return Number((sum / student.days.length).toFixed(2));
    };


    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!data?.students) return [];
        if (!searchQuery.trim()) return data.students;
        const q = searchQuery.toLowerCase();
        return data.students.filter(
            s => s.studentName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.identificacion.includes(q)
        );
    }, [data?.students, searchQuery]);

    // Active selected student for detail view
    const currentStudent = useMemo(() => {
        if (!data?.students || data.students.length === 0) return null;
        return data.students.find(s => s.studentId === selectedStudentId) || data.students[0] || null;
    }, [data?.students, selectedStudentId]);

    // Navigation index in detail view
    const currentStudentIndex = useMemo(() => {
        if (!data?.students || !currentStudent) return 0;
        return data.students.findIndex(s => s.studentId === currentStudent.studentId);
    }, [data?.students, currentStudent]);

    const handlePrevStudent = () => {
        if (!data?.students || data.students.length === 0) return;
        const prevIdx = (currentStudentIndex - 1 + data.students.length) % data.students.length;
        setSelectedStudentId(data.students[prevIdx].studentId);
    };

    const handleNextStudent = () => {
        if (!data?.students || data.students.length === 0) return;
        const nextIdx = (currentStudentIndex + 1) % data.students.length;
        setSelectedStudentId(data.students[nextIdx].studentId);
    };

    // Current days for the active student in detail view
    const activeStudentDays: StudentDayPerformance[] = useMemo(() => {
        if (!currentStudent) return [];
        return getStudentEffectiveDays(currentStudent);
    }, [currentStudent]);

    // Live calculated final average for active student
    const activeFinalAverage = useMemo(() => {
        if (!currentStudent) return 5.0;
        return getStudentAverage(currentStudent);
    }, [currentStudent]);

    // Live stats for active student (correctly counting days without absence as valid present base)
    const activeStats = useMemo(() => {
        let present = 0;
        let late = 0;
        let absent = 0;
        let excused = 0;

        activeStudentDays.forEach(d => {
            if (d.attendanceStatus === "ABSENT") absent++;
            else if (d.attendanceStatus === "LATE") late++;
            else if (d.attendanceStatus === "EXCUSED") excused++;
            else present++;
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
        const sum = data.students.reduce((acc, s) => acc + getStudentAverage(s), 0);
        const avg = sum / total;
        const passingCount = data.students.filter(s => getStudentAverage(s) >= 3.0).length;
        return {
            avg: Number(avg.toFixed(2)),
            passingCount,
            total,
        };
    }, [data?.students]);

    // Edit an individual day's grade (for ANY student, in both views)
    const handleDayGradeChange = (studentId: string, date: string, newGrade: number) => {
        if (!data?.students) return;
        if (date > getTodayDateString()) {
            toast.error("No es posible editar calificaciones en fechas posteriores a la fecha actual.");
            return;
        }
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const day = student.days.find(d => d.date === date);
        if (!day || day.lockedByAbsence) {
            toast.error("Las fechas afectadas por inasistencia están bloqueadas en 0.0 y no se pueden modificar.");
            return;
        }

        const clamped = Math.min(5.0, Math.max(0.0, Number(newGrade)));
        const newDays = student.days.map(d => {
            if (d.date !== date) return d;
            return { ...d, manualGrade: clamped, finalDayGrade: clamped };
        });
        const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
            finalAverage: newAvg,
            currentGrade: newAvg,
        };

        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
            };
        });

        autoSaveStudent(updatedStudent, false);
    };

    // Edit an individual day's observation note
    const handleDayNoteChange = (studentId: string, date: string, note: string) => {
        if (!data?.students) return;
        if (date > getTodayDateString()) {
            toast.error("No es posible editar observaciones en fechas posteriores a la fecha actual.");
            return;
        }
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const day = student.days.find(d => d.date === date);
        if (!day) return;

        const newDays = student.days.map(d => {
            if (d.date !== date) return d;
            return { ...d, teacherNote: note };
        });

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
        };

        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
            };
        });

        autoSaveStudent(updatedStudent, false);
    };

    // Active session date navigation
    const currentSessionIndex = useMemo(() => {
        if (!data?.classDates || !selectedDate) return 0;
        const idx = data.classDates.findIndex(cd => cd.date === selectedDate);
        return idx >= 0 ? idx : 0;
    }, [data?.classDates, selectedDate]);

    const handlePrevSession = () => {
        if (!data?.classDates || data.classDates.length === 0) return;
        const prevIdx = Math.max(0, currentSessionIndex - 1);
        setSelectedDate(data.classDates[prevIdx].date);
    };

    const handleNextSession = () => {
        if (!data?.classDates || data.classDates.length === 0) return;
        const nextIdx = Math.min(data.classDates.length - 1, currentSessionIndex + 1);
        setSelectedDate(data.classDates[nextIdx].date);
    };

    const currentClassDate = useMemo(() => {
        if (!data?.classDates || !selectedDate) return null;
        return data.classDates.find(cd => cd.date === selectedDate) || data.classDates[0] || null;
    }, [data?.classDates, selectedDate]);

    const availableCriteria = useMemo(() => {
        if (data?.performanceConfig?.criteria && Array.isArray(data.performanceConfig.criteria) && data.performanceConfig.criteria.length > 0) {
            return data.performanceConfig.criteria as PerformancePenaltyCriterion[];
        }
        return DEFAULT_PERFORMANCE_CRITERIA;
    }, [data?.performanceConfig?.criteria]);

    // Update attendance status directly from inspector (Inasistencia, Tardanza, Presente, Excusa)
    const handleAttendanceChange = async (
        studentId: string,
        date: string,
        newStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NONE"
    ) => {
        if (!data?.students) return;
        if (date > getTodayDateString()) {
            toast.error("No es posible registrar ni modificar asistencia en fechas posteriores a la fecha actual.");
            return;
        }
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const defaultBase = data.performanceConfig?.defaultDailyGrade ?? 5.0;
        const tardinessPenalty = data.performanceConfig?.tardinessPenalty ?? 1.0;
        const isAbsent = newStatus === "ABSENT";
        const isLate = newStatus === "LATE";
        const penalty = isLate ? tardinessPenalty : 0;

        const newDays = student.days.map(d => {
            if (d.date !== date) return d;

            let finalGrade = defaultBase;
            let manualGrade: number | null = null;
            let appliedCriteria = isAbsent ? [] : (d.appliedCriteria || []);

            if (isAbsent) {
                finalGrade = 0.0;
                manualGrade = null;
            } else if (appliedCriteria.length > 0) {
                finalGrade = computeStudentDayGrade(
                    { lockedByAbsence: false, attendanceStatus: newStatus, appliedCriteria },
                    availableCriteria,
                    tardinessPenalty,
                    defaultBase
                );
                manualGrade = finalGrade;
            } else if (typeof d.manualGrade === "number" && d.manualGrade !== null) {
                let baseManual = Math.min(defaultBase, Math.max(0.0, d.manualGrade));
                if (isLate && baseManual > defaultBase - penalty) {
                    baseManual = Math.max(0.0, defaultBase - penalty);
                }
                manualGrade = baseManual;
                finalGrade = baseManual;
            } else {
                finalGrade = isLate ? Math.max(0.0, defaultBase - penalty) : defaultBase;
            }

            return {
                ...d,
                attendanceStatus: newStatus,
                lockedByAbsence: isAbsent,
                penalty,
                manualGrade,
                finalDayGrade: Number(finalGrade.toFixed(2)),
                appliedCriteria,
            };
        });

        const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
            finalAverage: newAvg,
            currentGrade: newAvg,
        };

        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
            };
        });

        autoSaveStudent(updatedStudent, true);

        try {
            await recordPerformanceAttendanceAction({
                activityId: activity.id,
                courseId: activity.courseId,
                studentId,
                date,
                status: newStatus,
            });
            const statusLabels: Record<string, string> = {
                PRESENT: "Presente (Asistió)",
                LATE: `Llegada Tarde (-${tardinessPenalty.toFixed(1)} pts)`,
                ABSENT: "Inasistencia (0.0 fijo)",
                EXCUSED: "Excusa Justificada",
                NONE: "Sin Registro",
            };
            toast.success(`Asistencia: ${statusLabels[newStatus]} (${student.studentName.split(" ")[0]})`);
        } catch (e: any) {
            console.error("Error updating performance attendance:", e);
            toast.error("Error al sincronizar asistencia: " + (e?.message || ""));
        }
    };

    // Apply a criterion penalty to a student for a specific date
    const handleApplyCriterion = (studentId: string, date: string, criterionId: string) => {
        if (!data?.students) return;
        if (date > getTodayDateString()) {
            toast.error("No es posible aplicar criterios en fechas posteriores a la fecha actual.");
            return;
        }
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const day = student.days.find(d => d.date === date);
        if (!day) return;
        if (day.lockedByAbsence) {
            toast.error("El aprendiz tiene inasistencia registrada (0.0 fijo) y no puede penalizarse con criterios.");
            return;
        }

        const currentApplied = day.appliedCriteria || [];
        if (currentApplied.includes(criterionId)) {
            toast.info("Este criterio ya ha sido aplicado a esta fecha.");
            return;
        }

        const nextApplied = [...currentApplied, criterionId];
        const newGrade = computeStudentDayGrade(
            { lockedByAbsence: false, attendanceStatus: day.attendanceStatus, appliedCriteria: nextApplied },
            availableCriteria,
            data.performanceConfig.tardinessPenalty ?? 1.0,
            data.performanceConfig.defaultDailyGrade ?? 5.0
        );

        const newDays = student.days.map(d => {
            if (d.date !== date) return d;
            return {
                ...d,
                manualGrade: newGrade,
                finalDayGrade: newGrade,
                appliedCriteria: nextApplied,
            };
        });
        const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
            finalAverage: newAvg,
            currentGrade: newAvg,
        };

        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
            };
        });

        autoSaveStudent(updatedStudent, true);

        const crit = availableCriteria.find(c => c.id === criterionId || c.name === criterionId);
        toast.success(`Criterio aplicado a ${student.studentName.split(" ")[0]}: -${crit?.penalty ?? 0} pts (Nota: ${newGrade.toFixed(1)})`);
    };

    // Remove an applied criterion penalty
    const handleRemoveCriterion = (studentId: string, date: string, criterionId: string) => {
        if (!data?.students) return;
        if (date > getTodayDateString()) {
            toast.error("No es posible modificar criterios en fechas posteriores a la fecha actual.");
            return;
        }
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const day = student.days.find(d => d.date === date);
        if (!day || day.lockedByAbsence) return;

        const currentApplied = day.appliedCriteria || [];
        const nextApplied = currentApplied.filter(c => c !== criterionId);
        const newGrade = computeStudentDayGrade(
            { lockedByAbsence: false, attendanceStatus: day.attendanceStatus, appliedCriteria: nextApplied },
            availableCriteria,
            data.performanceConfig.tardinessPenalty ?? 1.0,
            data.performanceConfig.defaultDailyGrade ?? 5.0
        );

        const newDays = student.days.map(d => {
            if (d.date !== date) return d;
            return {
                ...d,
                manualGrade: newGrade,
                finalDayGrade: newGrade,
                appliedCriteria: nextApplied,
            };
        });
        const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
            finalAverage: newAvg,
            currentGrade: newAvg,
        };

        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
            };
        });

        autoSaveStudent(updatedStudent, true);
        toast.info(`Criterio retirado. Nota recalculada: ${newGrade.toFixed(1)}`);
    };

    // Quick set 5.0 to all present on the selected date
    const handleSetPerfectToPresentToday = () => {
        if (!data?.students || !selectedDate) return;
        if (selectedDate > getTodayDateString()) {
            toast.error("No es posible calificar en fechas posteriores a la fecha actual.");
            return;
        }
        let count = 0;
        const evaluationsToSave: Array<{ studentId: string; finalGrade: number; days: StudentDayPerformance[] }> = [];

        const updatedStudents = data.students.map(st => {
            const day = st.days.find(d => d.date === selectedDate);
            if (!day || day.lockedByAbsence) return st;

            count++;
            const newDays = st.days.map(d => {
                if (d.date !== selectedDate) return d;
                return {
                    ...d,
                    manualGrade: 5.0,
                    finalDayGrade: 5.0,
                    appliedCriteria: [],
                };
            });
            const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

            const updated = {
                ...st,
                days: newDays,
                finalAverage: newAvg,
                currentGrade: newAvg,
            };
            evaluationsToSave.push({
                studentId: updated.studentId,
                finalGrade: updated.finalAverage,
                days: updated.days,
            });
            return updated;
        });

        setData(prev => prev ? { ...prev, students: updatedStudents } : prev);
        if (evaluationsToSave.length > 0) {
            autoSaveBatch(evaluationsToSave);
        }
        toast.success(`Nota 5.0 asignada a ${count} aprendices presentes en la sesión`);
    };

    // Save criteria from modal
    const handleSaveCriteria = async () => {
        if (editingCriteria.length === 0) {
            toast.error("Debe existir al menos un criterio de evaluación.");
            return;
        }
        setIsSavingCriteria(true);
        try {
            await updatePerformanceCriteriaAction({
                activityId: activity.id,
                courseId: activity.courseId,
                criteria: editingCriteria,
            });

            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    performanceConfig: {
                        ...(prev.performanceConfig || {}),
                        criteria: editingCriteria,
                    }
                };
            });

            setIsCriteriaModalOpen(false);
            toast.success("✓ Criterios de evaluación actualizados y sincronizados con el enunciado");
        } catch (error: any) {
            console.error("Error saving criteria:", error);
            toast.error("Error al guardar criterios: " + (error?.message || "Error desconocido"));
        } finally {
            setIsSavingCriteria(false);
        }
    };

    // Bulk modify all valid (non-absent) sessions of ONE student
    const handleApplyGradeToStudent = (studentId: string, targetGrade: number) => {
        if (!data?.students) return;
        const student = data.students.find(s => s.studentId === studentId);
        if (!student) return;

        const clamped = Math.min(5.0, Math.max(0.0, Number(targetGrade)));
        let modifiedCount = 0;

        const newDays = student.days.map(d => {
            if (d.lockedByAbsence) return d;
            modifiedCount++;
            return {
                ...d,
                manualGrade: clamped,
                finalDayGrade: clamped,
            };
        });
        const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));

        const updatedStudent: StudentPerformanceRecord = {
            ...student,
            days: newDays,
            finalAverage: newAvg,
            currentGrade: newAvg,
        };

        setData(prev => prev ? {
            ...prev,
            students: prev.students.map(s => s.studentId === studentId ? updatedStudent : s),
        } : prev);

        autoSaveStudent(updatedStudent, true);
        toast.success(`Nota ${clamped.toFixed(1)} asignada a ${modifiedCount} sesiones de ${student.studentName.split(" ")[0]} (inasistencias protegidas en 0.0)`);
    };

    // Bulk modify all valid students for a specific date column
    const handleApplyGradeToColumn = (date: string, targetGrade: number) => {
        if (!data?.students) return;
        const clamped = Math.min(5.0, Math.max(0.0, Number(targetGrade)));
        let modifiedCount = 0;
        const evaluationsToSave: Array<{ studentId: string; finalGrade: number; days: StudentDayPerformance[] }> = [];

        const updatedStudents = data.students.map(st => {
            const day = st.days.find(d => d.date === date);
            if (!day || day.lockedByAbsence) return st;

            modifiedCount++;
            const newDays = st.days.map(d => {
                if (d.date !== date) return d;
                return {
                    ...d,
                    manualGrade: clamped,
                    finalDayGrade: clamped,
                };
            });
            const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));
            const updated = {
                ...st,
                days: newDays,
                finalAverage: newAvg,
                currentGrade: newAvg,
            };
            evaluationsToSave.push({
                studentId: updated.studentId,
                finalGrade: updated.finalAverage,
                days: updated.days,
            });
            return updated;
        });

        setData(prev => prev ? { ...prev, students: updatedStudents } : prev);
        if (evaluationsToSave.length > 0) {
            autoSaveBatch(evaluationsToSave);
        }
        toast.success(`Nota ${clamped.toFixed(1)} asignada a ${modifiedCount} aprendices para la fecha seleccionada`);
    };

    // Bulk modify ALL valid sessions of ALL students
    const handleApplyGradeToAllStudents = (targetGrade: number) => {
        if (!data?.students) return;
        const clamped = Math.min(5.0, Math.max(0.0, Number(targetGrade)));
        let totalUpdated = 0;
        const evaluationsToSave: Array<{ studentId: string; finalGrade: number; days: StudentDayPerformance[] }> = [];

        const updatedStudents = data.students.map(st => {
            const newDays = st.days.map(d => {
                if (d.lockedByAbsence) return d;
                totalUpdated++;
                return {
                    ...d,
                    manualGrade: clamped,
                    finalDayGrade: clamped,
                };
            });
            const newAvg = Number((newDays.reduce((acc, d) => acc + d.finalDayGrade, 0) / (newDays.length || 1)).toFixed(2));
            const updated = {
                ...st,
                days: newDays,
                finalAverage: newAvg,
                currentGrade: newAvg,
            };
            evaluationsToSave.push({
                studentId: updated.studentId,
                finalGrade: updated.finalAverage,
                days: updated.days,
            });
            return updated;
        });

        setData(prev => prev ? { ...prev, students: updatedStudents } : prev);
        if (evaluationsToSave.length > 0) {
            autoSaveBatch(evaluationsToSave);
        }
        toast.success(`Nota ${clamped.toFixed(1)} asignada a todas las sesiones válidas de todos los aprendices (inasistencias preservadas en 0.0)`);
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

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    {/* Session Selector (Evaluation Date) */}
                    {data.classDates.length > 0 && (
                        <div className="flex items-center gap-1 border rounded-lg px-2 py-0.5 bg-background shadow-2xs">
                            <span className="text-[11px] font-semibold text-muted-foreground mr-1 hidden sm:inline">
                                Sesión:
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handlePrevSession}
                                disabled={currentSessionIndex === 0}
                                className="h-6 w-6 p-0 hover:bg-muted"
                                title="Sesión anterior"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>

                            <Select value={selectedDate} onValueChange={setSelectedDate}>
                                <SelectTrigger className="h-6 text-xs font-semibold border-none shadow-none px-1.5 gap-1.5 bg-transparent min-w-[130px]">
                                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <SelectValue placeholder="Elegir fecha" />
                                </SelectTrigger>
                                <SelectContent align="center" className="text-xs">
                                    {data.classDates.map((cd, i) => (
                                        <SelectItem key={cd.date} value={cd.date} className="cursor-pointer text-xs">
                                            Sesión {i + 1}: {cd.formattedDate} ({cd.dayName})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleNextSession}
                                disabled={currentSessionIndex === data.classDates.length - 1}
                                className="h-6 w-6 p-0 hover:bg-muted"
                                title="Siguiente sesión"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    {/* Configure Criteria Button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditingCriteria([...availableCriteria]);
                            setIsCriteriaModalOpen(true);
                        }}
                        className="h-7 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5 text-primary"
                        title="Configurar criterios y penalizaciones de desempeño"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Configurar Criterios</span>
                    </Button>

                    {/* View Switcher: Panel con Gráfico vs Matriz Global vs Vista Individual */}
                    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "panel" ? "default" : "ghost"}
                            onClick={() => setViewMode("panel")}
                            className="h-7 text-xs px-2.5 font-semibold gap-1.5"
                            title="Panel con Gráfico evolutivo en el intermedio y Selector de Criterios a la derecha"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Panel Rápido</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "matrix" ? "default" : "ghost"}
                            onClick={() => setViewMode("matrix")}
                            className="h-7 text-xs px-2.5 font-semibold gap-1.5"
                            title="Matriz de todas las fechas"
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            <span>Matriz Global</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === "detail" ? "default" : "ghost"}
                            onClick={() => setViewMode("detail")}
                            className="h-7 text-xs px-2.5 font-semibold gap-1.5"
                            title="Detalle individual por estudiante"
                        >
                            <LineChartIcon className="h-3.5 w-3.5" />
                            <span>Individual</span>
                        </Button>
                    </div>

                    {/* Auto-save Status Indicator */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-background/80 shadow-2xs select-none">
                        {saveStatus === "saving" ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Guardando...</span>
                            </>
                        ) : saveStatus === "saved" ? (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Guardado</span>
                            </>
                        ) : saveStatus === "error" ? (
                            <>
                                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">Error al guardar</span>
                            </>
                        ) : (
                            <>
                                <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Autoguardado</span>
                            </>
                        )}
                    </div>

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

            {/* ========================================================================= */}
            {/* 1. PANEL PRINCIPAL: TABLA CON GRÁFICO INTERMEDIO Y CRITERIOS A LA DERECHA */}
            {/* ========================================================================= */}
            {viewMode === "panel" && (
                <Card className="border shadow-xs overflow-hidden">
                    <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Panel de Evaluación de Desempeño y Criterios
                                    </CardTitle>
                                    {currentClassDate && (
                                        <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/30">
                                            Sesión {currentSessionIndex + 1}: {currentClassDate.formattedDate} ({currentClassDate.dayName})
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-xs mt-0.5">
                                    En el centro observas el gráfico evolutivo de notas de cada día. A la derecha selecciona los criterios de penalización (descuentan de 5.0). Las inasistencias (0.0) están estrictamente bloqueadas.
                                </CardDescription>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                                <div className="relative w-full sm:w-52">
                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar aprendiz..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="h-8 pl-8 text-xs bg-background"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSetPerfectToPresentToday}
                                    className="h-8 text-xs font-semibold gap-1.5"
                                    title="Asigna 5.0 a todos los aprendices que asistieron en la fecha seleccionada"
                                >
                                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                                    <span className="hidden sm:inline">Fijar 5.0 a Asistentes</span>
                                </Button>

                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-xs font-bold">
                                        Prom. Curso: {courseStats.avg.toFixed(2)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        Aprobados: {courseStats.passingCount}/{courseStats.total}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                                    <TableHead className="min-w-[210px] font-bold">Aprendiz y Asistencia del Día</TableHead>
                                    <TableHead className="min-w-[190px] text-center font-bold">
                                        <div className="flex flex-col items-center">
                                            <span>Evolución de Notas</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Historial de sesiones</span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[125px] text-center font-bold">
                                        <div className="flex flex-col items-center">
                                            <span>Nota del Día</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Máx: 5.0</span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="min-w-[280px] font-bold">
                                        <div className="flex items-center justify-between">
                                            <span>Penalización por Criterios (Resta a 5.0)</span>
                                            <span className="text-[10px] text-muted-foreground font-normal">Selector a la derecha</span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[95px] text-center font-bold">Promedio</TableHead>
                                    <TableHead className="w-[105px] text-center font-bold">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filteredStudents.map((st, idx) => {
                                    const effectiveDays = getStudentEffectiveDays(st);
                                    const todayDay = effectiveDays.find(d => d.date === selectedDate);
                                    const liveAvg = getStudentAverage(st);
                                    const isAbsent = todayDay?.lockedByAbsence || todayDay?.attendanceStatus === "ABSENT";
                                    const isLate = todayDay?.attendanceStatus === "LATE";
                                    const isPresent = todayDay?.attendanceStatus === "PRESENT";
                                    const appliedList = todayDay?.appliedCriteria || [];

                                    return (
                                        <TableRow
                                            key={st.studentId}
                                            className={`hover:bg-muted/40 transition-colors ${
                                                isAbsent ? "bg-rose-500/[0.02]" : ""
                                            }`}
                                        >
                                            {/* Index */}
                                            <TableCell className="text-center font-mono text-[11px] text-muted-foreground py-2.5">
                                                {idx + 1}
                                            </TableCell>

                                            {/* Student info & Attendance status */}
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarImage src={st.image || undefined} />
                                                        <AvatarFallback className="text-[10px] font-bold">
                                                            {st.studentName.slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-xs flex items-center gap-1.5">
                                                            <span>{st.studentName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {st.identificacion}
                                                            </span>
                                                            {/* Interactive Attendance dropdown */}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="cursor-pointer hover:opacity-85 transition-opacity inline-flex items-center focus:outline-none"
                                                                        title="Clic para cambiar estado de asistencia para esta sesión"
                                                                    >
                                                                        {isAbsent ? (
                                                                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[9px] py-0 px-1.5 font-bold gap-0.5 cursor-pointer hover:bg-rose-500/25">
                                                                                <UserX className="h-2.5 w-2.5" /> Inasistencia (0.0)
                                                                                <ChevronDown className="h-2 w-2 ml-0.5 opacity-60" />
                                                                            </Badge>
                                                                        ) : isLate ? (
                                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] py-0 px-1.5 font-bold gap-0.5 cursor-pointer hover:bg-amber-500/25">
                                                                                <Clock className="h-2.5 w-2.5" /> Tardanza
                                                                                <ChevronDown className="h-2 w-2 ml-0.5 opacity-60" />
                                                                            </Badge>
                                                                        ) : isPresent ? (
                                                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] py-0 px-1.5 font-bold gap-0.5 cursor-pointer hover:bg-emerald-500/25">
                                                                                <CheckCircle2 className="h-2.5 w-2.5" /> Presente
                                                                                <ChevronDown className="h-2 w-2 ml-0.5 opacity-60" />
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="text-[9px] py-0 px-1 cursor-pointer hover:bg-muted gap-0.5">
                                                                                {todayDay?.attendanceStatus === "EXCUSED" ? "Excusa" : "Sin Registro"}
                                                                                <ChevronDown className="h-2 w-2 ml-0.5 opacity-60" />
                                                                            </Badge>
                                                                        )}
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="start" className="w-56 text-xs">
                                                                    <DropdownMenuLabel className="text-[11px] font-bold">Estado de Asistencia ({selectedDate})</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, selectedDate, "PRESENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                            <span>Presente (Asistió)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, selectedDate, "LATE")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                                            <span>Tardanza (Llegó tarde)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                                                            -{(data?.performanceConfig?.tardinessPenalty ?? 1.0).toFixed(1)} pts
                                                                        </Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, selectedDate, "ABSENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                                                                            <span>Inasistencia (Falta)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold">0.0 Fijo</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, selectedDate, "EXCUSED")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                                                                            <span>Excusa Justificada</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-sky-600 border-sky-500/30 bg-sky-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, selectedDate, "NONE")}
                                                                        className="cursor-pointer text-xs text-muted-foreground flex items-center gap-2"
                                                                    >
                                                                        <span>Sin Registro (Quitar)</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* MIDDLE COLUMN: Mini daily evolution sparkline chart */}
                                            <TableCell className="text-center py-2.5">
                                                <div className="flex flex-col items-center justify-center">
                                                    <StudentSparkline days={effectiveDays} activeDate={selectedDate} />
                                                </div>
                                            </TableCell>

                                            {/* Grade of selected date */}
                                            <TableCell className="text-center py-2.5">
                                                {isAbsent ? (
                                                    <div className="inline-flex items-center justify-center gap-1 font-mono text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30 shadow-2xs">
                                                        <Lock className="h-3 w-3" />
                                                        <span>0.0</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="5"
                                                                step="0.1"
                                                                value={todayDay?.finalDayGrade ?? 5.0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => handleDayGradeChange(st.studentId, selectedDate, parseFloat(e.target.value) || 0)}
                                                                className="h-7 w-16 text-center font-mono text-xs font-bold bg-background mx-auto p-1"
                                                            />
                                                            <span className="text-[10px] text-muted-foreground font-mono">/ 5.0</span>
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground font-mono">
                                                            {appliedList.length > 0 ? `-${(5.0 - (todayDay?.finalDayGrade ?? 5.0)).toFixed(1)} pen.` : "Base 5.0"}
                                                        </div>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* RIGHT COLUMN: Selector of criteria to discount grade */}
                                            <TableCell className="py-2.5">
                                                {isAbsent ? (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                                                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Inasistencia injustificada: Calificación fijada en 0.0</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-[11px] font-semibold gap-1 border-dashed border-primary/40 hover:bg-primary/5 text-primary"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                        <span>Penalizar por Criterio...</span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="start" className="w-72 text-xs">
                                                                    <DropdownMenuLabel className="text-[11px] font-bold">
                                                                        Criterios de Evaluación Diaria
                                                                    </DropdownMenuLabel>
                                                                    <p className="text-[10px] text-muted-foreground px-2 pb-1.5">
                                                                        Selecciona una falta para restar de la nota máxima (5.0)
                                                                    </p>
                                                                    <DropdownMenuSeparator />
                                                                    {availableCriteria.map(crit => {
                                                                        const isApplied = appliedList.includes(crit.id) || appliedList.includes(crit.name);
                                                                        return (
                                                                            <DropdownMenuItem
                                                                                key={crit.id}
                                                                                onClick={() => isApplied
                                                                                    ? handleRemoveCriterion(st.studentId, selectedDate, crit.id)
                                                                                    : handleApplyCriterion(st.studentId, selectedDate, crit.id)
                                                                                }
                                                                                className="cursor-pointer flex items-center justify-between text-xs py-1.5"
                                                                            >
                                                                                <div className="flex items-center gap-1.5 truncate pr-2">
                                                                                    {isApplied ? (
                                                                                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                                    ) : (
                                                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                                                                    )}
                                                                                    <span className="truncate">{crit.name}</span>
                                                                                </div>
                                                                                <Badge variant="outline" className="font-mono text-[10px] font-bold text-rose-600 bg-rose-500/10 border-rose-500/20 shrink-0">
                                                                                    -{crit.penalty.toFixed(1)} pts
                                                                                </Badge>
                                                                            </DropdownMenuItem>
                                                                        );
                                                                    })}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>

                                                            {/* Applied criteria tags */}
                                                            {appliedList.length === 0 && (
                                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                                    <Check className="h-3 w-3" /> Sin faltas
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Tag list */}
                                                        {appliedList.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {appliedList.map(critId => {
                                                                    const matched = availableCriteria.find(c => c.id === critId || c.name === critId);
                                                                    const name = matched ? matched.name : critId;
                                                                    const pen = matched ? matched.penalty : null;

                                                                    return (
                                                                        <Badge
                                                                            key={critId}
                                                                            variant="outline"
                                                                            className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-medium gap-1 py-0.5 pr-1"
                                                                        >
                                                                            <span>{name} {pen ? `(-${pen.toFixed(1)})` : ""}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveCriterion(st.studentId, selectedDate, critId)}
                                                                                className="hover:bg-rose-500/25 rounded-full p-0.5 text-rose-700 dark:text-rose-300"
                                                                                title="Quitar penalización"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </Badge>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Course Average */}
                                            <TableCell className="text-center py-2.5">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                                        liveAvg >= 4.5
                                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                            : liveAvg >= 3.0
                                                            ? "bg-primary/10 text-primary border border-primary/20"
                                                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                                    }`}
                                                >
                                                    {liveAvg.toFixed(2)}
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-center py-2.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedStudentId(st.studentId);
                                                        setViewMode("detail");
                                                    }}
                                                    className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                                                    title="Ver historial detallado del estudiante"
                                                >
                                                    Detalle
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ========================================================================= */}
            {/* 2. PANEL GLOBAL / MATRIZ DE EVALUACIÓN (ALL STUDENTS INTERACTIVE PANEL) */}
            {/* ========================================================================= */}
            {viewMode === "matrix" && (
                <Card className="border shadow-xs overflow-hidden">
                    <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TableIcon className="h-4 w-4 text-primary" />
                                    Panel Global de Calificación de Desempeño
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Lista todos los estudiantes del curso. Puedes modificar las notas de cada fecha directamente en la tabla. Las inasistencias (0.0) están estrictamente bloqueadas.
                                </CardDescription>
                            </div>

                            {/* Matrix Toolbar & Bulk Tools */}
                            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                                <div className="relative w-full sm:w-56">
                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar por nombre o doc..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="h-8 pl-8 text-xs bg-background"
                                    />
                                </div>

                                {/* Bulk grade all valid sessions of all students */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-semibold gap-1.5"
                                        >
                                            <Wand2 className="h-3.5 w-3.5 text-primary" />
                                            <span>Calificar a Todos</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 text-xs">
                                        <DropdownMenuLabel className="text-[11px] font-bold">
                                            Asignar nota a todas las sesiones válidas de todos los aprendices
                                        </DropdownMenuLabel>
                                        <p className="text-[10px] text-muted-foreground px-2 pb-1.5">
                                            Las inasistencias permanecerán bloqueadas en 0.0
                                        </p>
                                        <DropdownMenuSeparator />
                                        {[5.0, 4.5, 4.0, 3.5, 3.0].map(val => (
                                            <DropdownMenuItem
                                                key={val}
                                                onClick={() => handleApplyGradeToAllStudents(val)}
                                                className="cursor-pointer font-mono font-medium"
                                            >
                                                Asignar {val.toFixed(1)} a todos los aprendices
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="text-xs font-bold">
                                        Prom. Curso: {courseStats.avg.toFixed(2)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        Aprobados: {courseStats.passingCount}/{courseStats.total}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-10 text-center font-bold sticky left-0 bg-background z-20 border-r">
                                        #
                                    </TableHead>
                                    <TableHead className="font-bold min-w-[210px] sticky left-10 bg-background z-20 border-r">
                                        Aprendiz
                                    </TableHead>
                                    <TableHead className="w-20 text-center font-bold px-1.5">
                                        Acción Rápida
                                    </TableHead>
                                    {data.classDates.map(cd => (
                                        <TableHead key={cd.date} className="text-center font-bold px-1.5 whitespace-nowrap min-w-[80px]">
                                            <div className="flex flex-col items-center">
                                                <div className="text-[10px] text-muted-foreground">{cd.dayName.slice(0, 3)}</div>
                                                <div className="text-xs font-mono">{cd.date.slice(5)}</div>
                                                {/* Column quick-fill */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            title={`Asignar nota a todos los asistentes del ${cd.formattedDate}`}
                                                            className="text-[9px] text-primary/70 hover:text-primary underline mt-0.5 cursor-pointer"
                                                        >
                                                            Fijar día
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="center" className="text-xs w-40">
                                                        <DropdownMenuLabel className="text-[10px]">
                                                            Fijar {cd.formattedDate}
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {[5.0, 4.5, 4.0, 3.5, 3.0].map(val => (
                                                            <DropdownMenuItem
                                                                key={val}
                                                                onClick={() => handleApplyGradeToColumn(cd.date, val)}
                                                                className="cursor-pointer font-mono"
                                                            >
                                                                {val.toFixed(1)} a todos
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-center font-bold min-w-[95px] bg-primary/5 sticky right-[100px] z-20 border-l">
                                        Promedio
                                    </TableHead>
                                    <TableHead className="text-center font-bold min-w-[100px] bg-background sticky right-0 z-20 border-l">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {filteredStudents.map((st, idx) => {
                                    const effectiveDays = getStudentEffectiveDays(st);
                                    const liveAvg = getStudentAverage(st);
                                    const isSelected = st.studentId === selectedStudentId;

                                    return (
                                        <TableRow
                                            key={st.studentId}
                                            className={`hover:bg-muted/40 transition-colors ${
                                                isSelected ? "bg-primary/[0.04]" : ""
                                            }`}
                                        >
                                            {/* Row Index */}
                                            <TableCell className="text-center font-mono text-[11px] text-muted-foreground sticky left-0 bg-background z-10 border-r py-2">
                                                {idx + 1}
                                            </TableCell>

                                            {/* Student Info */}
                                            <TableCell className="font-medium sticky left-10 bg-background z-10 border-r py-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7 shrink-0">
                                                        <AvatarImage src={st.image || undefined} />
                                                        <AvatarFallback className="text-[10px] font-bold">
                                                            {st.studentName.slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="truncate max-w-[160px]">
                                                        <div className="truncate font-semibold text-xs flex items-center gap-1.5">
                                                            <span>{st.studentName}</span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">
                                                            {st.identificacion}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Quick Row Bulk Action */}
                                            <TableCell className="text-center p-1">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 gap-0.5"
                                                            title="Asignar nota a todas las sesiones válidas de este estudiante"
                                                        >
                                                            <Wand2 className="h-3 w-3" />
                                                            <span>Fijar</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="text-xs w-48">
                                                        <DropdownMenuLabel className="text-[11px]">
                                                            Fijar notas de {st.studentName.split(" ")[0]}
                                                        </DropdownMenuLabel>
                                                        <p className="text-[10px] text-muted-foreground px-2 pb-1">
                                                            Las inasistencias quedan en 0.0
                                                        </p>
                                                        <DropdownMenuSeparator />
                                                        {[5.0, 4.5, 4.0, 3.5, 3.0].map(val => (
                                                            <DropdownMenuItem
                                                                key={val}
                                                                onClick={() => handleApplyGradeToStudent(st.studentId, val)}
                                                                className="cursor-pointer font-mono"
                                                            >
                                                                Asignar {val.toFixed(1)} a todas
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>

                                            {/* Interactive Day Columns */}
                                            {effectiveDays.map(d => {
                                                const isFutureDate = d.date > getTodayDateString();
                                                if (d.lockedByAbsence) {
                                                    // STRICTLY LOCKED BY ABSENCE (CANNOT BE MODIFIED AS GRADE, BUT ATTENDANCE CAN BE CHANGED)
                                                    return (
                                                        <TableCell key={d.date} className="text-center p-1 bg-rose-500/[0.03]">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="h-7 w-14 mx-auto rounded border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs group"
                                                                        title={`Inasistencia el ${d.formattedDate}: Bloqueado en 0.0 (Clic para cambiar asistencia)`}
                                                                    >
                                                                        <UserX className="h-3 w-3 text-rose-500 shrink-0" />
                                                                        <span>0.0</span>
                                                                        <ChevronDown className="h-2 w-2 opacity-50 group-hover:opacity-100" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="center" className="w-56 text-xs">
                                                                    <DropdownMenuLabel className="text-[11px] font-bold">Asistencia ({d.formattedDate})</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "PRESENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                            <span>Presente (Asistió)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "LATE")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                                            <span>Tardanza (Llegó tarde)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                                                            -{(data?.performanceConfig?.tardinessPenalty ?? 1.0).toFixed(1)} pts
                                                                        </Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "ABSENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between font-bold bg-muted/50"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                                                                            <span>Inasistencia (Falta)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold">0.0 Fijo</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "EXCUSED")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                                                                            <span>Excusa Justificada</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-sky-600 border-sky-500/30 bg-sky-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "NONE")}
                                                                        className="cursor-pointer text-xs text-muted-foreground flex items-center gap-2"
                                                                    >
                                                                        <span>Sin Registro (Quitar)</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    );
                                                }

                                                // EDITABLE GRADE INPUT
                                                return (
                                                    <TableCell key={d.date} className="text-center p-1">
                                                        <div className="relative inline-flex items-center justify-center group">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="5"
                                                                step="0.1"
                                                                disabled={isFutureDate}
                                                                value={d.finalDayGrade}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    handleDayGradeChange(st.studentId, d.date, isNaN(val) ? 0 : val);
                                                                }}
                                                                className={`h-7 w-14 text-center font-mono text-xs font-bold p-1 transition-colors ${
                                                                    d.attendanceStatus === "LATE"
                                                                        ? "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                                                        : d.attendanceStatus === "EXCUSED"
                                                                        ? "border-sky-500/50 bg-sky-500/10 text-sky-800 dark:text-sky-300"
                                                                        : d.finalDayGrade >= 4.5
                                                                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                                                        : d.finalDayGrade >= 3.0
                                                                        ? "border-border bg-background"
                                                                        : "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                                                }`}
                                                                title={`${d.dayName} ${d.formattedDate}: ${d.attendanceStatus || "Normal"} - Nota: ${d.finalDayGrade}`}
                                                            />
                                                            {/* Attendance Status Indicator & Toggle Dropdown */}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ring-2 ring-background flex items-center justify-center cursor-pointer transition-opacity ${
                                                                            d.attendanceStatus === "LATE"
                                                                                ? "bg-amber-500 text-white opacity-100 shadow-xs"
                                                                                : d.attendanceStatus === "EXCUSED"
                                                                                ? "bg-sky-500 text-white opacity-100 shadow-xs"
                                                                                : "bg-muted-foreground/30 text-transparent opacity-0 group-hover:opacity-80 hover:!opacity-100"
                                                                        }`}
                                                                        title={`Asistencia: ${d.attendanceStatus || "Sin Registro"}. Clic para cambiar.`}
                                                                    >
                                                                        {d.attendanceStatus === "LATE" ? (
                                                                            <Clock className="h-2 w-2" />
                                                                        ) : d.attendanceStatus === "EXCUSED" ? (
                                                                            <FileText className="h-2 w-2" />
                                                                        ) : (
                                                                            <span className="block h-1 w-1 bg-foreground rounded-full" />
                                                                        )}
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="center" className="w-56 text-xs">
                                                                    <DropdownMenuLabel className="text-[11px] font-bold">Asistencia ({d.formattedDate})</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "PRESENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                            <span>Presente (Asistió)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "LATE")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                                            <span>Tardanza (Llegó tarde)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                                                            -{(data?.performanceConfig?.tardinessPenalty ?? 1.0).toFixed(1)} pts
                                                                        </Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "ABSENT")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                                                                            <span>Inasistencia (Falta)</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold">0.0 Fijo</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "EXCUSED")}
                                                                        className="cursor-pointer text-xs flex items-center justify-between"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                                                                            <span>Excusa Justificada</span>
                                                                        </span>
                                                                        <Badge variant="outline" className="text-[9px] text-sky-600 border-sky-500/30 bg-sky-500/10">Base 5.0</Badge>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleAttendanceChange(st.studentId, d.date, "NONE")}
                                                                        className="cursor-pointer text-xs text-muted-foreground flex items-center gap-2"
                                                                    >
                                                                        <span>Sin Registro (Quitar)</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}

                                            {/* Live Student Average */}
                                            <TableCell className="text-center font-bold sticky right-[100px] bg-background z-10 border-l p-1">
                                                <span
                                                    className={`inline-block px-2 py-1 rounded text-xs font-mono font-bold ${
                                                        liveAvg >= 4.5
                                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                            : liveAvg >= 3.0
                                                            ? "bg-primary/10 text-primary border border-primary/20"
                                                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                                    }`}
                                                >
                                                    {liveAvg.toFixed(2)}
                                                </span>
                                            </TableCell>

                                            {/* Row Actions: View Detail / Save */}
                                            <TableCell className="text-center sticky right-0 bg-background z-10 border-l p-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedStudentId(st.studentId);
                                                        setViewMode("detail");
                                                    }}
                                                    className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                                                    title="Ver vista detallada y gráfico del estudiante"
                                                >
                                                    Detalle
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ========================================================================= */}
            {/* 3. VISTA POR CADA ESTUDIANTE (INDIVIDUAL STUDENT DETAILED VIEW)            */}
            {/* ========================================================================= */}
            {viewMode === "detail" && (
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
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setViewMode("matrix")}
                                        className="h-6 text-[10px] font-semibold text-primary hover:bg-primary/10 gap-1 px-1.5"
                                    >
                                        <TableIcon className="h-3 w-3" />
                                        <span>Ir a Matriz Global</span>
                                    </Button>
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
                                    const avg = getStudentAverage(st);

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
                                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xs shrink-0">
                                                    <AvatarImage src={currentStudent.image || undefined} />
                                                    <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                                                        {currentStudent.studentName.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
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

                                            {/* Navigation & Score Big Display & Save Button */}
                                            <div className="flex items-center gap-3 self-end sm:self-center flex-wrap justify-end">
                                                {/* Prev / Next Student */}
                                                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handlePrevStudent}
                                                        className="h-7 w-7 p-0"
                                                        title="Aprendiz anterior"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <span className="text-[10px] font-mono text-muted-foreground px-1">
                                                        {currentStudentIndex + 1}/{data.students.length}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleNextStudent}
                                                        className="h-7 w-7 p-0"
                                                        title="Siguiente aprendiz"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>

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

                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-muted/40 text-xs select-none">
                                                    {saveStatus === "saving" ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                                                            <span className="text-amber-600 dark:text-amber-400 font-semibold">Guardando cambios...</span>
                                                        </>
                                                    ) : saveStatus === "saved" ? (
                                                        <>
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Guardado</span>
                                                        </>
                                                    ) : saveStatus === "error" ? (
                                                        <>
                                                            <AlertCircle className="h-4 w-4 text-rose-500" />
                                                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Error al guardar</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Autoguardado</span>
                                                        </>
                                                    )}
                                                </div>
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

                                {/* Behavior Trend Chart */}
                                <Card className="border shadow-xs overflow-hidden">
                                    <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-primary" />
                                                Gráfico de Comportamiento y Evolución Diaria
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
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
                                                            let fill = "#10b981";
                                                            if (payload.status === "ABSENT") fill = "#ef4444";
                                                            else if (payload.status === "LATE") fill = "#f59e0b";
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
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-primary" />
                                                        Calificación por Sesión de Clase
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Modifica las notas de cada fecha. Las fechas afectadas por inasistencia quedan protegidas automáticamente en 0.0.
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                    <span>Inasistencias bloqueadas en 0.0</span>
                                                </div>
                                            </div>

                                            {/* Bulk modification bar for this specific student */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-lg border bg-background/90 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Wand2 className="h-4 w-4 text-primary shrink-0" />
                                                    <span className="font-semibold">
                                                        Asignar nota a todas las sesiones válidas de {currentStudent.studentName.split(" ")[0]}:
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {[5.0, 4.5, 4.0, 3.5, 3.0].map(val => (
                                                        <Button
                                                            key={val}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleApplyGradeToStudent(currentStudent.studentId, val)}
                                                            className="h-6 px-2 text-[11px] font-mono font-bold hover:bg-primary hover:text-primary-foreground"
                                                        >
                                                            {val.toFixed(1)}
                                                        </Button>
                                                    ))}

                                                    <div className="flex items-center gap-1 pl-1 border-l">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            step="0.1"
                                                            value={bulkDetailCustomGrade}
                                                            onChange={e => setBulkDetailCustomGrade(e.target.value)}
                                                            className="h-6 w-14 text-center font-mono text-[11px] font-bold p-0.5"
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => {
                                                                const num = parseFloat(bulkDetailCustomGrade);
                                                                if (!isNaN(num)) {
                                                                    handleApplyGradeToStudent(currentStudent.studentId, num);
                                                                }
                                                            }}
                                                            className="h-6 px-2 text-[11px] font-semibold bg-primary text-primary-foreground"
                                                        >
                                                            Aplicar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table className="text-xs">
                                                <TableHeader>
                                                    <TableRow className="bg-muted/30">
                                                        <TableHead className="w-[140px] font-bold">Fecha de Clase</TableHead>
                                                        <TableHead className="w-[140px] font-bold">Estado Asistencia</TableHead>
                                                        <TableHead className="w-[200px] font-bold">Calificación del Día (0.0 - 5.0)</TableHead>
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

                                                                {/* Attendance Status Badge with Dropdown */}
                                                                <TableCell>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <button type="button" className="cursor-pointer text-left focus:outline-hidden">
                                                                                {isAbsent ? (
                                                                                    <Badge className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-[10px] transition-colors cursor-pointer">
                                                                                        <UserX className="h-3 w-3" /> Inasistencia (0.0)
                                                                                        <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                                                                                    </Badge>
                                                                                ) : isLate ? (
                                                                                    <Badge className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[10px] transition-colors cursor-pointer">
                                                                                        <Clock className="h-3 w-3" /> Tardanza (-{d.penalty})
                                                                                        <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                                                                                    </Badge>
                                                                                ) : isPresent ? (
                                                                                    <Badge className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] transition-colors cursor-pointer">
                                                                                        <CheckCircle2 className="h-3 w-3" /> Asistió (Base 5.0)
                                                                                        <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-[10px] hover:bg-muted gap-1 transition-colors cursor-pointer">
                                                                                        {d.attendanceStatus === "EXCUSED" ? "Excusa Justificada" : "Sin Registro"}
                                                                                        <ChevronDown className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                                                                                    </Badge>
                                                                                )}
                                                                            </button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="start" className="w-56 text-xs">
                                                                            <DropdownMenuLabel className="text-[11px] font-bold">Estado de Asistencia ({d.date})</DropdownMenuLabel>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleAttendanceChange(currentStudent.studentId, d.date, "PRESENT")}
                                                                                className="cursor-pointer text-xs flex items-center justify-between"
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                                                    <span>Presente (Asistió)</span>
                                                                                </span>
                                                                                <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">Base 5.0</Badge>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleAttendanceChange(currentStudent.studentId, d.date, "LATE")}
                                                                                className="cursor-pointer text-xs flex items-center justify-between"
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                                                    <span>Tardanza (Llegó tarde)</span>
                                                                                </span>
                                                                                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                                                                                    -{(data?.performanceConfig?.tardinessPenalty ?? 1.0).toFixed(1)} pts
                                                                                </Badge>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleAttendanceChange(currentStudent.studentId, d.date, "ABSENT")}
                                                                                className="cursor-pointer text-xs flex items-center justify-between font-bold bg-muted/50"
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <UserX className="h-3.5 w-3.5 text-rose-600" />
                                                                                    <span>Inasistencia (Falta)</span>
                                                                                </span>
                                                                                <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold">0.0 Fijo</Badge>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleAttendanceChange(currentStudent.studentId, d.date, "EXCUSED")}
                                                                                className="cursor-pointer text-xs flex items-center justify-between"
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <FileText className="h-3.5 w-3.5 text-sky-600" />
                                                                                    <span>Excusa Justificada</span>
                                                                                </span>
                                                                                <Badge variant="outline" className="text-[9px] text-sky-600 border-sky-500/30 bg-sky-500/10">Base 5.0</Badge>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleAttendanceChange(currentStudent.studentId, d.date, "NONE")}
                                                                                className="cursor-pointer text-xs text-muted-foreground flex items-center gap-2"
                                                                            >
                                                                                <span>Sin Registro (Quitar)</span>
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>

                                                                {/* Grade and Quick Score Buttons */}
                                                                <TableCell>
                                                                    {isAbsent ? (
                                                                        // STRICTLY LOCKED BY ABSENCE (CANNOT BE MODIFIED)
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1.5">
                                                                                <Lock className="h-3 w-3" /> 0.0
                                                                            </span>
                                                                            <span className="text-[10px] text-rose-600/80 italic font-medium">
                                                                                Bloqueado por falta (cambia la asistencia para desbloquear)
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        // MODIFIABLE GRADE
                                                                        <div className="space-y-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <Input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="5"
                                                                                    step="0.1"
                                                                                    value={d.finalDayGrade}
                                                                                    onFocus={(e) => e.target.select()}
                                                                                    onChange={e => handleDayGradeChange(currentStudent.studentId, d.date, parseFloat(e.target.value) || 0)}
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
                                                                                        onClick={() => handleDayGradeChange(currentStudent.studentId, d.date, score)}
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
                                                                        onChange={e => handleDayNoteChange(currentStudent.studentId, d.date, e.target.value)}
                                                                        disabled={isAbsent}
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

            {/* ========================================================================= */}
            {/* CRITERIA CONFIGURATION MODAL (DIALOG)                                     */}
            {/* ========================================================================= */}
            <Dialog open={isCriteriaModalOpen} onOpenChange={setIsCriteriaModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                            Configurar Criterios y Penalizaciones Diarias
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define las reglas disciplinarias, de uniforme y convivencia con las que calificarás las sesiones. Cada criterio resta a la nota máxima diaria de 5.0. Se sincroniza con el enunciado del aprendiz.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Add new criterion form */}
                        <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Plus className="h-3.5 w-3.5 text-primary" />
                                Agregar Nuevo Criterio de Penalización
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-6 space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">Nombre del Criterio</Label>
                                    <Input
                                        placeholder="Ej: No usa la camisa institucional"
                                        value={newCritName}
                                        onChange={e => setNewCritName(e.target.value)}
                                        className="h-8 text-xs bg-background"
                                    />
                                </div>
                                <div className="sm:col-span-3 space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">Penalización (0.1 a 5.0)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            min="0.1"
                                            max="5.0"
                                            step="0.1"
                                            placeholder="1.0"
                                            value={newCritPenalty}
                                            onChange={e => setNewCritPenalty(e.target.value)}
                                            className="h-8 text-xs font-mono font-bold bg-background pr-8"
                                        />
                                        <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-mono">pts</span>
                                    </div>
                                </div>
                                <div className="sm:col-span-3 flex items-end">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            if (!newCritName.trim()) {
                                                toast.error("Ingresa el nombre del criterio");
                                                return;
                                            }
                                            const pen = parseFloat(newCritPenalty);
                                            if (isNaN(pen) || pen <= 0 || pen > 5) {
                                                toast.error("La penalización debe ser un número entre 0.1 y 5.0");
                                                return;
                                            }
                                            setEditingCriteria(prev => [
                                                ...prev,
                                                {
                                                    id: `crit-${Date.now()}`,
                                                    name: newCritName.trim(),
                                                    penalty: Number(pen.toFixed(1)),
                                                    description: newCritDesc.trim() || undefined,
                                                }
                                            ]);
                                            setNewCritName("");
                                            setNewCritPenalty("1.0");
                                            setNewCritDesc("");
                                            toast.success("Criterio agregado a la lista");
                                        }}
                                        className="h-8 w-full text-xs font-semibold gap-1 bg-primary text-primary-foreground"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Agregar
                                    </Button>
                                </div>
                                <div className="sm:col-span-12 space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">Descripción / Justificación (Opcional)</Label>
                                    <Input
                                        placeholder="Ej: Portar el uniforme reglamentario durante toda la jornada de clase"
                                        value={newCritDesc}
                                        onChange={e => setNewCritDesc(e.target.value)}
                                        className="h-8 text-xs bg-background"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Existing criteria list table */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground">
                                    Criterios Activos ({editingCriteria.length})
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setEditingCriteria([...DEFAULT_PERFORMANCE_CRITERIA]);
                                        toast.info("Criterios por defecto cargados");
                                    }}
                                    className="h-6 text-[11px] text-primary hover:bg-primary/10 gap-1 px-1.5"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Restaurar Por Defecto
                                </Button>
                            </div>

                            <div className="rounded-lg border overflow-hidden">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-bold">Criterio</TableHead>
                                            <TableHead className="w-24 text-center font-bold">Resta a 5.0</TableHead>
                                            <TableHead className="w-24 text-center font-bold">Nota Resultante</TableHead>
                                            <TableHead className="w-12 text-center"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {editingCriteria.map((crit, idx) => (
                                            <TableRow key={crit.id || idx}>
                                                <TableCell className="py-2">
                                                    <div className="font-semibold">{crit.name}</div>
                                                    {crit.description && (
                                                        <div className="text-[10px] text-muted-foreground">{crit.description}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Input
                                                        type="number"
                                                        min="0.1"
                                                        max="5.0"
                                                        step="0.1"
                                                        value={crit.penalty}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val)) {
                                                                const clamped = Math.min(5.0, Math.max(0.1, val));
                                                                setEditingCriteria(prev => prev.map((c, i) => i === idx ? { ...c, penalty: Number(clamped.toFixed(1)) } : c));
                                                            }
                                                        }}
                                                        className="h-7 w-16 text-center font-mono font-bold text-xs bg-background mx-auto p-1"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-bold text-xs py-2 text-muted-foreground">
                                                    {(5.0 - crit.penalty).toFixed(1)} / 5.0
                                                </TableCell>
                                                <TableCell className="text-center py-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCriteria(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                                        title="Eliminar criterio"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCriteriaModalOpen(false)}
                            disabled={isSavingCriteria}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveCriteria}
                            disabled={isSavingCriteria}
                            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                        >
                            <Save className="h-3.5 w-3.5" />
                            <span>{isSavingCriteria ? "Guardando..." : "Guardar y Sincronizar Enunciado"}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
