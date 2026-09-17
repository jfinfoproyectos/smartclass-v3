"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Dices, 
    Settings2, 
    Wrench, 
    CheckCircle2, 
    ArrowRight,
    Sparkles,
    GraduationCap,
    BookOpen,
    Bot,
    Github,
    Trash2
} from "lucide-react";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface TeacherToolsHubProps {
    courses: CourseWithStudents[];
}

export function TeacherToolsHub({ courses }: TeacherToolsHubProps) {
    const router = useRouter();

    const activeCoursesCount = courses.filter(c => c.isActive).length;

    const handleOpenRoulette = () => {
        router.push(`/dashboard/teacher/tools/roulette`);
    };

    const handleOpenGroups = () => {
        router.push(`/dashboard/teacher/tools/groups`);
    };

    const handleOpenGitReport = () => {
        router.push(`/dashboard/teacher/tools/git-report`);
    };

    const handleOpenGitDocs = () => {
        router.push(`/dashboard/teacher/tools/git-docs`);
    };

    const handleOpenGitChat = () => {
        router.push(`/dashboard/teacher/tools/git-chat`);
    };

    const handleOpenGitCleaner = () => {
        router.push(`/dashboard/teacher/tools/git-cleaner`);
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-3 p-0.5 sm:p-1 min-h-0">
            {/* Header Banner AI Canvas */}
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-xl">
                <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Herramientas Docentes</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Herramientas Interactivas
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Selecciona una herramienta interactiva para dinamizar tu clase en vivo, auditar entregas técnicas, chatear con repositorios vía MCP o documentar código con IA.
                        </p>
                    </div>

                    <Badge variant="outline" className="text-xs py-1.5 px-3 rounded-xl border-border bg-muted/50 text-foreground font-semibold shrink-0">
                        <GraduationCap className="mr-2 h-3.5 w-3.5 text-primary" />
                        {activeCoursesCount} {activeCoursesCount === 1 ? "ficha activa" : "fichas activas"} disponibles
                    </Badge>
                </div>
            </div>

            {/* Tarjetas de Selección adaptadas al ancho */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
                {/* Tarjeta 1: Ruleta Aleatoria */}
                <div 
                    onClick={handleOpenRoulette}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
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
                                <span>Giro interactivo y efectos sonoros en tiempo real</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Historial de ganadores con exportación a Excel</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Selección dinámica de cualquier ficha o grupo activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 mt-2">
                        <Button 
                            type="button" 
                            className="w-full font-bold text-xs gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs cursor-pointer"
                        >
                            <Dices className="h-4 w-4" />
                            Abrir Ruleta
                        </Button>
                    </div>
                </div>

                {/* Tarjeta 2: Generador de Grupos */}
                <div 
                    onClick={handleOpenGroups}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
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
                                <span>Reorganización manual fluida por arrastre (Drag & Drop)</span>
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
                            className="w-full font-bold text-xs gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs cursor-pointer"
                        >
                            <Settings2 className="h-4 w-4" />
                            Abrir Generador de Grupos
                        </Button>
                    </div>
                </div>

                {/* Tarjeta 3: Reportes GitHub con IA */}
                <div 
                    onClick={handleOpenGitReport}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-primary/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
                >
                    <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 group-hover:scale-105 transition-transform">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 text-[10px] font-bold">
                                Auditoría Git
                            </Badge>
                        </div>

                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                Reportes GitHub con IA
                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Audita repositorios con filtro multi-rama, rangos temporales y síntesis en PDF ejecutivo corporativo.
                            </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Soporte de ramas individuales o todas las ramas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Síntesis de cambios y lenguaje claro con modelo LLM</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Exportación a PDF ejecutivo estilo SmartClass</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 mt-2">
                        <Button 
                            type="button" 
                            className="w-full font-bold text-xs gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            Abrir Reportes GitHub
                        </Button>
                    </div>
                </div>

                {/* Tarjeta 4: Generador de README & Docs con IA */}
                <div 
                    onClick={handleOpenGitDocs}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-blue-500/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
                >
                    <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">
                                Docs & Mermaid IA
                            </Badge>
                        </div>

                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                Generador de README & Docs
                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Genera README profesional con arquitectura Mermaid, licencias oficiales, .gitignore, .env.example y descarga en ZIP.
                            </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>README con diagramas de flujo Mermaid interactivos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Suite de gobernanza: LICENSE, .gitignore y .env</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Descarga individual o empaquetada en .ZIP</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 mt-2">
                        <Button 
                            type="button" 
                            className="w-full font-bold text-xs gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs cursor-pointer"
                        >
                            <BookOpen className="h-4 w-4" />
                            Abrir Generador de Docs
                        </Button>
                    </div>
                </div>

                {/* Tarjeta 5: Chat con Repositorio (GitHub MCP) */}
                <div 
                    onClick={handleOpenGitChat}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-indigo-500/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
                >
                    <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                                <Bot className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-bold">
                                Protocolo MCP
                            </Badge>
                        </div>

                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                Chat Repositorio MCP
                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Conecta cualquier repositorio y chatea en tiempo real usando herramientas MCP para inspeccionar código, commits y estructura.
                            </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Herramientas MCP en vivo (archivos, commits, código)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Preguntas categorizadas (seguridad, arquitectura, commits)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Historial multisesión local y exportación a Markdown</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 mt-2">
                        <Button 
                            type="button" 
                            className="w-full font-bold text-xs gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs cursor-pointer"
                        >
                            <Bot className="h-4 w-4" />
                            Abrir Chat MCP
                        </Button>
                    </div>
                </div>

                {/* Tarjeta 6: Limpiador de Repositorios GitHub */}
                <div 
                    onClick={handleOpenGitCleaner}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 hover:border-red-500/50 bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full"
                >
                    <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 group-hover:scale-105 transition-transform">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-bold">
                                Gestión & Limpieza
                            </Badge>
                        </div>

                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                                Limpiador de Repositorios
                                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-red-500" />
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                Elimina masivamente repositorios obsoletos, forks y proyectos de prueba con selección por checkboxes y confirmación segura.
                            </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Filtros rápidos (solo forks, inactivos, pequeños)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Generación asistida de token delete_repo en 1 clic</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span>Protocolo estricto de seguridad y respaldo previo</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 mt-2">
                        <Button 
                            type="button" 
                            className="w-full font-bold text-xs gap-2 group-hover:bg-red-600 group-hover:text-white transition-all shadow-xs cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" />
                            Abrir Limpiador
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

