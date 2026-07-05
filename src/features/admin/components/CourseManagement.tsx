"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, BookOpen, Users, FileText, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { reassignCourseTeacherAction, deleteCourseAction } from "@/app/admin-actions";
import { format } from "date-fns";
import Link from "next/link";
import { Trash2 } from "lucide-react";

interface Course {
    id: string;
    title: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    teacher: {
        id: string;
        name: string | null;
        email: string;
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
}

interface CourseManagementProps {
    initialCourses: Course[];
    teachers: Teacher[];
    totalCount: number;
}

export function CourseManagement({ initialCourses, teachers, totalCount }: CourseManagementProps) {
    const [courses, setCourses] = useState<Course[]>(initialCourses);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [newTeacherId, setNewTeacherId] = useState<string>("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isPending, startTransition] = useTransition();

    const canDelete = deleteConfirmation === "ELIMINAR";

    const now = new Date();
    const filteredCourses = courses.filter(course => {
        const matchesSearch =
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.teacher.name?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === "active") {
            matchesStatus = !course.endDate || new Date(course.endDate) >= now;
        } else if (statusFilter === "archived") {
            matchesStatus = course.endDate ? new Date(course.endDate) < now : false;
        }

        return matchesSearch && matchesStatus;
    });

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
                }

                toast.success("Profesor reasignado", {
                    description: `El curso ha sido reasignado a ${newTeacher?.name || newTeacher?.email}`
                });

                setReassignDialogOpen(false);
                setSelectedCourse(null);
                setNewTeacherId("");
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo reasignar el profesor"
                });
            }
        });
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        startTransition(async () => {
            try {
                await deleteCourseAction(selectedCourse.id);

                setCourses(prev => prev.filter(c => c.id !== selectedCourse.id));

                toast.success("Curso eliminado", {
                    description: `El curso "${selectedCourse.title}" ha sido eliminado exitosamente`
                });

                setDeleteDialogOpen(false);
                setSelectedCourse(null);
                setDeleteConfirmation("");
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo eliminar el curso"
                });
            }
        });
    };

    const getCourseStatus = (course: Course) => {
        if (!course.endDate) return { label: "Activo", variant: "default" as const };
        const endDate = new Date(course.endDate);
        if (endDate >= now) return { label: "Activo", variant: "default" as const };
        return { label: "Archivado", variant: "secondary" as const };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Cursos</h2>
                    <p className="text-muted-foreground">
                        Administra todos los cursos del sistema
                    </p>
                </div>
                <Badge variant="outline" className="text-sm">
                    <BookOpen className="mr-2 h-3 w-3" />
                    {totalCount} cursos totales
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {courses.filter(c => !c.endDate || new Date(c.endDate) >= now).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cursos Archivados</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {courses.filter(c => c.endDate && new Date(c.endDate) < now).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {courses.reduce((sum, c) => sum + c._count.enrollments, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>Busca y filtra cursos</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título, descripción o profesor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="archived">Archivados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Courses Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Cursos ({filteredCourses.length})</CardTitle>
                    <CardDescription>
                        Lista de todos los cursos del sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Curso</TableHead>
                                    <TableHead>Profesor</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Estudiantes</TableHead>
                                    <TableHead>Actividades</TableHead>
                                    <TableHead>Fechas</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCourses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No se encontraron cursos
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCourses.map((course) => {
                                        const status = getCourseStatus(course);
                                        return (
                                            <TableRow key={course.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{course.title}</div>
                                                        {course.description && (
                                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                                                {course.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-[200px]">
                                                        <div className="font-medium text-sm truncate">
                                                            {course.teacher.name || "Sin nombre"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {course.teacher.email}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={status.variant}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{course._count.enrollments}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{course._count.activities}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {course.startDate && (
                                                        <div>Inicio: {format(new Date(course.startDate), "dd/MM/yyyy")}</div>
                                                    )}
                                                    {course.endDate && (
                                                        <div>Fin: {format(new Date(course.endDate), "dd/MM/yyyy")}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedCourse(course);
                                                            setNewTeacherId(course.teacher.id);
                                                            setReassignDialogOpen(true);
                                                        }}
                                                    >
                                                        Reasignar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            setSelectedCourse(course);
                                                            setDeleteConfirmation("");
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Reassign Teacher Dialog */}
            <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reasignar Profesor</DialogTitle>
                        <DialogDescription>
                            Selecciona un nuevo profesor para el curso "{selectedCourse?.title}"
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Profesor Actual</label>
                            <div className="p-3 bg-muted rounded-md">
                                <div className="font-medium">{selectedCourse?.teacher.name || "Sin nombre"}</div>
                                <div className="text-sm text-muted-foreground">{selectedCourse?.teacher.email}</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nuevo Profesor</label>
                            <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un profesor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.name || teacher.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReassignDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleReassignTeacher}
                            disabled={isPending || !newTeacherId || newTeacherId === selectedCourse?.teacher.id}
                        >
                            {isPending ? "Reasignando..." : "Reasignar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Course Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar Curso</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el curso
                            <span className="font-bold"> {selectedCourse?.title} </span>
                            y todos sus datos asociados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">
                            Para confirmar, escribe <span className="font-mono font-bold select-all">ELIMINAR</span> abajo:
                        </label>
                        <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="Escribe ELIMINAR para confirmar"
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCourse}
                            disabled={!canDelete || isPending}
                        >
                            {isPending ? "Eliminando..." : "Eliminar Curso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
