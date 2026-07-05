"use client";

import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/dateUtils";
import { Trash2, AlertCircle, ArrowLeft, Eye, ShieldAlert, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { deleteEvaluationSubmissionAction } from "@/features/teacher/actions/evaluationActions";
import { EvaluationStats } from "./EvaluationStats";

interface SubmissionsManagerProps {
    courseId: string;
    attempt: any;
    submissions: any[];
    courseName: string;
    teacherName: string;
    institutionName: string;
}

export function SubmissionsManager({
    courseId,
    attempt,
    submissions,
    courseName,
    teacherName,
    institutionName
}: SubmissionsManagerProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const submittedCount = submissions.filter(s => s.submittedAt).length;
    const avgScore = submittedCount > 0 
        ? (submissions.filter(s => s.submittedAt).reduce((acc, s) => acc + (s.score || 0), 0) / submittedCount) 
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start gap-4 border-b pb-6">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/dashboard/teacher/courses/${courseId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight">{attempt.evaluation.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {formatDateTime(attempt.startTime)} - {formatDateTime(attempt.endTime)}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-auto">
                    {submittedCount > 0 && (
                        <div className="flex flex-col items-end px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">Nota Promedio</span>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {avgScore.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Listado de Estudiantes</h3>
                    <span className="text-sm text-muted-foreground">{submissions.length} inscritos</span>
                </div>
                
                <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
                    <Table className="min-w-[780px]">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Estudiante</TableHead>
                                <TableHead className="font-bold">Estado</TableHead>
                                <TableHead className="font-bold">Respuestas</TableHead>
                                <TableHead className="font-bold">Nota</TableHead>
                                <TableHead className="font-bold text-center">Expulsiones</TableHead>
                                <TableHead className="text-right font-bold">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <AlertCircle className="h-8 w-8 opacity-20" />
                                            <p>No hay entregas registradas para esta evaluación todavía.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                submissions.map((sub: any) => (
                                    <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{sub.user.name}</span>
                                                <span className="text-xs text-muted-foreground">{sub.user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {sub.submittedAt ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded w-fit mb-1">Enviado</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDateTime(sub.submittedAt, "dd/MM HH:mm")}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded w-fit">En progreso</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium">
                                                {sub._count?.answersList || 0} / {attempt.evaluation.questions?.length || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm font-black ${Number(sub.score || 0) >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                                                {sub.score !== null ? Number(sub.score).toFixed(2) : "0.00"}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">/ 5.0</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {sub.expulsions > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    {sub.expulsions}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">0</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {sub.submittedAt && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Ver Respuestas"
                                                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        asChild
                                                    >
                                                        <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attempt.id}/submissions/${sub.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                                                            title="Eliminar Entrega"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <form
                                                            action={async () => {
                                                                setIsDeleting(true);
                                                                try {
                                                                    await deleteEvaluationSubmissionAction(sub.id, courseId);
                                                                } finally {
                                                                    setIsDeleting(false);
                                                                }
                                                            }}
                                                        >
                                                            <DialogHeader>
                                                                <DialogTitle>Eliminar Entrega de {sub.user.name}</DialogTitle>
                                                                <DialogDescription>
                                                                    ¿Estás completamente seguro de eliminar esta entrega? Esta acción no se puede deshacer y el estudiante perderá todo su progreso y calificaciones, permitiéndole presentarla desde cero.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <DialogFooter className="mt-4">
                                                                <Button type="submit" variant="destructive" disabled={isDeleting}>
                                                                    {isDeleting ? "Eliminando..." : "Sí, eliminar entrega"}
                                                                </Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Statistics section */}
            <div className="pt-6 border-t">
                <h3 className="text-xl font-bold mb-4">Análisis Estadístico</h3>
                <EvaluationStats
                    submissions={submissions}
                    totalQuestions={attempt.evaluation.questions?.length || 0}
                    questions={attempt.evaluation.questions || []}
                    evaluationId={attempt.evaluationId}
                    attemptId={attempt.id}
                    courseId={courseId}
                    courseName={courseName}
                    teacherName={teacherName}
                />
            </div>
        </div>
    );
}
