"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Search, BookOpen, Users, FileText, Calendar, ExternalLink,
    Trash2, Plus, FileSpreadsheet, LayoutGrid, List, Eye,
    UserCog, Copy, Check, Archive, RefreshCw, X,
    CalendarClock, Clock, CalendarDays, GraduationCap, Sparkles,
    AlertCircle, Loader2, CheckCircle2, BookMarked
} from "lucide-react";
import { toast } from "sonner";
import {
    reassignCourseTeacherAction,
    deleteCourseAction,
    createCourseAdminAction,
    toggleCourseArchivedAdminAction,
    getCourseDetailsAdminAction,
    getAllCoursesAdminAction
} from "@/app/admin-actions";
import { format } from "date-fns";
import Link from "next/link";
import { exportToExcel } from "@/lib/export-utils";
import { pdf } from "@react-pdf/renderer";
import { CoursesReportPDFDocument } from "./CoursesReportPDFDocument";
import { CourseDetailView } from "./CourseDetailView";
import { formatName } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";

interface Course {
    id: string;
    title: string;
    description: string | null;
    enrollmentCode?: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    startTime?: string | null;
    endTime?: string | null;
    classDays?: string | null;
    createdAt: Date | string;
    teacher: {
        id: string;
        name: string | null;
        email: string;
        image?: string | null;
        profile?: {
            nombres?: string | null;
            apellido?: string | null;
            identificacion?: string | null;
        } | null;
    };
    _count: {
        enrollments: number;
        activities: number;
    };
}

interface Teacher {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    profile?: {
        nombres?: string | null;
        apellido?: string | null;
        identificacion?: string | null;
    } | null;
}

interface CourseManagementProps {
    initialCourses: Course[];
    teachers: Teacher[];
    totalCount: number;
}

