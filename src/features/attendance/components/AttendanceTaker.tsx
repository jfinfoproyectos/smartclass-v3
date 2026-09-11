"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    getCourseAllAttendanceRecordsAction,
    deleteAttendanceRecordAction
} from "@/features/teacher/actions/attendanceActions";
import { getCourseClassDates, formatCalendarDate, getTodayDateString, toUTCStartOfDayFromRegional, formatTimeRegional } from "@/lib/dateUtils";
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
    TrendingUp,
    Search,
    FileDown,
    FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { pdf } from "@react-pdf/renderer";
import { StudentAttendanceHistoryPDF, CourseAttendanceHistoryPDF } from "./AttendanceHistoryPDF";
import { exportStudentAttendanceToExcel, exportCourseAttendanceToExcel } from "../utils/attendanceExcelExport";

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
    const [view, setView] = useState<"take" | "summary" | "history" | "all-history" | "analytics">("take");
    const [attMode, setAttMode] = useState<"list" | "sequential">("list");
    const [students, setStudents] = useState<Student[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [courseSchedule, setCourseSchedule] = useState<{
        title?: string | null;
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
        status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "LEAVE_EARLY" | null; 
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
    const [onlyCurrentDate, setOnlyCurrentDate] = useState(false);
    const [historySearch, setHistorySearch] = useState("");
    const [filterFaltas, setFilterFaltas] = useState<"all" | "gte1" | "gte2" | "gte3" | "0">("all");
    const [filterTardes, setFilterTardes] = useState<"all" | "gte1" | "gte2" | "gte3" | "0">("all");
    const [filterRetiros, setFilterRetiros] = useState<"all" | "gte1" | "gte2" | "gte3" | "0">("all");
    const [historyOnlyNovedades, setHistoryOnlyNovedades] = useState(true);

    // Modal de Historial individual por estudiante (Popup)
    const [studentHistoryModalOpen, setStudentHistoryModalOpen] = useState(false);
    const [modalStudent, setModalStudent] = useState<Student | null>(null);
    const [modalRecords, setModalRecords] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalTab, setModalTab] = useState<"absent" | "late" | "leaveEarly">("absent");
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const handleExportStudentPDF = async (student: Student, existingRecords?: any[]) => {
        try {
            setIsExportingPDF(true);
            const studentFullName = getStudentFullName(student);
            toast.loading(`Generando reporte en PDF de ${studentFullName}...`, { id: "student-pdf" });

            let records = existingRecords;
            if (!records || records.length === 0) {
                try {
                    const stats = await getStudentAttendanceStatsAction(courseId, student.id);
                    records = stats.records || [];
                } catch {
                    records = allHistoryRecords.filter(r => r.userId === student.id);
                }
            }

            const stats = allStudentStats[student.id];

            const doc = (
                <StudentAttendanceHistoryPDF
                    student={student}
                    courseTitle={courseSchedule?.title || "Control de Asistencias"}
                    teacherName="Docente Titular"
                    records={records || []}
                    stats={stats ? {
                        absences: stats.absences,
                        late: stats.late,
                        leaveEarly: stats.leaveEarly,
                        totalSessions: classDates.length || undefined,
                    } : undefined}
                />
            );

            const blob = await pdf(doc).toBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeName = studentFullName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ ]/g, "").trim().replace(/\s+/g, "_");
            link.href = url;
            link.download = `Reporte_Asistencia_${safeName || "Estudiante"}.pdf`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            toast.success("Reporte PDF descargado con éxito", { id: "student-pdf" });
        } catch (error) {
            console.error("Error generating student PDF:", error);
            toast.error("Error al exportar el reporte en PDF", { id: "student-pdf" });
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleExportCoursePDF = async () => {
        try {
            setIsExportingPDF(true);
            const courseTitle = courseSchedule?.title || "Curso";
            toast.loading("Generando reporte corporativo en PDF...", { id: "course-pdf" });

            let records = allHistoryRecords;
            if (!records || records.length === 0) {
                try {
                    records = await getCourseAllAttendanceRecordsAction(courseId);
                    setAllHistoryRecords(records);
                } catch (e) {
                    console.error("Error loading records for course PDF:", e);
                }
            }

            const activeFilterParts = [];
            if (filterFaltas !== "all") activeFilterParts.push(`Faltas: ${filterFaltas}`);
            if (filterTardes !== "all") activeFilterParts.push(`Tardes: ${filterTardes}`);
            if (filterRetiros !== "all") activeFilterParts.push(`Retiros: ${filterRetiros}`);
            if (historySearch.trim()) activeFilterParts.push(`Búsqueda: "${historySearch.trim()}"`);
            const filterText = activeFilterParts.length > 0 ? activeFilterParts.join(" • ") : "Todos los estudiantes";

            const doc = (
                <CourseAttendanceHistoryPDF
                    courseTitle={courseSchedule?.title || "Control de Asistencias"}
                    teacherName="Docente Titular"
                    students={filteredHistoryStudents}
                    allStudentStats={allStudentStats}
                    records={records || []}
                    classDates={classDates}
                    filterApplied={filterText}
                />
            );

            const blob = await pdf(doc).toBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeCourse = courseTitle.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ ]/g, "").trim().replace(/\s+/g, "_");
            link.href = url;
            link.download = `Historial_Asistencias_${safeCourse || "Curso"}_${format(new Date(), "yyyyMMdd")}.pdf`;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

            toast.success("Historial completo del curso exportado en PDF", { id: "course-pdf" });
        } catch (error) {
            console.error("Error generating course PDF:", error);
            toast.error("Error al exportar el historial en PDF", { id: "course-pdf" });
        } finally {
            setIsExportingPDF(false);
        }
    };

    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportStudentExcel = async (student: Student, existingRecords?: any[]) => {
        try {
            setIsExportingExcel(true);
            const studentFullName = getStudentFullName(student);
            toast.loading(`Generando Excel para ${studentFullName}...`, { id: "student-excel" });

            let records = existingRecords;
            if (!records || records.length === 0) {
                try {
                    const stats = await getStudentAttendanceStatsAction(courseId, student.id);
                    records = stats.records || [];
                } catch {
                    records = allHistoryRecords.filter(r => r.userId === student.id);
                }
            }

            const stats = allStudentStats[student.id];

            await exportStudentAttendanceToExcel({
                student,
                courseTitle: courseSchedule?.title || "Control de Asistencias",
                teacherName: "Docente Titular",
                records: records || [],
                stats: stats ? {
                    absences: stats.absences,
                    late: stats.late,
                    leaveEarly: stats.leaveEarly,
                    totalSessions: classDates.length || undefined,
                } : undefined,
            });

            toast.success("Reporte Excel descargado con éxito", { id: "student-excel" });
        } catch (error) {
            console.error("Error generating student Excel:", error);
            toast.error("Error al exportar el reporte en Excel", { id: "student-excel" });
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportCourseExcel = async () => {
        try {
            setIsExportingExcel(true);
            toast.loading("Generando libro corporativo de Excel...", { id: "course-excel" });

            let records = allHistoryRecords;
            if (!records || records.length === 0) {
                try {
                    records = await getCourseAllAttendanceRecordsAction(courseId);
                    setAllHistoryRecords(records);
                } catch (e) {
                    console.error("Error loading records for course Excel:", e);
                }
            }

            const activeFilterParts = [];
            if (filterFaltas !== "all") activeFilterParts.push(`Faltas: ${filterFaltas}`);
            if (filterTardes !== "all") activeFilterParts.push(`Tardes: ${filterTardes}`);
            if (filterRetiros !== "all") activeFilterParts.push(`Retiros: ${filterRetiros}`);
            if (historySearch.trim()) activeFilterParts.push(`Búsqueda: "${historySearch.trim()}"`);
            const filterText = activeFilterParts.length > 0 ? activeFilterParts.join(" • ") : "Todos los estudiantes";

            await exportCourseAttendanceToExcel({
                courseTitle: courseSchedule?.title || "Control de Asistencias",
                teacherName: "Docente Titular",
                students: filteredHistoryStudents,
                allStudentStats: allStudentStats,
                records: records || [],
                classDates: classDates,
                filterApplied: filterText,
            });

            toast.success("Historial consolidado en Excel descargado", { id: "course-excel" });
        } catch (error) {
            console.error("Error generating course Excel:", error);
            toast.error("Error al exportar el historial en Excel", { id: "course-excel" });
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleOpenStudentHistoryModal = async (student: Student) => {
        setModalStudent(student);
        setModalRecords([]);
        setModalLoading(true);
        setStudentHistoryModalOpen(true);

        const s = allStudentStats[student.id];
        if (s && s.absences > 0) {
            setModalTab("absent");
        } else if (s && s.late > 0) {
            setModalTab("late");
        } else if (s && s.leaveEarly > 0) {
            setModalTab("leaveEarly");
        } else {
            setModalTab("absent");
        }

        try {
            const stats = await getStudentAttendanceStatsAction(courseId, student.id);
            setModalRecords(stats.records || []);
        } catch (err) {
            console.error("Error loading student history:", err);
            toast.error("Error al cargar historial del estudiante");
        } finally {
            setModalLoading(false);
        }
    };

    const modalAbsences = useMemo(() => {
        return modalRecords.filter((r: any) => r.status === "ABSENT" || r.status === "EXCUSED");
    }, [modalRecords]);

    const modalLates = useMemo(() => {
        return modalRecords.filter((r: any) => r.status === "LATE" || Boolean(r.arrivalTime));
    }, [modalRecords]);

    const modalEarlyExits = useMemo(() => {
        return modalRecords.filter((r: any) => r.status === "LEAVE_EARLY" || Boolean(r.departureTime));
    }, [modalRecords]);

    const activeModalList = useMemo(() => {
        if (modalTab === "absent") return modalAbsences;
        if (modalTab === "late") return modalLates;
        return modalEarlyExits;
    }, [modalTab, modalAbsences, modalLates, modalEarlyExits]);

    const formatModalIncidentDate = (dateVal: string | Date) => {
        try {
            const utcDate = toUTCStartOfDayFromRegional(dateVal);
            const str = formatCalendarDate(utcDate, "EEEE, d 'de' MMMM 'de' yyyy");
            return str.replace(/\b\w/g, (char) => char.toUpperCase());
        } catch {
            return String(dateVal);
        }
    };

    const getStudentInitials = (student: Student) => {
        const raw = student.profile?.nombres || student.name || "ES";
        const clean = raw.trim();
        if (clean.length >= 2) {
            return clean.substring(0, 2).toUpperCase();
        }
        return clean.toUpperCase();
    };

    const getStudentFullName = (student: Student) => {
        if (student.profile?.nombres && student.profile?.apellido) {
            return `${student.profile.nombres} ${student.profile.apellido}`;
        }
        return student.name || "Estudiante";
    };

    const handleDeleteRecord = async (attendanceId: string, studentId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este registro de novedad?")) {
            return;
        }

        try {
            await deleteAttendanceRecordAction(attendanceId, courseId);
            toast.success("Registro de asistencia eliminado con éxito");

            setAllHistoryRecords(prev => prev.filter(r => r.id !== attendanceId));

            if (historyStudent) {
                setHistoryStudent(prev => prev ? {
                    ...prev,
                    records: prev.records.filter(r => r.id !== attendanceId)
                } : null);
            }

            try {
                const newStats = await getCourseAllStudentsAttendanceStatsAction(courseId);
                setAllStudentStats(newStats);
            } catch { /* best-effort */ }

            loadAttendanceForDate(selectedDate);
        } catch (error) {
            console.error("Error deleting attendance record", error);
            toast.error("Error al eliminar el registro");
        }
    };

    const filteredHistoryStudents = useMemo(() => {
        return students.filter(student => {
            const stats = allStudentStats[student.id] || { absences: 0, late: 0, leaveEarly: 0 };
            const fullName = `${student.profile?.nombres || ""} ${student.profile?.apellido || ""} ${student.name || ""}`.toLowerCase();
            const idStr = `${student.profile?.identificacion || student.id}`.toLowerCase();

            if (historySearch.trim()) {
                const q = historySearch.toLowerCase().trim();
                if (!fullName.includes(q) && !idStr.includes(q)) {
                    return false;
                }
            }

            if (filterFaltas === "gte1" && stats.absences < 1) return false;
            if (filterFaltas === "gte2" && stats.absences < 2) return false;
            if (filterFaltas === "gte3" && stats.absences < 3) return false;
            if (filterFaltas === "0" && stats.absences > 0) return false;

            if (filterTardes === "gte1" && stats.late < 1) return false;
            if (filterTardes === "gte2" && stats.late < 2) return false;
            if (filterTardes === "gte3" && stats.late < 3) return false;
            if (filterTardes === "0" && stats.late > 0) return false;

            if (filterRetiros === "gte1" && stats.leaveEarly < 1) return false;
            if (filterRetiros === "gte2" && stats.leaveEarly < 2) return false;
            if (filterRetiros === "gte3" && stats.leaveEarly < 3) return false;
            if (filterRetiros === "0" && stats.leaveEarly > 0) return false;

            return true;
        });
    }, [students, allStudentStats, historySearch, filterFaltas, filterTardes, filterRetiros]);

    const formatDatePillLabel = useCallback((dateStr: string) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const dayOfWeek = dayNames[dateObj.getUTCDay()];
        const dayFormatted = String(day).padStart(2, "0");
        const monthFormatted = String(month).padStart(2, "0");
        return `${dayOfWeek} ${dayFormatted}/${monthFormatted}`;
    }, []);

    const displayDates = useMemo(() => {
        if (onlyCurrentDate) {
            const todayStr = getTodayDateString();
            if (classDates.includes(todayStr)) {
                return [todayStr];
            }
            return [selectedDate];
        }
        return classDates;
    }, [classDates, onlyCurrentDate, selectedDate]);

    useEffect(() => {
        loadStudents();
        loadSchedule();
        if (view === "summary") {
            loadSummary();
        }
    }, [courseId]);

    useEffect(() => {
        if (students.length > 0 && view === "take") {
            loadAttendanceForDate(selectedDate);
        }
    }, [selectedDate, students, view]);

    useEffect(() => {
        if (attMode === "sequential" && students.length > 0 && students[currentIndex] && view === "take") {
            loadStudentStats(students[currentIndex].id);
        }
    }, [currentIndex, students, attMode, selectedDate, view]);

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
                    const todayStr = getTodayDateString();
                    if (dates.includes(todayStr)) {
                        setSelectedDate(todayStr);
                    } else {
                        const pastOrToday = dates.filter(d => d <= todayStr);
                        if (pastOrToday.length > 0) {
                            setSelectedDate(pastOrToday[pastOrToday.length - 1]);
                        } else {
                            setSelectedDate(dates[0]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading course schedule", error);
        }
    };

    const loadAttendanceForDate = async (targetDateStr: string) => {
        setLoadingAttendance(true);
        try {
            const records = await getCourseAttendanceForDateAction(courseId, targetDateStr);
            
            const map: Record<string, any> = {};
            records.forEach((r: any) => {
                let timeStr: string | null = null;
                if (r.arrivalTime) {
                    timeStr = formatTimeRegional(r.arrivalTime);
                }

                let depTimeStr: string | null = null;
                if (r.departureTime) {
                    depTimeStr = formatTimeRegional(r.departureTime);
                }
                
                map[r.userId] = {
                    id: r.id,
                    status: r.status,
                    arrivalTime: timeStr,
                    departureTime: depTimeStr,
                    justification: r.justification
                };
            });

            // Unrecorded students start as null (not marked yet)
            students.forEach(s => {
                if (!map[s.id]) {
                    map[s.id] = {
                        status: null,
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
                            if (cell.status === 'A') {
                                absences++;
                            } else if (cell.status === 'E') {
                                excused++;
                            } else {
                                const hasLate = cell.status === 'L' || Boolean(cell.arrivalTime);
                                const hasLeaveEarly = cell.status === 'R' || Boolean(cell.departureTime);
                                if (hasLate) lates++;
                                if (hasLeaveEarly) leaveEarly++;
                                if (!hasLate && !hasLeaveEarly) presents++;
                            }
                        }
                    }
                });

                const attended = Math.max(0, total - absences);
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

    const executeMark = async (
        studentId: string, 
        status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY", 
        arrivalTimeStr: string | null, 
        departureTimeStr: string | null,
        justificationStr: string | null = null
    ) => {
        if (selectedDate > getTodayDateString()) {
            toast.error("No es posible registrar asistencia en fechas futuras");
            return;
        }

        const dateStr = selectedDate;

        // Optimistic UI update
        setAttRecords(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status,
                arrivalTime: arrivalTimeStr,
                departureTime: departureTimeStr,
                justification: justificationStr,
                saving: true
            }
        }));

        try {
            const arrivalTimeFinal = arrivalTimeStr ? `${dateStr}T${arrivalTimeStr}:00Z` : null;
            const departureTimeFinal = departureTimeStr ? `${dateStr}T${departureTimeStr}:00Z` : null;

            await recordAttendanceAction(
                courseId, 
                studentId, 
                dateStr, 
                status, 
                arrivalTimeFinal, 
                justificationStr,
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

            // Refresh cumulative badge for students in batch
            try {
                const allStats = await getCourseAllStudentsAttendanceStatsAction(courseId);
                setAllStudentStats(allStats);
            } catch { /* badge refresh is best-effort */ }
        } catch (error) {
            console.error("Error marking attendance", error);
            toast.error("Error al registrar asistencia");
            loadAttendanceForDate(selectedDate);
        }
    };

    const handleToggleStatus = async (
        studentId: string, 
        action: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY"
    ) => {
        const currentRec = attRecords[studentId];
        const closestTime = getClosestTimeOption(scheduleTimeOptions);

        const currentIsLate = Boolean(currentRec?.arrivalTime) || currentRec?.status === "LATE";
        const currentIsLeaveEarly = Boolean(currentRec?.departureTime) || currentRec?.status === "LEAVE_EARLY";

        if (action === "PRESENT") {
            // Explicitly set Presente: clears both late & leave early
            await executeMark(studentId, "PRESENT", null, null);
            return;
        }

        if (action === "ABSENT") {
            // Explicitly set Ausente: clears both late & leave early
            await executeMark(studentId, "ABSENT", null, null);
            return;
        }

        if (action === "LATE") {
            if (currentIsLate) {
                // Deactivate Tarde
                if (currentIsLeaveEarly) {
                    // Retiro is still active
                    await executeMark(
                        studentId, 
                        "LEAVE_EARLY", 
                        null, 
                        currentRec?.departureTime || closestTime
                    );
                } else {
                    // Turn off late -> student was present
                    await executeMark(studentId, "PRESENT", null, null);
                }
            } else {
                // Activate Tarde
                const newArrivalTime = currentRec?.arrivalTime || closestTime;
                if (currentIsLeaveEarly) {
                    // Both Tarde and Retiro active!
                    await executeMark(
                        studentId, 
                        "LATE", 
                        newArrivalTime, 
                        currentRec?.departureTime || closestTime
                    );
                } else {
                    await executeMark(studentId, "LATE", newArrivalTime, null);
                }
            }
            return;
        }

        if (action === "LEAVE_EARLY") {
            if (currentIsLeaveEarly) {
                // Deactivate Retiro
                if (currentIsLate) {
                    // Tarde is still active
                    await executeMark(
                        studentId, 
                        "LATE", 
                        currentRec?.arrivalTime || closestTime, 
                        null
                    );
                } else {
                    // Turn off leave early -> student was present
                    await executeMark(studentId, "PRESENT", null, null);
                }
            } else {
                // Activate Retiro
                const newDepartureTime = currentRec?.departureTime || closestTime;
                if (currentIsLate) {
                    // Both Tarde and Retiro active!
                    await executeMark(
                        studentId, 
                        "LEAVE_EARLY", 
                        currentRec?.arrivalTime || closestTime, 
                        newDepartureTime
                    );
                } else {
                    await executeMark(studentId, "LEAVE_EARLY", null, newDepartureTime);
                }
            }
            return;
        }
    };

    const handleTimeChange = async (
        studentId: string, 
        field: "arrivalTime" | "departureTime", 
        val: string
    ) => {
        const currentRec = attRecords[studentId];
        const currentIsLate = Boolean(currentRec?.arrivalTime) || currentRec?.status === "LATE";
        const currentIsLeaveEarly = Boolean(currentRec?.departureTime) || currentRec?.status === "LEAVE_EARLY";

        const nextArrivalTime = field === "arrivalTime" 
            ? val 
            : (currentIsLate ? (currentRec?.arrivalTime || val) : null);

        const nextDepartureTime = field === "departureTime" 
            ? val 
            : (currentIsLeaveEarly ? (currentRec?.departureTime || val) : null);

        const nextStatus = (nextArrivalTime && nextDepartureTime)
            ? (currentRec?.status === "LEAVE_EARLY" ? "LEAVE_EARLY" : "LATE")
            : nextArrivalTime ? "LATE"
            : nextDepartureTime ? "LEAVE_EARLY"
            : "PRESENT";

        await executeMark(studentId, nextStatus, nextArrivalTime, nextDepartureTime);
    };

    const handleMarkStudent = async (
        studentId: string, 
        status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY", 
        timeStr?: string, 
        justificationStr?: string,
        departureTimeStr?: string
    ) => {
        if (timeStr !== undefined) {
            await handleTimeChange(studentId, "arrivalTime", timeStr);
        } else if (departureTimeStr !== undefined) {
            await handleTimeChange(studentId, "departureTime", departureTimeStr);
        } else {
            await handleToggleStatus(studentId, status);
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
            if (attMode !== "sequential" || view !== "take") return;

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
    }, [attMode, currentIndex, students, handleNext, handlePrevious, view]);


    const currentStudent = students[currentIndex];
    const seqRec = currentStudent ? attRecords[currentStudent.id] : null;
    const seqStatus = seqRec?.status ?? null;
    const seqIsLate = Boolean(seqRec?.arrivalTime) || seqStatus === "LATE";
    const seqIsLeaveEarly = Boolean(seqRec?.departureTime) || seqStatus === "LEAVE_EARLY";
    const seqIsPresent = seqStatus === "PRESENT" && !seqIsLate && !seqIsLeaveEarly;
    const seqIsAbsent = seqStatus === "ABSENT";
    const seqIsBoth = seqIsLate && seqIsLeaveEarly;
    const currentSequentialStatus = seqStatus;

    return (
        <>
        <div className="w-full flex flex-col flex-1 min-h-[680px] bg-background rounded-2xl border border-border/60 shadow-xs overflow-hidden">
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
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Historial de Asistencia</h3>
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
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Resumen de Asistencia</h3>
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
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Historial por Estudiante</h3>
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
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Estadísticas y Analíticas</h3>
                        </div>
                    ) : (
                        <h3 className="text-xl font-bold tracking-tight text-foreground">Llamado de Asistencia</h3>
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
                    {view === "take" && classDates.length > 0 && (
                        /* Date Selector Strip (Grouped Pills matching user specification) */
                        <div className="mb-4 shrink-0 space-y-2">
                            <div className="flex items-center justify-between gap-4 px-1">
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/90">
                                        Fecha de Asistencia
                                    </span>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <Switch
                                            checked={onlyCurrentDate}
                                            onCheckedChange={(checked) => {
                                                setOnlyCurrentDate(checked);
                                                if (checked) {
                                                    const todayStr = getTodayDateString();
                                                    if (classDates.includes(todayStr)) {
                                                        setSelectedDate(todayStr);
                                                    }
                                                }
                                            }}
                                        />
                                        <span className="text-xs font-semibold text-foreground/80">
                                            Solo fecha actual
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="w-full bg-card border border-border/70 rounded-2xl p-3 shadow-xs max-h-44 overflow-y-auto custom-scrollbar">
                                <div className="flex flex-wrap items-center gap-2">
                                    {displayDates.map((dateStr) => {
                                        const isSelected = selectedDate === dateStr;
                                        const todayStr = getTodayDateString();
                                        const isToday = dateStr === todayStr;
                                        const isFuture = dateStr > todayStr;
                                        const label = formatDatePillLabel(dateStr);

                                        return (
                                            <button
                                                key={dateStr}
                                                type="button"
                                                disabled={isFuture}
                                                onClick={() => {
                                                    if (!isFuture) {
                                                        setSelectedDate(dateStr);
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                                                    isFuture
                                                        ? "bg-muted/10 border-dashed border-border/40 text-muted-foreground/35 cursor-not-allowed opacity-45 select-none"
                                                        : isSelected
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 font-black scale-[1.02] cursor-pointer"
                                                        : "bg-background border-border/80 text-foreground/80 hover:border-primary/50 hover:text-primary hover:bg-primary/5 shadow-2xs cursor-pointer"
                                                } ${isToday && !isSelected ? "ring-1.5 ring-primary/40 border-primary/40 font-black text-primary" : ""}`}
                                                title={isFuture ? "No es posible registrar asistencia en fechas futuras" : undefined}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

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
                                        const status = rec?.status ?? null;
                                        const isLate = Boolean(rec?.arrivalTime) || status === "LATE";
                                        const isLeaveEarly = Boolean(rec?.departureTime) || status === "LEAVE_EARLY";
                                        const isPresent = status === "PRESENT" && !isLate && !isLeaveEarly;
                                        const isAbsent = status === "ABSENT";
                                        const isBoth = isLate && isLeaveEarly;
                                        const isSaving = rec?.saving;

                                        return (
                                            <div 
                                                key={student.id} 
                                                className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col gap-4 bg-card relative overflow-hidden group
                                                  ${isBoth ? 'border-amber-500/30 dark:border-indigo-500/30 bg-gradient-to-br from-amber-500/[0.02] to-indigo-500/[0.02] hover:border-amber-500/50'
                                                  : isPresent ? 'border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/[0.01] hover:border-emerald-500/30' 
                                                  : isAbsent ? 'border-rose-500/20 dark:border-rose-500/30 bg-rose-500/[0.01] hover:border-rose-500/30' 
                                                  : isLate ? 'border-amber-500/20 dark:border-amber-500/30 bg-amber-500/[0.01] hover:border-amber-500/30' 
                                                  : isLeaveEarly ? 'border-indigo-500/20 dark:border-indigo-500/30 bg-indigo-500/[0.01] hover:border-indigo-500/30' 
                                                  : 'border-border hover:border-primary/30'}`}
                                            >
                                                {/* Left Accent indicator line */}
                                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-colors duration-300
                                                    ${isBoth ? 'bg-gradient-to-b from-amber-500 to-indigo-500'
                                                    : isPresent ? 'bg-emerald-500' 
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
                                                    {/* Cumulative badges & History button */}
                                                    {(() => {
                                                        const s = allStudentStats[student.id];
                                                        if (!s) return null;
                                                        const hasHistory = s.absences > 0 || s.late > 0 || s.leaveEarly > 0;
                                                        return (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <div 
                                                                    className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenStudentHistoryModal(student);
                                                                    }}
                                                                    title="Click para ver historial de asistencia"
                                                                >
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

                                                                {hasHistory && (
                                                                    <button
                                                                        title="Ver historial de asistencia"
                                                                        className="h-6 w-6 shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenStudentHistoryModal(student);
                                                                        }}
                                                                    >
                                                                        <History className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
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
                                                        onClick={() => handleToggleStatus(student.id, "PRESENT")}
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
                                                        onClick={() => handleToggleStatus(student.id, "ABSENT")}
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
                                                        onClick={() => handleToggleStatus(student.id, "LATE")}
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
                                                        onClick={() => handleToggleStatus(student.id, "LEAVE_EARLY")}
                                                    >
                                                        <LogOut className="h-3 w-3 mr-0.5 shrink-0" />
                                                        Retiro
                                                    </Button>
                                                </div>

                                                {/* Sub-inputs: Tarde (Hora Llegada) and Retiro (Hora Retiro) can both appear */}
                                                {(isLate || isLeaveEarly) && (
                                                    <div className="flex flex-col gap-2">
                                                        {isLate && (
                                                            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 animate-in slide-in-from-top-2 duration-200 shrink-0">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Hora Llegada:</span>
                                                                <select
                                                                    value={rec?.arrivalTime || getClosestTimeOption(scheduleTimeOptions)}
                                                                    onChange={(e) => handleTimeChange(student.id, "arrivalTime", e.target.value)}
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
                                                            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 animate-in slide-in-from-top-2 duration-200 shrink-0">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider pl-1">Hora Retiro:</span>
                                                                <select
                                                                    value={rec?.departureTime || getClosestTimeOption(scheduleTimeOptions)}
                                                                    onChange={(e) => handleTimeChange(student.id, "departureTime", e.target.value)}
                                                                    className="h-7 w-[105px] rounded-lg border border-indigo-300 dark:border-indigo-900 bg-background text-[11px] font-bold text-foreground px-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                                >
                                                                    {scheduleTimeOptions.map(t => (
                                                                        <option key={t} value={t}>
                                                                            {formatTo12Hour(t)}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
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
                                                        ${seqIsBoth ? 'bg-gradient-to-r from-amber-500 to-indigo-500'
                                                        : seqIsPresent ? 'bg-emerald-500'
                                                        : seqIsAbsent ? 'bg-rose-500'
                                                        : seqIsLate ? 'bg-amber-500'
                                                        : seqIsLeaveEarly ? 'bg-indigo-500'
                                                        : 'bg-primary'}`} 
                                                    />
                                                    <Avatar className={`relative h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-2xl ring-4 transition-all duration-500 hover:scale-105
                                                        ${seqIsBoth ? 'ring-amber-500/30'
                                                        : seqIsPresent ? 'ring-emerald-500/30'
                                                        : seqIsAbsent ? 'ring-rose-500/30'
                                                        : seqIsLate ? 'ring-amber-500/30'
                                                        : seqIsLeaveEarly ? 'ring-indigo-500/30'
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
                                                <div 
                                                    className="flex flex-wrap justify-center gap-2 w-full cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => currentStudent && handleOpenStudentHistoryModal(currentStudent)}
                                                    title="Click para ver historial de asistencia"
                                                >
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
                                                 {seqStatus ? (
                                                     <div className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 shadow-sm backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-300 w-full max-w-md
                                                       ${seqIsBoth ? 'bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                                                       : seqIsPresent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                                       : seqIsAbsent ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                                       : seqIsLate ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                                       : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                         {seqIsBoth ? <Clock className="w-4 h-4 text-amber-500" />
                                                          : seqIsPresent ? <Check className="w-4 h-4 text-emerald-500" /> 
                                                          : seqIsAbsent ? <X className="w-4 h-4 text-rose-500" /> 
                                                          : seqIsLate ? <Clock className="w-4 h-4 text-amber-500" />
                                                          : <LogOut className="w-4 h-4 text-indigo-500" />}
                                                         <span className="font-bold text-xs text-center uppercase tracking-wider">
                                                             {seqIsBoth ? "TARDE + RETIRO"
                                                              : seqIsPresent ? "PRESENTE" 
                                                              : seqIsAbsent ? "AUSENTE" 
                                                              : seqIsLate ? "TARDE" 
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
                                             <div className="flex flex-col gap-3 w-full px-2 max-w-md">
                                                 <div className="flex flex-col sm:flex-row gap-4 w-full">
                                                     <Button
                                                         size="lg"
                                                         variant="outline"
                                                         className={`relative overflow-hidden group flex-1 h-16 md:h-20 text-base md:text-xl font-black border-2 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 active:translate-y-0 ${
                                                             seqIsAbsent 
                                                             ? "bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-600 shadow-xl shadow-red-500/20 hover:from-rose-600 hover:to-red-700" 
                                                             : "border-rose-200 dark:border-rose-950/40 bg-rose-500/[0.02] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:border-rose-400"
                                                         }`}
                                                         onClick={() => handleToggleStatus(currentStudent.id, "ABSENT")}
                                                     >
                                                         <div className="flex flex-col items-center gap-1.5">
                                                             <X className="h-6 w-6 transition-transform group-hover:scale-110" />
                                                             <span className="text-[10px] uppercase tracking-widest font-black">Falta (A)</span>
                                                         </div>
                                                     </Button>
 
                                                     <Button
                                                         size="lg"
                                                         variant="outline"
                                                         className={`relative overflow-hidden group flex-1 h-16 md:h-20 text-base md:text-xl font-black border-2 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 active:translate-y-0 ${
                                                             seqIsPresent 
                                                             ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-600 shadow-xl shadow-green-500/20 hover:from-emerald-600 hover:to-green-700" 
                                                             : "border-emerald-200 dark:border-emerald-950/40 bg-emerald-500/[0.02] hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:border-emerald-400"
                                                         }`}
                                                         onClick={() => handleToggleStatus(currentStudent.id, "PRESENT")}
                                                     >
                                                         <div className="flex flex-col items-center gap-1.5">
                                                             <Check className="h-6 w-6 transition-transform group-hover:scale-110" />
                                                             <span className="text-[10px] uppercase tracking-widest font-black">Presente (P)</span>
                                                         </div>
                                                     </Button>
                                                 </div>

                                                 {/* Quick Tarde & Retiro toggles in Sequential mode */}
                                                 <div className="flex gap-2 w-full">
                                                     <Button
                                                         size="sm"
                                                         variant={seqIsLate ? "default" : "outline"}
                                                         className={`flex-1 h-9 text-xs font-bold rounded-xl transition-all ${
                                                             seqIsLate 
                                                             ? "bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-sm" 
                                                             : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 border-border"
                                                         }`}
                                                         onClick={() => handleToggleStatus(currentStudent.id, "LATE")}
                                                     >
                                                         <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                         Tarde
                                                     </Button>
                                                     <Button
                                                         size="sm"
                                                         variant={seqIsLeaveEarly ? "default" : "outline"}
                                                         className={`flex-1 h-9 text-xs font-bold rounded-xl transition-all ${
                                                             seqIsLeaveEarly 
                                                             ? "bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm" 
                                                             : "text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50/10 border-border"
                                                         }`}
                                                         onClick={() => handleToggleStatus(currentStudent.id, "LEAVE_EARLY")}
                                                     >
                                                         <LogOut className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                         Retiro
                                                     </Button>
                                                 </div>

                                                 {/* Time inputs if active in Sequential mode */}
                                                 {(seqIsLate || seqIsLeaveEarly) && (
                                                     <div className="flex flex-col gap-2 w-full p-2.5 rounded-xl bg-card border shadow-sm animate-in slide-in-from-top-2 duration-200">
                                                         {seqIsLate && (
                                                             <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-yellow-500/10 text-xs">
                                                                 <span className="font-bold text-yellow-700 dark:text-yellow-400">Hora Llegada:</span>
                                                                 <select
                                                                     value={seqRec?.arrivalTime || getClosestTimeOption(scheduleTimeOptions)}
                                                                     onChange={(e) => handleTimeChange(currentStudent.id, "arrivalTime", e.target.value)}
                                                                     className="h-7 w-[105px] rounded-md border border-yellow-300 dark:border-yellow-900 bg-background text-[11px] font-bold text-foreground px-1.5 outline-none cursor-pointer"
                                                                 >
                                                                     {scheduleTimeOptions.map(t => (
                                                                         <option key={t} value={t}>{formatTo12Hour(t)}</option>
                                                                     ))}
                                                                 </select>
                                                             </div>
                                                         )}
                                                         {seqIsLeaveEarly && (
                                                             <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-indigo-500/10 text-xs">
                                                                 <span className="font-bold text-indigo-700 dark:text-indigo-400">Hora Retiro:</span>
                                                                 <select
                                                                     value={seqRec?.departureTime || getClosestTimeOption(scheduleTimeOptions)}
                                                                     onChange={(e) => handleTimeChange(currentStudent.id, "departureTime", e.target.value)}
                                                                     className="h-7 w-[105px] rounded-md border border-indigo-300 dark:border-indigo-900 bg-background text-[11px] font-bold text-foreground px-1.5 outline-none cursor-pointer"
                                                                 >
                                                                     {scheduleTimeOptions.map(t => (
                                                                         <option key={t} value={t}>{formatTo12Hour(t)}</option>
                                                                     ))}
                                                                 </select>
                                                             </div>
                                                         )}
                                                     </div>
                                                 )}
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
                        /* HISTORY VIEW MODE (FULL SCREEN - SINGLE STUDENT) */
                        <div className="w-full space-y-6 animate-in fade-in duration-300">
                            {historyStudent && (() => {
                                const stats = allStudentStats[historyStudent.student.id] || { absences: 0, late: 0, leaveEarly: 0 };
                                const initials = getStudentInitials(historyStudent.student);
                                const fullName = getStudentFullName(historyStudent.student);
                                const studentIdStr = historyStudent.student.profile?.identificacion || historyStudent.student.id;
                                const displayRecords = historyStudent.records;

                                return (
                                    <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
                                        {/* Card Header matching screenshot */}
                                        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/[0.04]">
                                            <div className="flex items-center gap-3.5">
                                                <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-bold text-foreground capitalize">
                                                        {fullName}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        ID: {studentIdStr}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right side summary badges matching screenshot */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {stats.absences > 0 && (
                                                    <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-rose-100/90 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                                        {stats.absences} {stats.absences === 1 ? "Falta" : "Faltas"}
                                                    </span>
                                                )}
                                                {stats.late > 0 && (
                                                    <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100/90 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                                        {stats.late} {stats.late === 1 ? "Llegada Tarde" : "Llegadas Tarde"}
                                                    </span>
                                                )}
                                                {stats.leaveEarly > 0 && (
                                                    <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-100/90 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                                        {stats.leaveEarly} {stats.leaveEarly === 1 ? "Retiro" : "Retiros"}
                                                    </span>
                                                )}
                                                {stats.absences === 0 && stats.late === 0 && stats.leaveEarly === 0 && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                        Sin novedades
                                                    </span>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 rounded-lg gap-1.5 text-xs font-bold border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer ml-1"
                                                    title="Descargar reporte en PDF de este estudiante"
                                                    onClick={() => handleExportStudentPDF(historyStudent.student, historyStudent.records)}
                                                    disabled={isExportingPDF}
                                                >
                                                    <FileDown className="h-3.5 w-3.5 text-primary" />
                                                    <span>PDF</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 rounded-lg gap-1.5 text-xs font-bold border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors cursor-pointer ml-1"
                                                    title="Descargar reporte en Excel de este estudiante"
                                                    onClick={() => handleExportStudentExcel(historyStudent.student, historyStudent.records)}
                                                    disabled={isExportingExcel}
                                                >
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span>Excel</span>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Table matching screenshot */}
                                        <div className="overflow-x-auto border-t border-border/60">
                                            {historyLoading ? (
                                                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                    <span className="text-sm font-semibold">Cargando historial...</span>
                                                </div>
                                            ) : !displayRecords.length ? (
                                                <div className="py-12 text-center text-xs text-muted-foreground/60 italic">
                                                    Sin registros de asistencia
                                                </div>
                                            ) : (
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                                                            <th className="py-3 px-6">FECHA</th>
                                                            <th className="py-3 px-4">NOVEDAD</th>
                                                            <th className="py-3 px-4">DETALLE / HORA</th>
                                                            <th className="py-3 px-4">JUSTIFICACIÓN</th>
                                                            <th className="py-3 px-6 text-right">ACCIÓN</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/20">
                                                        {displayRecords.map((rec: any) => {
                                                            const isLate = Boolean(rec.arrivalTime) || rec.status === "LATE";
                                                            const isLeaveEarly = Boolean(rec.departureTime) || rec.status === "LEAVE_EARLY";
                                                            const isBoth = isLate && isLeaveEarly;
                                                            const isAbsent = rec.status === "ABSENT";
                                                            const isExcused = rec.status === "EXCUSED";
                                                            const isPresent = rec.status === "PRESENT" && !isLate && !isLeaveEarly;

                                                            const formattedDate = formatCalendarDate(toUTCStartOfDayFromRegional(rec.date), "dd/MM/yyyy");
                                                            const arrTimeStr = rec.arrivalTime ? formatTimeRegional(rec.arrivalTime) : null;
                                                            const depTimeStr = rec.departureTime ? formatTimeRegional(rec.departureTime) : null;

                                                            return (
                                                                <tr key={rec.id} className="hover:bg-muted/10 transition-colors">
                                                                    <td className="py-4 px-6 font-bold text-foreground font-mono text-xs">
                                                                        {formattedDate}
                                                                    </td>
                                                                    <td className="py-4 px-4">
                                                                        {isAbsent && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wide">
                                                                                FALTA
                                                                            </span>
                                                                        )}
                                                                        {isBoth && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-50 to-indigo-50 text-amber-700 border border-amber-300 dark:from-amber-950/30 dark:to-indigo-950/30 dark:text-amber-300 dark:border-amber-700 uppercase tracking-wide">
                                                                                TARDE + RETIRO
                                                                            </span>
                                                                        )}
                                                                        {isLate && !isLeaveEarly && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 uppercase tracking-wide">
                                                                                TARDE
                                                                            </span>
                                                                        )}
                                                                        {isLeaveEarly && !isLate && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 uppercase tracking-wide">
                                                                                RETIRO
                                                                            </span>
                                                                        )}
                                                                        {isExcused && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 uppercase tracking-wide">
                                                                                EXCUSADO
                                                                            </span>
                                                                        )}
                                                                        {isPresent && (
                                                                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 uppercase tracking-wide">
                                                                                PRESENTE
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-xs">
                                                                        {isAbsent && (
                                                                            <span className="text-foreground/80 font-medium">Día completo</span>
                                                                        )}
                                                                        {isBoth && (
                                                                            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                                                                                <span className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-md px-2 py-0.5 font-semibold inline-block">
                                                                                    LL: {arrTimeStr}
                                                                                </span>
                                                                                <span className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 rounded-md px-2 py-0.5 font-semibold inline-block">
                                                                                    Ret: {depTimeStr}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {isLate && !isLeaveEarly && (
                                                                            <span className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-md px-2.5 py-0.5 text-xs font-semibold inline-block font-mono">
                                                                                {arrTimeStr || "—"}
                                                                            </span>
                                                                        )}
                                                                        {isLeaveEarly && !isLate && (
                                                                            <span className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 rounded-md px-2.5 py-0.5 text-xs font-semibold inline-block font-mono">
                                                                                {depTimeStr || "—"}
                                                                            </span>
                                                                        )}
                                                                        {isExcused && (
                                                                            <span className="text-muted-foreground font-medium">Excusa autorizada</span>
                                                                        )}
                                                                        {isPresent && (
                                                                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Jornada completa</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-xs">
                                                                        {rec.justification ? (
                                                                            rec.justification.startsWith("http") ? (
                                                                                <a href={rec.justification} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs">
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                    Ver documento
                                                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-foreground/85">{rec.justification}</span>
                                                                            )
                                                                        ) : (
                                                                            <span className="italic text-muted-foreground/60">Sin justificación</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-4 px-6 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteRecord(rec.id, historyStudent.student.id)}
                                                                            className="text-rose-600 hover:text-rose-700 hover:underline font-bold text-xs cursor-pointer transition-colors"
                                                                        >
                                                                            Eliminar
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : view === "all-history" ? (
                        /* ALL HISTORY VIEW MODE (FULL SCREEN - ALL STUDENTS WITH FILTERS) */
                        <div className="w-full space-y-6 animate-in fade-in duration-300">
                            {/* Filter and Search Bar */}
                            <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                                    {/* Search input */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por estudiante o identificación..."
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/20 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                                        />
                                        {historySearch && (
                                            <button
                                                onClick={() => setHistorySearch("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Total count, Toggle Solo Novedades & Export PDF */}
                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <Switch
                                                checked={historyOnlyNovedades}
                                                onCheckedChange={setHistoryOnlyNovedades}
                                            />
                                            <span className="font-semibold text-foreground/80 text-xs">Solo novedades</span>
                                        </label>
                                        <span className="text-muted-foreground font-semibold">
                                            Estudiantes: <strong className="text-foreground">{filteredHistoryStudents.length}</strong> de {students.length}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isExportingPDF || allHistoryLoading || filteredHistoryStudents.length === 0}
                                            onClick={handleExportCoursePDF}
                                            className="h-8 gap-1.5 font-bold text-xs rounded-xl border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                                            title="Exportar reporte corporativo en PDF con los filtros aplicados"
                                        >
                                            {isExportingPDF ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                            ) : (
                                                <FileDown className="h-3.5 w-3.5 text-primary" />
                                            )}
                                            <span>{isExportingPDF ? "Exportando..." : "Exportar PDF"}</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isExportingExcel || allHistoryLoading || filteredHistoryStudents.length === 0}
                                            onClick={handleExportCourseExcel}
                                            className="h-8 gap-1.5 font-bold text-xs rounded-xl border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors cursor-pointer"
                                            title="Exportar libro corporativo en Excel (Resumen y Detalle de Novedades)"
                                        >
                                            {isExportingExcel ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                                            ) : (
                                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                            )}
                                            <span>{isExportingExcel ? "Exportando..." : "Exportar Excel"}</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Filter Dropdowns / Count Filters */}
                                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                                    {/* Quick chip buttons */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Filtros:</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterFaltas("all");
                                                setFilterTardes("all");
                                                setFilterRetiros("all");
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                                filterFaltas === "all" && filterTardes === "all" && filterRetiros === "all"
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-muted/30 text-muted-foreground hover:text-foreground border-border/60"
                                            }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterFaltas("gte1");
                                                setFilterTardes("all");
                                                setFilterRetiros("all");
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                                filterFaltas === "gte1"
                                                    ? "bg-rose-500 text-white border-rose-500"
                                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 hover:bg-rose-100"
                                            }`}
                                        >
                                            Con Faltas (≥1)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterTardes("gte1");
                                                setFilterFaltas("all");
                                                setFilterRetiros("all");
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                                filterTardes === "gte1"
                                                    ? "bg-amber-500 text-white border-amber-500"
                                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 hover:bg-amber-100"
                                            }`}
                                        >
                                            Con Tardes (≥1)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilterRetiros("gte1");
                                                setFilterFaltas("all");
                                                setFilterTardes("all");
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                                filterRetiros === "gte1"
                                                    ? "bg-indigo-500 text-white border-indigo-500"
                                                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-100"
                                            }`}
                                        >
                                            Con Retiros (≥1)
                                        </button>
                                    </div>

                                    {/* Detailed select dropdowns for specific thresholds */}
                                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                        {/* Faltas selector */}
                                        <select
                                            value={filterFaltas}
                                            onChange={(e) => setFilterFaltas(e.target.value as any)}
                                            className="bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                        >
                                            <option value="all">Faltas: Todas</option>
                                            <option value="gte1">Faltas: ≥ 1</option>
                                            <option value="gte2">Faltas: ≥ 2</option>
                                            <option value="gte3">Faltas: ≥ 3</option>
                                            <option value="0">Faltas: Sin faltas (0)</option>
                                        </select>

                                        {/* Tardes selector */}
                                        <select
                                            value={filterTardes}
                                            onChange={(e) => setFilterTardes(e.target.value as any)}
                                            className="bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                        >
                                            <option value="all">Tardes: Todas</option>
                                            <option value="gte1">Tardes: ≥ 1</option>
                                            <option value="gte2">Tardes: ≥ 2</option>
                                            <option value="gte3">Tardes: ≥ 3</option>
                                            <option value="0">Tardes: Sin tardes (0)</option>
                                        </select>

                                        {/* Retiros selector */}
                                        <select
                                            value={filterRetiros}
                                            onChange={(e) => setFilterRetiros(e.target.value as any)}
                                            className="bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                        >
                                            <option value="all">Retiros: Todos</option>
                                            <option value="gte1">Retiros: ≥ 1</option>
                                            <option value="gte2">Retiros: ≥ 2</option>
                                            <option value="gte3">Retiros: ≥ 3</option>
                                            <option value="0">Retiros: Sin retiros (0)</option>
                                        </select>

                                        {(filterFaltas !== "all" || filterTardes !== "all" || filterRetiros !== "all" || historySearch) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHistorySearch("");
                                                    setFilterFaltas("all");
                                                    setFilterTardes("all");
                                                    setFilterRetiros("all");
                                                }}
                                                className="text-xs text-primary hover:underline font-bold px-1 cursor-pointer"
                                            >
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {allHistoryLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                    <span className="text-sm font-semibold">Cargando registros...</span>
                                </div>
                            ) : filteredHistoryStudents.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
                                    <UserCheck className="w-16 h-16 opacity-20" />
                                    <p className="text-base font-semibold mt-2">No se encontraron estudiantes con los filtros aplicados.</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHistorySearch("");
                                            setFilterFaltas("all");
                                            setFilterTardes("all");
                                            setFilterRetiros("all");
                                        }}
                                        className="mt-3 text-xs text-primary hover:underline font-bold cursor-pointer"
                                    >
                                        Restablecer filtros
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {filteredHistoryStudents.map((student) => {
                                        const records = allHistoryRecords.filter(r => r.userId === student.id);
                                        const stats = allStudentStats[student.id] || { absences: 0, late: 0, leaveEarly: 0 };
                                        const displayRecords = historyOnlyNovedades
                                            ? records.filter(r => r.status !== "PRESENT" || Boolean(r.arrivalTime) || Boolean(r.departureTime))
                                            : records;

                                        const initials = getStudentInitials(student);
                                        const fullName = getStudentFullName(student);
                                        const studentIdStr = student.profile?.identificacion || student.id.substring(0, 10);

                                        return (
                                            <div key={student.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
                                                {/* Card Header matching screenshot */}
                                                <div 
                                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/[0.04] cursor-pointer hover:bg-muted/10 transition-colors"
                                                    onClick={() => handleOpenStudentHistoryModal(student)}
                                                    title="Click para ver detalle en modal"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-black text-sm flex items-center justify-center shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-base font-bold text-foreground capitalize hover:text-primary transition-colors">
                                                                {fullName}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                ID: {studentIdStr}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Right side summary badges matching screenshot */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {stats.absences > 0 && (
                                                            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-rose-100/90 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                                                                {stats.absences} {stats.absences === 1 ? "Falta" : "Faltas"}
                                                            </span>
                                                        )}
                                                        {stats.late > 0 && (
                                                            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100/90 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                                                {stats.late} {stats.late === 1 ? "Llegada Tarde" : "Llegadas Tarde"}
                                                            </span>
                                                        )}
                                                        {stats.leaveEarly > 0 && (
                                                            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-100/90 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                                                {stats.leaveEarly} {stats.leaveEarly === 1 ? "Retiro" : "Retiros"}
                                                            </span>
                                                        )}
                                                        {stats.absences === 0 && stats.late === 0 && stats.leaveEarly === 0 && (
                                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                Sin novedades
                                                            </span>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0 ml-1 cursor-pointer"
                                                            title="Descargar reporte en PDF de este estudiante"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportStudentPDF(student, records);
                                                            }}
                                                            disabled={isExportingPDF}
                                                        >
                                                            <FileDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors shrink-0 cursor-pointer"
                                                            title="Descargar reporte en Excel de este estudiante"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportStudentExcel(student, records);
                                                            }}
                                                            disabled={isExportingExcel}
                                                        >
                                                            <FileSpreadsheet className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Table matching screenshot */}
                                                <div className="overflow-x-auto border-t border-border/60">
                                                    {displayRecords.length === 0 ? (
                                                        <div className="py-8 text-center text-xs text-muted-foreground/60 italic">
                                                            {historyOnlyNovedades ? "Sin novedades de asistencia registradas" : "Sin registros de asistencia"}
                                                        </div>
                                                    ) : (
                                                        <table className="w-full text-sm text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                                                                    <th className="py-3 px-6">FECHA</th>
                                                                    <th className="py-3 px-4">NOVEDAD</th>
                                                                    <th className="py-3 px-4">DETALLE / HORA</th>
                                                                    <th className="py-3 px-4">JUSTIFICACIÓN</th>
                                                                    <th className="py-3 px-6 text-right">ACCIÓN</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {displayRecords.map((rec: any) => {
                                                                    const isLate = Boolean(rec.arrivalTime) || rec.status === "LATE";
                                                                    const isLeaveEarly = Boolean(rec.departureTime) || rec.status === "LEAVE_EARLY";
                                                                    const isBoth = isLate && isLeaveEarly;
                                                                    const isAbsent = rec.status === "ABSENT";
                                                                    const isExcused = rec.status === "EXCUSED";
                                                                    const isPresent = rec.status === "PRESENT" && !isLate && !isLeaveEarly;

                                                                    const formattedDate = formatCalendarDate(toUTCStartOfDayFromRegional(rec.date), "dd/MM/yyyy");
                                                                    const arrTimeStr = rec.arrivalTime ? formatTimeRegional(rec.arrivalTime) : null;
                                                                    const depTimeStr = rec.departureTime ? formatTimeRegional(rec.departureTime) : null;

                                                                    return (
                                                                        <tr key={rec.id} className="hover:bg-muted/10 transition-colors">
                                                                            <td className="py-4 px-6 font-bold text-foreground font-mono text-xs">
                                                                                {formattedDate}
                                                                            </td>
                                                                            <td className="py-4 px-4">
                                                                                {isAbsent && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50 uppercase tracking-wide">
                                                                                        FALTA
                                                                                    </span>
                                                                                )}
                                                                                {isBoth && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-50 to-indigo-50 text-amber-700 border border-amber-300 dark:from-amber-950/30 dark:to-indigo-950/30 dark:text-amber-300 dark:border-amber-700 uppercase tracking-wide">
                                                                                        TARDE + RETIRO
                                                                                    </span>
                                                                                )}
                                                                                {isLate && !isLeaveEarly && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 uppercase tracking-wide">
                                                                                        TARDE
                                                                                    </span>
                                                                                )}
                                                                                {isLeaveEarly && !isLate && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 uppercase tracking-wide">
                                                                                        RETIRO
                                                                                    </span>
                                                                                )}
                                                                                {isExcused && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 uppercase tracking-wide">
                                                                                        EXCUSADO
                                                                                    </span>
                                                                                )}
                                                                                {isPresent && (
                                                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 uppercase tracking-wide">
                                                                                        PRESENTE
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-4 px-4 text-xs">
                                                                                {isAbsent && (
                                                                                    <span className="text-foreground/80 font-medium">Día completo</span>
                                                                                )}
                                                                                {isBoth && (
                                                                                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                                                                                        <span className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-md px-2 py-0.5 font-semibold inline-block">
                                                                                            LL: {arrTimeStr}
                                                                                        </span>
                                                                                        <span className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 rounded-md px-2 py-0.5 font-semibold inline-block">
                                                                                            Ret: {depTimeStr}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {isLate && !isLeaveEarly && (
                                                                                    <span className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-md px-2.5 py-0.5 text-xs font-semibold inline-block font-mono">
                                                                                        {arrTimeStr || "—"}
                                                                                    </span>
                                                                                )}
                                                                                {isLeaveEarly && !isLate && (
                                                                                    <span className="bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 rounded-md px-2.5 py-0.5 text-xs font-semibold inline-block font-mono">
                                                                                        {depTimeStr || "—"}
                                                                                    </span>
                                                                                )}
                                                                                {isExcused && (
                                                                                    <span className="text-muted-foreground font-medium">Excusa autorizada</span>
                                                                                )}
                                                                                {isPresent && (
                                                                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Jornada completa</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-4 px-4 text-xs">
                                                                                {rec.justification ? (
                                                                                    rec.justification.startsWith("http") ? (
                                                                                        <a href={rec.justification} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs">
                                                                                            <FileText className="h-3.5 w-3.5" />
                                                                                            Ver documento
                                                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-foreground/85">{rec.justification}</span>
                                                                                    )
                                                                                ) : (
                                                                                    <span className="italic text-muted-foreground/60">Sin justificación</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-4 px-6 text-right">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteRecord(rec.id, student.id)}
                                                                                    className="text-rose-600 hover:text-rose-700 hover:underline font-bold text-xs cursor-pointer transition-colors"
                                                                                >
                                                                                    Eliminar
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
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
            </div>

        {/* Modal de Historial de Asistencia de cada Estudiante (Matching User Specification) */}
        <Dialog open={studentHistoryModalOpen} onOpenChange={setStudentHistoryModalOpen}>
            <DialogContent className="z-[70] sm:max-w-[600px] w-full rounded-3xl p-6 sm:p-7 border border-border/80 shadow-2xl bg-background flex flex-col max-h-[88vh] overflow-hidden">
                {/* Header */}
                <div className="space-y-1.5 pr-6">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 shrink-0">
                            <Clock className="h-4 w-4 stroke-[2.5]" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                            Historial de Asistencia
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground pt-0.5">
                        Detalle de inasistencias y llegadas tarde de{" "}
                        <span className="font-bold text-foreground capitalize">
                            {modalStudent ? getStudentFullName(modalStudent).toLowerCase() : ""}
                        </span>.
                    </DialogDescription>
                </div>

                {/* Tab selector pills matching screenshot */}
                <div className="bg-slate-100/90 dark:bg-muted/70 p-1.5 rounded-full flex items-center my-2 gap-1">
                    <button
                        type="button"
                        onClick={() => setModalTab("absent")}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all text-center ${
                            modalTab === "absent"
                                ? "bg-white dark:bg-card text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground font-semibold"
                        }`}
                    >
                        Faltas ({modalAbsences.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setModalTab("late")}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all text-center ${
                            modalTab === "late"
                                ? "bg-white dark:bg-card text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground font-semibold"
                        }`}
                    >
                        Llegadas Tarde ({modalLates.length})
                    </button>
                    {modalEarlyExits.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setModalTab("leaveEarly")}
                            className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all text-center ${
                                modalTab === "leaveEarly"
                                    ? "bg-white dark:bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground font-semibold"
                            }`}
                        >
                            Retiros ({modalEarlyExits.length})
                        </button>
                    )}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto pr-1 py-2 custom-scrollbar min-h-0 space-y-3.5">
                    {modalLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-sm font-semibold">Cargando historial...</span>
                        </div>
                    ) : activeModalList.length === 0 ? (
                        <div className="py-14 text-center space-y-1">
                            <p className="text-sm font-semibold text-muted-foreground">
                                {modalTab === "absent"
                                    ? "No hay inasistencias registradas."
                                    : modalTab === "late"
                                    ? "No hay llegadas tarde registradas."
                                    : "No hay retiros anticipados registrados."}
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                                El estudiante no presenta novedades en esta categoría.
                            </p>
                        </div>
                    ) : (
                        activeModalList.map((rec: any) => {
                            const isExcused = rec.status === "EXCUSED" || Boolean(rec.justification?.trim());
                            return (
                                <div
                                    key={rec.id}
                                    className="border border-slate-200/90 dark:border-border/80 rounded-2xl p-4 sm:p-5 bg-card shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-border"
                                >
                                    {/* Row 1: Date and Badges */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <h4 className="font-bold text-base text-foreground">
                                            {formatModalIncidentDate(rec.date)}
                                        </h4>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isExcused ? (
                                                <span className="px-3.5 py-0.5 rounded-full text-xs font-bold bg-[#10b981] text-white shadow-xs">
                                                    Justificado
                                                </span>
                                            ) : (
                                                <span className="px-3.5 py-0.5 rounded-full text-xs font-bold bg-[#e04f4f] text-white shadow-xs">
                                                    No Justificado
                                                </span>
                                            )}
                                            <span
                                                className={`px-3 py-0.5 rounded-full text-xs font-medium border ${
                                                    modalTab === "absent"
                                                        ? "border-rose-200 bg-rose-50/70 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/60"
                                                        : modalTab === "late"
                                                        ? "border-amber-200 bg-amber-50/70 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/60"
                                                        : "border-indigo-200 bg-indigo-50/70 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/60"
                                                }`}
                                            >
                                                {modalTab === "absent" ? "Falta" : modalTab === "late" ? "Tarde" : "Retiro"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Row 2: Subject */}
                                    <div className="text-sm">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">Materia: </span>
                                        <span className="text-slate-600 dark:text-slate-300 font-normal">
                                            {courseSchedule?.title || "Bases de Datos"}
                                        </span>
                                        {modalTab === "late" && rec.arrivalTime && (
                                            <span className="ml-3 text-xs font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800">
                                                Hora llegada: {formatTimeRegional(rec.arrivalTime)}
                                            </span>
                                        )}
                                        {modalTab === "leaveEarly" && rec.departureTime && (
                                            <span className="ml-3 text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                                Hora retiro: {formatTimeRegional(rec.departureTime)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Row 3: Justification box */}
                                    <div className="bg-slate-50/90 dark:bg-muted/40 border border-slate-100 dark:border-border/60 rounded-xl p-3.5 space-y-1">
                                        <div className="text-xs font-bold text-foreground">
                                            Justificación:
                                        </div>
                                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                                            {rec.justification?.trim() || "Sin justificación registrada."}
                                        </p>
                                        {rec.justificationUrl && (
                                            <div className="pt-1">
                                                <a
                                                    href={rec.justificationUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Ver soporte adjunto
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer: Cerrar button, Exportar PDF and Exportar Excel */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-border/40 mt-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isExportingPDF || modalLoading || !modalStudent}
                            onClick={() => modalStudent && handleExportStudentPDF(modalStudent, modalRecords)}
                            className="gap-2 font-bold text-xs sm:text-sm rounded-xl border-border/80 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
                        >
                            {isExportingPDF ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                                <FileDown className="h-4 w-4 text-primary" />
                            )}
                            <span>{isExportingPDF ? "Generando..." : "Exportar PDF"}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isExportingExcel || modalLoading || !modalStudent}
                            onClick={() => modalStudent && handleExportStudentExcel(modalStudent, modalRecords)}
                            className="gap-2 font-bold text-xs sm:text-sm rounded-xl border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                            {isExportingExcel ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            )}
                            <span>{isExportingExcel ? "Generando..." : "Exportar Excel"}</span>
                        </Button>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setStudentHistoryModalOpen(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-sm text-sm cursor-pointer ml-auto"
                    >
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
