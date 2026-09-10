"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createActivityAction, updateActivityAction, deleteActivityAction, generateChecklistCriteriaAction, verifyCriterionRelationAction, balanceCriteriaPercentagesAction, generateCodeFileTemplateAction } from "@/features/teacher/actions/activityActions";
import { scanRepositoryAction } from "@/features/github/actions/githubActions";
import { getMissingSubmissionsAction } from "@/features/teacher/actions/studentActions";
import { Plus, Calendar, FileText, MessageSquare, Pencil, Trash2, Eye, X, ChevronUp, ChevronDown, AlertCircle, Sparkles, Upload, Download, Loader2, Search, UserX, GripVertical, LayoutGrid, List, Save, Settings2, Code2, FolderGit2, CheckCircle2, Clock, SlidersHorizontal, Info, ListChecks, CheckSquare, RefreshCw, Bot, Cpu, HelpCircle, MessageSquareQuote, Shuffle, Scale, Crown, Users, Terminal, Video, Database, Mic, Headphones, FileCode, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { toast } from "sonner";
import { ActivityGroupsModal } from "./ActivityGroupsModal";
import { AIGenerateDialog } from "./AIGenerateDialog";
import Editor from "@monaco-editor/react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatName, cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { CodeChallengeActivityDetails } from "@/features/student/components/CodeChallengeActivityDetails";

const TEMPLATE_GITHUB = `# Evaluación Automática con IA (GitHub)

## Descripción de la Actividad
[Describe aquí brevemente qué debe realizar el estudiante]

## Requisitos de Código
1. [Requisito 1, ej: Crear una función 'sumar(a,b)']
2. [Requisito 2, ej: Manejar excepciones de división por cero]

## Rúbrica de Evaluación
* **Funcionalidad (50%)**: El código cumple con todos los requisitos lógicos solicitados.
* **Buenas Prácticas (30%)**: Código limpio, nombres de variables descriptivos y estructura clara.
* **Manejo de Errores (20%)**: Control adecuado de excepciones y casos límite.

## Formato de Entrega (Opcional - Ignorado por la IA)
- Repositorio GitHub con los archivos solicitados en la configuración.`;

const TEMPLATE_CODE_CHALLENGE = `# Taller de Programación y Código en Vivo

## Enunciado y Objetivos
[Describe aquí detalladamente el problema y los requerimientos que el estudiante debe resolver en los archivos asignados]

## Requerimientos Técnicos
1. **Lógica Principal**: Implementar las funciones y componentes solicitados en los archivos correspondientes.
2. **Validaciones**: Gestionar casos especiales, valores nulos o límites en los datos de entrada.
3. **Buenas Prácticas**: Seguir estándares de código limpio (Clean Code), separación de responsabilidades y tipado adecuado.

## Archivos a Resolver
- Revisa los archivos disponibles en el editor para comenzar tu solución.

## Criterios de Evaluación
* **Lógica y Corrección (40%)**: Cumplimiento cabal de los requerimientos y funcionalidad esperada.
* **Estructura y Calidad de Código (35%)**: Modularidad, buenas prácticas y legibilidad.
* **Control de Errores y Eficiencia (25%)**: Manejo de excepciones, casos límite y rendimiento.`;

const TEMPLATE_VIDEO_PITCH = `# Sustentación en Video / Pitch del Proyecto

## Objetivo
Realiza una grabación en video (máximo 5 minutos) explicando la solución implementada, la arquitectura técnica y una breve demostración funcional del sistema.

## Estructura Recomendada del Pitch
1. **Introducción y Problema (1 min)**: ¿Qué problema resuelve el software y quién es el usuario?
2. **Arquitectura y Stack (1.5 min)**: Tecnologías clave, bases de datos y decisiones de diseño.
3. **Demostración en Vivo (1.5 min)**: Recorrido por las principales características funcionando.
4. **Retos y Aprendizajes (1 min)**: Principales dificultades técnicas superadas y trabajo a futuro.

## Criterios de Evaluación
* **Dominio Técnico (40%)**: Comprensión profunda de la arquitectura y conceptos utilizados.
* **Estructura y Claridad (30%)**: Organización de la exposición, capacidad de síntesis y fluidez.
* **Demostración Práctica (30%)**: Evidencia tangible del funcionamiento del producto.`;

const TEMPLATE_AUDIO_DEFENSE = `# Sustentación en Audio / Podcast Técnico

## Objetivo
Graba un audio o podcast técnico (máximo 5 minutos) explicando con claridad la solución desarrollada, las decisiones técnicas tomadas y el análisis crítico de la implementación.

## Estructura Recomendada del Audio
1. **Introducción y Contexto (1 min)**: Presentación del estudiante, propósito del proyecto y problema a resolver.
2. **Arquitectura y Decisiones Técnicas (2 min)**: Justificación del stack tecnológico, componentes clave y patrones implementados.
3. **Análisis de Retos y Conclusiones (2 min)**: Principales dificultades encontradas, lecciones aprendidas y oportunidades de mejora.

## Criterios de Evaluación
* **Argumentación y Coherencia (40%)**: Capacidad para justificar técnicamente las decisiones con rigor.
* **Profundidad y Vocabulario Técnico (35%)**: Uso preciso de conceptos de ingeniería de software.
* **Estructura y Capacidad de Síntesis (25%)**: Organización lógica, respeto del tiempo y claridad expositiva.`;

const TEMPLATE_AI_INTERVIEW = `# Examen Oral / Entrevista Técnica con IA

## Objetivo de la Evaluación
Demostrar solvencia conceptual, criterio ingenieril y claridad de comunicación respondiendo preguntas en vivo formuladas por el asistente de IA en una simulación de entrevista profesional.

## Temas a Evaluar
- **Conceptos Fundamentales**: Arquitectura de software, patrones de diseño y flujo de datos.
- **Toma de Decisiones**: Justificación técnica de herramientas y resolución de problemas.
- **Calidad y Mantenibilidad**: Pruebas, seguridad y escalabilidad.

## Criterios de Evaluación
* **Dominio Técnico (40%)**: Precisión teórica y vocabulario técnico adecuado.
* **Resolución de Problemas (35%)**: Criterio lógico ante escenarios prácticos.
* **Comunicación y Claridad (25%)**: Estructura en las respuestas y capacidad de síntesis.`;

const TEMPLATE_DB_MODELING = `# Base de Datos Relacional y Programación SQL

## Enunciado y Requerimientos del Sistema
Diseñar e implementar el esquema relacional de base de datos para el sistema, aplicando principios de normalización (3FN), integridad referencial, scripts DDL de estructura y sentencias DML de inserción y manipulación de datos.

## Reglas del Negocio
1. Cada entidad debe poseer una clave primaria unívoca (PK).
2. Las relaciones N:M deben descomponerse mediante tablas intermedias asociativas con sus correspondientes FKs.
3. El modelo debe encontrarse normalizado hasta la Tercera Forma Normal (3FN), evitando redundancia de datos.
4. Se deben aplicar restricciones de integridad: \`NOT NULL\`, \`UNIQUE\`, \`CHECK\` y acciones \`ON DELETE\`.

## Entregables Solicitados en el Script SQL (.sql)
1. **Definición de Estructura (DDL)**:
   - Sentencias \`CREATE TABLE\` con tipos de datos idóneos, PKs y FKs.
2. **Datos de Prueba y Manipulación (DML)**:
   - Sentencias \`INSERT INTO\` con registros representativos y coherentes.
   - Sentencias \`UPDATE\` o \`DELETE\` si aplican para casos prácticos.
3. **Consultas de Verificación (DQL)**:
   - Consultas \`SELECT\` con \`JOIN\`, ordenamiento y funciones de agregación.
4. **Restricciones e Integridad**:
   - Restricciones \`CHECK\`, \`UNIQUE\`, \`NOT NULL\` y acciones de clave foránea.

## Criterios de Evaluación
* **Estructura e Integridad DDL (40%)**: Definición correcta de tablas, PKs, FKs y restricciones.
* **Manipulación de Datos DML (30%)**: Inserción coherente de datos de prueba y lógica de manipulación.
* **Normalización 3FN (20%)**: Eliminación de dependencias parciales y transitivas.
* **Consultas DQL (10%)**: Calidad y precisión de las consultas SQL.`;

const TEMPLATE_CODE_PROJECT = `# Proyecto de Código (Evaluación con Apoyo de IA)

## Descripción del Proyecto
[Describe el proyecto de desarrollo de software a realizar por el estudiante]

## Entregables Esperados
- [Estructura o componentes esperados en el repositorio]

## Criterios de Evaluación Manual
* **Diseño Arquitectónico (40%)**: Modularidad, patrones de diseño y organización del proyecto.
* **Lógica e Implementación (40%)**: Algoritmos correctos, eficiencia y funcionamiento general.
* **Documentación (20%)**: Archivo README descriptivo con instrucciones de instalación y uso.

## Formato de Entrega (Opcional - Ignorado por la IA)
- URL de GitHub del proyecto de desarrollo.`;

const TEMPLATE_PDF_REVIEW = `# Revisión de Documento PDF (Evaluación con IA)

## Descripción del Documento
[Describe el informe, ensayo, artículo o reporte escrito que el estudiante debe presentar]

## Estructura del Documento
1. Introducción y Objetivos
2. Desarrollo del Contenido
3. Conclusiones y Referencias

## Rúbrica de Calificación
* **Calidad del Contenido (50%)**: Profundidad, precisión técnica y cobertura de los temas solicitados.
* **Estructura y Coherencia (30%)**: Organización adecuada del documento y fluidez de ideas.
* **Normas de Redacción y Presentación (20%)**: Ortografía, redacción formal y citas bibliográficas apropiadas.

## Formato de Entrega (Opcional - Ignorado por la IA)
- Documento en formato PDF (subido a Google Drive, OneDrive o similar con enlace público).`;

const TEMPLATE_MANUAL = `# Entrega Libre (Evaluación Manual sin IA)

## Descripción de la Tarea / Actividad
[Describe detalladamente la tarea, taller, cuestionario o actividad libre a realizar]

## Instrucciones de Envío
* [Indica si deben subir un enlace o qué contenido debe tener el texto de la entrega]

## Criterios de Calificación
* **Criterio 1 (50%)**: [Descripción]
* **Criterio 2 (50%)**: [Descripción]`;

function SortablePathItem({ id, path, index, onRemove }: { id: string; path: string; index: number; onRemove: (index: number) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2 bg-background dark:bg-card border rounded-md shadow-2xs group hover:border-primary/50 transition-colors text-xs font-mono ${isDragging ? "ring-2 ring-primary border-transparent" : ""}`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0">
                <GripVertical className="h-3.5 w-3.5" />
            </div>
            <span className="flex-1 truncate font-medium text-foreground">{path}</span>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onRemove(index)}
            >
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

function FilePathInput({ defaultValue = "", name = "filePaths", placeholder = "" }: { defaultValue?: string; name?: string; placeholder?: string }) {
    const [paths, setPaths] = useState<string[]>(() => {
        if (!defaultValue) return [];
        return defaultValue.split(",").map(p => p.trim()).filter(Boolean);
    });
    const [inputVal, setInputVal] = useState("");
    const [scanUrl, setScanUrl] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [repoStructure, setRepoStructure] = useState<any[]>([]);

    useEffect(() => {
        if (defaultValue) {
            setPaths(defaultValue.split(",").map(p => p.trim()).filter(Boolean));
        } else {
            setPaths([]);
        }
    }, [defaultValue]);

    const addPath = (pathToAdd?: string) => {
        const val = (pathToAdd || inputVal).trim();
        if (!val) return;
        if (paths.includes(val)) {
            toast.error("El archivo ya está en la lista");
            return;
        }
        setPaths([...paths, val]);
        if (!pathToAdd) setInputVal("");
    };

    const removePath = (index: number) => {
        setPaths(paths.filter((_, i) => i !== index));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setPaths((items) => {
                const oldIndex = items.indexOf(active.id.toString());
                const newIndex = items.indexOf(over.id.toString());
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleScan = async () => {
        if (!scanUrl.trim()) {
            toast.error("Ingresa la URL del repositorio");
            return;
        }
        setIsScanning(true);
        try {
            const res = await scanRepositoryAction(scanUrl);
            if (res && Array.isArray(res.files)) {
                setRepoStructure(res.files);
                toast.success(`Archivos cargados (${res.files.length} elementos)`);
            } else {
                toast.error("No se pudo obtener la estructura del repositorio");
            }
        } catch (e: any) {
            toast.error(e.message || "Error al conectar con GitHub");
        } finally {
            setIsScanning(false);
        }
    };

    const renderTree = (items: any[]) => {
        return (
            <div className="space-y-1 pl-2 border-l border-border/40 text-xs font-mono">
                {items.map((item) => {
                    const isSelected = paths.includes(item.path);
                    return (
                        <div key={item.path} className="flex flex-col">
                            <div className="flex items-center justify-between py-1 px-2 hover:bg-accent/40 rounded transition-colors group">
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-muted-foreground">{item.type === 'dir' ? '📁' : '📄'}</span>
                                    <span className={item.type === 'dir' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                                </div>
                                {item.type === 'file' && (
                                    <Button
                                        type="button"
                                        variant={isSelected ? "secondary" : "outline"}
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                        disabled={isSelected}
                                        onClick={() => addPath(item.path)}
                                    >
                                        {isSelected ? "Añadido" : "+ Añadir"}
                                    </Button>
                                )}
                            </div>
                            {item.children && item.children.length > 0 && renderTree(item.children)}
                        </div>
                    );
                })}
            </div>
        );
    };

    const SUGGESTED_PATHS = ["src/index.ts", "src/App.tsx", "README.md", "src/main/java/Main.java"];

    return (
        <div className="space-y-3.5">
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder={placeholder || "ej: src/index.ts o src/models/User.java"}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addPath();
                                }
                            }}
                            className="font-mono text-xs h-9 pr-8"
                        />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => addPath()} className="shrink-0 text-xs h-9 px-3.5 font-semibold">
                        + Añadir
                    </Button>
                </div>

                {/* Chips de sugerencias rápidas */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" /> Rutas sugeridas:
                    </span>
                    {SUGGESTED_PATHS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => addPath(p)}
                            disabled={paths.includes(p)}
                            className="px-2 py-0.5 rounded-md border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 font-mono text-[10px] transition-colors disabled:opacity-35 disabled:pointer-events-none text-muted-foreground hover:text-foreground"
                        >
                            + {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 gap-1.5 font-medium"
                    onClick={() => setShowScanner(!showScanner)}
                >
                    <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                    {showScanner ? "Ocultar Escáner" : "Escanear desde GitHub"}
                </Button>
                <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                    {paths.length} {paths.length === 1 ? 'archivo' : 'archivos'}
                </Badge>
            </div>

            {showScanner && (
                <div className="p-3.5 border rounded-xl bg-muted/20 space-y-3">
                    <p className="text-xs text-muted-foreground">
                        Ingresa la URL pública de un repositorio GitHub para explorar y seleccionar archivos:
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={scanUrl}
                            onChange={(e) => setScanUrl(e.target.value)}
                            placeholder="https://github.com/usuario/mi-proyecto"
                            className="text-xs h-9"
                        />
                        <Button type="button" size="sm" onClick={handleScan} disabled={isScanning} className="shrink-0 text-xs h-9 px-3.5 font-semibold">
                            {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                            Escanear
                        </Button>
                    </div>

                    {repoStructure.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border rounded-xl p-2 bg-background space-y-1 font-mono text-xs scrollbar-thin">
                            {repoStructure.map((filePath: string) => {
                                const isSelected = paths.includes(filePath);
                                return (
                                    <div key={filePath} className="flex items-center justify-between py-1 px-2 hover:bg-accent/40 rounded transition-colors">
                                        <span className="truncate text-muted-foreground">{filePath}</span>
                                        <Button
                                            type="button"
                                            variant={isSelected ? "secondary" : "outline"}
                                            size="sm"
                                            className="h-6 text-[10px] px-2 shrink-0 ml-2"
                                            disabled={isSelected}
                                            onClick={() => addPath(filePath)}
                                        >
                                            {isSelected ? "Añadido" : "+ Añadir"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {paths.length > 0 ? (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                            Archivos a evaluar (Arrastra para priorizar):
                        </Label>
                    </div>
                    <div className="border rounded-xl p-2 bg-muted/10 max-h-52 overflow-y-auto scrollbar-thin">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={paths} strategy={verticalListSortingStrategy}>
                                <div className="flex flex-col gap-1.5 w-full">
                                    {paths.map((path, index) => (
                                        <SortablePathItem
                                            key={path}
                                            id={path}
                                            path={path}
                                            index={index}
                                            onRemove={removePath}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            ) : (
                <div className="p-4 border-2 border-dashed border-border/70 rounded-xl bg-muted/10 text-center space-y-1 text-xs text-muted-foreground">
                    <Code2 className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                    <p className="font-semibold text-foreground text-xs">Sin archivos configurados</p>
                    <p className="text-[11px] leading-relaxed max-w-sm mx-auto">
                        Escribe el path del archivo arriba o selecciona una ruta sugerida para que la IA sepa qué código evaluar.
                    </p>
                </div>
            )}

            <input type="hidden" name={name} value={paths.join(",")} />
        </div>
    );
}

// Tipos de Actividades soportadas con metadatos visuales
const ACTIVITY_TYPES = [
    {
        id: "GITHUB",
        title: "Evaluación Automática (GitHub)",
        shortTitle: "GitHub IA",
        badge: "Automático IA",
        badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40",
        icon: Sparkles,
        description: "El estudiante entrega un repo de GitHub. La IA evalúa automáticamente el código de los archivos según tu rúbrica.",
    },
    {
        id: "PDF_REVIEW",
        title: "Revisión Documento PDF",
        shortTitle: "Informe PDF",
        badge: "Lectura con IA",
        badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
        icon: FileText,
        description: "Entrega de documento PDF. El asistente de IA examina apartados, redacción y criterios solicitados.",
    },
    {
        id: "CODE_CHALLENGE",
        title: "Taller de Código (Monaco)",
        shortTitle: "Taller Código",
        badge: "Editor Monaco e IA",
        badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
        icon: Terminal,
        description: "El estudiante resuelve archivos de código en el editor Monaco (VS Code) y la IA o el profesor evalúan la solución.",
    },
    {
        id: "VIDEO_PITCH",
        title: "Sustentación Video / Pitch",
        shortTitle: "Video Pitch",
        badge: "Multimodal IA",
        badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40",
        icon: Video,
        description: "Video/audio sustentando el proyecto (YouTube, Loom, Drive). La IA evalúa estructura, fluidez y dominio técnico.",
    },
    {
        id: "AUDIO_DEFENSE",
        title: "Sustentación en Audio / Podcast",
        shortTitle: "Audio Podcast",
        badge: "Audio e IA",
        badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40",
        icon: Mic,
        description: "El estudiante entrega un audio o podcast técnico (Vocaroo, Drive, Spotify, MP3). La IA evalúa la argumentación y cobertura, con opción de sustentación oral docente.",
    },
    {
        id: "AI_INTERVIEW",
        title: "Entrevista Técnica con IA",
        shortTitle: "Entrevista IA",
        badge: "Oral con IA",
        badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/40",
        icon: MessageSquareQuote,
        description: "Examen oral simulado. La IA formula preguntas técnicas adaptativas al alumno y califica sus respuestas.",
    },
    {
        id: "DB_MODELING",
        title: "Base de Datos & Programación SQL",
        shortTitle: "Base de Datos",
        badge: "DDL, DML & ER",
        badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40",
        icon: Database,
        description: "Scripts .sql con DDL, DML (inserts/updates/deletes) y diagrama ER. La IA valida sintaxis, normalización e integridad.",
    },
    {
        id: "MANUAL",
        title: "Entrega Libre (Manual)",
        shortTitle: "Manual",
        badge: "100% Docente",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
        icon: Pencil,
        description: "Tareas o talleres sin IA. Calificación manual por el docente con posibilidad de adjuntar enlaces externos.",
    },
];

// Interfaz para Casos de Prueba de Code Challenge
export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isSecret?: boolean;
}

// Interfaz para Criterios de Lista de Chequeo (Sustentación y Verificación Conceptual)
export interface EvaluationCriterion {
    id: string;
    name: string;
    question?: string;
    expectedAnswer?: string;
    description: string;
    percentage: number;
}

// Extractor de criterios desde Markdown (fallback local inteligente con preguntas de sustentación)
function parseCriteriaFromMarkdown(markdown: string): EvaluationCriterion[] {
    const list: EvaluationCriterion[] = [];
    if (!markdown) return list;

    // 1. Puntos con viñetas: * **Funcionalidad (50%)**: descripción...
    const bulletRegex = /[\*\-]\s+\*\*([^(]+?)(?:\s*\(([0-9]+)%\))?\*\*\s*:\s*([^\n\r]+)/g;
    let match;
    while ((match = bulletRegex.exec(markdown)) !== null) {
        const title = match[1].trim();
        list.push({
            id: `crit_${Date.now()}_${list.length}`,
            name: title,
            percentage: match[2] ? parseInt(match[2], 10) : 0,
            question: `¿Cómo implementaste y probaste ${title}? Explica los conceptos teóricos y decisiones de diseño tomadas.`,
            expectedAnswer: `El estudiante debe explicar la arquitectura y justificar por qué la solución cumple con ${title}.`,
            description: match[3].trim(),
        });
    }

    // 2. Tablas Markdown: | Criterio | Descripción | Porcentaje |
    if (list.length === 0) {
        const tableLines = markdown.split("\n").filter(l => l.trim().startsWith("|") && l.includes("%"));
        tableLines.forEach((line, idx) => {
            const cells = line.split("|").map(c => c.trim()).filter(Boolean);
            if (cells.length >= 3 && !cells[0].toLowerCase().includes("criterio")) {
                const pct = parseInt(cells[2].replace(/[^0-9]/g, ""), 10) || 0;
                const title = cells[0].replace(/\*\*/g, "");
                list.push({
                    id: `crit_${Date.now()}_${idx}`,
                    name: title,
                    question: `Explica en detalle cómo aplicaste los conceptos técnicos de ${title} en tu código.`,
                    expectedAnswer: `El estudiante sustenta con solidez las clases y lógica utilizadas para ${title}.`,
                    description: cells[1],
                    percentage: pct,
                });
            }
        });
    }

    // 3. Extracción desde encabezados y secciones del enunciado Markdown (## o ###)
    if (list.length === 0) {
        const lines = markdown.split("\n");
        const foundHeadings: string[] = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if ((line.startsWith("## ") || line.startsWith("### ")) && 
                !line.toLowerCase().includes("rúbrica") && 
                !line.toLowerCase().includes("rubrica")) {
                const clean = line
                    .replace(/^#{2,3}\s+/, "")
                    .replace(/^[0-9]+[\.\)]\s*/, "")
                    .replace(/^[A-Z][\.\)]\s*/, "")
                    .replace(/\*\*/g, "")
                    .trim();
                if (clean.length >= 4 && !foundHeadings.includes(clean)) {
                    foundHeadings.push(clean);
                }
            }
        }

        if (foundHeadings.length >= 2) {
            const topTopics = foundHeadings.slice(0, 4);
            const basePct = Math.floor(100 / topTopics.length);
            const remainder = 100 - (basePct * topTopics.length);

            topTopics.forEach((topic, idx) => {
                const pct = idx === 0 ? basePct + remainder : basePct;
                list.push({
                    id: `crit_${Date.now()}_${idx}`,
                    name: topic,
                    question: `¿Cómo implementaste lo requerido en "${topic}"? Explica las decisiones técnicas tomadas y su funcionamiento.`,
                    expectedAnswer: `El estudiante sustenta con solvencia los requerimientos técnicos y conceptos aplicados en: ${topic}.`,
                    description: `Verificar en el código la correcta implementación de: ${topic}.`,
                    percentage: pct,
                });
            });
            return list;
        }
    }

    // 4. Fallback básico contextual si el texto es muy breve o no tiene encabezados
    if (list.length === 0) {
        const firstLine = markdown.split("\n").map(l => l.trim().replace(/^#+\s*/, '')).filter(Boolean)[0] || "Implementación del Proyecto";
        return [
            { 
                id: "crit_1", 
                name: firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine, 
                question: `¿Cuál fue el procedimiento seguido para desarrollar ${firstLine}? Explica la arquitectura y componentes.`,
                expectedAnswer: "El estudiante explica la estructura de clases, paquetes y componentes implementados.",
                description: "Verificar cumplimiento de los requerimientos centrales solicitados en el enunciado.", 
                percentage: 50 
            },
            { 
                id: "crit_2", 
                name: "Configuración, Estándares y Validaciones", 
                question: "¿Qué estándares de nomenclatura, dependencias y validaciones implementaste en la solución?",
                expectedAnswer: "El estudiante justifica las librerías utilizadas y la verificación de entradas y salidas.",
                description: "Evaluar buenas prácticas, configuración del proyecto y manejo de casos límite.", 
                percentage: 50 
            },
        ];
    }

    return list;
}

function getExtensionFromLanguage(lang: string): string {
    switch (lang) {
        case "kotlin": return "kt";
        case "python": return "py";
        case "typescript": return "ts";
        case "java": return "java";
        case "cpp": return "cpp";
        case "csharp": return "cs";
        case "php": return "php";
        case "go": return "go";
        case "rust": return "rs";
        case "sql": return "sql";
        case "yaml": return "yaml";
        case "xml": return "xml";
        case "json": return "json";
        case "ini": return "env";
        case "shell": return "sh";
        case "dockerfile": return "dockerfile";
        case "html": return "html";
        case "css": return "css";
        case "markdown": return "md";
        case "javascript":
        default: return "js";
    }
}

function getDefaultStarterCodeForLanguage(lang: string): string {
    switch (lang) {
        case "kotlin":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\nfun solucion(entrada: Any): Any {\n    return entrada\n}\n`;
        case "python":
            return `# Implementa tu solución aquí según las instrucciones del enunciado\ndef solucion(entrada):\n    return entrada\n`;
        case "typescript":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\nfunction solucion(entrada: any): any {\n    return entrada;\n}\n`;
        case "java":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\npublic class Solucion {\n    public static Object resolver(Object entrada) {\n        return entrada;\n    }\n}\n`;
        case "cpp":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\n#include <iostream>\n\nauto solucion(auto entrada) {\n    return entrada;\n}\n`;
        case "yaml":
            return `# Archivo de configuración YAML\nversion: "1.0"\nservicios:\n  app:\n    puerto: 8080\n    activo: true\n`;
        case "xml":
            return `<?xml version="1.0" encoding="UTF-8"?>\n<configuracion>\n    <servidor>localhost</servidor>\n    <puerto>8080</puerto>\n</configuracion>\n`;
        case "json":
            return `{\n  "nombre": "mi-proyecto",\n  "version": "1.0.0",\n  "configuracion": {\n    "activo": true,\n    "puerto": 8080\n  }\n}\n`;
        case "ini":
            return `# Variables de entorno / Configuración\nPORT=8080\nNODE_ENV=development\nDATABASE_URL=postgres://user:pass@localhost:5432/db\n`;
        case "shell":
            return `#!/bin/bash\n# Script de ejecución\necho "Iniciando proceso..."\n`;
        case "dockerfile":
            return `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n`;
        case "sql":
            return `-- Escribe tu consulta o script SQL aquí\nSELECT * FROM tabla WHERE condicion = true;\n`;
        case "html":
            return `<!DOCTYPE html>\n<html lang="es">\n<head>\n    <meta charset="UTF-8">\n    <title>Solución</title>\n</head>\n<body>\n    <h1>Hola Mundo</h1>\n</body>\n</html>\n`;
        case "css":
            return `/* Estilos de la solución */\nbody {\n    font-family: sans-serif;\n    margin: 0;\n}\n`;
        case "csharp":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\nusing System;\n\npublic class Solucion {\n    public static object Resolver(object entrada) {\n        return entrada;\n    }\n}\n`;
        case "php":
            return `<?php\n// Implementa tu solución aquí según las instrucciones del enunciado\nfunction solucion($entrada) {\n    return $entrada;\n}\n`;
        case "go":
            return `package main\n\n// Implementa tu solución aquí según las instrucciones del enunciado\nfunc Solucion(entrada interface{}) interface{} {\n    return entrada\n}\n`;
        case "rust":
            return `// Implementa tu solución aquí según las instrucciones del enunciado\npub fn solucion<T>(entrada: T) -> T {\n    entrada\n}\n`;
        case "javascript":
        default:
            return `// Implementa tu solución aquí según las instrucciones del enunciado\nfunction solucion(entrada) {\n    return entrada;\n}\n`;
    }
}

function getLanguageFromFileName(filename: string): string {
    if (!filename) return "javascript";
    const cleanName = filename.toLowerCase();
    if (cleanName === "dockerfile" || cleanName.startsWith("dockerfile.")) return "dockerfile";
    if (cleanName === ".env" || cleanName.startsWith(".env.")) return "ini";

    const ext = cleanName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case "kt":
        case "kts":
            return "kotlin";
        case "js":
        case "jsx":
        case "mjs":
        case "cjs":
            return "javascript";
        case "ts":
        case "tsx":
            return "typescript";
        case "py":
        case "pyw":
        case "python":
            return "python";
        case "yaml":
        case "yml":
            return "yaml";
        case "xml":
        case "xsd":
        case "svg":
            return "xml";
        case "json":
        case "jsonc":
            return "json";
        case "ini":
        case "toml":
        case "env":
        case "properties":
            return "ini";
        case "sh":
        case "bash":
        case "zsh":
            return "shell";
        case "dockerfile":
            return "dockerfile";
        case "html":
        case "htm":
            return "html";
        case "css":
        case "scss":
        case "sass":
        case "less":
            return "css";
        case "sql":
            return "sql";
        case "java":
            return "java";
        case "cpp":
        case "cc":
        case "cxx":
        case "c":
        case "h":
        case "hpp":
            return "cpp";
        case "cs":
            return "csharp";
        case "php":
            return "php";
        case "rb":
            return "ruby";
        case "go":
            return "go";
        case "rs":
            return "rust";
        case "md":
        case "markdown":
            return "markdown";
        default:
            return "javascript";
    }
}

