"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { enrollStudentAction } from "@/features/student/actions/enrollmentActions";
import { BookOpen, Lock, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export function CourseCatalog({ courses, pendingEnrollments = [] }: { courses: any[], pendingEnrollments?: string[] }) {
    if (courses.length === 0) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-muted/30 w-full"
            >
                <div className="bg-primary/5 p-6 rounded-full mb-6">
                    <BookOpen className="h-12 w-12 text-primary/40" />
                </div>
                <h3 className="text-2xl font-bold text-foreground/80 mb-2">Catálogo Vacío</h3>
                <p className="text-muted-foreground text-center max-w-md px-6">
                    No hay nuevos cursos disponibles para inscribirse en este momento. ¡Vuelve pronto!
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-border/50 overflow-x-auto shadow-sm"
        >
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Curso</TableHead>
                        <TableHead className="font-bold uppercase tracking-wider text-xs hidden sm:table-cell">Profesor</TableHead>
                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Inicio</TableHead>
                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Fin</TableHead>
                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden lg:table-cell">Cierre Inscripción</TableHead>
                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {courses.map((course, idx) => {
                        const isPending = pendingEnrollments.includes(course.id);
                        const isRegistrationClosed = !course.registrationOpen || (course.registrationDeadline && new Date() > new Date(course.registrationDeadline));

                        return (
                            <TableRow
                                key={course.id}
                                className="group hover:bg-muted/20 transition-colors border-border/30"
                            >
                                <TableCell className="pl-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                                            {course.title}
                                        </span>
                                        <Badge variant="outline" className="text-[9px] w-fit px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full mt-0.5">
                                            Libre Inscripción
                                        </Badge>
                                    </div>
                                </TableCell>

                                <TableCell className="hidden sm:table-cell">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shadow-inner shrink-0">
                                            {formatName(course.teacher.name, course.teacher.profile).charAt(0)}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                                            {formatName(course.teacher.name, course.teacher.profile)}
                                        </span>
                                    </div>
                                </TableCell>

                                <TableCell className="text-center hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {course.startDate ? new Date(course.startDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : "---"}
                                    </span>
                                </TableCell>

                                <TableCell className="text-center hidden md:table-cell">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {course.endDate ? new Date(course.endDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : "---"}
                                    </span>
                                </TableCell>

                                <TableCell className="text-center hidden lg:table-cell">
                                    {course.registrationDeadline ? (
                                        <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-full bg-orange-500/5 border border-orange-500/10 text-[10px] font-bold text-orange-600 dark:text-orange-400 w-fit mx-auto">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(course.registrationDeadline).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Sin límite</span>
                                    )}
                                </TableCell>

                                <TableCell className="text-center">
                                    {isRegistrationClosed ? (
                                        <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider gap-1">
                                            <Lock className="h-3 w-3" />
                                            {course.registrationOpen ? "Vencido" : "Cerrado"}
                                        </Badge>
                                    ) : (
                                        <form action={enrollStudentAction.bind(null, course.id)}>
                                            <Button
                                                className={`h-8 px-3 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-[0.98] ${
                                                    isPending ? "bg-muted text-muted-foreground" : ""
                                                }`}
                                                disabled={isPending}
                                                variant={isPending ? "secondary" : "default"}
                                                size="sm"
                                            >
                                                {isPending ? "Pendiente" : "Inscribirse"}
                                            </Button>
                                        </form>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </motion.div>
    );
}
