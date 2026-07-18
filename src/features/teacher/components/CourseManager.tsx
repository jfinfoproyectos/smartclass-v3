"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createCourseAction, deleteCourseAction, cloneCourseAction, generateEnrollmentCodeAction, toggleCourseRegistrationSimpleAction } from "@/features/teacher/actions/courseActions";
import { getCourseCompleteDataAction } from "@/features/teacher/actions/reportActions";
import { Trash2, Settings, Copy, Users, BookOpen, Pencil, RefreshCw, Check, Maximize2, FolderArchive, Loader2 } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateCourseAction } from "@/features/teacher/actions/courseActions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getMultiCourseGradesReportAction } from "@/features/teacher/actions/reportActions";
import { exportMultiSheetExcel } from "@/lib/export-utils";
import { FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCalendarDate } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { EnrollmentRequests } from "./EnrollmentRequests";
import JSZip from "jszip";
import { exportCourseAction } from "@/features/teacher/actions/courseZipActions";

// Helper function to format date consistently on server and client
function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

interface Schedule {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    registrationOpen: boolean;
    registrationDeadline: Date | string | null;
    enrollmentCode: string | null;
    schedules: Schedule[];
    _count: {
        enrollments: number;
    };
}

interface PendingEnrollment {
    id: string;
    course: {
        id: string;
        title: string;
    };
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    createdAt: Date;
}