function extractCodeChallengeFilesFromMarkdown(markdown: string): Array<{ id: string; name: string; content: string }> {
    if (!markdown) return [];
    const files: Array<{ id: string; name: string; content: string }> = [];
    const seen = new Set<string>();

    // 1. Bloques de código que declaran el archivo en comentario en la primera línea
    // Ej: ```java // Producto.java \n ... ```
    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\s*\n(?:\/\/|#|--|\/\*)\s*([a-zA-Z0-9_\-]+\.(?:java|py|js|ts|tsx|jsx|cpp|c|h|hpp|cs|kt|php|go|rs|sql|html|css|json|yaml|yml|md|txt))[\s*\/]*\n([\s\S]*?)```/gi;
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        const rawFileName = match[1].trim();
        const baseName = rawFileName.split(/[\/\\]/).pop() || rawFileName;
        if (baseName && !seen.has(baseName.toLowerCase()) && baseName.includes('.')) {
            seen.add(baseName.toLowerCase());
            files.push({
                id: String(Date.now() + files.length),
                name: baseName,
                content: match[2].trim() || getDefaultStarterCodeForLanguage(getLanguageFromFileName(baseName))
            });
        }
    }

    // 2. Viñetas o listas numeradas que especifican archivos para resolver
    // Ej: - `Producto.java`: Clase base ... o * ProductoPerecedero.java - Subclase
    const fileListRegex = /(?:^|\n)\s*(?:[-*•]|\d+[.)])\s*(?:\*\*)?`?([a-zA-Z0-9_\-]+\.(?:java|py|js|ts|tsx|jsx|cpp|c|h|hpp|cs|kt|php|go|rs|sql|html|css|json|yaml|yml|md|txt))`?(?:\*\*)?(?:\s*[:\-–—]\s*(.*?))?(?=\n|$)/gi;
    let fileMatch;
    while ((fileMatch = fileListRegex.exec(markdown)) !== null) {
        const fileName = fileMatch[1].trim();
        const desc = fileMatch[2]?.trim() || "";
        if (!seen.has(fileName.toLowerCase())) {
            seen.add(fileName.toLowerCase());
            const lang = getLanguageFromFileName(fileName);
            const starter = desc 
                ? `// ${fileName}\n// ${desc}\n\n${getDefaultStarterCodeForLanguage(lang)}`
                : getDefaultStarterCodeForLanguage(lang);
            files.push({
                id: String(Date.now() + files.length),
                name: fileName,
                content: starter
            });
        }
    }

    return files;
}

