"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCourseStudentsAction } from "@/features/teacher/actions/studentActions";
import { recordAttendanceAction, deleteAttendanceAction, getCourseSessionsCountAction } from "@/features/teacher/actions/attendanceActions";
import { getStudentAttendanceStatsAction } from "@/features/student/actions/attendanceActions";
import { Check, X, UserCheck, Calendar, RotateCcw, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatCalendarDate } from "@/lib/dateUtils";

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
    const [students, setStudents] = useState<Student[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [studentStats, setStudentStats] = useState<{ late: number; excused: number; absences: number; records: any[] } | null>(null);
    const [currentStatus, setCurrentStatus] = useState<"PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | null>(null);
    const [sessionCount, setSessionCount] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (isOpen) {
            loadStudents();
        }
    }, [isOpen]);

    useEffect(() => {
        if (students.length > 0 && students[currentIndex]) {
            loadStudentStats(students[currentIndex].id);
        }
    }, [currentIndex, students, isOpen]);

    const loadStudentStats = async (studentId: string) => {
        try {
            // Fetch session count if not already fetched
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
                records: stats.records
            });
            
            // Check if there is a record for the currently selected date
            const dateStr = format(attendanceDate, "yyyy-MM-dd");
            const todayRecord = stats.records?.find((r: any) => {
                try {
                    if (!r.date) return false;
                    const recordDateStr = new Date(r.date).toISOString().split('T')[0];
                    return recordDateStr === dateStr;
                } catch (e) {
                    return false;
                }
            });
            setCurrentStatus(todayRecord ? todayRecord.status : null);
            
        } catch (error) {
            console.error("Error loading stats", error);
        }
    };

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await getCourseStudentsAction(courseId);
            // Extract user from enrollment
            const studentList = data.map((enrollment: any) => enrollment.user);
            // Sort by last name
            studentList.sort((a: Student, b: Student) => {
                const nameA = a.profile?.apellido || a.name || "";
                const nameB = b.profile?.apellido || b.name || "";
                return nameA.localeCompare(nameB);
            });
            setStudents(studentList);
        } catch (error) {
            toast.error("Error al cargar estudiantes");
        } finally {
            setLoading(false);
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

    const handleResetAttendance = async () => {
        const student = students[currentIndex];
        if (!student) return;

        try {
            const dateStr = format(attendanceDate, "yyyy-MM-dd");
            await deleteAttendanceAction(courseId, student.id, dateStr);
            toast.success(`Registro eliminado para ${student.profile?.nombres || student.name || "el estudiante"}`);
            
            setCurrentStatus(null);
            
            // Reload stats to reflect the change
            loadStudentStats(student.id);
        } catch (error) {
            toast.error("Error al eliminar registro");
        }
    };

    const handleMarkAttendance = async (status: "PRESENT" | "ABSENT" | "EXCUSED") => {
        const student = students[currentIndex];
        if (!student) return;

        try {
            // Format date as YYYY-MM-DD using local time
            const dateStr = format(attendanceDate, "yyyy-MM-dd");
            
            await recordAttendanceAction(courseId, student.id, dateStr, status);
            toast.success(`Marcado como ${
                status === "PRESENT" ? "Presente" : 
                status === "ABSENT" ? "Ausente" : "Excusado"
            }`);

            setCurrentStatus(status);

            // Auto advance if not the last student
            if (currentIndex < students.length - 1) {
                handleNext();
            } else {
                toast.success("Asistencia completada");
                setIsOpen(false);
            }
        } catch (error) {
            toast.error("Error al registrar asistencia");
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case "ArrowRight":
                    handleNext();
                    break;
                case "ArrowLeft":
                    handlePrevious();
                    break;
                case "p":
                case "P":
                    handleMarkAttendance("PRESENT");
                    break;
                case "a":
                case "A":
                    handleMarkAttendance("ABSENT");
                    break;
                case "r":
                case "R":
                case "Backspace":
                case "Delete":
                    handleResetAttendance();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleNext, handlePrevious, students, currentIndex]);

    const currentStudent = students[currentIndex];

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        Llamar Asistencia
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-screen p-0 flex flex-col gap-0 border-none">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-4">
                        <SheetTitle className="text-xl font-bold">Llamado de Asistencia</SheetTitle>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatCalendarDate(attendanceDate)}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 bg-gradient-to-br from-background via-muted/30 to-background overflow-hidden w-full h-[calc(100vh-64px)]">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                            <Clock className="w-10 h-10 animate-spin text-primary/50" />
                            <span className="text-lg">Cargando estudiantes...</span>
                        </div>
                    ) : currentStudent ? (
                        <div key={currentStudent.id} className="flex flex-col items-center justify-center gap-4 w-full h-full max-w-[95vw] animate-in slide-in-from-right-8 fade-in duration-500">
                            
                            {/* Three-Column Layout Container for Desktop */}
                            <div className="flex flex-col md:flex-row items-stretch justify-center w-full gap-4 md:gap-6 mt-1 h-full max-h-[82vh] overflow-hidden px-2">
                                
                                {/* Left Column: Quick Navigation List (New) */}
                                <div className="hidden md:flex flex-col w-full md:w-[20%] lg:w-[18%] bg-card/40 backdrop-blur-xl border border-border/40 rounded-[2rem] overflow-hidden shadow-xl">
                                    <div className="p-4 border-b border-border/40 bg-muted/30">
                                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-70">Estudiantes</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {students.map((student, index) => (
                                            <button
                                                key={student.id}
                                                onClick={() => setCurrentIndex(index)}
                                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 group ${
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
                                                <span className="text-xs font-semibold truncate text-left capitalize">
                                                    {student.profile?.nombres && student.profile?.apellido 
                                                        ? `${student.profile.nombres} ${student.profile.apellido}`.toLowerCase() 
                                                        : (student.name || "Sin Nombre").toLowerCase()}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Middle Column: Student Info Card */}
                                <div className="flex flex-col items-center justify-center w-full md:w-[35%] lg:w-[32%] gap-6 sm:gap-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-2xl flex-shrink-0">
                                    
                                    {/* Avatar and Name - Center highlighted */}
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-blue-500 blur-xl opacity-25 animate-pulse" />
                                            <Avatar className="relative h-28 w-28 md:h-40 md:w-40 lg:h-48 lg:w-48 border-4 md:border-8 border-background shadow-2xl ring-2 md:ring-4 ring-primary/20 transition-transform hover:scale-105 duration-500">
                                                <AvatarImage src={currentStudent.image || ""} alt={currentStudent.name || "Estudiante"} className="object-cover" />
                                                <AvatarFallback className="text-3xl md:text-5xl font-light bg-muted text-muted-foreground">
                                                    {(currentStudent.name || "ES").substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>

                                        <div className="text-center space-y-1 max-w-2xl px-2 capitalize">
                                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 leading-tight">
                                                {currentStudent.profile?.nombres?.toLowerCase() || (currentStudent.name || "Sin").split(" ")[0].toLowerCase()}
                                            </h1>
                                            <h2 className="text-lg md:text-2xl text-muted-foreground font-semibold">
                                                {currentStudent.profile?.apellido?.toLowerCase() || (currentStudent.name || "Nombre").split(" ").slice(1).join(" ").toLowerCase()}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Stats - Sleek badges */}
                                    {studentStats && (
                                        <div className="flex flex-wrap justify-center gap-2 w-full">
                                            <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 min-w-[90px]">
                                                <span className="font-black text-2xl leading-none">{studentStats.late}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tardanzas</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 min-w-[90px]">
                                                <span className="font-black text-2xl leading-none">{studentStats.excused}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Justificadas</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 min-w-[90px]">
                                                <span className="font-black text-2xl leading-none">{studentStats.absences}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Faltas</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Actions & Status */}
                                <div className="flex flex-col items-center justify-center w-full md:w-[45%] lg:w-[50%] gap-8 md:gap-12">
                                    
                                    {/* Navigation & Counter Badge */}
                                    <div className="flex items-center gap-4 px-5 py-2 rounded-full bg-primary/10 text-primary font-black text-base md:text-xl border border-primary/20 shadow-xl backdrop-blur-sm shadow-primary/5 w-fit">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-10 w-10 rounded-full hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30" 
                                            onClick={handlePrevious} 
                                            disabled={currentIndex === 0}
                                            title="Regresar al estudiante anterior (Flecha Izquierda)"
                                        >
                                            <ArrowLeft className="h-6 w-6" />
                                        </Button>
                                        <span className="w-32 text-center">{currentIndex + 1} / {students.length}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-10 w-10 rounded-full hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30" 
                                            onClick={handleNext} 
                                            disabled={currentIndex === students.length - 1}
                                            title="Siguiente estudiante (Flecha Derecha)"
                                        >
                                            <ArrowRight className="h-6 w-6" />
                                        </Button>
                                    </div>

                                    {/* Current Status Indicator */}
                                    <div className="w-full px-2 flex justify-center">
                                        {currentStatus ? (
                                            <div className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 shadow-sm backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-300 w-full
                                              ${currentStatus === 'PRESENT' ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400 font-medium'
                                              : currentStatus === 'ABSENT' ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 font-medium'
                                              : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 font-medium'}`}>
                                                {currentStatus === "PRESENT" ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : currentStatus === "ABSENT" ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <Clock className="w-5 h-5 md:w-6 md:h-6" />}
                                                <span className="font-bold text-sm md:text-base text-center">
                                                    Asistencia guardada: {currentStatus === "PRESENT" ? "PRESENTE" : currentStatus === "ABSENT" ? "AUSENTE" : "JUSTIFICADO"}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-dashed bg-muted/40 border-muted-foreground/40 text-muted-foreground shadow-sm backdrop-blur-md w-full">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="font-medium text-sm md:text-base text-center">Sin registrar hoy - Pendiente</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Massive Beautiful Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full px-2">
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className={`relative overflow-hidden group flex-1 h-20 md:h-28 lg:h-32 text-xl md:text-3xl font-black border-4 transition-all duration-300 rounded-[2rem] shadow-xl hover:-translate-y-1.5 ${
                                                currentStatus === "ABSENT" 
                                                ? "bg-red-500 text-white border-red-600 shadow-red-500/40 hover:bg-red-600 ring-6 ring-red-500/20" 
                                                : "border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:border-red-400 dark:hover:border-red-600 hover:shadow-red-500/30"
                                            }`}
                                            onClick={() => handleMarkAttendance("ABSENT")}
                                        >
                                            {currentStatus !== "ABSENT" && <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/10 group-hover:opacity-100 opacity-0 transition-opacity" />}
                                            <X className={`mr-3 h-8 w-8 md:h-12 md:w-12 transition-transform ${currentStatus === "ABSENT" ? "scale-110 drop-shadow-md" : "group-hover:scale-110"}`} />
                                            Ausente
                                        </Button>

                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className={`relative overflow-hidden group flex-1 h-20 md:h-28 lg:h-32 text-xl md:text-3xl font-black border-4 transition-all duration-300 rounded-[2rem] shadow-xl hover:-translate-y-1.5 ${
                                                currentStatus === "PRESENT" 
                                                ? "bg-green-500 text-white border-green-600 shadow-green-500/40 hover:bg-green-600 ring-6 ring-green-500/20" 
                                                : "border-green-100 dark:border-green-900/30 hover:bg-red-50 dark:hover:bg-red-950/30 text-green-600 dark:text-green-400 hover:border-green-400 dark:hover:border-green-600 hover:shadow-green-500/30"
                                            }`}
                                            onClick={() => handleMarkAttendance("PRESENT")}
                                        >
                                            {currentStatus !== "PRESENT" && <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/10 group-hover:opacity-100 opacity-0 transition-opacity" />}
                                            <Check className={`mr-3 h-8 w-8 md:h-12 md:w-12 transition-transform ${currentStatus === "PRESENT" ? "scale-110 drop-shadow-md" : "group-hover:scale-110"}`} />
                                            <span className={currentStatus === "PRESENT" ? "drop-shadow-sm" : ""}>Presente</span>
                                        </Button>
                                    </div>
                                    
                                    {/* Reset Sub-action */}
                                    <div className="opacity-60 hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 px-4 gap-2"
                                            onClick={handleResetAttendance}
                                            title="Deshacer registro para este estudiante"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            <span className="text-xs">Deshacer anterior</span>
                                        </Button>
                                        <span className="text-[10px] text-muted-foreground/50 text-center">O utiliza tu teclado: Flechas, P (Presente), A (Ausente)</span>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-muted-foreground gap-4">
                            <UserCheck className="w-20 h-20 opacity-20" />
                            <p className="text-xl font-medium">No hay estudiantes en este curso.</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
