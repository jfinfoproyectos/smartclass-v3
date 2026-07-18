"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Calendar as CalendarIcon, 
    Check, 
    X, 
    Clock, 
    AlertCircle, 
    Trash2, 
    RotateCcw,
    Plus,
    UserCircle,
    CheckCircle2,
    FileText,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    LogOut
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatName } from "@/lib/utils";
import { recordAttendanceAction, deleteAttendanceAction, deleteJustificationAction, getCourseScheduleAction } from "@/features/teacher/actions/attendanceActions";
import { getStudentAttendanceStatsAction } from "@/features/student/actions/attendanceActions";;;
import { formatCalendarDate, getCourseClassDates } from "@/lib/dateUtils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AttendanceManagementSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    student: {
        id: string;
        name: string;
        email?: string;
        image?: string | null;
        profile?: {
            nombres: string;
            apellido: string;
        } | null;
    };
    onNavigate?: (direction: 'prev' | 'next') => void;
}

export function AttendanceManagementSheet({
    isOpen,
    onOpenChange,
    courseId,
    student,
    onNavigate
}: AttendanceManagementSheetProps) {
    const [date, setDate] = useState<Date>(new Date());
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>("08:00");
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

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const sched = await getCourseScheduleAction(courseId);
                setCourseSchedule(sched);
                if (sched) {
                    const dates = getCourseClassDates(sched.startDate, sched.endDate, sched.classDays);
                    setClassDates(dates);
                    
                    const todayStr = format(new Date(), "yyyy-MM-dd");
                    if (dates.includes(todayStr)) {
                        setDate(new Date(todayStr + "T00:00:00"));
                    } else {
                        const closest = dates.find(d => d >= todayStr) || dates[dates.length - 1];
                        if (closest) {
                            setDate(new Date(closest + "T00:00:00"));
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching course schedule:", err);
            }
        };

        if (isOpen && courseId) {
            fetchSchedule();
        }
    }, [isOpen, courseId]);

    useEffect(() => {
        if (scheduleTimeOptions.length > 0) {
            setSelectedTime(getClosestTimeOption(scheduleTimeOptions));
        }
    }, [scheduleTimeOptions]);

    const isDateDisabled = (d: Date) => {
        if (classDates.length === 0) return false;
        const dateStr = format(d, "yyyy-MM-dd");
        return !classDates.includes(dateStr);
    };

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getStudentAttendanceStatsAction(courseId, student.id);
            setStats(data);
        } catch (error) {
            toast.error("Error al cargar estadísticas de asistencia");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadStats();
        }
    }, [isOpen, courseId, student.id]);

    const handleAction = async (targetDate: string | Date, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY" | "EXCUSED" | "DELETE", customTime?: string, recordId?: string) => {
        const actionKey = typeof targetDate === 'string' ? targetDate : targetDate.toISOString();
        setActionLoading(`${actionKey}-${status}`);
        
        try {
            // Always normalize to "yyyy-MM-dd" string so the service uses new Date("yyyy-MM-dd")
            // which is UTC midnight — avoiding the toUTCStartOfDayFromLocal timezone shift bug.
            let dateStr: string;
            if (typeof targetDate === 'string') {
                // Already a string; extract just the date part in case it's a full ISO string
                dateStr = targetDate.split('T')[0];
            } else {
                // Date object from BD comes as UTC midnight — use UTC components to get correct date
                const d = targetDate instanceof Date ? targetDate : new Date(targetDate);
                const y = d.getUTCFullYear();
                const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                dateStr = `${y}-${m}-${day}`;
            }

            if (status === "DELETE") {
                await deleteAttendanceAction(courseId, student.id, dateStr, recordId);
                toast.success("Registro eliminado");
            } else {
                let arrivalTimeFinal: Date | undefined = undefined;
                let departureTimeFinal: Date | undefined = undefined;
                
                const timeToUse = customTime || (status === "LATE" || status === "LEAVE_EARLY" ? selectedTime : undefined);

                if (status === "LATE" && timeToUse) {
                    const [hours, minutes] = timeToUse.split(':').map(Number);
                    // Build arrivalTime using the UTC date so the day is correct
                    const baseDate = new Date(`${dateStr}T00:00:00Z`);
                    arrivalTimeFinal = new Date(baseDate);
                    arrivalTimeFinal.setUTCHours(hours, minutes, 0, 0);
                }

                if (status === "LEAVE_EARLY" && timeToUse) {
                    const [hours, minutes] = timeToUse.split(':').map(Number);
                    const baseDate = new Date(`${dateStr}T00:00:00Z`);
                    departureTimeFinal = new Date(baseDate);
                    departureTimeFinal.setUTCHours(hours, minutes, 0, 0);
                }

                await recordAttendanceAction(
                    courseId, 
                    student.id, 
                    dateStr, 
                    status, 
                    arrivalTimeFinal, 
                    undefined, 
                    departureTimeFinal
                );
                toast.success(`Asistencia marcada como ${getStatusLabel(status)}`);
            }
            await loadStats();
        } catch (error) {
            console.error("Attendance Action Error:", error);
            toast.error("Error al procesar la acción");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteJustification = async (recordId: string) => {
        setActionLoading(`${recordId}-delete-justification`);
        try {
            await deleteJustificationAction(recordId, courseId);
            toast.success("Justificación eliminada. El estudiante ya puede volver a justificar.");
            await loadStats();
        } catch (error) {
            toast.error("Error al eliminar la justificación");
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "PRESENT": return "Presente";
            case "ABSENT": return "Ausente";
            case "LATE": return "Tarde";
            case "LEAVE_EARLY": return "Retiro";
            case "EXCUSED": return "Excusado";
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PRESENT": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case "ABSENT": return <X className="h-4 w-4 text-red-500" />;
            case "LATE": return <Clock className="h-4 w-4 text-yellow-600" />;
            case "LEAVE_EARLY": return <LogOut className="h-4 w-4 text-indigo-500" />;
            case "EXCUSED": return <AlertCircle className="h-4 w-4 text-blue-500" />;
            default: return null;
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <div className="flex items-center gap-4 mb-2">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                            <AvatarImage src={student.image || ""} />
                            <AvatarFallback><UserCircle className="h-full w-full" /></AvatarFallback>
                        </Avatar>
                        <div>
                            <SheetTitle className="text-xl">Gestión de Asistencia</SheetTitle>
                            <SheetDescription className="text-sm">
                                {formatName(student.name, student.profile)}
                            </SheetDescription>
                        </div>
                        {onNavigate && (
                            <div className="ml-auto flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onNavigate('prev')}
                                    className="h-8 w-8 hover:bg-accent"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onNavigate('next')}
                                    className="h-8 w-8 hover:bg-accent"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6">
                    {/* Stats Summary */}
                    {stats && (
                        <div className="grid grid-cols-5 gap-1.5 mb-6">
                            <div className="bg-green-50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100 dark:border-green-900 flex flex-col items-center">
                                <span className="text-lg font-bold text-green-700 dark:text-green-400">{stats.presents || 0}</span>
                                <span className="text-[9px] uppercase font-semibold text-green-600">Presente</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900 flex flex-col items-center">
                                <span className="text-lg font-bold text-red-700 dark:text-red-400">{stats.absences || 0}</span>
                                <span className="text-[9px] uppercase font-semibold text-red-600">Ausente</span>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-2.5 rounded-lg border border-yellow-100 dark:border-yellow-900 flex flex-col items-center">
                                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{stats.late || 0}</span>
                                <span className="text-[9px] uppercase font-semibold text-red-600">Tarde</span>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 flex flex-col items-center">
                                <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{(stats as any).leaveEarly || 0}</span>
                                <span className="text-[9px] uppercase font-semibold text-red-600">Retiro</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900 flex flex-col items-center">
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.excused || 0}</span>
                                <span className="text-[9px] uppercase font-semibold text-red-600">Excusa</span>
                            </div>
                        </div>
                    )}

                    {/* Quick Add Section */}
                    <div className="bg-muted/30 p-4 rounded-xl border mb-6">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Registrar Nueva Fecha
                        </h3>
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                <Label htmlFor="attendance-date-select" className="text-[10px] uppercase text-muted-foreground ml-1 mb-1">Fecha de Clase</Label>
                                <select
                                    id="attendance-date-select"
                                    value={format(date, "yyyy-MM-dd")}
                                    onChange={(e) => setDate(new Date(e.target.value + "T00:00:00"))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-bold text-foreground capitalize"
                                >
                                    {classDates.map(dateStr => (
                                        <option key={dateStr} value={dateStr} className="text-foreground bg-background">
                                            {formatCalendarDate(new Date(dateStr + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy")}
                                        </option>
                                    ))}
                                    {classDates.length === 0 && (
                                        <option value={format(date, "yyyy-MM-dd")}>
                                            {formatCalendarDate(date, "EEEE, d 'de' MMMM 'de' yyyy")}
                                        </option>
                                    )}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                <Label htmlFor="arrival-time" className="text-[10px] uppercase text-muted-foreground ml-1 mb-1">Hora</Label>
                                <select
                                    id="arrival-time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-bold text-foreground"
                                >
                                    {scheduleTimeOptions.map(t => (
                                        <option key={t} value={t}>
                                            {formatTo12Hour(t)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-1">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-10 w-10 p-0 text-green-600 hover:bg-green-50"
                                                onClick={() => handleAction(date, "PRESENT")}
                                                disabled={!!actionLoading}
                                            >
                                                <Check className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Marcar Presente</p></TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-10 w-10 p-0 text-red-600 hover:bg-red-50"
                                                onClick={() => handleAction(date, "ABSENT")}
                                                disabled={!!actionLoading}
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Marcar Ausente</p></TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-10 w-10 p-0 text-yellow-600 hover:bg-yellow-50"
                                                onClick={() => handleAction(date, "LATE")}
                                                disabled={!!actionLoading}
                                            >
                                                <Clock className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Marcar Tarde</p></TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-10 w-10 p-0 text-indigo-600 hover:bg-indigo-50"
                                                onClick={() => handleAction(date, "LEAVE_EARLY")}
                                                disabled={!!actionLoading}
                                            >
                                                <LogOut className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Marcar Retiro</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold mb-3">Historial de Registros</h3>
                        {loading && !stats ? (
                            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
                        ) : stats?.records?.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs">Fecha</TableHead>
                                            <TableHead className="text-xs">Estado</TableHead>
                                            <TableHead className="text-xs text-right">Acciones Rápidas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.records.map((record: any) => (
                                            <TableRow key={record.id} className="group">
                                                <TableCell className="text-sm py-2">
                                                    {formatCalendarDate(record.date, "dd/MM/yyyy")}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {getStatusIcon(record.status)}
                                                        <span className="text-xs font-medium">{getStatusLabel(record.status)}</span>
                                                        {record.status === "LATE" && record.arrivalTime && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">
                                                                ({format(new Date(record.arrivalTime), "h:mm a", { locale: es })})
                                                            </span>
                                                        )}
                                                        {record.status === "LEAVE_EARLY" && record.departureTime && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">
                                                                ({format(new Date(record.departureTime), "h:mm a", { locale: es })})
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-2">
                                                    <TooltipProvider>
                                                        {/* Presente */}
                                                        <Popover>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                                            disabled={!!actionLoading}
                                                                        >
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Presente</p></TooltipContent>
                                                            </Tooltip>
                                                            <PopoverContent className="w-40 p-3 z-[200]" align="end">
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">¿Marcar Presente?</p>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                                                        onClick={() => handleAction(record.date, "PRESENT")}
                                                                    >
                                                                        Confirmar
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {/* Ausente */}
                                                        <Popover>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                                            disabled={!!actionLoading}
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Ausente</p></TooltipContent>
                                                            </Tooltip>
                                                            <PopoverContent className="w-40 p-3 z-[200]" align="end">
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">¿Marcar Ausente?</p>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="h-8 text-xs bg-red-600 hover:bg-red-700"
                                                                        onClick={() => handleAction(record.date, "ABSENT")}
                                                                    >
                                                                        Confirmar
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {/* Tarde */}
                                                        <Popover>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-yellow-600 hover:bg-yellow-50"
                                                                            disabled={!!actionLoading}
                                                                        >
                                                                            <Clock className="h-4 w-4" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Marcar Tarde (Con Hora)</p></TooltipContent>
                                                            </Tooltip>
                                                            <PopoverContent className="w-56 p-4 z-[200]" align="end">
                                                                <div className="flex flex-col gap-3">
                                                                    <div className="space-y-1">
                                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marcar Tarde</h4>
                                                                        <p className="text-[10px] text-muted-foreground">Selecciona la hora de llegada para esta fecha.</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`time-${record.id}`} className="text-[10px] uppercase text-muted-foreground block">Hora Llegada</Label>
                                                                         <select
                                                                            id={`time-${record.id}`}
                                                                            defaultValue={record.arrivalTime ? format(new Date(record.arrivalTime), "HH:mm") : getClosestTimeOption(scheduleTimeOptions)}
                                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-bold text-foreground"
                                                                        >
                                                                            {scheduleTimeOptions.map(t => (
                                                                                <option key={t} value={t}>
                                                                                    {formatTo12Hour(t)}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700"
                                                                        onClick={() => {
                                                                            const timeInput = document.getElementById(`time-${record.id}`) as HTMLInputElement;
                                                                            handleAction(record.date, "LATE", timeInput.value);
                                                                        }}
                                                                    >
                                                                        Confirmar y Guardar
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {/* Retiro */}
                                                        <Popover>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                                                            disabled={!!actionLoading}
                                                                        >
                                                                            <LogOut className="h-4 w-4" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Marcar Retiro (Con Hora)</p></TooltipContent>
                                                            </Tooltip>
                                                            <PopoverContent className="w-56 p-4 z-[200]" align="end">
                                                                <div className="flex flex-col gap-3">
                                                                    <div className="space-y-1">
                                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marcar Retiro</h4>
                                                                        <p className="text-[10px] text-muted-foreground">Selecciona la hora de salida para esta fecha.</p>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`time-dep-${record.id}`} className="text-[10px] uppercase text-muted-foreground block">Hora Salida</Label>
                                                                         <select
                                                                            id={`time-dep-${record.id}`}
                                                                            defaultValue={record.departureTime ? format(new Date(record.departureTime), "HH:mm") : getClosestTimeOption(scheduleTimeOptions)}
                                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-bold text-foreground"
                                                                        >
                                                                            {scheduleTimeOptions.map(t => (
                                                                                <option key={t} value={t}>
                                                                                    {formatTo12Hour(t)}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                        onClick={() => {
                                                                            const timeInput = document.getElementById(`time-dep-${record.id}`) as HTMLInputElement;
                                                                            handleAction(record.date, "LEAVE_EARLY", timeInput.value);
                                                                        }}
                                                                    >
                                                                        Confirmar y Guardar
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {/* Excusa */}
                                                        {record.status === "EXCUSED" && (
                                                            <Popover>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <PopoverTrigger asChild>
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                                            >
                                                                                <FileText className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>Ver/Eliminar Excusa</p></TooltipContent>
                                                                </Tooltip>
                                                                <PopoverContent className="w-80 p-4 z-[200]" align="end">
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                                <AlertCircle className="h-4 w-4 text-blue-500" />
                                                                                Detalles de la Excusa
                                                                            </h4>
                                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fecha: {formatCalendarDate(record.date, "dd/MM/yyyy")}</p>
                                                                        </div>
                                                                        <div className="bg-muted/30 p-3 rounded-lg border text-sm">
                                                                            <p className="font-medium mb-1 text-xs text-muted-foreground uppercase">Justificación:</p>
                                                                            <p className="text-sm break-words leading-relaxed">
                                                                                {record.justification || "Sin descripción de justificación."}
                                                                            </p>
                                                                        </div>
                                                                        {record.justificationUrl && (
                                                                            <Button size="sm" variant="outline" className="w-full h-9 gap-2 text-xs" asChild>
                                                                                <a href={record.justificationUrl} target="_blank" rel="noopener noreferrer">
                                                                                    <ExternalLink className="h-3 w-3" />
                                                                                    Ver Documento Adjunto
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                        <div className="pt-2 border-t">
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant="destructive" 
                                                                                className="w-full h-8 text-[10px] uppercase font-semibold"
                                                                                onClick={() => handleDeleteJustification(record.id)}
                                                                                disabled={!!actionLoading}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                                Eliminar mi Justificación
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}

                                                        {/* Justificación tardanza */}
                                                        {record.status === "LATE" && record.justification && (
                                                            <Popover>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <PopoverTrigger asChild>
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                                            >
                                                                                <FileText className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>Ver/Eliminar Justificación</p></TooltipContent>
                                                                </Tooltip>
                                                                <PopoverContent className="w-80 p-4 z-[200]" align="end">
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                                <Clock className="h-4 w-4 text-blue-500" />
                                                                                Justificación de Tardanza
                                                                            </h4>
                                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fecha: {formatCalendarDate(record.date, "dd/MM/yyyy")}</p>
                                                                        </div>
                                                                        <div className="bg-muted/30 p-3 rounded-lg border text-sm">
                                                                            <p className="font-medium mb-1 text-xs text-muted-foreground uppercase">Justificación:</p>
                                                                            <p className="text-sm break-words leading-relaxed">{record.justification}</p>
                                                                        </div>
                                                                        {record.justificationUrl && (
                                                                            <Button size="sm" variant="outline" className="w-full h-9 gap-2 text-xs" asChild>
                                                                                <a href={record.justificationUrl} target="_blank" rel="noopener noreferrer">
                                                                                    <ExternalLink className="h-3 w-3" />
                                                                                    Ver Documento Adjunto
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                        <div className="pt-2 border-t">
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant="destructive" 
                                                                                className="w-full h-8 text-[10px] uppercase font-semibold"
                                                                                onClick={() => handleDeleteJustification(record.id)}
                                                                                disabled={!!actionLoading}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                                Eliminar mi Justificación
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}

                                                        {/* Eliminar registro */}
                                                        <Popover>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <PopoverTrigger asChild>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                            disabled={!!actionLoading}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Eliminar Registro</p></TooltipContent>
                                                            </Tooltip>
                                                            <PopoverContent className="w-40 p-3 z-[200]" align="end">
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">¿Eliminar Registro?</p>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="destructive"
                                                                        className="h-8 text-xs"
                                                                        onClick={() => handleAction(record.date, "DELETE", undefined, record.id)}
                                                                    >
                                                                        Confirmar
                                                                    </Button>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12 border rounded-xl border-dashed">
                                <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-20" />
                                <p className="text-sm text-muted-foreground">No hay asistencias registradas</p>
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="p-6 border-t bg-muted/20">
                    <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">
                        Cerrar Panel
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
