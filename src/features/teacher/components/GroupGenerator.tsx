"use client";

import { useState, useEffect } from "react";
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
    DropAnimation
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    horizontalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Plus, Shuffle, Trash2, RotateCcw, Users, Download, Upload, FileJson } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { cn, formatName } from "@/lib/utils";

interface Student {
    id: string;
    name: string;
    image: string | null;
    profile?: {
        nombres?: string;
        apellido?: string;
        identificacion?: string;
    } | null;
}

interface GroupGeneratorProps {
    students: { user: Student }[];
}

interface Group {
    id: string;
    name: string;
    students: Student[];
}

// --- Sortable Student Item ---
function SortableStudent({ student, id }: { student: Student; id: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id, data: { type: 'student', student } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 bg-muted/50 rounded-lg border cursor-grab active:cursor-grabbing hover:bg-muted transition-colors relative group",
                isDragging && "opacity-50"
            )}
            {...attributes}
            {...listeners}
        >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical className="h-4 w-4" />
            </div>
            <Avatar className="h-8 w-8 ml-4">
                <AvatarImage src={student.image || undefined} />
                <AvatarFallback>{formatName(student.name, student.profile)[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium pr-2">
                    {formatName(student.name, student.profile)}
                </p>
            </div>
        </div>
    );
}

