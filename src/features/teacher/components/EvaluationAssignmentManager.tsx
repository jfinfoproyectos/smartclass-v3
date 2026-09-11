"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatDateTime } from "@/lib/dateUtils";
import { 
    Plus, Trash2, CalendarClock, Link as LinkIcon, FileText, Users, Edit, LayoutGrid, List,
    Shield, ShieldAlert, ShieldCheck, Monitor, Eye, Copy, Lock, AlertTriangle, Clock, Calendar,
    Settings2, Info, Bot, Sparkles, BookOpen, UserCheck, Search
} from "lucide-react";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { assignEvaluationAction, unassignEvaluationAction, updateEvaluationAssignmentAction } from "@/features/teacher/actions/evaluationActions";

export interface CourseHelpOption {
    id: string;
    title: string;
    url: string;
    type: 'doc' | 'link';
}

/**
 * Convierte un string de datetime-local ("2026-03-02T10:00") a formato ISO UTC
 */
function localDatetimeToISO(dtLocalStr: string): string {
    if (!dtLocalStr) return "";
    try {
        if (!dtLocalStr.includes('T')) return new Date(dtLocalStr).toISOString();
        const [datePart, timePart] = dtLocalStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
        return localDate.toISOString();
    } catch {
        return new Date(dtLocalStr).toISOString();
    }
}

/**
 * Formatea una fecha para input datetime-local
 */
function formatForInput(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Modal unificado y moderno para Asignar y Configurar Evaluaciones con Sistemas de Vigilancia
 */
interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    attempt?: any;
    courseId: string;
    teacherEvaluations: any[];
    courseHelpOptions?: CourseHelpOption[];
    enrolledStudents?: any[];
    attempts?: any[];
    onSubmit: (formData: FormData) => Promise<void>;
}

