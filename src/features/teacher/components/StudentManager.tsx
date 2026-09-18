"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Plus, Search, UserPlus, Trash2, UserCheck, Eye, Calendar, MoreHorizontal, ShieldAlert, ShieldCheck, FileSpreadsheet, ClipboardX, Users, UserMinus, Upload, CheckCircle2, XCircle, AlertCircle, FolderKanban, CalendarCheck2, Loader2, FolderArchive, LayoutGrid, List, Download, ChevronDown, X, KeyRound, Mail } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { addStudentToCourseAction, searchStudentsAction, removeStudentFromCourseAction, bulkAddStudentsToCourseAction, createAndEnrollStudentAction, resetStudentPasswordAction } from "@/features/teacher/actions/studentActions";
import { getStudentCourseEnrollmentAction, updateStudentStatusAction, getStudentMissingActivitiesAction } from "@/features/teacher/actions/studentActions";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StudentActivityDetails } from './StudentActivityDetails';
import { AttendanceManagementSheet } from './AttendanceManagementSheet';
import { CourseGroupsModal } from './CourseGroupsModal';
import { CourseReportPDFDocument } from './CourseReportPDFDocument';
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import { formatName, getInitials } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StudentManager({ 
    courseId, 
    initialStudents,
    courseTitle 
}: { 
    courseId: string, 
    initialStudents: any[],
    courseTitle: string
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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
    const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
    const [studentForAttendance, setStudentForAttendance] = useState<any | null>(null);

    // Add-student modal tab
    const [sheetTab, setSheetTab] = useState<"search" | "excel" | "create">("search");

    // Excel bulk import
    const [excelIdentifiers, setExcelIdentifiers] = useState<string[]>([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    const [bulkResults, setBulkResults] = useState<{ identifier: string; success: boolean; name?: string; error?: string }[] | null>(null);

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

            // Map statuses: FALTA for absent, TARDE for late, empty for present/excused/none
            const statusLabel = (raw: any): string => {
                const s = raw && typeof raw === 'object' && 'status' in raw ? raw.status : raw;
                if (s === 'A') return 'FALTA';
                if (s === 'L') return 'TARDE';
                return '';
            };

            // Identify date columns (all keys except ID, Estudiante, Correo)
            const fixedCols = new Set(['ID', 'Estudiante', 'Correo']);
            const allDateCols = data.length > 0
                ? Object.keys(data[0]).filter(k => !fixedCols.has(k))
                : [];

            // Keep only date columns where at least one student has FALTA or TARDE
            const activeDateCols = allDateCols.filter(dateCol =>
                data.some(row => {
                    const lbl = statusLabel(row[dateCol]);
                    return lbl === 'FALTA' || lbl === 'TARDE';
                })
            );

            // Build final rows: ID + Estudiante (no Correo) + active date columns only
            const excelData = data.map(row => {
                const newRow: any = {
                    'ID': row['ID'],
                    'Estudiante': row['Estudiante'],
                };
                activeDateCols.forEach(dateCol => {
                    newRow[dateCol] = statusLabel(row[dateCol]);
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

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkResults(null);
        setExcelIdentifiers([]);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                import("xlsx").then(({ read, utils }) => {
                    const wb = read(evt.target?.result, { type: "array" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows: any[] = utils.sheet_to_json(ws, { defval: "" });
                    const ids: string[] = [];
                    for (const row of rows) {
                        const val = row["Identificacion"] || row["identificacion"] || row["IDENTIFICACION"] ||
                            row["ID"] || row["id"] || row["Email"] || row["email"] ||
                            row["Correo"] || row["correo"] || "";
                        if (val) ids.push(String(val).trim());
                    }
                    setExcelIdentifiers(ids);
                    if (ids.length === 0) {
                        toast.error("No se encontraron identificaciones. El Excel debe tener una columna 'Identificacion', 'Email' o 'Correo'.");
                    } else {
                        toast.success(`${ids.length} identificaciones encontradas`);
                    }
                });
            } catch { toast.error("Error al leer el archivo Excel"); }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkImport = async () => {
        if (!excelIdentifiers.length) return;
        setIsBulkLoading(true);
        setBulkResults(null);
        try {
            const results = await bulkAddStudentsToCourseAction(courseId, excelIdentifiers);
            setBulkResults(results);
            const ok = results.filter(r => r.success).length;
            const fail = results.filter(r => !r.success).length;
            if (ok > 0) toast.success(`${ok} aprendiz${ok > 1 ? "ces" : ""} agregado${ok > 1 ? "s" : ""} exitosamente`);
            if (fail > 0) toast.error(`${fail} no se pudieron agregar`);
        } catch { toast.error("Error al procesar la importación masiva"); }
        finally { setIsBulkLoading(false); }
    };

    const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreatingStudent(true);
        const formData = new FormData(e.currentTarget);
        try {
            const res = await createAndEnrollStudentAction(formData);
            if (res.success) {
                toast.success(res.message);
                setIsOpen(false); // Close dialog
                setSelectedStudent(null);
                setSearchQuery("");
                setSearchResults([]);
                setSheetTab("search");
            }
        } catch (error: any) {
            toast.error(error.message || "Error al crear el estudiante");
        } finally {
            setIsCreatingStudent(false);
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

    const filteredStudents = initialStudents.filter(enrollment => {
        const query = filterQuery.toLowerCase();
        const accounts = enrollment.user.accounts || [];
        const isGoogle = accounts.some((a: any) => a.providerId === "google");
        const authMethod = isGoogle ? "google" : "correo contraseña email";

        return (
            enrollment.user.name.toLowerCase().includes(query) ||
            enrollment.user.email.toLowerCase().includes(query) ||
            enrollment.user.profile?.identificacion?.toLowerCase().includes(query) ||
            enrollment.user.profile?.nombres?.toLowerCase().includes(query) ||
            enrollment.user.profile?.apellido?.toLowerCase().includes(query) ||
            enrollment.user.profile?.telefono?.toLowerCase().includes(query) ||
            authMethod.includes(query)
        );
    });

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
            {/* Header del módulo con estilo idéntico al de Actividades */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 sm:gap-3">
                    <h3 className="text-lg sm:text-xl font-semibold">Estudiantes del Curso</h3>
                    <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full shrink-0">
                        {filteredStudents.length !== initialStudents.length
                            ? `${filteredStudents.length} de ${initialStudents.length} ${initialStudents.length === 1 ? 'estudiante' : 'estudiantes'}`
                            : `${initialStudents.length} ${initialStudents.length === 1 ? 'estudiante' : 'estudiantes'}`}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Selector de vistas idéntico al de Actividades */}
                    <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                        <Button
                            type="button"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("grid")}
                            title="Vista de Tarjetas"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
                            <span>Tarjetas</span>
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("table")}
                            title="Vista de Tabla"
                        >
                            <List className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
                            <span>Tabla</span>
                        </Button>
                    </div>

                    {/* Botón Principal: Agregar Estudiante */}
                    <Dialog
                        open={isOpen}
                        onOpenChange={(open) => {
                            if (!open) {
                                setSelectedStudent(null);
                                setSearchQuery("");
                                setSearchResults([]);
                                setSheetTab("search");
                                setExcelIdentifiers([]);
                                setBulkResults(null);
                            }
                            setIsOpen(open);
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 px-3 rounded-lg font-semibold shrink-0">
                                <UserPlus className="mr-1.5 h-4 w-4 shrink-0" />
                                <span className="hidden sm:inline">Agregar Estudiante</span>
                                <span className="sm:hidden">Agregar</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl w-full p-0 gap-0 flex flex-col max-h-[88vh]">
                            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                                <DialogTitle>Agregar Aprendiz al Curso</DialogTitle>
                                <DialogDescription>
                                    Busca un aprendiz individualmente o importa una lista desde Excel
                                </DialogDescription>
                            </DialogHeader>

                            <Tabs
                                value={sheetTab}
                                onValueChange={(v) => setSheetTab(v as "search" | "excel" | "create")}
                                className="flex flex-col flex-1 overflow-hidden min-h-0"
                            >
                                <TabsList className="mx-6 mt-4 w-auto self-start flex-shrink-0">
                                    <TabsTrigger value="search" className="gap-1.5">
                                        <Search className="h-3.5 w-3.5" />
                                        Buscar
                                    </TabsTrigger>
                                    <TabsTrigger value="excel" className="gap-1.5">
                                        <Upload className="h-3.5 w-3.5" />
                                        Cargar Excel
                                    </TabsTrigger>
                                    <TabsTrigger value="create" className="gap-1.5">
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Crear Estudiante
                                    </TabsTrigger>
                                </TabsList>

                                {/* ─── TAB 1: buscar individualmente ─── */}
                                <TabsContent value="search" className="flex-1 overflow-hidden mt-0 flex flex-col min-h-0">
                                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="add-search">Buscar Aprendiz</Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="add-search"
                                                    placeholder="Escribe nombre, apellido, correo o identificación..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>

                                        {isSearching && (
                                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                                                Buscando aprendices...
                                            </div>
                                        )}

                                        {!isSearching && searchResults.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground font-medium">Resultados ({searchResults.length})</p>
                                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                    {searchResults.map((student) => (
                                                        <div
                                                            key={student.id}
                                                            onClick={() => setSelectedStudent(student)}
                                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                                                selectedStudent?.id === student.id
                                                                    ? "border-primary bg-primary/5"
                                                                    : "hover:bg-muted/50 border-border"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={student.image} />
                                                                    <AvatarFallback>{getInitials(formatName(student.name, student.profile))}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-sm truncate">{formatName(student.name, student.profile)}</p>
                                                                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                                                </div>
                                                            </div>
                                                            {student.profile?.identificacion && (
                                                                <Badge variant="outline" className="text-xs shrink-0 font-mono">
                                                                    {student.profile.identificacion}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-6">
                                                No se encontraron aprendices disponibles con ese criterio.
                                            </p>
                                        )}

                                        {selectedStudent && (
                                            <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
                                                <p className="text-xs font-semibold text-primary mb-2">Aprendiz seleccionado</p>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={selectedStudent.image} />
                                                        <AvatarFallback>{getInitials(formatName(selectedStudent.name, selectedStudent.profile))}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{formatName(selectedStudent.name, selectedStudent.profile)}</p>
                                                        <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
                                                        {selectedStudent.profile?.identificacion && (
                                                            <p className="text-[10px] text-muted-foreground">ID: {selectedStudent.profile.identificacion}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex-shrink-0">
                                        <form
                                            action={async (formData) => {
                                                if (!selectedStudent) return;
                                                formData.append("userId", selectedStudent.id);
                                                formData.append("courseId", courseId);
                                                try {
                                                    await addStudentToCourseAction(formData);
                                                    toast.success(`${formatName(selectedStudent.name, selectedStudent.profile)} agregado al curso`);
                                                } catch {
                                                    toast.error("Error al agregar el aprendiz");
                                                }
                                                // Stay open — clear selection for the next add
                                                setSelectedStudent(null);
                                                setSearchQuery("");
                                                setSearchResults([]);
                                            }}
                                            className="w-full"
                                        >
                                            <Button type="submit" disabled={!selectedStudent} size="lg" className="w-full">
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                Agregar al Curso
                                            </Button>
                                        </form>
                                    </DialogFooter>
                                </TabsContent>

                                {/* ─── TAB 2: carga masiva desde Excel ─── */}
                                <TabsContent value="excel" className="flex-1 overflow-hidden mt-0 flex flex-col min-h-0">
                                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                        {/* Instrucciones */}
                                        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 space-y-2">
                                            <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4" />
                                                Formato del archivo
                                            </p>
                                            <p className="text-xs text-muted-foreground">El archivo debe tener una columna con uno de estos nombres:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {["Identificacion", "ID", "Email", "Correo"].map(col => (
                                                    <Badge key={col} variant="outline" className="text-[10px] font-mono">{col}</Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Zona de carga */}
                                        <div>
                                            <Label htmlFor="excel-upload" className="mb-2 block">Seleccionar archivo</Label>
                                            <label
                                                htmlFor="excel-upload"
                                                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer p-6 group"
                                            >
                                                <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">
                                                        {excelIdentifiers.length > 0
                                                            ? `${excelIdentifiers.length} identificaciones cargadas — clic para cambiar`
                                                            : "Haz clic para seleccionar"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">.xlsx, .xls, .csv</p>
                                                </div>
                                                <input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleExcelUpload} />
                                            </label>
                                        </div>

                                        {/* Vista previa */}
                                        {excelIdentifiers.length > 0 && !bulkResults && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold">Vista previa <Badge variant="secondary" className="ml-1">{excelIdentifiers.length}</Badge></p>
                                                <div className="rounded-md border max-h-36 overflow-y-auto">
                                                    {excelIdentifiers.slice(0, 20).map((id, i) => (
                                                        <div key={i} className="px-3 py-1 text-xs font-mono border-b last:border-0 text-muted-foreground">
                                                            {id}
                                                        </div>
                                                    ))}
                                                    {excelIdentifiers.length > 20 && (
                                                        <div className="px-3 py-1 text-xs text-center text-muted-foreground bg-muted/30">
                                                            ... y {excelIdentifiers.length - 20} más
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Resultados de la importación */}
                                        {bulkResults && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-3 text-center">
                                                        <p className="text-2xl font-black text-green-600 dark:text-green-400">{bulkResults.filter(r => r.success).length}</p>
                                                        <p className="text-xs text-green-700 dark:text-green-500 font-medium">Agregados</p>
                                                    </div>
                                                    <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-center">
                                                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{bulkResults.filter(r => !r.success).length}</p>
                                                        <p className="text-xs text-red-700 dark:text-red-500 font-medium">Con error</p>
                                                    </div>
                                                </div>
                                                <div className="rounded-md border max-h-44 overflow-y-auto">
                                                    {bulkResults.map((r, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 text-xs">
                                                            {r.success
                                                                ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                                : r.error === "Ya inscrito"
                                                                    ? <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                                    : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                                            <span className="font-mono text-muted-foreground">{r.identifier}</span>
                                                            {r.name && <span className="font-medium truncate">{r.name}</span>}
                                                            {r.error && <span className="text-muted-foreground ml-auto">{r.error}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex-shrink-0">
                                        <Button
                                            size="lg"
                                            className="w-full"
                                            disabled={excelIdentifiers.length === 0 || isBulkLoading}
                                            onClick={handleBulkImport}
                                        >
                                            {isBulkLoading ? (
                                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Importando...</>
                                            ) : (
                                                <><Users className="h-4 w-4 mr-2" />Importar {excelIdentifiers.length > 0 ? `${excelIdentifiers.length} aprendices` : "aprendices"}</>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </TabsContent>

                                {/* ─── TAB 3: crear y agregar estudiante ─── */}
                                <TabsContent value="create" className="flex-1 overflow-hidden mt-0 flex flex-col min-h-0">
                                    <form onSubmit={handleCreateStudent} className="flex flex-col flex-1 overflow-hidden min-h-0">
                                        <input type="hidden" name="courseId" value={courseId} />
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label htmlFor="create-nombres">Nombres <span className="text-destructive">*</span></Label>
                                                    <Input id="create-nombres" name="nombres" required placeholder="Ej: Juan Carlos" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="create-apellido">Apellidos <span className="text-destructive">*</span></Label>
                                                    <Input id="create-apellido" name="apellido" required placeholder="Ej: Pérez Gómez" />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="create-identificacion">Identificación / Documento / Código <span className="text-destructive">*</span></Label>
                                                <Input id="create-identificacion" name="identificacion" required placeholder="Ej: 1098765432" />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="create-email">Correo Electrónico <span className="text-destructive">*</span></Label>
                                                <Input id="create-email" name="email" type="email" required placeholder="Ej: juan.perez@correo.com" />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="create-telefono">Teléfono (Opcional)</Label>
                                                <Input id="create-telefono" name="telefono" placeholder="Ej: 3123456789" />
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="create-password">Contraseña de Acceso (Opcional)</Label>
                                                <Input id="create-password" name="password" type="password" placeholder="Por defecto será su número de identificación" />
                                                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                                    * Si se deja en blanco, el estudiante podrá ingresar usando su número de identificación como contraseña.
                                                </p>
                                            </div>
                                        </div>

                                        <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex-shrink-0">
                                            <Button
                                                type="submit"
                                                size="lg"
                                                className="w-full"
                                                disabled={isCreatingStudent}
                                            >
                                                {isCreatingStudent ? (
                                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Creando estudiante...</>
                                                ) : (
                                                    <><UserPlus className="h-4 w-4 mr-2" />Crear y Agregar al Curso</>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Barra de herramientas: Búsqueda y Botones Organizados */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 max-w-full sm:max-w-xs md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar estudiantes..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="h-8 pl-8 pr-8 text-xs rounded-lg bg-background"
                    />
                    {filterQuery && (
                        <button
                            type="button"
                            onClick={() => setFilterQuery("")}
                            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5"
                            title="Limpiar búsqueda"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-start sm:justify-end">
                    {/* Botones de gestión rápida de la clase */}
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams?.toString() || "");
                            params.set("tab", "attendance");
                            router.replace(`/dashboard/teacher/courses/${courseId}?${params.toString()}`, { scroll: false });
                        }}
                        className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium gap-1.5"
                        title="Ir al registro de asistencia"
                    >
                        <CalendarCheck2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Asistencia</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsGroupsModalOpen(true)}
                        className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium gap-1.5"
                        title="Gestionar grupos de trabajo del curso"
                    >
                        <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Grupos de Trabajo</span>
                    </Button>

                    {/* Menú organizado de exportaciones y reportes */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium gap-1.5"
                                title="Descargar reportes del curso"
                            >
                                {isExporting || isExportingAttendance || isExportingZip ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                ) : (
                                    <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                                <span>Reportes</span>
                                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60 p-1.5">
                            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                                Exportar Datos del Curso
                            </DropdownMenuLabel>
                            
                            <DropdownMenuItem 
                                onClick={handleExportReport} 
                                disabled={isExporting}
                                className="gap-2.5 text-xs cursor-pointer py-2 rounded-lg"
                            >
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-green-600 shrink-0" />
                                ) : (
                                    <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                    <span className="font-medium text-foreground">Calificaciones (Excel)</span>
                                    <span className="text-[10px] text-muted-foreground">Listado de notas de actividades</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={handleExportAttendanceReport} 
                                disabled={isExportingAttendance}
                                className="gap-2.5 text-xs cursor-pointer py-2 rounded-lg"
                            >
                                {isExportingAttendance ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                                ) : (
                                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                    <span className="font-medium text-foreground">Inasistencias (Excel)</span>
                                    <span className="text-[10px] text-muted-foreground">Registro de faltas y retardos</span>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1" />

                            <DropdownMenuItem 
                                onClick={handleExportZipReport} 
                                disabled={isExportingZip}
                                className="gap-2.5 text-xs cursor-pointer py-2 rounded-lg"
                            >
                                {isExportingZip ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                                ) : (
                                    <FolderArchive className="h-4 w-4 text-primary shrink-0" />
                                )}
                                <div className="flex flex-col">
                                    <span className="font-medium text-foreground">Reportes Curso (ZIP)</span>
                                    <span className="text-[10px] text-muted-foreground">Todos los PDFs individuales</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

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

            {/* Renderizado de Estudiantes: Estado Vacío, Tarjetas o Tabla */}
            {filteredStudents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-card">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4 text-sm">
                        {filterQuery 
                            ? "No se encontraron estudiantes que coincidan con la búsqueda." 
                            : "No hay estudiantes inscritos en este curso aún."}
                    </p>
                    {filterQuery ? (
                        <Button onClick={() => setFilterQuery("")} variant="outline" size="sm">
                            Limpiar búsqueda
                        </Button>
                    ) : (
                        <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
                            <UserPlus className="mr-2 h-4 w-4" /> Agregar primer estudiante
                        </Button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {filteredStudents.map((enrollment) => {
                        const studentName = formatName(enrollment.user.name, enrollment.user.profile);
                        const idDoc = enrollment.user.profile?.identificacion;
                        const phone = enrollment.user.profile?.telefono;
                        const accounts = enrollment.user.accounts || [];
                        const isGoogleOnly = accounts.length > 0 && accounts.every((a: any) => a.providerId === "google");

                        return (
                            <div
                                key={enrollment.user.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                            >
                                {/* Barra superior de acento */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/50 to-primary/20 opacity-60 group-hover:opacity-100 transition-opacity" />

                                {/* Header de la tarjeta */}
                                <div className="flex items-start justify-between gap-2.5 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Avatar className="h-10 w-10 border border-border/60 shrink-0">
                                            <AvatarImage src={enrollment.user.image} />
                                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                                {getInitials(studentName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm leading-snug truncate" title={studentName}>
                                                {studentName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate" title={enrollment.user.email}>
                                                {enrollment.user.email}
                                            </p>
                                            <div className="mt-1">
                                                {isGoogleOnly ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                                                    >
                                                        <GoogleIcon className="h-2.5 w-2.5 shrink-0" />
                                                        <span>Google</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                                                    >
                                                        <Mail className="h-2.5 w-2.5 shrink-0" />
                                                        <span>Correo y Contraseña</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {getStatusBadge(enrollment.status || 'APPROVED')}
                                    </div>
                                </div>

                                {/* Metadatos del estudiante */}
                                <div className="space-y-1.5 py-2 border-y border-border/40 text-xs text-muted-foreground my-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px]">Identificación:</span>
                                        <span className="font-mono font-medium text-foreground text-[11px] truncate">
                                            {idDoc || "No registrada"}
                                        </span>
                                    </div>
                                    {phone && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px]">Teléfono:</span>
                                            <span className="font-medium text-foreground text-[11px] truncate">
                                                {phone}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Acciones */}
                                <div className="pt-2.5 flex items-center justify-between gap-1">
                                    <TooltipProvider>
                                        <div className="flex items-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenAttendanceSheet(enrollment.user)}
                                                        className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-xs gap-1"
                                                    >
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span className="text-[11px]">Asistencias</span>
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
                                                        size="sm"
                                                        onClick={() => handleViewActivities(enrollment.user.id)}
                                                        className="h-8 px-2 text-primary hover:bg-primary/10 text-xs gap-1"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        <span className="text-[11px]">Detalles</span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Ver Detalles y Actividades</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <MissingActivitiesDialog
                                                courseId={courseId}
                                                userId={enrollment.user.id}
                                                studentName={studentName}
                                            />

                                            {!isGoogleOnly && (
                                                <ResetStudentPasswordDialog
                                                    courseId={courseId}
                                                    studentId={enrollment.user.id}
                                                    studentName={studentName}
                                                    identificacion={idDoc}
                                                />
                                            )}

                                            <Dialog>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Eliminar Estudiante</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Eliminar Estudiante del Curso</DialogTitle>
                                                        <DialogDescription>
                                                            Esta acción eliminará de forma permanente a <strong>{studentName}</strong> de este curso, incluyendo todas sus asistencias, notas, observaciones y entregas de trabajos.
                                                            <br /><br />
                                                            <strong className="text-red-600">¡Advertencia! Esta acción no se puede deshacer y borrará todo el historial del estudiante en este curso.</strong>
                                                            <br /><br />
                                                            Escribe <strong>eliminar</strong> para confirmar.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-2">
                                                        <Input
                                                            placeholder="Escribe eliminar"
                                                            onChange={(e) => {
                                                                const btn = document.getElementById(`delete-btn-card-${enrollment.user.id}`) as HTMLButtonElement;
                                                                if (btn) btn.disabled = e.target.value.toLowerCase() !== "eliminar";
                                                            }}
                                                        />
                                                    </div>
                                                    <DialogFooter>
                                                        <form action={async () => {
                                                            const formData = new FormData();
                                                            formData.append("userId", enrollment.user.id);
                                                            formData.append("courseId", courseId);
                                                            await removeStudentFromCourseAction(formData);
                                                            toast.success("Estudiante y todos sus datos relacionados eliminados exitosamente");
                                                        }}>
                                                            <Button
                                                                id={`delete-btn-card-${enrollment.user.id}`}
                                                                type="submit"
                                                                variant="destructive"
                                                                disabled
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </form>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TooltipProvider>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
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
                            {filteredStudents.map((enrollment) => {
                                const studentName = formatName(enrollment.user.name, enrollment.user.profile);
                                const idDoc = enrollment.user.profile?.identificacion;
                                const accounts = enrollment.user.accounts || [];
                                const isGoogleOnly = accounts.length > 0 && accounts.every((a: any) => a.providerId === "google");

                                return (
                                <TableRow key={enrollment.user.id}>
                                    <TableCell>
                                        <Avatar className="h-8 w-8 text-[10px]">
                                            <AvatarImage src={enrollment.user.image} />
                                            <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {studentName}
                                    </TableCell>
                                    <TableCell>{idDoc || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 py-0.5 max-w-[220px]">
                                            <span className="truncate text-xs" title={enrollment.user.email}>
                                                {enrollment.user.email}
                                            </span>
                                            <div>
                                                {isGoogleOnly ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                                                    >
                                                        <GoogleIcon className="h-2.5 w-2.5 shrink-0" />
                                                        <span>Google</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                                                    >
                                                        <Mail className="h-2.5 w-2.5 shrink-0" />
                                                        <span>Correo y Contraseña</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{enrollment.user.profile?.telefono || "-"}</TableCell>
                                    <TableCell>
                                        {getStatusBadge(enrollment.status || 'APPROVED')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <TooltipProvider>
                                            <div className="flex items-center justify-end gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenAttendanceSheet(enrollment.user)}
                                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
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
                                                    studentName={studentName}
                                                />

                                                {!isGoogleOnly && (
                                                    <ResetStudentPasswordDialog
                                                        courseId={courseId}
                                                        studentId={enrollment.user.id}
                                                        studentName={studentName}
                                                        identificacion={idDoc}
                                                    />
                                                )}

                                                <Dialog>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Eliminar Estudiante</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Eliminar Estudiante del Curso</DialogTitle>
                                                            <DialogDescription>
                                                                Esta acción eliminará de forma permanente a <strong>{formatName(enrollment.user.name, enrollment.user.profile)}</strong> de este curso, incluyendo todas sus asistencias, notas, observaciones y entregas de trabajos.
                                                                <br /><br />
                                                                <strong className="text-red-600">¡Advertencia! Esta acción no se puede deshacer y borrará todo el historial del estudiante en este curso.</strong>
                                                                <br /><br />
                                                                Escribe <strong>eliminar</strong> para confirmar.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-2">
                                                            <Input
                                                                placeholder="Escribe eliminar"
                                                                onChange={(e) => {
                                                                    const btn = document.getElementById(`delete-btn-${enrollment.user.id}`) as HTMLButtonElement;
                                                                    if (btn) btn.disabled = e.target.value.toLowerCase() !== "eliminar";
                                                                }}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <form action={async () => {
                                                                const formData = new FormData();
                                                                formData.append("userId", enrollment.user.id);
                                                                formData.append("courseId", courseId);
                                                                await removeStudentFromCourseAction(formData);
                                                                toast.success("Estudiante y todos sus datos relacionados eliminados exitosamente");
                                                            }}>
                                                                <Button
                                                                    id={`delete-btn-${enrollment.user.id}`}
                                                                    type="submit"
                                                                    variant="destructive"
                                                                    disabled
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            </form>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Modal de Gestión de Grupos de Estudiantes con Líder */}
            <CourseGroupsModal
                isOpen={isGroupsModalOpen}
                onClose={() => setIsGroupsModalOpen(false)}
                courseId={courseId}
                courseTitle={courseTitle}
                enrolledStudents={initialStudents}
            />
        </div >
    );
}



function getActivityTypeLabel(type: string) {
    switch (type) {
        case "GITHUB": return "IA GitHub";
        case "CODE_PROJECT": return "Proyecto Código";
        case "CODE_CHALLENGE": return "Code Challenge";
        case "WORKSHOP_CODE": return "Taller Codelab";
        case "WORKSHOP_GITHUB": return "Tutorial GitHub";
        case "VIDEO_PITCH": return "Video Pitch";
        case "AUDIO_DEFENSE": return "Defensa Oral";
        case "AI_INTERVIEW": return "Entrevista IA";
        case "DB_MODELING":
        case "DATABASE": return "Base de Datos";
        case "PDF_REVIEW": return "Revisión PDF";
        case "MANUAL": default: return "Manual";
    }
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
                                        <Badge variant="outline" className="text-[10px]">{getActivityTypeLabel(activity.type)}</Badge>
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

function GoogleIcon({ className = "h-3 w-3" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    );
}

function ResetStudentPasswordDialog({ 
    courseId, 
    studentId, 
    studentName, 
    identificacion 
}: { 
    courseId: string; 
    studentId: string; 
    studentName: string; 
    identificacion?: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        if (!identificacion) {
            toast.error("El estudiante no tiene número de identificación registrado en su perfil.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await resetStudentPasswordAction(studentId, courseId);
            if (res.success) {
                toast.success(res.message);
                setIsOpen(false);
            }
        } catch (error: any) {
            toast.error(error.message || "Error al restablecer la contraseña");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                            <KeyRound className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Restablecer contraseña (por defecto documento)</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <KeyRound className="h-5 w-5" />
                        <DialogTitle>Restablecer Contraseña</DialogTitle>
                    </div>
                    <DialogDescription>
                        Esta acción asignará el número de identificación como la nueva contraseña de acceso de <strong>{studentName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 space-y-3 text-sm">
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-1.5">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            Nueva contraseña predeterminada:
                        </p>
                        {identificacion ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Documento de Identidad:</span>
                                <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-background">
                                    {identificacion}
                                </Badge>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>No tiene número de identificación registrado en su perfil.</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        El estudiante podrá ingresar con su correo electrónico y su número de identificación.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleReset} 
                        disabled={isLoading || !identificacion}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Restableciendo...
                            </>
                        ) : (
                            <>
                                <KeyRound className="h-4 w-4" />
                                Restablecer Contraseña
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

