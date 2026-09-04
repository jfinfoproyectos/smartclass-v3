"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    GripVertical, 
    Plus, 
    Shuffle, 
    Trash2, 
    RotateCcw, 
    Users, 
    Download, 
    Save, 
    Crown, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    X,
    FolderKanban,
    Sparkles,
    Copy,
    Target
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn, formatName, getInitials } from "@/lib/utils";
import {
    getActivityStudentGroupsAction,
    saveActivityStudentGroupsAction,
    getCourseStudentGroupsAction,
} from "@/features/teacher/actions/studentGroupActions";

interface Student {
    id: string;
    name: string;
    email?: string;
    image: string | null;
    profile?: {
        nombres?: string | null;
        apellido?: string | null;
        identificacion?: string | null;
        telefono?: string | null;
    } | null;
}

interface Group {
    id: string;
    name: string;
    leaderId: string | null;
    students: Student[];
}

interface ActivityGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    activityId: string;
    activityTitle: string;
    enrolledStudents: { user: Student }[];
    onGroupsUpdated?: () => void;
}

// --- Sortable Student Item ---
function SortableStudentItem({
    student,
    id,
    isLeader = false,
    onToggleLeader,
    onRemoveFromGroup,
    isInGroup = false,
}: {
    student: Student;
    id: string;
    isLeader?: boolean;
    onToggleLeader?: (studentId: string) => void;
    onRemoveFromGroup?: (studentId: string) => void;
    isInGroup?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: {
            type: "Student",
            student,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 border-2 border-dashed border-primary/50 rounded-xl p-2.5 bg-primary/5 h-[52px]"
            />
        );
    }

    const displayName = formatName(student.name, student.profile);
    const docId = student.profile?.identificacion;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center justify-between p-2 rounded-xl border bg-card/80 hover:bg-muted/40 transition-all text-xs select-none shadow-2xs gap-2",
                isLeader ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/30" : "border-border/60"
            )}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground p-0.5"
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                <Avatar className="h-6 w-6 shrink-0 text-[10px]">
                    <AvatarImage src={student.image || ""} />
                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-foreground text-[11px] leading-snug">
                        {displayName}
                    </p>
                    {docId && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate leading-none">
                            Doc: {docId}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {isInGroup && onToggleLeader && (
                    <button
                        type="button"
                        onClick={() => onToggleLeader(student.id)}
                        title={isLeader ? "Quitar como líder de equipo" : "Asignar como líder de equipo"}
                        className={cn(
                            "p-1 rounded-md transition-colors",
                            isLeader
                                ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                : "text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-500/10"
                        )}
                    >
                        <Crown className={cn("h-3.5 w-3.5", isLeader ? "fill-amber-500" : "")} />
                    </button>
                )}

                {isInGroup && onRemoveFromGroup && (
                    <button
                        type="button"
                        onClick={() => onRemoveFromGroup(student.id)}
                        title="Mover a Sin Asignar"
                        className="p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

export function ActivityGroupsModal({
    isOpen,
    onClose,
    courseId,
    activityId,
    activityTitle,
    enrolledStudents,
    onGroupsUpdated,
}: ActivityGroupsModalProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [ungrouped, setUngrouped] = useState<Student[]>([]);
    const [groupCountInput, setGroupCountInput] = useState<string>("3");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Cargar grupos iniciales de esta actividad
    const loadGroupsFromDB = async () => {
        setIsLoading(true);
        try {
            const dbGroups = await getActivityStudentGroupsAction(activityId, courseId);
            const allStudents = enrolledStudents.map((s) => s.user).filter(Boolean);

            if (dbGroups && dbGroups.length > 0) {
                const assignedStudentIds = new Set<string>();

                const formattedGroups: Group[] = dbGroups.map((g) => {
                    const groupStudents: Student[] = g.members
                        .map((m) => m.user)
                        .filter(Boolean);

                    groupStudents.forEach((st) => assignedStudentIds.add(st.id));

                    return {
                        id: g.id,
                        name: g.name,
                        leaderId: g.leaderId,
                        students: groupStudents,
                    };
                });

                const remainingUngrouped = allStudents.filter(
                    (st) => !assignedStudentIds.has(st.id)
                );

                setGroups(formattedGroups);
                setUngrouped(remainingUngrouped);
                setGroupCountInput(formattedGroups.length.toString());
            } else {
                setGroups([]);
                setUngrouped(allStudents);
            }
            setIsDirty(false);
        } catch (error: any) {
            console.error("Error loading activity groups:", error);
            toast.error(error.message || "Error al cargar los grupos de la actividad");
            setUngrouped(enrolledStudents.map((s) => s.user).filter(Boolean));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && activityId) {
            loadGroupsFromDB();
        }
    }, [isOpen, activityId]);

    // Copiar la distribución actual del curso a esta actividad como base
    const handleCopyFromCourse = async () => {
        setIsLoading(true);
        try {
            const courseGroups = await getCourseStudentGroupsAction(courseId);
            if (!courseGroups || courseGroups.length === 0) {
                toast.warning("No hay grupos configurados a nivel de ficha/curso para copiar.");
                return;
            }

            const allStudents = enrolledStudents.map((s) => s.user).filter(Boolean);
            const assignedIds = new Set<string>();

            const copiedGroups: Group[] = courseGroups.map((cg, idx) => {
                const groupStudents: Student[] = cg.members
                    .map((m) => m.user)
                    .filter(Boolean);

                groupStudents.forEach((st) => assignedIds.add(st.id));

                return {
                    id: `temp-copy-${idx + 1}-${Date.now()}`,
                    name: cg.name,
                    leaderId: cg.leaderId,
                    students: groupStudents,
                };
            });

            const remainingUngrouped = allStudents.filter((st) => !assignedIds.has(st.id));

            setGroups(copiedGroups);
            setUngrouped(remainingUngrouped);
            setGroupCountInput(copiedGroups.length.toString());
            setIsDirty(true);
            toast.success(`✓ Se copiaron ${copiedGroups.length} grupos de la ficha para esta actividad. Modifícalos libremente y pulsa Guardar.`);
        } catch (error: any) {
            toast.error("Error al copiar grupos de la ficha: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Crear grupos automáticamente y distribuir aleatoriamente
    const handleGenerateGroups = () => {
        const count = parseInt(groupCountInput, 10);
        const allStudents = enrolledStudents.map((s) => s.user).filter(Boolean);

        if (isNaN(count) || count < 1) {
            toast.error("Ingresa un número válido de grupos (mínimo 1).");
            return;
        }

        if (count > allStudents.length) {
            toast.error(`No puedes crear más grupos (${count}) que estudiantes matriculados (${allStudents.length}).`);
            return;
        }

        const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
        const newGroups: Group[] = Array.from({ length: count }, (_, i) => ({
            id: `temp-group-${i + 1}-${Date.now()}`,
            name: `Equipo ${i + 1}`,
            leaderId: null,
            students: [],
        }));

        shuffled.forEach((student, index) => {
            const targetGroupIndex = index % count;
            newGroups[targetGroupIndex].students.push(student);
        });

        // Asignar primer estudiante de cada grupo como líder por defecto
        newGroups.forEach((g) => {
            if (g.students.length > 0) {
                g.leaderId = g.students[0].id;
            }
        });

        setGroups(newGroups);
        setUngrouped([]);
        setIsDirty(true);
        toast.success(`✓ Se generaron ${count} grupos para esta actividad.`);
    };

    // Añadir un nuevo grupo vacío
    const handleAddEmptyGroup = () => {
        const nextNum = groups.length + 1;
        const newGroup: Group = {
            id: `temp-group-${nextNum}-${Date.now()}`,
            name: `Equipo ${nextNum}`,
            leaderId: null,
            students: [],
        };
        setGroups([...groups, newGroup]);
        setIsDirty(true);
    };

    // Eliminar un grupo
    const handleRemoveGroup = (groupId: string) => {
        const groupToRemove = groups.find((g) => g.id === groupId);
        if (!groupToRemove) return;

        setUngrouped((prev) => [...prev, ...groupToRemove.students]);
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setIsDirty(true);
    };

    // Restablecer
    const handleResetAll = () => {
        const allStudents = enrolledStudents.map((s) => s.user).filter(Boolean);
        setGroups([]);
        setUngrouped(allStudents);
        setIsDirty(true);
        toast.info("Todos los estudiantes fueron movidos a la lista Sin Asignar.");
    };

    // Toggle líder
    const handleToggleLeader = (groupId: string, studentId: string) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    leaderId: g.leaderId === studentId ? null : studentId,
                };
            })
        );
        setIsDirty(true);
    };

    // Remover estudiante de un grupo específico
    const handleRemoveStudentFromGroup = (groupId: string, studentId: string) => {
        const group = groups.find((g) => g.id === groupId);
        const student = group?.students.find((s) => s.id === studentId);
        if (!student) return;

        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                const newStudents = g.students.filter((s) => s.id !== studentId);
                const newLeaderId = g.leaderId === studentId
                    ? (newStudents.length > 0 ? newStudents[0].id : null)
                    : g.leaderId;
                return {
                    ...g,
                    students: newStudents,
                    leaderId: newLeaderId,
                };
            })
        );

        setUngrouped((prev) => [...prev, student]);
        setIsDirty(true);
    };

    // Exportar a Excel
    const handleExportExcel = () => {
        try {
            const rows: any[] = [];
            groups.forEach((g) => {
                g.students.forEach((s) => {
                    rows.push({
                        "Actividad": activityTitle,
                        "Equipo / Grupo": g.name,
                        "Rol": g.leaderId === s.id ? "Líder" : "Miembro",
                        "Estudiante": formatName(s.name, s.profile),
                        "Identificación": s.profile?.identificacion || "N/A",
                        "Correo": s.email || "N/A",
                    });
                });
            });

            if (ungrouped.length > 0) {
                ungrouped.forEach((s) => {
                    rows.push({
                        "Actividad": activityTitle,
                        "Equipo / Grupo": "Sin Asignar",
                        "Rol": "N/A",
                        "Estudiante": formatName(s.name, s.profile),
                        "Identificación": s.profile?.identificacion || "N/A",
                        "Correo": s.email || "N/A",
                    });
                });
            }

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Equipos Actividad");
            XLSX.writeFile(wb, `equipos_${activityTitle.slice(0, 20).replace(/\s+/g, "_")}.xlsx`);
            toast.success("Listado de equipos exportado a Excel");
        } catch (err: any) {
            toast.error("Error al exportar a Excel: " + err.message);
        }
    };

    // Guardar cambios en PostgreSQL
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = groups.map((g) => ({
                id: g.id,
                name: g.name.trim() || "Equipo de Trabajo",
                leaderId: g.leaderId,
                memberIds: g.students.map((s) => s.id),
            }));

            await saveActivityStudentGroupsAction({
                activityId,
                courseId,
                groups: payload,
            });

            toast.success(`✓ Se guardaron ${groups.length} equipos exclusivos para esta actividad.`);
            setIsDirty(false);
            if (onGroupsUpdated) onGroupsUpdated();
            onClose();
        } catch (error: any) {
            console.error("Error saving activity groups:", error);
            toast.error(error.message || "Error al guardar los grupos");
        } finally {
            setIsSaving(false);
        }
    };

    // Dnd Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        const student = (active.data.current as any)?.student;
        setActiveStudent(student || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveStudent(null);

        if (!over) return;

        const activeStudentId = active.id as string;
        const overId = over.id as string;

        // Encontrar origen
        let sourceContainer: "ungrouped" | string = "ungrouped";
        let draggedStudent: Student | undefined = ungrouped.find((s) => s.id === activeStudentId);

        if (!draggedStudent) {
            for (const g of groups) {
                const found = g.students.find((s) => s.id === activeStudentId);
                if (found) {
                    sourceContainer = g.id;
                    draggedStudent = found;
                    break;
                }
            }
        }

        if (!draggedStudent) return;

        // Encontrar destino
        let targetContainer: "ungrouped" | string = overId;
        if (overId !== "ungrouped" && !groups.some((g) => g.id === overId)) {
            for (const g of groups) {
                if (g.students.some((s) => s.id === overId)) {
                    targetContainer = g.id;
                    break;
                }
            }
        }

        if (sourceContainer === targetContainer) return;

        // Remover de origen
        if (sourceContainer === "ungrouped") {
            setUngrouped((prev) => prev.filter((s) => s.id !== activeStudentId));
        } else {
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== sourceContainer) return g;
                    const newStudents = g.students.filter((s) => s.id !== activeStudentId);
                    const newLeader = g.leaderId === activeStudentId
                        ? (newStudents.length > 0 ? newStudents[0].id : null)
                        : g.leaderId;
                    return {
                        ...g,
                        students: newStudents,
                        leaderId: newLeader,
                    };
                })
            );
        }

        // Agregar a destino
        if (targetContainer === "ungrouped") {
            setUngrouped((prev) => [...prev, draggedStudent!]);
        } else {
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== targetContainer) return g;
                    const newStudents = [...g.students, draggedStudent!];
                    return {
                        ...g,
                        students: newStudents,
                        leaderId: g.leaderId || draggedStudent!.id,
                    };
                })
            );
        }

        setIsDirty(true);
    };

    const filteredUngrouped = useMemo(() => {
        if (!searchQuery.trim()) return ungrouped;
        const q = searchQuery.toLowerCase();
        return ungrouped.filter((s) => {
            const name = formatName(s.name, s.profile).toLowerCase();
            const doc = s.profile?.identificacion?.toLowerCase() || "";
            return name.includes(q) || doc.includes(q);
        });
    }, [ungrouped, searchQuery]);

    const totalStudents = enrolledStudents.length;
    const assignedCount = totalStudents - ungrouped.length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-6xl! w-[96vw] max-h-[92vh] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-bold gap-1">
                                <Target className="h-3 w-3" /> Exclusivo de esta Actividad
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                                {assignedCount}/{totalStudents} Asignados ({groups.length} Equipos)
                            </Badge>
                        </div>
                        <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <span>Equipos para: {activityTitle}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Los equipos configurados aquí son <strong>exclusivos para esta actividad</strong> y no alteran los grupos globales de la ficha.
                        </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyFromCourse}
                            className="h-8 text-xs gap-1.5 font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                            title="Clonar los grupos actuales del curso para empezar con esa distribución"
                        >
                            <Copy className="h-3.5 w-3.5" /> Copiar desde Ficha
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            className="h-8 text-xs gap-1.5 font-semibold"
                        >
                            <Download className="h-3.5 w-3.5" /> Excel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !isDirty}
                            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {isSaving ? "Guardando..." : "Guardar Equipos"}
                        </Button>
                    </div>
                </div>

                {/* Toolbar de Generación Rápida */}
                <div className="px-4 py-2.5 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Generador de Equipos:</span>
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="number"
                                min="1"
                                max={Math.max(1, totalStudents)}
                                value={groupCountInput}
                                onChange={(e) => setGroupCountInput(e.target.value)}
                                className="h-7 w-16 text-center font-mono text-xs font-bold bg-background"
                            />
                            <span className="text-muted-foreground">grupos</span>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleGenerateGroups}
                            className="h-7 text-xs font-semibold gap-1"
                        >
                            <Shuffle className="h-3 w-3 text-primary" /> Distribuir Aleatoriamente
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAddEmptyGroup}
                            className="h-7 text-xs font-semibold gap-1"
                        >
                            <Plus className="h-3 w-3" /> Añadir Equipo Vacío
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleResetAll}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                        >
                            <RotateCcw className="h-3 w-3" /> Desarmar Todos
                        </Button>
                    </div>
                </div>

                {/* Dnd Workspace */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden p-4 gap-4 bg-muted/10">
                        {/* Columna Izquierda: Estudiantes Sin Asignar (4 columnas) */}
                        <div className="lg:col-span-4 flex flex-col bg-card rounded-2xl border min-h-0 overflow-hidden shadow-xs">
                            <div className="p-3 border-b bg-muted/20 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        Sin Asignar ({ungrouped.length})
                                    </span>
                                    {ungrouped.length === 0 && (
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                                            ✓ Todos Asignados
                                        </Badge>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre o documento..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-7.5 pl-7 text-xs bg-background"
                                    />
                                </div>
                            </div>

                            <SortableContext
                                id="ungrouped"
                                items={filteredUngrouped.map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div
                                    id="ungrouped"
                                    className="flex-1 p-2.5 overflow-y-auto space-y-1.5 min-h-[120px]"
                                >
                                    {filteredUngrouped.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground space-y-1">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500/60" />
                                            <p className="text-xs font-semibold">No hay estudiantes en esta lista</p>
                                        </div>
                                    ) : (
                                        filteredUngrouped.map((s) => (
                                            <SortableStudentItem
                                                key={s.id}
                                                id={s.id}
                                                student={s}
                                                isInGroup={false}
                                            />
                                        ))
                                    )}
                                </div>
                            </SortableContext>
                        </div>

                        {/* Columna Derecha: Equipos de la Actividad (8 columnas) */}
                        <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto pr-1">
                                {groups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed rounded-2xl p-6 text-center text-muted-foreground space-y-3 bg-card/40">
                                        <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">No hay equipos creados para esta actividad</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                                                Puedes distribuir aleatoriamente, copiar los equipos de la ficha con un clic, o crear equipos vacíos.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleCopyFromCourse}
                                                className="gap-1.5 text-xs font-bold"
                                            >
                                                <Copy className="h-3.5 w-3.5" /> Copiar desde Ficha
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleGenerateGroups}
                                                className="gap-1.5 text-xs font-bold"
                                            >
                                                <Shuffle className="h-3.5 w-3.5 text-primary" /> Generar Nuevos
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {groups.map((group) => {
                                            const isComplete = group.students.length > 0;
                                            const hasLeader = Boolean(group.leaderId);

                                            return (
                                                <Card
                                                    key={group.id}
                                                    className="rounded-xl border border-border/80 flex flex-col overflow-hidden bg-card shadow-2xs"
                                                >
                                                    <CardHeader className="p-3 bg-muted/20 border-b flex flex-row items-center justify-between gap-2 space-y-0">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <Input
                                                                value={group.name}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setGroups((prev) =>
                                                                        prev.map((g) =>
                                                                            g.id === group.id ? { ...g, name: val } : g
                                                                        )
                                                                    );
                                                                    setIsDirty(true);
                                                                }}
                                                                className="h-6 font-bold text-xs bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:bg-background/80"
                                                            />
                                                            <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                                                                {group.students.length} miembros
                                                            </Badge>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveGroup(group.id)}
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                                            title="Eliminar este equipo"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </CardHeader>

                                                    <SortableContext
                                                        id={group.id}
                                                        items={group.students.map((s) => s.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <CardContent
                                                            id={group.id}
                                                            className="p-2.5 flex-1 min-h-[140px] space-y-1.5 overflow-y-auto max-h-56"
                                                        >
                                                            {group.students.length === 0 ? (
                                                                <div className="flex items-center justify-center h-full min-h-[110px] border border-dashed rounded-lg text-muted-foreground/60 text-[11px]">
                                                                    Arrastra estudiantes aquí
                                                                </div>
                                                            ) : (
                                                                group.students.map((s) => (
                                                                    <SortableStudentItem
                                                                        key={s.id}
                                                                        id={s.id}
                                                                        student={s}
                                                                        isLeader={group.leaderId === s.id}
                                                                        isInGroup={true}
                                                                        onToggleLeader={(sid) => handleToggleLeader(group.id, sid)}
                                                                        onRemoveFromGroup={(sid) => handleRemoveStudentFromGroup(group.id, sid)}
                                                                    />
                                                                ))
                                                            )}
                                                        </CardContent>
                                                    </SortableContext>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DragOverlay
                        dropAnimation={{
                            sideEffects: defaultDropAnimationSideEffects({
                                styles: {
                                    active: {
                                        opacity: "0.5",
                                    },
                                },
                            }),
                        }}
                    >
                        {activeStudent ? (
                            <div className="p-2.5 rounded-xl border-2 border-primary bg-background shadow-xl text-xs font-semibold flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarFallback>{getInitials(activeStudent.name)}</AvatarFallback>
                                </Avatar>
                                <span>{activeStudent.name}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </DialogContent>
        </Dialog>
    );
}