export function CourseManagement({ initialCourses, teachers, totalCount }: CourseManagementProps) {
    const [courses, setCourses] = useState<Course[]>(initialCourses);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("active");
    const [teacherFilter, setTeacherFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Selected course state
    const [inspectingCourse, setInspectingCourse] = useState<Course | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseDetails, setCourseDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [newTeacherId, setNewTeacherId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    // Create Course Form State
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newCourseTeacherId, setNewCourseTeacherId] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");
    const [newClassDays, setNewClassDays] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const [isPending, startTransition] = useTransition();

    const now = new Date();

    // Derived counts
    const activeCoursesCount = courses.filter(c => !c.endDate || new Date(c.endDate) >= now).length;
    const archivedCoursesCount = courses.filter(c => c.endDate && new Date(c.endDate) < now).length;
    const totalStudentsCount = courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
    const totalActivitiesCount = courses.reduce((sum, c) => sum + (c._count?.activities || 0), 0);
    const avgStudentsPerCourse = activeCoursesCount > 0 ? (totalStudentsCount / activeCoursesCount).toFixed(1) : "0";

    // Filtering
    const filteredCourses = courses.filter(course => {
        const matchesSearch =
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (course.teacher.name && course.teacher.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            course.teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.enrollmentCode && course.enrollmentCode.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesStatus = true;
        if (statusFilter === "active") {
            matchesStatus = !course.endDate || new Date(course.endDate) >= now;
        } else if (statusFilter === "archived") {
            matchesStatus = course.endDate ? new Date(course.endDate) < now : false;
        }

        let matchesTeacher = true;
        if (teacherFilter !== "all") {
            matchesTeacher = course.teacher.id === teacherFilter;
        }

        return matchesSearch && matchesStatus && matchesTeacher;
    });

    const isCourseActive = (course: Course) => {
        if (!course.endDate) return true;
        return new Date(course.endDate) >= now;
    };

    const handleCopyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCodeId(id);
        toast.success(`Código ${code} copiado al portapapeles`);
        setTimeout(() => setCopiedCodeId(null), 2000);
    };

    // Open Course Details View
    const handleOpenDetails = async (course: Course) => {
        setInspectingCourse(course);
        setLoadingDetails(true);
        try {
            const details = await getCourseDetailsAdminAction(course.id);
            setCourseDetails(details);
        } catch (error) {
            toast.error("Error al cargar detalles del curso");
        } finally {
            setLoadingDetails(false);
        }
    };

    // Create Course Handler
    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            toast.error("El título del curso es obligatorio");
            return;
        }
        if (!newCourseTeacherId) {
            toast.error("Debes seleccionar un profesor para el curso");
            return;
        }

        setIsCreating(true);
        try {
            const created = await createCourseAdminAction({
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                teacherId: newCourseTeacherId,
                startDate: newStartDate || undefined,
                endDate: newEndDate || undefined,
                startTime: newStartTime || undefined,
                endTime: newEndTime || undefined,
                classDays: newClassDays || undefined,
            });

            setCourses(prev => [created as any, ...prev]);
            toast.success("Curso creado exitosamente", {
                description: `"${created.title}" asignado con código de inscripción: ${created.enrollmentCode || "N/A"}`
            });

            // Reset form
            setNewTitle("");
            setNewDescription("");
            setNewCourseTeacherId("");
            setNewStartDate("");
            setNewEndDate("");
            setNewStartTime("");
            setNewEndTime("");
            setNewClassDays("");
            setCreateDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al crear el curso");
        } finally {
            setIsCreating(false);
        }
    };

    // Reassign Teacher Handler
    const handleReassignTeacher = async () => {
        if (!selectedCourse || !newTeacherId) return;

        startTransition(async () => {
            try {
                await reassignCourseTeacherAction(selectedCourse.id, newTeacherId);

                const newTeacher = teachers.find(t => t.id === newTeacherId);
                if (newTeacher) {
                    setCourses(prev => prev.map(c =>
                        c.id === selectedCourse.id
                            ? { ...c, teacher: newTeacher }
                            : c
                    ));
                    if (selectedCourse) {
                        setSelectedCourse({ ...selectedCourse, teacher: newTeacher });
                    }
                }

                toast.success("Profesor reasignado", {
                    description: `El curso ha sido transferido a ${newTeacher?.name || newTeacher?.email}`
                });

                setReassignDialogOpen(false);
                setNewTeacherId("");
            } catch (error: any) {
                toast.error("Error al reasignar", {
                    description: error.message || "No se pudo reasignar el profesor"
                });
            }
        });
    };

    // Toggle Course Archive Handler
    const handleToggleArchive = async (course: Course) => {
        const currentlyActive = isCourseActive(course);
        const shouldArchive = currentlyActive;

        startTransition(async () => {
            try {
                const updated = await toggleCourseArchivedAdminAction(course.id, shouldArchive);
                setCourses(prev => prev.map(c =>
                    c.id === course.id
                        ? { ...c, endDate: updated.endDate }
                        : c
                ));

                if (selectedCourse?.id === course.id) {
                    setSelectedCourse(prev => prev ? { ...prev, endDate: updated.endDate } : null);
                }

                toast.success(shouldArchive ? "Curso archivado" : "Curso reactivado", {
                    description: `"${course.title}" ahora está ${shouldArchive ? "archivado" : "activo"}.`
                });
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar estado del curso");
            }
        });
    };

    // Delete Course Handler
    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        startTransition(async () => {
            try {
                await deleteCourseAction(selectedCourse.id);

                setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));

                toast.success("Curso eliminado", {
                    description: `El curso "${selectedCourse.title}" ha sido eliminado del sistema`
                });

                setDeleteDialogOpen(false);
                setSelectedCourse(null);
                setDeleteConfirmation("");
            } catch (error: any) {
                toast.error("Error al eliminar", {
                    description: error.message || "No se pudo eliminar el curso"
                });
            }
        });
    };

    // Export to Excel Handler
    const handleExportExcel = async () => {
        if (filteredCourses.length === 0) {
            toast.error("No hay cursos para exportar con los filtros actuales");
            return;
        }

        const dataToExport = filteredCourses.map(c => ({
            "Título del Curso": c.title,
            "Descripción": c.description || "Sin descripción",
            "Profesor Asignado": formatName(c.teacher.name, c.teacher.profile),
            "Correo del Profesor": c.teacher.email,
            "Código de Inscripción": c.enrollmentCode || "Sin código",
            "Estado": isCourseActive(c) ? "Activo" : "Archivado",
            "Estudiantes Inscritos": c._count.enrollments,
            "Actividades Creadas": c._count.activities,
            "Fecha de Inicio": c.startDate ? format(new Date(c.startDate), "dd/MM/yyyy") : "No definida",
            "Fecha de Finalización": c.endDate ? format(new Date(c.endDate), "dd/MM/yyyy") : "No definida",
            "Días de Clase": c.classDays || "No definidos",
            "Horario": c.startTime && c.endTime ? `${c.startTime} - ${c.endTime}` : "No definido",
        }));

        await exportToExcel(
            dataToExport,
            `Reporte_Cursos_SmartClass_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
            "Cursos"
        );
        toast.success("Reporte de cursos exportado exitosamente");
    };

    // Export to Corporate PDF Handler
    const handleExportPDF = async () => {
        if (filteredCourses.length === 0) {
            toast.error("No hay cursos para exportar con los filtros actuales");
            return;
        }

        setIsExportingPDF(true);
        toast.info("Generando reporte corporativo de cursos en PDF...");
        try {
            const selectedTeacher = teachers.find(t => t.id === teacherFilter);
            const teacherLabel = selectedTeacher ? formatName(selectedTeacher.name, selectedTeacher.profile) : 'Todos los docentes';

            const blob = await pdf(
                <CoursesReportPDFDocument
                    courses={filteredCourses}
                    stats={{
                        total: courses.length,
                        active: activeCoursesCount,
                        archived: archivedCoursesCount,
                        totalStudents: totalStudentsCount,
                        totalActivities: totalActivitiesCount,
                    }}
                    filterStatus={statusFilter}
                    filterTeacher={teacherLabel}
                    generatedAt={format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte_Corporativo_Cursos_${format(new Date(), "yyyy-MM-dd")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Reporte corporativo en PDF descargado exitosamente");
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("Error al generar el reporte corporativo en PDF");
        } finally {
            setIsExportingPDF(false);
        }
    };

    // Full Course Inspection View
    if (inspectingCourse) {
        return (
            <CourseDetailView
                course={inspectingCourse}
                details={courseDetails}
                loading={loadingDetails}
                teachers={teachers}
                onBack={() => {
                    setInspectingCourse(null);
                    setCourseDetails(null);
                }}
                onReassignTeacher={async (courseId, newTeacherId) => {
                    await reassignCourseTeacherAction(courseId, newTeacherId);
                    const newTeacher = teachers.find(t => t.id === newTeacherId);
                    if (newTeacher) {
                        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, teacher: newTeacher } : c));
                        setInspectingCourse(prev => prev ? { ...prev, teacher: newTeacher } : null);
                    }
                    toast.success("Docente reasignado exitosamente");
                }}
                onToggleArchive={async (c) => {
                    await handleToggleArchive(c);
                    setInspectingCourse(prev => prev ? { ...prev, endDate: prev.endDate ? null : new Date(Date.now() - 1000) } : null);
                }}
                onDeleteCourse={async (courseId) => {
                    await deleteCourseAction(courseId);
                    setCourses(prev => prev.filter(c => c.id !== courseId));
                    setInspectingCourse(null);
                    setCourseDetails(null);
                    toast.success("Curso eliminado exitosamente");
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Stats Cards with AI Canvas aesthetics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AICanvasCard
                    title="Cursos Activos"
                    description="Asignaturas en curso lectivo"
                    icon={BookOpen}
                    badge={`${activeCoursesCount} activos`}
                    badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    accentColor="from-emerald-500/20 via-emerald-500/10 to-transparent"
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-600 dark:text-emerald-400"
                    compact={true}
                    onClick={() => setStatusFilter("active")}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {activeCoursesCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            de {courses.length} totales
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Cursos Archivados"
                    description="Histórico de clases cerradas"
                    icon={CalendarClock}
                    badge={`${archivedCoursesCount} archivados`}
                    badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    accentColor="from-amber-500/20 via-amber-500/10 to-transparent"
                    iconBgColor="bg-amber-500/10"
                    iconTextColor="text-amber-600 dark:text-amber-400"
                    compact={true}
                    onClick={() => setStatusFilter("archived")}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {archivedCoursesCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            finalizados
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Total Estudiantes"
                    description="Matrículas en todos los cursos"
                    icon={Users}
                    badge="Matrículas"
                    badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    accentColor="from-blue-500/20 via-blue-500/10 to-transparent"
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-600 dark:text-blue-400"
                    compact={true}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {totalStudentsCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            promedio {avgStudentsPerCourse}/curso
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Actividades Creadas"
                    description="Tareas y talleres académicos"
                    icon={FileText}
                    badge="Evaluaciones"
                    badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    accentColor="from-purple-500/20 via-purple-500/10 to-transparent"
                    iconBgColor="bg-purple-500/10"
                    iconTextColor="text-purple-600 dark:text-purple-400"
                    compact={true}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {totalActivitiesCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            entregables
                        </span>
                    </div>
                </AICanvasCard>
            </div>

            {/* Main Content Card */}
            <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
                <CardHeader className="pb-4 border-b border-border/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl font-bold tracking-tight">Catálogo de Cursos</CardTitle>
                                <Badge variant="outline" className="font-semibold text-xs py-0.5">
                                    {filteredCourses.length} de {courses.length}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs sm:text-sm mt-0.5">
                                Administra asignaturas, códigos de inscripción, docentes asignados y estudiantes matriculados.
                            </CardDescription>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportExcel}
                                className="h-9 gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-medium"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">Exportar</span> Excel
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportPDF}
                                disabled={isExportingPDF}
                                className="h-9 gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium"
                            >
                                {isExportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                                <span className="hidden sm:inline">Exportar</span> PDF
                            </Button>

                            {/* View Mode Toggle */}
                            <div className="flex items-center p-0.5 bg-muted/60 dark:bg-muted/30 border border-border/70 rounded-xl">
                                <Button
                                    variant={viewMode === "grid" ? "default" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("grid")}
                                    className={`h-7 w-7 rounded-lg transition-all ${viewMode === "grid" ? "shadow-2xs" : "text-muted-foreground"}`}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant={viewMode === "table" ? "default" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("table")}
                                    className={`h-7 w-7 rounded-lg transition-all ${viewMode === "table" ? "shadow-2xs" : "text-muted-foreground"}`}
                                >
                                    <List className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            <Button
                                onClick={() => setCreateDialogOpen(true)}
                                size="sm"
                                className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md shadow-primary/20"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Crear Curso</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-4">
                        {/* Status Tabs */}
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
                            <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9 p-1 bg-muted/50 border border-border/60">
                                <TabsTrigger value="all" className="text-xs px-3">
                                    Todos ({courses.length})
                                </TabsTrigger>
                                <TabsTrigger value="active" className="text-xs px-3 gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Activos ({activeCoursesCount})
                                </TabsTrigger>
                                <TabsTrigger value="archived" className="text-xs px-3 gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Archivados ({archivedCoursesCount})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search and Teacher Filter */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 max-w-xl">
                            <div className="relative w-full flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, código, profesor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs bg-background/50 border-border/70"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="w-full sm:w-56">
                                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                                    <SelectTrigger className="h-9 text-xs bg-background/50 border-border/70">
                                        <SelectValue placeholder="Filtrar por profesor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los profesores</SelectItem>
                                        {teachers.map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {formatName(t.name, t.profile)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {filteredCourses.length === 0 ? (
                        <div className="py-14 text-center space-y-3">
                            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/50 border border-border/70 flex items-center justify-center text-muted-foreground">
                                <BookOpen className="h-6 w-6 opacity-60" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-foreground text-sm">No se encontraron cursos</p>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    No hay cursos que coincidan con los criterios de búsqueda o filtros seleccionados.
                                </p>
                            </div>
                            {(searchQuery || statusFilter !== "all" || teacherFilter !== "all") && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("all");
                                        setTeacherFilter("all");
                                    }}
                                    className="text-xs h-8"
                                >
                                    Restablecer Filtros
                                </Button>
                            )}
                        </div>
                    ) : viewMode === "grid" ? (
                        /* ================= GRID VIEW ================= */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredCourses.map((course) => {
                                const active = isCourseActive(course);

                                return (
                                    <div
                                        key={course.id}
                                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-2xs hover:shadow-lg hover:border-primary/40 transition-all duration-200"
                                    >
                                        {/* Top Accent line */}
                                        <div
                                            className={`absolute top-0 inset-x-0 h-1 transition-opacity ${
                                                active
                                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                    : "bg-gradient-to-r from-amber-500 to-slate-400"
                                            }`}
                                        />

                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-bold py-0.5 px-2 ${
                                                                active
                                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                            }`}
                                                        >
                                                            {active ? "Activo" : "Archivado"}
                                                        </Badge>

                                                        {course.enrollmentCode && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopyCode(course.enrollmentCode!, course.id)}
                                                                            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                                                        >
                                                                            <span>{course.enrollmentCode}</span>
                                                                            {copiedCodeId === course.id ? (
                                                                                <Check className="h-2.5 w-2.5 text-green-600" />
                                                                            ) : (
                                                                                <Copy className="h-2.5 w-2.5 opacity-60" />
                                                                            )}
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Copiar código de inscripción</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>

                                                    <h3
                                                        onClick={() => handleOpenDetails(course)}
                                                        className="font-bold text-base text-foreground leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-1"
                                                        title={course.title}
                                                    >
                                                        {course.title}
                                                    </h3>
                                                    {course.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {course.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Teacher info card */}
                                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                                                <UserAvatar
                                                    src={course.teacher.image}
                                                    alt={formatName(course.teacher.name, course.teacher.profile)}
                                                    fallbackText={formatName(course.teacher.name, course.teacher.profile)}
                                                    size="sm"
                                                    className="h-8 w-8"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-foreground truncate">
                                                        {formatName(course.teacher.name, course.teacher.profile)}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {course.teacher.email}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stats summary row */}
                                            <div className="grid grid-cols-2 gap-2 text-xs py-1">
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
                                                    <Users className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-foreground">{course._count.enrollments}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-1">alumnos</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/40">
                                                    <FileText className="h-4 w-4 text-purple-500 shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-foreground">{course._count.activities}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-1">actividades</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Schedule and dates */}
                                            {(course.classDays || course.startTime || course.startDate) && (
                                                <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
                                                    {course.classDays && (
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                                            <span>{course.classDays}</span>
                                                            {course.startTime && course.endTime && (
                                                                <span className="text-foreground font-medium">({course.startTime} - {course.endTime})</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {course.startDate && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                                            <span>Inicio: {format(new Date(course.startDate), "dd/MM/yyyy")}</span>
                                                            {course.endDate && (
                                                                <span>• Fin: {format(new Date(course.endDate), "dd/MM/yyyy")}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions footer */}
                                        <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-1 mt-4">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDetails(course)}
                                                    className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 gap-1"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Detalles</span>
                                                </Button>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                asChild
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <Link href={`/dashboard/teacher/courses/${course.id}`}>
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Entrar al curso como administrador</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedCourse(course);
                                                                    setNewTeacherId(course.teacher.id);
                                                                    setReassignDialogOpen(true);
                                                                }}
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <UserCog className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Reasignar profesor</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleToggleArchive(course)}
                                                                disabled={isPending}
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            >
                                                                {active ? (
                                                                    <Archive className="h-3.5 w-3.5 text-amber-600" />
                                                                ) : (
                                                                    <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{active ? "Archivar curso" : "Reactivar curso"}</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedCourse(course);
                                                                    setDeleteConfirmation("");
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                                disabled={isPending}
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Eliminar curso</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ================= TABLE VIEW ================= */
                        <div className="rounded-2xl border border-border/50 overflow-x-auto shadow-sm">
                            <Table className="min-w-[950px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Curso</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs">Profesor</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Código</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Alumnos</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Actividades</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs hidden lg:table-cell">Fechas / Horario</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center pr-4">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCourses.map((course) => {
                                        const active = isCourseActive(course);

                                        return (
                                            <TableRow key={course.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                <TableCell className="pl-4">
                                                    <div className="max-w-[240px]">
                                                        <div
                                                            onClick={() => handleOpenDetails(course)}
                                                            className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                                                            title={course.title}
                                                        >
                                                            {course.title}
                                                        </div>
                                                        {course.description && (
                                                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                {course.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2 max-w-[220px]">
                                                        <UserAvatar
                                                            src={course.teacher.image}
                                                            alt={formatName(course.teacher.name, course.teacher.profile)}
                                                            fallbackText={formatName(course.teacher.name, course.teacher.profile)}
                                                            size="sm"
                                                            className="h-7 w-7"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium text-xs text-foreground truncate">
                                                                {formatName(course.teacher.name, course.teacher.profile)}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate">
                                                                {course.teacher.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] font-bold py-0.5 px-2 ${
                                                            active
                                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                        }`}
                                                    >
                                                        {active ? "Activo" : "Archivado"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {course.enrollmentCode ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyCode(course.enrollmentCode!, course.id)}
                                                            className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted/70 hover:bg-muted text-foreground border border-border/60 transition-colors"
                                                            title="Clic para copiar código"
                                                        >
                                                            <span>{course.enrollmentCode}</span>
                                                            {copiedCodeId === course.id ? (
                                                                <Check className="h-3 w-3 text-green-600" />
                                                            ) : (
                                                                <Copy className="h-3 w-3 opacity-60" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                                                        <Users className="h-3.5 w-3.5 text-blue-500" />
                                                        <span>{course._count.enrollments}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                                                        <FileText className="h-3.5 w-3.5 text-purple-500" />
                                                        <span>{course._count.activities}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                    <div className="space-y-0.5">
                                                        {course.startDate && (
                                                            <div>Inicio: {format(new Date(course.startDate), "dd/MM/yyyy")}</div>
                                                        )}
                                                        {course.classDays && (
                                                            <div className="font-medium text-foreground">{course.classDays}</div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right pr-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleOpenDetails(course)}
                                                                        className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver detalles e inscritos</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        asChild
                                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <Link href={`/dashboard/teacher/courses/${course.id}`}>
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Entrar al curso</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setSelectedCourse(course);
                                                                            setNewTeacherId(course.teacher.id);
                                                                            setReassignDialogOpen(true);
                                                                        }}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <UserCog className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Reasignar profesor</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleToggleArchive(course)}
                                                                        disabled={isPending}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        {active ? (
                                                                            <Archive className="h-4 w-4 text-amber-600" />
                                                                        ) : (
                                                                            <RefreshCw className="h-4 w-4 text-emerald-600" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{active ? "Archivar curso" : "Reactivar curso"}</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setSelectedCourse(course);
                                                                            setDeleteConfirmation("");
                                                                            setDeleteDialogOpen(true);
                                                                        }}
                                                                        disabled={isPending}
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Eliminar curso</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================= MODAL: CREAR CURSO ================= */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <BookMarked className="h-5 w-5" />
                            <DialogTitle className="text-xl font-bold">Crear Nuevo Curso</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs sm:text-sm">
                            Registra una nueva asignatura en la plataforma y asigna al docente responsable. Se generará automáticamente un código de inscripción.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateCourse} className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="course-title" className="text-xs font-semibold">
                                Título del Curso <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="course-title"
                                placeholder="Ej: Programación Web con Next.js"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                required
                                disabled={isCreating}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="course-desc" className="text-xs font-semibold">
                                Descripción
                            </Label>
                            <Input
                                id="course-desc"
                                placeholder="Breve resumen o contenido temático del curso..."
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                disabled={isCreating}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="course-teacher" className="text-xs font-semibold">
                                Profesor Asignado <span className="text-red-500">*</span>
                            </Label>
                            <Select value={newCourseTeacherId} onValueChange={setNewCourseTeacherId} disabled={isCreating}>
                                <SelectTrigger id="course-teacher" className="h-9 text-xs">
                                    <SelectValue placeholder="Selecciona un profesor responsable" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {formatName(t.name, t.profile)} ({t.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-2">
                                <Label htmlFor="start-date" className="text-xs font-semibold">
                                    Fecha de Inicio
                                </Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={newStartDate}
                                    onChange={(e) => setNewStartDate(e.target.value)}
                                    disabled={isCreating}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end-date" className="text-xs font-semibold">
                                    Fecha de Finalización
                                </Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                    disabled={isCreating}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="class-days" className="text-xs font-semibold">
                                Días de Clase
                            </Label>
                            <Input
                                id="class-days"
                                placeholder="Ej: Lunes y Miércoles"
                                value={newClassDays}
                                onChange={(e) => setNewClassDays(e.target.value)}
                                disabled={isCreating}
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="start-time" className="text-xs font-semibold">
                                    Hora de Inicio
                                </Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    disabled={isCreating}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end-time" className="text-xs font-semibold">
                                    Hora de Fin
                                </Label>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    disabled={isCreating}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                                disabled={isCreating}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Crear Curso
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: REASIGNAR PROFESOR ================= */}
            <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <UserCog className="h-5 w-5" />
                            <DialogTitle>Reasignar Profesor</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs sm:text-sm">
                            Transfiere la titularidad del curso <strong>"{selectedCourse?.title}"</strong> a un nuevo profesor.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-sm">
                        <div className="p-3 rounded-xl bg-muted/60 border border-border/50 space-y-1">
                            <span className="text-xs text-muted-foreground">Profesor Actual:</span>
                            <div className="font-semibold text-foreground">
                                {selectedCourse ? formatName(selectedCourse.teacher.name, selectedCourse.teacher.profile) : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {selectedCourse?.teacher.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Selecciona el Nuevo Profesor</Label>
                            <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecciona un profesor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {formatName(teacher.name, teacher.profile)} ({teacher.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReassignDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleReassignTeacher}
                            disabled={isPending || !newTeacherId || newTeacherId === selectedCourse?.teacher.id}
                            className="font-bold"
                        >
                            {isPending ? "Reasignando..." : "Confirmar Reasignación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: ELIMINAR CURSO ================= */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive mb-1">
                            <AlertCircle className="h-5 w-5" />
                            <DialogTitle>Eliminar Curso</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs sm:text-sm">
                            Esta acción eliminará permanentemente el curso{" "}
                            <strong>"{selectedCourse?.title}"</strong> junto con sus inscripciones, calificaciones y actividades asociadas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-2">
                        <Label className="text-xs font-semibold text-destructive">
                            Escribe <span className="font-mono font-bold select-all bg-destructive/10 px-1.5 py-0.5 rounded">ELIMINAR</span> para confirmar:
                        </Label>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Escribe ELIMINAR"
                            className="h-9 font-mono text-sm uppercase"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteCourse}
                            disabled={deleteConfirmation !== "ELIMINAR" || isPending}
                            className="font-bold"
                        >
                            {isPending ? "Eliminando..." : "Eliminar Curso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
