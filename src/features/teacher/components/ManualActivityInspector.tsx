"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Sparkles, Users, Crown, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown,
    ExternalLink, Copy, Check, X, Clock,
    Link as LinkIcon, ClipboardList, Info, FileText
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatName } from "@/lib/utils";
import { format } from "date-fns";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { improveFeedbackAction } from "@/features/teacher/actions/gradingActions";

interface ManualActivityInspectorProps {
    student: any;
    submission: any;
    activity: any;
    evalItem?: any;
    onClose?: () => void;
    studentsList?: any[];
    onSelectStudent?: (studentId: string) => void;
    onGradeManual: (grade: string, feedback: string, studentId: string, activityId: string) => Promise<void>;
    onReject: (studentId: string, feedback?: string) => Promise<void>;
}

export function ManualActivityInspector({
    student,
    submission,
    activity,
    evalItem,
    onClose,
    studentsList = [],
    onSelectStudent,
    onGradeManual,
    onReject,
}: ManualActivityInspectorProps) {
    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";

    const [gradeInput, setGradeInput] = useState<string>(
        submission?.grade !== null && submission?.grade !== undefined
            ? String(submission.grade)
            : ""
    );
    const [feedbackInput, setFeedbackInput] = useState<string>(
        submission?.feedback
            ? submission.feedback.replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "")
            : (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isImprovingAI, setIsImprovingAI] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [activeTab, setActiveTab] = useState<"statement" | "details">("statement");

    // Sincronizar estado al cambiar de estudiante
    useEffect(() => {
        setGradeInput(
            submission?.grade !== null && submission?.grade !== undefined
                ? String(submission.grade)
                : ""
        );
        setFeedbackInput(
            submission?.feedback
                ? submission.feedback.replace("[ENTREGA RECHAZADA]\n", "").replace("[ENTREGA RECHAZADA]", "")
                : (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")
        );
    }, [student?.id, submission, activity.deadline]);

    // Navegación entre estudiantes
    const currentIndex = studentsList.findIndex(s => s.student.id === student?.id);
    const totalStudents = studentsList.length;

    const handlePrev = () => {
        if (currentIndex > 0 && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex - 1].student.id);
        }
    };

    const handleNext = () => {
        if (currentIndex < totalStudents - 1 && onSelectStudent) {
            onSelectStudent(studentsList[currentIndex + 1].student.id);
        }
    };

    const handleCopyUrl = async () => {
        if (!submission?.url) return;
        try {
            await navigator.clipboard.writeText(submission.url);
            setCopiedLink(true);
            toast.success("Enlace copiado al portapapeles");
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    };

    const handleImproveWithAI = async () => {
        if (!feedbackInput || feedbackInput.trim().length < 10) {
            toast.error("Escribe al menos 10 caracteres en la retroalimentación para mejorarla con IA.");
            return;
        }

        setIsImprovingAI(true);
        const toastId = toast.loading("Mejorando redacción con IA...");
        try {
            const improved = await improveFeedbackAction(feedbackInput);
            setFeedbackInput(improved);
            toast.success("Retroalimentación enriquecida exitosamente", { id: toastId });
        } catch (error: any) {
            toast.error("Error al mejorar con IA", { id: toastId, description: error.message });
        } finally {
            setIsImprovingAI(false);
        }
    };

    const handleSave = async (andNext: boolean = false) => {
        if (!gradeInput || isNaN(Number(gradeInput))) {
            toast.error("Por favor ingresa una nota válida entre 0.0 y 5.0");
            return;
        }
        const numericGrade = Number(gradeInput);
        if (numericGrade < 0 || numericGrade > 5) {
            toast.error("La nota debe estar en el rango de 0.0 a 5.0");
            return;
        }

        setIsSaving(true);
        try {
            await onGradeManual(gradeInput, feedbackInput, student.id, activity.id);
            toast.success("Calificación guardada correctamente");
            if (andNext && currentIndex < totalStudents - 1 && onSelectStudent) {
                onSelectStudent(studentsList[currentIndex + 1].student.id);
            }
        } catch (error: any) {
            toast.error("Error al guardar la calificación", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleReject = async () => {
        setIsSaving(true);
        try {
            await onReject(student.id, feedbackInput || undefined);
            if (currentIndex < totalStudents - 1 && onSelectStudent) {
                onSelectStudent(studentsList[currentIndex + 1].student.id);
            }
        } catch (error: any) {
            toast.error("Error al rechazar entrega", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const currentGrade = submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade) : null;
    const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");
    const group = evalItem?.group;
    const isLeader = evalItem?.isLeader;

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2.5 bg-card/80 backdrop-blur-xs gap-3 shrink-0">
                {/* Left: Navigation and Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Student switcher */}
                    {studentsList.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handlePrev}
                                disabled={currentIndex <= 0}
                                title="Estudiante anterior"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs text-muted-foreground tabular-nums px-1">
                                {currentIndex + 1} / {totalStudents}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleNext}
                                disabled={currentIndex >= totalStudents - 1}
                                title="Siguiente estudiante"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 font-bold text-sm tracking-tight gap-1 hover:bg-muted/80 max-w-[200px] sm:max-w-[280px]">
                                        <span className="truncate">{student ? formatName(student.name, student.profile) : "Estudiante"}</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-y-auto z-50">
                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                                        {activity?.isGroupActivity ? "Líderes de Grupo" : "Lista de Estudiantes"} ({studentsList.length})
                                    </div>
                                    {studentsList.map((item, idx) => {
                                        const isSelected = item.student.id === student?.id;
                                        const subGrade = item.submission?.grade;
                                        const statusText = item.status === 'graded'
                                            ? `${subGrade !== null && subGrade !== undefined ? subGrade.toFixed(1) : '-'}/5.0`
                                            : item.status === 'submitted'
                                            ? 'Entregado'
                                            : 'Pendiente';

                                        return (
                                            <DropdownMenuItem
                                                key={item.student.id}
                                                onClick={() => onSelectStudent && onSelectStudent(item.student.id)}
                                                className={`flex items-center justify-between text-xs cursor-pointer py-1.5 ${
                                                    isSelected ? "bg-primary/10 font-bold text-primary" : ""
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">{idx + 1}.</span>
                                                    <span className="truncate">{formatName(item.student.name, item.student.profile)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                    {item.group && (
                                                        <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[70px]">
                                                            {item.group.name}
                                                        </span>
                                                    )}
                                                    <Badge
                                                        variant={item.status === 'graded' ? "secondary" : "outline"}
                                                        className={`text-[9px] px-1.5 py-0 h-4 font-mono shrink-0 ${
                                                            item.status === 'graded' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold" : "opacity-60"
                                                        }`}
                                                    >
                                                        {statusText}
                                                    </Badge>
                                                </div>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Activity title & Badge */}
                    <div className="hidden lg:flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground truncate">
                            • {activity.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-primary/10 text-primary border-primary/30 uppercase tracking-wider shrink-0">
                            <LinkIcon className="h-3 w-3" /> Manual
                        </Badge>
                        {activity.isGroupActivity && (
                            <Badge variant="outline" className="text-[10px] font-bold gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 uppercase tracking-wider shrink-0">
                                <Users className="h-3 w-3" /> Grupal
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Right: Grade Pill, External Link & Close */}
                <div className="flex items-center gap-2 shrink-0">
                    {submission?.url && (
                        <div className="flex items-center gap-1">
                            <Button
                                asChild
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1.5 shrink-0 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-semibold"
                                title="Abrir enlace de la entrega"
                            >
                                <a href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Abrir Enlace</span>
                                </a>
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={handleCopyUrl}
                                title="Copiar enlace"
                            >
                                {copiedLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                        </div>
                    )}

                    {currentGrade !== null ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shrink-0 font-bold animate-in fade-in">
                            <span className="text-[10px] uppercase font-bold opacity-80">Nota:</span>
                            <span className="text-sm font-black">{currentGrade.toFixed(1)}</span>
                            <span className="text-[10px] font-bold opacity-75">/ 5.0</span>
                        </div>
                    ) : isRejected ? (
                        <Badge className="bg-rose-600 text-white border-transparent text-xs py-0.5 px-2">
                            Rechazado
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs py-0.5 px-2 text-amber-600 border-amber-500/30 bg-amber-500/5">
                            Sin calificar
                        </Badge>
                    )}

                    {onClose && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                            className="h-7 px-2.5 text-xs gap-1 font-bold ml-1"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Split-Screen Inspector Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
                {/* Left Panel: Statement, Rubric & Delivery Details */}
                <div className="lg:col-span-7 flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden min-h-0">
                    <div className="border-b px-4 py-2 bg-muted/30 flex items-center justify-between shrink-0">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                            <TabsList className="h-7 p-0.5 bg-background border">
                                <TabsTrigger value="statement" className="h-6 text-xs px-2.5 gap-1.5">
                                    <ClipboardList className="h-3 w-3" />
                                    Enunciado y Rúbrica
                                </TabsTrigger>
                                <TabsTrigger value="details" className="h-6 text-xs px-2.5 gap-1.5">
                                    <FileText className="h-3 w-3" />
                                    Detalles de Entrega
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {group && (
                            <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-bold">
                                {isLeader ? <Crown className="h-3 w-3 fill-amber-500" /> : <Users className="h-3 w-3" />}
                                {group.name} {isLeader && "(Líder)"}
                            </Badge>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === "statement" && (
                            <div className="space-y-3">
                                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                                    Guía y Criterios de Evaluación
                                </div>
                                <div
                                    data-color-mode={mode}
                                    className="rounded-lg border p-4 bg-muted/20 text-xs sm:text-sm leading-relaxed max-w-full overflow-x-auto [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word!"
                                >
                                    <MDEditor.Markdown
                                        source={activity.statement || "**No se ha configurado un enunciado para esta actividad.**"}
                                        style={{ background: 'transparent' }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "details" && (
                            <div className="space-y-4">
                                {/* Student Profile Card */}
                                <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                        Información del Estudiante
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Nombre:</span>
                                            <p className="font-semibold text-foreground mt-0.5">{formatName(student.name, student.profile)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Email:</span>
                                            <p className="font-semibold text-foreground mt-0.5">{student.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Resource URL Card */}
                                <div className="rounded-lg border p-4 bg-muted/20 space-y-2.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                        Recurso o Enlace Entregado
                                    </h4>
                                    {submission?.url ? (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-background rounded-lg border gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                                                <a
                                                    href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline truncate"
                                                >
                                                    {submission.url}
                                                </a>
                                            </div>
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="default"
                                                className="h-7 px-3 text-xs gap-1.5 font-bold shrink-0"
                                            >
                                                <a
                                                    href={submission.url.startsWith('http') ? submission.url : `https://${submission.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Abrir en nueva pestaña
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground italic text-center">
                                            El estudiante aún no ha registrado un enlace de entrega.
                                        </div>
                                    )}

                                    {submission && (
                                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Fecha: {format(new Date(submission.lastSubmittedAt || submission.createdAt), "PP p")}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <span>Intentos: <strong>{submission.attemptCount}</strong> de {activity.maxAttempts}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Group members section if group activity */}
                                {activity.isGroupActivity && group && (
                                    <div className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                                Integrantes del Grupo ({group.name})
                                            </h4>
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                                                {group.members?.length || 1} miembros
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            La calificación y retroalimentación guardada aquí se aplicará automáticamente a todos los integrantes:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                            {group.members?.map((m: any) => {
                                                const memberUser = m.user || m;
                                                const isThisLeader = m.isLeader || group.leaderId === memberUser.id;
                                                return (
                                                    <div key={memberUser.id} className="flex items-center gap-1.5 text-xs bg-background/80 p-1.5 rounded border">
                                                        {isThisLeader ? (
                                                            <Crown className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                                                        ) : (
                                                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className="font-medium truncate">{formatName(memberUser.name, memberUser.profile)}</span>
                                                        {isThisLeader && <span className="text-[9px] text-amber-600 font-bold ml-auto">(Líder)</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Grading Form and AI Feedback */}
                <div className="lg:col-span-5 flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden min-h-0">
                    <div className="border-b px-4 py-2.5 bg-muted/30 flex items-center justify-between shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Panel de Calificación
                        </span>
                        {currentGrade !== null && (
                            <span className="text-xs text-muted-foreground font-mono">
                                Actual: <strong className="text-foreground">{currentGrade.toFixed(1)} / 5.0</strong>
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Grade Input Section */}
                        <div className="space-y-2">
                            <Label htmlFor="grade-input" className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                                <span>Nota Final (0.0 a 5.0)</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Escala 0.0 - 5.0</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="grade-input"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="5"
                                    placeholder="4.5"
                                    value={gradeInput}
                                    onChange={(e) => setGradeInput(e.target.value)}
                                    className="h-10 text-lg font-bold font-mono tracking-tight text-primary w-28 text-center bg-background border-primary/30 focus-visible:ring-primary"
                                />
                                <div className="flex flex-wrap items-center gap-1 flex-1">
                                    {["5.0", "4.5", "4.0", "3.5", "3.0", "0.0"].map((quickGrade) => (
                                        <Button
                                            key={quickGrade}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setGradeInput(quickGrade)}
                                            className={`h-7 px-2 text-xs font-bold transition-all ${
                                                gradeInput === quickGrade
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "hover:bg-primary/10 hover:text-primary"
                                            }`}
                                        >
                                            {quickGrade}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Feedback Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="feedback-input" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    Retroalimentación
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleImproveWithAI}
                                    disabled={isImprovingAI || !feedbackInput.trim()}
                                    className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 gap-1 px-2 font-semibold"
                                >
                                    {isImprovingAI ? <Sparkles className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    <span>Mejorar con IA</span>
                                </Button>
                            </div>
                            <Textarea
                                id="feedback-input"
                                rows={7}
                                placeholder="Escribe observaciones detalladas, fortalezas o sugerencias de mejora para el estudiante..."
                                value={feedbackInput}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                                className="text-xs leading-relaxed bg-background resize-none border-border/80 focus-visible:ring-primary"
                            />
                            {/* Fast Feedback Templates */}
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Rápidas:</span>
                                {[
                                    "Excelente trabajo, cumple con todos los objetivos solicitados.",
                                    "Buen trabajo en general, se recomienda revisar detalles de presentación.",
                                    "La entrega está incompleta según los criterios del enunciado.",
                                ].map((template, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFeedbackInput(prev => prev ? `${prev}\n\n${template}` : template)}
                                        className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors truncate max-w-[200px]"
                                        title={template}
                                    >
                                        + {template}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activity.isGroupActivity && (
                            <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                <p className="leading-relaxed">
                                    <strong>Actividad Grupal:</strong> Al guardar la calificación se actualizará la misma nota ({gradeInput || "0.0"}) y comentarios para todos los integrantes del grupo automáticamente.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="border-t p-4 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {submission && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReject}
                                    disabled={isSaving}
                                    className="h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 font-semibold"
                                >
                                    Rechazar Entrega
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSave(false)}
                                disabled={isSaving}
                                className="h-9 px-4 text-xs font-bold shadow-xs"
                            >
                                {isSaving ? "Guardando..." : "Guardar Nota"}
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => handleSave(true)}
                                disabled={isSaving}
                                className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {isSaving ? "Guardando..." : "Guardar y Siguiente"}
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
