"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCourseStudentsAction } from "@/features/teacher/actions/studentActions";
import { 
    recordAttendanceAction, 
    deleteAttendanceAction, 
    getCourseSessionsCountAction,
    recordAttendanceBatchAction,
    getCourseAttendanceForDateAction,
    getCourseScheduleAction,
    getCourseAllStudentsAttendanceStatsAction,
    getCourseAllAttendanceRecordsAction
} from "@/features/teacher/actions/attendanceActions";
import { getCourseClassDates, formatCalendarDate } from "@/lib/dateUtils";
import { getStudentAttendanceStatsAction } from "@/features/student/actions/attendanceActions";
import { getCourseAttendanceReportAction } from "@/features/teacher/actions/reportActions";
import { AttendanceStatistics } from "@/features/teacher/components/AttendanceStatistics";
import { 
    Check, 
    X, 
    UserCheck, 
    UserX, 
    Calendar, 
    RotateCcw, 
    Clock, 
    ArrowLeft, 
    ArrowRight, 
    AlertCircle, 
    Loader2, 
    ListTodo, 
    Play, 
    LogOut, 
    LayoutDashboard, 
    History, 
    FileText, 
    ExternalLink,
    TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AttendanceTakerProps {
    courseId: string;
    trigger?: React.ReactNode;
}

interface Student {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    profile: {
        identificacion: string;
        nombres: string;
        apellido: string;
    } | null;
}

export function AttendanceTaker({ courseId, trigger }: AttendanceTakerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<"take" | "summary" | "history" | "all-history" | "analytics">("take");
    const [attMode, setAttMode] = useState<"list" | "sequential">("list");
    const [students, setStudents] = useState<Student[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [courseSchedule, setCourseSchedule] = useState<{
        startDate: Date | null;
        endDate: Date | null;
        startTime: string | null;
        endTime: string | null;
        classDays: string | null;
    } | null>(null);
    const [classDates, setClassDates] = useState<string[]>([]);

    const scheduleTimeOptions = useMemo(() => {
        if (!courseSchedule?.startTime || !courseSchedule?.endTime) {
            const fallback = [];
            for (let h = 6; h <= 22; h++) {
                for (let m = 0; m < 60; m += 15) {
                    fallback.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                }
            }
            return fallback;
        }

        const startStr = courseSchedule.startTime;
        const endStr = courseSchedule.endTime;
        const [startH, startM] = startStr.split(":").map(Number);
        const [endH, endM] = endStr.split(":").map(Number);

        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        const options = [];
        for (let m = startMin; m <= endMin; m += 15) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            options.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
        
        if ((endMin - startMin) % 15 !== 0) {
            options.push(endStr);
        }
        
        return options;
    }, [courseSchedule]);

    const formatTo12Hour = (time24: string): string => {
        if (!time24) return "";
        const [hourStr, minStr] = time24.split(":");
        const hour = parseInt(hourStr, 10);
        const period = hour >= 12 ? "pm" : "am";
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${String(hour12).padStart(2, '0')}:${minStr} ${period === "pm" ? "p. m." : "a. m."}`;
    };

    const getClosestTimeOption = useCallback((options: string[]): string => {
        if (options.length === 0) return "08:00";
        
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        
        let closest = options[0];
        let minDiff = Infinity;
        
        for (const opt of options) {
            const [h, m] = opt.split(":").map(Number);
            const optMin = h * 60 + m;
            const diff = Math.abs(currentMin - optMin);
            if (diff < minDiff) {
                minDiff = diff;
                closest = opt;
            }
        }
        
        return closest;
    }, []);
    
    // Keyed by studentId
    const [attRecords, setAttRecords] = useState<Record<string, { 
        id?: string; 
        status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEAVE_EARLY"; 
        arrivalTime?: string | null; 
        departureTime?: string | null; 
        justification?: string | null;
        saving?: boolean;
    }>>({});

    // For sequential mode stats
    const [studentStats, setStudentStats] = useState<{ late: number; excused: number; absences: number; leaveEarly: number; records: any[] } | null>(null);
    const [sessionCount, setSessionCount] = useState<number | undefined>(undefined);
    // Cumulative stats for ALL students (used in list view badges)
    const [allStudentStats, setAllStudentStats] = useState<Record<string, { absences: number; late: number; leaveEarly: number }>>({});
    // History dialog
    const [historyStudent, setHistoryStudent] = useState<{ student: Student; records: any[] } | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [allHistoryRecords, setAllHistoryRecords] = useState<any[]>([]);
    const [allHistoryLoading, setAllHistoryLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStudents();
            loadSchedule();
            if (view === "summary") {
                loadSummary();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && students.length > 0 && view === "take") {
            loadAttendanceForDate(attendanceDate);
        }
    }, [isOpen, attendanceDate, students, view]);

    useEffect(() => {
        if (isOpen && attMode === "sequential" && students.length > 0 && students[currentIndex] && view === "take") {
            loadStudentStats(students[currentIndex].id);
        }
    }, [currentIndex, students, isOpen, attMode, attendanceDate, view]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await getCourseStudentsAction(courseId);
            const studentList = data.map((enrollment: any) => enrollment.user);
            studentList.sort((a: Student, b: Student) => {
                const nameA = a.profile?.apellido || a.name || "";
                const nameB = b.profile?.apellido || b.name || "";
                return nameA.localeCompare(nameB);
            });
            setStudents(studentList);
            // Load cumulative stats for all students in batch
            loadAllStudentStats(studentList);
        } catch (error) {
            toast.error("Error al cargar estudiantes");
        } finally {
            setLoading(false);
        }
    };

    const loadSchedule = async () => {
        try {
            const schedule = await getCourseScheduleAction(courseId);
            if (schedule) {
                setCourseSchedule(schedule as any);
                const dates = getCourseClassDates(schedule.startDate, schedule.endDate, schedule.classDays);
                setClassDates(dates);
                
                if (dates.length > 0) {
                    const todayStr = format(new Date(), "yyyy-MM-dd");
                    if (dates.includes(todayStr)) {
                        setAttendanceDate(new Date(todayStr + "T00:00:00"));
                    } else {
                        const closest = dates.find(d => d >= todayStr) || dates[dates.length - 1];
                        setAttendanceDate(new Date(closest + "T00:00:00"));
                    }
                }
            }
        } catch (error) {
            console.error("Error loading course schedule", error);
        }
    };

    const loadAttendanceForDate = async (targetDate: Date) => {
        setLoadingAttendance(true);
        try {
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const records = await getCourseAttendanceForDateAction(courseId, dateStr);
            
            const map: Record<string, any> = {};
            records.forEach((r: any) => {
                let timeStr: string | null = null;
                if (r.arrivalTime) {
                    const parsedTime = new Date(r.arrivalTime);
                    const hours = String(parsedTime.getUTCHours()).padStart(2, '0');
                    const minutes = String(parsedTime.getUTCMinutes()).padStart(2, '0');
                    timeStr = `${hours}:${minutes}`;
                }

                let depTimeStr: string | null = null;
                if (r.departureTime) {
                    const parsedTime = new Date(r.departureTime);
                    const hours = String(parsedTime.getUTCHours()).padStart(2, '0');
                    const minutes = String(parsedTime.getUTCMinutes()).padStart(2, '0');
                    depTimeStr = `${hours}:${minutes}`;
                }
                
                map[r.userId] = {
                    id: r.id,
                    status: r.status,
                    arrivalTime: timeStr,
                    departureTime: depTimeStr,
                    justification: r.justification
                };
            });

            // Default all students to PRESENT
            students.forEach(s => {
                if (!map[s.id]) {
                    map[s.id] = {
                        status: "PRESENT",
                        arrivalTime: null,
                        departureTime: null,
                        justification: null
                    };
                }
            });

            setAttRecords(map);
        } catch (error) {
            console.error("Error loading attendance", error);
            toast.error("Error al cargar la asistencia");
        } finally {
            setLoadingAttendance(false);
        }
    };

    const loadSummary = async () => {
        setLoadingSummary(true);
        try {
            const rawData = await getCourseAttendanceReportAction(courseId);
            const processed = rawData.map((row: any) => {
                let presents = 0;
                let absences = 0;
                let lates = 0;
                let leaveEarly = 0;
                let excused = 0;
                let total = 0;

                Object.keys(row).forEach(key => {
                    if (key !== 'ID' && key !== 'Estudiante' && key !== 'Correo') {
                        const cell = row[key];
                        if (cell && cell !== '-' && cell.status) {
                            total++;
                            if (cell.status === 'P') presents++;
                            else if (cell.status === 'A') absences++;
                            else if (cell.status === 'L') lates++;
                            else if (cell.status === 'R') leaveEarly++;
                            else if (cell.status === 'E') excused++;
                        }
                    }
                });

                const attended = presents + lates + leaveEarly + excused;
                const percentage = total > 0 ? (attended / total) * 100 : 100;

                return {
                    id: row.ID,
                    name: row.Estudiante,
                    email: row.Correo,
                    presents,
                    absences,
                    lates,
                    leaveEarly,
                    excused,
                    total,
                    percentage
                };
            });
            setSummaryData(processed);
        } catch (error) {
            console.error("Error loading summary", error);
            toast.error("Error al cargar el resumen");
        } finally {
            setLoadingSummary(false);
        }
    };

    const loadAllStudentStats = async (studentList: Student[]) => {
        try {
            // Single GROUP BY query — replaces N individual queries
            const stats = await getCourseAllStudentsAttendanceStatsAction(courseId);
            setAllStudentStats(stats);
        } catch (error) {
            console.error("Error loading all student stats", error);
        }
    };

    const loadAllHistory = async () => {
        setAllHistoryLoading(true);
        try {
            const records = await getCourseAllAttendanceRecordsAction(courseId);
            setAllHistoryRecords(records);
        } catch (error) {
            console.error("Error loading all history records:", error);
            toast.error("Error al cargar historial completo");
        } finally {
            setAllHistoryLoading(false);
        }
    };

    const loadAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const rawData = await getCourseAttendanceReportAction(courseId);
            setAnalyticsData(rawData);
        } catch (error) {
            console.error("Error loading analytics:", error);
            toast.error("Error al cargar analíticas");
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const loadStudentStats = async (studentId: string, dateOverride?: Date) => {
        try {
            let currentSessionCount = sessionCount;
            if (currentSessionCount === undefined) {
                currentSessionCount = await getCourseSessionsCountAction(courseId);
                setSessionCount(currentSessionCount);
            }

            const stats = await getStudentAttendanceStatsAction(courseId, studentId, currentSessionCount);
            setStudentStats({
                late: stats.late,
                excused: stats.excused,
                absences: stats.absences,
                leaveEarly: (stats as any).leaveEarly || 0,
                records: stats.records
            });
        } catch (error) {
            console.error("Error loading stats", error);
        }
    };

    const handleDateChangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) return;
        setAttendanceDate(new Date(val + "T00:00:00"));
    };

    const handleMarkStudent = async (
        studentId: string, 
        status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY", 
        timeStr?: string, 
        justificationStr?: string,
        departureTimeStr?: string
    ) => {
        const y = attendanceDate.getFullYear();
        const m = String(attendanceDate.getMonth() + 1).padStart(2, '0');
        const d = String(attendanceDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const currentRec = attRecords[studentId];
        const closestTime = getClosestTimeOption(scheduleTimeOptions);
        const finalTimeStr = timeStr || currentRec?.arrivalTime || closestTime;
        const finalDepartureTimeStr = departureTimeStr || currentRec?.departureTime || closestTime;
        const finalJustification = null;

        // If it's already set to this status and inputs didn't change, avoid network call
        if (
            currentRec?.status === status && 
            timeStr === undefined && 
            justificationStr === undefined && 
            departureTimeStr === undefined
        ) {
            return;
        }

        // Optimistic UI update
        setAttRecords(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status,
                arrivalTime: status === "LATE" ? finalTimeStr : null,
                departureTime: status === "LEAVE_EARLY" ? finalDepartureTimeStr : null,
                justification: null,
                saving: true
            }
        }));

        try {
            let arrivalTimeFinal: string | null = null;
            if (status === "LATE") {
                arrivalTimeFinal = `${dateStr}T${finalTimeStr}:00Z`;
            }

            let departureTimeFinal: string | null = null;
            if (status === "LEAVE_EARLY") {
                departureTimeFinal = `${dateStr}T${finalDepartureTimeStr}:00Z`;
            }

            await recordAttendanceAction(
                courseId, 
                studentId, 
                dateStr, 
                status, 
                arrivalTimeFinal, 
                finalJustification,
                departureTimeFinal
            );
            
            // Remove saving state
            setAttRecords(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    saving: false
                }
            }));

            // Refresh cumulative badge for this student with another batch (1 query total)
            try {
                const allStats = await getCourseAllStudentsAttendanceStatsAction(courseId);
                setAllStudentStats(allStats);
            } catch { /* badge refresh is best-effort */ }
        } catch (error) {
            console.error("Error marking attendance", error);
            toast.error("Error al registrar asistencia");
            loadAttendanceForDate(attendanceDate);
        }
    };

    const handleNext = useCallback(() => {
        if (currentIndex < students.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    }, [currentIndex, students.length]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    }, [currentIndex]);

    const handleSequentialMark = async (status: "PRESENT" | "ABSENT") => {
        const student = students[currentIndex];
        if (!student) return;

        await handleMarkStudent(student.id, status);

        if (currentIndex < students.length - 1) {
            handleNext();
        } else {
            toast.success("Asistencia completada");
            setIsOpen(false);
        }
    };

    const handleSequentialReset = () => {
        if (currentIndex > 0) {
            handlePrevious();
        }
    };

    // Keyboard navigation for sequential mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen || attMode !== "sequential" || view !== "take") return;

            switch (e.key) {
                case "ArrowRight":
                    handleNext();
                    break;
                case "ArrowLeft":
                    handlePrevious();
                    break;
                case "p":
                case "P":
                    handleSequentialMark("PRESENT");
                    break;
                case "a":
                case "A":
                    handleSequentialMark("ABSENT");
                    break;

                case "Backspace":
                case "Delete":
                    handleSequentialReset();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, attMode, currentIndex, students, handleNext, handlePrevious, view]);

    const isDateToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const isDateYesterday = (d: Date) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return d.getDate() === yesterday.getDate() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getFullYear() === yesterday.getFullYear();
    };

    const currentStudent = students[currentIndex];
    const currentSequentialStatus = currentStudent ? attRecords[currentStudent.id]?.status : null;

    return (
        <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        Llamar Asistencia
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent 
                side="bottom" 
                className="p-0 flex flex-col gap-0 border-none overflow-hidden bg-background h-screen w-screen max-w-none animate-in duration-300 [&>button]:hidden" 
            >
                {/* Top Toolbar */}
                <div className="p-4 border-b flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-muted/20 shrink-0">
                    <div className="flex flex-wrap items-center gap-3">
                        {view === "history" ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setView("take");
                                        setHistoryStudent(null);
                                    }}
                                    className="h-8 rounded-lg font-bold text-xs gap-1.5"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver
                                </Button>
                                <SheetTitle className="text-xl font-bold">Historial de Asistencia</SheetTitle>
                            </div>
                        ) : view === "summary" ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setView("take")}
                                    className="h-8 rounded-lg font-bold text-xs gap-1.5"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver
                                </Button>
                                <SheetTitle className="text-xl font-bold">Resumen de Asistencia</SheetTitle>
                            </div>
                        ) : view === "all-history" ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setView("take")}
                                    className="h-8 rounded-lg font-bold text-xs gap-1.5"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver
                                </Button>
                                <SheetTitle className="text-xl font-bold">Historial por Estudiante</SheetTitle>
                            </div>
                        ) : view === "analytics" ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setView("take")}
                                    className="h-8 rounded-lg font-bold text-xs gap-1.5"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver
                                </Button>
                                <SheetTitle className="text-xl font-bold">Estadísticas y Analíticas</SheetTitle>
                            </div>
                        ) : (
                            <SheetTitle className="text-xl font-bold">Llamado de Asistencia</SheetTitle>
                        )}
                        
                        {/* Date Picker Section */}
                        {view === "take" && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={isDateToday(attendanceDate) ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 rounded-lg font-bold text-xs"
                                    onClick={() => {
                                        const todayStr = format(new Date(), "yyyy-MM-dd");
                                        if (classDates.includes(todayStr)) {
                                            setAttendanceDate(new Date(todayStr + "T00:00:00"));
                                        } else {
                                            const closest = classDates.find(d => d >= todayStr) || classDates[classDates.length - 1];
                                            if (closest) {
                                                setAttendanceDate(new Date(closest + "T00:00:00"));
                                            } else {
                                                toast.error("No hay clases programadas");
                                            }
                                        }
                                    }}
                                >
                                    Hoy
                                </Button>

                                <div className="flex items-center -space-x-px">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-l-lg rounded-r-none" 
                                        onClick={() => {
                                            const currentDateStr = format(attendanceDate, "yyyy-MM-dd");
                                            const idx = classDates.indexOf(currentDateStr);
                                            if (idx > 0) {
                                                setAttendanceDate(new Date(classDates[idx - 1] + "T00:00:00"));
                                            }
                                        }}
                                        disabled={classDates.indexOf(format(attendanceDate, "yyyy-MM-dd")) <= 0}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-r-lg rounded-l-none border-l-0" 
                                        onClick={() => {
                                            const currentDateStr = format(attendanceDate, "yyyy-MM-dd");
                                            const idx = classDates.indexOf(currentDateStr);
                                            if (idx !== -1 && idx < classDates.length - 1) {
                                                setAttendanceDate(new Date(classDates[idx + 1] + "T00:00:00"));
                                            }
                                        }}
                                        disabled={classDates.indexOf(format(attendanceDate, "yyyy-MM-dd")) === -1 || classDates.indexOf(format(attendanceDate, "yyyy-MM-dd")) === classDates.length - 1}
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer group bg-background border px-3 py-1 rounded-xl shadow-sm h-8 hover:border-primary transition-colors">
                                    <Calendar className="h-3.5 w-3.5 text-primary group-hover:text-primary transition-colors" />
                                    <select
                                        value={format(attendanceDate, "yyyy-MM-dd")}
                                        onChange={handleDateChangeSelect}
                                        className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer focus:ring-0 outline-none capitalize"
                                    >
                                        {classDates.map(dateStr => (
                                            <option key={dateStr} value={dateStr} className="text-foreground bg-background">
                                                {formatCalendarDate(new Date(dateStr + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy")}
                                            </option>
                                        ))}
                                        {classDates.length === 0 && (
                                            <option value={format(attendanceDate, "yyyy-MM-dd")}>
                                                {formatCalendarDate(attendanceDate, "EEEE, d 'de' MMMM 'de' yyyy")}
                                            </option>
                                        )}
                                    </select>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Mode Selector and View Toggle */}
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                        {view === "take" && (
                            <div className="flex items-center p-0.5 bg-muted rounded-lg border">
                                <button
                                    onClick={() => setAttMode("list")}
                                    className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-bold transition-all ${
                                        attMode === "list"
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <ListTodo className="h-3.5 w-3.5 mr-0.5" />
                                    Listado
                                </button>
                                <button
                                    onClick={() => setAttMode("sequential")}
                                    className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-bold transition-all ${
                                        attMode === "sequential"
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Play className="h-3.5 w-3.5 mr-0.5" />
                                    Secuencial
                                </button>
                            </div>
                        )}

                        {view === "take" && (
                            <Button
                                onClick={() => {
                                    setView("all-history");
                                    loadAllHistory();
                                }}
                                variant="outline"
                                className="h-8 rounded-lg font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
                            >
                                <History className="h-3.5 w-3.5" />
                                Ver Historial
                            </Button>
                        )}

                        {view === "take" && (
                            <Button
                                onClick={() => {
                                    setView("analytics");
                                    loadAnalytics();
                                }}
                                variant="outline"
                                className="h-8 rounded-lg font-bold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
                            >
                                <TrendingUp className="h-3.5 w-3.5" />
                                Ver Analítica
                            </Button>
                        )}

                        {view !== "history" && (
                            <Button
                                onClick={() => {
                                    if (view === "take") {
                                        setView("summary");
                                        loadSummary();
                                    } else {
                                        setView("take");
                                    }
                                }}
                                className="h-8 rounded-lg font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5"
                            >
                                {view === "take" ? (
                                    <>
                                        <LayoutDashboard className="h-3.5 w-3.5" />
                                        Ver Resumen
                                    </>
                                ) : (
                                    <>
                                        <ListTodo className="h-3.5 w-3.5" />
                                        Llamar Asistencia
                                    </>
                                )}
                            </Button>
                        )}

                        <SheetClose asChild>
                            <Button 
                                variant="outline" 
                                className="h-8 rounded-lg font-bold text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/60 hover:text-destructive transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                                Cerrar
                            </Button>
                        </SheetClose>
                    </div>
                </div>

                {/* Course Progress Strip */}
                {classDates.length > 0 && view === "take" && (() => {
                    const todayStr = format(new Date(), "yyyy-MM-dd");
                    const held    = classDates.filter(d => d <= todayStr).length;
                    const total   = classDates.length;
                    const remaining = total - held;
                    const pct = total > 0 ? Math.round((held / total) * 100) : 0;
                    const progressColor =
                        pct >= 90 ? "from-emerald-500 to-teal-400" :
                        pct >= 60 ? "from-blue-500 to-cyan-400" :
                        pct >= 30 ? "from-amber-500 to-yellow-400" :
                                    "from-rose-500 to-orange-400";
                    return (
                        <div className="px-4 py-2.5 border-b bg-muted/10 shrink-0">
                            <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                        <span className="text-foreground font-black">{held}</span> clases realizadas
                                    </span>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
                                        <span className="text-foreground font-black">{remaining}</span> por realizar
                                    </span>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span>{total} en total</span>
                                </div>
                                <span className="font-black text-foreground">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* Main Viewport */}
                <div className={`flex-1 p-4 bg-muted/10 flex flex-col min-h-0 ${view === "take" && attMode === "sequential" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}>
                    {view === "take" ? (
                        loading || loadingAttendance ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                                <span className="text-sm font-semibold">Cargando datos de asistencia...</span>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <UserCheck className="w-20 h-20 opacity-20" />
                                <p className="text-lg font-bold">No hay estudiantes en este curso.</p>
                            </div>
                        ) : attMode === "list" ? (
                            /* LIST VIEW MODE */
                            <div className="w-full space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {students.map((student) => {
                                        const rec = attRecords[student.id];
                                        const status = rec?.status || "PRESENT";
                                        const isPresent = status === "PRESENT";
                                        const isAbsent = status === "ABSENT";
                                        const isLate = status === "LATE";
                                        const isLeaveEarly = status === "LEAVE_EARLY";
                                        const isSaving = rec?.saving;

                                        return (
                                            <div 
                                                key={student.id} 
                                                className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col gap-4 bg-card relative overflow-hidden group
                                                  ${isPresent ? 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/[0.01] hover:border-emerald-500/30' 
                                                  : isAbsent ? 'border-rose-500/20 dark:border-rose-500/30 bg-rose-500/[0.01] hover:border-rose-500/30' 
                                                  : isLate ? 'border-amber-500/20 dark:border-amber-500/30 bg-amber-500/[0.01] hover:border-amber-500/30' 
                                                  : isLeaveEarly ? 'border-indigo-500/20 dark:border-indigo-500/30 bg-indigo-500/[0.01] hover:border-indigo-500/30' 
                                                  : 'border-border hover:border-primary/30'}`}
                                            >
                                                {/* Left Accent indicator line */}
                                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-colors duration-300
                                                    ${isPresent ? 'bg-emerald-500' 
                                                    : isAbsent ? 'bg-rose-500' 
                                                    : isLate ? 'bg-amber-500' 
                                                    : isLeaveEarly ? 'bg-indigo-500' 
                                                    : 'bg-transparent'}`} 
                                                />
                                                {isSaving && (
                                                    <div className="absolute top-2 right-2 flex items-center justify-center animate-pulse">
                                                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                                    </div>
                                                )}

                                                {/* Details */}
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-muted-foreground/15 shadow-sm">
                                                        <AvatarImage src={student.image || ""} alt={student.name || ""} className="object-cover" />
                                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                                                            {(student.name || "ES").substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-sm text-foreground truncate capitalize">
                                                            {student.profile?.nombres && student.profile?.apellido 
                                                                ? `${student.profile.nombres} ${student.profile.apellido}`.toLowerCase() 
                                                                : (student.name || "Sin nombre").toLowerCase()}
                                                        </h3>
                                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                            ID: {student.profile?.identificacion || student.id.substring(0, 8)}
                                                        </p>
                                                    </div>
                                                    {/* Cumulative badges */}
                                                    {(() => {
                                                        const s = allStudentStats[student.id];
                                                        if (!s) return null;
                                                        return (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {s.absences > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                                        <X className="h-2.5 w-2.5" />{s.absences}
                                                                    </span>
                                                                )}
                                                                {s.late > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                                        <Clock className="h-2.5 w-2.5" />{s.late}
                                                                    </span>
                                                                )}
                                                                {s.leaveEarly > 0 && (
                                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                                        <LogOut className="h-2.5 w-2.5" />{s.leaveEarly}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                }
                                                    {/* History button — only if student has absences/lates/early exits */}
                                                    {(() => {
                                                        const s = allStudentStats[student.id];
                                                        const hasHistory = s && (s.absences > 0 || s.late > 0 || s.leaveEarly > 0);
                                                        if (!hasHistory) return null;
                                                                                        return (
                                                            <button
                                                                title="Ver historial"
                                                                className="h-6 w-6 shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setView("history");
                                                                    setHistoryLoading(true);
                                                                    setHistoryStudent({ student, records: [] });
                                                                    try {
                                                                        const stats = await getStudentAttendanceStatsAction(courseId, student.id);
                                                                        setHistoryStudent({ student, records: stats.records });
                                                                    } catch (err) {
                                                                        console.error("History fetch error:", err);
                                                                        toast.error("Error al cargar historial");
                                                                    } finally {
                                                                        setHistoryLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                <History className="h-3.5 w-3.5" />
                                                            </button>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Button Toggles */}
                                                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 w-full">
                                                    <Button
                                                        size="sm"
                                                        variant={isPresent ? "default" : "outline"}
                                                        className={`flex-1 h-8 text-[11px] font-black rounded-lg transition-all px-1
                                                          ${isPresent 
                                                            ? 'bg-green-600 hover:bg-green-700 text-white font-extrabold shadow-sm' 
                                                            : 'text-muted-foreground hover:text-green-600 hover:bg-green-500/10'}`}
                                                        onClick={() => handleMarkStudent(student.id, "PRESENT")}
                                                    >
                                                        <UserCheck className="h-3 w-3 mr-0.5 shrink-0" />
                                                        Presente
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant={isAbsent ? "default" : "outline"}
                                                        className={`flex-1 h-8 text-[11px] font-black rounded-lg transition-all px-1
                                                          ${isAbsent 
                                                            ? 'bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-sm' 
                                                            : 'text-muted-foreground hover:text-red-600 hover:bg-red-500/10'}`}
                                                        onClick={() => handleMarkStudent(student.id, "ABSENT")}
                                                    >
                                                        <UserX className="h-3 w-3 mr-0.5 shrink-0" />
                                                        Ausente
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant={isLate ? "default" : "outline"}
                                                        className={`flex-1 h-8 text-[11px] font-black rounded-lg transition-all px-1
                                                          ${isLate 
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-sm' 
                                                            : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10'}`}
                                                        onClick={() => handleMarkStudent(student.id, "LATE")}
                                                    >
                                                        <Clock className="h-3 w-3 mr-0.5 shrink-0" />
                                                        Tarde
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant={isLeaveEarly ? "default" : "outline"}
                                                        className={`flex-1 h-8 text-[11px] font-black rounded-lg transition-all px-1
                                                          ${isLeaveEarly 
                                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm' 
                                                            : 'text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50/10'}`}
                                                        onClick={() => handleMarkStudent(student.id, "LEAVE_EARLY")}
                                                    >
                                                        <LogOut className="h-3 w-3 mr-0.5 shrink-0" />
                                                        Retiro
                                                    </Button>
                                                </div>

                                                {/* Sub-inputs */}
                                                {isLate && (
                                                    <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 animate-in slide-in-from-top-2 duration-200 shrink-0">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Hora Llegada:</span>
                                                        <select
                                                            value={rec?.arrivalTime || getClosestTimeOption(scheduleTimeOptions)}
                                                            onChange={(e) => handleMarkStudent(student.id, "LATE", e.target.value)}
                                                            className="h-7 w-[105px] rounded-lg border border-yellow-300 dark:border-yellow-900 bg-background text-[11px] font-bold text-foreground px-1.5 outline-none focus:ring-1 focus:ring-yellow-500 cursor-pointer"
                                                        >
                                                            {scheduleTimeOptions.map(t => (
                                                                <option key={t} value={t}>
                                                                    {formatTo12Hour(t)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {isLeaveEarly && (
                                                    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 animate-in slide-in-from-top-2 duration-200 shrink-0">
                                                        <div className="flex items-center justify-between gap-3 w-full">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Hora Salida:</span>
                                                            <select
                                                                value={rec?.departureTime || getClosestTimeOption(scheduleTimeOptions)}
                                                                onChange={(e) => handleMarkStudent(student.id, "LEAVE_EARLY", undefined, undefined, e.target.value)}
                                                                className="h-7 w-[105px] rounded-lg border border-indigo-300 dark:border-indigo-900 bg-background text-[11px] font-bold text-foreground px-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                            >
                                                                {scheduleTimeOptions.map(t => (
                                                                    <option key={t} value={t}>
                                                                        {formatTo12Hour(t)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* SEQUENTIAL CARD MODE */
                            currentStudent ? (
                                <div key={currentStudent.id} className="flex-1 flex flex-col md:flex-row gap-3 px-2 pb-2 min-h-0 overflow-y-auto md:overflow-hidden animate-in fade-in duration-300">
                                        
                                        {/* Left Column: Navigation List — fixed width sidebar */}
                                        <div className="hidden md:flex flex-col w-52 flex-none bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-md">
                                            <div className="p-4 border-b border-border/40 bg-muted/30">
                                                <h3 className="text-sm font-bold uppercase tracking-widest opacity-70">Estudiantes</h3>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                {students.map((student, index) => (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => setCurrentIndex(index)}
                                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                                                            currentIndex === index 
                                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                                                            : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                                        }`}
                                                    >
                                                        <Avatar className={`h-8 w-8 border ${currentIndex === index ? "border-primary-foreground/30" : "border-border"}`}>
                                                            <AvatarImage src={student.image || ""} alt={student.name || "Estudiante"} />
                                                            <AvatarFallback className="text-[10px] bg-muted">
                                                                {(student.name || "ES").substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className={`text-xs font-semibold truncate text-left capitalize transition-colors ${
                                                            currentIndex === index 
                                                            ? "text-primary-foreground" 
                                                            : "text-foreground group-hover:text-primary"
                                                        }`}>
                                                            {student.profile?.nombres && student.profile?.apellido 
                                                                ? `${student.profile.nombres} ${student.profile.apellido}`.toLowerCase() 
                                                                : (student.name || "Sin Nombre").toLowerCase()}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Middle Column: Current Student Info */}
                                        <div className="flex flex-col items-center justify-center flex-1 w-full min-w-0 gap-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg overflow-y-auto custom-scrollbar">
                                            <div className="flex flex-col items-center gap-4 w-full">
                                                <div className="relative">
                                                    <div className={`absolute inset-0 rounded-full blur-xl opacity-35 transition-all duration-300 animate-pulse
                                                        ${currentSequentialStatus === 'PRESENT' ? 'bg-emerald-500'
                                                        : currentSequentialStatus === 'ABSENT' ? 'bg-rose-500'
                                                        : currentSequentialStatus === 'LATE' ? 'bg-amber-500'
                                                        : currentSequentialStatus === 'LEAVE_EARLY' ? 'bg-indigo-500'
                                                        : 'bg-primary'}`} 
                                                    />
                                                    <Avatar className={`relative h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-2xl ring-4 transition-all duration-500 hover:scale-105
                                                        ${currentSequentialStatus === 'PRESENT' ? 'ring-emerald-500/30'
                                                        : currentSequentialStatus === 'ABSENT' ? 'ring-rose-500/30'
                                                        : currentSequentialStatus === 'LATE' ? 'ring-amber-500/30'
                                                        : currentSequentialStatus === 'LEAVE_EARLY' ? 'ring-indigo-500/30'
                                                        : 'ring-primary/20'}`}>
                                                        <AvatarImage src={currentStudent.image || ""} alt={currentStudent.name || "Estudiante"} className="object-cover" />
                                                        <AvatarFallback className="text-3xl md:text-5xl font-light bg-muted text-muted-foreground animate-in fade-in duration-200">
                                                            {(currentStudent.name || "ES").substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="text-center space-y-0.5 max-w-xs px-2 capitalize">
                                                    <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 leading-tight">
                                                        {currentStudent.profile?.nombres?.toLowerCase() || (currentStudent.name || "Sin").split(" ")[0].toLowerCase()}
                                                    </h1>
                                                    <h2 className="text-base md:text-xl text-muted-foreground font-semibold">
                                                        {currentStudent.profile?.apellido?.toLowerCase() || (currentStudent.name || "Nombre").split(" ").slice(1).join(" ").toLowerCase()}
                                                    </h2>
                                                </div>
                                            </div>

                                            {/* Cumulative Statistics */}
                                            {studentStats && (
                                                <div className="flex flex-wrap justify-center gap-2 w-full">
                                                    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 min-w-[80px]">
                                                        <span className="font-black text-xl leading-none">{studentStats.late}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Tardes</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 min-w-[80px]">
                                                        <span className="font-black text-xl leading-none">{studentStats.leaveEarly}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Retiros</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 min-w-[80px]">
                                                        <span className="font-black text-xl leading-none">{studentStats.absences}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Faltas</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Actions — fixed width, always visible */}
                                        <div className="flex flex-col items-center justify-center w-full md:w-72 flex-none gap-4">
                                            <div className="flex items-center gap-4 px-6 py-2.5 rounded-2xl bg-card border border-border shadow-lg backdrop-blur-md w-fit">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all disabled:opacity-30" 
                                                    onClick={handlePrevious} 
                                                    disabled={currentIndex === 0}
                                                >
                                                    <ArrowLeft className="h-5 w-5" />
                                                </Button>
                                                <span className="w-28 text-center text-sm font-black text-foreground tracking-wide">{currentIndex + 1} de {students.length}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all disabled:opacity-30" 
                                                    onClick={handleNext} 
                                                    disabled={currentIndex === students.length - 1}
                                                >
                                                    <ArrowRight className="h-5 w-5" />
                                                </Button>
                                            </div>

                                             {/* Live Indicator */}
                                             <div className="w-full px-2 flex justify-center">
                                                 {currentSequentialStatus ? (
                                                     <div className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 shadow-sm backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-300 w-full max-w-md
                                                       ${currentSequentialStatus === 'PRESENT' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                       : currentSequentialStatus === 'ABSENT' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                                       : currentSequentialStatus === 'LATE' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                                       : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                         {currentSequentialStatus === "PRESENT" ? <Check className="w-4 h-4" /> 
                                                          : currentSequentialStatus === "ABSENT" ? <X className="w-4 h-4" /> 
                                                          : currentSequentialStatus === "LATE" ? <Clock className="w-4 h-4" />
                                                          : <LogOut className="w-4 h-4" />}
                                                         <span className="font-bold text-xs text-center uppercase tracking-wider">
                                                             {currentSequentialStatus === "PRESENT" ? "PRESENTE" 
                                                              : currentSequentialStatus === "ABSENT" ? "AUSENTE" 
                                                              : currentSequentialStatus === "LATE" ? "TARDE" 
                                                              : "RETIRO"}
                                                         </span>
                                                     </div>
                                                 ) : (
                                                     <div className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-dashed bg-muted/40 border-muted-foreground/40 text-muted-foreground shadow-sm backdrop-blur-md w-full max-w-md">
                                                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                         <span className="font-medium text-xs text-center">Sin registrar - Pendiente</span>
                                                     </div>
                                                 )}
                                             </div>
 
                                             {/* Swipe Toggles */}
                                             <div className="flex flex-col sm:flex-row gap-4 w-full px-2 max-w-md">
                                                 <Button
                                                     size="lg"
                                                     variant="outline"
                                                     className={`relative overflow-hidden group flex-1 h-16 md:h-24 text-base md:text-xl font-black border-2 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 active:translate-y-0 ${
                                                         currentSequentialStatus === "ABSENT" 
                                                         ? "bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-600 shadow-xl shadow-red-500/20 hover:from-rose-600 hover:to-red-700" 
                                                         : "border-rose-200 dark:border-rose-950/40 bg-rose-500/[0.02] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:border-rose-400"
                                                     }`}
                                                     onClick={() => handleSequentialMark("ABSENT")}
                                                 >
                                                     <div className="flex flex-col items-center gap-1.5">
                                                         <X className="h-6 w-6 transition-transform group-hover:scale-110" />
                                                         <span className="text-[10px] uppercase tracking-widest font-black">Falta (A)</span>
                                                     </div>
                                                 </Button>
 
                                                 <Button
                                                     size="lg"
                                                     variant="outline"
                                                     className={`relative overflow-hidden group flex-1 h-16 md:h-24 text-base md:text-xl font-black border-2 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 active:translate-y-0 ${
                                                         currentSequentialStatus === "PRESENT" 
                                                         ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-600 shadow-xl shadow-green-500/20 hover:from-emerald-600 hover:to-green-700" 
                                                         : "border-emerald-200 dark:border-emerald-950/40 bg-emerald-500/[0.02] hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:border-emerald-400"
                                                     }`}
                                                     onClick={() => handleSequentialMark("PRESENT")}
                                                 >
                                                     <div className="flex flex-col items-center gap-1.5">
                                                         <Check className="h-6 w-6 transition-transform group-hover:scale-110" />
                                                         <span className="text-[10px] uppercase tracking-widest font-black">Presente (P)</span>
                                                     </div>
                                                 </Button>
                                             </div>

                                            {/* Reset/Undo */}
                                            <div className="opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center gap-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 px-4 gap-2"
                                                    onClick={handleSequentialReset}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    <span className="text-xs">Deshacer anterior</span>
                                                </Button>
                                                <span className="text-[9px] text-muted-foreground/60 text-center">Atajos: P (Presente), A (Falta), Retroceso (Deshacer), Flechas (Navegar)</span>
                                            </div>
                                        </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                    <UserCheck className="w-16 h-16 opacity-20" />
                                    <p className="text-base font-semibold">No hay estudiantes en el curso.</p>
                                </div>
                            )
                        ) ) : view === "summary" ? (
                        /* SUMMARY VIEW MODE */
                        <div className="w-full bg-card rounded-2xl border p-6 shadow-xl animate-in fade-in duration-300">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                                <LayoutDashboard className="h-5 w-5 text-primary" />
                                Resumen Acumulado de Asistencias
                            </h2>
                            {loadingSummary ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-sm font-semibold">Calculando estadísticas...</span>
                                </div>
                            ) : summaryData.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No hay registros de asistencia en este curso.</p>
                            ) : (
                                <div className="border rounded-xl overflow-x-auto bg-background/50">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted/40 text-xs font-bold text-muted-foreground uppercase border-b">
                                                <th className="p-3 pl-4">Estudiante</th>
                                                <th className="p-3 text-center">Clases</th>
                                                <th className="p-3 text-center text-green-600">Presente</th>
                                                <th className="p-3 text-center text-red-600">Falta</th>
                                                <th className="p-3 text-center text-amber-600">Tarde</th>
                                                <th className="p-3 text-center text-indigo-600">Retiro</th>
                                                <th className="p-3 pr-4 text-right">% Asistencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y text-sm">
                                            {summaryData.map((row) => {
                                                const badgeColor = row.percentage >= 80 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                                    : row.percentage >= 70
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';

                                                return (
                                                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="p-3 pl-4 font-semibold capitalize text-foreground">{row.name.toLowerCase()}</td>
                                                        <td className="p-3 text-center font-mono text-xs text-foreground">{row.total}</td>
                                                        <td className="p-3 text-center font-mono font-bold text-green-600">{row.presents}</td>
                                                        <td className="p-3 text-center font-mono font-bold text-red-600">{row.absences}</td>
                                                        <td className="p-3 text-center font-mono font-bold text-amber-600">{row.lates}</td>
                                                        <td className="p-3 text-center font-mono font-bold text-indigo-600">{row.leaveEarly}</td>
                                                        <td className="p-3 pr-4 text-right">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${badgeColor}`}>
                                                                {row.percentage.toFixed(0)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : view === "history" ? (
                        /* HISTORY VIEW MODE (FULL SCREEN) */
                        <div className="w-full bg-card rounded-2xl border p-6 shadow-xl animate-in fade-in duration-300 flex flex-col gap-6">
                            {historyStudent && (
                                <>
                                    {/* Student Header Summary Card */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/10 border">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border border-border shadow-sm">
                                                <AvatarImage src={historyStudent.student.image || undefined} />
                                                <AvatarFallback className="text-sm bg-muted text-muted-foreground font-bold">
                                                    {(historyStudent.student.name || "ES").substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-base font-black capitalize text-foreground">
                                                    {historyStudent.student.profile?.nombres && historyStudent.student.profile?.apellido
                                                        ? `${historyStudent.student.profile.nombres} ${historyStudent.student.profile.apellido}`.toLowerCase()
                                                        : (historyStudent.student.name || "Estudiante").toLowerCase()}
                                                </h3>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    ID: {historyStudent.student.profile?.identificacion || historyStudent.student.id}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Cumulative stats badges */}
                                        {(() => {
                                            const s = allStudentStats[historyStudent.student.id];
                                            if (!s) return null;
                                            return (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                        Faltas: {s.absences}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                        Tardes: {s.late}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                        Retiros: {s.leaveEarly}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* History Records Table */}
                                    <div className="border rounded-xl overflow-x-auto bg-background/50">
                                        {historyLoading ? (
                                            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                <span className="text-sm font-semibold">Cargando historial...</span>
                                            </div>
                                        ) : !historyStudent.records.length ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                                                <Calendar className="h-10 w-10 opacity-20" />
                                                <p className="text-sm font-semibold">Sin registros de asistencia</p>
                                            </div>
                                        ) : (
                                            <table className="w-full text-sm text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-muted/40 text-xs font-bold text-muted-foreground uppercase border-b">
                                                        <th className="p-3 pl-4">Fecha</th>
                                                        <th className="p-3 text-center">Estado</th>
                                                        <th className="p-3 text-center">Hora</th>
                                                        <th className="p-3 pr-4">Excusa / Nota</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y text-sm">
                                                    {historyStudent.records.map((rec: any, i: number) => {
                                                        const d = new Date(rec.date);
                                                        const dateStr = d.toLocaleDateString("es-CO", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
                                                        const statusMap: Record<string, { label: string; cls: string }> = {
                                                            PRESENT:    { label: "Presente",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
                                                            ABSENT:     { label: "Falta",     cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
                                                            LATE:       { label: "Tarde",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
                                                            LEAVE_EARLY:{ label: "Retiro",    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
                                                            EXCUSED:    { label: "Excusado",  cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
                                                        };
                                                        const st = statusMap[rec.status] || { label: rec.status, cls: "bg-muted text-muted-foreground border-border" };
                                                        const timeVal = rec.arrivalTime
                                                            ? new Date(rec.arrivalTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
                                                            : rec.departureTime
                                                                ? new Date(rec.departureTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
                                                                : "—";
                                                        return (
                                                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                                                                <td className="p-3 pl-4 font-semibold capitalize text-foreground">{dateStr}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black border ${st.cls}`}>
                                                                        {st.label}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center font-mono text-xs text-muted-foreground">{timeVal}</td>
                                                                <td className="p-3 pr-4 text-xs">
                                                                    {rec.justification ? (
                                                                        rec.justification.startsWith("http") ? (
                                                                            <a href={rec.justification} target="_blank" rel="noopener noreferrer"
                                                                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                                                                                <FileText className="h-3 w-3" />
                                                                                Ver documento
                                                                                <ExternalLink className="h-2.5 w-2.5" />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">{rec.justification}</span>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-muted-foreground/40">—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : view === "all-history" ? (
                        /* ALL HISTORY VIEW MODE (FULL SCREEN) */
                        <div className="w-full bg-card rounded-2xl border p-6 shadow-xl animate-in fade-in duration-300 flex flex-col gap-6">
                            <div className="flex items-center justify-between border-b pb-4 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                        <History className="h-5 w-5 text-primary" />
                                        Historial Completo de Asistencia
                                    </h2>
                                    <p className="text-xs text-muted-foreground">Historial detallado agrupado por estudiante</p>
                                </div>
                            </div>
                            
                            {allHistoryLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                    <span className="text-sm font-semibold">Cargando registros...</span>
                                </div>
                            ) : students.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                                    <UserCheck className="w-16 h-16 opacity-20" />
                                    <p className="text-base font-semibold">No hay estudiantes en el curso.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {students.map((student) => {
                                        // Filter records for this student
                                        const records = allHistoryRecords.filter(r => r.userId === student.id);
                                        const stats = allStudentStats[student.id];
                                        
                                        return (
                                            <div key={student.id} className="border border-border/80 rounded-xl overflow-hidden bg-background/30 p-4 flex flex-col gap-4">
                                                {/* Student Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 border border-border shadow-sm">
                                                            <AvatarImage src={student.image || undefined} />
                                                            <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                                                                {(student.name || "ES").substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <h4 className="text-sm font-black capitalize text-foreground">
                                                                {student.profile?.nombres && student.profile?.apellido
                                                                    ? `${student.profile.nombres} ${student.profile.apellido}`.toLowerCase()
                                                                    : (student.name || "Estudiante").toLowerCase()}
                                                            </h4>
                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                                ID: {student.profile?.identificacion || student.id.substring(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* stats */}
                                                    {stats && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                                Faltas: {stats.absences}
                                                            </span>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                                Tardes: {stats.late}
                                                            </span>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                                                Retiros: {stats.leaveEarly}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Attendance records for this student */}
                                                {!records.length ? (
                                                    <p className="text-xs text-muted-foreground/60 italic py-2 pl-1">Sin historial relevante (0 faltas, 0 tardes, 0 retiros)</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left border-collapse">
                                                            <thead>
                                                                <tr className="text-muted-foreground uppercase text-[10px] font-bold border-b border-border/30">
                                                                    <th className="py-2 pl-1">Fecha</th>
                                                                    <th className="py-2 text-center">Estado</th>
                                                                    <th className="py-2 text-center">Hora</th>
                                                                    <th className="py-2 pr-1">Excusa / Nota</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {records.map((rec: any, idx: number) => {
                                                                    const d = new Date(rec.date);
                                                                    const dateStr = d.toLocaleDateString("es-CO", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
                                                                    const statusMap: Record<string, { label: string; cls: string }> = {
                                                                        PRESENT:    { label: "Presente",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
                                                                        ABSENT:     { label: "Falta",     cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
                                                                        LATE:       { label: "Tarde",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
                                                                        LEAVE_EARLY:{ label: "Retiro",    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
                                                                        EXCUSED:    { label: "Excusado",  cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
                                                                    };
                                                                    const st = statusMap[rec.status] || { label: rec.status, cls: "bg-muted text-muted-foreground border-border" };
                                                                    const timeVal = rec.arrivalTime
                                                                        ? new Date(rec.arrivalTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
                                                                        : rec.departureTime
                                                                            ? new Date(rec.departureTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
                                                                            : "—";
                                                                    
                                                                    return (
                                                                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                                                            <td className="py-2 pl-1 font-semibold capitalize text-foreground/90">{dateStr}</td>
                                                                            <td className="py-2 text-center">
                                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black border ${st.cls}`}>
                                                                                    {st.label}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 text-center font-mono text-[10px] text-muted-foreground">{timeVal}</td>
                                                                            <td className="py-2 pr-1 text-[11px]">
                                                                                {rec.justification ? (
                                                                                    rec.justification.startsWith("http") ? (
                                                                                        <a href={rec.justification} target="_blank" rel="noopener noreferrer"
                                                                                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                                                                                            <FileText className="h-3 w-3" />
                                                                                            Ver documento
                                                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-muted-foreground">{rec.justification}</span>
                                                                                    )
                                                                                ) : (
                                                                                    <span className="text-muted-foreground/40">—</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ANALYTICS VIEW MODE */
                        <div className="w-full bg-card rounded-2xl border p-6 shadow-xl animate-in fade-in duration-300">
                            {loadingAnalytics ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-sm font-semibold">Cargando analíticas...</span>
                                </div>
                            ) : analyticsData.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No hay datos de asistencia para este curso.</p>
                            ) : (
                                <AttendanceStatistics 
                                    data={analyticsData} 
                                    dateColumns={classDates} 
                                />
                            )}
                        </div>
                    )}

                </div>
            </SheetContent>
        </Sheet>
        </>
    );
}
