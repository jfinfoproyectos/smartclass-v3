"use client";

import { useState, useMemo, useEffect } from "react";
import { CourseManager } from "./CourseManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { createCourseAction, updateCourseAction, cloneCourseAction } from "@/features/teacher/actions/courseActions";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { importCourseAction } from "@/features/teacher/actions/courseZipActions";

interface TeacherDashboardProps {
    courses: any[];
    pendingEnrollments: any[];
    stats: {
        pendingEnrollmentsCount: number;
        pendingGradingCount: number;
        activeCoursesCount: number;
        totalStudentsCount: number;
        recentPendingGrading: any[];
    };
    currentDate?: string;
    docProjects?: { id: string; name: string }[];
}

export function TeacherDashboard({ courses, pendingEnrollments, stats, currentDate, docProjects = [] }: TeacherDashboardProps) {
    const [activeTab, setActiveTab] = useState("courses");
    const [courseFilter, setCourseFilter] = useState("active");

    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const [isImporting, setIsImporting] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const handleImportCourseZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Leyendo archivo ZIP e importando curso...");
        try {
            const zip = new JSZip();
            const contents = await zip.loadAsync(file);
            const jsonFile = contents.file("course_data.json");
            
            if (!jsonFile) {
                throw new Error("El archivo ZIP no contiene 'course_data.json'.");
            }

            const jsonText = await jsonFile.async("text");
            const courseData = JSON.parse(jsonText);

            const result = await importCourseAction(courseData);
            if (result.success) {
                toast.success("Curso importado correctamente", { id: toastId });
                setImportDialogOpen(false);
                router.refresh();
            }
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error(error.message || "Error al importar el curso", { id: toastId });
        } finally {
            setIsImporting(false);
            e.target.value = "";
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<any>(null);
    const [isCloning, setIsCloning] = useState(false);

    const now = currentDate ? new Date(currentDate) : new Date();
    const activeCoursesCount = courses.filter(course => !course.endDate || new Date(course.endDate) >= now).length;
    const archivedCoursesCount = courses.filter(course => course.endDate && new Date(course.endDate) < now).length;


    const openCreateDialog = () => {
        setEditCourse(null);
        setIsCloning(false);
        setIsDialogOpen(true);
    };

    const openEditDialog = (course: any) => {
        setEditCourse(course);
        setIsCloning(false);
        setIsDialogOpen(true);
    };

    const openCloneDialog = (course: any) => {
        setEditCourse(course);
        setIsCloning(true);
        setIsDialogOpen(true);
    };

    if (!mounted) {
        return (
            <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 pt-6">
                <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-8 w-48 bg-muted rounded-md" />
                    <div className="h-4 w-96 bg-muted rounded-md" />
                </div>
                <div className="space-y-6">
                    <div className="h-16 bg-muted rounded-xl animate-pulse" />
                    <div className="h-64 bg-muted rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 pt-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Panel de Control
                </h2>
                <p className="text-muted-foreground">
                    Bienvenido, gestiona tus cursos y revisa el progreso de tus estudiantes.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 bg-muted/20 p-2 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-foreground/80 pl-2">Gestión de Cursos</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-muted/50 p-1 rounded-lg">
                            <button
                                onClick={() => setCourseFilter("active")}
                                className={`px-4 py-1.5 text-xs sm:text-sm font-medium transition-all rounded-md ${
                                    courseFilter === "active" 
                                        ? "bg-background shadow-sm text-foreground" 
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Activos ({activeCoursesCount})
                            </button>
                            <button
                                onClick={() => setCourseFilter("archived")}
                                className={`px-4 py-1.5 text-xs sm:text-sm font-medium transition-all rounded-md ${
                                    courseFilter === "archived" 
                                        ? "bg-background shadow-sm text-foreground" 
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Archivados ({archivedCoursesCount})
                            </button>
                        </div>
                        <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />
                        
                        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all active:scale-95">
                                    <Upload className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Importar Curso (ZIP)</span>
                                    <span className="sm:hidden">Importar</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md w-[95vw] rounded-xl">
                                <DialogHeader>
                                    <DialogTitle>Importar Curso desde ZIP</DialogTitle>
                                    <DialogDescription>
                                        Selecciona el archivo ZIP exportado de un curso para importarlo con todos sus datos (estudiantes, notas, asistencias, entregas).
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 bg-muted/5 hover:bg-muted/10 transition-colors relative group">
                                    {isImporting ? (
                                        <div className="flex flex-col items-center gap-2 py-4">
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                            <p className="text-sm font-semibold text-muted-foreground">Importando curso...</p>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center gap-3 cursor-pointer w-full py-4 text-center">
                                            <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold">Haz clic para seleccionar el archivo ZIP</p>
                                                <p className="text-xs text-muted-foreground">Soporta archivos .zip con formato de exportación de SmartClass</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept=".zip" 
                                                onChange={handleImportCourseZip} 
                                                className="hidden" 
                                            />
                                        </label>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" onClick={openCreateDialog} className="shadow-md hover:shadow-lg transition-all active:scale-95">
                                    <Plus className="mr-2 h-4 w-4" /> 
                                    <span className="hidden sm:inline">Crear Curso</span>
                                    <span className="sm:hidden">Nuevo</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-xl">
                            <form action={async (formData) => {
                                    const title = formData.get("title") as string;
                                    const startDate = formData.get("startDate") as string;
                                    const endDate = formData.get("endDate") as string;

                                    if (!title || title.trim().length < 3) {
                                        toast.error("El título debe tener al menos 3 caracteres");
                                        return;
                                    }

                                    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
                                        toast.error("La fecha de fin no puede ser anterior a la fecha de inicio");
                                        return;
                                    }

                                    try {
                                        if (isCloning && editCourse) {
                                            formData.append("sourceCourseId", editCourse.id);
                                            await cloneCourseAction(formData);
                                            toast.success("Curso clonado correctamente");
                                        } else if (editCourse) {
                                            formData.append("courseId", editCourse.id);
                                            await updateCourseAction(formData);
                                            toast.success("Curso actualizado correctamente");
                                        } else {
                                            await createCourseAction(formData);
                                            toast.success("Curso creado correctamente");
                                        }
                                        setIsDialogOpen(false);
                                        setEditCourse(null);
                                        setIsCloning(false);
                                    } catch (error) {
                                        toast.error("Error al procesar la solicitud");
                                    }
                                }}>
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl">
                                            {isCloning ? "Clonar Curso" : (editCourse ? "Editar Curso" : "Crear Nuevo Curso")}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {isCloning 
                                                ? "Clona el curso seleccionado conservando su estructura y actividades." 
                                                : "Completa la información para configurar el curso académico."}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-6 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Título del Curso</Label>
                                            <Input id="title" name="title" placeholder="Ej: Introducción a la Inteligencia Artificial" defaultValue={isCloning ? `Copia de ${editCourse?.title}` : editCourse?.title || ''} className="bg-muted/30 focus-visible:ring-primary/50" required />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Descripción</Label>
                                            <Textarea id="description" name="description" placeholder="Describe brevemente los objetivos y temas del curso..." defaultValue={editCourse?.description || ''} className="min-h-[100px] bg-muted/30 focus-visible:ring-primary/50 resize-none" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="docProjectId" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Proyecto de Documentación</Label>
                                            <Select name="docProjectId" defaultValue={editCourse?.docProjectId || 'none'}>
                                                <SelectTrigger className="bg-muted/30">
                                                    <SelectValue placeholder="Selecciona un proyecto de documentación" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No asignar ninguna</SelectItem>
                                                    {docProjects.map((dp) => (
                                                        <SelectItem key={dp.id} value={dp.id}>
                                                            {dp.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="startDate" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Fecha Inicio</Label>
                                                <Input id="startDate" name="startDate" type="date" defaultValue={editCourse?.startDate ? format(new Date(editCourse.startDate), "yyyy-MM-dd") : ''} className="bg-muted/30" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="endDate" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Fecha Fin</Label>
                                                <Input id="endDate" name="endDate" type="date" defaultValue={editCourse?.endDate ? format(new Date(editCourse.endDate), "yyyy-MM-dd") : ''} className="bg-muted/30" />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-6 border-t mt-4">
                                        <Button type="submit" className="px-8 font-bold text-lg h-12 rounded-xl shadow-lg shadow-primary/20">
                                            {isCloning ? "Clonar Curso" : (editCourse ? "Actualizar" : "Guardar Curso")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <CourseManager 
                        initialCourses={courses} 
                        pendingEnrollments={pendingEnrollments} 
                        currentDate={currentDate} 
                        filter={courseFilter as any}
                        onEdit={openEditDialog}
                        onClone={openCloneDialog}
                    />
                </motion.div>
            </div>
        </div>
    );
}