function DeleteCourseDialog({ courseId, courseTitle }: { courseId: string, courseTitle: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <DialogTrigger asChild>
                    <span className="inline-block">
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                    </span>
                </DialogTrigger>
                <TooltipContent>
                    <p>Eliminar</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eliminar Curso</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente el curso <strong>{courseTitle}</strong> y todos sus datos asociados.
                    </DialogDescription>
                </DialogHeader>
                <form action={async (formData) => {
                    try {
                        await deleteCourseAction(formData);
                        setIsOpen(false);
                        toast.success("Curso eliminado correctamente");
                    } catch (error) {
                        console.error("Error deleting course:", error);
                        toast.error("Error al eliminar el curso");
                    }
                }} className="space-y-4">
                    <input type="hidden" name="courseId" value={courseId} />
                    <div className="space-y-2">
                        <Label htmlFor="confirmText">
                            Escribe <strong>ELIMINAR</strong> para confirmar
                        </Label>
                        <Input
                            id="confirmText"
                            name="confirmText"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            required
                            pattern="ELIMINAR"
                            placeholder="ELIMINAR"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={confirmText !== "ELIMINAR"}
                        >
                            Eliminar Curso
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export function CourseManager({ 
    initialCourses, 
    pendingEnrollments = [], 
    currentDate,
    filter = "active",
    onEdit,
    onClone
}: { 
    initialCourses: Course[], 
    pendingEnrollments?: PendingEnrollment[], 
    currentDate?: string,
    filter?: "active" | "archived",
    onEdit?: (course: Course) => void,
    onClone?: (course: Course) => void
}) {
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const now = currentDate ? new Date(currentDate) : new Date();
    const activeCourses = initialCourses.filter(course => !course.endDate || new Date(course.endDate) >= now);
    const archivedCourses = initialCourses.filter(course => course.endDate && new Date(course.endDate) < now);

    const [exportingCourseId, setExportingCourseId] = useState<string | null>(null);

    const handleExportCourseZip = async (courseId: string, courseTitle: string) => {
        setExportingCourseId(courseId);
        const toastId = toast.loading("Exportando curso y preparando archivo ZIP...");
        try {
            const courseJSON = await exportCourseAction(courseId);
            const zip = new JSZip();
            zip.file("course_data.json", JSON.stringify(courseJSON, null, 2));
            const blob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Curso_${courseTitle.replace(/[^a-z0-9]/gi, '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Curso exportado exitosamente como ZIP", { id: toastId });
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error(error.message || "Error al exportar el curso", { id: toastId });
        } finally {
            setExportingCourseId(null);
        }
    };

    const handleExportMulti = async () => {
        setIsExporting(true);
        try {
            const data = await getMultiCourseGradesReportAction(selectedCourses);
            exportMultiSheetExcel(data, `Reporte_Calificaciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success("Reporte generado con éxito");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el reporte");
        } finally {
            setIsExporting(false);
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const toggleAllInView = () => {
        const currentInView = filter === "active" ? activeCourses : archivedCourses;
        const currentInViewIds = currentInView.map(c => c.id);
        const allSelected = currentInViewIds.every(id => selectedCourses.includes(id));

        if (allSelected) {
            setSelectedCourses(prev => prev.filter(id => !currentInViewIds.includes(id)));
        } else {
            setSelectedCourses(prev => [...new Set([...prev, ...currentInViewIds])]);
        }
    };

    const CourseTable = ({ courses }: { courses: Course[] }) => {
        if (courses.length === 0) {
            return (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-24 bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-muted/30 backdrop-blur-sm"
                >
                    <div className="bg-primary/5 p-6 rounded-full mb-6 relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20" />
                        <BookOpen className="h-12 w-12 text-primary/40 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground/80 mb-2">No hay cursos disponibles</h3>
                    <p className="text-muted-foreground text-center max-w-md px-6">
                        Parece que todavía no hay cursos en esta sección. ¡Pronto aparecerán nuevas oportunidades de aprendizaje!
                    </p>
                </motion.div>
            );
        }

        const currentInViewIds = courses.map(c => c.id);
        const allSelected = currentInViewIds.length > 0 && currentInViewIds.every(id => selectedCourses.includes(id));

        return (
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5 overflow-x-auto">
                <Table className="w-full min-w-[800px]">
                    <TableHeader>
                        <TableRow className="h-12 bg-muted/40 hover:bg-muted/40 border-b border-border/30">
                            <TableHead className="w-10 pl-5">
                                <Checkbox
                                    id="select-all"
                                    checked={allSelected}
                                    onCheckedChange={toggleAllInView}
                                    className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-muted-foreground/80 pl-2">Curso</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center text-muted-foreground/80">Inscritos</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden md:table-cell text-muted-foreground/80">Inicio</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden md:table-cell text-muted-foreground/80">Fin</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center text-muted-foreground/80">Código</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-center hidden lg:table-cell text-muted-foreground/80">Inscripción</TableHead>
                            <TableHead className="font-extrabold uppercase tracking-wider text-[10px] text-right pr-5 text-muted-foreground/80">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {courses.map((course, idx) => (
                            <TableRow
                                key={course.id}
                                className="group hover:bg-muted/30 transition-colors border-b border-border/20"
                            >
                                <TableCell className="pl-5">
                                    <Checkbox
                                        id={`select-${course.id}`}
                                        checked={selectedCourses.includes(course.id)}
                                        onCheckedChange={() => toggleCourseSelection(course.id)}
                                        className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                </TableCell>

                                <TableCell className="font-medium py-3.5 pl-2">
                                    <div className="flex items-center gap-3.5">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-all duration-300 shadow-sm shadow-primary/5 shrink-0">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-sm text-foreground/90 group-hover:text-primary transition-colors duration-300 leading-tight">
                                                {course.title}
                                            </span>
                                            {course.description && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">
                                                    {course.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                <TableCell className="text-center py-3.5">
                                    <span className="text-xs font-semibold bg-muted/65 px-2.5 py-1 rounded-lg border border-border/30 text-foreground">
                                        {course._count.enrollments}
                                    </span>
                                </TableCell>

                                <TableCell className="text-center py-3.5 hidden md:table-cell">
                                    <code className="text-[11px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-lg font-mono border border-border/30 tracking-tight shadow-inner-sm">
                                        {course.startDate ? formatCalendarDate(course.startDate, "dd/MM/yy") : "---"}
                                    </code>
                                </TableCell>

                                <TableCell className="text-center py-3.5 hidden md:table-cell">
                                    <code className="text-[11px] bg-muted/80 text-muted-foreground px-2.5 py-1 rounded-lg font-mono border border-border/30 tracking-tight shadow-inner-sm">
                                        {course.endDate ? formatCalendarDate(course.endDate, "dd/MM/yy") : "---"}
                                    </code>
                                </TableCell>

                                <TableCell className="text-center py-3.5">
                                    {course.enrollmentCode ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <code className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded font-mono text-xs font-bold tracking-wider">
                                                {course.enrollmentCode}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(course.enrollmentCode || "");
                                                    toast.success("Código copiado");
                                                }}
                                                title="Copiar código"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                onClick={async () => {
                                                    try {
                                                        const res = await generateEnrollmentCodeAction(course.id);
                                                        toast.success(`Código regenerado: ${res.code}`);
                                                    } catch (e) {
                                                        toast.error("Error al generar código");
                                                    }
                                                }}
                                                title="Regenerar código"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                        title="Proyectar código"
                                                    >
                                                        <Maximize2 className="h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col items-center justify-center p-12">
                                                    <DialogHeader className="w-full text-center">
                                                        <DialogTitle className="text-3xl font-black text-center mb-1">Código de Inscripción</DialogTitle>
                                                        <DialogDescription className="text-lg text-center text-muted-foreground font-semibold">
                                                            {course.title}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex-1 flex flex-col items-center justify-center my-10 w-full">
                                                        <div className="w-full text-center font-mono text-[9rem] sm:text-[12rem] md:text-[15rem] leading-none font-black tracking-widest select-all text-primary bg-primary/5 rounded-[2.5rem] py-12 px-6 border-2 border-primary/20 shadow-2xl relative overflow-hidden group">
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50 pointer-events-none" />
                                                            {course.enrollmentCode}
                                                        </div>
                                                        <p className="text-xl md:text-2xl text-center text-muted-foreground font-bold tracking-tight mt-8">
                                                            Ingresa a la aplicación, haz clic en <span className="text-primary font-black">"Inscribirse a un curso"</span> e ingresa este código.
                                                        </p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] uppercase font-bold tracking-wider px-2"
                                            onClick={async () => {
                                                try {
                                                    const res = await generateEnrollmentCodeAction(course.id);
                                                    toast.success(`Código generado: ${res.code}`);
                                                } catch (e) {
                                                    toast.error("Error al generar código");
                                                }
                                            }}
                                        >
                                            Generar
                                        </Button>
                                    )}
                                </TableCell>

                                <TableCell className="text-center hidden lg:table-cell">
                                    <div className="flex items-center justify-center gap-2">
                                        <Switch
                                            checked={course.registrationOpen}
                                            onCheckedChange={async () => {
                                                try {
                                                    await toggleCourseRegistrationSimpleAction(course.id);
                                                    toast.success(course.registrationOpen ? "Inscripción cerrada" : "Inscripción abierta");
                                                } catch (e) {
                                                    toast.error("Error al cambiar inscripción");
                                                }
                                            }}
                                        />
                                        <span className="text-[10px] font-bold select-none min-w-[45px] text-left">
                                            {course.registrationOpen ? "Abierta" : "Cerrada"}
                                        </span>
                                    </div>
                                </TableCell>

                                <TableCell>
                                    <TooltipProvider>
                                        <div className="flex items-center justify-center gap-0.5">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                        onClick={() => onEdit?.(course)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Editar</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                                        onClick={() => onClone?.(course)}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Clonar</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" asChild>
                                                        <Link href={`/dashboard/teacher/courses/${course.id}?tab=students`}>
                                                            <Users className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Alumnos</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
                                                        onClick={() => handleExportCourseZip(course.id, course.title)}
                                                        disabled={exportingCourseId === course.id}
                                                    >
                                                        {exportingCourseId === course.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <FolderArchive className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Exportar (ZIP)</TooltipContent>
                                            </Tooltip>

                                            <DeleteCourseDialog courseId={course.id} courseTitle={course.title} />

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="h-8 px-3 font-bold text-[10px] uppercase tracking-wider shadow-sm hover:shadow-primary/20 transition-all ml-1"
                                                        asChild
                                                    >
                                                        <Link href={`/dashboard/teacher/courses/${course.id}`}>
                                                            <Settings className="h-3.5 w-3.5 mr-1" />
                                                            <span className="hidden xl:inline">Ingresar</span>
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Ingresar al Aula</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const currentCourses = filter === "active" ? activeCourses : archivedCourses;

    return (
        <div className="space-y-4">
            {selectedCourses.length > 0 && currentCourses.length > 0 && (
                <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-muted/20 border border-border/50 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-3">
                            {selectedCourses.length} seleccionados
                        </Badge>
                    </div>
                    
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportMulti}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20"
                    >
                        {isExporting ? (
                            "Generando..."
                        ) : (
                            <>
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                                Exportar Planillas
                            </>
                        )}
                    </Button>
                </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CourseTable courses={currentCourses} />
            </div>
        </div>
    );
}
