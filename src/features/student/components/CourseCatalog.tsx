"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { enrollStudentAction } from "@/features/student/actions/enrollmentActions";
import { BookOpen, User, Lock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/utils";
import { motion, useMotionValue, useTransform } from "framer-motion";
import React from "react";

function SpotlightCard({ children, className }: { children: React.ReactNode, className?: string }) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div
            onMouseMove={handleMouseMove}
            className={`group relative rounded-[1.5rem] bg-muted/5 p-px transition-all duration-300 hover:bg-muted/10 ${className}`}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[1.5rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: useTransform(
                        [mouseX, mouseY],
                        ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(59, 130, 246, 0.1), transparent 80%)`
                    ),
                }}
            />
            {children}
        </div>
    );
}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12 w-full max-w-7xl mx-auto">
            {courses.map((course, idx) => {
                const isPending = pendingEnrollments.includes(course.id);
                const isRegistrationClosed = !course.registrationOpen || (course.registrationDeadline && new Date() > new Date(course.registrationDeadline));

                return (
                    <motion.div 
                        key={course.id} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        className="h-full"
                    >
                        <SpotlightCard className="h-full">
                            <Card className="h-full flex flex-col relative bg-background/60 backdrop-blur-xl border-border/50 rounded-[1.5rem] overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl text-center border-none">
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                                
                                <CardHeader className="pb-1 pt-5 px-5">
                                <div className="flex flex-col items-center gap-1.5">
                                    <Badge variant="outline" className="text-[8px] px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full">
                                        Libre Inscripción
                                    </Badge>
                                    <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors w-full uppercase tracking-tight line-clamp-3 min-h-[3rem] flex items-center justify-center">
                                        {course.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="flex flex-col flex-grow space-y-4 py-3 px-5">
                                <div className="flex flex-col items-center gap-2 py-2 px-3 rounded-xl bg-muted/20 border border-border/10">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shadow-inner">
                                        {formatName(course.teacher.name, course.teacher.profile).charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter leading-none">Profesor Titular</span>
                                        <span className="text-[10px] font-bold truncate leading-tight mt-0.5">{formatName(course.teacher.name, course.teacher.profile)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/10 border border-border/10">
                                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Inicio</span>
                                        <span className="text-[9px] font-bold mt-1">
                                            {course.startDate ? new Date(course.startDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : "---"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/10 border border-border/10">
                                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-tighter">Fin</span>
                                        <span className="text-[9px] font-bold mt-1">
                                            {course.endDate ? new Date(course.endDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }) : "---"}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {course.registrationDeadline && (
                                        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-orange-500/5 border border-orange-500/10 text-[9px] font-bold text-orange-600 dark:text-orange-400 mx-auto w-fit">
                                            <Calendar className="h-2.5 w-2.5" />
                                            Cierre: {new Date(course.registrationDeadline).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                        </div>
                                    )}

                                    {isRegistrationClosed && (
                                        <Badge variant="destructive" className="w-fit mx-auto justify-center py-1 px-3 font-bold text-[9px] uppercase tracking-wider rounded-full">
                                            <Lock className="h-2.5 w-2.5 mr-1" />
                                            {course.registrationOpen ? "Vencido" : "Cerrado"}
                                        </Badge>
                                    )}
                                </div>

                                <form action={enrollStudentAction.bind(null, course.id)} className="mt-auto">
                                    <Button
                                        className={`w-full font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-[0.98] h-9 rounded-xl border border-primary/20 ${
                                            isPending ? "bg-muted text-muted-foreground" : "shadow-primary/10"
                                        }`}
                                        disabled={isRegistrationClosed || isPending}
                                        variant={isPending ? "secondary" : "default"}
                                    >
                                        {isPending ? "Pendiente" : (
                                            !isRegistrationClosed ? "Inscribirse Ahora" : "No Disponible"
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </SpotlightCard>
                </motion.div>
                );
            })}
        </div>
    );
}
