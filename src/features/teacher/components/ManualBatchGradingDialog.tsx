"use client";

import React, { useState, useMemo } from "react";
import { 
    Users, 
    CheckCircle2, 
    Loader2, 
    Search,
    Award,
    RotateCcw,
    FileText,
    Sparkles,
    Check,
    X,
    Filter
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatName, cn } from "@/lib/utils";
import { gradeManualActivityBatchAction } from "@/features/teacher/actions/gradingActions";

const QUICK_GRADE_PRESETS = [
    { label: "5.0", val: 5.0, desc: "Excelente" },
    { label: "4.5", val: 4.5, desc: "Muy alto" },
    { label: "4.0", val: 4.0, desc: "Sobresaliente" },
    { label: "3.5", val: 3.5, desc: "Aceptable" },
    { label: "3.0", val: 3.0, desc: "Aprobatorio" },
    { label: "2.5", val: 2.5, desc: "Insuficiente" },
    { label: "0.0", val: 0.0, desc: "No presentó" },
];

const QUICK_FEEDBACK_CHIPS = [
    "Trabajo y entrega realizada en clase presencial.",
    "Sustentación grupal aprobada satisfactoriamente.",
    "Participación activa y buen desempeño en el taller.",
    "Actividad completada según los criterios acordados.",
    "Calificación asignada por evaluación presencial en aula.",
];

interface ManualBatchGradingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    activity: any;
    studentStatus: any[];
    studentGroups?: any[];
    selectedStudentIds: string[];
    onSelectedStudentIdsChange: (ids: string[]) => void;
    onSuccess: () => void;
}