function AssignmentModal({
    isOpen,
    onClose,
    attempt,
    courseId,
    teacherEvaluations,
    courseHelpOptions = [],
    enrolledStudents = [],
    attempts = [],
    onSubmit,
}: AssignmentModalProps) {
    const [activeTab, setActiveTab] = useState<string>("schedule");
    const [selectedEvaluationId, setSelectedEvaluationId] = useState(attempt?.evaluationId || "");
    const [startTime, setStartTime] = useState(attempt ? formatForInput(new Date(attempt.startTime)) : "");
    const [endTime, setEndTime] = useState(attempt ? formatForInput(new Date(attempt.endTime)) : "");
    const [enableSurveillance, setEnableSurveillance] = useState(true);
    const [blockTabSwitch, setBlockTabSwitch] = useState(true);
    const [requireFullscreen, setRequireFullscreen] = useState(true);
    const [blockMultipleDisplays, setBlockMultipleDisplays] = useState(true);
    const [blockClipboard, setBlockClipboard] = useState(true);
    const [maxWarnings, setMaxWarnings] = useState<number>(3);
    const [helpUrl, setHelpUrl] = useState(attempt?.helpUrl || "");
    const [maxSupportAttempts, setMaxSupportAttempts] = useState<number>(attempt?.maxSupportAttempts ?? 3);
    const [aiSupportDelaySeconds, setAiSupportDelaySeconds] = useState<number>(attempt?.aiSupportDelaySeconds ?? 60);
    const [wildcardAiHints, setWildcardAiHints] = useState<number>(attempt?.wildcardAiHints ?? 0);
    const [isPending, setIsPending] = useState(false);

    // Selección de estudiantes (Todos o específicos)
    const [assignmentTarget, setAssignmentTarget] = useState<"all" | "selective">("all");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");

    useEffect(() => {
        if (attempt) {
            setSelectedEvaluationId(attempt.evaluationId || "");
            setStartTime(formatForInput(new Date(attempt.startTime)));
            setEndTime(formatForInput(new Date(attempt.endTime)));
            setEnableSurveillance(attempt.enableSurveillance !== false);
            setBlockTabSwitch(attempt.blockTabSwitch !== false);
            setRequireFullscreen(attempt.requireFullscreen !== false);
            setBlockMultipleDisplays(attempt.blockMultipleDisplays !== false);
            setBlockClipboard(attempt.blockClipboard !== false);
            setMaxWarnings(attempt.maxWarnings ?? 3);
            setHelpUrl(attempt.helpUrl || "");
            setMaxSupportAttempts(attempt.maxSupportAttempts ?? 3);
            setAiSupportDelaySeconds(attempt.aiSupportDelaySeconds ?? 60);
            setWildcardAiHints(attempt.wildcardAiHints ?? 0);

            const initialAssigned = Array.isArray(attempt.assignedStudentIds)
                ? attempt.assignedStudentIds
                : typeof attempt.assignedStudentIds === 'string'
                    ? JSON.parse(attempt.assignedStudentIds)
                    : [];
            if (initialAssigned && initialAssigned.length > 0) {
                setAssignmentTarget("selective");
                setSelectedStudentIds(initialAssigned);
            } else {
                setAssignmentTarget("all");
                setSelectedStudentIds([]);
            }
            setStudentSearchQuery("");
            setActiveTab("schedule");
        } else {
            setSelectedEvaluationId(teacherEvaluations.length > 0 ? teacherEvaluations[0].id : "");
            const now = new Date();
            setStartTime(formatForInput(now));
            setEndTime(formatForInput(new Date(now.getTime() + 2 * 60 * 60 * 1000)));
            setEnableSurveillance(true);
            setBlockTabSwitch(true);
            setRequireFullscreen(true);
            setBlockMultipleDisplays(true);
            setBlockClipboard(true);
            setMaxWarnings(3);
            setHelpUrl("");
            setMaxSupportAttempts(3);
            setAiSupportDelaySeconds(60);
            setWildcardAiHints(0);
            setAssignmentTarget("all");
            setSelectedStudentIds([]);
            setStudentSearchQuery("");
            setActiveTab("schedule");
        }
    }, [attempt, isOpen, teacherEvaluations]);

    // Normalización de estudiantes matriculados
    const normalizedStudents = enrolledStudents.map((s: any) => {
        const user = s.user || s;
        const profile = user.profile || {};
        const fullName = (profile.nombres && profile.apellido)
            ? `${profile.nombres} ${profile.apellido}`
            : user.name || "Estudiante";
        const email = user.email || "";
        const identificacion = profile.identificacion || "";
        const id = user.id || s.userId || s.id;
        return { id, fullName, email, identificacion, image: user.image };
    });

    // Identificar qué estudiantes ya presentaron esta evaluación previamente en la ficha
    const previousSubmissionsForEval = (attempts || [])
        .filter((att: any) => (att.evaluationId === selectedEvaluationId || att.evaluation?.id === selectedEvaluationId) && att.id !== attempt?.id)
        .flatMap((att: any) => att.submissions || []);

    const submittedUserIds = new Set(
        previousSubmissionsForEval
            .filter((sub: any) => sub.submittedAt != null)
            .map((sub: any) => sub.userId)
    );

    const unsubmittedStudents = normalizedStudents.filter(s => !submittedUserIds.has(s.id));

    const filteredStudents = normalizedStudents.filter(s => {
        if (!studentSearchQuery.trim()) return true;
        const q = studentSearchQuery.toLowerCase();
        return s.fullName.toLowerCase().includes(q) ||
               s.email.toLowerCase().includes(q) ||
               s.identificacion.toLowerCase().includes(q);
    });

    const handleSelectAll = () => {
        setSelectedStudentIds(normalizedStudents.map(s => s.id));
    };

    const handleDeselectAll = () => {
        setSelectedStudentIds([]);
    };

    const handleSelectUnsubmitted = () => {
        const ids = unsubmittedStudents.map(s => s.id);
        setSelectedStudentIds(ids);
        setAssignmentTarget("selective");
        if (ids.length === 0) {
            toast.info("Todos los estudiantes ya tienen una entrega registrada para esta evaluación.");
        } else {
            toast.success(`Se seleccionaron ${ids.length} estudiantes que no han presentado la evaluación.`);
        }
    };

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!selectedEvaluationId) {
            toast.error("Por favor selecciona una evaluación de la lista en la pestaña Horario.");
            setActiveTab("schedule");
            return;
        }
        if (!startTime) {
            toast.error("Por favor define la fecha y hora de inicio en la pestaña Horario.");
            setActiveTab("schedule");
            return;
        }
        if (!endTime) {
            toast.error("Por favor define la fecha y hora de cierre en la pestaña Horario.");
            setActiveTab("schedule");
            return;
        }
        if (new Date(endTime) <= new Date(startTime)) {
            toast.error("La fecha de cierre debe ser posterior a la fecha de inicio.");
            setActiveTab("schedule");
            return;
        }
        if (assignmentTarget === "selective" && selectedStudentIds.length === 0) {
            toast.error("Has seleccionado 'Estudiantes específicos' pero no has marcado ningún estudiante en la pestaña Estudiantes.");
            setActiveTab("students");
            return;
        }

        setIsPending(true);
        try {
            const formData = new FormData();
            if (attempt) formData.set("attemptId", attempt.id);
            formData.set("courseId", courseId);
            formData.set("evaluationId", selectedEvaluationId);
            formData.set("startTime", startTime);
            formData.set("endTime", endTime);
            formData.set("enableSurveillance", String(enableSurveillance));
            formData.set("blockTabSwitch", String(blockTabSwitch));
            formData.set("requireFullscreen", String(requireFullscreen));
            formData.set("blockMultipleDisplays", String(blockMultipleDisplays));
            formData.set("blockClipboard", String(blockClipboard));
            formData.set("maxWarnings", String(maxWarnings));
            formData.set("helpUrl", helpUrl);
            formData.set("maxSupportAttempts", String(maxSupportAttempts));
            formData.set("aiSupportDelaySeconds", String(aiSupportDelaySeconds));
            formData.set("wildcardAiHints", String(wildcardAiHints));
            formData.set("wildcardSecondChance", "0");

            const assignedIdsToSave = assignmentTarget === "selective" ? selectedStudentIds : [];
            formData.set("assignedStudentIds", JSON.stringify(assignedIdsToSave));

            await onSubmit(formData);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
            <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[88vh] p-0 flex flex-col overflow-hidden bg-background text-foreground border border-border shadow-2xl rounded-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    {attempt && <input type="hidden" name="attemptId" value={attempt.id} />}
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="evaluationId" value={selectedEvaluationId} />
                    <input type="hidden" name="startTime" value={startTime} />
                    <input type="hidden" name="endTime" value={endTime} />

                    {/* Cabecera estilizada y sólida */}
                    <div className="bg-muted/40 px-5 sm:px-6 py-3.5 border-b border-border/70 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                                <Settings2 className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0 flex-1 pr-6">
                                <DialogTitle className="text-base font-bold text-foreground truncate">
                                    {attempt ? "Configurar Asignación de Evaluación" : "Asignar Evaluación al Curso"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {attempt 
                                        ? "Ajusta las fechas, estudiantes destinatarios, reglas de IA y supervisión."
                                        : "Selecciona una evaluación, define el horario y estudiantes asignados."}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Pestañas de configuración */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1 w-full overflow-hidden">
                        <div className="px-5 sm:px-6 pt-2 pb-1.5 border-b border-border/40 bg-muted/20 shrink-0">
                            <TabsList className="grid grid-cols-4 w-full h-9 bg-muted/60 p-1 gap-1">
                                <TabsTrigger value="schedule" className="text-xs gap-1 font-semibold px-1 py-1 truncate">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Horario</span>
                                </TabsTrigger>
                                <TabsTrigger value="students" className="text-xs gap-1 font-semibold px-1 py-1 truncate">
                                    <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span className="truncate">Alumnos</span>
                                    {assignmentTarget === "selective" ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                                            {selectedStudentIds.length}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.2 rounded-full bg-muted shrink-0">
                                            Todos
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="rules" className="text-xs gap-1 font-semibold px-1 py-1 truncate">
                                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate">Reglas</span>
                                </TabsTrigger>
                                <TabsTrigger value="surveillance" className="text-xs gap-1 font-semibold px-1 py-1 truncate">
                                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Vigilancia</span>
                                    {enableSurveillance && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5 shrink-0" />
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                            {/* Pestaña 1: Programación */}
                            <TabsContent value="schedule" className="space-y-4 m-0">
                                <div className="space-y-2">
                                    <Label htmlFor="evaluationId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Evaluación *
                                    </Label>
                                    <Select 
                                        name="evaluationId" 
                                        value={selectedEvaluationId} 
                                        onValueChange={setSelectedEvaluationId} 
                                        required
                                    >
                                        <SelectTrigger className="h-10 bg-background">
                                            <SelectValue placeholder="Selecciona una evaluación..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teacherEvaluations.map((ev: any) => (
                                                <SelectItem key={ev.id} value={ev.id}>
                                                    {ev.title} ({ev._count?.questions || 0} preguntas)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="startTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                            <span>Inicio (Fecha y Hora) *</span>
                                        </Label>
                                        <Input
                                            id="startTime"
                                            name="startTime"
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            required
                                            className="h-10 bg-background font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="endTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-destructive" />
                                            <span>Cierre (Fecha y Hora) *</span>
                                        </Label>
                                        <Input
                                            id="endTime"
                                            name="endTime"
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            required
                                            className="h-10 bg-background font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <p>
                                        Los estudiantes solo podrán iniciar y presentar la evaluación dentro de este intervalo de tiempo estricto.
                                    </p>
                                </div>
                            </TabsContent>

                            {/* Pestaña: Estudiantes */}
                            <TabsContent value="students" className="space-y-4 m-0">
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        ¿A quiénes va dirigida esta evaluación?
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAssignmentTarget("all")}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer",
                                                assignmentTarget === "all"
                                                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                                                    : "border-border/70 hover:border-border hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                                    <span className="truncate">Toda la ficha / curso</span>
                                                </div>
                                                {assignmentTarget === "all" && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                                Aplica a los <strong>{normalizedStudents.length}</strong> estudiantes matriculados en la ficha.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setAssignmentTarget("selective")}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer",
                                                assignmentTarget === "selective"
                                                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                                                    : "border-border/70 hover:border-border hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                                                    <UserCheck className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <span className="truncate">Estudiantes específicos</span>
                                                </div>
                                                {assignmentTarget === "selective" && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                                Para reprogramar a quienes no presentaron o recuperaciones.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {assignmentTarget === "selective" ? (
                                    <div className="space-y-3 pt-2 border-t border-border/50">
                                        {/* Botón inteligente para seleccionar estudiantes que no han presentado */}
                                        {previousSubmissionsForEval.length > 0 && (
                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <span>
                                                        Hay <strong>{unsubmittedStudents.length}</strong> de {normalizedStudents.length} estudiantes que <strong>no han presentado</strong> esta evaluación previamente.
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleSelectUnsubmitted}
                                                    className="h-8 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 gap-1.5 shrink-0 w-full sm:w-auto cursor-pointer"
                                                >
                                                    <UserCheck className="h-3.5 w-3.5" />
                                                    <span>Marcar no presentados ({unsubmittedStudents.length})</span>
                                                </Button>
                                            </div>
                                        )}

                                        {/* Barra de búsqueda y acciones masivas */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                            <div className="relative flex-1">
                                                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar por nombre, correo o CC..."
                                                    value={studentSearchQuery}
                                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                                    className="h-9 pl-9 text-xs bg-background"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                                <div className="text-[11px] font-semibold text-muted-foreground">
                                                    <span className="font-mono text-primary font-bold">{selectedStudentIds.length}</span>/{normalizedStudents.length} marcados
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSelectAll}
                                                    className="h-8 px-2 text-[11px] font-semibold text-primary hover:text-primary cursor-pointer"
                                                >
                                                    Todos
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleDeselectAll}
                                                    className="h-8 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                                >
                                                    Ninguno
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Lista de estudiantes */}
                                        <div className="rounded-xl border border-border/70 max-h-[220px] overflow-y-auto divide-y divide-border/40 bg-background">
                                            {filteredStudents.length === 0 ? (
                                                <div className="p-6 text-center text-xs text-muted-foreground">
                                                    No se encontraron estudiantes con ese criterio de búsqueda.
                                                </div>
                                            ) : (
                                                filteredStudents.map((st) => {
                                                    const isSelected = selectedStudentIds.includes(st.id);
                                                    const hasSubmitted = submittedUserIds.has(st.id);

                                                    return (
                                                        <label
                                                            key={st.id}
                                                            className={cn(
                                                                "flex items-center justify-between gap-3 p-2.5 px-3 transition-colors cursor-pointer hover:bg-muted/40",
                                                                isSelected && "bg-primary/5 dark:bg-primary/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => toggleStudent(st.id)}
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-semibold text-foreground truncate">
                                                                        {st.fullName}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1.5">
                                                                        {st.identificacion && <span>CC: {st.identificacion}</span>}
                                                                        {st.identificacion && st.email && <span>•</span>}
                                                                        {st.email && <span>{st.email}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {previousSubmissionsForEval.length > 0 && (
                                                                <div className="shrink-0">
                                                                    {hasSubmitted ? (
                                                                        <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground font-normal">
                                                                            Presentó antes
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold">
                                                                            Sin presentar
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-muted-foreground space-y-1">
                                        <Users className="h-6 w-6 text-primary/60 mx-auto mb-1.5" />
                                        <p className="text-xs font-bold text-foreground">Asignación para toda la ficha</p>
                                        <p className="text-[11px]">
                                            Todos los {normalizedStudents.length} estudiantes del grupo podrán acceder a la evaluación dentro del horario definido.
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Pestaña 2: Reglas e IA */}
                            <TabsContent value="rules" className="space-y-4 m-0">
                                <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-card/60">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="helpSelect" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <LinkIcon className="h-3.5 w-3.5 text-primary" />
                                            <span>Ayuda / Recursos de Consulta (Opcional)</span>
                                        </Label>
                                        {helpUrl && (
                                            <Badge variant="outline" className="text-[10px] h-5 px-2 bg-primary/10 text-primary border-primary/20">
                                                {courseHelpOptions.some(o => o.url === helpUrl && o.type === 'doc') ? "Doc. del Curso" : "Recurso Asignado"}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Selector de las ayudas asignadas al curso */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-foreground">
                                            Seleccionar de las ayudas asignadas al curso:
                                        </Label>
                                        <Select 
                                            value={
                                                courseHelpOptions.some(o => o.url === helpUrl) 
                                                    ? helpUrl 
                                                    : !helpUrl 
                                                        ? "none" 
                                                        : "custom"
                                            }
                                            onValueChange={(val) => {
                                                if (val === "none") {
                                                    setHelpUrl("");
                                                } else if (val === "custom") {
                                                    // Mantener lo escrito para editar
                                                } else {
                                                    setHelpUrl(val);
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="helpSelect" className="h-10 bg-background w-full">
                                                <SelectValue placeholder="Elige un material de ayuda..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <span className="text-muted-foreground">🚫 Ninguna (Sin material de ayuda)</span>
                                                </SelectItem>

                                                {courseHelpOptions.filter(o => o.type === 'doc').length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1">
                                                            <BookOpen className="h-3 w-3" /> Documentaciones del Curso
                                                        </SelectLabel>
                                                        {courseHelpOptions.filter(o => o.type === 'doc').map((doc) => (
                                                            <SelectItem key={doc.id} value={doc.url}>
                                                                📘 {doc.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}

                                                {courseHelpOptions.filter(o => o.type === 'link').length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center gap-1">
                                                            <LinkIcon className="h-3 w-3" /> Enlaces Compartidos del Curso
                                                        </SelectLabel>
                                                        {courseHelpOptions.filter(o => o.type === 'link').map((link) => (
                                                            <SelectItem key={link.id} value={link.url}>
                                                                🔗 {link.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}

                                                <SelectSeparator />
                                                <SelectItem value="custom">
                                                    <span>✏️ Otra URL manual o externa...</span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {courseHelpOptions.length === 0 && (
                                            <p className="text-[11px] text-muted-foreground italic">
                                                Este curso no tiene documentaciones vinculadas aún en la pestaña Documentación. Puedes ingresar una URL manual abajo.
                                            </p>
                                        )}
                                    </div>

                                    {/* Campo de URL */}
                                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                                        <Label htmlFor="helpUrl" className="text-[11px] font-medium text-muted-foreground">
                                            URL o enlace de destino:
                                        </Label>
                                        <Input
                                            id="helpUrl"
                                            type="text"
                                            placeholder="https://... o /docs/..."
                                            value={helpUrl}
                                            onChange={(e) => setHelpUrl(e.target.value)}
                                            className="h-9 bg-background font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            {helpUrl
                                                ? "El estudiante podrá consultar este recurso embebido en un visor interactivo dentro de la evaluación."
                                                : "Si se deja vacío, la evaluación no mostrará pestaña de material de ayuda."}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-2">
                                        <Label htmlFor="maxSupportAttempts" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Bot className="h-3.5 w-3.5 text-primary" />
                                            <span>Intentos IA por Pregunta</span>
                                        </Label>
                                        <Input
                                            id="maxSupportAttempts"
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={maxSupportAttempts}
                                            onChange={(e) => setMaxSupportAttempts(Math.max(0, parseInt(e.target.value) || 0))}
                                            required
                                            className="h-10 bg-background font-semibold"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Veces que el estudiante puede pedir retroalimentación y evaluación a la IA por pregunta.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="aiSupportDelaySeconds" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                            <span>Espera entre IA (Seg)</span>
                                        </Label>
                                        <Input
                                            id="aiSupportDelaySeconds"
                                            type="number"
                                            min="0"
                                            value={aiSupportDelaySeconds}
                                            onChange={(e) => setAiSupportDelaySeconds(Math.max(0, parseInt(e.target.value) || 0))}
                                            required
                                            className="h-10 bg-background font-semibold"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Tiempo de enfriamiento (cooldown) tras evaluar antes de volver a solicitarlo a la IA.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border/60">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Comodines para el Estudiante</span>
                                    </div>

                                    <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="wildcardAiHints" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                                                <span>🃏 Pistas de IA</span>
                                            </Label>
                                            <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded border border-border/60">
                                                {wildcardAiHints === 0 ? "Deshabilitado (0)" : `${wildcardAiHints} pistas`}
                                            </span>
                                        </div>
                                        <Input
                                            id="wildcardAiHints"
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={wildcardAiHints}
                                            onChange={(e) => setWildcardAiHints(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="h-9 bg-background font-semibold"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Cantidad de pistas orientativas de IA disponibles para el estudiante durante toda la evaluación. <strong>0 = deshabilitado</strong>.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Pestaña 3: Vigilancia & Restricciones */}
                            <TabsContent value="surveillance" className="space-y-4 m-0">
                                {/* Interruptor Maestro */}
                                <div className={cn(
                                    "rounded-2xl border-2 p-4 transition-all flex items-center justify-between gap-4",
                                    enableSurveillance 
                                        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/15" 
                                        : "border-border/60 bg-muted/20"
                                )}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">Sistema de Vigilancia y Anti-Fraude</span>
                                            <Badge 
                                                variant={enableSurveillance ? "default" : "outline"} 
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5", 
                                                    enableSurveillance 
                                                        ? "bg-emerald-600 hover:bg-emerald-600 text-white" 
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {enableSurveillance ? "ENCENDIDO" : "APAGADO"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {enableSurveillance 
                                                ? "Monitorea activamente al estudiante e impide maniobras deshonestas durante el examen."
                                                : "Sin restricciones de pantalla ni expulsiones: el estudiante puede presentar libremente."}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={enableSurveillance}
                                        onCheckedChange={setEnableSurveillance}
                                    />
                                </div>

                                {/* Mecanismos detallados de supervisión */}
                                {enableSurveillance ? (
                                    <div className="space-y-3 pt-1">
                                        {/* 1. Monitoreo de pestaña y foco */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4 text-amber-500 shrink-0" />
                                                    <Label className="text-xs font-bold cursor-pointer">Bloquear Cambio de Pestaña y Pérdida de Foco</Label>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground pl-6">
                                                    Registra falta o expulsión si el alumno cambia de pestaña del navegador, minimiza o cambia a otra ventana.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={blockTabSwitch}
                                                onCheckedChange={setBlockTabSwitch}
                                            />
                                        </div>

                                        {/* 2. Pantalla completa / maximizada */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="h-4 w-4 text-blue-500 shrink-0" />
                                                    <Label className="text-xs font-bold cursor-pointer">Exigir Ventana Maximizada / Pantalla Completa</Label>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground pl-6">
                                                    Obliga a mantener la ventana maximizada e impide redimensionar para consultar otras apps en pantalla dividida.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={requireFullscreen}
                                                onCheckedChange={setRequireFullscreen}
                                            />
                                        </div>

                                        {/* 3. Múltiples monitores */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="h-4 w-4 text-purple-500 shrink-0" />
                                                    <Label className="text-xs font-bold cursor-pointer">Bloquear Múltiples Monitores</Label>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground pl-6">
                                                    Detecta e impide la evaluación si el estudiante tiene monitores secundarios o proyectores extendidos.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={blockMultipleDisplays}
                                                onCheckedChange={setBlockMultipleDisplays}
                                            />
                                        </div>

                                        {/* 4. Portapapeles y Clic Derecho */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/10 transition-colors">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Copy className="h-4 w-4 text-rose-500 shrink-0" />
                                                    <Label className="text-xs font-bold cursor-pointer">Bloquear Copiar, Pegar y Clic Derecho</Label>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground pl-6">
                                                    Deshabilita copiar preguntas, pegar código o texto externo y anula el menú contextual del navegador.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={blockClipboard}
                                                onCheckedChange={setBlockClipboard}
                                            />
                                        </div>

                                        {/* 5. Límite de Advertencias antes de Expulsión */}
                                        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="maxWarnings" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                    <span>Límite de Advertencias antes de Expulsión</span>
                                                </Label>
                                                <span className="font-mono text-xs font-bold bg-background px-2.5 py-0.5 rounded-md border border-border/80">
                                                    {maxWarnings === 0 ? "Expulsión Inmediata (0)" : `${maxWarnings} faltas`}
                                                </span>
                                            </div>
                                            <Input
                                                id="maxWarnings"
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={maxWarnings}
                                                onChange={(e) => setMaxWarnings(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="h-9 bg-background font-semibold"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                {maxWarnings === 0 
                                                    ? "La primera falta cometida expulsará al estudiante inmediatamente del examen."
                                                    : `El estudiante recibirá hasta ${maxWarnings} advertencias en pantalla antes de la expulsión definitiva.`}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground space-y-1.5">
                                        <ShieldCheck className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-foreground">Modo Libre de Vigilancia</p>
                                        <p className="text-[11px]">Los estudiantes podrán presentar la prueba sin alertas por cambio de pestaña, ventanas o monitores adicionales.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>

                        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-border/70 bg-muted/30 flex items-center justify-between gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending} className="font-semibold shadow-xs">
                                {isPending ? "Guardando..." : attempt ? "Guardar Configuración" : "Asignar Evaluación"}
                            </Button>
                        </div>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function EvaluationAssignmentManager({
    courseId,
    attempts,
    teacherEvaluations,
    courseHelpOptions = [],
    enrolledStudents = []
}: {
    courseId: string;
    attempts: any[];
    teacherEvaluations: any[];
    courseHelpOptions?: CourseHelpOption[];
    enrolledStudents?: any[];
}) {
    const [isAssigning, setIsAssigning] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [editingAttempt, setEditingAttempt] = useState<any>(null);
    const [deletingAttempt, setDeletingAttempt] = useState<any>(null);

    const handleAssign = async (formData: FormData) => {
        try {
            const startTimeRaw = formData.get("startTime") as string;
            const endTimeRaw = formData.get("endTime") as string;
            if (startTimeRaw) formData.set("startTime", localDatetimeToISO(startTimeRaw));
            if (endTimeRaw) formData.set("endTime", localDatetimeToISO(endTimeRaw));
            await assignEvaluationAction(formData);
            toast.success("Evaluación asignada exitosamente al curso.");
            setIsAssigning(false);
        } catch (error: any) {
            toast.error(error.message || "Error al asignar la evaluación.");
        }
    };

    const handleUpdate = async (formData: FormData) => {
        try {
            const startTimeRaw = formData.get("startTime") as string;
            const endTimeRaw = formData.get("endTime") as string;
            if (startTimeRaw) formData.set("startTime", localDatetimeToISO(startTimeRaw));
            if (endTimeRaw) formData.set("endTime", localDatetimeToISO(endTimeRaw));
            await updateEvaluationAssignmentAction(formData);
            toast.success("Configuración de evaluación actualizada.");
            setEditingAttempt(null);
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar la evaluación.");
        }
    };

    return (
        <div className="space-y-4">
            {/* Barra superior de controles */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-border/40">
                <div>
                    <h3 className="text-lg font-medium">Evaluaciones Asignadas</h3>
                    <p className="text-sm text-muted-foreground">
                        Programa evaluaciones para que los estudiantes de este curso las resuelvan con horarios y vigilancia supervisada.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-muted rounded-xl text-xs font-semibold shrink-0">
                        <Button
                            type="button"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs cursor-pointer"
                            onClick={() => setViewMode("grid")}
                            title="Vista de Tarjetas"
                        >
                            <LayoutGrid className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
                            <span>Tarjetas</span>
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs cursor-pointer"
                            onClick={() => setViewMode("table")}
                            title="Vista de Tabla"
                        >
                            <List className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
                            <span>Tabla</span>
                        </Button>
                    </div>

                    <Button size="sm" className="h-8 px-3 rounded-lg font-semibold shrink-0 cursor-pointer" onClick={() => setIsAssigning(true)}>
                        <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">Asignar Evaluación</span>
                        <span className="sm:hidden">Asignar</span>
                    </Button>
                </div>
            </div>

            {/* Modal de Asignación / Creación */}
            <AssignmentModal
                isOpen={isAssigning}
                onClose={() => setIsAssigning(false)}
                courseId={courseId}
                teacherEvaluations={teacherEvaluations}
                courseHelpOptions={courseHelpOptions}
                enrolledStudents={enrolledStudents}
                attempts={attempts}
                onSubmit={handleAssign}
            />

            {/* Modal de Edición */}
            <AssignmentModal
                isOpen={editingAttempt !== null}
                onClose={() => setEditingAttempt(null)}
                attempt={editingAttempt}
                courseId={courseId}
                teacherEvaluations={teacherEvaluations}
                courseHelpOptions={courseHelpOptions}
                enrolledStudents={enrolledStudents}
                attempts={attempts}
                onSubmit={handleUpdate}
            />

            {/* Modal de Confirmación de Desvinculación */}
            <Dialog open={deletingAttempt !== null} onOpenChange={(open) => !open && setDeletingAttempt(null)}>
                <DialogContent className="bg-background text-foreground border border-border shadow-2xl rounded-2xl">
                    <form
                        action={async (formData) => {
                            await unassignEvaluationAction(formData);
                            setDeletingAttempt(null);
                        }}
                    >
                        <input type="hidden" name="attemptId" value={deletingAttempt?.id || ""} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <DialogHeader>
                            <DialogTitle>Desvincular Evaluación</DialogTitle>
                            <DialogDescription>
                                ¿Estás seguro de que deseas anular esta asignación? Se eliminarán los registros de entregas asociados a este grupo.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setDeletingAttempt(null)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="destructive">
                                Sí, anular asignación
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Vista de Tarjetas */}
            {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attempts.map((attempt) => {
                        const now = new Date();
                        const start = new Date(attempt.startTime);
                        const end = new Date(attempt.endTime);
                        const isActive = now >= start && now <= end;
                        const isFinished = now > end;

                        const rawDesc = attempt.evaluation?.description 
                            ? attempt.evaluation.description.replace(/[\*#_\n\r]/g, ' ').replace(/descripción de la evaluación/gi, '').replace(/instrucciones/gi, '').replace(/\s+/g, ' ').trim()
                            : "";
                        const cleanContent = rawDesc.replace(/[\s\.\-_]/g, '');
                        const displayDesc = cleanContent.length > 0 
                            ? (rawDesc.length > 90 ? rawDesc.substring(0, 90) + "..." : rawDesc)
                            : undefined;

                        const isSurveilled = attempt.enableSurveillance !== false;

                        const assignedIds: string[] = Array.isArray(attempt.assignedStudentIds)
                            ? attempt.assignedStudentIds
                            : typeof attempt.assignedStudentIds === 'string'
                                ? JSON.parse(attempt.assignedStudentIds)
                                : [];
                        const isSelective = assignedIds.length > 0;

                        return (
                            <AICanvasCard
                                key={attempt.id}
                                title={attempt.evaluation.title}
                                description={displayDesc}
                                icon={FileText}
                                badge={isActive ? "Activa ahora" : isFinished ? "Finalizada" : "Programada"}
                                badgeColor={isActive ? "bg-primary/10 text-primary border-primary/20" : isFinished ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"}
                                accentColor="from-primary/30 via-primary/15 to-transparent"
                                iconBgColor="bg-primary/10"
                                iconTextColor="text-primary"
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

                                    {/* Destinatarios */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span>Destinatarios:</span>
                                        {isSelective ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/25">
                                                <UserCheck className="h-3 w-3 text-blue-500" />
                                                <span>{assignedIds.length} {assignedIds.length === 1 ? 'estudiante' : 'estudiantes'}</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40">
                                                <Users className="h-3 w-3" />
                                                <span>Toda la ficha ({enrolledStudents.length || 'Todos'})</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Indicador de Vigilancia */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span>Supervisión:</span>
                                        {isSurveilled ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
                                                <ShieldAlert className="h-3 w-3 text-emerald-500" />
                                                <span>Vigilancia Activa</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40">
                                                <ShieldCheck className="h-3 w-3" />
                                                <span>Sin Vigilancia</span>
                                            </span>
                                        )}
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
                                        <Button variant="default" size="sm" className="w-full gap-1.5 text-xs font-semibold cursor-pointer">
                                            <Users className="h-4 w-4" />
                                            <span>Ver Entregas</span>
                                        </Button>
                                    </Link>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                                        title="Editar Configuración y Destinatarios"
                                        onClick={() => setEditingAttempt(attempt)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                        title="Anular Asignación"
                                        onClick={() => setDeletingAttempt(attempt)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </AICanvasCard>
                        );
                    })}
                    {attempts.length === 0 && (
                        <div className="col-span-full border-2 border-dashed border-border/60 rounded-xl p-8 text-center text-muted-foreground">
                            No hay evaluaciones asignadas a este grupo todavía. Haz clic en "Asignar Evaluación" para comenzar.
                        </div>
                    )}
                </div>
            ) : (
                /* Vista de Tabla */
                <div className="rounded-xl border border-border/50 overflow-x-auto shadow-2xs bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="font-bold text-xs uppercase tracking-wider">Evaluación</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Horario</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Vigilancia</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Estado</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Entregas</TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-right pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attempts.map((attempt) => {
                                const now = new Date();
                                const start = new Date(attempt.startTime);
                                const end = new Date(attempt.endTime);
                                const isActive = now >= start && now <= end;
                                const isFinished = now > end;
                                const isSurveilled = attempt.enableSurveillance !== false;

                                const assignedIds: string[] = Array.isArray(attempt.assignedStudentIds)
                                    ? attempt.assignedStudentIds
                                    : typeof attempt.assignedStudentIds === 'string'
                                        ? JSON.parse(attempt.assignedStudentIds)
                                        : [];
                                const isSelective = assignedIds.length > 0;

                                return (
                                    <TableRow key={attempt.id} className="hover:bg-muted/20 transition-colors border-border/30">
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-foreground">{attempt.evaluation.title}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        {attempt.evaluation._count?.questions || 0} preguntas
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">•</span>
                                                    {isSelective ? (
                                                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 px-1.5 py-0">
                                                            <UserCheck className="h-3 w-3" />
                                                            <span>{assignedIds.length} {assignedIds.length === 1 ? 'estudiante' : 'estudiantes'}</span>
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5 py-0 gap-1">
                                                            <Users className="h-3 w-3" />
                                                            <span>Toda la ficha</span>
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-xs">
                                            <div className="flex flex-col items-center">
                                                <span>{formatDateTime(start, "dd/MM/yy HH:mm")}</span>
                                                <span className="text-muted-foreground text-[10px]">hasta</span>
                                                <span>{formatDateTime(end, "dd/MM/yy HH:mm")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isSurveilled ? (
                                                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                                                    <ShieldAlert className="h-3 w-3" />
                                                    <span>Activa</span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    <span>Inactiva</span>
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-bold",
                                                    isActive 
                                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                                                        : isFinished 
                                                        ? "bg-muted text-muted-foreground border-border" 
                                                        : "bg-primary/10 text-primary border-primary/30"
                                                )}
                                            >
                                                {isActive ? "Activa ahora" : isFinished ? "Finalizada" : "Programada"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-xs">
                                            {attempt._count?.submissions || 0}
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:text-primary/80 cursor-pointer"
                                                        title="Ver Entregas"
                                                    >
                                                        <Users className="h-4 w-4" />
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                                                    title="Editar Asignación"
                                                    onClick={() => setEditingAttempt(attempt)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                                    title="Anular Asignación"
                                                    onClick={() => setDeletingAttempt(attempt)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {attempts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No hay evaluaciones asignadas a este grupo todavía.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
