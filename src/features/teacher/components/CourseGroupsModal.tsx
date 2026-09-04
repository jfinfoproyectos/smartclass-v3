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
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn, formatName, getInitials } from "@/lib/utils";
import {
    getCourseStudentGroupsAction,
    saveCourseStudentGroupsAction,
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

interface CourseGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    courseTitle: string;
    enrolledStudents: { user: Student }[];
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
    onToggleLeader?: () => void;
    onRemoveFromGroup?: () => void;
    isInGroup?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, data: { type: "student", student } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2.5 p-2 rounded-xl border transition-all relative group text-xs",
                isLeader
                    ? "bg-amber-500/10 border-amber-500/40 shadow-2xs text-foreground"
                    : "bg-card border-border/80 text-card-foreground hover:border-primary/40",
                isDragging && "opacity-40 scale-95"
            )}
        >
            {/* Handle para arrastrar */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-0.5"
                title="Arrastrar para mover de grupo"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </div>

            <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={student.image || undefined} />
                <AvatarFallback className="text-[9px]">
                    {getInitials(student.name)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="font-semibold truncate">
                        {formatName(student.name, student.profile)}
                    </p>
                    {isLeader && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0 font-bold">
                            <Crown className="h-2.5 w-2.5 mr-0.5 fill-amber-500" /> Líder
                        </Badge>
                    )}
                </div>
                {student.profile?.identificacion && (
                    <p className="text-[10px] text-muted-foreground truncate">
                        Doc: {student.profile.identificacion}
                    </p>
                )}
            </div>

            {/* Acciones si está en un grupo */}
            {isInGroup && (
                <div className="flex items-center gap-1 shrink-0">
                    {/* Botón para asignar o quitar líder */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleLeader?.();
                        }}
                        className={cn(
                            "p-1 rounded-lg transition-colors cursor-pointer",
                            isLeader
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-2xs"
                                : "text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10"
                        )}
                        title={isLeader ? "Quitar como líder de este grupo" : "Designar como líder de este grupo"}
                    >
                        <Crown className={cn("h-3.5 w-3.5", isLeader && "fill-amber-500")} />
                    </button>

                    {/* Botón para quitar del grupo y regresar a Sin Grupo */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromGroup?.();
                        }}
                        className="p-1 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Quitar de este grupo"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Droppable Container ---
function DroppableContainer({
    id,
    items,
    title,
    leaderName,
    onRemove,
    onNameChange,
    groupName,
    children,
}: {
    id: string;
    items: string[];
    title?: React.ReactNode;
    leaderName?: string | null;
    onRemove?: () => void;
    onNameChange?: (newName: string) => void;
    groupName?: string;
    children: React.ReactNode;
}) {
    const { setNodeRef } = useSortable({
        id,
        data: { type: "container", id },
    });

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(groupName || "");

    useEffect(() => {
        setNameInput(groupName || "");
    }, [groupName]);

    return (
        <Card
            ref={setNodeRef}
            className="flex flex-col bg-card border-border/80 shadow-xs hover:shadow-sm transition-all rounded-2xl overflow-hidden min-h-[220px]"
        >
            <CardHeader className="p-3 pb-2 border-b border-border/60 bg-muted/20 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    {/* Nombre editable del grupo */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isEditingName ? (
                            <Input
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onBlur={() => {
                                    setIsEditingName(false);
                                    if (nameInput.trim()) onNameChange?.(nameInput.trim());
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        setIsEditingName(false);
                                        if (nameInput.trim()) onNameChange?.(nameInput.trim());
                                    }
                                }}
                                autoFocus
                                className="h-6 text-xs font-bold py-0 px-2 rounded-lg bg-background"
                            />
                        ) : (
                            <div
                                onClick={() => setIsEditingName(true)}
                                className="font-bold text-xs text-foreground truncate cursor-pointer hover:underline flex items-center gap-1.5"
                                title="Haz clic para renombrar el grupo"
                            >
                                <span>{groupName}</span>
                            </div>
                        )}
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 py-0 px-1.5 bg-background">
                            <Users className="h-2.5 w-2.5 mr-1 text-primary" />
                            {items.length}
                        </Badge>
                    </div>

                    {onRemove && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={onRemove}
                            title="Eliminar este grupo"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>

                {/* Líder designado */}
                <div className="flex items-center gap-1.5 text-[11px]">
                    <Crown className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                    {leaderName ? (
                        <span className="font-semibold text-foreground truncate">
                            Líder: <span className="text-amber-600 dark:text-amber-400">{leaderName}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground italic text-[10px]">
                            Sin líder (clic en 👑 para asignar)
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-2.5 flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[300px] custom-scrollbar">
                {children}
                {items.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-[11px] text-muted-foreground border-2 border-dashed border-border/80 rounded-xl p-6 text-center">
                        <Users className="h-6 w-6 mb-1 opacity-40 text-muted-foreground" />
                        Arrastra estudiantes a este grupo
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Main Modal Component ---
export function CourseGroupsModal({
    isOpen,
    onClose,
    courseId,
    courseTitle,
    enrolledStudents,
}: CourseGroupsModalProps) {
    const [ungrouped, setUngrouped] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupCountInput, setGroupCountInput] = useState<string>("3");
    const [searchUngrouped, setSearchUngrouped] = useState<string>("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Sensors
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

    // Cargar grupos iniciales desde la Base de Datos PostgreSQL
    const loadGroupsFromDB = async () => {
        setIsLoading(true);
        try {
            const dbGroups = await getCourseStudentGroupsAction(courseId);
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
                if (formattedGroups.length > 0) {
                    setGroupCountInput(formattedGroups.length.toString());
                }
            } else {
                setGroups([]);
                setUngrouped(allStudents);
            }
            setIsDirty(false);
        } catch (error: any) {
            console.error("Error loading groups:", error);
            toast.error(error.message || "Error al cargar grupos de la base de datos");
            setUngrouped(enrolledStudents.map((s) => s.user).filter(Boolean));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && courseId) {
            loadGroupsFromDB();
        }
    }, [isOpen, courseId]);

    // Añadir nuevo grupo
    const handleAddGroup = () => {
        const newGroup: Group = {
            id: `group-temp-${Date.now()}`,
            name: `Grupo ${groups.length + 1}`,
            leaderId: null,
            students: [],
        };
        setGroups([...groups, newGroup]);
        setIsDirty(true);
    };

    // Eliminar grupo (devuelve estudiantes a Sin Grupo)
    const handleRemoveGroup = (groupId: string) => {
        const targetGroup = groups.find((g) => g.id === groupId);
        if (!targetGroup) return;

        setUngrouped((prev) => [...prev, ...targetGroup.students]);
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setIsDirty(true);
    };

    // Mover todos a Sin Grupo
    const handleResetAll = () => {
        if (!confirm("¿Deseas mover a todos los estudiantes a 'Sin Grupo'?")) return;
        const allStudents = enrolledStudents.map((s) => s.user).filter(Boolean);
        setGroups([]);
        setUngrouped(allStudents);
        setIsDirty(true);
    };

    // Distribuir estudiantes aleatoriamente en N grupos
    const handleRandomize = () => {
        const count = parseInt(groupCountInput);
        if (isNaN(count) || count < 1) {
            toast.error("Ingresa una cantidad válida de grupos");
            return;
        }

        // Recolectar todos los estudiantes
        let allStudents: Student[] = [...ungrouped];
        groups.forEach((g) => {
            allStudents = [...allStudents, ...g.students];
        });

        // Mezclar aleatoriamente
        allStudents = allStudents.sort(() => Math.random() - 0.5);

        // Crear N grupos
        const newGroups: Group[] = Array.from({ length: count }, (_, i) => ({
            id: `group-rand-${Date.now()}-${i}`,
            name: `Grupo ${i + 1}`,
            leaderId: null,
            students: [],
        }));

        // Repartir equitativamente
        allStudents.forEach((student, index) => {
            const groupIndex = index % count;
            newGroups[groupIndex].students.push(student);
        });

        // Opcional: auto-asignar como líder al primer estudiante de cada grupo
        newGroups.forEach((g) => {
            if (g.students.length > 0) {
                g.leaderId = g.students[0].id;
            }
        });

        setGroups(newGroups);
        setUngrouped([]);
        setIsDirty(true);
        toast.success(`Estudiantes organizados en ${count} grupos con líderes sugeridos`);
    };

    // Alternar o asignar líder dentro de un grupo
    const handleToggleLeader = (groupId: string, studentId: string) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                const newLeaderId = g.leaderId === studentId ? null : studentId;
                return {
                    ...g,
                    leaderId: newLeaderId,
                };
            })
        );
        setIsDirty(true);
    };

    // Quitar estudiante individual de un grupo
    const handleRemoveStudentFromGroup = (groupId: string, studentId: string) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;

        const studentToRemove = group.students.find((s) => s.id === studentId);
        if (!studentToRemove) return;

        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    leaderId: g.leaderId === studentId ? null : g.leaderId,
                    students: g.students.filter((s) => s.id !== studentId),
                };
            })
        );

        setUngrouped((prev) => [...prev, studentToRemove]);
        setIsDirty(true);
    };

    // Cambiar nombre del grupo
    const handleRenameGroup = (groupId: string, newName: string) => {
        setGroups((prev) =>
            prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
        );
        setIsDirty(true);
    };

    // Guardar cambios en la Base de Datos PostgreSQL
    const handleSaveToDatabase = async () => {
        setIsSaving(true);
        try {
            const payload = groups.map((g) => ({
                id: g.id,
                name: g.name,
                leaderId: g.leaderId,
                memberIds: g.students.map((s) => s.id),
            }));

            await saveCourseStudentGroupsAction({
                courseId,
                groups: payload,
            });

            toast.success("¡Grupos guardados exitosamente en la base de datos!");
            setIsDirty(false);
            await loadGroupsFromDB();
        } catch (error: any) {
            console.error("Error saving groups to DB:", error);
            toast.error(error.message || "Error al guardar grupos en la base de datos");
        } finally {
            setIsSaving(false);
        }
    };

    // Exportar a Excel
    const handleExportExcel = () => {
        if (groups.length === 0) {
            toast.error("No hay grupos para exportar");
            return;
        }

        const rows: any[] = [];
        groups.forEach((g) => {
            g.students.forEach((s) => {
                const isLeader = g.leaderId === s.id;
                rows.push({
                    "Grupo": g.name,
                    "Rol": isLeader ? "Líder de Grupo" : "Integrante",
                    "Nombre": formatName(s.name, s.profile),
                    "Identificación": s.profile?.identificacion || "N/A",
                    "Correo": s.email || "N/A",
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Grupos");
        XLSX.writeFile(workbook, `Grupos_${courseTitle.replace(/\s+/g, "_")}.xlsx`);
        toast.success("Archivo Excel exportado exitosamente");
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveStudent(active.data.current?.student || null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        // Encontrar en qué contenedor está el elemento arrastrado
        const activeContainer = ungrouped.some((s) => s.id === activeIdStr)
            ? "ungrouped"
            : groups.find((g) => g.students.some((s) => s.id === activeIdStr))?.id;

        // Encontrar el contenedor de destino
        let overContainer: string | undefined;
        if (overIdStr === "ungrouped") {
            overContainer = "ungrouped";
        } else if (groups.some((g) => g.id === overIdStr)) {
            overContainer = overIdStr;
        } else if (ungrouped.some((s) => s.id === overIdStr)) {
            overContainer = "ungrouped";
        } else {
            overContainer = groups.find((g) =>
                g.students.some((s) => s.id === overIdStr)
            )?.id;
        }

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Mover entre contenedores
        setIsDirty(true);
        let studentToMove: Student | undefined;

        if (activeContainer === "ungrouped") {
            studentToMove = ungrouped.find((s) => s.id === activeIdStr);
            setUngrouped((prev) => prev.filter((s) => s.id !== activeIdStr));
        } else {
            const srcGroup = groups.find((g) => g.id === activeContainer);
            studentToMove = srcGroup?.students.find((s) => s.id === activeIdStr);
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== activeContainer) return g;
                    return {
                        ...g,
                        leaderId: g.leaderId === activeIdStr ? null : g.leaderId,
                        students: g.students.filter((s) => s.id !== activeIdStr),
                    };
                })
            );
        }

        if (!studentToMove) return;

        if (overContainer === "ungrouped") {
            setUngrouped((prev) => [...prev, studentToMove!]);
        } else {
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== overContainer) return g;
                    return {
                        ...g,
                        students: [...g.students, studentToMove!],
                    };
                })
            );
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveStudent(null);
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        if (activeIdStr === overIdStr) return;

        // Reordenar dentro de un mismo grupo
        const group = groups.find((g) => g.students.some((s) => s.id === activeIdStr));
        if (group && group.students.some((s) => s.id === overIdStr)) {
            const oldIndex = group.students.findIndex((s) => s.id === activeIdStr);
            const newIndex = group.students.findIndex((s) => s.id === overIdStr);
            setGroups((prev) =>
                prev.map((g) => {
                    if (g.id !== group.id) return g;
                    return {
                        ...g,
                        students: arrayMove(g.students, oldIndex, newIndex),
                    };
                })
            );
            setIsDirty(true);
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: "0.5",
                },
            },
        }),
    };

    // Estudiantes sin grupo filtrados por búsqueda
    const filteredUngrouped = useMemo(() => {
        const query = searchUngrouped.toLowerCase().trim();
        if (!query) return ungrouped;
        return ungrouped.filter((s) => {
            const name = formatName(s.name, s.profile).toLowerCase();
            const idDoc = s.profile?.identificacion?.toLowerCase() || "";
            return name.includes(query) || idDoc.includes(query);
        });
    }, [ungrouped, searchUngrouped]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-7xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-border bg-card">
                {/* Cabecera Principal */}
                <div className="px-5 py-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                            <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    Generador de Grupos de Trabajo
                                </DialogTitle>
                                {isDirty ? (
                                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Cambios sin guardar
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Guardado en BD
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {courseTitle} • Arrastra estudiantes, genera grupos aleatorios y designa un líder (👑) para cada equipo.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Acciones principales */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            className="text-xs font-semibold gap-1.5 h-8 rounded-xl"
                            title="Exportar a Excel"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Exportar Excel</span>
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveToDatabase}
                            disabled={isSaving}
                            className={cn(
                                "text-xs font-bold gap-1.5 h-8 rounded-xl shadow-xs cursor-pointer",
                                isDirty
                                    ? "bg-primary text-primary-foreground animate-pulse hover:animate-none"
                                    : ""
                            )}
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    <span>Guardar</span>
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="text-xs font-semibold h-8 rounded-xl px-3 cursor-pointer"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>

                {/* Tablero de Arrastre y Soltar (DndContext) */}
                <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-hidden">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            <span className="text-xs font-medium">Cargando grupos desde la base de datos...</span>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="h-full flex flex-col lg:flex-row gap-3 min-h-0">
                                {/* Panel Izquierdo: Estudiantes Sin Grupo */}
                                <div className="w-full lg:w-[310px] shrink-0 flex flex-col gap-2 min-h-0">
                                    <Card className="flex-1 min-h-0 flex flex-col bg-muted/20 border-border/80 shadow-xs rounded-2xl overflow-hidden">
                                        <CardHeader className="p-3 pb-2 border-b border-border/60 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                                                    <span>Sin Grupo</span>
                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                        {ungrouped.length}
                                                    </Badge>
                                                </CardTitle>
                                                {ungrouped.length < enrolledStudents.length && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleResetAll}
                                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                                                        title="Mover todos los estudiantes a Sin Grupo"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        <span>Resetear</span>
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Generador Automático */}
                                            <div className="p-2 rounded-xl bg-card border border-border/80 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor="group-count" className="text-[11px] font-bold text-muted-foreground shrink-0">
                                                        Grupos:
                                                    </Label>
                                                    <Input
                                                        id="group-count"
                                                        type="number"
                                                        min="1"
                                                        max={enrolledStudents.length || 10}
                                                        value={groupCountInput}
                                                        onChange={(e) => setGroupCountInput(e.target.value)}
                                                        className="h-7 text-xs font-bold w-16 text-center rounded-lg"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleRandomize}
                                                        className="h-7 text-[11px] font-bold gap-1 flex-1 rounded-lg"
                                                    >
                                                        <Shuffle className="h-3 w-3" />
                                                        <span>Aleatorio</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Buscador de estudiantes sin grupo */}
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    value={searchUngrouped}
                                                    onChange={(e) => setSearchUngrouped(e.target.value)}
                                                    placeholder="Filtrar sin grupo..."
                                                    className="pl-8 text-xs h-7 rounded-lg"
                                                />
                                            </div>
                                        </CardHeader>

                                        {/* Contenedor Droppable de Sin Grupo */}
                                        <CardContent className="p-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                            <SortableContext
                                                id="ungrouped"
                                                items={filteredUngrouped.map((s) => s.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="flex flex-col gap-1.5 min-h-[80px]">
                                                    {filteredUngrouped.map((student) => (
                                                        <SortableStudentItem
                                                            key={student.id}
                                                            id={student.id}
                                                            student={student}
                                                            isInGroup={false}
                                                        />
                                                    ))}
                                                    {filteredUngrouped.length === 0 && (
                                                        <div className="p-6 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-xl my-auto">
                                                            {searchUngrouped ? "No coincide la búsqueda" : "Todos los estudiantes tienen grupo"}
                                                        </div>
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Panel Derecho: Cuadrícula de Grupos Creados */}
                                <div className="flex-1 min-h-0 flex flex-col gap-2">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground">
                                                Grupos Conformados ({groups.length})
                                            </h3>
                                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                                • Haz clic en la corona (👑) para asignar al líder de cada grupo.
                                            </span>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleAddGroup}
                                            className="text-xs font-bold gap-1.5 h-7 rounded-xl"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Añadir Grupo</span>
                                        </Button>
                                    </div>

                                    {/* Scroll de Grupos */}
                                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                                        {groups.length === 0 ? (
                                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 text-center space-y-3">
                                                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                                    <FolderKanban className="h-8 w-8" />
                                                </div>
                                                <h4 className="font-bold text-sm text-foreground">
                                                    No hay grupos creados todavía
                                                </h4>
                                                <p className="text-xs text-muted-foreground max-w-sm">
                                                    Usa el botón <strong>"Aleatorio"</strong> en el panel izquierdo para repartir los aprendices automáticamente o pulsa <strong>"Añadir Grupo"</strong> para crearlos manualmente por arrastre.
                                                </p>
                                                <Button size="sm" onClick={handleAddGroup} className="text-xs font-bold gap-1">
                                                    <Plus className="h-3.5 w-3.5" /> Crear Primer Grupo
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {groups.map((group) => {
                                                    const leaderStudent = group.students.find(
                                                        (s) => s.id === group.leaderId
                                                    );
                                                    const leaderName = leaderStudent
                                                        ? formatName(leaderStudent.name, leaderStudent.profile)
                                                        : null;

                                                    return (
                                                        <SortableContext
                                                            key={group.id}
                                                            id={group.id}
                                                            items={group.students.map((s) => s.id)}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            <DroppableContainer
                                                                id={group.id}
                                                                items={group.students.map((s) => s.id)}
                                                                groupName={group.name}
                                                                leaderName={leaderName}
                                                                onNameChange={(newName) => handleRenameGroup(group.id, newName)}
                                                                onRemove={() => handleRemoveGroup(group.id)}
                                                            >
                                                                {group.students.map((student) => (
                                                                    <SortableStudentItem
                                                                        key={student.id}
                                                                        id={student.id}
                                                                        student={student}
                                                                        isLeader={group.leaderId === student.id}
                                                                        isInGroup={true}
                                                                        onToggleLeader={() => handleToggleLeader(group.id, student.id)}
                                                                        onRemoveFromGroup={() => handleRemoveStudentFromGroup(group.id, student.id)}
                                                                    />
                                                                ))}
                                                            </DroppableContainer>
                                                        </SortableContext>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Drag Overlay para visualización suave */}
                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeStudent ? (
                                    <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-card text-card-foreground shadow-2xl border-primary/50 text-xs w-[240px]">
                                        <GripVertical className="h-3.5 w-3.5 text-primary" />
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={activeStudent.image || undefined} />
                                            <AvatarFallback className="text-[9px]">
                                                {getInitials(activeStudent.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold truncate">
                                            {formatName(activeStudent.name, activeStudent.profile)}
                                        </span>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
