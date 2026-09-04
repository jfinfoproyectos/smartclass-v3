"use client";

import { useMemo } from "react";
import { GraduationCap, Users, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface FichaSelectorProps {
    courses: CourseWithStudents[];
    selectedCourseId: string;
    onSelectCourseId: (id: string) => void;
    filterOnlyActive: boolean;
    setFilterOnlyActive: (val: boolean) => void;
    currentStudentsCount: number;
}

export function FichaSelector({
    courses,
    selectedCourseId,
    onSelectCourseId,
    filterOnlyActive,
    setFilterOnlyActive,
    currentStudentsCount,
}: FichaSelectorProps) {
    const activeCourses = useMemo(() => courses.filter(c => c.isActive), [courses]);
    const displayedCourses = useMemo(() => {
        if (filterOnlyActive && activeCourses.length > 0) return activeCourses;
        return courses;
    }, [courses, activeCourses, filterOnlyActive]);

    return (
        <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-xl border border-border/70 shrink-0">
            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline">Ficha / Grupo:</span>

            <Select value={selectedCourseId} onValueChange={onSelectCourseId}>
                <SelectTrigger className="w-[190px] sm:w-[240px] bg-background text-foreground border-border h-7 text-xs font-semibold rounded-lg shadow-2xs">
                    <SelectValue placeholder="Seleccionar ficha..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                    {activeCourses.length > 1 && (
                        <SelectItem value="all_active" className="text-xs font-bold text-primary cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5" />
                                <span>Todas las Fichas Activas</span>
                            </div>
                        </SelectItem>
                    )}

                    <SelectGroup>
                        <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                            {filterOnlyActive ? "Fichas Activas" : "Todas las Fichas"}
                        </SelectLabel>
                        {displayedCourses.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className="font-medium truncate max-w-[170px]">{c.title}</span>
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                        {c.studentsCount} est.
                                    </Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>

            <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-background text-foreground/90 font-bold" title={`${currentStudentsCount} estudiantes matriculados en esta ficha`}>
                <Users className="h-2.5 w-2.5 mr-1 text-primary" />
                {currentStudentsCount}
            </Badge>

            {courses.some(c => !c.isActive) && (
                <button
                    type="button"
                    onClick={() => setFilterOnlyActive(!filterOnlyActive)}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-semibold px-1 underline cursor-pointer"
                    title={filterOnlyActive ? "Mostrar también cursos inactivos" : "Mostrar solo cursos activos"}
                >
                    {filterOnlyActive ? "Todos" : "Activos"}
                </button>
            )}
        </div>
    );
}