// --- Droppable Container ---
function DroppableContainer({
    id,
    items,
    title,
    onRemove,
    children
}: {
    id: string;
    items: string[];
    title?: React.ReactNode;
    onRemove?: () => void;
    children: React.ReactNode;
}) {
    const { setNodeRef } = useSortable({
        id: id,
        data: { type: 'container', id }
    });

    return (
        <Card ref={setNodeRef} className="h-full flex flex-col bg-muted/10 shadow-sm transition-all hover:shadow-md border-2 border-transparent hover:border-primary/10">
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {title}
                    <Badge variant="secondary" className="bg-background/80 ml-2">
                        {items.length}
                    </Badge>
                </CardTitle>
                {onRemove && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-1 min-h-[100px] flex flex-col gap-2">
                {children}
                {items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded-lg m-1">
                        Arrastra estudiantes aquí
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function GroupGenerator({ students: initialStudents }: GroupGeneratorProps) {
    const [ungrouped, setUngrouped] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupCountInput, setGroupCountInput] = useState<string>("3");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeStudent, setActiveStudent] = useState<Student | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Initial load
    useEffect(() => {
        setUngrouped(initialStudents.map(s => s.user));
    }, [initialStudents]);

    // Actions
    const handleAddGroup = () => {
        const newGroup: Group = {
            id: `group-${Date.now()}`,
            name: `Grupo ${groups.length + 1}`,
            students: []
        };
        setGroups([...groups, newGroup]);
    };

    const handleRemoveGroup = (groupId: string) => {
        const groupToRemove = groups.find(g => g.id === groupId);
        if (!groupToRemove) return;

        // Return members to ungrouped
        setUngrouped(prev => [...prev, ...groupToRemove.students]);
        setGroups(prev => prev.filter(g => g.id !== groupId));
    };

    const handleReset = () => {
        setGroups([]);
        setUngrouped(initialStudents.map(s => s.user));
    };

    const handleRandomize = () => {
        const count = parseInt(groupCountInput);
        if (isNaN(count) || count < 1) return;

        // Gather all students
        let allStudents = [...ungrouped];
        groups.forEach(g => {
            allStudents = [...allStudents, ...g.students];
        });

        // Shuffle
        allStudents = allStudents.sort(() => Math.random() - 0.5);

        // Distribute
        const newGroups: Group[] = Array.from({ length: count }, (_, i) => ({
            id: `group-rand-${Date.now()}-${i}`,
            name: `Grupo ${i + 1}`,
            students: []
        }));

        allStudents.forEach((student, index) => {
            const groupIndex = index % count;
            newGroups[groupIndex].students.push(student);
        });

        setGroups(newGroups);
        setUngrouped([]);
    };

    const handleExportGroups = () => {
        if (groups.length === 0) return;

        // Flatten data: Group Name | Student Name
        const data: any[] = [];
        groups.forEach(group => {
            if (group.students.length === 0) {
                data.push({
                    Grupo: group.name,
                    Estudiante: "Sin estudiantes"
                });
            } else {
                group.students.forEach(student => {
                    data.push({
                        Grupo: group.name,
                        Estudiante: formatName(student.name, student.profile)
                    });
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grupos");
        XLSX.writeFile(wb, `Grupos_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportJSON = () => {
        const state = {
            groups,
            ungrouped,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Proyecto_Grupos_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Proyecto exportado correctamente");
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const state = JSON.parse(content);

                if (!state.groups || !Array.isArray(state.groups) || !Array.isArray(state.ungrouped)) {
                    throw new Error("Formato de archivo inválido");
                }

                setGroups(state.groups);
                setUngrouped(state.ungrouped);
                toast.success("Proyecto importado correctamente");
            } catch (error) {
                console.error("Error importing JSON:", error);
                toast.error("Error al importar el archivo JSON");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = "";
    };

    // --- DND Handlers ---

    const findContainer = (id: string): string | undefined => {
        if (ungrouped.some(s => s.id === id)) return 'ungrouped';
        const group = groups.find(g => g.students.some(s => s.id === id));
        if (group) return group.id;
        if (id === 'ungrouped') return 'ungrouped';
        if (groups.some(g => g.id === id)) return id;
        return undefined;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const id = active.id as string;
        setActiveId(id);

        // Find the student object
        const s = ungrouped.find(s => s.id === id) ||
            groups.flatMap(g => g.students).find(st => st.id === id);
        setActiveStudent(s || null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        // Move to new container during drag
        if (activeContainer === 'ungrouped') {
            const student = ungrouped.find(s => s.id === active.id);
            if (!student) return;

            setUngrouped(prev => prev.filter(s => s.id !== active.id));
            setGroups(prev => prev.map(g => {
                if (g.id === overContainer) {
                    return { ...g, students: [...g.students, student] };
                }
                return g;
            }));
        } else if (overContainer === 'ungrouped') {
            const group = groups.find(g => g.id === activeContainer);
            const student = group?.students.find(s => s.id === active.id);
            if (!student) return;

            setGroups(prev => prev.map(g => {
                if (g.id === activeContainer) {
                    return { ...g, students: g.students.filter(s => s.id !== active.id) };
                }
                return g;
            }));
            setUngrouped(prev => [...prev, student]);
        } else {
            // Group to Group
            const sourceGroup = groups.find(g => g.id === activeContainer);
            const student = sourceGroup?.students.find(s => s.id === active.id);
            if (!student) return;

            setGroups(prev => prev.map(g => {
                if (g.id === activeContainer) {
                    return { ...g, students: g.students.filter(s => s.id !== active.id) };
                }
                if (g.id === overContainer) {
                    return { ...g, students: [...g.students, student] };
                }
                return g;
            }));
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveStudent(null);

        // Reordering within container could occur here given SortingStrategies,
        // but simple move logic usually handles transfer. 
        // We can add reordering logic if strictly required, but for groups order matters less.
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="h-[calc(100vh-200px)] min-h-[600px] flex gap-6">

                {/* Left Panel: Ungrouped */}
                <div className="w-1/4 min-w-[300px] flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col bg-muted/20 border-2 overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Sin Grupo</span>
                                <Badge variant="secondary">{ungrouped.length}</Badge>
                            </CardTitle>
                            <CardDescription>Estudiantes disponibles</CardDescription>
                            <div className="pt-4 flex gap-2">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reiniciar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            <SortableContext
                                id="ungrouped"
                                items={ungrouped.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-2 min-h-[100px]" ref={useSortable({ id: 'ungrouped', data: { type: 'container' } }).setNodeRef}>
                                    {ungrouped.map(student => (
                                        <SortableStudent key={student.id} student={student} id={student.id} />
                                    ))}
                                    {ungrouped.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                            Todos los estudiantes asignados
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Groups & Controls */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Controls Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-background border rounded-lg shadow-sm">
                        <div className="flex items-center gap-2">
                            <Button onClick={handleAddGroup} variant="secondary">
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Grupo
                            </Button>
                            <Button
                                onClick={handleExportGroups}
                                variant="outline"
                                disabled={groups.length === 0}
                                title="Exportar Grupos a Excel"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Excel</span>
                            </Button>
                            
                            <div className="flex items-center gap-1 border-l pl-2 ml-2">
                                <Button
                                    onClick={handleExportJSON}
                                    variant="outline"
                                    size="sm"
                                    disabled={groups.length === 0 && ungrouped.length === 0}
                                    className="gap-2"
                                >
                                    <FileJson className="w-4 h-4" />
                                    <span className="hidden lg:inline">Guardar JSON</span>
                                </Button>
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        id="import-json"
                                        onChange={handleImportJSON}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        asChild
                                    >
                                        <label htmlFor="import-json" className="cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            <span className="hidden lg:inline">Cargar JSON</span>
                                        </label>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-l pl-4">
                            <Label htmlFor="groupCount" className="text-sm font-medium">Generar</Label>
                            <Input
                                id="groupCount"
                                type="number"
                                min="2"
                                max="20"
                                className="w-20"
                                value={groupCountInput}
                                onChange={(e) => setGroupCountInput(e.target.value)}
                            />
                            <span className="text-sm text-muted-foreground">grupos</span>
                            <Button onClick={handleRandomize}>
                                <Shuffle className="w-4 h-4 mr-2" />
                                Aleatorio
                            </Button>
                        </div>
                    </div>

                    {/* Groups Grid */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        {groups.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                                <Users className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No hay grupos creados</p>
                                <p className="text-sm">Agrega grupos manualmente o genéralos aleatoriamente.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                                {groups.map((group) => (
                                    <div key={group.id} className="min-h-[200px]">
                                        <DroppableContainer
                                            id={group.id}
                                            items={group.students.map(s => s.id)}
                                            title={group.name}
                                            onRemove={() => handleRemoveGroup(group.id)}
                                        >
                                            <SortableContext
                                                id={group.id}
                                                items={group.students.map(s => s.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {group.students.map(student => (
                                                    <SortableStudent key={student.id} student={student} id={student.id} />
                                                ))}
                                            </SortableContext>
                                        </DroppableContainer>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeStudent ? (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border shadow-xl opacity-90 w-[300px]">
                        <GripVertical className="h-4 w-4" />
                        <Avatar className="h-8 w-8 ml-4">
                            <AvatarImage src={activeStudent.image || undefined} />
                            <AvatarFallback>{formatName(activeStudent.name, activeStudent.profile)[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium pr-2">
                                {formatName(activeStudent.name, activeStudent.profile)}
                            </p>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
