"use client";

import { useEffect, useState } from "react";
import { getStudentAttendanceStatsAction } from "@/features/student/actions/attendanceActions";;
import { registerAbsenceJustificationAction } from "@/features/student/actions/attendanceActions";
import { deleteAttendanceRecordAction } from "@/features/teacher/actions/attendanceActions";;
import {
    AlertCircle,
    CheckCircle,
    Clock,
    ExternalLink,
    Trash2,
    Eye,
    Calendar as CalendarIcon
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCalendarDate, fromUTC, toUTCStartOfDay } from "@/lib/dateUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudentAttendanceSummaryProps {
    courseId: string;
    userId: string;
    readonly?: boolean;
}

interface AttendanceRecord {
    id: string;
    date: string | Date;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    justification?: string | null;
    justificationUrl?: string | null;
    arrivalTime?: string | Date | null;
}

export function StudentAttendanceSummary({ courseId, userId, readonly = false }: StudentAttendanceSummaryProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

    // Form states
    const [justificationType, setJustificationType] = useState<"WITH_SUPPORT" | "WITHOUT_SUPPORT">("WITH_SUPPORT");
    const [code, setCode] = useState("");
    const [justification, setJustification] = useState("");
    const [documentUrl, setDocumentUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<any | null>(null);

    const fetchStats = async () => {
        try {
            const data = await getStudentAttendanceStatsAction(courseId, userId);
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch attendance stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [courseId, userId]);

    const handleOpenDialog = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setSelectedDate(fromUTC(record.date));

        const recordDate = fromUTC(record.date);
        const today = new Date();

        const isToday = recordDate.getDate() === today.getDate() &&
            recordDate.getMonth() === today.getMonth() &&
            recordDate.getFullYear() === today.getFullYear();

        const isPast = recordDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (isToday) {
            setJustificationType("WITH_SUPPORT");
        } else if (isPast) {
            setJustificationType("WITH_SUPPORT");
        } else {
            setJustificationType("WITH_SUPPORT");
        }

        setCode("");
        setJustification("");
        setDocumentUrl("");
        setIsDialogOpen(true);
    };

    const handleViewJustification = (record: any) => {
        setSelectedRecord(record);
        setIsViewDialogOpen(true);
    };

    const handleJustify = async () => {
        if (justificationType === "WITH_SUPPORT") {
            if (!documentUrl || !justification) {
                toast.error("Por favor completa todos los campos");
                return;
            }
        } else {
            if (!justification) {
                toast.error("Por favor escribe una justificación");
                return;
            }
        }

        setSubmitting(true);
        try {
            if (!selectedRecord) return;
            const dateInIso = typeof selectedRecord.date === 'string' 
                ? selectedRecord.date 
                : (selectedRecord.date as Date).toISOString();

            await registerAbsenceJustificationAction(courseId, dateInIso, documentUrl || null, justification);
            toast.success("Inasistencia justificada exitosamente");

            setIsDialogOpen(false);
            fetchStats();
        } catch (error: any) {
            toast.error(error.message || "Error al registrar justificación");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (record: any) => {
        setRecordToDelete(record);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;

        try {
            await deleteAttendanceRecordAction(recordToDelete.id, courseId);
            toast.success("Registro de asistencia eliminado exitosamente");
            fetchStats();
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar registro");
        } finally {
            setIsDeleteDialogOpen(false);
            setRecordToDelete(null);
        }
    };
    if (!stats) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Historial de Inasistencias
                </h3>
            </div>

            <div className="w-full overflow-x-auto rounded-md border">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Detalle</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.records.filter((r: any) => r.status === "ABSENT" || r.status === "LATE" || r.status === "EXCUSED").length > 0 ? (
                            stats.records
                                .filter((r: any) => r.status === "ABSENT" || r.status === "LATE" || r.status === "EXCUSED")
                                .map((record: AttendanceRecord) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                <span>{formatCalendarDate(record.date)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {record.status === "ABSENT" ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertCircle className="h-3 w-3" /> Ausente
                                                </Badge>
                                            ) : record.status === "LATE" ? (
                                                <Badge variant="warning" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                                                    <Clock className="h-3 w-3" /> Tarde
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                                                    <CheckCircle className="h-3 w-3" /> Excusado
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {record.status === "LATE" && record.arrivalTime ? (
                                                <span>Llegada: {format(new Date(record.arrivalTime), "p", { locale: es })}</span>
                                            ) : record.status === "EXCUSED" ? (
                                                <span className="font-medium">
                                                    {record.justificationUrl ? "Justificado con soporte" : "Justificado sin soporte"}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!readonly && (record.status === "ABSENT" || (record.status === "LATE" && !record.justification)) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(record)}
                                                >
                                                    Justificar
                                                </Button>
                                            )}
                                            {/* Show View button for students if justified */}
                                            {!readonly && (record.status === "EXCUSED" || (record.status === "LATE" && record.justification)) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewJustification(record)}
                                                >
                                                    Ver Justificación
                                                </Button>
                                            )}
                                            {/* Teacher view: Show view and delete for all records */}
                                            {readonly && (
                                                <div className="flex justify-end gap-2">
                                                    {(record.status === "LATE" || record.status === "EXCUSED") && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleViewJustification(record)}
                                                            title="Ver Justificación"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteClick(record)}
                                                        title="Eliminar Registro"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                    ¡Excelente! No tienes inasistencias ni llegadas tarde registradas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Justificar Inasistencia</DialogTitle>
                        <DialogDescription>
                            Selecciona el tipo de justificación para la fecha {selectedDate?.toLocaleDateString('es-ES')}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* Information boxes based on date */}
                        {(() => {
                            if (!selectedDate) return null;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const date = new Date(selectedDate);
                            date.setHours(0, 0, 0, 0);
                            const isToday = date.getTime() === today.getTime();
                            const isPast = date.getTime() < today.getTime();

                            if (isToday) {
                                return (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 p-3">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <CalendarIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                                    Gestión de Asistencia de Hoy
                                                </p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    {selectedRecord?.status === "ABSENT" 
                                                        ? "Has sido marcado como ausente hoy. Puedes justificar tu inasistencia adjuntando un soporte o explicando el motivo."
                                                        : "Si llegaste tarde y tienes un código de asistencia, o si deseas justificar una inasistencia futura, utiliza las opciones correspondientes."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (isPast) {
                                return (
                                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-400 p-3">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                                                    Fecha pasada
                                                </p>
                                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                    Solo puedes justificar <strong>inasistencias con soporte</strong> o <strong>sin soporte</strong> para fechas pasadas.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-400 p-3">
                            <div className="flex">
                                <div className="shrink-0">
                                    <AlertCircle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs text-orange-700 dark:text-orange-300">
                                        <strong>Importante:</strong> Una vez registrada la justificación, no podrás modificarla ni eliminarla.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 py-4">
                        {/* Tabs for justification type */}
                        <div className="grid gap-2" style={{
                            gridTemplateColumns: '1fr 1fr'
                        }}>
                        {(() => {
                                if (!selectedDate) return null;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const date = new Date(selectedDate);
                                date.setHours(0, 0, 0, 0);
                                const isPast = date.getTime() < today.getTime();

                                return (
                                    <>
                                        <Button
                                            type="button"
                                            variant={justificationType === "WITH_SUPPORT" ? "default" : "outline"}
                                            onClick={() => setJustificationType("WITH_SUPPORT")}
                                            className="text-sm h-auto py-3"
                                        >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Con Soporte
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={justificationType === "WITHOUT_SUPPORT" ? "default" : "outline"}
                                            onClick={() => setJustificationType("WITHOUT_SUPPORT")}
                                            className="text-sm h-auto py-3"
                                        >
                                            <AlertCircle className="mr-2 h-4 w-4" />
                                            Sin Soporte
                                        </Button>
                                    </>
                                );
                            })()}
                        </div>


                        {justificationType === "WITH_SUPPORT" && (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                                    <p>Adjunta un enlace a un documento de Google Drive (público) que soporte tu excusa (incapacidad, calamidad, etc.).</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="documentUrl">Enlace al Documento (Google Drive/Docs)</Label>
                                    <Input
                                        id="documentUrl"
                                        placeholder="https://docs.google.com/..."
                                        value={documentUrl}
                                        onChange={(e) => setDocumentUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {justificationType === "WITHOUT_SUPPORT" && (
                            <div className="space-y-4">
                                <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                                    <p>Estás justificando una inasistencia sin soporte documental. Esto quedará a criterio del profesor.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="justification">Justificación / Comentario</Label>
                            <Textarea
                                id="justification"
                                placeholder="Explica brevemente la razón..."
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancelar</Button>
                        <Button onClick={handleJustify} disabled={submitting}>
                            {submitting ? "Registrando..." : "Registrar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalle de Justificación</DialogTitle>
                        <DialogDescription>
                            Información registrada para la fecha {selectedRecord && new Date(selectedRecord.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <div className="p-2 bg-muted rounded-md font-medium">
                                {selectedRecord?.status === "LATE" ? "Llegada Tarde" : "Inasistencia Justificada"}
                            </div>
                        </div>

                        {selectedRecord?.status === "LATE" && (
                            <div className="space-y-2">
                                <Label>Hora de Llegada</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    {selectedRecord?.arrivalTime ? new Date(selectedRecord.arrivalTime).toLocaleTimeString() : "-"}
                                </div>
                            </div>
                        )}

                        {selectedRecord?.status === "EXCUSED" && selectedRecord?.justificationUrl && (
                            <div className="space-y-2">
                                <Label>Documento de Soporte</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <a
                                        href={selectedRecord.justificationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-2"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Ver Documento
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Justificación del Estudiante</Label>
                            <div className="p-3 bg-muted rounded-md italic">
                                &quot;{selectedRecord?.justification || "Sin justificación"}&quot;
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button onClick={() => setIsViewDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará completamente el registro de asistencia del estudiante para esta fecha. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