// Modal Dialog para Crear y Editar Actividades
function ActivityFormDialog({
    isOpen,
    courseId,
    activity,
    onClose,
    onOpenActivityGroups,
}: {
    isOpen: boolean;
    courseId: string;
    activity?: any;
    onClose: () => void;
    onOpenActivityGroups?: (activity: any) => void;
}) {
    const isEdit = Boolean(activity);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string>("config");
    const [selectedType, setSelectedType] = useState<string>(activity?.type || "GITHUB");
    const [description, setDescription] = useState(activity?.description || "**Instrucciones de la actividad**\n\n...");
    const [statement, setStatement] = useState(activity?.statement || TEMPLATE_GITHUB);
    const [hasChecklist, setHasChecklist] = useState<boolean>(false);
    const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
    const [aiWeight, setAiWeight] = useState<number>(30); // 30% por defecto para evaluación IA
    const [checklistWeight, setChecklistWeight] = useState<number>(70); // 70% por defecto para evaluación del docente
    const [isGeneratingCriteria, setIsGeneratingCriteria] = useState<boolean>(false);
    const [isGeneratingAlternative, setIsGeneratingAlternative] = useState<boolean>(false);
    const [verifyingCriterionIndex, setVerifyingCriterionIndex] = useState<number | null>(null);
    const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
    const [isBalancingPercentages, setIsBalancingPercentages] = useState<boolean>(false);
    const [importedData, setImportedData] = useState<any>(null);
    const [formKey, setFormKey] = useState(0);
    const [challengeLanguage, setChallengeLanguage] = useState<string>("javascript");
    const [challengeFiles, setChallengeFiles] = useState<Array<{ id: string; name: string; content: string }>>([
        {
            id: "1",
            name: "solucion.js",
            content: `// Implementa tu solución aquí según las instrucciones del enunciado\nfunction solucion(entrada) {\n    return entrada;\n}\n`,
        }
    ]);
    const [selectedChallengeFileId, setSelectedChallengeFileId] = useState<string>("1");
    const [isGeneratingFileCode, setIsGeneratingFileCode] = useState<boolean>(false);
    const [showFileCodePrompt, setShowFileCodePrompt] = useState<boolean>(false);
    const [fileCodePrompt, setFileCodePrompt] = useState<string>("");

    const handleGenerateFileCode = async (file: { id: string; name: string; content: string }, customPrompt?: string) => {
        const promptToUse = (customPrompt || fileCodePrompt).trim();
        if (!promptToUse) {
            toast.warning("Ingresa una instrucción o prompt para la IA");
            return;
        }

        try {
            setIsGeneratingFileCode(true);
            const fileLang = getLanguageFromFileName(file.name);
            const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
            const generatedCode = await generateCodeFileTemplateAction(
                promptToUse,
                file.name,
                fileLang,
                {
                    activityTitle: titleInput?.value || "Taller de Código",
                    activityStatement: statement,
                    otherFiles: challengeFiles.filter(f => f.id !== file.id).map(f => ({ name: f.name })),
                    currentCode: file.content
                }
            );

            if (generatedCode) {
                const updated = challengeFiles.map(f => f.id === file.id ? { ...f, content: generatedCode } : f);
                setChallengeFiles(updated);
                toast.success(`Plantilla generada con IA para ${file.name}`);
                setShowFileCodePrompt(false);
                setFileCodePrompt("");
            }
        } catch (error: any) {
            console.error("Error al generar código con IA:", error);
            toast.error("Error al generar código con IA", {
                description: error.message || "Por favor intenta de nuevo con otro prompt."
            });
        } finally {
            setIsGeneratingFileCode(false);
        }
    };
    const [pitchMaxMinutes, setPitchMaxMinutes] = useState<number>(5);
    const [pitchRequiredTopics, setPitchRequiredTopics] = useState<string[]>([
        "Problema y Solución",
        "Arquitectura Técnica y Stack",
        "Demostración en Vivo",
        "Lecciones y Retos Superados",
    ]);
    const [audioMaxMinutes, setAudioMaxMinutes] = useState<number>(5);
    const [audioRequiredTopics, setAudioRequiredTopics] = useState<string[]>([
        "Problema y Contexto",
        "Arquitectura y Decisiones Técnicas",
        "Retos y Conclusiones",
    ]);
    const [interviewQuestionsCount, setInterviewQuestionsCount] = useState<number>(4);
    const [interviewTargetRole, setInterviewTargetRole] = useState<"Junior" | "Semi-Senior" | "Senior">("Junior");
    const [interviewFocusAreas, setInterviewFocusAreas] = useState<string[]>([
        "Conceptos Fundamentales y Arquitectura",
        "Patrones de Diseño y Buenas Prácticas",
        "Resolución de Problemas y Casos Borde",
    ]);
    const [dbDeliveryMode, setDbDeliveryMode] = useState<"sandbox" | "cloud">("sandbox");
    const [dbTargetEngine, setDbTargetEngine] = useState<string>("PostgreSQL");
    const [dbRequiredNormalization, setDbRequiredNormalization] = useState<string>("3FN");
    const [dbRequiredEntities, setDbRequiredEntities] = useState<string[]>([
        "Usuarios",
        "Roles",
        "Transacciones",
        "Auditoría",
    ]);
    const [dbIncludeDiagram, setDbIncludeDiagram] = useState<boolean>(true);
    const [dbIncludeDdl, setDbIncludeDdl] = useState<boolean>(true);
    const [dbIncludeDml, setDbIncludeDml] = useState<boolean>(true);
    const [dbIncludeQueries, setDbIncludeQueries] = useState<boolean>(true);
    const [isGroupActivity, setIsGroupActivity] = useState<boolean>(activity?.isGroupActivity || false);
    const [groupScope, setGroupScope] = useState<"COURSE" | "ACTIVITY">((activity as any)?.groupScope === "ACTIVITY" ? "ACTIVITY" : "COURSE");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
    const [aiInitialContent, setAiInitialContent] = useState<string | undefined>(undefined);
    const [showStudentPreview, setShowStudentPreview] = useState(false);

    const previewActivity = useMemo(() => {
        const titleVal = typeof document !== "undefined" ? (document.querySelector('input[name="title"]') as HTMLInputElement)?.value : "";
        const deadlineVal = typeof document !== "undefined" ? (document.querySelector('input[name="deadlineLocal"]') as HTMLInputElement)?.value : "";
        return {
            id: activity?.id || "preview-code-challenge",
            title: titleVal || activity?.title || "Taller de Código (Vista Previa)",
            statement: statement || activity?.statement || "",
            deadline: deadlineVal ? new Date(deadlineVal).toISOString() : (activity?.deadline || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()),
            courseId: courseId,
            course: { title: "Curso Actual" },
            type: "CODE_CHALLENGE",
            description: JSON.stringify({
                challengeConfig: {
                    language: challengeLanguage,
                    template: challengeFiles[0]?.content || "",
                    files: challengeFiles
                }
            }),
            submissions: []
        };
    }, [activity, statement, courseId, challengeLanguage, challengeFiles, showStudentPreview]);

    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";
    const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

    const criteriaSum = criteria.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);

    const handleAiWeightChange = (val: number) => {
        const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
        setAiWeight(clamped);
        setChecklistWeight(100 - clamped);
    };

    const handleChecklistWeightChange = (val: number) => {
        const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
        setChecklistWeight(clamped);
        setAiWeight(100 - clamped);
    };

    const defaultDeadline = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(23, 59, 0, 0);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }, [formKey]);

    const setQuickDeadline = (days: number) => {
        const target = new Date();
        target.setDate(target.getDate() + days);
        target.setHours(23, 59, 0, 0);
        const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const input = document.getElementById("deadlineLocal") as HTMLInputElement;
        if (input) {
            input.value = localIso;
            toast.success(`Fecha límite fijada para dentro de ${days} días`);
        }
    };

    // Sincronizar datos inmediatamente al abrir el modal o cambiar la actividad
    useEffect(() => {
        if (isOpen) {
            setActiveTab("config");
            setSelectedType(activity?.type || "GITHUB");
            setDescription(activity?.description || "**Instrucciones de la actividad**\n\n...");
            const defaultStatement = activity?.statement || (
                activity ? "" :
                (activity?.type === "AUDIO_DEFENSE" ? TEMPLATE_AUDIO_DEFENSE :
                 activity?.type === "DB_MODELING" ? TEMPLATE_DB_MODELING :
                 activity?.type === "AI_INTERVIEW" ? TEMPLATE_AI_INTERVIEW :
                 activity?.type === "VIDEO_PITCH" ? TEMPLATE_VIDEO_PITCH :
                 activity?.type === "CODE_CHALLENGE" ? TEMPLATE_CODE_CHALLENGE :
                 activity?.type === "PDF_REVIEW" ? TEMPLATE_PDF_REVIEW :
                 activity?.type === "MANUAL" ? TEMPLATE_MANUAL : TEMPLATE_GITHUB)
            );
            setStatement(defaultStatement);
            setIsGroupActivity(Boolean(activity?.isGroupActivity));
            setGroupScope((activity as any)?.groupScope === "ACTIVITY" ? "ACTIVITY" : "COURSE");
            setImportedData(null);
            setFormKey(k => k + 1);

            // Cargar configuración específica según activity.description
            if (activity?.description) {
                try {
                    const parsedDesc = JSON.parse(activity.description);
                    if (parsedDesc && typeof parsedDesc === "object") {
                        // 1. Audio Defense
                        if (parsedDesc.audioConfig) {
                            if (typeof parsedDesc.audioConfig.maxDurationMinutes === "number") {
                                setAudioMaxMinutes(parsedDesc.audioConfig.maxDurationMinutes);
                            }
                            if (Array.isArray(parsedDesc.audioConfig.requiredTopics)) {
                                setAudioRequiredTopics(parsedDesc.audioConfig.requiredTopics);
                            }
                        }

                        // 2. Video Pitch
                        if (parsedDesc.pitchConfig) {
                            if (typeof parsedDesc.pitchConfig.maxDurationMinutes === "number") {
                                setPitchMaxMinutes(parsedDesc.pitchConfig.maxDurationMinutes);
                            }
                            if (Array.isArray(parsedDesc.pitchConfig.requiredTopics)) {
                                setPitchRequiredTopics(parsedDesc.pitchConfig.requiredTopics);
                            }
                        }

                        // 3. AI Interview
                        if (parsedDesc.interviewConfig) {
                            if (typeof parsedDesc.interviewConfig.questionsCount === "number") {
                                setInterviewQuestionsCount(parsedDesc.interviewConfig.questionsCount);
                            }
                            if (parsedDesc.interviewConfig.targetRole) {
                                setInterviewTargetRole(parsedDesc.interviewConfig.targetRole);
                            }
                            if (Array.isArray(parsedDesc.interviewConfig.focusAreas)) {
                                setInterviewFocusAreas(parsedDesc.interviewConfig.focusAreas);
                            }
                        }

                        // 4. DB Modeling
                        if (parsedDesc.dbConfig) {
                            if (parsedDesc.dbConfig.deliveryMode) {
                                setDbDeliveryMode(parsedDesc.dbConfig.deliveryMode);
                            }
                            if (parsedDesc.dbConfig.targetEngine) {
                                setDbTargetEngine(parsedDesc.dbConfig.targetEngine);
                            }
                            if (parsedDesc.dbConfig.requiredNormalization) {
                                setDbRequiredNormalization(parsedDesc.dbConfig.requiredNormalization);
                            }
                            if (Array.isArray(parsedDesc.dbConfig.requiredEntities)) {
                                setDbRequiredEntities(parsedDesc.dbConfig.requiredEntities);
                            }
                            if (parsedDesc.dbConfig.scopeOptions) {
                                if (typeof parsedDesc.dbConfig.scopeOptions.includeDiagram === "boolean") setDbIncludeDiagram(parsedDesc.dbConfig.scopeOptions.includeDiagram);
                                if (typeof parsedDesc.dbConfig.scopeOptions.includeDdl === "boolean") setDbIncludeDdl(parsedDesc.dbConfig.scopeOptions.includeDdl);
                                if (typeof parsedDesc.dbConfig.scopeOptions.includeDml === "boolean") setDbIncludeDml(parsedDesc.dbConfig.scopeOptions.includeDml);
                                if (typeof parsedDesc.dbConfig.scopeOptions.includeQueries === "boolean") setDbIncludeQueries(parsedDesc.dbConfig.scopeOptions.includeQueries);
                            }
                        }

                        // 5. Code Challenge (Archivos y Lenguaje)
                        if (parsedDesc.challengeConfig) {
                            if (parsedDesc.challengeConfig.language) {
                                setChallengeLanguage(parsedDesc.challengeConfig.language);
                            }
                            if (Array.isArray(parsedDesc.challengeConfig.files) && parsedDesc.challengeConfig.files.length > 0) {
                                setChallengeFiles(parsedDesc.challengeConfig.files);
                                setSelectedChallengeFileId(parsedDesc.challengeConfig.files[0].id || "1");
                            } else if (parsedDesc.challengeConfig.starterCode) {
                                const ext = getExtensionFromLanguage(parsedDesc.challengeConfig.language || "javascript");
                                setChallengeFiles([
                                    { id: "1", name: `solucion.${ext}`, content: parsedDesc.challengeConfig.starterCode }
                                ]);
                                setSelectedChallengeFileId("1");
                            }
                        }

                        // Auto-recuperación si solo quedó solucion.js o no había archivos pero el enunciado sí los tiene
                        if (
                            activity?.type === "CODE_CHALLENGE" &&
                            (!parsedDesc.challengeConfig?.files || (parsedDesc.challengeConfig.files.length === 1 && parsedDesc.challengeConfig.files[0].name === "solucion.js")) &&
                            activity?.statement
                        ) {
                            const recovered = extractCodeChallengeFilesFromMarkdown(activity.statement);
                            if (recovered.length > 0) {
                                setChallengeFiles(recovered);
                                setSelectedChallengeFileId(recovered[0].id);
                                setChallengeLanguage(getLanguageFromFileName(recovered[0].name));
                            }
                        }

                        // 6. Checklist y criterios
                        if (parsedDesc.hasChecklist) {
                            setHasChecklist(true);
                            if (Array.isArray(parsedDesc.criteria)) {
                                setCriteria(parsedDesc.criteria);
                            }
                            if (typeof parsedDesc.aiWeight === "number") {
                                setAiWeight(parsedDesc.aiWeight);
                                setChecklistWeight(typeof parsedDesc.checklistWeight === "number" ? parsedDesc.checklistWeight : 100 - parsedDesc.aiWeight);
                            } else if (typeof parsedDesc.checklistWeight === "number") {
                                setChecklistWeight(parsedDesc.checklistWeight);
                                setAiWeight(100 - parsedDesc.checklistWeight);
                            } else {
                                setAiWeight(30);
                                setChecklistWeight(70);
                            }
                        } else {
                            setHasChecklist(false);
                            if (Array.isArray(parsedDesc.criteria)) {
                                setCriteria(parsedDesc.criteria);
                            }
                        }
                    }
                } catch {
                    // Si hubo error de parseo o era texto plano, recuperar archivos de código del enunciado si aplica
                    if (activity?.type === "CODE_CHALLENGE" && activity?.statement) {
                        const recovered = extractCodeChallengeFilesFromMarkdown(activity.statement);
                        if (recovered.length > 0) {
                            setChallengeFiles(recovered);
                            setSelectedChallengeFileId(recovered[0].id);
                            setChallengeLanguage(getLanguageFromFileName(recovered[0].name));
                        }
                    }
                }
            } else {
                setHasChecklist(false);
                setCriteria([]);
                setAiWeight(30);
                setChecklistWeight(70);
                if (activity?.type === "CODE_CHALLENGE" && activity?.statement) {
                    const recovered = extractCodeChallengeFilesFromMarkdown(activity.statement);
                    if (recovered.length > 0) {
                        setChallengeFiles(recovered);
                        setSelectedChallengeFileId(recovered[0].id);
                        setChallengeLanguage(getLanguageFromFileName(recovered[0].name));
                    }
                }
            }
        }
    }, [isOpen, activity]);

    // Auto-fill template if statement is blank or standard
    useEffect(() => {
        if (!activity && (!statement || 
            statement === TEMPLATE_GITHUB || 
            statement === TEMPLATE_DB_MODELING || 
            statement === TEMPLATE_AI_INTERVIEW || 
            statement === TEMPLATE_VIDEO_PITCH || 
            statement === TEMPLATE_CODE_CHALLENGE || 
            statement === TEMPLATE_PDF_REVIEW || 
            statement === TEMPLATE_MANUAL)) {
            
            if (selectedType === "GITHUB") setStatement(TEMPLATE_GITHUB);
            else if (selectedType === "DB_MODELING") setStatement(TEMPLATE_DB_MODELING);
            else if (selectedType === "AI_INTERVIEW") setStatement(TEMPLATE_AI_INTERVIEW);
            else if (selectedType === "VIDEO_PITCH") setStatement(TEMPLATE_VIDEO_PITCH);
            else if (selectedType === "CODE_CHALLENGE") setStatement(TEMPLATE_CODE_CHALLENGE);
            else if (selectedType === "PDF_REVIEW") setStatement(TEMPLATE_PDF_REVIEW);
            else if (selectedType === "MANUAL") setStatement(TEMPLATE_MANUAL);
        }
    }, [selectedType, activity]);

    // Generar criterios con IA desde el enunciado (o generar otra versión diferente)
    const handleGenerateCriteria = async (isAlternative: boolean = false) => {
        if (!statement || statement.trim().length < 20) {
            toast.error("El enunciado debe contener información suficiente para generar preguntas de sustentación.");
            return;
        }

        if (isAlternative) {
            setIsGeneratingAlternative(true);
        } else {
            setIsGeneratingCriteria(true);
        }

        try {
            const options = isAlternative && criteria.length > 0
                ? { isAlternative: true, existingCriteria: criteria }
                : undefined;

            const aiCriteria = await generateChecklistCriteriaAction(statement, undefined, options);
            if (aiCriteria && aiCriteria.length > 0) {
                if (isAlternative && criteria.length > 0) {
                    // Segundo botón: Crea nuevas preguntas sin cambiar las ya existentes
                    const combined = [...criteria, ...aiCriteria];
                    const basePct = Math.floor(100 / combined.length);
                    const remainder = 100 - (basePct * combined.length);
                    const rebalanced = combined.map((c, i) => ({
                        ...c,
                        percentage: i === 0 ? basePct + remainder : basePct
                    }));
                    setCriteria(rebalanced);
                    toast.success(`Se creó y agregó 1 nueva pregunta adicional sin cambiar las existentes.`);
                } else {
                    // Primer botón: Genera varias preguntas (las más importantes)
                    setCriteria(aiCriteria);
                    toast.success(`${aiCriteria.length} preguntas principales generadas con IA a partir del enunciado.`);
                }
                return;
            }
        } catch (e: any) {
            console.warn("Fallo IA para criterios:", e);
            toast.warning(`No se pudo conectar al servicio de IA (${e.message || "error"}).`);
        } finally {
            setIsGeneratingCriteria(false);
            setIsGeneratingAlternative(false);
        }

        if (!isAlternative) {
            // Fallback local regex
            const extracted = parseCriteriaFromMarkdown(statement);
            setCriteria(extracted);
            toast.info(`Se extrajeron ${extracted.length} criterios del enunciado.`);
        }
    };

    // Verificar si un criterio/pregunta individual tiene relación directa con el enunciado usando IA
    const handleVerifyCriterion = async (idx: number) => {
        const crit = criteria[idx];
        if (!crit) return;

        if (!statement || statement.trim().length < 20) {
            toast.error("El enunciado de la actividad está vacío para verificar la relación de la pregunta.");
            return;
        }

        setVerifyingCriterionIndex(idx);
        try {
            const result = await verifyCriterionRelationAction(statement, crit);
            if (result) {
                if (result.suggestedName) handleUpdateCriterion(idx, "name", result.suggestedName);
                if (result.suggestedQuestion) handleUpdateCriterion(idx, "question", result.suggestedQuestion);
                if (result.suggestedExpectedAnswer) handleUpdateCriterion(idx, "expectedAnswer", result.suggestedExpectedAnswer);
                if (result.suggestedDescription) handleUpdateCriterion(idx, "description", result.suggestedDescription);

                setVerifiedMap(prev => ({ ...prev, [crit.id || idx]: true }));

                if (result.isRelated) {
                    toast.success(`✓ Pregunta verificada con IA: ${result.feedback}`);
                } else {
                    toast.info(`Pregunta adaptada con IA para relacionarse al enunciado: ${result.feedback}`);
                }
            }
        } catch (e: any) {
            console.error("Error verificando criterio con IA:", e);
            toast.error(`Error al verificar criterio: ${e.message || "Error de conexión con IA"}`);
        } finally {
            setVerifyingCriterionIndex(null);
        }
    };

    // Ajustar toda la ponderación automáticamente (distribución equitativa a 100%)
    const handleAutoBalancePercentages = () => {
        if (criteria.length === 0) return;
        const basePct = Math.floor(100 / criteria.length);
        const remainder = 100 - (basePct * criteria.length);
        const updated = criteria.map((c, idx) => ({
            ...c,
            percentage: idx === 0 ? basePct + remainder : basePct,
        }));
        setCriteria(updated);
        toast.success(`Ponderación ajustada equitativamente al 100% (${criteria.length} preguntas).`);
    };

    // Asignar ponderación con IA según la importancia de cada pregunta
    const handleAIBalancePercentages = async () => {
        if (criteria.length === 0) return;
        if (!statement || statement.trim().length < 20) {
            toast.error("El enunciado debe contener información suficiente para evaluar la importancia con IA.");
            return;
        }

        setIsBalancingPercentages(true);
        try {
            const weights = await balanceCriteriaPercentagesAction(
                statement,
                criteria.map(c => ({
                    id: c.id,
                    name: c.name,
                    question: c.question,
                    description: c.description,
                }))
            );

            if (weights && weights.length > 0) {
                const weightMap = new Map(weights.map(w => [w.id, w.percentage]));
                const updated = criteria.map(c => {
                    const assignedPct = weightMap.get(c.id);
                    return {
                        ...c,
                        percentage: typeof assignedPct === "number" ? assignedPct : c.percentage,
                    };
                });
                setCriteria(updated);
                toast.success("Ponderación asignada con IA según la importancia académica de cada pregunta.");
            }
        } catch (e: any) {
            console.error("Error al ponderar con IA:", e);
            toast.error(`No se pudo ponderar con IA: ${e.message || "error desconocido"}`);
        } finally {
            setIsBalancingPercentages(false);
        }
    };

    const handleAddCriterion = (insertAtIndex?: number | unknown) => {
        const targetIndex = typeof insertAtIndex === "number" ? insertAtIndex : undefined;
        const remaining = Math.max(0, 100 - criteriaSum);
        const newCrit: EvaluationCriterion = {
            id: `crit_${Date.now()}_${criteria.length + 1}`,
            name: `Criterio de Sustentación ${criteria.length + 1}`,
            question: "¿Qué pregunta técnica formularás al estudiante para verificar su comprensión conceptual?",
            expectedAnswer: "Qué debe responder o demostrar el estudiante para evidenciar dominio genuino del concepto.",
            description: "Aspectos técnicos y componentes de código a verificar en la entrega.",
            percentage: remaining > 0 ? remaining : 10,
        };
        if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex <= criteria.length) {
            const next = [...criteria];
            next.splice(targetIndex, 0, newCrit);
            setCriteria(next);
            toast.success(`Celda de criterio #${targetIndex + 1} insertada.`);
        } else {
            setCriteria([...criteria, newCrit]);
            toast.success(`Criterio #${criteria.length + 1} añadido.`);
        }
    };

    const handleUpdateCriterion = (index: number, field: keyof EvaluationCriterion, val: any) => {
        const copy = [...criteria];
        copy[index] = { ...copy[index], [field]: val };
        setCriteria(copy);
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleMoveCriterion = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= criteria.length) return;
        const copy = [...criteria];
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
        setCriteria(copy);
    };

    const handleExport = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        const data = Object.fromEntries(formData.entries());
        (data as any).isGroupActivity = isGroupActivity;
        if (hasChecklist) {
            (data as any).hasChecklist = true;
            (data as any).aiWeight = aiWeight;
            (data as any).checklistWeight = checklistWeight;
            (data as any).criteria = criteria;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const title = formData.get("title")?.toString().replace(/[^a-z0-9-]/gi, '_').toLowerCase() || "actividad";
        const dateStr = format(new Date(), "yyyy-MM-dd-HHmm");
        a.download = `${title}_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.description !== undefined) setDescription(data.description);
                if (data.statement !== undefined) setStatement(data.statement);
                if (data.type !== undefined) setSelectedType(data.type);
                if (data.isGroupActivity !== undefined) setIsGroupActivity(Boolean(data.isGroupActivity));
                if (data.hasChecklist !== undefined) setHasChecklist(Boolean(data.hasChecklist));
                if (data.aiWeight !== undefined) setAiWeight(Number(data.aiWeight));
                if (data.checklistWeight !== undefined) setChecklistWeight(Number(data.checklistWeight));
                if (Array.isArray(data.criteria)) setCriteria(data.criteria);
                setImportedData(data);
                setFormKey(k => k + 1);
                toast.success("Parámetros importados correctamente");
            } catch (err) {
                console.error("Error al importar", err);
                toast.error("Archivo JSON inválido");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            const form = formRef.current;

            // Validar título de la actividad
            const title = (formData.get("title") as string)?.trim();
            if (!title) {
                setIsSubmitting(false);
                setActiveTab("config");
                toast.error("Por favor ingresa un título para la actividad en la pestaña 'Configuración'.");
                setTimeout(() => {
                    const titleInput = document.getElementById("title") as HTMLInputElement;
                    titleInput?.focus();
                }, 150);
                return;
            }

            if (form) {
                const openDateLocal = (form.querySelector('[name="openDateLocal"]') as HTMLInputElement)?.value;
                const deadlineLocal = (form.querySelector('[name="deadlineLocal"]') as HTMLInputElement)?.value;
                if (openDateLocal) {
                    formData.set("openDate", new Date(openDateLocal).toISOString());
                } else {
                    formData.delete("openDate");
                }
                if (deadlineLocal) {
                    formData.set("deadline", new Date(deadlineLocal).toISOString());
                } else if (!isEdit && !activity?.deadline) {
                    setIsSubmitting(false);
                    setActiveTab("config");
                    toast.error("Por favor define la fecha límite en la pestaña 'Configuración'.");
                    setTimeout(() => {
                        const deadlineInput = document.getElementById("deadlineLocal") as HTMLInputElement;
                        deadlineInput?.focus();
                    }, 150);
                    return;
                } else {
                    formData.delete("deadline");
                }
            }

            formData.set("statement", statement);
            formData.set("type", selectedType);
            formData.set("isGroupActivity", String(isGroupActivity));
            formData.set("groupScope", groupScope);

            // Guardar configuración de Checklist, Code Challenge, Video Pitch, AI Interview, DB Modeling y Ponderación de Nota Final
            if (selectedType === "DB_MODELING") {
                formData.set("description", JSON.stringify({
                    hasChecklist: hasChecklist,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria,
                    dbConfig: {
                        deliveryMode: dbDeliveryMode,
                        targetEngine: dbTargetEngine,
                        requiredNormalization: dbRequiredNormalization,
                        requiredEntities: dbRequiredEntities,
                        scopeOptions: {
                            includeDdl: dbIncludeDdl,
                            includeDml: dbIncludeDml,
                            includeQueries: dbIncludeQueries,
                        },
                    }
                }));
            } else if (selectedType === "AI_INTERVIEW") {
                formData.set("description", JSON.stringify({
                    hasChecklist: hasChecklist,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria,
                    interviewConfig: {
                        questionsCount: interviewQuestionsCount,
                        targetRole: interviewTargetRole,
                        focusAreas: interviewFocusAreas,
                    }
                }));
            } else if (selectedType === "AUDIO_DEFENSE") {
                formData.set("description", JSON.stringify({
                    hasChecklist: hasChecklist,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria,
                    audioConfig: {
                        maxDurationMinutes: audioMaxMinutes,
                        requiredTopics: audioRequiredTopics,
                    }
                }));
            } else if (selectedType === "VIDEO_PITCH") {
                formData.set("description", JSON.stringify({
                    hasChecklist: hasChecklist,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria,
                    pitchConfig: {
                        maxDurationMinutes: pitchMaxMinutes,
                        requiredTopics: pitchRequiredTopics,
                    }
                }));
            } else if (selectedType === "CODE_CHALLENGE") {
                const detectedLanguage = challengeFiles.length > 0 && challengeFiles[0].name.includes(".")
                    ? getLanguageFromFileName(challengeFiles[0].name)
                    : challengeLanguage;
                formData.set("description", JSON.stringify({
                    hasChecklist: hasChecklist,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria,
                    challengeConfig: {
                        language: detectedLanguage || challengeLanguage,
                        files: challengeFiles,
                    }
                }));
            } else if (hasChecklist && (selectedType === "GITHUB" || selectedType === "PDF_REVIEW")) {
                formData.set("description", JSON.stringify({
                    hasChecklist: true,
                    aiWeight: aiWeight,
                    checklistWeight: checklistWeight,
                    criteria: criteria
                }));
            } else {
                formData.set("description", description);
            }

            if (isEdit && activity?.id) {
                formData.set("activityId", activity.id);
            }
            formData.set("courseId", courseId);

            if (isEdit) {
                await updateActivityAction(formData);
                toast.success("✓ Actividad actualizada exitosamente. Los cambios han sido guardados.");
                router.refresh();
                onClose();
            } else {
                await createActivityAction(formData);
                toast.success("Actividad creada exitosamente");
                router.refresh();
                onClose();
            }
        } catch (err: any) {
            console.error("Error guardando actividad", err);
            toast.error(err.message || "Error al guardar la actividad");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        const form = formRef.current || e.currentTarget;
        const formData = new FormData(form);
        await handleSubmit(formData);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent 
                showCloseButton={false}
                onPointerDownOutside={(e) => e.preventDefault()}
                className="fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 z-50 !max-w-none !w-screen !h-[100dvh] !max-h-[100dvh] m-0 p-0 border-none rounded-none bg-background overflow-hidden flex flex-col !duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none"
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>{isEdit ? "Editar Actividad" : "Crear Nueva Actividad"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Modifica los parámetros y la rúbrica de la actividad." : "Configura los detalles y el contenido de la nueva actividad."}
                    </DialogDescription>
                </DialogHeader>

                {/* Formulario Principal con Tabs Shadcn */}
                <form key={formKey} ref={formRef} onSubmit={onFormSubmit} noValidate className="flex flex-col h-full min-h-0 overflow-hidden flex-1">
                    {isEdit && <input type="hidden" name="activityId" value={activity.id} />}
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="description" value={description} />
                    <input type="hidden" name="statement" value={statement} />

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Header del Modal con Título, Pestañas y Acciones */}
                        <div className="px-5 py-2.5 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                                    {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                                            {isEdit ? "Editar Actividad" : "Crear Nueva Actividad"}
                                        </h2>
                                        {isEdit && (
                                            <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex">
                                                {activity.type}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                                        {isEdit ? "Modifica los parámetros y la rúbrica de la actividad." : "Configura los detalles y el contenido de la nueva actividad."}
                                    </p>
                                </div>
                            </div>

                            {/* Pestañas Shadcn en el Header */}
                            <TabsList className="bg-muted/80 p-1 h-9 border border-border/50">
                                <TabsTrigger value="config" className="text-xs px-3.5 font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Configuración
                                </TabsTrigger>
                                <TabsTrigger value="content" className="text-xs px-3.5 font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                    <FileText className="h-3.5 w-3.5" />
                                    Contenido y Rúbrica
                                </TabsTrigger>
                                {(selectedType === "GITHUB" || selectedType === "PDF_REVIEW" || selectedType === "CODE_CHALLENGE" || selectedType === "VIDEO_PITCH" || selectedType === "AI_INTERVIEW" || selectedType === "DB_MODELING") && hasChecklist && (
                                    <TabsTrigger value="checklist" className="text-xs px-3.5 font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                                        Lista de Chequeo
                                        <Badge 
                                            variant={criteriaSum === 100 ? "default" : "secondary"} 
                                            className="text-[10px] px-1.5 py-0 h-4 ml-0.5 font-mono"
                                        >
                                            {criteriaSum}%
                                        </Badge>
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <div className="flex items-center gap-2">
                                {selectedType === "CODE_CHALLENGE" && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowStudentPreview(true)}
                                        className="text-xs h-8 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold gap-1.5 shadow-2xs cursor-pointer"
                                        title="Abrir vista interactiva de prueba idéntica a la que ve el estudiante"
                                    >
                                        <Eye className="h-3.5 w-3.5 text-amber-500" />
                                        <span>Modo Estudiante</span>
                                    </Button>
                                )}
                                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-8">
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    Importar
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleExport} className="text-xs h-8">
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Exportar
                                </Button>
                                
                                {/* Botón Guardar / Actualizar en la barra superior */}
                                <Button type="submit" size="sm" disabled={isSubmitting} className="font-bold text-xs h-8 bg-primary text-primary-foreground shadow-xs">
                                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                    {isEdit ? "Actualizar Actividad" : "Crear Actividad"}
                                </Button>

                                {/* Botón Cerrar explícito */}
                                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs h-8 text-muted-foreground hover:text-foreground font-semibold ml-1">
                                    <X className="h-4 w-4 mr-1" />
                                    Cerrar
                                </Button>
                            </div>
                        </div>

                        {/* Pestaña 1: Configuración (Distribuida a lo ancho y mejorada visualmente) */}
                        <TabsContent 
                            value="config" 
                            forceMount 
                            className={cn(
                                "flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-muted/10 scrollbar-thin",
                                activeTab !== "config" && "!hidden"
                            )}
                        >
                            <div className="w-full max-w-[1650px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Columna Izquierda: Información Principal y Fechas (7 columnas) */}
                                <div className="lg:col-span-7 space-y-5 flex flex-col">
                                    {/* Sección 1: Información Básica y Selección de Modalidad */}
                                    <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border/70 shadow-xs space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                    <Settings2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                                                        Información Principal
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">Título y modalidad de evaluación de la actividad</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <Label htmlFor="title" className="text-xs font-semibold">
                                                Título de la Actividad <span className="text-destructive">*</span>
                                            </Label>
                                            <Input 
                                                id="title" 
                                                name="title" 
                                                placeholder="Ej: Actividad 1 - Fundamentos de Programación" 
                                                defaultValue={importedData?.title || activity?.title || ""} 
                                                className="h-10 text-sm font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-semibold">
                                                    Modalidad y Tipo de Evaluación <span className="text-destructive">*</span>
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">Selecciona una modalidad</span>
                                            </div>

                                            {/* Selector visual en cuadrícula de tarjetas interactivas */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2.5">
                                                {ACTIVITY_TYPES.map((t) => {
                                                    const isSelected = selectedType === t.id;
                                                    const Icon = t.icon;
                                                    return (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedType(t.id);
                                                                if (!isEdit) {
                                                                    if (t.id === "AUDIO_DEFENSE") {
                                                                        setStatement(TEMPLATE_AUDIO_DEFENSE);
                                                                        setDescription(TEMPLATE_AUDIO_DEFENSE);
                                                                    } else if (t.id === "DB_MODELING") {
                                                                        setStatement(TEMPLATE_DB_MODELING);
                                                                        setDescription(TEMPLATE_DB_MODELING);
                                                                    } else if (t.id === "AI_INTERVIEW") {
                                                                        setStatement(TEMPLATE_AI_INTERVIEW);
                                                                        setDescription(TEMPLATE_AI_INTERVIEW);
                                                                    } else if (t.id === "VIDEO_PITCH") {
                                                                        setStatement(TEMPLATE_VIDEO_PITCH);
                                                                        setDescription(TEMPLATE_VIDEO_PITCH);
                                                                    } else if (t.id === "CODE_CHALLENGE") {
                                                                        setStatement(TEMPLATE_CODE_CHALLENGE);
                                                                        setDescription(TEMPLATE_CODE_CHALLENGE);
                                                                    } else if (t.id === "PDF_REVIEW") {
                                                                        setStatement(TEMPLATE_PDF_REVIEW);
                                                                        setDescription(TEMPLATE_PDF_REVIEW);
                                                                    } else if (t.id === "MANUAL") {
                                                                        setStatement(TEMPLATE_MANUAL);
                                                                        setDescription(TEMPLATE_MANUAL);
                                                                    } else if (t.id === "GITHUB") {
                                                                        setStatement(TEMPLATE_GITHUB);
                                                                        setDescription(TEMPLATE_GITHUB);
                                                                    }
                                                                }
                                                            }}
                                                            className={cn(
                                                                "flex flex-col text-left p-3 rounded-xl border transition-all relative group",
                                                                isSelected
                                                                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                                                                    : "border-border/60 hover:border-border hover:bg-muted/30 bg-card/60"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-1.5 gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                        "p-1.5 rounded-lg shrink-0 transition-colors",
                                                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
                                                                    )}>
                                                                        <Icon className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-foreground leading-tight">{t.shortTitle}</span>
                                                                </div>
                                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0 font-medium", t.badgeColor)}>
                                                                    {t.badge}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                {t.description}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Input hidden sincronizado para envío del form */}
                                            <input type="hidden" name="type" value={selectedType} />
                                        </div>
                                    </div>

                                    {/* Sección 2: Fechas, Plazos y Parámetros */}
                                    <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border/70 shadow-xs space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                                                        Fechas y Plazos
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">Plazos de apertura y vencimiento de la entrega</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="openDateLocal" className="text-xs font-semibold flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Fecha de Apertura
                                                    </Label>
                                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Opcional</span>
                                                </div>
                                                <Input
                                                    id="openDateLocal"
                                                    name="openDateLocal"
                                                    type="datetime-local"
                                                    defaultValue={importedData?.openDateLocal || (activity?.openDate ? new Date(new Date(activity.openDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")}
                                                    className="h-9 font-mono text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="deadlineLocal" className="text-xs font-semibold flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                                        Fecha Límite
                                                    </Label>
                                                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">Obligatorio</span>
                                                </div>
                                                <Input
                                                    id="deadlineLocal"
                                                    name="deadlineLocal"
                                                    type="datetime-local"
                                                    defaultValue={importedData?.deadlineLocal || (activity?.deadline ? new Date(new Date(activity.deadline).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : defaultDeadline)}
                                                    className="h-9 font-mono text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Accesos rápidos de fecha límite */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className="text-[11px] font-medium text-muted-foreground mr-1">Plazos rápidos:</span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuickDeadline(3)}
                                                className="h-6 text-[10px] px-2 rounded-md hover:bg-primary/10"
                                            >
                                                + 3 días
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuickDeadline(7)}
                                                className="h-6 text-[10px] px-2 rounded-md hover:bg-primary/10"
                                            >
                                                + 1 semana
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuickDeadline(14)}
                                                className="h-6 text-[10px] px-2 rounded-md hover:bg-primary/10"
                                            >
                                                + 2 semanas
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuickDeadline(30)}
                                                className="h-6 text-[10px] px-2 rounded-md hover:bg-primary/10"
                                            >
                                                + 1 mes
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Modalidad de Entrega (Individual o Grupal) */}
                                    <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border/70 shadow-xs space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                                                        <span>Activar Entrega Grupal</span>
                                                        {isGroupActivity && (
                                                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                                                Equipos
                                                            </Badge>
                                                        )}
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Solo el líder del grupo realiza la entrega; la nota se asigna por igual a todos
                                                    </p>
                                                </div>
                                            </div>

                                            <Switch
                                                checked={isGroupActivity}
                                                onCheckedChange={setIsGroupActivity}
                                            />
                                        </div>

                                        {isGroupActivity && (
                                            <div className="space-y-3 pt-1">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div
                                                        onClick={() => setGroupScope("COURSE")}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1.5 select-none text-left",
                                                            groupScope === "COURSE"
                                                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                                                : "border-border/60 bg-card/60 hover:bg-muted/40"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="h-3.5 w-3.5 text-primary" />
                                                                <span className="font-bold text-xs text-foreground">Grupos de la Ficha</span>
                                                            </div>
                                                            {groupScope === "COURSE" && (
                                                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-bold px-1.5 py-0">
                                                                    Global
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                                            Usa los equipos predeterminados de la ficha/curso.
                                                        </p>
                                                    </div>

                                                    <div
                                                        onClick={() => setGroupScope("ACTIVITY")}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1.5 select-none text-left",
                                                            groupScope === "ACTIVITY"
                                                                ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30"
                                                                : "border-border/60 bg-card/60 hover:bg-muted/40"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Target className="h-3.5 w-3.5 text-amber-500" />
                                                                <span className="font-bold text-xs text-foreground">Grupos Exclusivos</span>
                                                            </div>
                                                            {groupScope === "ACTIVITY" && (
                                                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-1.5 py-0">
                                                                    Exclusivo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                                                            Equipos configurados solo para esta actividad. No altera la ficha.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
                                                    <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                                                        <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                        <span>
                                                            {groupScope === "ACTIVITY"
                                                                ? "Equipos Exclusivos de esta Actividad"
                                                                : "Grupos Generales de la Ficha"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        {groupScope === "ACTIVITY"
                                                            ? "Los estudiantes conformarán equipos solo para esta actividad. Podrás configurar o ajustar los miembros y líderes desde la vista de detalle de la actividad usando el botón 'Equipos de la Actividad'."
                                                            : "Los estudiantes entregarán en los grupos conformados en la pestaña Estudiantes → Grupos de Trabajo. Solo el líder de cada equipo podrá enviar la entrega."}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        Al calificar la entrega del líder, <strong>la misma nota y retroalimentación se replicará automáticamente a todos los integrantes de su grupo</strong>.
                                                    </p>
                                                </div>

                                                {groupScope === "ACTIVITY" && (
                                                    <div className="pt-1">
                                                        {activity?.id ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (onOpenActivityGroups) {
                                                                        onOpenActivityGroups(activity);
                                                                    }
                                                                }}
                                                                className="w-full h-9 font-bold text-xs gap-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs cursor-pointer"
                                                            >
                                                                <Users className="h-4 w-4" />
                                                                <span>Configurar Equipos de esta Actividad (Abrir Gestor)</span>
                                                            </Button>
                                                        ) : (
                                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2.5">
                                                                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                                                <span>
                                                                    Al guardar esta nueva actividad, podrás configurar y asignar los integrantes inmediatamente con el botón <strong>"Configurar Equipos"</strong>.
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Columna Derecha: Configuración de Entrega (5 columnas) */}
                                <div className="lg:col-span-5 space-y-5 flex flex-col">
                                    <div className="p-4 sm:p-5 bg-card rounded-2xl border border-border/70 shadow-xs space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                    <FolderGit2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                                                        Configuración de Entrega
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">Requisitos de archivos y envíos</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {selectedType}
                                            </Badge>
                                        </div>
                                        
                                        {selectedType === "GITHUB" && (
                                            <div className="space-y-3.5 flex-1 flex flex-col">
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-semibold">Archivos a evaluar (GitHub)</Label>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Especifica los archivos del repositorio que la IA inspeccionará para aplicar la rúbrica.
                                                    </p>
                                                </div>

                                                <FilePathInput 
                                                    name="filePaths" 
                                                    placeholder="src/index.ts" 
                                                    defaultValue={importedData?.filePaths || activity?.filePaths || ""} 
                                                />

                                                {/* Opción para Activar Lista de Chequeo (GitHub) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Evalúa con IA el repositorio y permite al profesor verificar oralmente con preguntas la comprensión del estudiante para calcular la nota final ponderada.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            {/* Estado de criterios */}
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Configuración de Ponderación de la Nota Final (IA vs Docente) */}
                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <p className="text-[11px] text-muted-foreground leading-tight">
                                                                    Configura qué porcentaje de la nota final depende de la evaluación de la IA y cuánto de la sustentación del profesor:
                                                                </p>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    {/* Peso Evaluación IA */}
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Evaluación IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground leading-none pt-0.5">Código y rúbrica</p>
                                                                    </div>

                                                                    {/* Peso Evaluación Docente (Lista de Chequeo) */}
                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación Docente
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground leading-none pt-0.5">Preguntas y conceptos</p>
                                                                    </div>
                                                                </div>

                                                                {/* Barra visual de distribución */}
                                                                <div className="space-y-1 pt-1">
                                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                                                        <div 
                                                                            style={{ width: `${aiWeight}%` }} 
                                                                            className="bg-purple-500 transition-all duration-300" 
                                                                            title={`IA: ${aiWeight}%`}
                                                                        />
                                                                        <div 
                                                                            style={{ width: `${checklistWeight}%` }} 
                                                                            className="bg-blue-500 transition-all duration-300" 
                                                                            title={`Sustentación Docente: ${checklistWeight}%`}
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                                                        <span>IA: {aiWeight}%</span>
                                                                        <span>Docente: {checklistWeight}%</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-auto pt-3 border-t border-border/40">
                                                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                                                        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                            <span>Evaluación con Inteligencia Artificial</span>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                            Los estudiantes vincularán su repositorio de GitHub. El sistema clonará en sandbox seguro los archivos seleccionados y generará retroalimentación basada en la rúbrica de la siguiente pestaña.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "MANUAL" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-muted/20">
                                                    <div className="flex items-start space-x-3">
                                                        <Checkbox 
                                                            id="allowLinkSubmission" 
                                                            name="allowLinkSubmission" 
                                                            value="true" 
                                                            defaultChecked={importedData?.allowLinkSubmission !== undefined ? (importedData.allowLinkSubmission === "true" || importedData.allowLinkSubmission === true) : (activity?.allowLinkSubmission ?? true)} 
                                                            className="mt-0.5"
                                                        />
                                                        <div className="space-y-1">
                                                            <Label htmlFor="allowLinkSubmission" className="text-xs font-bold cursor-pointer">
                                                                Permitir envío de enlaces externos
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                Los estudiantes podrán adjuntar enlaces compartidos (Google Drive, OneDrive, Figma, Canva, etc.) junto con sus respuestas escritas.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-3.5 rounded-xl border border-border/50 bg-muted/10 text-xs text-muted-foreground space-y-1.5 mt-auto">
                                                    <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                                        Modalidad de Entrega Libre
                                                    </p>
                                                    <p className="text-[11px] leading-relaxed">
                                                        Ideal para entregas tradicionales, tareas de redacción o proyectos donde calificarás manualmente cada envío a través de la rúbrica sin procesamiento de IA.
                                                    </p>
                                                </div>
                                            </div>
                                        )}


                                        {selectedType === "PDF_REVIEW" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-2">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <FileText className="h-4 w-4 text-amber-500" />
                                                        <span>Revisión de Documento PDF</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        El estudiante entregará un enlace a su documento PDF. El asistente de IA procesará el contenido del informe y te preparará un resumen de cumplimiento criterio por criterio.
                                                    </p>
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (PDF Review) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-pdf" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Evalúa con IA el documento PDF y permite al profesor verificar oralmente con preguntas la comprensión del estudiante para calcular la nota final ponderada.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-pdf"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            {/* Estado de criterios */}
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Configuración de Ponderación de la Nota Final (IA vs Docente) */}
                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <p className="text-[11px] text-muted-foreground leading-tight">
                                                                    Configura qué porcentaje de la nota final depende de la evaluación de la IA y cuánto de la sustentación del profesor:
                                                                </p>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    {/* Peso Evaluación IA */}
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Evaluación IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground leading-none pt-0.5">Informe y rúbrica</p>
                                                                    </div>

                                                                    {/* Peso Evaluación Docente (Lista de Chequeo) */}
                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación Docente
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground leading-none pt-0.5">Preguntas y sustentación</p>
                                                                    </div>
                                                                </div>

                                                                {/* Barra visual de distribución */}
                                                                <div className="space-y-1 pt-1">
                                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                                                        <div 
                                                                            style={{ width: `${aiWeight}%` }} 
                                                                            className="bg-purple-500 transition-all duration-300" 
                                                                            title={`IA: ${aiWeight}%`}
                                                                        />
                                                                        <div 
                                                                            style={{ width: `${checklistWeight}%` }} 
                                                                            className="bg-blue-500 transition-all duration-300" 
                                                                            title={`Sustentación Docente: ${checklistWeight}%`}
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                                                        <span>IA: {aiWeight}%</span>
                                                                        <span>Docente: {checklistWeight}%</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3.5 rounded-xl border border-border/50 bg-muted/10 text-xs text-muted-foreground space-y-1 mt-auto">
                                                    <p className="font-semibold text-foreground text-xs">Instrucción recomendada</p>
                                                    <p className="text-[11px] leading-relaxed">
                                                        En la pestaña de <strong>Contenido y Rúbrica</strong>, detalla la estructura esperada del informe (Introducción, Metodología, Conclusiones) para que la IA brinde una evaluación precisa.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "CODE_CHALLENGE" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                        <span>Taller de Código (Resolución en Monaco Editor)</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        El estudiante resolverá los archivos asignados dentro de un editor Monaco integrado (VS Code). Redacta en <strong>Contenido y Rúbrica</strong> las instrucciones y configura aquí los archivos iniciales.
                                                    </p>
                                                </div>

                                                {/* Gestor de Archivos del Taller */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <Code2 className="h-3.5 w-3.5 text-primary" />
                                                            <Label className="text-xs font-bold text-foreground">Archivos a Resolver</Label>
                                                            <Badge variant="outline" className="text-[10px] font-mono">{challengeFiles.length} archivos</Badge>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const newId = Date.now().toString();
                                                                const currentFile = challengeFiles.find(f => f.id === selectedChallengeFileId) || challengeFiles[challengeFiles.length - 1];
                                                                const currentExt = currentFile?.name?.includes('.') ? currentFile.name.split('.').pop()?.toLowerCase() : null;
                                                                const ext = currentExt || getExtensionFromLanguage(challengeLanguage);
                                                                const newFileName = `archivo_${challengeFiles.length + 1}.${ext}`;
                                                                const newLang = getLanguageFromFileName(newFileName);
                                                                const newFile = {
                                                                    id: newId,
                                                                    name: newFileName,
                                                                    content: getDefaultStarterCodeForLanguage(newLang),
                                                                };
                                                                setChallengeFiles([...challengeFiles, newFile]);
                                                                setSelectedChallengeFileId(newId);
                                                            }}
                                                            className="h-6 text-[11px] gap-1 px-2 text-primary hover:text-primary"
                                                        >
                                                            <Plus className="h-3 w-3" /> Añadir Archivo
                                                        </Button>
                                                    </div>

                                                    {/* Pestañas de Archivos (multilínea sin scroll) */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/60">
                                                        {challengeFiles.map((file) => (
                                                            <div
                                                                key={file.id}
                                                                onClick={() => setSelectedChallengeFileId(file.id)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium cursor-pointer border transition-all whitespace-nowrap shrink-0 select-none shadow-2xs",
                                                                    selectedChallengeFileId === file.id
                                                                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                                                        : "bg-background hover:bg-muted text-muted-foreground border-border/60"
                                                                )}
                                                            >
                                                                <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                                <span>{file.name}</span>
                                                                {challengeFiles.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const filtered = challengeFiles.filter(f => f.id !== file.id);
                                                                            setChallengeFiles(filtered);
                                                                            if (selectedChallengeFileId === file.id) {
                                                                                setSelectedChallengeFileId(filtered[0]?.id || "1");
                                                                            }
                                                                        }}
                                                                        className="h-4 w-4 rounded hover:bg-black/20 flex items-center justify-center text-[10px] ml-0.5"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Editor del archivo seleccionado */}
                                                    {(() => {
                                                        const currentFile = challengeFiles.find(f => f.id === selectedChallengeFileId) || challengeFiles[0];
                                                        if (!currentFile) return null;
                                                        const currentFileIndex = challengeFiles.findIndex(f => f.id === currentFile.id);
                                                        const currentLang = getLanguageFromFileName(currentFile.name);

                                                        return (
                                                            <div className="space-y-2 pt-1">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    <div>
                                                                        <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Nombre del archivo:</span>
                                                                        <Input
                                                                            value={currentFile.name}
                                                                            onChange={(e) => {
                                                                                const newName = e.target.value;
                                                                                const oldLang = getLanguageFromFileName(currentFile.name);
                                                                                const newLang = getLanguageFromFileName(newName);
                                                                                const updated = [...challengeFiles];
                                                                                let newContent = currentFile.content;
                                                                                if (oldLang !== newLang && (currentFile.content.includes("function solucion") || currentFile.content.includes("def solucion") || currentFile.content.trim() === "")) {
                                                                                    newContent = getDefaultStarterCodeForLanguage(newLang);
                                                                                }
                                                                                updated[currentFileIndex] = { ...currentFile, name: newName, content: newContent };
                                                                                setChallengeFiles(updated);
                                                                            }}
                                                                            placeholder="ej. solucion.py, index.js"
                                                                            className="h-7 text-xs font-mono"
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Lenguaje del Archivo:</span>
                                                                        <select
                                                                            value={currentLang}
                                                                            onChange={(e) => {
                                                                                const selectedLang = e.target.value;
                                                                                const ext = getExtensionFromLanguage(selectedLang);
                                                                                const baseName = currentFile.name.includes('.') ? currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) : currentFile.name;
                                                                                const newName = `${baseName || "solucion"}.${ext}`;
                                                                                const updated = [...challengeFiles];
                                                                                let newContent = currentFile.content;
                                                                                if (currentFile.content.includes("function solucion") || currentFile.content.includes("def solucion") || currentFile.content.includes("public class Solucion") || currentFile.content.trim() === "") {
                                                                                    newContent = getDefaultStarterCodeForLanguage(selectedLang);
                                                                                }
                                                                                updated[currentFileIndex] = { ...currentFile, name: newName, content: newContent };
                                                                                setChallengeFiles(updated);
                                                                            }}
                                                                            className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                                                                        >
                                                                            <optgroup label="Lenguajes de Programación">
                                                                                <option value="kotlin">Kotlin (.kt)</option>
                                                                                <option value="python">Python (.py)</option>
                                                                                <option value="javascript">JavaScript (.js)</option>
                                                                                <option value="typescript">TypeScript (.ts)</option>
                                                                                <option value="java">Java (.java)</option>
                                                                                <option value="cpp">C++ (.cpp)</option>
                                                                                <option value="csharp">C# (.cs)</option>
                                                                                <option value="php">PHP (.php)</option>
                                                                                <option value="go">Go (.go)</option>
                                                                                <option value="rust">Rust (.rs)</option>
                                                                                <option value="sql">SQL (.sql)</option>
                                                                            </optgroup>
                                                                            <optgroup label="Archivos de Configuración y Datos">
                                                                                <option value="json">JSON (.json)</option>
                                                                                <option value="yaml">YAML (.yaml, .yml)</option>
                                                                                <option value="xml">XML (.xml)</option>
                                                                                <option value="ini">Variables de Entorno (.env, .ini)</option>
                                                                                <option value="dockerfile">Dockerfile</option>
                                                                                <option value="shell">Script Bash / Shell (.sh)</option>
                                                                            </optgroup>
                                                                            <optgroup label="Web y Documentación">
                                                                                <option value="html">HTML (.html)</option>
                                                                                <option value="css">CSS (.css)</option>
                                                                                <option value="markdown">Markdown (.md)</option>
                                                                            </optgroup>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                                        <span className="text-[10px] text-muted-foreground font-semibold">Código inicial / Plantilla que verá el estudiante:</span>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => setShowFileCodePrompt(!showFileCodePrompt)}
                                                                                className="h-6 text-[10px] gap-1 px-2 border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 hover:text-purple-700 dark:hover:text-purple-300 font-semibold shadow-2xs cursor-pointer"
                                                                                title="Generar código inicial o plantilla para este archivo con IA"
                                                                            >
                                                                                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                                                <span>Generar con IA</span>
                                                                            </Button>
                                                                            <Badge variant="outline" className="text-[9px] font-mono capitalize">
                                                                                {currentLang}
                                                                            </Badge>
                                                                            <span className="text-[10px] text-muted-foreground font-mono">{currentFile.content.length} caracteres</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Panel interactivo de Prompt de IA para el archivo */}
                                                                    {showFileCodePrompt && (
                                                                        <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                                                                                    <Sparkles className="h-3.5 w-3.5" />
                                                                                    <span>Generar Plantilla de Código con IA para {currentFile.name}</span>
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => setShowFileCodePrompt(false)}
                                                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                                                                >
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>

                                                                            <div className="flex gap-2">
                                                                                <Input
                                                                                    value={fileCodePrompt}
                                                                                    onChange={(e) => setFileCodePrompt(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                                                            e.preventDefault();
                                                                                            handleGenerateFileCode(currentFile);
                                                                                        }
                                                                                    }}
                                                                                    placeholder={`ej. Crea la clase ${currentFile.name.replace(/\.[^.]+$/, '')} con atributos base y comentarios TODO`}
                                                                                    className="h-8 text-xs font-sans bg-background"
                                                                                    disabled={isGeneratingFileCode}
                                                                                />
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    disabled={isGeneratingFileCode || !fileCodePrompt.trim()}
                                                                                    onClick={() => handleGenerateFileCode(currentFile)}
                                                                                    className="h-8 px-3 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shrink-0 cursor-pointer"
                                                                                >
                                                                                    {isGeneratingFileCode ? (
                                                                                        <>
                                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                            <span>Generando...</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Sparkles className="h-3.5 w-3.5" />
                                                                                            <span>Generar</span>
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            </div>

                                                                            {/* Sugerencias Rápidas */}
                                                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                                                <span className="text-[10px] font-medium text-muted-foreground">Sugerencias:</span>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isGeneratingFileCode}
                                                                                    onClick={() => {
                                                                                        const p = `Genera la plantilla inicial para el archivo ${currentFile.name} acorde a los requerimientos del enunciado general, incluyendo firmas de métodos y comentarios // TODO: para el alumno`;
                                                                                        setFileCodePrompt(p);
                                                                                        handleGenerateFileCode(currentFile, p);
                                                                                    }}
                                                                                    className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer font-medium transition-colors"
                                                                                >
                                                                                    ✨ Estructura según Enunciado
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isGeneratingFileCode}
                                                                                    onClick={() => {
                                                                                        const p = `Crea la clase o módulo ${currentFile.name.replace(/\.[^.]+$/, '')} con atributos, constructor y métodos abstractos o vacíos con TODOs`;
                                                                                        setFileCodePrompt(p);
                                                                                        handleGenerateFileCode(currentFile, p);
                                                                                    }}
                                                                                    className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer font-medium transition-colors"
                                                                                >
                                                                                    🏷️ Clase Base con TODOs
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isGeneratingFileCode}
                                                                                    onClick={() => {
                                                                                        const p = `Genera la implementación de la subclase ${currentFile.name.replace(/\.[^.]+$/, '')} que herede de la clase principal, con constructor super y métodos a sobreescribir`;
                                                                                        setFileCodePrompt(p);
                                                                                        handleGenerateFileCode(currentFile, p);
                                                                                    }}
                                                                                    className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer font-medium transition-colors"
                                                                                >
                                                                                    🔄 Subclase con Herencia
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="rounded-xl border border-border/80 overflow-hidden bg-background">
                                                                        <Editor
                                                                            key={`${currentFile.id}_${currentLang}`}
                                                                            path={currentFile.name}
                                                                            height="200px"
                                                                            language={currentLang}
                                                                            theme={monacoTheme}
                                                                            value={currentFile.content}
                                                                            onChange={(val) => {
                                                                                const updated = [...challengeFiles];
                                                                                updated[currentFileIndex] = { ...currentFile, content: val || "" };
                                                                                setChallengeFiles(updated);
                                                                            }}
                                                                            options={{
                                                                                minimap: { enabled: false },
                                                                                fontSize: 12,
                                                                                lineNumbers: "on",
                                                                                scrollBeyondLastLine: false,
                                                                                automaticLayout: true,
                                                                                wordWrap: "on",
                                                                                tabSize: 4,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (Code Challenge) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-challenge" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Permite al profesor verificar oralmente con preguntas la comprensión del código resuelto por el estudiante.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-challenge"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Evaluación IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota Evaluación IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "VIDEO_PITCH" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <Video className="h-4 w-4 text-rose-500" />
                                                        <span>Sustentación en Video / Pitch con IA</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        El estudiante entregará el enlace de su video (YouTube, Loom, Google Drive). La IA analizará la narrativa, dominio técnico y cobertura de temas solicitados.
                                                    </p>
                                                </div>

                                                {/* Duración Máxima Recomendada */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                                            Duración Máxima Sugerida
                                                        </Label>
                                                        <Badge variant="outline" className="text-[10px] font-mono">{pitchMaxMinutes} minutos</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {[2, 3, 5, 7, 10].map((mins) => (
                                                            <Button
                                                                key={mins}
                                                                type="button"
                                                                size="sm"
                                                                variant={pitchMaxMinutes === mins ? "default" : "outline"}
                                                                onClick={() => setPitchMaxMinutes(mins)}
                                                                className="text-xs h-7 px-2.5 font-semibold"
                                                            >
                                                                {mins} min
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Temas / Apartados Requeridos en el Pitch */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                            <Label className="text-xs font-bold text-foreground">Temas Requeridos en el Pitch</Label>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setPitchRequiredTopics([
                                                                    ...pitchRequiredTopics,
                                                                    `Nuevo Apartado ${pitchRequiredTopics.length + 1}`
                                                                ]);
                                                            }}
                                                            className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary"
                                                        >
                                                            <Plus className="h-3 w-3" /> Añadir
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                                        {pitchRequiredTopics.map((topic, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
                                                                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">#{idx + 1}</span>
                                                                <Input
                                                                    value={topic}
                                                                    onChange={(e) => {
                                                                        const updated = [...pitchRequiredTopics];
                                                                        updated[idx] = e.target.value;
                                                                        setPitchRequiredTopics(updated);
                                                                    }}
                                                                    className="h-6 text-xs flex-1 border-none shadow-none focus-visible:ring-0 p-0"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setPitchRequiredTopics(pitchRequiredTopics.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (Video Pitch) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-pitch" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Combina el análisis multimodal de la IA con la evaluación oral en vivo del docente.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-pitch"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Pitch IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota Pitch/IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "AUDIO_DEFENSE" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <Mic className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                                        <span>Sustentación en Audio / Podcast con IA</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        El estudiante entregará el enlace de su grabación de audio o podcast técnico (Vocaroo, Google Drive, Spotify, archivo directo MP3/WAV). La IA analizará la argumentación oral, coherencia, solidez conceptual y cobertura del enunciado.
                                                    </p>
                                                </div>

                                                {/* Duración Máxima Recomendada */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                                            Duración Máxima Sugerida
                                                        </Label>
                                                        <Badge variant="outline" className="text-[10px] font-mono">{audioMaxMinutes} minutos</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {[2, 3, 5, 7, 10, 15].map((mins) => (
                                                            <Button
                                                                key={mins}
                                                                type="button"
                                                                size="sm"
                                                                variant={audioMaxMinutes === mins ? "default" : "outline"}
                                                                onClick={() => setAudioMaxMinutes(mins)}
                                                                className="text-xs h-7 px-2.5 font-semibold"
                                                            >
                                                                {mins} min
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Temas / Apartados Requeridos en el Audio */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />
                                                            <Label className="text-xs font-bold text-foreground">Temas Requeridos en el Audio</Label>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAudioRequiredTopics([
                                                                    ...audioRequiredTopics,
                                                                    `Nuevo Apartado ${audioRequiredTopics.length + 1}`
                                                                ]);
                                                            }}
                                                            className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary"
                                                        >
                                                            <Plus className="h-3 w-3" /> Añadir
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                                        {audioRequiredTopics.map((topic, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
                                                                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">#{idx + 1}</span>
                                                                <Input
                                                                    value={topic}
                                                                    onChange={(e) => {
                                                                        const updated = [...audioRequiredTopics];
                                                                        updated[idx] = e.target.value;
                                                                        setAudioRequiredTopics(updated);
                                                                    }}
                                                                    className="h-7 text-xs font-medium"
                                                                />
                                                                {audioRequiredTopics.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setAudioRequiredTopics(audioRequiredTopics.filter((_, i) => i !== idx));
                                                                        }}
                                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (Audio Defense) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-audio" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Combina la evaluación del audio con IA y una sustentación oral directa con el profesor.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-audio"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Audio IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota Audio IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "AI_INTERVIEW" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <MessageSquareQuote className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                        <span>Simulación de Entrevista Técnica / Examen Oral</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        La IA actúa como entrevistador técnico. Formula preguntas secuenciales y adaptativas al estudiante según sus respuestas y califica su solvencia conceptual.
                                                    </p>
                                                </div>

                                                {/* Nivel / Rol Objetivo */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">Nivel de Exigencia / Rol</Label>
                                                    <div className="flex items-center gap-2">
                                                        {(["Junior", "Semi-Senior", "Senior"] as const).map((role) => (
                                                            <Button
                                                                key={role}
                                                                type="button"
                                                                size="sm"
                                                                variant={interviewTargetRole === role ? "default" : "outline"}
                                                                onClick={() => setInterviewTargetRole(role)}
                                                                className="text-xs h-7 px-3 font-semibold"
                                                            >
                                                                {role}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Cantidad de Preguntas */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-semibold">Número de Preguntas a Formular</Label>
                                                        <Badge variant="outline" className="text-[10px] font-mono">{interviewQuestionsCount} preguntas</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {[3, 4, 5, 7].map((num) => (
                                                            <Button
                                                                key={num}
                                                                type="button"
                                                                size="sm"
                                                                variant={interviewQuestionsCount === num ? "default" : "outline"}
                                                                onClick={() => setInterviewQuestionsCount(num)}
                                                                className="text-xs h-7 px-3 font-semibold"
                                                            >
                                                                {num} preguntas
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Áreas de Enfoque */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-foreground">Áreas Temáticas de la Entrevista</Label>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setInterviewFocusAreas([
                                                                    ...interviewFocusAreas,
                                                                    `Nueva Área ${interviewFocusAreas.length + 1}`
                                                                ]);
                                                            }}
                                                            className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary"
                                                        >
                                                            <Plus className="h-3 w-3" /> Añadir
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                        {interviewFocusAreas.map((area, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
                                                                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">#{idx + 1}</span>
                                                                <Input
                                                                    value={area}
                                                                    onChange={(e) => {
                                                                        const updated = [...interviewFocusAreas];
                                                                        updated[idx] = e.target.value;
                                                                        setInterviewFocusAreas(updated);
                                                                    }}
                                                                    className="h-6 text-xs flex-1 border-none shadow-none focus-visible:ring-0 p-0"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setInterviewFocusAreas(interviewFocusAreas.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (Entrevista con IA) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-interview" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Combina las respuestas evaluadas por la IA con la evaluación oral del docente.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-interview"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Entrevista IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota Entrevista IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedType === "DB_MODELING" && (
                                            <div className="space-y-4 flex-1 flex flex-col">
                                                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                                                        <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                        <span>Base de Datos & Programación SQL</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        El estudiante entrega su script .sql (DDL con tablas/claves, DML con datos de prueba y manipulación, y consultas) junto al modelo entidad-relación. La IA audita sintaxis, normalización (3FN), restricciones e integridad de datos.
                                                    </p>
                                                </div>

                                                {/* Modalidad de Evaluación: Sandbox vs Cloud PostgreSQL */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">Modalidad de Evaluación</Label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDbDeliveryMode("sandbox")}
                                                            className={cn(
                                                                "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                                                                dbDeliveryMode === "sandbox"
                                                                    ? "border-indigo-500 bg-indigo-500/10 text-foreground font-semibold"
                                                                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/20"
                                                            )}
                                                        >
                                                            <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", dbDeliveryMode === "sandbox" ? "text-indigo-600" : "text-muted-foreground/40")} />
                                                            <div>
                                                                <p className="text-xs font-bold leading-tight">📦 Sandbox Local (PGlite)</p>
                                                                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">El estudiante redacta y entrega su script SQL. Se ejecuta efímeramente en RAM.</p>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDbDeliveryMode("cloud")}
                                                            className={cn(
                                                                "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                                                                dbDeliveryMode === "cloud"
                                                                    ? "border-blue-500 bg-blue-500/10 text-foreground font-semibold"
                                                                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/20"
                                                            )}
                                                        >
                                                            <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", dbDeliveryMode === "cloud" ? "text-blue-600" : "text-muted-foreground/40")} />
                                                            <div>
                                                                <p className="text-xs font-bold leading-tight">☁️ Nube / Cloud (PostgreSQL MCP)</p>
                                                                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Para proyectos finales. El alumno entrega la URI de su base de datos real (Supabase, Neon, Render).</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Alcance del Script SQL y Modelo */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                            <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                                            Alcance del Script SQL y Evaluación
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">Componentes a auditar</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDbIncludeDdl(!dbIncludeDdl)}
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                                                                dbIncludeDdl ? "border-indigo-500/50 bg-indigo-500/10 text-foreground font-semibold" : "border-border/60 bg-background text-muted-foreground"
                                                            )}
                                                        >
                                                            <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", dbIncludeDdl ? "text-indigo-600" : "text-muted-foreground/40")} />
                                                            <div>
                                                                <p className="text-[11px] leading-tight">Estructura DDL</p>
                                                                <p className="text-[9px] text-muted-foreground font-normal">CREATE TABLE, PK, FK, NOT NULL</p>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDbIncludeDml(!dbIncludeDml)}
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                                                                dbIncludeDml ? "border-emerald-500/50 bg-emerald-500/10 text-foreground font-semibold" : "border-border/60 bg-background text-muted-foreground"
                                                            )}
                                                        >
                                                            <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", dbIncludeDml ? "text-emerald-600" : "text-muted-foreground/40")} />
                                                            <div>
                                                                <p className="text-[11px] leading-tight">Datos DML</p>
                                                                <p className="text-[9px] text-muted-foreground font-normal">INSERT INTO, datos de prueba</p>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDbIncludeQueries(!dbIncludeQueries)}
                                                            className={cn(
                                                                "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                                                                dbIncludeQueries ? "border-blue-500/50 bg-blue-500/10 text-foreground font-semibold" : "border-border/60 bg-background text-muted-foreground"
                                                            )}
                                                        >
                                                            <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", dbIncludeQueries ? "text-blue-600" : "text-muted-foreground/40")} />
                                                            <div>
                                                                <p className="text-[11px] leading-tight">Consultas DQL</p>
                                                                <p className="text-[9px] text-muted-foreground font-normal">SELECT con JOIN, agregación</p>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Motor de BD Objetivo */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">Motor de Base de Datos Objetivo</Label>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {["PostgreSQL", "MySQL", "SQLite", "Oracle", "SQL Server"].map((engine) => (
                                                            <Button
                                                                key={engine}
                                                                type="button"
                                                                size="sm"
                                                                variant={dbTargetEngine === engine ? "default" : "outline"}
                                                                onClick={() => setDbTargetEngine(engine)}
                                                                className="text-xs h-7 px-3 font-semibold"
                                                            >
                                                                {engine}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Nivel de Normalización */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-semibold">Nivel de Normalización Requerido</Label>
                                                        <Badge variant="outline" className="text-[10px] font-mono">{dbRequiredNormalization}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {["2FN", "3FN", "BCNF"].map((norm) => (
                                                            <Button
                                                                key={norm}
                                                                type="button"
                                                                size="sm"
                                                                variant={dbRequiredNormalization === norm ? "default" : "outline"}
                                                                onClick={() => setDbRequiredNormalization(norm)}
                                                                className="text-xs h-7 px-3 font-semibold"
                                                            >
                                                                {norm}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Entidades Requeridas */}
                                                <div className="p-3 bg-muted/15 rounded-xl border border-border/60 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-foreground">Entidades / Tablas Obligatorias</Label>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setDbRequiredEntities([
                                                                    ...dbRequiredEntities,
                                                                    `Tabla_${dbRequiredEntities.length + 1}`
                                                                ]);
                                                            }}
                                                            className="h-6 text-[10px] gap-1 px-2 text-primary hover:text-primary"
                                                        >
                                                            <Plus className="h-3 w-3" /> Añadir
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                        {dbRequiredEntities.map((entity, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-background p-1.5 rounded-lg border">
                                                                <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">#{idx + 1}</span>
                                                                <Input
                                                                    value={entity}
                                                                    onChange={(e) => {
                                                                        const updated = [...dbRequiredEntities];
                                                                        updated[idx] = e.target.value;
                                                                        setDbRequiredEntities(updated);
                                                                    }}
                                                                    className="h-6 text-xs flex-1 border-none shadow-none focus-visible:ring-0 p-0"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setDbRequiredEntities(dbRequiredEntities.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Opción para Activar Lista de Chequeo (Modelado de BD) */}
                                                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="checklist-switch-db" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                <ListChecks className="h-4 w-4 text-primary" />
                                                                Activar Lista de Chequeo (Sustentación Docente)
                                                            </Label>
                                                            <p className="text-[11px] text-muted-foreground leading-snug">
                                                                Permite sustentar oralmente las decisiones de diseño del modelo y claves primarias/foráneas.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="checklist-switch-db"
                                                            checked={hasChecklist}
                                                            onCheckedChange={(checked) => {
                                                                setHasChecklist(checked);
                                                                if (checked && criteria.length === 0) {
                                                                    const extracted = parseCriteriaFromMarkdown(statement);
                                                                    setCriteria(extracted);
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                    </div>

                                                    {hasChecklist && (
                                                        <div className="space-y-3 pt-2.5 border-t border-primary/15 animate-in fade-in">
                                                            <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Pestaña "Lista de Chequeo" activa
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                                        {criteria.length} {criteria.length === 1 ? 'criterio' : 'criterios'} ({criteriaSum}%)
                                                                    </Badge>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setActiveTab("checklist")}
                                                                        className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 font-bold"
                                                                    >
                                                                        Editar Criterios →
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 bg-background/90 rounded-xl border border-primary/20 space-y-2.5 shadow-2xs">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                                                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                                                        Ponderación de la Nota Final
                                                                    </Label>
                                                                    <Badge variant="outline" className="text-[10px] font-mono font-bold border-primary/30 text-primary">
                                                                        Total: {aiWeight + checklistWeight}%
                                                                    </Badge>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2.5 pt-1">
                                                                    <div className="p-2.5 rounded-lg border bg-purple-500/[0.04] border-purple-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                                                <Sparkles className="h-3 w-3" /> Modelo IA
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{aiWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={aiWeight}
                                                                                onChange={(e) => handleAiWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="p-2.5 rounded-lg border bg-blue-500/[0.04] border-blue-500/20 space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <ListChecks className="h-3 w-3" /> Sustentación
                                                                            </span>
                                                                            <span className="font-mono font-bold text-xs">{checklistWeight}%</span>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                max="100"
                                                                                value={checklistWeight}
                                                                                onChange={(e) => handleChecklistWeightChange(parseInt(e.target.value, 10) || 0)}
                                                                                className="h-7 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-muted-foreground/80 bg-muted/30 p-1.5 rounded text-center">
                                                                    Fórmula: <strong>Nota Final = (Nota Modelo IA × {aiWeight}%) + (Nota Sustentación × {checklistWeight}%)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Contenido y Rúbrica */}
                        <TabsContent 
                            value="content" 
                            forceMount 
                            className={cn(
                                "flex-1 min-h-0 overflow-hidden p-3 sm:p-4 bg-muted/10 flex flex-col",
                                activeTab !== "content" && "!hidden"
                            )}
                        >
                            <div className="flex flex-col h-full min-h-0 overflow-hidden space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 px-1">
                                    <div>
                                        <Label className="text-xs sm:text-sm font-bold">
                                            Enunciado / Rúbrica de Evaluación (Markdown)
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                            Define los criterios de evaluación y porcentajes claros para la calificación.
                                            {selectedType !== "MANUAL" && (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium inline ml-1">
                                                    ⚠️ Pautas de formato físico de entrega (ZIP/PDF) serán ignoradas por la IA.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setAiInitialContent(undefined);
                                                setIsAIGeneratorOpen(true);
                                            }}
                                            className="h-8 text-xs font-semibold gap-1.5 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-xs transition-all cursor-pointer"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Generar Enunciado con IA
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setAiInitialContent(statement);
                                                setIsAIGeneratorOpen(true);
                                            }}
                                            disabled={!statement || statement.trim().length < 10}
                                            className="h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs"
                                            title="Toma el enunciado actual del editor y abre el chat de IA para modificarlo, adaptarlo o mejorarlo interactivamente"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                            Modificar con Chat IA
                                        </Button>
                                        <div className="text-[11px] text-muted-foreground items-center gap-1.5 hidden md:flex pl-2 border-l border-border/60">
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                            <span>Markdown con vista previa en vivo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 border border-border/70 rounded-xl overflow-hidden shadow-2xs min-h-0 h-full bg-background" data-color-mode={mode}>
                                    <MDEditor
                                        value={statement}
                                        onChange={(val) => setStatement(val || "")}
                                        height="100%"
                                        preview="live"
                                        className="h-full border-none"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Pestaña 3: Lista de Chequeo (Evaluación con Criterios) */}
                        {(selectedType === "GITHUB" || selectedType === "PDF_REVIEW" || selectedType === "CODE_CHALLENGE" || selectedType === "VIDEO_PITCH" || selectedType === "AI_INTERVIEW" || selectedType === "DB_MODELING") && hasChecklist && (
                            <TabsContent 
                                value="checklist" 
                                forceMount 
                                className={cn(
                                    "flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-muted/10 scrollbar-thin flex flex-col",
                                    activeTab !== "checklist" && "!hidden"
                                )}
                            >
                                <div className="w-full max-w-[1400px] mx-auto space-y-4 flex-1 flex flex-col">
                                    {/* Barra de herramientas superior */}
                                    <div className="p-4 bg-card rounded-2xl border border-border/70 shadow-xs flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                <ListChecks className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        Lista de Chequeo y Preguntas de Sustentación
                                                    </h3>
                                                    <Badge 
                                                        variant={criteriaSum === 100 ? "default" : "destructive"} 
                                                        className="text-xs font-mono font-bold"
                                                    >
                                                        Criterios: {criteriaSum}% {criteriaSum === 100 ? "✓" : "(Debe sumar 100%)"}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs font-mono font-bold border-primary/30 text-primary">
                                                        Ponderación Final: {checklistWeight}% Sustentación / {aiWeight}% IA
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Criterios conceptuales y preguntas orales para verificar comprensión. La nota final se ponderará: {checklistWeight}% Sustentación Docente + {aiWeight}% Evaluación IA.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isGeneratingCriteria || isGeneratingAlternative}
                                                onClick={() => handleGenerateCriteria(false)}
                                                className="text-xs h-8 gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary font-bold shadow-2xs"
                                                title="Genera varias preguntas con los temas y requerimientos más importantes del enunciado"
                                            >
                                                {isGeneratingCriteria ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                                                {criteria.length === 0 ? "Generar preguntas principales con IA" : "Regenerar preguntas principales"}
                                            </Button>

                                            {criteria.length > 0 && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isGeneratingCriteria || isGeneratingAlternative || isBalancingPercentages}
                                                        onClick={() => handleGenerateCriteria(true)}
                                                        className="text-xs h-8 gap-1.5 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold shadow-2xs transition-all"
                                                        title="Crea una nueva pregunta con IA y la añade a la lista sin cambiar las que ya existen"
                                                    >
                                                        {isGeneratingAlternative ? <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" /> : <Plus className="h-3.5 w-3.5 text-purple-600" />}
                                                        Crear una nueva sin cambiar existentes
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleAutoBalancePercentages}
                                                        className="text-xs h-8 gap-1.5 border-border/80 font-semibold hover:bg-muted/80 shadow-2xs text-foreground"
                                                        title="Ajustar y repartir equitativamente la ponderación al 100% de forma automática"
                                                    >
                                                        <Scale className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                        Ajustar 100% auto
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isBalancingPercentages || isGeneratingCriteria || isGeneratingAlternative}
                                                        onClick={handleAIBalancePercentages}
                                                        className="text-xs h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-2xs transition-all"
                                                        title="Calcular y asignar la ponderación con IA según la complejidad e importancia técnica de cada pregunta en el enunciado"
                                                    >
                                                        {isBalancingPercentages ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                                                        ) : (
                                                            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                        )}
                                                        Ponderar con IA por importancia
                                                    </Button>
                                                </>
                                            )}

                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleAddCriterion()}
                                                className="text-xs h-8 gap-1.5 font-bold shadow-xs bg-primary text-primary-foreground"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Añadir Criterio Manual
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Listado de Criterios */}
                                    {criteria.length === 0 ? (
                                        <div className="p-12 border-2 border-dashed border-border/70 rounded-2xl bg-card/50 text-center space-y-4 my-auto">
                                            <div className="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
                                                <ListChecks className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-1 max-w-md mx-auto">
                                                <h4 className="font-bold text-foreground text-sm">Sin criterios en la lista de chequeo</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Genera automáticamente las preguntas de sustentación y conceptos a evaluar a partir del enunciado con IA, o añádelos manualmente.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleGenerateCriteria(false)}
                                                    disabled={isGeneratingCriteria || isGeneratingAlternative}
                                                    className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
                                                >
                                                    {isGeneratingCriteria ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                    Generar preguntas con IA
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleAddCriterion()}
                                                    className="text-xs font-semibold gap-1.5"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Añadir Manualmente
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 flex-1 pb-4">
                                            {/* Divisor estilo Notebook antes de la primera celda */}
                                            <div className="relative py-2 my-0.5 group flex items-center justify-center">
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="w-full border-t border-dashed border-border/50 group-hover:border-primary/60 transition-colors" />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddCriterion(0)}
                                                    className="relative inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full bg-card border border-border/80 text-muted-foreground shadow-2xs hover:text-primary hover:border-primary hover:bg-primary/5 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-70 group-hover:opacity-100 focus:opacity-100"
                                                    title="Insertar celda de criterio al inicio (estilo Notebook)"
                                                >
                                                    <Plus className="h-3.5 w-3.5 text-primary group-hover:rotate-90 transition-transform duration-200" />
                                                    <span>+ Celda arriba</span>
                                                </button>
                                            </div>

                                            {criteria.map((crit, idx) => (
                                                <div key={crit.id || idx} className="space-y-3">
                                                    <div 
                                                        className="p-4 sm:p-5 bg-card rounded-2xl border border-border/80 shadow-xs hover:border-primary/40 transition-colors space-y-4"
                                                    >
                                                        {/* Cabecera: Número, Título y Ponderación */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-primary/5 text-primary border-primary/20 shrink-0 font-bold">
                                                                    #{idx + 1}
                                                                </Badge>
                                                                <Input
                                                                    value={crit.name}
                                                                    onChange={(e) => handleUpdateCriterion(idx, "name", e.target.value)}
                                                                    placeholder="Concepto o Criterio a evaluar (ej: Dominio de POO y Herencia)"
                                                                    className="h-8 font-bold text-xs flex-1 bg-background"
                                                                />
                                                            </div>

                                                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Label className="text-xs font-semibold text-muted-foreground">Ponderación:</Label>
                                                                    <div className="relative w-20">
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            max="100"
                                                                            value={crit.percentage}
                                                                            onChange={(e) => handleUpdateCriterion(idx, "percentage", parseInt(e.target.value, 10) || 0)}
                                                                            className="h-8 pr-6 text-xs font-mono font-bold text-right bg-background"
                                                                        />
                                                                        <span className="absolute right-2 top-2 text-xs text-muted-foreground font-mono font-bold">%</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center border-l pl-2 gap-1 border-border/70">
                                                                    {/* Botón estilo Notebook para insertar celda debajo */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleAddCriterion(idx + 1)}
                                                                        className="h-7 px-2 gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                                        title="Insertar una nueva celda de criterio debajo de esta (estilo Notebook)"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        <span className="hidden sm:inline">Insertar Celda</span>
                                                                    </Button>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={idx === 0}
                                                                        onClick={() => handleMoveCriterion(idx, "up")}
                                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                                        title="Subir criterio"
                                                                    >
                                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={idx === criteria.length - 1}
                                                                        onClick={() => handleMoveCriterion(idx, "down")}
                                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                                        title="Bajar criterio"
                                                                    >
                                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    {/* Botón tipo icono al lado de eliminar para verificar relación con el enunciado con IA */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={verifyingCriterionIndex !== null}
                                                                        onClick={() => handleVerifyCriterion(idx)}
                                                                        className={`h-7 w-7 p-0 transition-all ${
                                                                            verifiedMap[crit.id || idx]
                                                                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                                                                : "text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-500/10"
                                                                        }`}
                                                                        title="Verificar si esta pregunta tiene relación con el enunciado usando IA"
                                                                    >
                                                                        {verifyingCriterionIndex === idx ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                                                                        ) : verifiedMap[crit.id || idx] ? (
                                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                        ) : (
                                                                            <Sparkles className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveCriterion(idx)}
                                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                                        title="Eliminar criterio"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bloque de Preguntas de Sustentación para el Docente */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                            <div className="space-y-1.5 p-3 rounded-xl bg-primary/[0.03] border border-primary/15">
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                                                    <HelpCircle className="h-3.5 w-3.5" />
                                                                    <span>Preguntas de Sustentación (para interrogar al estudiante)</span>
                                                                </div>
                                                                <Textarea
                                                                    value={crit.question || ""}
                                                                    onChange={(e) => handleUpdateCriterion(idx, "question", e.target.value)}
                                                                    placeholder="Ej: ¿Por qué utilizaste herencia en esta clase? Explica cómo aplicas el polimorfismo y encapsulamiento..."
                                                                    rows={3}
                                                                    className="text-xs resize-y bg-background font-normal leading-relaxed"
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20">
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    <span>Respuesta Esperada / Conceptos Clave a Demostrar</span>
                                                                </div>
                                                                <Textarea
                                                                    value={crit.expectedAnswer || ""}
                                                                    onChange={(e) => handleUpdateCriterion(idx, "expectedAnswer", e.target.value)}
                                                                    placeholder="Ej: El estudiante debe justificar la abstracción, explicar el rol de la clase base y demostrar dominio de POO..."
                                                                    rows={3}
                                                                    className="text-xs resize-y bg-background font-normal leading-relaxed"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Aspectos técnicos de código */}
                                                        <div className="space-y-1">
                                                            <Label className="text-[11px] font-semibold text-muted-foreground">
                                                                Aspectos técnicos a verificar en el código / repositorio:
                                                            </Label>
                                                            <Textarea
                                                                value={crit.description}
                                                                onChange={(e) => handleUpdateCriterion(idx, "description", e.target.value)}
                                                                placeholder="Descripción de los archivos, clases o componentes de código que sustentan este criterio..."
                                                                rows={2}
                                                                className="text-xs resize-y bg-background/60"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Divisor estilo Notebook entre celdas y al final */}
                                                    <div className="relative py-2 my-0.5 group flex items-center justify-center">
                                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                            <div className="w-full border-t border-dashed border-border/50 group-hover:border-primary/60 transition-colors" />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddCriterion(idx + 1)}
                                                            className="relative inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full bg-card border border-border/80 text-muted-foreground shadow-2xs hover:text-primary hover:border-primary hover:bg-primary/5 hover:scale-105 active:scale-95 transition-all cursor-pointer opacity-70 group-hover:opacity-100 focus:opacity-100"
                                                            title={`Insertar celda de criterio ${idx === criteria.length - 1 ? "al final" : "aquí"} (estilo Notebook)`}
                                                        >
                                                            <Plus className="h-3.5 w-3.5 text-primary group-hover:rotate-90 transition-transform duration-200" />
                                                            <span>+ Celda {idx === criteria.length - 1 ? "al final" : "aquí"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </form>

                {/* Modal para Generar Enunciado con IA */}
                <AIGenerateDialog
                    isOpen={isAIGeneratorOpen}
                    onClose={() => {
                        setIsAIGeneratorOpen(false);
                        setAiInitialContent(undefined);
                    }}
                    type="statement"
                    activityType={selectedType}
                    initialContent={aiInitialContent}
                    onUseContent={(content) => {
                        setStatement(content);

                        // Si el título está vacío, sugerir título extraído del enunciado
                        const titleInput = document.getElementById("title") as HTMLInputElement;
                        if (titleInput && !titleInput.value.trim()) {
                            const lines = content.split("\n");
                            const heading = lines.find((l) => l.trim().startsWith("#") || (l.trim().length > 5 && !l.trim().startsWith("-") && !l.trim().startsWith("*")));
                            if (heading) {
                                const cleanTitle = heading.replace(/^[#*\s-]+/, "").replace(/[*_`]/g, "").trim();
                                if (cleanTitle.length >= 4 && cleanTitle.length <= 80) {
                                    titleInput.value = cleanTitle;
                                }
                            }
                        }

                        // Sincronizar archivos automáticamente si es CODE_CHALLENGE
                        if (selectedType === "CODE_CHALLENGE") {
                            const extractedFiles = extractCodeChallengeFilesFromMarkdown(content);
                            if (extractedFiles.length > 0) {
                                setChallengeFiles(extractedFiles);
                                setSelectedChallengeFileId(extractedFiles[0].id);
                                const detectedLang = getLanguageFromFileName(extractedFiles[0].name);
                                setChallengeLanguage(detectedLang);
                                toast.info(`Se sincronizaron automáticamente ${extractedFiles.length} archivo(s) para el taller: ${extractedFiles.map(f => f.name).join(", ")}`);
                            }
                        }

                        if (hasChecklist) {
                            const extracted = parseCriteriaFromMarkdown(content);
                            if (extracted.length > 0) {
                                setCriteria(extracted);
                                toast.success("Enunciado generado e insertado. Criterios sincronizados con la Lista de Chequeo.");
                            }
                        }
                    }}
                />
            </DialogContent>
        </Dialog>

        {showStudentPreview && (
            <Dialog open={showStudentPreview} onOpenChange={setShowStudentPreview}>
                <DialogContent showCloseButton={false} className="fixed inset-0 top-0 left-0 z-[100] w-screen h-screen max-w-none! sm:max-w-none! max-h-none! border-none rounded-none translate-x-0! translate-y-0! p-0 flex flex-col bg-background overflow-hidden">
                    <DialogTitle className="sr-only">Modo Estudiante - Vista Previa</DialogTitle>
                    <CodeChallengeActivityDetails
                        activity={previewActivity}
                        userId="teacher-preview-id"
                        studentName="Profesor (Modo Estudiante)"
                        isTeacherPreview={true}
                        onClosePreview={() => setShowStudentPreview(false)}
                    />
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}

const getActivityTypeInfo = (type: string) => {
    switch (type) {
        case "GITHUB":
            return {
                label: "IA GitHub",
                icon: FolderGit2,
                badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
                accentColor: "from-purple-500/30 via-purple-500/10 to-transparent",
                iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
            };
        case "CODE_PROJECT":
            return {
                label: "Proyecto Código",
                icon: Code2,
                badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
                accentColor: "from-blue-500/30 via-blue-500/10 to-transparent",
                iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            };
        case "CODE_CHALLENGE":
            return {
                label: "Code Challenge",
                icon: Terminal,
                badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
                accentColor: "from-indigo-500/30 via-indigo-500/10 to-transparent",
                iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
            };
        case "DATABASE":
            return {
                label: "Bases de Datos",
                icon: Database,
                badgeColor: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
                accentColor: "from-cyan-500/30 via-cyan-500/10 to-transparent",
                iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
            };
        case "AUDIO_DEFENSE":
            return {
                label: "Defensa Oral",
                icon: Headphones,
                badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
                accentColor: "from-rose-500/30 via-rose-500/10 to-transparent",
                iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            };
        case "AI_INTERVIEW":
            return {
                label: "Entrevista IA",
                icon: MessageSquareQuote,
                badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
                accentColor: "from-teal-500/30 via-teal-500/10 to-transparent",
                iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
            };
        case "PDF_REVIEW":
            return {
                label: "Revisión PDF",
                icon: FileText,
                badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                accentColor: "from-emerald-500/30 via-emerald-500/10 to-transparent",
                iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            };
        default:
            return {
                label: "Manual",
                icon: Calendar,
                badgeColor: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25",
                accentColor: "from-zinc-500/30 via-zinc-500/10 to-transparent",
                iconBg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
            };
    }
};

export function ActivityManager({ 
    courseId, 
    activities, 
    enrolledStudents = [] 
}: { 
    courseId: string; 
    activities: any[]; 
    enrolledStudents?: any[]; 
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any | null>(null);
    const [activityForGroupsModal, setActivityForGroupsModal] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [isReordering, setIsReordering] = useState(false);

    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";

    if (!mounted) return null;

    const handleStartCreate = () => {
        setEditingActivity(null);
        setIsDialogOpen(true);
    };

    const handleStartEdit = (activity: any) => {
        setEditingActivity(activity);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingActivity(null);
    };

    const handleReorder = async (direction: 'up' | 'down', index: number) => {
        if (isReordering) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === activities.length - 1) return;

        setIsReordering(true);
        const newActivities = [...activities];
        const temp = newActivities[index];
        newActivities[index] = newActivities[direction === 'up' ? index - 1 : index + 1];
        newActivities[direction === 'up' ? index - 1 : index + 1] = temp;

        const activityIds = newActivities.map(a => a.id);

        try {
            await import("@/features/teacher/actions/activityActions").then(mod => mod.reorderActivitiesAction(courseId, activityIds));
        } catch (error) {
            console.error("Failed to reorder", error);
        } finally {
            setIsReordering(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">Actividades del Curso</h3>
                    <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                        {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
                    </Badge>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                        <Button
                            type="button"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("grid")}
                            title="Vista de Tarjetas AI Canvas"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1.5" />
                            <span>Tarjetas AI Canvas</span>
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs"
                            onClick={() => setViewMode("table")}
                            title="Vista de Tabla"
                        >
                            <List className="h-4 w-4 mr-1.5" />
                            <span>Tabla</span>
                        </Button>
                    </div>

                    <Button onClick={handleStartCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Actividad
                    </Button>
                </div>
            </div>

            {activities.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-card">
                    <p className="text-muted-foreground mb-4 text-sm">No hay actividades creadas en este curso aún.</p>
                    <Button onClick={handleStartCreate} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Crear primera actividad
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {activities.map((activity, index) => {
                        const typeInfo = getActivityTypeInfo(activity.type);
                        const totalSubmissions = activity.type === "MANUAL" ? null : (activity.submissions?.length || 0);

                        return (
                            <div
                                key={activity.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200"
                            >
                                {/* Barra superior de acento según tipo */}
                                <div className={cn("absolute top-0 inset-x-0 h-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity", typeInfo.accentColor)} />

                                {/* Header de la tarjeta: Icono + Número + Badges */}
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs shrink-0", typeInfo.iconBg)}>
                                            <typeInfo.icon className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
                                            #{index + 1}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                                        {activity.isGroupActivity && activity.groupScope === "ACTIVITY" && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-bold px-1.5 py-0 gap-1 border shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                            >
                                                <Target className="h-2.5 w-2.5 text-amber-500" />
                                                <span>Exclusivo</span>
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0 border shrink-0", typeInfo.badgeColor)}>
                                            {typeInfo.label}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Contenido Principal: Título & Metadatos */}
                                <div className="flex-1 min-w-0 space-y-2 py-0.5">
                                    <Link
                                        href={`/dashboard/teacher/courses/${courseId}/activities/${activity.id}`}
                                        className="block group/link"
                                    >
                                        <h4 
                                            className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover/link:text-primary transition-colors cursor-pointer" 
                                            title={activity.title}
                                        >
                                            {activity.title}
                                        </h4>
                                    </Link>

                                    {/* Chips compactos: Fecha límite y Entregas */}
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                        <div className="flex items-center gap-1 shrink-0" title="Fecha límite de entrega">
                                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                                            <span>{format(new Date(activity.deadline), "dd MMM, p")}</span>
                                        </div>

                                        {totalSubmissions !== null && (
                                            <div className="flex items-center gap-1 font-semibold text-foreground/80 shrink-0">
                                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                                <span>{totalSubmissions} entregas</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Barra de Acciones Inferior Compacta */}
                                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/50">
                                    {/* Reordenar */}
                                    <div className="flex items-center gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                            disabled={index === 0 || isReordering}
                                            onClick={() => handleReorder('up', index)}
                                            title="Mover arriba"
                                        >
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                            disabled={index === activities.length - 1 || isReordering}
                                            onClick={() => handleReorder('down', index)}
                                            title="Mover abajo"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="flex items-center gap-1">
                                        {activity.isGroupActivity && activity.groupScope === "ACTIVITY" && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 cursor-pointer text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                                                            onClick={() => setActivityForGroupsModal(activity)}
                                                        >
                                                            <Users className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Configurar Equipos Exclusivos</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link href={`/dashboard/teacher/courses/${courseId}/activities/${activity.id}`}>
                                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Ver entregas</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                                        onClick={() => handleStartEdit(activity)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Editar actividad</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {activity.type !== "MANUAL" && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div>
                                                            <MissingSubmissionsDialog 
                                                                activityId={activity.id} 
                                                                activityTitle={activity.title} 
                                                                trigger={
                                                                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40 cursor-pointer">
                                                                        <UserX className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                }
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Ver estudiantes sin entrega</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}

                                        <Dialog>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60 dark:border-red-800/40 cursor-pointer">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Eliminar actividad</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <DialogContent>
                                                <form action={async (formData) => {
                                                    await deleteActivityAction(formData);
                                                }}>
                                                    <input type="hidden" name="courseId" value={courseId} />
                                                    <input type="hidden" name="activityId" value={activity.id} />
                                                    <DialogHeader>
                                                        <DialogTitle>Confirmar eliminación</DialogTitle>
                                                        <DialogDescription>
                                                            Escribe <strong>ELIMINAR</strong> para confirmar.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid grid-cols-4 items-center gap-4 py-4">
                                                        <Label htmlFor={`confirm-${activity.id}`} className="text-right">Confirmación</Label>
                                                        <Input id={`confirm-${activity.id}`} name="confirmText" placeholder="ELIMINAR" pattern="^ELIMINAR$" required className="col-span-3" />
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="submit" variant="destructive">Confirmar eliminación</Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-2xs">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="w-[50px] pl-4 font-bold uppercase tracking-wider text-xs">Orden</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-xs">Título</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Tipo</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden md:table-cell">Fecha Límite</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Entregas</TableHead>
                                <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities.map((activity, index) => (
                                <TableRow key={activity.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={index === 0 || isReordering}
                                                onClick={() => handleReorder('up', index)}
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={index === activities.length - 1 || isReordering}
                                                onClick={() => handleReorder('down', index)}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex items-center flex-wrap gap-1.5">
                                                <span>{activity.title}</span>
                                                {activity.isGroupActivity && activity.groupScope === "ACTIVITY" && (
                                                    <Badge variant="outline" className="text-[10px] font-bold gap-1 px-1.5 py-0 shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                                        <Target className="h-2.5 w-2.5 text-amber-500" />
                                                        <span>Exclusivo</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline">{activity.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                                            <Calendar className="mr-2 h-3 w-3" />
                                            {format(new Date(activity.deadline), "PP p")}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {activity.type === "MANUAL" ? "-" : `${activity.submissions.length} entregas`}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-1.5 pr-2">
                                            {activity.isGroupActivity && activity.groupScope === "ACTIVITY" && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8 sm:h-9 sm:w-9 font-bold text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                                                                onClick={() => setActivityForGroupsModal(activity)}
                                                            >
                                                                <Users className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Configurar Equipos Exclusivos</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/dashboard/teacher/courses/${courseId}/activities/${activity.id}`}>
                                                            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Ver entregas</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleStartEdit(activity)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Editar actividad</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                {activity.type !== "MANUAL" && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div>
                                                                <MissingSubmissionsDialog 
                                                                    activityId={activity.id} 
                                                                    activityTitle={activity.title} 
                                                                    trigger={
                                                                        <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40">
                                                                            <UserX className="h-4 w-4" />
                                                                        </Button>
                                                                    }
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Ver estudiantes sin entrega</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <Dialog>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60 dark:border-red-800/40">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Eliminar actividad</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <DialogContent>
                                                        <form action={async (formData) => {
                                                            await deleteActivityAction(formData);
                                                        }}>
                                                            <input type="hidden" name="courseId" value={courseId} />
                                                            <input type="hidden" name="activityId" value={activity.id} />
                                                            <DialogHeader>
                                                                <DialogTitle>Confirmar eliminación</DialogTitle>
                                                                <DialogDescription>
                                                                    Escribe <strong>ELIMINAR</strong> para confirmar.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid grid-cols-4 items-center gap-4 py-4">
                                                                <Label htmlFor={`confirm-${activity.id}`} className="text-right">Confirmación</Label>
                                                                <Input id={`confirm-${activity.id}`} name="confirmText" placeholder="ELIMINAR" pattern="^ELIMINAR$" required className="col-span-3" />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button type="submit" variant="destructive">Confirmar eliminación</Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </TooltipProvider>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ActivityFormDialog 
                isOpen={isDialogOpen} 
                onClose={handleCloseDialog} 
                courseId={courseId} 
                activity={editingActivity} 
                onOpenActivityGroups={(act) => {
                    setIsDialogOpen(false);
                    setActivityForGroupsModal(act);
                }}
            />

            {activityForGroupsModal && (
                <ActivityGroupsModal
                    isOpen={Boolean(activityForGroupsModal)}
                    onClose={() => setActivityForGroupsModal(null)}
                    courseId={courseId}
                    activityId={activityForGroupsModal.id}
                    activityTitle={activityForGroupsModal.title}
                    enrolledStudents={enrolledStudents.map((s: any) => ({ user: s.user || s }))}
                    onGroupsUpdated={() => {
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}

function MissingSubmissionsDialog({ activityId, activityTitle, trigger }: { activityId: string, activityTitle: string, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [missingStudents, setMissingStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMissingStudents();
        }
    }, [isOpen]);

    const loadMissingStudents = async () => {
        setIsLoading(true);
        try {
            const students = await getMissingSubmissionsAction(activityId);
            setMissingStudents(students);
        } catch (error) {
            console.error("Error loading missing students", error);
            toast.error("Error al cargar estudiantes sin entrega");
        } finally {
            setIsLoading(false);
        }
    };

    const defaultTrigger = (
        <DialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Ver Faltantes" className="h-8 w-8 sm:h-9 sm:w-9 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                <UserX className="h-4 w-4" />
            </Button>
        </DialogTrigger>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : defaultTrigger}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Estudiantes sin entrega</DialogTitle>
                    <DialogDescription>
                        {activityTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : missingStudents.length > 0 ? (
                        <ScrollArea className="h-[300px] rounded-md border p-4">
                            <div className="space-y-4">
                                {missingStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{student.name}</span>
                                            <span className="text-xs text-muted-foreground">{student.email}</span>
                                        </div>
                                        {student.profile?.telefono && (
                                            <a
                                                href={`https://wa.me/${student.profile.telefono.replace(/\+/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-950/20"
                                                title="Contactar por WhatsApp"
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Todos los estudiantes han realizado su entrega.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-sm text-muted-foreground">
                            Total: {missingStudents.length} estudiantes
                        </span>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
