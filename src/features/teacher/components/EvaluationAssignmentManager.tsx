"use client";

import { useState } from "react";
import { format } from "date-fns";
import { formatDateTime } from "@/lib/dateUtils";
import { Plus, Trash2, CalendarClock, Link as LinkIcon, FileText, Users, Edit, LayoutGrid, List } from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { assignEvaluationAction, unassignEvaluationAction, updateEvaluationAssignmentAction } from "@/features/teacher/actions/evaluationActions";

/**
 * Converts a datetime-local string (e.g. "2026-03-02T10:00") to an ISO string
 * that accounts for the user's browser timezone offset.
 * This ensures the server stores the exact UTC moment the user intended.
 */
function localDatetimeToISO(dtLocalStr: string): string {
    // Parse the local datetime string components
    const [datePart, timePart] = dtLocalStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    // Create a Date object in local time
    const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    // Return as ISO (UTC) string - this correctly accounts for the browser timezone
    return localDate.toISOString();
}

export function EvaluationAssignmentManager({
    courseId,
    attempts,
    teacherEvaluations
}: {
    courseId: string;
    attempts: any[];
    teacherEvaluations: any[];
}) {
    const [isAssigning, setIsAssigning] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [selectedEvaluation, setSelectedEvaluation] = useState("");
    const [editingAttempt, setEditingAttempt] = useState<any>(null);

    const handleAssign = async (formData: FormData) => {
        const startTimeRaw = formData.get("startTime") as string;
        const endTimeRaw = formData.get("endTime") as string;
        if (startTimeRaw) formData.set("startTime", localDatetimeToISO(startTimeRaw));
        if (endTimeRaw) formData.set("endTime", localDatetimeToISO(endTimeRaw));
        await assignEvaluationAction(formData);
        setIsAssigning(false);
        setSelectedEvaluation("");
    };

    const handleUpdate = async (formData: FormData) => {
        const startTimeRaw = formData.get("startTime") as string;
        const endTimeRaw = formData.get("endTime") as string;
        if (startTimeRaw) formData.set("startTime", localDatetimeToISO(startTimeRaw));
        if (endTimeRaw) formData.set("endTime", localDatetimeToISO(endTimeRaw));
        await updateEvaluationAssignmentAction(formData);
        setEditingAttempt(null);
    };


    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-border/40">
                <div>
                    <h3 className="text-lg font-medium">Evaluaciones Asignadas</h3>
                    <p className="text-sm text-muted-foreground">
                        Programa evaluaciones para que los estudiantes de este curso las resuelvan.
                    </p>
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

                    <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" /> Asignar Evaluación
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form action={handleAssign}>
                            <input type="hidden" name="courseId" value={courseId} />

                            <DialogHeader>
                                <DialogTitle>Asignar Evaluación al Grupo</DialogTitle>
                                <DialogDescription>
                                    Elige una evaluación y establece un rango de fecha y hora estricto.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="evaluationId">Evaluación</Label>
                                    <Select name="evaluationId" value={selectedEvaluation} onValueChange={setSelectedEvaluation} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una evaluación..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teacherEvaluations.map((ev: any) => (
                                                <SelectItem key={ev.id} value={ev.id}>
                                                    {ev.title} ({ev._count?.questions || 0} preg.)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="startTime">Inicio (Fecha y Hora)</Label>
                                    <Input
                                        id="startTime"
                                        name="startTime"
                                        type="datetime-local"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="endTime">Cierre (Fecha y Hora)</Label>
                                    <Input
                                        id="endTime"
                                        name="endTime"
                                        type="datetime-local"
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAssigning(false)}>Cancelar</Button>
                                <Button type="submit">Asignar al Grupo</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            </div>

            {viewMode === "grid" ? (
                attempts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-muted/5 rounded-[2rem] border border-dashed border-muted/30">
                        <FileText className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
                        <p className="text-sm font-semibold text-muted-foreground">No hay evaluaciones asignadas a este grupo todavía.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {attempts.map((attempt) => {
                            const start = new Date(attempt.startTime);
                            const end = new Date(attempt.endTime);
                            const now = new Date();
                            const isActive = now >= start && now <= end;
                            const isFinished = now > end;

                            const formatForInput = (date: Date) => {
                                const pad = (num: number) => num.toString().padStart(2, '0');
                                const y = date.getFullYear();
                                const m = pad(date.getMonth() + 1);
                                const d = pad(date.getDate());
                                const h = pad(date.getHours());
                                const min = pad(date.getMinutes());
                                return `${y}-${m}-${d}T${h}:${min}`;
                            };

                            const rawDesc = attempt.evaluation?.description 
                                ? attempt.evaluation.description.replace(/[\*#_\n\r]/g, ' ').replace(/descripción de la evaluación/gi, '').replace(/instrucciones/gi, '').replace(/\s+/g, ' ').trim()
                                : "";
                            const cleanContent = rawDesc.replace(/[\s\.\-_]/g, '');
                            const displayDesc = cleanContent.length > 0 
                                ? (rawDesc.length > 90 ? rawDesc.substring(0, 90) + "..." : rawDesc)
                                : undefined;

                            return (
                                <AICanvasCard
                                    key={attempt.id}
                                    title={attempt.evaluation.title}
                                    description={displayDesc}
                                    icon={FileText}
                                    badge={isActive ? "Activa ahora" : isFinished ? "Finalizada" : "Programada"}
                                    badgeColor={isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : isFinished ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}
                                    accentColor="from-purple-500/30 via-pink-500/20 to-transparent"
                                    iconBgColor="bg-purple-500/10 dark:bg-purple-500/20"
                                    iconTextColor="text-purple-600 dark:text-purple-400"
                                    hideFooter={true}
                                    className="h-full group"
                                >
                                    <div className="space-y-3 pt-2 text-xs text-muted-foreground border-t border-border/40 mt-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-foreground">Disponibilidad:</span>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span>{formatDateTime(start, "dd/MM/yy HH:mm")} hasta {formatDateTime(end, "dd/MM/yy HH:mm")}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Entregas realizadas:</span>
                                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/30">
                                                {attempt._count?.submissions || 0} alumnos
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-auto border-t border-border/40 flex items-center justify-between gap-2">
                                        <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}`} className="flex-1">
                                            <Button variant="default" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                                                <Users className="h-4 w-4" />
                                                <span>Ver Entregas</span>
                                            </Button>
                                        </Link>

                                        {/* Dialog de Edición */}
                                        <Dialog open={editingAttempt?.id === attempt.id} onOpenChange={(open) => !open && setEditingAttempt(null)}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700"
                                                    title="Editar Asignación"
                                                    onClick={() => setEditingAttempt(attempt)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <form action={handleUpdate}>
                                                    <input type="hidden" name="attemptId" value={attempt.id} />
                                                    <input type="hidden" name="courseId" value={courseId} />

                                                    <DialogHeader>
                                                        <DialogTitle>Editar Asignación</DialogTitle>
                                                        <DialogDescription>
                                                            Modifica los detalles de la programación para esta evaluación.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="evaluationId">Evaluación</Label>
                                                            <Select name="evaluationId" defaultValue={attempt.evaluationId}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecciona una evaluación..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {teacherEvaluations.map((ev: any) => (
                                                                        <SelectItem key={ev.id} value={ev.id}>
                                                                            {ev.title} ({ev._count?.questions || 0} preg.)
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="startTime">Inicio (Fecha y Hora)</Label>
                                                            <Input
                                                                id="startTime"
                                                                name="startTime"
                                                                type="datetime-local"
                                                                defaultValue={formatForInput(start)}
                                                                required
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="endTime">Cierre (Fecha y Hora)</Label>
                                                            <Input
                                                                id="endTime"
                                                                name="endTime"
                                                                type="datetime-local"
                                                                defaultValue={formatForInput(end)}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="button" variant="outline" onClick={() => setEditingAttempt(null)}>Cancelar</Button>
                                                        <Button type="submit">Guardar Cambios</Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                                                    title="Anular Asignación"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <form
                                                    action={async (formData) => {
                                                        await unassignEvaluationAction(formData);
                                                    }}
                                                >
                                                    <input type="hidden" name="attemptId" value={attempt.id} />
                                                    <input type="hidden" name="courseId" value={courseId} />
                                                    <DialogHeader>
                                                        <DialogTitle>Desvincular Evaluación</DialogTitle>
                                                        <DialogDescription>
                                                            ¿Estás seguro de que quieres anular esta asignación?
                                                            Se borrarán los registros de los alumnos que la hayan presentado para este grupo.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="mt-4">
                                                        <Button type="submit" variant="destructive">
                                                            Sí, anular asignación
                                                        </Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </AICanvasCard>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="w-full overflow-x-auto rounded-md border bg-card">
                    <Table className="min-w-[640px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Evaluación</TableHead>
                                <TableHead>Disponibilidad</TableHead>
                                <TableHead>Entregas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attempts.map((attempt) => {
                                const start = new Date(attempt.startTime);
                                const end = new Date(attempt.endTime);
                                const now = new Date();
                                const isActive = now >= start && now <= end;
                                const isFinished = now > end;

                                const formatForInput = (date: Date) => {
                                    const pad = (num: number) => num.toString().padStart(2, '0');
                                    const y = date.getFullYear();
                                    const m = pad(date.getMonth() + 1);
                                    const d = pad(date.getDate());
                                    const h = pad(date.getHours());
                                    const min = pad(date.getMinutes());
                                    return `${y}-${m}-${d}T${h}:${min}`;
                                };

                                return (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4 text-muted-foreground" /> {attempt.evaluation.title}
                                                </span>
                                                {isActive ? (
                                                    <span className="text-xs text-green-600 dark:text-green-400">Activa ahora</span>
                                                ) : isFinished ? (
                                                    <span className="text-xs text-red-600 dark:text-red-400">Finalizada</span>
                                                ) : (
                                                    <span className="text-xs text-yellow-600 dark:text-yellow-400">Programada</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <CalendarClock className="h-3 w-3" />
                                                    <span>{formatDateTime(start, "dd/MM/yy HH:mm")}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground ml-4">
                                                    hasta {formatDateTime(end, "dd/MM/yy HH:mm")}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {attempt._count?.submissions || 0} alumnos
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-primary hover:text-primary/80"
                                                        title="Ver Entregas"
                                                    >
                                                        <Users className="h-4 w-4" />
                                                    </Button>
                                                </Link>

                                                {/* Dialog de Edición */}
                                                <Dialog open={editingAttempt?.id === attempt.id} onOpenChange={(open) => !open && setEditingAttempt(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            title="Editar Asignación"
                                                            onClick={() => setEditingAttempt(attempt)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px]">
                                                        <form action={handleUpdate}>
                                                            <input type="hidden" name="attemptId" value={attempt.id} />
                                                            <input type="hidden" name="courseId" value={courseId} />

                                                            <DialogHeader>
                                                                <DialogTitle>Editar Asignación</DialogTitle>
                                                                <DialogDescription>
                                                                    Modifica los detalles de la programación para esta evaluación.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid gap-4 py-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="evaluationId">Evaluación</Label>
                                                                    <Select name="evaluationId" defaultValue={attempt.evaluationId}>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Selecciona una evaluación..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {teacherEvaluations.map((ev: any) => (
                                                                                <SelectItem key={ev.id} value={ev.id}>
                                                                                    {ev.title} ({ev._count?.questions || 0} preg.)
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label htmlFor="startTime">Inicio (Fecha y Hora)</Label>
                                                                    <Input
                                                                        id="startTime"
                                                                        name="startTime"
                                                                        type="datetime-local"
                                                                        defaultValue={formatForInput(start)}
                                                                        required
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label htmlFor="endTime">Cierre (Fecha y Hora)</Label>
                                                                    <Input
                                                                        id="endTime"
                                                                        name="endTime"
                                                                        type="datetime-local"
                                                                        defaultValue={formatForInput(end)}
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button type="button" variant="outline" onClick={() => setEditingAttempt(null)}>Cancelar</Button>
                                                                <Button type="submit">Guardar Cambios</Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            title="Anular Asignación"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <form
                                                            action={async (formData) => {
                                                                await unassignEvaluationAction(formData);
                                                            }}
                                                        >
                                                            <input type="hidden" name="attemptId" value={attempt.id} />
                                                            <input type="hidden" name="courseId" value={courseId} />
                                                            <DialogHeader>
                                                                <DialogTitle>Desvincular Evaluación</DialogTitle>
                                                                <DialogDescription>
                                                                    ¿Estás seguro de que quieres anular esta asignación?
                                                                    Se borrarán los registros de los alumnos que la hayan presentado para este grupo.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter className="mt-4">
                                                                <Button type="submit" variant="destructive">
                                                                    Sí, anular asignación
                                                                </Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {attempts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No hay evaluaciones asignadas a este grupo todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div >
    );
}
