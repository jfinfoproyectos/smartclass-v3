import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, AlertCircle, Gavel } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { DownloadSubmissionPDFWrapper as DownloadSubmissionPDF } from "@/features/teacher/components/DownloadSubmissionPDFWrapper";
import { SubmissionPenaltyDialog } from "@/features/teacher/components/SubmissionPenaltyDialog";
import prisma from "@/lib/prisma";
import { CodeAnswerViewerWrapper } from "@/features/teacher/components/CodeAnswerViewerWrapper";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await prisma.systemSettings.findUnique({
        where: { id: "settings" },
        select: { institutionName: true }
    });
    const appTitle = settings?.institutionName || "SmartClass";

    return {
        title: `Detalle de Entrega | ${appTitle}`,
        description: 'Ver detalles de una entrega de evaluación',
    };
}

export default async function SubmissionDetailsPage(
    props: {
        params: Promise<{ courseId: string; attemptId: string; submissionId: string }>
    }
) {
    const params = await props.params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session || session.user.role !== 'teacher') {
        redirect("/signin");
    }

    const { courseId, attemptId, submissionId } = params;

    const submission = await evaluationService.getSubmissionDetails(submissionId);
    if (!submission || submission.attemptId !== attemptId) {
        notFound();
    }

    const { user, attempt, answersList } = submission;
    const evaluation = attempt.evaluation;

    // Fetch course and settings for PDF
    const [course, settings] = await Promise.all([
        prisma.course.findUnique({
            where: { id: courseId },
            include: { teacher: { select: { name: true } } }
        }),
        prisma.systemSettings.findUnique({
            where: { id: "settings" },
            select: { institutionName: true }
        })
    ]);

    const appTitle = settings?.institutionName || "SmartClass";
    const courseName = course?.title || "Curso";
    const teacherName = course?.teacher?.name || "Docente";

    // Build questions with answers for PDF
    const questionsForPDF = evaluation.questions.map((question: any) => {
        const answer = answersList.find((a: any) => a.questionId === question.id);
        return {
            id: question.id,
            text: question.text,
            type: question.type,
            language: question.language || undefined,
            referenceAnswer: question.referenceAnswer || undefined,
            answer: answer ? {
                answer: answer.answer,
                score: answer.score,
                aiFeedback: answer.aiFeedback,
            } : undefined,
        };
    });

    // Penalty / Descuento disciplinario
    const wildcards = (submission.wildcardsUsed as any) || {};
    const penalty = wildcards.penalty !== undefined ? Number(wildcards.penalty) : 0;
    const penaltyComment = (wildcards.penaltyComment as string) || "";
    const baseScore = wildcards.baseScore !== undefined
        ? Number(wildcards.baseScore)
        : (submission.score !== null ? Number(submission.score) : 0);
    const finalScore = submission.score !== null ? Number(submission.score) : 0;

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Entrega de {user.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {user.email} &bull; Evaluación: {evaluation.title}
                    </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <SubmissionPenaltyDialog
                        submission={submission}
                        courseId={courseId}
                        studentName={user.name}
                        trigger={
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1.5 font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/60 hover:bg-amber-500/10 shadow-xs cursor-pointer"
                            >
                                <Gavel className="h-4 w-4" />
                                <span>{penalty > 0 ? "Ajustar Sanción" : "Aplicar Sanción"}</span>
                            </Button>
                        }
                    />
                    <DownloadSubmissionPDF
                        appTitle={appTitle}
                        studentName={user.name}
                        studentEmail={user.email}
                        evaluationTitle={evaluation.title}
                        courseName={courseName}
                        teacherName={teacherName}
                        startTime={attempt.startTime}
                        endTime={attempt.endTime}
                        submittedAt={submission.submittedAt}
                        score={submission.score !== undefined ? submission.score : null}
                        totalQuestions={evaluation.questions.length}
                        answeredQuestions={answersList.length}
                        expulsions={submission.expulsions || 0}
                        penalty={penalty}
                        penaltyComment={penaltyComment}
                        baseScore={baseScore}
                        questions={questionsForPDF}
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 font-semibold shadow-xs cursor-pointer">
                                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attemptId}`}>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Volver a Resultados</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Regresar al monitor de entregas de la evaluación</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Resumen de la Entrega */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Resumen de la Entrega</h3>
                    {penalty > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Gavel className="h-3.5 w-3.5" />
                            Sanción aplicada: -{penalty.toFixed(1)} pts
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Estado:</span>
                        <span className="font-semibold">{submission.submittedAt ? 'Enviado' : 'En progreso'}</span>
                    </div>
                    {submission.submittedAt && (
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Fecha de envío:</span>
                            <span className="font-semibold">{formatDateTime(submission.submittedAt)}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                            {penalty > 0 ? "Nota Final (Con Descuento):" : "Nota Obtenida:"}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className={cn(
                                "font-black text-xl",
                                finalScore >= 3.0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                            )}>
                                {submission.score !== null ? Number(submission.score).toFixed(2) : "0.00"}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
                            {penalty > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                                    -{penalty.toFixed(1)}
                                </span>
                            )}
                        </div>
                        {penalty > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                                Nota original sin sanción: <span className="font-semibold text-foreground">{baseScore.toFixed(2)}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Respuestas:</span>
                        <span className="font-semibold">{answersList.length} / {evaluation.questions.length}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Salidas de la App:</span>
                        <span className={`font-bold flex items-center gap-1.5 ${(submission.expulsions || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {submission.expulsions || 0} {(submission.expulsions || 0) === 1 ? "falta / salida" : "faltas / salidas"}
                        </span>
                    </div>
                </div>

                {/* Banner descriptivo de la sanción si existe */}
                {penalty > 0 && (
                    <div className="mt-5 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/5 -mx-6 -mb-6 p-4 rounded-b-xl border-amber-500/20">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                <Gavel className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                    <span>Penalización académica aplicada:</span>
                                    <span className="font-bold text-destructive">-{penalty.toFixed(1)} puntos</span>
                                    <span className="text-xs text-muted-foreground font-normal">(Nota base: {baseScore.toFixed(2)})</span>
                                </div>
                                {penaltyComment ? (
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                                        &ldquo;{penaltyComment}&rdquo;
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-0.5">Sin comentario registrado.</p>
                                )}
                            </div>
                        </div>

                        <SubmissionPenaltyDialog
                            submission={submission}
                            courseId={courseId}
                            studentName={user.name}
                            trigger={
                                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold shrink-0 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer">
                                    Modificar / Quitar Sanción
                                </Button>
                            }
                        />
                    </div>
                )}
            </div>

            {/* Respuestas del Estudiante */}
            <div className="space-y-6 mt-4">
                <h2 className="text-xl font-bold border-b pb-2">Respuestas del Estudiante</h2>
                {evaluation.questions.length === 0 ? (
                    <p className="text-muted-foreground italic">No hay preguntas en esta evaluación.</p>
                ) : (
                    <div className="space-y-8">
                        {evaluation.questions.map((question: any, index: number) => {
                            const answer = answersList.find((a: any) => a.questionId === question.id);
                            return (
                                <div key={question.id} className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow print:break-inside-avoid print:shadow-none">
                                    <div className="bg-muted/50 p-4 border-b">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-base">Pregunta {index + 1}</h4>
                                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-background border text-muted-foreground uppercase tracking-widest">{question.type}</span>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <FeedbackViewer feedback={question.text} />
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        {answer ? (
                                            <>
                                                <div>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Respuesta del estudiante:</span>
                                                    {question.type === 'Code' ? (
                                                        <CodeAnswerViewerWrapper
                                                            code={answer.answer}
                                                            language={question.language}
                                                        />
                                                    ) : (
                                                        <div className="bg-zinc-50 dark:bg-zinc-900 border p-4 rounded-lg text-sm">
                                                            <FeedbackViewer feedback={answer.answer} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {answer.aiFeedback && (
                                                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-xl border border-blue-100 dark:border-blue-900/50 mt-4">
                                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-4 block">Feedback Automático (IA):</span>
                                                        <div className="space-y-4">
                                                            {Array.isArray(answer.aiFeedback) ? (
                                                                (answer.aiFeedback as any[]).map((feedbackItem: any, i: number) => (
                                                                    <div key={i} className="border-t border-blue-100 dark:border-blue-900/30 pt-4 first:border-0 first:pt-0">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            {feedbackItem.isCorrect ? (
                                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                            ) : (
                                                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                                            )}
                                                                            <span className="font-bold text-xs">Intento {feedbackItem.attempt} &bull; Nota: {feedbackItem.score}</span>
                                                                        </div>
                                                                        <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                                            <FeedbackViewer feedback={feedbackItem.feedback} />
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                                                    <FeedbackViewer feedback={(answer.aiFeedback as any).feedback || JSON.stringify(answer.aiFeedback)} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-end text-sm mt-4 pt-4 border-t">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Puntuación Obtenida</span>
                                                        <span className="font-black bg-blue-600 text-white px-3 py-1 rounded-md">
                                                            {answer.score !== null ? Number(answer.score).toFixed(2) : "0.00"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center gap-3 bg-muted/20 rounded-xl border border-dashed">
                                                <AlertCircle className="h-10 w-10 opacity-20" />
                                                <p className="font-medium">El estudiante no respondió esta pregunta o la evaluación está aún en curso.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
