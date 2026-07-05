"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import { Plus, Search, UserPlus, Trash2, UserCheck, Eye, Calendar, MoreHorizontal, ShieldAlert, ShieldCheck, FileSpreadsheet, ClipboardX, Clock, ChevronDown, Users, UserMinus } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addStudentToCourseAction, searchStudentsAction, removeStudentFromCourseAction } from "@/features/teacher/actions/studentActions";
import { getStudentCourseEnrollmentAction, updateStudentStatusAction, getStudentMissingActivitiesAction } from "@/features/teacher/actions/studentActions";
import { recordAttendanceAction, deleteAttendanceAction, getAbsentStudentsForTodayAction } from "@/features/teacher/actions/attendanceActions";


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StudentActivityDetails } from './StudentActivityDetails';
import { AttendanceManagementSheet } from './AttendanceManagementSheet';
import { GroupAttendanceSheet } from './GroupAttendanceSheet';
import { CourseReportPDFDocument } from './CourseReportPDFDocument';
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatName, getInitials } from "@/lib/utils";

export function StudentManager({ 
    courseId, 
    initialStudents,
    courseTitle 
}: { 
    courseId: string, 
    initialStudents: any[],
    courseTitle: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [viewingEnrollment, setViewingEnrollment] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [filterQuery, setFilterQuery] = useState("");
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingAttendance, setIsExportingAttendance] = useState(false);
    const [isExportingZip, setIsExportingZip] = useState(false);

    // Attendance Management Sheet State
    const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);
    const [isGroupAttendanceOpen, setIsGroupAttendanceOpen] = useState(false);
    const [studentForAttendance, setStudentForAttendance] = useState<any | null>(null);

    const handleExportReport = async () => {
        setIsExporting(true);
        try {
            const { getCourseGradesReportAction } = await import("@/features/teacher/actions/reportActions");

            const { exportHierarchicalGradesToExcel } = await import("@/lib/export-utils");

            const data = await getCourseGradesReportAction(courseId);
            await exportHierarchicalGradesToExcel(data, `Reporte_Notas_${new Date().toISOString().split('T')[0]}`, "Notas");
            toast.success("Reporte generado exitosamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el reporte");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAttendanceReport = async () => {
        setIsExportingAttendance(true);
        try {
            const { getCourseAttendanceReportAction } = await import("@/features/teacher/actions/reportActions");
            const { exportToExcel } = await import("@/lib/export-utils");

            const data = await getCourseAttendanceReportAction(courseId);
            
            // Flatten data for Excel (extract only the status from objects)
            const excelData = data.map(row => {
                const newRow = { ...row };
                Object.keys(newRow).forEach(key => {
                    const value = newRow[key];
                    if (value && typeof value === 'object' && 'status' in value) {
                        newRow[key] = value.status;
                    }
                });
                return newRow;
            });

            exportToExcel(excelData, `Reporte_Asistencias_${new Date().toISOString().split('T')[0]}`, "Asistencias");
            toast.success("Reporte generado exitosamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el reporte");
        } finally {
            setIsExportingAttendance(false);
        }
    };

    const handleExportZipReport = async () => {
        setIsExportingZip(true);
        try {
            toast.loading("Obteniendo datos de los estudiantes...", { id: "zip-export" });
            const { getCourseStudentsCompleteDataAction } = await import("@/features/teacher/actions/reportActions");
            const studentsData = await getCourseStudentsCompleteDataAction(courseId);

            if (!studentsData || studentsData.length === 0) {
                toast.error("No hay estudiantes matriculados o datos disponibles.", { id: "zip-export" });
                setIsExportingZip(false);
                return;
            }

            toast.loading(`Generando ${studentsData.length} reportes en PDF...`, { id: "zip-export" });
            const zip = new JSZip();

            for (const student of studentsData) {
                const blob = await pdf(<CourseReportPDFDocument {...student} />).toBlob();
                const sanitizedFileName = `Reporte_${student.studentName.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`;
                zip.file(sanitizedFileName, blob);
            }

            toast.loading("Comprimiendo archivo ZIP...", { id: "zip-export" });
            const zipBlob = await zip.generateAsync({ type: "blob" });

            // Trigger download
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Reportes_Estudiantes_${courseId.slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Archivo ZIP generado exitosamente", { id: "zip-export" });
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el archivo ZIP. Verifica los registros del servidor.", { id: "zip-export" });
        } finally {
            setIsExportingZip(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchStudentsAction(query);
            // Filter out already enrolled students
            const filtered = results.filter(r => !initialStudents.some(s => s.user.id === r.id));
            setSearchResults(filtered);
        } catch (error) {
            console.error("Error searching students:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleViewActivities = async (studentId: string) => {
        setIsLoadingDetails(true);
        try {
            const enrollment = await getStudentCourseEnrollmentAction(studentId, courseId);
            setViewingEnrollment(enrollment);
            setIsDetailsOpen(true);
        } catch (error) {
            console.error("Error fetching student details:", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleOpenAttendanceSheet = (student: any) => {
        setStudentForAttendance(student);
        setIsAttendanceSheetOpen(true);
    };

    const handleNavigateAttendance = (direction: 'prev' | 'next') => {
        if (!studentForAttendance || filteredStudents.length <= 1) return;

        const currentIndex = filteredStudents.findIndex(s => s.user.id === studentForAttendance.id);
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % filteredStudents.length;
        } else {
            nextIndex = (currentIndex - 1 + filteredStudents.length) % filteredStudents.length;
        }

        const nextStudent = filteredStudents[nextIndex].user;
        setStudentForAttendance(nextStudent);
    };


    const handleStatusChange = async (enrollmentId: string, newStatus: 'APPROVED' | 'REJECTED') => {
        try {
            await updateStudentStatusAction(enrollmentId, newStatus);
            toast.success(`Estado actualizado a ${newStatus === 'APPROVED' ? 'Activo' : 'Suspendido'}`);
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    const filteredStudents = initialStudents.filter(enrollment =>
        enrollment.user.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        enrollment.user.email.toLowerCase().includes(filterQuery.toLowerCase()) ||
        enrollment.user.profile?.identificacion?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        enrollment.user.profile?.nombres?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        enrollment.user.profile?.apellido?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        enrollment.user.profile?.telefono?.toLowerCase().includes(filterQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-500 hover:bg-green-600">Activo</Badge>;
            case 'PENDING':
                return <Badge variant="outline" className="text-orange-500 border-orange-500">Pendiente</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Suspendido</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="relative flex-1 max-w-full sm:max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar estudiantes..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button className="flex-1 sm:flex-none"><UserPlus className="mr-2 h-4 w-4" /> Agregar Estudiante</Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full max-w-none sm:max-w-none p-0">
                                <SheetHeader className="px-6 py-4 border-b">
                                    <SheetTitle>Agregar Estudiante al Curso</SheetTitle>
                                    <SheetDescription>
                                        Busca estudiantes por nombre, apellido, identificación o correo electrónico
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Search Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="search">Buscar Estudiante</Label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="search"
                                                placeholder="Escribe nombre, apellido, identificación o correo..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                className="pl-9 h-10"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Escribe al menos 2 caracteres para buscar
                                        </p>
                                    </div>

                                    {/* Search Results Table */}
                                    {searchQuery.length >= 2 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold">
                                                    Resultados de Búsqueda
                                                    {searchResults.length > 0 && (
                                                        <Badge variant="secondary" className="ml-2">
                                                            {searchResults.length}
                                                        </Badge>
                                                    )}
                                                </h3>
                                                {isSearching && (
                                                    <span className="text-xs text-muted-foreground">Buscando...</span>
                                                )}
                                            </div>

                                            {searchResults.length > 0 ? (
                                                <div className="rounded-md border text-xs sm:text-sm">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-[40px]"></TableHead>
                                                                <TableHead>Nombre</TableHead>
                                                                <TableHead className="hidden sm:table-cell">ID</TableHead>
                                                                <TableHead className="text-right">Acción</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {searchResults.map((student) => (
                                                                <TableRow
                                                                    key={student.id}
                                                                    className={selectedStudent?.id === student.id ? "bg-accent" : ""}
                                                                >
                                                                    <TableCell>
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarImage src={student.image} />
                                                                            <AvatarFallback>{student.name[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                    </TableCell>
                                                                    <TableCell className="font-medium p-2">
                                                                        <div className="flex flex-col">
                                                                            <span>
                                                                                {formatName(student.name, student.profile)}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground sm:hidden">
                                                                                {student.profile?.identificacion || student.email}
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="hidden sm:table-cell">
                                                                        {student.profile?.identificacion || "-"}
                                                                    </TableCell>
                                                                    <TableCell className="text-right p-2">
                                                                        <Button
                                                                            variant={selectedStudent?.id === student.id ? "default" : "outline"}
                                                                            size="sm"
                                                                            className="h-7 px-2"
                                                                            onClick={() => setSelectedStudent(student)}
                                                                        >
                                                                            {selectedStudent?.id === student.id ? (
                                                                                <UserCheck className="h-3 w-3" />
                                                                            ) : (
                                                                                "Ver"
                                                                            )}
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : !isSearching ? (
                                                <div className="rounded-md border border-dashed p-4 text-center">
                                                    <p className="text-xs text-muted-foreground">
                                                        Sin resultados
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Selected Student Card */}
                                    {selectedStudent && (
                                        <div className="rounded-lg border p-4 bg-muted/50">
                                            <h4 className="text-sm font-semibold mb-3">Estudiante Seleccionado</h4>
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 text-lg">
                                                    <AvatarImage src={selectedStudent.image} />
                                                    <AvatarFallback>{getInitials(formatName(selectedStudent.name, selectedStudent.profile))}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {formatName(selectedStudent.name, selectedStudent.profile)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
                                                    {selectedStudent.profile?.identificacion && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            ID: {selectedStudent.profile.identificacion}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <SheetFooter className="px-6 py-4 border-t bg-muted/50">
                                    <form
                                        action={async (formData) => {
                                            if (!selectedStudent) return;
                                            formData.append("userId", selectedStudent.id);
                                            formData.append("courseId", courseId);
                                            await addStudentToCourseAction(formData);
                                            setIsOpen(false);
                                            setSelectedStudent(null);
                                            setSearchQuery("");
                                            setSearchResults([]);
                                        }}
                                        className="w-full"
                                    >
                                        <Button
                                            type="submit"
                                            disabled={!selectedStudent}
                                            size="lg"
                                            className="w-full"
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Agregar al Curso
                                        </Button>
                                    </form>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                        <LateArrivalsModal courseId={courseId} />
                        <Button variant="outline" onClick={() => setIsGroupAttendanceOpen(true)}>
                            <Users className="mr-2 h-4 w-4 text-primary" />
                            Resumen de Asistencia
                        </Button>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex-1 sm:flex-none">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                <span className="hidden sm:inline">Exportar Reportes</span>
                                <span className="sm:hidden">Exportar</span>
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Opciones de Exportación</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleExportReport} disabled={isExporting}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                Calificaciones (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportAttendanceReport} disabled={isExportingAttendance}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Inasistencias (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportZipReport} disabled={isExportingZip}>
                                <MoreHorizontal className="mr-2 h-4 w-4" />
                                Todo el Curso (ZIP)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sheet for Viewing Student Activities */}
                    <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                        <SheetContent side="right" className="w-full max-w-none sm:max-w-none p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Detalles del Estudiante</SheetTitle>
                                <SheetDescription>
                                    Vista detallada de las actividades, calificaciones y asistencia del estudiante seleccionado.
                                </SheetDescription>
                            </SheetHeader>
                            {viewingEnrollment ? (
                                <StudentActivityDetails
                                    enrollment={viewingEnrollment}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Cargando detalles...</p>
                                    </div>
                                </div>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Attendance Management Sheet */}
            {studentForAttendance && (
                <AttendanceManagementSheet
                    isOpen={isAttendanceSheetOpen}
                    onOpenChange={setIsAttendanceSheetOpen}
                    courseId={courseId}
                    student={studentForAttendance}
                    onNavigate={handleNavigateAttendance}
                />
            )}

            <GroupAttendanceSheet
                isOpen={isGroupAttendanceOpen}
                onOpenChange={setIsGroupAttendanceOpen}
                courseId={courseId}
                courseTitle={courseTitle}
            />

            <div className="w-full overflow-x-auto rounded-md border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Identificación</TableHead>
                            <TableHead>Correo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((enrollment) => (
                            <TableRow key={enrollment.user.id}>
                                <TableCell>
                                    <Avatar className="h-8 w-8 text-[10px]">
                                        <AvatarImage src={enrollment.user.image} />
                                        <AvatarFallback>{getInitials(formatName(enrollment.user.name, enrollment.user.profile))}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {formatName(enrollment.user.name, enrollment.user.profile)}
                                </TableCell>
                                <TableCell>{enrollment.user.profile?.identificacion || "-"}</TableCell>
                                <TableCell className="truncate max-w-[200px]">{enrollment.user.email}</TableCell>
                                <TableCell>{enrollment.user.profile?.telefono || "-"}</TableCell>
                                <TableCell>
                                    {getStatusBadge(enrollment.status || 'APPROVED')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider>
                                        <div className="flex justify-end gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenAttendanceSheet(enrollment.user)}
                                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                    >
                                                        <Calendar className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Gestionar Asistencias</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleViewActivities(enrollment.user.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Ver Detalles</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <MissingActivitiesDialog
                                                courseId={courseId}
                                                userId={enrollment.user.id}
                                                studentName={formatName(enrollment.user.name, enrollment.user.profile)}
                                            />

                                            <DropdownMenu>

                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {enrollment.status === 'REJECTED' ? (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'APPROVED')}>
                                                            <ShieldCheck className="mr-2 h-4 w-4" /> Activar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(enrollment.id, 'REJECTED')}>
                                                            <ShieldAlert className="mr-2 h-4 w-4" /> Suspender
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                <UserMinus className="mr-2 h-4 w-4" /> Retirar
                                                            </DropdownMenuItem>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Retirar Estudiante</DialogTitle>
                                                                <DialogDescription>
                                                                    Esto retirará a <strong>{formatName(enrollment.user.name, enrollment.user.profile)}</strong> del curso actual.
                                                                    <br /><br />
                                                                    No te preocupes, el estudiante <strong>no será eliminado de la base de datos</strong> y sus registros históricos se conservarán en el sistema.
                                                                    <br /><br />
                                                                    Escribe <strong>retirar</strong> para confirmar.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="py-2">
                                                                <Input
                                                                    placeholder="Escribe retirar"
                                                                    onChange={(e) => {
                                                                        const btn = document.getElementById(`delete-btn-${enrollment.user.id}`) as HTMLButtonElement;
                                                                        if (btn) btn.disabled = e.target.value.toLowerCase() !== "retirar";
                                                                    }}
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <form action={async () => {
                                                                    const formData = new FormData();
                                                                    formData.append("userId", enrollment.user.id);
                                                                    formData.append("courseId", courseId);
                                                                    await removeStudentFromCourseAction(formData);
                                                                    toast.success("Estudiante retirado del curso exitosamente");
                                                                }}>
                                                                    <Button
                                                                        id={`delete-btn-${enrollment.user.id}`}
                                                                        type="submit"
                                                                        variant="destructive"
                                                                        disabled
                                                                    >
                                                                        Retirar
                                                                    </Button>
                                                                </form>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredStudents.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No hay estudiantes inscritos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
}

function LateArrivalsModal({ courseId }: { courseId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);

    const fetchAbsentStudents = async () => {
        setLoading(true);
        try {
            const data = await getAbsentStudentsForTodayAction(courseId);
            setStudents(data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar estudiantes ausentes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAbsentStudents();
        }
    }, [isOpen, courseId]);

    const handleMarkAsLate = async (studentId: string, name: string) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            await recordAttendanceAction(courseId, studentId, today, "LATE");
            toast.success(`${name} marcado como tarde`);
            fetchAbsentStudents(); // Refresh list
        } catch (error) {
            toast.error("Error al registrar llegada tarde");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                    <Clock className="mr-2 h-4 w-4 text-orange-500" />
                    Llegadas Tardes
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Llegadas Tardes (Hoy)</DialogTitle>
                    <DialogDescription>
                        Estudiantes registrados como ausentes para el día de hoy.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[400px] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : students.length > 0 ? (
                        <div className="space-y-3">
                            {students.map((attendance) => (
                                <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={attendance.user?.image} />
                                            <AvatarFallback>{attendance.user?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {formatName(attendance.user?.name, attendance.user?.profile)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {attendance.user?.profile?.identificacion || "Sin ID"}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-xs bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:text-orange-700"
                                        onClick={() => handleMarkAsLate(attendance.userId, attendance.user?.name || "Estudiante")}
                                    >
                                        Llegó Tarde
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p className="text-sm">No hay estudiantes ausentes para el día de hoy.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MissingActivitiesDialog({ courseId, userId, studentName }: { courseId: string, userId: string, studentName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getStudentMissingActivitiesAction(courseId, userId)
                .then(setActivities)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen, courseId, userId]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <ClipboardX className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Ver actividades faltantes</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Actividades Pendientes</DialogTitle>
                    <DialogDescription>
                        Actividades que <strong>{studentName}</strong> aún no ha entregado.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[300px] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                    ) : activities.length > 0 ? (
                        <div className="space-y-3">
                            {activities.map((activity) => (
                                <div key={activity.id} className="p-3 border rounded-md hover:bg-muted/50">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-medium text-sm">{activity.title}</p>
                                        <Badge variant="outline" className="text-[10px]">{activity.type}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Vence: {new Date(activity.deadline).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>¡Este estudiante está al día con todas las entregas!</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