export function ManualBatchGradingDialog({
    isOpen,
    onClose,
    activity,
    studentStatus,
    studentGroups = [],
    selectedStudentIds,
    onSelectedStudentIdsChange,
    onSuccess
}: ManualBatchGradingDialogProps) {
    const [gradeInput, setGradeInput] = useState<string>("5.0");
    const [feedback, setFeedback] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [overwriteGraded, setOverwriteGraded] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const parsedGrade = parseFloat(String(gradeInput || "").trim().replace(",", "."));
    const isValidGrade = !isNaN(parsedGrade) && parsedGrade >= 0 && parsedGrade <= 5.0;
    const isPassing = isValidGrade && parsedGrade >= 3.0;

    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return studentStatus;
        const q = searchQuery.toLowerCase().trim();
        return studentStatus.filter(({ student, group }) => {
            const name = (student.name || "").toLowerCase();
            const email = (student.email || "").toLowerCase();
            const groupName = (group?.name || "").toLowerCase();
            return name.includes(q) || email.includes(q) || groupName.includes(q);
        });
    }, [studentStatus, searchQuery]);

    // Candidates count
    const totalStudents = studentStatus.length;
    const pendingStudents = useMemo(() => {
        return studentStatus.filter(s => !s.submission || s.submission.grade === null);
    }, [studentStatus]);

    // Effective list of students to grade considering overwrite flag
    const effectiveSelectedStudents = useMemo(() => {
        if (overwriteGraded) {
            return selectedStudentIds;
        }
        const pendingIds = new Set(pendingStudents.map(s => s.student.id));
        return selectedStudentIds.filter(id => pendingIds.has(id));
    }, [selectedStudentIds, overwriteGraded, pendingStudents]);

    // Quick selection helpers
    const handleSelectAll = () => {
        onSelectedStudentIdsChange(studentStatus.map(s => s.student.id));
    };

    const handleDeselectAll = () => {
        onSelectedStudentIdsChange([]);
    };

    const handleSelectPendingOnly = () => {
        onSelectedStudentIdsChange(pendingStudents.map(s => s.student.id));
    };

    const handleSelectGroup = (group: any) => {
        const memberIds = (group.members || []).map((m: any) => m.userId || m.user?.id).filter(Boolean);
        const next = Array.from(new Set([...selectedStudentIds, ...memberIds]));
        onSelectedStudentIdsChange(next);
    };

    const handleSubmit = async () => {
        if (!isValidGrade) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }

        if (effectiveSelectedStudents.length === 0) {
            toast.error("Debe seleccionar al menos un estudiante para calificar.");
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await gradeManualActivityBatchAction({
                activityId: activity.id,
                courseId: activity.courseId,
                studentIds: effectiveSelectedStudents,
                grade: parsedGrade,
                feedback: feedback.trim() || undefined,
            });

            toast.success(`Calificación guardada para ${result.count} estudiante(s)`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error en calificación manual masiva:", error);
            toast.error(error.message || "No se pudo guardar la calificación masiva");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
            <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-border/80">
                {/* Header */}
                <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-2xs">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                                <span>Calificación Masiva / Grupal</span>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono">
                                    Actividad Manual
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground truncate">
                                Asigna nota y observaciones a todo el grupo o a los estudiantes seleccionados para &quot;{activity.title}&quot;
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Content body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {/* Nota y Presets */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <Label htmlFor="batch-grade-input" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-primary" />
                                <span>Calificación a Asignar (Escala 0.0 - 5.0)</span>
                            </Label>
                            {isValidGrade && (
                                <Badge className={cn(
                                    "px-2.5 py-0.5 text-xs font-bold font-mono self-start sm:self-auto",
                                    isPassing 
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                )}>
                                    {isPassing ? "Aprobando" : "Reprobando"} ({parsedGrade.toFixed(1)} / 5.0)
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Input
                                id="batch-grade-input"
                                type="number"
                                step="0.1"
                                min="0.0"
                                max="5.0"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                                placeholder="5.0"
                                className="h-10 text-lg font-bold font-mono max-w-[140px] text-center"
                                autoFocus
                            />
                            {/* Preset Buttons */}
                            <div className="flex flex-wrap gap-1.5 flex-1">
                                {QUICK_GRADE_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.label}
                                        type="button"
                                        variant={gradeInput === preset.label ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setGradeInput(preset.label)}
                                        className={cn(
                                            "h-8 px-2.5 text-xs font-bold font-mono transition-all",
                                            gradeInput === preset.label
                                                ? "bg-primary text-primary-foreground shadow-2xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title={preset.desc}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Observaciones / Retroalimentación */}
                    <div className="space-y-2">
                        <Label htmlFor="batch-feedback" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Observaciones / Retroalimentación (Opcional)</span>
                        </Label>
                        <Textarea
                            id="batch-feedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Ej: Excelente sustentación y participación en el taller de clase..."
                            className="text-xs min-h-[70px] resize-none"
                        />
                        {/* Chips rápidos */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setFeedback(chip)}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50 truncate max-w-full text-left cursor-pointer"
                                    title={chip}
                                >
                                    + {chip}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sección de Selección de Estudiantes */}
                    <div className="space-y-3 pt-2 border-t border-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                    Estudiantes a Calificar ({effectiveSelectedStudents.length} de {totalStudents})
                                </span>
                                {effectiveSelectedStudents.length === totalStudents && totalStudents > 0 && (
                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                        Todo el curso
                                    </Badge>
                                )}
                            </div>

                            {/* Opciones rápidas */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="h-7 text-[11px] px-2 font-medium"
                                >
                                    Todos ({totalStudents})
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectPendingOnly}
                                    className="h-7 text-[11px] px-2 font-medium"
                                >
                                    Solo Pendientes ({pendingStudents.length})
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDeselectAll}
                                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                                >
                                    Limpiar
                                </Button>
                            </div>
                        </div>

                        {/* Grupos rápidos si existen */}
                        {studentGroups && studentGroups.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                                <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                                    <Filter className="h-3 w-3" /> Grupos:
                                </span>
                                {studentGroups.map((grp: any) => {
                                    const memberCount = grp.members?.length || 0;
                                    return (
                                        <button
                                            key={grp.id}
                                            type="button"
                                            onClick={() => handleSelectGroup(grp)}
                                            className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shrink-0 transition-colors cursor-pointer"
                                        >
                                            + {grp.name} ({memberCount})
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Search bar & Switch */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por nombre, correo o grupo..."
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Switch
                                    id="overwrite-switch"
                                    checked={overwriteGraded}
                                    onCheckedChange={setOverwriteGraded}
                                />
                                <Label htmlFor="overwrite-switch" className="text-[11px] font-medium text-muted-foreground cursor-pointer">
                                    Sobrescribir si ya tiene nota
                                </Label>
                            </div>
                        </div>

                        {/* Lista de estudiantes con checkboxes */}
                        <div className="rounded-xl border border-border/70 overflow-hidden bg-background divide-y divide-border/40 max-h-[220px] overflow-y-auto custom-scrollbar">
                            {filteredStudents.map(({ student, submission, group }) => {
                                const isSelected = selectedStudentIds.includes(student.id);
                                const hasGrade = submission?.grade !== null && submission?.grade !== undefined;

                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => {
                                            onSelectedStudentIdsChange(
                                                isSelected
                                                    ? selectedStudentIds.filter(id => id !== student.id)
                                                    : [...selectedStudentIds, student.id]
                                            );
                                        }}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 px-3 transition-colors cursor-pointer select-none",
                                            isSelected 
                                                ? "bg-primary/5 hover:bg-primary/10" 
                                                : "hover:bg-muted/40"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    onSelectedStudentIdsChange(
                                                        checked
                                                            ? [...selectedStudentIds, student.id]
                                                            : selectedStudentIds.filter(id => id !== student.id)
                                                    );
                                                }}
                                                className="shrink-0"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {formatName(student.name, student.profile)}
                                                    </span>
                                                    {group && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                                            {group.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-muted-foreground truncate">
                                                    {student.email}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 pl-2">
                                            {hasGrade ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                                                    Nota actual: {submission.grade.toFixed(1)}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                                                    Pendiente
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredStudents.length === 0 && (
                                <div className="p-6 text-center text-xs text-muted-foreground">
                                    No se encontraron estudiantes con el criterio de búsqueda.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground font-medium order-2 sm:order-1 text-center sm:text-left">
                        {effectiveSelectedStudents.length > 0 ? (
                            <span>
                                Se asignará <strong>{parsedGrade.toFixed(1)}</strong> a <strong className="text-foreground">{effectiveSelectedStudents.length}</strong> estudiante(s).
                            </span>
                        ) : (
                            <span className="text-destructive">Ningún estudiante seleccionado</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting || effectiveSelectedStudents.length === 0 || !isValidGrade}
                            className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Guardando ({effectiveSelectedStudents.length})...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Calificar ({effectiveSelectedStudents.length})</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
