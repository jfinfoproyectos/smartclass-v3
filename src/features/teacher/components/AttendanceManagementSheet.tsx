"use client";

import { useState, useEffect } from "react";
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
    ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatName } from "@/lib/utils";
import { recordAttendanceAction, deleteAttendanceAction, deleteJustificationAction } from "@/features/teacher/actions/attendanceActions";
import { getStudentAttendanceStatsAction } from "@/features/student/actions/attendanceActions";;;
import { formatCalendarDate } from "@/lib/dateUtils";
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
    const [selectedTime, setSelectedTime] = useState<string>(format(new Date(), "HH:mm"));

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

    const handleAction = async (targetDate: string | Date, status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "DELETE", customTime?: string, recordId?: string) => {
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
                
                const timeToUse = customTime || (status === "LATE" ? selectedTime : undefined);

                if (status === "LATE" && timeToUse) {
                    const [hours, minutes] = timeToUse.split(':').map(Number);
                    // Build arrivalTime using the UTC date so the day is correct
                    const baseDate = new Date(`${dateStr}T00:00:00Z`);
                    arrivalTimeFinal = new Date(baseDate);
                    arrivalTimeFinal.setUTCHours(hours, minutes, 0, 0);
                }

                await recordAttendanceAction(courseId, student.id, dateStr, status, arrivalTimeFinal);
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
            case "EXCUSED": return "Excusado";
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PRESENT": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case "ABSENT": return <X className="h-4 w-4 text-red-500" />;
            case "LATE": return <Clock className="h-4 w-4 text-yellow-600" />;
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
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-100 dark:border-green-900 flex flex-col items-center">
                                <span className="text-xl font-bold text-green-700 dark:text-green-400">{stats.presents || 0}</span>
                                <span className="text-[10px] uppercase font-semibold text-green-600">Presente</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900 flex flex-col items-center">
                                <span className="text-xl font-bold text-red-700 dark:text-red-400">{stats.absences || 0}</span>
                                <span className="text-[10px] uppercase font-semibold text-red-600">Ausente</span>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900 flex flex-col items-center">
                                <span className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.late || 0}</span>
                                <span className="text-[10px] uppercase font-semibold text-yellow-600">Tarde</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900 flex flex-col items-center">
                                <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.excused || 0}</span>
                                <span className="text-[10px] uppercase font-semibold text-blue-600">Excusa</span>
                            </div>
                        </div>
                    )}

                    {/* Quick Add Section */}
                    <div className="bg-muted/30 p-4 rounded-xl border mb-6">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Registrar Nueva Fecha
                        </h3>
                        <div className="flex flex-wrap gap-2 items-end">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "justify-start text-left font-normal flex-1 min-w-[150px] h-10",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d: Date | undefined) => d && setDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                                <Label htmlFor="arrival-time" className="text-[10px] uppercase text-muted-foreground ml-1 mb-1">Hora Llegada</Label>
                                <Input
                                    id="arrival-time"
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                    className="h-10"
                                />
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
                                                                        <Input 
                                                                            id={`time-${record.id}`} 
                                                                            type="time" 
                                                                            className="h-9 text-sm"
                                                                            defaultValue={record.arrivalTime ? format(new Date(record.arrivalTime), "HH:mm") : format(new Date(), "HH:mm")}
                                                                        />
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
