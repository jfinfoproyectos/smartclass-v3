"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Roulette } from "@/features/teacher/components/Roulette";
import { GroupGenerator } from "@/features/teacher/components/GroupGenerator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Dices, 
    Settings2, 
    Users, 
    Wrench, 
    GraduationCap, 
    CheckCircle2, 
    AlertCircle,
    Layers,
    ArrowLeft,
    ArrowRight,
    Sparkles,
    LayoutGrid
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CourseWithStudents {
    id: string;
    title: string;
    description: string | null;
    isActive: boolean;
    studentsCount: number;
    students: {
        user: {
            id: string;
            name: string;
            email: string;
            image: string | null;
            profile?: {
                identificacion?: string | null;
                nombres?: string | null;
                apellido?: string | null;
                telefono?: string | null;
            } | null;
        };
    }[];
}

interface TeacherToolsViewProps {
    courses: CourseWithStudents[];
}

export function TeacherToolsView({ courses }: TeacherToolsViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const paramTool = searchParams.get("tool") || searchParams.get("tab");
    const initialTool = paramTool === "groups" ? "groups" : paramTool === "roulette" ? "roulette" : null;
    const initialCourseId = searchParams.get("courseId");

    const [activeTool, setActiveTool] = useState<"roulette" | "groups" | null>(initialTool);
    const [filterOnlyActive, setFilterOnlyActive] = useState<boolean>(true);

    // Sincronizar herramienta y ficha si cambian en la URL
    useEffect(() => {
        const tool = searchParams.get("tool") || searchParams.get("tab");
        if (tool === "groups" || tool === "roulette") {
            setActiveTool(tool);
        } else if (tool === "hub" || tool === "all") {
            setActiveTool(null);
        }
        const cId = searchParams.get("courseId");
        if (cId && courses.some(c => c.id === cId)) {
            setSelectedCourseId(cId);
        }
    }, [searchParams, courses]);

    // Filtrar cursos activos o todos
    const activeCourses = useMemo(() => {
        return courses.filter(c => c.isActive);
    }, [courses]);

    const displayedCourses = useMemo(() => {
        if (filterOnlyActive && activeCourses.length > 0) {
            return activeCourses;
        }
        return courses;
    }, [courses, activeCourses, filterOnlyActive]);

    // Estado del curso seleccionado
    const defaultCourseId = useMemo(() => {
        if (initialCourseId && courses.some(c => c.id === initialCourseId)) {
            return initialCourseId;
        }
        if (activeCourses.length > 0) {
            return activeCourses[0].id;
        }
        if (courses.length > 0) {
            return courses[0].id;
        }
        return "all_active";
    }, [courses, activeCourses, initialCourseId]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId);

    // Obtener los estudiantes correspondientes a la selección
    const { currentStudents, currentCourseTitle } = useMemo(() => {
        if (selectedCourseId === "all_active") {
            const studentMap = new Map<string, CourseWithStudents["students"][0]>();
            activeCourses.forEach(c => {
                c.students.forEach(s => {
                    if (s.user?.id && !studentMap.has(s.user.id)) {
                        studentMap.set(s.user.id, s);
                    }
                });
            });
            return {
                currentStudents: Array.from(studentMap.values()),
                currentCourseTitle: "Todas las Fichas Activas",
            };
        }

        const found = courses.find(c => c.id === selectedCourseId);
        if (found) {
            return {
                currentStudents: found.students,
                currentCourseTitle: found.title,
            };
        }

        return {
            currentStudents: [],
            currentCourseTitle: "Ninguna ficha seleccionada",
        };
    }, [selectedCourseId, courses, activeCourses]);

    // Selector reutilizable de Ficha / Grupo
    const FichaSelector = (
        <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-xl border border-border/70">
            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline">Ficha / Grupo:</span>

            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-[180px] sm:w-[240px] bg-background text-foreground border-border h-7 text-xs font-semibold rounded-lg shadow-2xs">
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

            <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-background text-foreground/90 font-bold" title={`${currentStudents.length} estudiantes matriculados en esta ficha`}>
                <Users className="h-2.5 w-2.5 mr-1 text-primary" />
                {currentStudents.length}
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

    return (
        <div className="w-full flex-1 flex flex-col space-y-2 p-0.5 sm:p-1 min-h-0">
            {activeTool === null ? (
                /* ============================================================ */
                /* VISTA 1: HUB PRINCIPAL CON TARJETAS PARA ABRIR CADA HERRAMIENTA */
                /* ============================================================ */
                <div className="space-y-4 max-w-5xl mx-auto w-full pt-1 sm:pt-2">
                    {/* Barra Superior del Hub */}
                    <div className="px-4 py-3 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
                                <Wrench className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                                        Herramientas Docentes
                                    </h2>
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 py-0 px-1.5 h-4">
                                        Dinámicas
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Selecciona una herramienta para tu clase en vivo con la ficha activa.
                                </p>
                            </div>
                        </div>

                        {/* Selector de Ficha en la cabecera del Hub */}
                        <div className="self-start sm:self-auto">
                            {FichaSelector}
                        </div>
                    </div>

                    {/* Tarjetas de las Dos Herramientas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tarjeta 1: Ruleta Aleatoria */}
                        <div 
                            onClick={() => setActiveTool("roulette")}
                            className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                        >
                            <div className="space-y-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                                        <Dices className="h-6 w-6" />
                                    </div>
                                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold">
                                        Sorteo en Vivo
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        Ruleta Aleatoria
                                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Sortea turnos de participación de forma equitativa y divertida con efectos de giro, sonido y animación de confeti.
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Giro interactivo y animación sonora</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Historial de seleccionados y exportación</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Precargada con {currentStudents.length} aprendices de {currentCourseTitle}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-5 mt-2">
                                <Button 
                                    type="button" 
                                    className="w-full font-bold text-xs gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs"
                                >
                                    <Dices className="h-4 w-4" />
                                    Abrir Ruleta
                                </Button>
                            </div>
                        </div>

                        {/* Tarjeta 2: Generador de Grupos */}
                        <div 
                            onClick={() => setActiveTool("groups")}
                            className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                        >
                            <div className="space-y-3.5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                                        <Settings2 className="h-6 w-6" />
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">
                                        Trabajo en Equipo
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        Generador de Grupos
                                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Organiza equipos de trabajo automáticamente o reorganiza aprendices manualmente arrastrándolos entre grupos (Drag & Drop).
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Generación aleatoria balanceada en N equipos</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Reorganización manual fluida (Drag & Drop)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span>Exportación directa a Excel y guardado JSON</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-5 mt-2">
                                <Button 
                                    type="button" 
                                    className="w-full font-bold text-xs gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs"
                                >
                                    <Settings2 className="h-4 w-4" />
                                    Abrir Generador de Grupos
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ============================================================ */
                /* VISTA 2: HERRAMIENTA ABIERTA (Ruleta o Grupos)                */
                /* ============================================================ */
                <>
                    {/* Barra Superior Compacta de la Herramienta Activa */}
                    <div className="px-4 py-2.5 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex flex-wrap items-center justify-between gap-3">
                        {/* Botón Volver al Hub + Nombre de la Herramienta */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveTool(null)}
                                className="h-7 text-xs font-semibold gap-1.5 px-2 rounded-lg border-border text-muted-foreground hover:text-foreground"
                                title="Volver a la selección de herramientas"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Herramientas</span>
                            </Button>

                            <span className="text-muted-foreground/40 font-light">/</span>

                            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground">
                                {activeTool === "roulette" ? (
                                    <>
                                        <Dices className="h-4 w-4 text-purple-500" />
                                        <span>Ruleta Aleatoria</span>
                                    </>
                                ) : (
                                    <>
                                        <Settings2 className="h-4 w-4 text-blue-500" />
                                        <span>Generador de Grupos</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Controles: Selector de Ficha y Alternador de Herramienta */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Selector de Ficha / Grupo */}
                            {FichaSelector}

                            {/* Switcher Rápido entre Ruleta y Grupos */}
                            <div className="flex items-center bg-muted/60 dark:bg-muted/40 p-0.5 rounded-xl border border-border/70 gap-0.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTool("roulette")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        activeTool === "roulette"
                                            ? "bg-card text-foreground shadow-xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                    title="Cambiar a la Ruleta"
                                >
                                    <Dices className="h-3.5 w-3.5" />
                                    <span>Ruleta</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool("groups")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        activeTool === "groups"
                                            ? "bg-card text-foreground shadow-xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                    title="Cambiar al Generador de Grupos"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    <span>Grupos</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contenido de la Herramienta Seleccionada */}
                    <div className="w-full flex-1 min-h-0 flex flex-col">
                        {currentStudents.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/60 space-y-2 my-auto">
                                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                                <h3 className="font-bold text-sm text-foreground">No hay estudiantes en esta ficha</h3>
                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                    La ficha seleccionada no cuenta con estudiantes inscritos actualmente. Selecciona otra ficha activa desde el selector superior para comenzar a usar la herramienta.
                                </p>
                            </div>
                        ) : (
                            <>
                                {activeTool === "roulette" && (
                                    <div className="w-full flex-1 min-h-0 flex flex-col animate-in fade-in duration-200">
                                        <Roulette 
                                            key={`roulette-${selectedCourseId}-${currentStudents.length}`} 
                                            students={currentStudents as any} 
                                            courseId={selectedCourseId} 
                                        />
                                    </div>
                                )}

                                {activeTool === "groups" && (
                                    <div className="w-full flex-1 min-h-0 flex flex-col animate-in fade-in duration-200">
                                        <GroupGenerator 
                                            key={`groups-${selectedCourseId}-${currentStudents.length}`} 
                                            students={currentStudents as any} 
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
