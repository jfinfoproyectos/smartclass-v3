import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { evaluationService } from "@/features/teacher/services/evaluationService";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';
import { FeedbackViewer } from "@/features/student/components/FeedbackViewer";
import { DownloadSubmissionPDFWrapper as DownloadSubmissionPDF } from "@/features/teacher/components/DownloadSubmissionPDFWrapper";
import prisma from "@/lib/prisma";
import { CodeAnswerViewerWrapper } from "@/features/teacher/components/CodeAnswerViewerWrapper";

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
            answer: answer ? {
                answer: answer.answer,
                score: answer.score,
                aiFeedback: answer.aiFeedback,
            } : undefined,
        };
    });

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
            <Button variant="ghost" size="sm" asChild className="w-fit h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors group">
                <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attemptId}`} className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-widest">
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    Volver a Resultados
                </Link>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Entrega de {user.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {user.email} &bull; Evaluación: {evaluation.title}
                    </p>
                </div>
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
                    questions={questionsForPDF}
                />
            </div>

            {/* Resumen de la Entrega */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Resumen de la Entrega</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
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
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Nota Acumulada:</span>
                        <span className="font-black text-blue-600 dark:text-blue-400 text-lg">
                            {submission.score !== null ? Number(submission.score).toFixed(2) : "0.00"} <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Respuestas:</span>
                        <span className="font-semibold">{answersList.length} / {evaluation.questions.length}</span>
                    </div>
                </div>
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
                                <div key={question.id} className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
