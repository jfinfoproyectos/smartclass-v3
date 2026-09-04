"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { GroupGenerator } from "@/features/teacher/components/GroupGenerator";
import { Settings2, AlertCircle } from "lucide-react";
import { FichaSelector } from "./FichaSelector";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface GroupsToolViewProps {
    courses: CourseWithStudents[];
}

export function GroupsToolView({ courses }: GroupsToolViewProps) {
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get("courseId");

    const [filterOnlyActive, setFilterOnlyActive] = useState<boolean>(true);

    const activeCourses = useMemo(() => courses.filter(c => c.isActive), [courses]);

    const defaultCourseId = useMemo(() => {
        if (initialCourseId && courses.some(c => c.id === initialCourseId)) {
            return initialCourseId;
        }
        if (activeCourses.length > 0) return activeCourses[0].id;
        if (courses.length > 0) return courses[0].id;
        return "all_active";
    }, [courses, activeCourses, initialCourseId]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId);

    useEffect(() => {
        const cId = searchParams.get("courseId");
        if (cId && courses.some(c => c.id === cId)) {
            setSelectedCourseId(cId);
        }
    }, [searchParams, courses]);

    const currentStudents = useMemo(() => {
        if (selectedCourseId === "all_active") {
            const studentMap = new Map<string, CourseWithStudents["students"][0]>();
            activeCourses.forEach(c => {
                c.students.forEach(s => {
                    if (s.user?.id && !studentMap.has(s.user.id)) {
                        studentMap.set(s.user.id, s);
                    }
                });
            });
            return Array.from(studentMap.values());
        }

        const found = courses.find(c => c.id === selectedCourseId);
        return found ? found.students : [];
    }, [selectedCourseId, courses, activeCourses]);

    return (
        <div className="w-full flex-1 flex flex-col space-y-1.5 p-0.5 sm:p-1 min-h-0">
            {/* Barra Superior del Generador de Grupos: Solo Título y Selector de Ficha */}
            <div className="px-4 py-2 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        <Settings2 className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground tracking-tight">Generador de Grupos</h2>
                        <p className="text-[11px] text-muted-foreground hidden sm:block">
                            Conformación de equipos colaborativos
                        </p>
                    </div>
                </div>

                {/* Selector de Ficha Activa */}
                <FichaSelector
                    courses={courses}
                    selectedCourseId={selectedCourseId}
                    onSelectCourseId={setSelectedCourseId}
                    filterOnlyActive={filterOnlyActive}
                    setFilterOnlyActive={setFilterOnlyActive}
                    currentStudentsCount={currentStudents.length}
                />
            </div>

            {/* Contenido del Generador de Grupos adaptado al contenedor */}
            <div className="w-full flex-1 min-h-0 flex flex-col">
                {currentStudents.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/60 space-y-2 my-auto">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                        <h3 className="font-bold text-sm text-foreground">No hay estudiantes en esta ficha</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            La ficha seleccionada no cuenta con estudiantes inscritos actualmente. Selecciona otra ficha activa desde el selector superior para comenzar a generar equipos.
                        </p>
                    </div>
                ) : (
                    <div className="w-full flex-1 min-h-0 flex flex-col animate-in fade-in duration-200">
                        <GroupGenerator 
                            key={`groups-${selectedCourseId}-${currentStudents.length}`} 
                            students={currentStudents as any} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
