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
import { createCourseAction, deleteCourseAction, cloneCourseAction } from "@/features/teacher/actions/courseActions";
import { updateRegistrationSettingsAction } from "@/features/teacher/actions/courseActions";;
import { getCourseCompleteDataAction } from "@/features/teacher/actions/reportActions";
import { Plus, Trash2, Eye, Lock, Unlock, Calendar, Settings, X, Copy, FileWarning, Download, Users, BookOpen, Clock } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { updateCourseAction } from "@/features/teacher/actions/courseActions";
import { Pencil } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getMultiCourseGradesReportAction } from "@/features/teacher/actions/reportActions";
import { exportMultiSheetExcel } from "@/lib/export-utils";
import { FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCalendarDate } from "@/lib/dateUtils";

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
    externalUrl: string | null;
    registrationOpen: boolean;
    registrationDeadline: Date | string | null;
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


function RegistrationSettingsDialog({ course }: { course: Course }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isOpenStatus, setIsOpenStatus] = useState(course.registrationOpen);
    const [mode, setMode] = useState<"date">( "date");
    const [deadline, setDeadline] = useState(course.registrationDeadline ? format(new Date(course.registrationDeadline), "yyyy-MM-dd'T'HH:mm") : "");

    const setQuickDeadline = (minutes: number) => {
        const now = new Date();
        const future = new Date(now.getTime() + minutes * 60000);
        setDeadline(format(future, "yyyy-MM-dd'T'HH:mm"));
        setIsOpenStatus(true);
    };
    // ... rest of the function (no change needed in body if types match)

    // I need to be careful with replace_file_content, I cannot assume body content.
    // I will use multi_replace.



    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <DialogTrigger asChild>
                    <span className="inline-block">
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            >
                                {course.registrationOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                    </span>
                </DialogTrigger>
                <TooltipContent>
                    <p>{course.registrationOpen ? "Cerrar Inscripción" : "Abrir Inscripción"}</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configurar Inscripción</DialogTitle>
                    <DialogDescription>
                        Gestiona la disponibilidad del curso para nuevos estudiantes.
                    </DialogDescription>
                </DialogHeader>
                <form action={async (formData) => {
                    if (deadline) {
                        formData.set("deadline", new Date(deadline).toISOString());
                    }
                    await updateRegistrationSettingsAction(formData);
                    setIsOpen(false);
                }} className="space-y-4">
                    <input type="hidden" name="courseId" value={course.id} />

                    <div className="space-y-2">
                        <Label>Estado de Inscripción</Label>
                        <RadioGroup 
                            name="isOpen" 
                            value={isOpenStatus ? "true" : "false"}
                            onValueChange={(v) => setIsOpenStatus(v === "true")}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="open" />
                                <Label htmlFor="open">Abierta</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="closed" />
                                <Label htmlFor="closed">Cerrada</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {isOpenStatus && (
                        <div className="space-y-4 pt-2 border-t">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opciones de Apertura Rápida</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5"
                                    onClick={() => setQuickDeadline(15)}
                                >
                                    <Clock className="h-3.5 w-3.5" /> 15m
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5"
                                    onClick={() => setQuickDeadline(30)}
                                >
                                    <Clock className="h-3.5 w-3.5" /> 30m
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5"
                                    onClick={() => setQuickDeadline(60)}
                                >
                                    <Clock className="h-3.5 w-3.5" /> 1h
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5"
                                    onClick={() => setQuickDeadline(120)}
                                >
                                    <Clock className="h-3.5 w-3.5" /> 2h
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O Fecha Límite Personalizada</Label>
                                <Input
                                    id="deadline"
                                    name="deadline"
                                    type="datetime-local"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    required={isOpenStatus}
                                />
                                <p className="text-[10px] text-muted-foreground">La inscripción se cerrará automáticamente en la fecha y hora indicadas.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit">Guardar Cambios</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
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
                                className="h-4 w-4 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-0"
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

import { EnrollmentRequests } from "./EnrollmentRequests";
import { Badge } from "@/components/ui/badge";

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

    const CourseGrid = ({ courses }: { courses: Course[] }) => {
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

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {courses.map((course) => (
                    <div key={course.id} className="relative group">
                        <div className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="h-full flex flex-col relative bg-background/60 backdrop-blur-xl border-border/50 rounded-[1.8rem] overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl">
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                            
                            <div className="absolute top-3 right-3 z-20">
                                <Checkbox
                                    id={`select-${course.id}`}
                                    checked={selectedCourses.includes(course.id)}
                                    onCheckedChange={() => toggleCourseSelection(course.id)}
                                    className="h-4 w-4 rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all shadow-sm"
                                />
                            </div>

                            <CardHeader className="pb-1 pt-5 px-5 text-center relative">
                                <div className="flex flex-col items-center gap-2">
                                    <Badge variant="outline" className="text-[8px] px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full">
                                        <Users className="h-2 w-2 mr-1" /> {course._count.enrollments} Inscritos
                                    </Badge>
                                    <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors w-full uppercase tracking-tight">
                                        {course.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 px-5 py-2 space-y-4 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Inicio</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-foreground/80">
                                            <Calendar className="h-2.5 w-2.5 text-primary" />
                                            {course.startDate ? formatCalendarDate(course.startDate, "dd/MM/yy") : "---"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Fin</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-foreground/80">
                                            <Calendar className="h-2.5 w-2.5 text-destructive" />
                                            {course.endDate ? formatCalendarDate(course.endDate, "dd/MM/yy") : "---"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="px-4 pb-4 pt-2 flex flex-col gap-3">
                                <div className="flex items-center justify-center gap-1.5 w-full">
                                    <TooltipProvider>
                                        <div className="flex items-center justify-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/20">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-background rounded-md transition-colors"
                                                        onClick={() => onEdit?.(course)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Editar</TooltipContent>
                                            </Tooltip>

                                            <div className="w-[1px] h-3 bg-border/50" />

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-background rounded-md transition-colors"
                                                        onClick={() => onClone?.(course)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Clonar</TooltipContent>
                                            </Tooltip>

                                            <div className="w-[1px] h-3 bg-border/50" />

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500 hover:bg-background rounded-md transition-colors" asChild>
                                                        <Link href={`/dashboard/teacher/courses/${course.id}?tab=students`}>
                                                            <Users className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="text-[10px]">Alumnos</TooltipContent>
                                            </Tooltip>

                                            <div className="w-[1px] h-3 bg-border/50" />
                                            
                                            <div className="flex items-center">
                                                <RegistrationSettingsDialog course={course} />
                                            </div>

                                            <div className="w-[1px] h-3 bg-border/50" />
                                            
                                            <DeleteCourseDialog courseId={course.id} courseTitle={course.title} />
                                        </div>
                                    </TooltipProvider>
                                </div>

                                <Link href={`/dashboard/teacher/courses/${course.id}`} className="w-full">
                                    <Button className="w-full font-black text-[10px] uppercase tracking-widest shadow-md hover:shadow-primary/20 transition-all active:scale-[0.98] h-9 rounded-xl border border-primary/20">
                                        <Settings className="mr-2 h-3.5 w-3.5" /> Ingresar al Aula
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {(filter === "active" ? activeCourses : archivedCourses).length > 0 && (
                <div className="flex items-center justify-between gap-4 px-6 py-3 bg-muted/20 border border-border/50 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Checkbox 
                                id="select-all" 
                                checked={(filter === "active" ? activeCourses : archivedCourses).length > 0 && (filter === "active" ? activeCourses : archivedCourses).every(c => selectedCourses.includes(c.id))}
                                onCheckedChange={toggleAllInView}
                                className="h-5 w-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor="select-all" className="text-sm font-bold cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
                                Seleccionar todos
                            </Label>
                        </div>
                        
                        {selectedCourses.length > 0 && (
                            <div className="h-4 w-[2px] bg-border/50 hidden sm:block" />
                        )}

                        {selectedCourses.length > 0 && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-3">
                                {selectedCourses.length} seleccionados
                            </Badge>
                        )}
                    </div>
                    
                    {selectedCourses.length > 0 && (
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
                    )}
                </div>
            )}

            <div className="mt-4">
                {filter === "active" ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CourseGrid courses={activeCourses} />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CourseGrid courses={archivedCourses} />
                    </div>
                )}
            </div>
        </div>
    );
}
