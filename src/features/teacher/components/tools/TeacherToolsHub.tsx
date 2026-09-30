"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Trash2,
    FileText,
    Search,
    Layers,
    SlidersHorizontal,
    X
} from "lucide-react";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import type { CourseWithStudents } from "@/features/teacher/components/TeacherToolsView";

interface TeacherToolsHubProps {
    courses: CourseWithStudents[];
}

type ToolCategory = "all" | "classroom" | "git-ai" | "docs";

interface ToolItem {
    id: string;
    title: string;
    description: string;
    badge: string;
    category: ToolCategory;
    icon: React.ElementType;
    colorClasses: {
        iconBg: string;
        iconText: string;
        borderHover: string;
        btnHover: string;
        badge: string;
    };
    bullets: string[];
    btnText: string;
    route: string;
}

export function TeacherToolsHub({ courses }: TeacherToolsHubProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<ToolCategory>("all");

    const activeCoursesCount = courses.filter(c => c.isActive).length;

    const tools: ToolItem[] = useMemo(() => [
        {
            id: "roulette",
            title: "Ruleta Aleatoria",
            description: "Sortea turnos de participación de forma equitativa y divertida con efectos de giro, sonido y animación de confeti.",
            badge: "Sorteo en Vivo",
            category: "classroom",
            icon: Dices,
            colorClasses: {
                iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                iconText: "text-purple-600 dark:text-purple-400",
                borderHover: "hover:border-purple-500/50",
                btnHover: "group-hover:bg-purple-600 group-hover:text-white",
                badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
            },
            bullets: [
                "Giro interactivo y efectos sonoros en tiempo real",
                "Historial de ganadores con exportación a Excel",
                "Selección dinámica de cualquier ficha o grupo activo"
            ],
            btnText: "Abrir Ruleta",
            route: "/dashboard/teacher/tools/roulette"
        },
        {
            id: "groups",
            title: "Generador de Grupos",
            description: "Organiza equipos de trabajo automáticamente o reorganiza aprendices manualmente arrastrándolos entre grupos (Drag & Drop).",
            badge: "Trabajo en Equipo",
            category: "classroom",
            icon: Settings2,
            colorClasses: {
                iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                iconText: "text-blue-600 dark:text-blue-400",
                borderHover: "hover:border-blue-500/50",
                btnHover: "group-hover:bg-blue-600 group-hover:text-white",
                badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            },
            bullets: [
                "Generación aleatoria balanceada en N equipos",
                "Reorganización manual fluida por arrastre (Drag & Drop)",
                "Exportación directa a Excel y guardado JSON"
            ],
            btnText: "Abrir Generador de Grupos",
            route: "/dashboard/teacher/tools/groups"
        },
        {
            id: "git-report",
            title: "Reportes GitHub con IA",
            description: "Audita repositorios con filtro multi-rama, rangos temporales y síntesis en PDF ejecutivo corporativo.",
            badge: "Auditoría Git",
            category: "git-ai",
            icon: Sparkles,
            colorClasses: {
                iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
                iconText: "text-teal-600 dark:text-teal-400",
                borderHover: "hover:border-teal-500/50",
                btnHover: "group-hover:bg-teal-600 group-hover:text-white",
                badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
            },
            bullets: [
                "Soporte de ramas individuales o todas las ramas",
                "Síntesis de cambios y lenguaje claro con modelo LLM",
                "Exportación a PDF ejecutivo estilo SmartClass"
            ],
            btnText: "Abrir Reportes GitHub",
            route: "/dashboard/teacher/tools/git-report"
        },
        {
            id: "git-docs",
            title: "Generador de README & Docs",
            description: "Genera README profesional con arquitectura Mermaid, licencias oficiales, .gitignore, .env.example y descarga en ZIP.",
            badge: "Docs & Mermaid IA",
            category: "docs",
            icon: BookOpen,
            colorClasses: {
                iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
                iconText: "text-cyan-600 dark:text-cyan-400",
                borderHover: "hover:border-cyan-500/50",
                btnHover: "group-hover:bg-cyan-600 group-hover:text-white",
                badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
            },
            bullets: [
                "README con diagramas de flujo Mermaid interactivos",
                "Suite de gobernanza: LICENSE, .gitignore y .env",
                "Descarga individual o empaquetada en .ZIP"
            ],
            btnText: "Abrir Generador de Docs",
            route: "/dashboard/teacher/tools/git-docs"
        },
        {
            id: "git-chat",
            title: "Chat Repositorio MCP",
            description: "Conecta cualquier repositorio y chatea en tiempo real usando herramientas MCP para inspeccionar código, commits y estructura.",
            badge: "Protocolo MCP",
            category: "git-ai",
            icon: Bot,
            colorClasses: {
                iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                iconText: "text-indigo-600 dark:text-indigo-400",
                borderHover: "hover:border-indigo-500/50",
                btnHover: "group-hover:bg-indigo-600 group-hover:text-white",
                badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
            },
            bullets: [
                "Herramientas MCP en vivo (archivos, commits, código)",
                "Preguntas categorizadas (seguridad, arquitectura, commits)",
                "Historial multisesión local y exportación a Markdown"
            ],
            btnText: "Abrir Chat MCP",
            route: "/dashboard/teacher/tools/git-chat"
        },
        {
            id: "git-cleaner",
            title: "Limpiador de Repositorios",
            description: "Elimina masivamente repositorios obsoletos, forks y proyectos de prueba con selección por checkboxes y confirmación segura.",
            badge: "Gestión & Limpieza",
            category: "git-ai",
            icon: Trash2,
            colorClasses: {
                iconBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                iconText: "text-red-600 dark:text-red-400",
                borderHover: "hover:border-red-500/50",
                btnHover: "group-hover:bg-red-600 group-hover:text-white",
                badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
            },
            bullets: [
                "Filtros rápidos (solo forks, inactivos, pequeños)",
                "Generación asistida de token delete_repo en 1 clic",
                "Protocolo estricto de seguridad y respaldo previo"
            ],
            btnText: "Abrir Limpiador",
            route: "/dashboard/teacher/tools/git-cleaner"
        },
        {
            id: "markdown-pdf",
            title: "Markdown a PDF Corporativo",
            description: "Convierte Markdown a PDFs ejecutivos de alta calidad con portadas oficiales, resaltado de sintaxis, KPIs y temas corporativos.",
            badge: "Studio @react-pdf",
            category: "docs",
            icon: FileText,
            colorClasses: {
                iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                iconText: "text-emerald-600 dark:text-emerald-400",
                borderHover: "hover:border-emerald-500/50",
                btnHover: "group-hover:bg-emerald-600 group-hover:text-white",
                badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            },
            bullets: [
                "Previsualización interactiva en tiempo real y descarga 1 clic",
                "Plantillas ejecutivas, pedagógicas, técnicas y de actas",
                "Gobernanza completa: firmas, sellos de estado y marcas de agua"
            ],
            btnText: "Abrir Conversor Markdown PDF",
            route: "/dashboard/teacher/tools/markdown-pdf"
        }
    ], []);

    // Filtrar herramientas por búsqueda y categoría
    const filteredTools = useMemo(() => {
        return tools.filter((tool) => {
            const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
            const matchesSearch = searchQuery.trim() === "" || 
                tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.badge.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [tools, selectedCategory, searchQuery]);

    return (
        <DashboardContainer className="min-h-0 pb-8">
            <div className="w-full flex-1 flex flex-col space-y-4">
            {/* Header Moderno & Minimalista Sin Contenedor Pesado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border/60">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                            Herramientas Docentes
                        </h1>
                        <Badge variant="outline" className="text-[11px] font-bold text-primary border-primary/20 bg-primary/5">
                            {tools.length} disponibles
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Utilidades interactivas para dinamizar clases en vivo, auditar repositorios y generar documentos oficiales.
                    </p>
                </div>

                {/* Buscador Rápido y Badge de Fichas */}
                <div className="flex items-center gap-2 sm:self-auto self-stretch">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar herramienta..."
                            className="h-8 pl-8 pr-8 text-xs bg-card border-border/80 rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <Badge variant="secondary" className="h-8 px-2.5 rounded-xl border border-border text-[11px] font-semibold shrink-0 gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        <span>{activeCoursesCount} fichas</span>
                    </Badge>
                </div>
            </div>

            {/* Categorías de Filtro Rápido */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { id: "all", label: "Todas las Herramientas", count: tools.length },
                    { id: "classroom", label: "Dinámica de Clase", count: tools.filter(t => t.category === "classroom").length },
                    { id: "git-ai", label: "IA & Repositorios Git", count: tools.filter(t => t.category === "git-ai").length },
                    { id: "docs", label: "Documentación & PDF", count: tools.filter(t => t.category === "docs").length },
                ].map((tab) => {
                    const isSelected = selectedCategory === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id as ToolCategory)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/70"
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Grid de Tarjetas de Herramientas */}
            {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
                    {filteredTools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <div
                                key={tool.id}
                                onClick={() => router.push(tool.route)}
                                className={`group relative overflow-hidden rounded-2xl border border-border/80 ${tool.colorClasses.borderHover} bg-card text-card-foreground p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between w-full`}
                            >
                                <div className="space-y-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`p-3 rounded-2xl border ${tool.colorClasses.iconBg} group-hover:scale-105 transition-transform`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <Badge variant="secondary" className={`text-[10px] font-bold ${tool.colorClasses.badge}`}>
                                            {tool.badge}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                            {tool.title}
                                            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            {tool.description}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                                        {tool.bullets.map((bullet, bIdx) => (
                                            <div key={bIdx} className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <span>{bullet}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-5 mt-2">
                                    <Button 
                                        type="button" 
                                        className={`w-full font-bold text-xs gap-2 transition-all shadow-xs cursor-pointer ${tool.colorClasses.btnHover}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tool.btnText}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-dashed border-border/80 space-y-3">
                    <div className="p-3 rounded-full bg-muted text-muted-foreground">
                        <Search className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">No se encontraron herramientas</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            No hay resultados para "{searchQuery}" en la categoría seleccionada.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                        className="text-xs"
                    >
                        Restablecer filtros
                    </Button>
                </div>
            )}
            </div>
        </DashboardContainer>
    );
}
