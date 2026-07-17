"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Github, FileText, ClipboardList, Users, Trash2, Sparkles, Search, AlertTriangle, CheckCircle2, Bot, Loader2, ChevronDown, ChevronUp, CheckCircle, ChevronLeft, ChevronRight, ExternalLink, Settings, Link2 } from "lucide-react";
import { FeedbackViewer } from '../../student/components/FeedbackViewer';
import { validateUniqueLinksAction, deleteSubmissionAction, analyzeGitHubFileAction, finalizeGitHubGradingAction, gradePdfReviewAction, gradeManualActivityAction, improveFeedbackAction, rejectManualActivityAction } from "../../../features/teacher/actions/gradingActions";
import { getGitHubSubmissionDetailsAction, getRepoStructureAction, fetchRepoFilesAction } from "../../../features/github/actions/githubActions";
import { toast } from "sonner";
import { ExportButton } from "@/components/ui/export-button";
import { formatDateForExport, formatGradeForExport } from "@/lib/export-utils";
import { formatName, isValidPdfUrl } from "@/lib/utils";
import Link from "next/link";

import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";

export function ActivityDetail({
    activity,
    students
}: {
    activity: any,
    students: any[]
}) {
    const params = useParams();
    const activityIdFromUrl = params.activityId as string;
    
    const [isPending, startTransition] = useTransition();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submissionToDelete, setSubmissionToDelete] = useState<any>(null);
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);
    const [validationResults, setValidationResults] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);
    // Panel de detalle — índice del estudiante seleccionado (null = cerrado)
    const [selectedStudentIndex, setSelectedStudentIndex] = useState<number | null>(null);
    // Estado para calificación GitHub por IA
    const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
    const [gradingLogs, setGradingLogs] = useState<string[]>([]);
    const [gradingResult, setGradingResult] = useState<any>(null);
    const [showGradingLogs, setShowGradingLogs] = useState(false);
    const [lastAnalyses, setLastAnalyses] = useState<any[]>([]);
    const [lastMissingFiles, setLastMissingFiles] = useState<string[]>([]);
    const [isFinalizingOnly, setIsFinalizingOnly] = useState(false);
    const [isPdfGrading, setIsPdfGrading] = useState<string | null>(null);
    const [scanningRepoStudentId, setScanningRepoStudentId] = useState<string | null>(null);
    const [scannedRepoFiles, setScannedRepoFiles] = useState<string[]>([]);
    const [selectedRepoFiles, setSelectedRepoFiles] = useState<string[]>([]);
    const [isCodeProjectGrading, setIsCodeProjectGrading] = useState<string | null>(null);
    const [gradingMode, setGradingMode] = useState<"normal" | "moderate" | "strict">("normal");

    // Estado para calificación por lote
    const [isBatchGrading, setIsBatchGrading] = useState(false);
    const [activeTab, setActiveTab] = useState("results");
    
    // Refs para captura fiable de valores en formularios manuales
    const gradeRef = useRef<HTMLInputElement>(null);
    const feedbackRef = useRef<HTMLTextAreaElement>(null);
    const [showBatchSheet, setShowBatchSheet] = useState(false);
    const [batchStep, setBatchStep] = useState<"selection" | "progress">("selection");
    const [batchLogs, setBatchLogs] = useState<string[]>([]);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotal, setBatchTotal] = useState(0);
    const [batchReport, setBatchReport] = useState<{ name: string, grade?: number, error?: string }[]>([]);
    const [selectedStudentsForBatch, setSelectedStudentsForBatch] = useState<string[]>([]);

    // Optimizaciones de Lote
    const [batchSkipGraded, setBatchSkipGraded] = useState(true);


    const scrollRef = useRef<HTMLDivElement>(null);
    const batchScrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [gradingLogs]);

    useEffect(() => {
        if (batchScrollRef.current) {
            batchScrollRef.current.scrollTop = batchScrollRef.current.scrollHeight;
        }
    }, [batchLogs]);

    const studentStatus = useMemo(() => {
        return students.map(enrollment => {
            const student = enrollment.user;
            const submission = activity.submissions.find((sub: any) => sub.userId === student.id);
            const isRejected = submission && submission.grade === null && submission.feedback && submission.feedback.includes("[ENTREGA RECHAZADA]");

            return {
                student,
                submission,
                isRejected,
                status: submission ? (submission.grade !== null ? "graded" : "submitted") : "pending"
            };
        });
    }, [students, activity.submissions]);



    const { resolvedTheme } = useTheme();
    const mode = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto";

    const handleDeleteSubmission = (submission: any) => {
        setSubmissionToDelete(submission);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!submissionToDelete) return;

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("submissionId", submissionToDelete.id);
                formData.append("courseId", activity.courseId);
                formData.append("activityId", activity.id);

                await deleteSubmissionAction(formData);

                toast.success("Entrega eliminada", {
                    description: "La entrega del estudiante ha sido eliminada exitosamente.",
                });

                setDeleteDialogOpen(false);
                setSubmissionToDelete(null);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo eliminar la entrega.",
                });
            }
        });
    };

    const handleValidateLinks = async () => {
        setIsValidating(true);
        try {
            const results = await validateUniqueLinksAction(activity.id);
            setValidationResults(results);
            setValidationDialogOpen(true);
        } catch (error: any) {
            toast.error("Error", {
                description: error.message || "No se pudo validar los enlaces.",
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleGradeWithAI = async (studentId: string, repoUrl: string, autoApply: boolean = false) => {
        setGradingStudentId(studentId);
        setGradingLogs([]);
        setGradingResult(null);
        setLastAnalyses([]);
        setLastMissingFiles([]);
        setIsFinalizingOnly(false);
        setShowGradingLogs(true);

        const addLog = (msg: string) => setGradingLogs(prev => [...prev, msg]);

        try {
            addLog("🔍 Iniciando calificación con IA...");
            addLog("📂 Analizando estructura del repositorio y descargando archivos...");

            // 1. Obtener archivos
            const { validFiles, missingFiles, repoInfo, warning } = await getGitHubSubmissionDetailsAction(
                repoUrl,
                activity.filePaths || ""
            );

            if (warning) {
                toast.warning("Límite de API Posible", { description: warning });
                addLog(`⚠️ Advertencia: ${warning}`);
            }

            if (validFiles.length === 0 && missingFiles.length === 0) {
                throw new Error("No se encontraron archivos para evaluar según la configuración de la actividad.");
            }

            addLog(`✅ Estructura validada. ${validFiles.length} archivos encontrados, ${missingFiles.length} faltantes.`);

            // 2. Analizar cada archivo
            const analyses = [];
            let accumulatedContext = "";

            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                addLog(`⚙️ Analizando (${i + 1}/${validFiles.length}): ${file.path}...`);

                try {
                    const analysis = await analyzeGitHubFileAction(
                        file.path,
                        file.content,
                        activity.statement || "",
                        repoUrl,
                        accumulatedContext,
                        gradingMode
                    );

                    analyses.push(analysis);
                    accumulatedContext += `\n- **${file.path}**: ${analysis.summary}`;
                    addLog(`   └─ ✅ Nota asignada: ${analysis.scoreContribution.toFixed(1)} / 5.0`);

                    // Pequeña pausa opcional para que el usuario pueda leer los logs
                    if (i < validFiles.length - 1) {
                        await new Promise(r => setTimeout(r, 600));
                    }
                } catch (fileError: any) {
                    addLog(`   └─ ⚠️ Error en este archivo: ${fileError.message}`);
                    const targetBranch = repoInfo?.branch === "HEAD" ? "main" : (repoInfo?.branch || "main");
                    const encodedFile = file.path.split('/').map((part: string) => encodeURIComponent(part)).join('/');

                    analyses.push({
                        filename: file.path,
                        repoUrl,
                        fileUrl: repoInfo ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${targetBranch}/${encodedFile}` : "",
                        summary: `Error al analizar: ${fileError.message}`,
                        strengths: [],
                        weaknesses: [`Error de análisis: ${fileError.message}`],
                        errors: [],
                        scoreContribution: 0
                    });
                }
            }

            // 3. Finalizar
            setLastAnalyses(analyses);
            setLastMissingFiles(missingFiles);
            addLog("📊 Consolidando análisis y generando feedback final...");
            const result = await finalizeGitHubGradingAction(
                activity.id,
                studentId,
                repoUrl,
                activity.statement || "",
                analyses,
                missingFiles,
                (activity.filePaths || "").split(',').length,
                activity.courseId,
                gradingMode
            );

            setGradingResult(result);
            addLog(`✅ Calificación completada. Nota final: ${result.grade.toFixed(1)} / 5.0`);
            
            if (!autoApply) {
                toast.success(`Calificación guardada: ${result.grade.toFixed(1)} / 5.0`);
            }
            return result;
        } catch (error: any) {
            addLog(`❌ Error crítico: ${error.message}`);
            toast.error("Error al calificar", { description: error.message });
        } finally {
            setGradingStudentId(null);
        }
    };



    const handleGradePdfWithAI = async (studentId: string, pdfUrl: string, autoApply: boolean = false) => {
        setIsPdfGrading(studentId);
        setGradingResult(null);
        try {
            const result = await gradePdfReviewAction(
                activity.id,
                studentId,
                pdfUrl,
                activity.statement || "",
                activity.courseId,
                gradingMode
            );
            setGradingResult(result);
            if (!autoApply) {
                toast.success(`PDF evaluado: ${result.grade.toFixed(1)} / 5.0`);
            }
            return result;
        } catch (error: any) {
            toast.error("Error al evaluar PDF", { description: error.message });
        } finally {
            setIsPdfGrading(null);
        }
    };

    const handleScanRepo = async (studentId: string, repoUrl: string) => {
        setScanningRepoStudentId(studentId);
        setScannedRepoFiles([]);
        setSelectedRepoFiles([]);
        try {
            const files = await getRepoStructureAction(repoUrl, activity.course.teacherId);
            setScannedRepoFiles(files);
            toast.success(`${files.length} archivos encontrados.`);
        } catch (error: any) {
            toast.error("Error al escanear repositorio", { description: error.message });
        } finally {
            setScanningRepoStudentId(null);
        }
    };

    const handleGradeCodeProjectWithAI = async (studentId: string, repoUrl: string) => {
        if (selectedRepoFiles.length === 0) {
            toast.error("Selecciona al menos un archivo para evaluar.");
            return;
        }

        setIsCodeProjectGrading(studentId);
        setGradingLogs([]);
        setGradingResult(null);
        setLastAnalyses([]);
        setShowGradingLogs(true);

        const addLog = (msg: string) => setGradingLogs(prev => [...prev, msg]);

        try {
            addLog("🔍 Iniciando calificación manual asistida...");
            addLog(`📂 Descargando ${selectedRepoFiles.length} archivos seleccionados...`);

            const { validFiles, missingFiles, warning } = await fetchRepoFilesAction(
                repoUrl,
                selectedRepoFiles.join(','),
                activity.id
            );

            if (warning) addLog(`⚠️ Advertencia: ${warning}`);

            addLog(`✅ Archivos descargados. Iniciando análisis individual...`);

            const analyses = [];
            let accumulatedContext = "";

            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                addLog(`⚙️ Analizando (${i + 1}/${validFiles.length}): ${file.path}...`);

                const analysis = await analyzeGitHubFileAction(
                    file.path,
                    file.content,
                    activity.statement || "",
                    repoUrl,
                    accumulatedContext,
                    gradingMode
                );

                analyses.push(analysis);
                accumulatedContext += `\n- **${file.path}**: ${analysis.summary}`;
                addLog(`   └─ ✅ Análisis completado.`);
            }

            addLog("📊 Consolidando evaluación final...");
            const result = await finalizeGitHubGradingAction(
                activity.id,
                studentId,
                repoUrl,
                activity.statement || "",
                analyses,
                [],
                selectedRepoFiles.length,
                activity.courseId,
                gradingMode
            );

            setGradingResult(result);
            addLog(`✅ Calificación completada. Nota final: ${result.grade.toFixed(1)} / 5.0`);
            
            toast.success(`Calificación guardada: ${result.grade.toFixed(1)} / 5.0`);
        } catch (error: any) {
            addLog(`❌ Error: ${error.message}`);
            toast.error("Error al calificar", { description: error.message });
        } finally {
            setIsCodeProjectGrading(null);
        }
    };

    const handleRetryFinalize = async (studentId: string, repoUrl: string) => {
        if (lastAnalyses.length === 0) return;

        setGradingStudentId(studentId);
        setIsFinalizingOnly(true);
        const addLog = (msg: string) => setGradingLogs(prev => [...prev, msg]);

        try {
            addLog("🔄 Reintentando solo consolidación final (usando análisis previos)...");
            const result = await finalizeGitHubGradingAction(
                activity.id,
                studentId,
                repoUrl,
                activity.statement || "",
                lastAnalyses,
                lastMissingFiles,
                (activity.filePaths || "").split(',').length,
                activity.courseId,
                gradingMode
            );

            setGradingResult(result);
            addLog(`✅ Calificación completada (reintento). Nota final: ${result.grade.toFixed(1)} / 5.0`);
            toast.success(`Calificación guardada: ${result.grade.toFixed(1)} / 5.0`);
        } catch (error: any) {
            addLog(`❌ Error en reintento: ${error.message}`);
            toast.error("Error al reintentar", { description: error.message });
        } finally {
            setGradingStudentId(null);
            setIsFinalizingOnly(false);
        }
    };

    const handleOpenBatchSelection = () => {
        const studentsToGrade = studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission);
        if (studentsToGrade.length === 0) {
            toast.info("No hay entregas para evaluar.");
            return;
        }
        // Pre-seleccionar todos los estudiantes que tienen entregas
                    setSelectedStudentsForBatch(studentsToGrade.map(s => s.student.id));
        setBatchStep("selection");
        setShowBatchSheet(true);
    };


    const handleGradeManual = async (grade: string, feedback: string, userId: string, activityId: string) => {
        if (!grade) {
            toast.error("La nota es obligatoria");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("activityId", activityId);
            formData.append("userId", userId);
            formData.append("grade", grade);
            formData.append("feedback", feedback);
            formData.append("courseId", activity.courseId);

            await gradeManualActivityAction(formData);
            toast.success("Calificación guardada");
        } catch (error: any) {
            toast.error("Error al guardar nota", { description: error.message });
        }
    };

    const normalizeUrl = (url: string) => {
        try {
            let u = url.trim().toLowerCase();
            if (u.endsWith('/')) u = u.slice(0, -1);
            if (u.endsWith('.git')) u = u.slice(0, -4);
            return u;
        } catch {
            return url.trim().toLowerCase();
        }
    };

    const handleBatchGradeWithAI = async () => {
        const studentsToGrade = studentStatus
            .filter(s => s.status === "submitted" || s.status === "graded")
            .filter(s => s.submission && selectedStudentsForBatch.includes(s.student.id));

        if (studentsToGrade.length === 0) {
            toast.info("No se seleccionaron estudiantes para evaluar.");
            setShowBatchSheet(false);
            return;
        }

        setBatchStep("progress");
        setIsBatchGrading(true);
        setBatchProgress(0);
        setBatchTotal(studentsToGrade.length);
        setBatchLogs([]);
        setBatchReport([]);

        const addLog = (msg: string) => setBatchLogs(prev => [...prev, msg]);
        const report: { name: string, grade?: number, error?: string }[] = [];
        const urlCache = new Map<string, { grade: number, feedback: string }>();

        addLog(`🚀 Iniciando evaluación por lote para ${studentsToGrade.length} estudiantes...`);

        for (let i = 0; i < studentsToGrade.length; i++) {
            const { student, submission } = studentsToGrade[i];
            setBatchProgress(i + 1);
            addLog(`\n--- Evaluando ${i + 1}/${studentsToGrade.length}: ${student.name} ---`);

            try {
                if (!submission.url) {
                    throw new Error("No hay URL de entrega.");
                }

                // NUEVA PRE-VALIDACIÓN: Si es PDF, verificar que el enlace sea válido antes de procesar o usar caché
                if (activity.type === "PDF_REVIEW" && !isValidPdfUrl(submission.url)) {
                    throw new Error("El enlace proporcionado no corresponde a un archivo PDF válido (puede ser una carpeta o un formato no soportado).");
                }

                const normalizedUrl = normalizeUrl(submission.url);

                // Regla: Depuración de la Cola
                if (batchSkipGraded && submission.grade !== null && submission.grade !== undefined) {
                    addLog(`⏭️ ${student.name} ya tiene calificación. Omitiendo según regla de depuración de cola.`);
                    report.push({ name: student.name, grade: submission.grade });
                    continue;
                }



                let finalResult;

                if (activity.type === "GITHUB") {
                    // --- LÓGICA GITHUB ---
                    addLog(`📂 Comprobando repositorio de ${student.name}...`);
                    const details = await getGitHubSubmissionDetailsAction(
                        submission.url,
                        activity.filePaths || ""
                    );

                    const { validFiles, missingFiles, repoInfo } = details;
                    const analyses: any[] = [];
                    let accumulatedContext = "";

                    for (let j = 0; j < validFiles.length; j++) {
                        const file = validFiles[j];
                        addLog(`🔍 Analizando archivo ${j + 1}/${validFiles.length}: ${file.path}`);
                        try {
                            const analysis = await analyzeGitHubFileAction(
                                file.path,
                                file.content,
                                activity.statement || "",
                                submission.url,
                                accumulatedContext,
                                gradingMode
                            );
                            analyses.push(analysis);
                            accumulatedContext += `\n- **${file.path}**: ${analysis.summary}`;
                            addLog(`✅ Análisis completado. Nota asignada: ${analysis.scoreContribution?.toFixed(2)} / 5.0`);
                        } catch (fileError: any) {
                            addLog(`⚠️ Error en archivo ${file.path}: ${fileError.message}`);
                            const targetBranch = repoInfo?.branch === "HEAD" ? "main" : (repoInfo?.branch || "main");
                            const encodedFile = file.path.split('/').map((part: string) => encodeURIComponent(part)).join('/');
                            analyses.push({
                                filename: file.path,
                                repoUrl: submission.url,
                                fileUrl: repoInfo ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${targetBranch}/${encodedFile}` : "",
                                summary: `Error al analizar: ${fileError.message}`,
                                strengths: [],
                                weaknesses: [`Error de análisis: ${fileError.message}`],
                                errors: [],
                                scoreContribution: 0
                            });
                        }
                    }

                    addLog(`📊 Generando nota final y feedback para ${student.name}...`);
                    finalResult = await finalizeGitHubGradingAction(
                        activity.id,
                        student.id,
                        submission.url,
                        activity.statement || "",
                        analyses,
                        missingFiles,
                        validFiles.length + missingFiles.length,
                        activity.courseId,
                        gradingMode
                    );
                } else if (activity.type === "PDF_REVIEW") {
                    // --- LÓGICA PDF ---
                    addLog(`📄 Procesando PDF de ${student.name}...`);
                    finalResult = await gradePdfReviewAction(
                        activity.id,
                        student.id,
                        submission.url,
                        activity.statement || "",
                        activity.courseId,
                        gradingMode
                    );
                } else {
                    throw new Error("Tipo de actividad no soportado para evaluación por lote con IA.");
                }

                if (finalResult) {
                    addLog(`✅ ⭐ Calificación de ${student.name}: ${finalResult.grade.toFixed(1)} / 5.0`);
                    report.push({ name: student.name, grade: finalResult.grade });
                    urlCache.set(normalizedUrl, { grade: finalResult.grade, feedback: finalResult.feedback || "" });
                }

            } catch (error: any) {
                addLog(`❌ Error con ${student.name}: ${error.message}`);
                
                // Si es PDF y falla, marcar como rechazada automáticamente
                if (activity.type === "PDF_REVIEW") {
                    addLog(`⚠️ Detectado error en PDF. Rechazando entrega de ${student.name}...`);
                    try {
                        const rejectData = new FormData();
                        rejectData.append("activityId", activity.id);
                        rejectData.append("userId", student.id);
                        rejectData.append("courseId", activity.courseId);
                        rejectData.append("feedback", `Evaluación automática fallida: ${error.message}. Por favor, vuelve a subir un PDF válido.`);
                        
                        await rejectManualActivityAction(rejectData);
                        addLog(`   └─ ✅ Entrega rechazada exitosamente.`);
                    } catch (rejectError: any) {
                        addLog(`   └─ ❌ Error al procesar rechazo: ${rejectError.message}`);
                        console.error("Batch Reject Error:", rejectError);
                    }
                }
                
                report.push({ name: student.name, error: error.message });
            }
        }

        addLog(`\n🎉 Evaluación por lote completada.`);
        setBatchReport(report);
        setIsBatchGrading(false);
        const successCount = report.filter(r => !r.error).length;
        const errorCount = report.length - successCount;

        if (errorCount > 0) {
            toast.warning(`Evaluación finalizada: ${successCount} exitosos, ${errorCount} con errores.`);
        } else {
            toast.success(`Evaluación por lote terminada: ${successCount} estudiantes evaluados.`);
        }
    };

    // Prepare data for export
    const exportData = useMemo(() => {
        return studentStatus.map(({ student, submission, status }) => ({
            'Estudiante': student.name,
            'Email': student.email,
            'Estado': status === 'pending' ? 'Pendiente' : status === 'submitted' ? 'Entregado' : 'Calificado',
            'Fecha de Entrega': submission ? formatDateForExport(submission.lastSubmittedAt || submission.createdAt) : '-',
            'Intentos': submission ? `${submission.attemptCount} / ${activity.maxAttempts}` : '-',
            'Calificación': submission?.grade !== null && submission?.grade !== undefined ? formatGradeForExport(submission.grade) : (!submission && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL') ? '0.0' : '-',
            'URL de Entrega': submission?.url || '-'
        }));
    }, [studentStatus, activity.maxAttempts]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Button variant="ghost" size="sm" asChild className="w-fit h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <Link href={`/dashboard/teacher/courses/${activity.courseId}?tab=activities`} className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-widest">
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Volver a Actividades
                    </Link>
                </Button>

                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{activity.title}</h2>
                        <Badge variant="outline">{activity.type}</Badge>
                        <Badge variant="secondary">Peso: {activity.weight.toFixed(1)}%</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {`Vence: ${format(new Date(activity.deadline), "PP p")}`}
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto">
                    <TabsTrigger value="statement" className="flex items-center gap-1 sm:gap-2">
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Enunciado</span>
                        <span className="sm:hidden">Enun.</span>
                    </TabsTrigger>
                    <TabsTrigger value="results" className="flex items-center gap-1 sm:gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Resultados por Estudiantes</span>
                        <span className="sm:hidden">Result.</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="statement" className="space-y-4 mt-6">
                    <div data-color-mode={mode} className="rounded-md border p-6 bg-card w-full max-w-full overflow-x-auto [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word!">
                        <h3 className="text-lg font-semibold mb-4">Enunciado / Rúbrica de Evaluación</h3>
                        <MDEditor.Markdown
                            source={activity.statement || "**No hay enunciado/rúbrica disponible.**"}
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="results" className="space-y-6 mt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                            <div className="text-2xl font-bold">{students.length}</div>
                            <p className="text-xs text-muted-foreground">Total Estudiantes</p>
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                            <div className="text-2xl font-bold">
                                {studentStatus.filter(s => s.status !== "pending").length}
                            </div>
                            <p className="text-xs text-muted-foreground">Entregas Recibidas</p>
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                            <div className="text-2xl font-bold">
                                {studentStatus.filter(s => s.status === "graded").length}
                            </div>
                            <p className="text-xs text-muted-foreground">Calificados</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                            onClick={handleValidateLinks}
                            disabled={isValidating || activity.submissions.length === 0}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            {isValidating ? "Validando..." : "Validar Enlaces"}
                        </Button>
                        {(activity.type === "GITHUB" || activity.type === "PDF_REVIEW") && (
                            <Button
                                onClick={isBatchGrading ? () => setShowBatchSheet(true) : handleOpenBatchSelection}
                                disabled={!studentStatus.some(s => s.submission)}
                                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isBatchGrading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Ver Progreso de Lote
                                    </>
                                ) : (
                                    <>
                                        <Bot className="w-4 h-4 mr-2" />
                                        Evaluar por Lote con IA
                                    </>
                                )}
                            </Button>
                        )}
                        <ExportButton
                            data={exportData}
                            filename={`${activity.title.replace(/\s+/g, '_')}_Calificaciones`}
                            sheetName="Calificaciones"
                        />
                    </div>

                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table className="min-w-[700px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Estudiante</TableHead>
                                    <TableHead>Estado</TableHead>
                                    {activity.type !== "MANUAL" && (
                                        <>
                                            <TableHead>Fecha Entrega</TableHead>
                                            <TableHead>Intentos</TableHead>
                                        </>
                                    )}
                                    <TableHead>Calificación</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentStatus.map(({ student, submission, status, isRejected }) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{formatName(student.name, student.profile)}</span>
                                                <span className="text-xs text-muted-foreground">{student.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {status === "pending" && <Badge variant="outline">Pendiente</Badge>}
                                            {status === "submitted" && (
                                                isRejected ? (
                                                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white border-transparent">Rechazado</Badge>
                                                ) : (activity.type === "GITHUB" || activity.type === "PDF_REVIEW" || activity.type === "CODE_PROJECT") ? (
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">
                                                        ⭐ Por Calificar
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Entregado</Badge>
                                                )
                                            )}
                                            {status === "graded" && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Calificado</Badge>}
                                        </TableCell>
                                        {activity.type !== "MANUAL" && (
                                            <>
                                                <TableCell>
                                                    {submission ? format(new Date(submission.lastSubmittedAt || submission.createdAt), "PP p") : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {submission ? (
                                                        <span className="text-sm">
                                                            {submission.attemptCount} / {activity.maxAttempts}
                                                        </span>
                                                    ) : "-"}
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell>
                                            {submission?.grade !== null && submission?.grade !== undefined ? (
                                                <span className="font-bold">{submission.grade.toFixed(1)} / 5.0</span>
                                            ) : (!submission && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL') ? (
                                                <span className="font-bold text-red-500">0.0 / 5.0</span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedStudentIndex(studentStatus.indexOf(studentStatus.find(s => s.student.id === student.id)!))}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    {!submission ? "Calificar" : "Ver Detalle"}
                                                </Button>
                                                {submission && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteSubmission(submission)}
                                                        disabled={isPending}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {studentStatus.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No hay estudiantes inscritos en este curso.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Panel de detalle controlado — con navegación Anterior / Siguiente */}
            {(() => {
                if (selectedStudentIndex === null) return null;
                const { student, submission, isRejected } = studentStatus[selectedStudentIndex];
                const total = students.length;

                const resetGradingState = () => {
                    setGradingResult(null);
                    setGradingLogs([]);
                    setShowGradingLogs(false);
                };

                const goPrev = () => {
                    resetGradingState();
                    setSelectedStudentIndex(i => i === null ? null : (i - 1 + total) % total);
                };
                const goNext = () => {
                    resetGradingState();
                    setSelectedStudentIndex(i => i === null ? null : (i + 1) % total);
                };

                return (
                    <Sheet open={selectedStudentIndex !== null} onOpenChange={open => { 
                        if (!open) {
                            setSelectedStudentIndex(null); 
                            setGradingResult(null);
                            setGradingLogs([]);
                            setShowGradingLogs(false);
                        } 
                    }}>
                        <SheetContent side="right" className="w-full max-w-none sm:max-w-none p-0">
                            <SheetHeader className="px-6 py-4 border-b">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <SheetTitle>Detalle de Entrega</SheetTitle>
                                        <SheetDescription className="truncate">
                                            {formatName(student.name, student.profile)} ({student.email})
                                        </SheetDescription>
                                    </div>
                                    {/* Navegación Anterior / Siguiente */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={goPrev}
                                            title="Estudiante anterior"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground px-2 tabular-nums">
                                            {selectedStudentIndex + 1} / {total}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={goNext}
                                            title="Siguiente estudiante"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="overflow-y-auto p-6 space-y-6">
                                {/* Student Info Card */}
                                <div className="rounded-lg border p-4 bg-muted/50">
                                    <h4 className="font-semibold mb-3">Información del Estudiante</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Nombre:</span>
                                            <span className="font-medium">{formatName(student.name, student.profile)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Email:</span>
                                            <span className="font-medium">{student.email}</span>
                                        </div>
                                        {submission && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Intentos:</span>
                                                    <span className="font-medium">{submission.attemptCount} / {activity.maxAttempts}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Última entrega:</span>
                                                    <span className="font-medium">
                                                        {format(new Date(submission.lastSubmittedAt || submission.createdAt), "PPp")}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Submission URL */}
                                {submission && submission.url && (
                                    <div className="rounded-lg border p-4">
                                        <h4 className="font-semibold mb-3">Enlace de Entrega</h4>
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                                            {activity.type === "GITHUB" || activity.type === "CODE_PROJECT" ? (
                                                <Github className="h-5 w-5 text-muted-foreground shrink-0" />
                                            ) : activity.type === "PDF_REVIEW" ? (
                                                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-muted-foreground shrink-0" />
                                            )}
                                            <a
                                                href={submission.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline font-medium text-sm break-all"
                                            >
                                                {activity.type === "GITHUB" || activity.type === "CODE_PROJECT" ? "Ver Repositorio en GitHub" :
                                                    activity.type === "PDF_REVIEW" ? "Ver PDF entregado" :
                                                        submission.url}
                                            </a>
                                        </div>
                                    </div>
                                )}



                                {/* Grade */}
                                {submission && submission.grade !== null && (
                                    <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                                        <h4 className="font-semibold mb-3">Calificación</h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Nota obtenida:</span>
                                            <span className="text-3xl font-bold text-green-700 dark:text-green-400">
                                                {submission.grade.toFixed(1)} / 5.0
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Feedback */}
                                {submission && submission.feedback && (
                                        <div className="rounded-lg border p-4">
                                            <h4 className="font-semibold mb-3">Retroalimentación</h4>
                                            <FeedbackViewer feedback={submission.feedback} />
                                        </div>
                                )}

                                {/* Calificación GitHub — IA y Manual */}
                                {activity.type === "GITHUB" && (
                                    <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Calificar Entrega GitHub
                                        </h4>

                                        {submission && activity.filePaths && (
                                            <div className="space-y-3">
                                                <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        size="sm"
                                                        className="gap-2"
                                                        disabled={gradingStudentId === student.id}
                                                        onClick={() => handleGradeWithAI(student.id, submission.url)}
                                                    >
                                                        {gradingStudentId === student.id ? (
                                                            <><Loader2 className="h-4 w-4 animate-spin" />Calificando...</>
                                                        ) : (
                                                            <><Bot className="h-4 w-4" />Calificar con IA (Gemini)</>
                                                        )}
                                                    </Button>
                                                    {gradingLogs.length > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1 text-xs"
                                                            onClick={() => setShowGradingLogs(v => !v)}
                                                        >
                                                            {showGradingLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                            {showGradingLogs ? "Ocultar" : "Ver"} progreso
                                                        </Button>
                                                    )}
                                                </div>
                                                {showGradingLogs && gradingLogs.length > 0 && (
                                                    <div
                                                        ref={scrollRef}
                                                        className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono bg-background p-2 rounded border scroll-smooth"
                                                    >
                                                        {gradingLogs.map((log, i) => (
                                                            <div key={i} className="wrap-break-word border-b border-muted/30 pb-1 mb-1 last:border-0">
                                                                {log}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {gradingResult && (
                                                    <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                                                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Calificación guardada: <strong>{gradingResult.grade.toFixed(1)} / 5.0</strong>. Recarga para ver el feedback completo.</span>
                                                    </div>
                                                )}

                                                {!gradingResult && gradingStudentId === null && gradingLogs.some(l => l.includes("❌")) && lastAnalyses.length > 0 && (
                                                    <div className="flex flex-col gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded text-xs">
                                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                            <span>Se produjo un error al consolidar, pero los archivos ya fueron analizados.</span>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-[10px] gap-1 self-start"
                                                            onClick={() => handleRetryFinalize(student.id, submission.url)}
                                                        >
                                                            <Sparkles className="h-3 w-3" />
                                                            Reintentar solo consolidación (sin evaluar de nuevo)
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="border-t pt-4">
                                            <h5 className="text-sm font-medium mb-3">Calificación Manual</h5>
                                                <form id={`form-github-${student.id}`}>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`grade-github-${student.id}`} className="text-xs">Nota (0.0 - 5.0)</Label>
                                                            <Input
                                                                id={`grade-github-${student.id}`}
                                                                name="grade"
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="5"
                                                                defaultValue={gradingResult?.grade ?? submission?.grade ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "0.0" : "")}
                                                                placeholder="Ej: 4.5"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <Label htmlFor={`feedback-github-${student.id}`} className="text-xs">Retroalimentación</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={async () => {
                                                                        const textarea = document.getElementById(`feedback-github-${student.id}`) as HTMLTextAreaElement;
                                                                        const text = textarea.value;
                                                                        if (!text || text.length < 10) { toast.error("Escribe al menos 10 caracteres."); return; }
                                                                        const toastId = toast.loading("Mejorando redacción con IA...");
                                                                        try {
                                                                            const improved = await improveFeedbackAction(text);
                                                                            textarea.value = improved;
                                                                            toast.success("Texto mejorado", { id: toastId });
                                                                        } catch { toast.error("Error al mejorar texto", { id: toastId }); }
                                                                    }}
                                                                >
                                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                                    Mejorar con IA
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                id={`feedback-github-${student.id}`}
                                                                name="feedback"
                                                                defaultValue={gradingResult?.feedback ?? submission?.feedback?.replace("[ENTREGA RECHAZADA]\n", "")?.replace("[ENTREGA RECHAZADA]", "") ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")}
                                                                placeholder="Comentarios para el estudiante..."
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                className="flex-1"
                                                                onClick={async () => {
                                                                    const form = document.getElementById(`form-github-${student.id}`) as HTMLFormElement;
                                                                    const formData = new FormData(form);
                                                                    const grade = formData.get("grade") as string;
                                                                    const feedback = formData.get("feedback") as string;
                                                                    await handleGradeManual(grade, feedback, student.id, activity.id);
                                                                }}
                                                            >
                                                                {submission?.grade !== null && submission?.grade !== undefined ? "Actualizar Nota" : "Guardar Nota"}
                                                            </Button>
                                                            {submission && (
                                                                <Button 
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const { rejectManualActivityAction } = await import("@/features/teacher/actions/gradingActions");
                                                                        const formData = new FormData();
                                                                        formData.append("activityId", activity.id);
                                                                        formData.append("userId", student.id);
                                                                        formData.append("courseId", activity.courseId);
                                                                        const feedback = (document.getElementById(`feedback-github-${student.id}`) as HTMLTextAreaElement)?.value;
                                                                        if (feedback) formData.append("feedback", feedback);
                                                                        await rejectManualActivityAction(formData);
                                                                        toast.success("Entrega rechazada");
                                                                    }}
                                                                    variant="outline"
                                                                    className="text-destructive hover:bg-destructive/10"
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </form>
                                        </div>
                                    </div>
                                )}

                                {/* Calificación PDF — IA */}
                                {activity.type === "PDF_REVIEW" && (
                                    <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Calificar Entrega PDF
                                        </h4>

                                        {submission && (
                                            <div className="space-y-3">
                                                <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                                <Button
                                                    type="button"
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={isPdfGrading === student.id}
                                                    onClick={() => handleGradePdfWithAI(student.id, submission.url)}
                                                >
                                                    {isPdfGrading === student.id ? (
                                                        <><Loader2 className="h-4 w-4 animate-spin" />Calificando...</>
                                                    ) : (
                                                        <><Bot className="h-4 w-4" />Calificar con IA (Gemini)</>
                                                    )}
                                                </Button>
                                                {gradingResult && (
                                                    <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                                                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Calificación guardada: <strong>{gradingResult.grade.toFixed(1)} / 5.0</strong>.</span>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">
                                                    Esto descargará el PDF y lo evaluará según la rúbrica definida en el enunciado.
                                                </p>
                                            </div>
                                        )}

                                        <div className="border-t pt-4">
                                            <h5 className="text-sm font-medium mb-3">Calificación Manual</h5>
                                                <form id={`form-pdf-${student.id}`}>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`grade-pdf-${student.id}`} className="text-xs">Nota (0.0 - 5.0)</Label>
                                                            <Input
                                                                id={`grade-pdf-${student.id}`}
                                                                name="grade"
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="5"
                                                                defaultValue={gradingResult?.grade ?? submission?.grade ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "0.0" : "")}
                                                                placeholder="Ej: 4.5"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <Label htmlFor={`feedback-pdf-${student.id}`} className="text-xs">Retroalimentación</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={async () => {
                                                                        const textarea = document.getElementById(`feedback-pdf-${student.id}`) as HTMLTextAreaElement;
                                                                        const text = textarea.value;
                                                                        if (!text || text.length < 10) { toast.error("Escribe al menos 10 caracteres."); return; }
                                                                        const toastId = toast.loading("Mejorando redacción con IA...");
                                                                        try {
                                                                            const improved = await improveFeedbackAction(text);
                                                                            textarea.value = improved;
                                                                            toast.success("Texto mejorado", { id: toastId });
                                                                        } catch { toast.error("Error al mejorar texto", { id: toastId }); }
                                                                    }}
                                                                >
                                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                                    Mejorar con IA
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                id={`feedback-pdf-${student.id}`}
                                                                name="feedback"
                                                                defaultValue={gradingResult?.feedback ?? submission?.feedback?.replace("[ENTREGA RECHAZADA]\n", "")?.replace("[ENTREGA RECHAZADA]", "") ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")}
                                                                placeholder="Comentarios para el estudiante..."
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                className="flex-1"
                                                                onClick={async () => {
                                                                    const form = document.getElementById(`form-pdf-${student.id}`) as HTMLFormElement;
                                                                    const formData = new FormData(form);
                                                                    const grade = formData.get("grade") as string;
                                                                    const feedback = formData.get("feedback") as string;
                                                                    await handleGradeManual(grade, feedback, student.id, activity.id);
                                                                }}
                                                            >
                                                                {submission?.grade !== null && submission?.grade !== undefined ? "Actualizar Nota" : "Guardar Nota"}
                                                            </Button>
                                                            {submission && (
                                                                <Button 
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const { rejectManualActivityAction } = await import("@/features/teacher/actions/gradingActions");
                                                                        const formData = new FormData();
                                                                        formData.append("activityId", activity.id);
                                                                        formData.append("userId", student.id);
                                                                        formData.append("courseId", activity.courseId);
                                                                        const feedback = (document.getElementById(`feedback-pdf-${student.id}`) as HTMLTextAreaElement)?.value;
                                                                        if (feedback) formData.append("feedback", feedback);
                                                                        await rejectManualActivityAction(formData);
                                                                        toast.success("Entrega rechazada");
                                                                    }}
                                                                    variant="outline"
                                                                    className="text-destructive hover:bg-destructive/10"
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </form>
                                        </div>
                                    </div>
                                )}

                                {activity.type === "CODE_PROJECT" && (
                                    <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Github className="h-4 w-4" />
                                            Revisión de Proyecto de Código
                                        </h4>

                                        {submission && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        disabled={scanningRepoStudentId === student.id}
                                                        onClick={() => handleScanRepo(student.id, submission.url)}
                                                    >
                                                        {scanningRepoStudentId === student.id ? (
                                                            <><Loader2 className="h-4 w-4 animate-spin" /> Escaneando...</>
                                                        ) : (
                                                            <><Search className="h-4 w-4" /> Escanear Repositorio</>
                                                        )}
                                                    </Button>
                                                </div>

                                                {scannedRepoFiles.length > 0 && (
                                                    <div className="space-y-3">
                                                        <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                                        <Label className="text-xs font-medium">Selecciona los archivos para evaluar:</Label>
                                                        <div className="max-h-60 overflow-y-auto border rounded-md bg-background p-2 space-y-1">
                                                            {scannedRepoFiles.map((path) => (
                                                                <div key={path} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded transition-colors">
                                                                    <Checkbox
                                                                        id={`file-${path}`}
                                                                        checked={selectedRepoFiles.includes(path)}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) setSelectedRepoFiles(prev => [...prev, path]);
                                                                            else setSelectedRepoFiles(prev => prev.filter(p => p !== path));
                                                                        }}
                                                                    />
                                                                    <label
                                                                        htmlFor={`file-${path}`}
                                                                        className="text-xs font-mono truncate cursor-pointer flex-1"
                                                                    >
                                                                        {path}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-2">
                                                            <Button
                                                                type="button"
                                                                variant="default"
                                                                size="sm"
                                                                className="flex-1 gap-2"
                                                                disabled={isCodeProjectGrading === student.id || selectedRepoFiles.length === 0}
                                                                onClick={() => handleGradeCodeProjectWithAI(student.id, submission.url)}
                                                            >
                                                                {isCodeProjectGrading === student.id ? (
                                                                    <><Loader2 className="h-4 w-4 animate-spin" /> Evaluando...</>
                                                                ) : (
                                                                    <><Sparkles className="h-4 w-4" /> Calificar Selección con IA</>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setShowGradingLogs(v => !v)}
                                                            >
                                                                {showGradingLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                            </Button>
                                                        </div>

                                                        {showGradingLogs && gradingLogs.length > 0 && (
                                                            <div
                                                                ref={scrollRef}
                                                                className="space-y-1 max-h-40 overflow-y-auto text-[10px] font-mono bg-background p-2 rounded border"
                                                            >
                                                                {gradingLogs.map((log, i) => (
                                                                    <div key={i} className="border-b border-muted/30 pb-1 last:border-0">
                                                                        {log}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {gradingResult && (
                                                    <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                                                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Calificación guardada: <strong>{gradingResult.grade.toFixed(1)} / 5.0</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="border-t pt-4">
                                            <h5 className="text-sm font-medium mb-3">Calificación Manual</h5>
                                                <form id={`form-cp-${student.id}`}>
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`grade-cp-${student.id}`} className="text-xs">Nota (0.0 - 5.0)</Label>
                                                            <Input
                                                                id={`grade-cp-${student.id}`}
                                                                name="grade"
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max="5"
                                                                defaultValue={gradingResult?.grade ?? submission?.grade ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "0.0" : "")}
                                                                placeholder="Ej: 4.5"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <Label htmlFor={`feedback-cp-${student.id}`} className="text-xs">Retroalimentación</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={async () => {
                                                                        const textarea = document.getElementById(`feedback-cp-${student.id}`) as HTMLTextAreaElement;
                                                                        const text = textarea.value;
                                                                        if (!text || text.length < 10) { toast.error("Escribe al menos 10 caracteres."); return; }
                                                                        const toastId = toast.loading("Mejorando redacción con IA...");
                                                                        try {
                                                                            const improved = await improveFeedbackAction(text);
                                                                            textarea.value = improved;
                                                                            toast.success("Texto mejorado", { id: toastId });
                                                                        } catch { toast.error("Error al mejorar texto", { id: toastId }); }
                                                                    }}
                                                                >
                                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                                    Mejorar con IA
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                id={`feedback-cp-${student.id}`}
                                                                name="feedback"
                                                                defaultValue={gradingResult?.feedback ?? submission?.feedback?.replace("[ENTREGA RECHAZADA]\n", "")?.replace("[ENTREGA RECHAZADA]", "") ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")}
                                                                placeholder="Comentarios para el estudiante..."
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                className="flex-1"
                                                                onClick={async () => {
                                                                    const form = document.getElementById(`form-cp-${student.id}`) as HTMLFormElement;
                                                                    const formData = new FormData(form);
                                                                    const grade = formData.get("grade") as string;
                                                                    const feedback = formData.get("feedback") as string;
                                                                    await handleGradeManual(grade, feedback, student.id, activity.id);
                                                                }}
                                                            >
                                                                {submission?.grade !== null && submission?.grade !== undefined ? "Actualizar Nota" : "Guardar Nota"}
                                                            </Button>
                                                            {submission && (
                                                                <Button 
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        const { rejectManualActivityAction } = await import("@/features/teacher/actions/gradingActions");
                                                                        const formData = new FormData();
                                                                        formData.append("activityId", activity.id);
                                                                        formData.append("userId", student.id);
                                                                        formData.append("courseId", activity.courseId);
                                                                        const feedback = (document.getElementById(`feedback-cp-${student.id}`) as HTMLTextAreaElement)?.value;
                                                                        if (feedback) formData.append("feedback", feedback);
                                                                        await rejectManualActivityAction(formData);
                                                                        toast.success("Entrega rechazada");
                                                                    }}
                                                                    variant="outline"
                                                                    className="text-destructive hover:bg-destructive/10"
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </form>
                                        </div>
                                    </div>
                                )}

                                {/* Manual Grading Form */}
                                {activity.type === "MANUAL" && (
                                    <div className="rounded-lg border p-4 bg-muted/30">
                                        <h4 className="font-semibold mb-3">Calificación Manual</h4>
                                            <form 
                                                id={`form-manual-${student.id}`}
                                                action={async (formData) => {
                                                    const grade = formData.get("grade") as string;
                                                    const feedback = formData.get("feedback") as string;
                                                    if (!student?.id) { toast.error("Error: ID de estudiante no encontrado"); return; }
                                                    if (!activity?.id) { toast.error("Error: ID de actividad no encontrado"); return; }
                                                    await handleGradeManual(grade, feedback, student.id, activity.id);
                                                }}
                                            >
                                            <input type="hidden" name="activityId" value={activity.id} />
                                            <input type="hidden" name="userId" value={student.id} />
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`grade-manual-${student.id}`}>Nota (0.0 - 5.0)</Label>
                                                        <Input
                                                            id={`grade-manual-${student.id}`}
                                                            name="grade"
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            max="5"
                                                            defaultValue={submission?.grade ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "0.0" : "")}
                                                            required
                                                            placeholder="Ej: 4.5"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor={`feedback-manual-${student.id}`}>Retroalimentación</Label>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={async () => {
                                                                    const textarea = document.getElementById(`feedback-manual-${student.id}`) as HTMLTextAreaElement;
                                                                    const text = textarea.value;
                                                                    if (!text || text.length < 10) {
                                                                        toast.error("Escribe al menos 10 caracteres para mejorar.");
                                                                        return;
                                                                    }
                                                                    const toastId = toast.loading("Mejorando redacción con IA...");
                                                                    try {
                                                                        const { improveFeedbackAction } = await import("@/features/teacher/actions/gradingActions");
                                                                        const improved = await improveFeedbackAction(text);
                                                                        textarea.value = improved;
                                                                        toast.success("Texto mejorado", { id: toastId });
                                                                    } catch (error) {
                                                                        toast.error("Error al mejorar texto", { id: toastId });
                                                                    }
                                                                }}
                                                            >
                                                                <Sparkles className="w-3 h-3 mr-1" />
                                                                Mejorar con IA
                                                            </Button>
                                                        </div>
                                                        <Textarea
                                                            id={`feedback-manual-${student.id}`}
                                                            name="feedback"
                                                            defaultValue={submission?.feedback?.replace("[ENTREGA RECHAZADA]\n", "")?.replace("[ENTREGA RECHAZADA]", "") ?? (!submission && activity.deadline && new Date(activity.deadline) < new Date() ? "No realizó entrega" : "")}
                                                            placeholder="Comentarios para el estudiante..."
                                                            rows={4}
                                                        />
                                                    </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        type="button" 
                                                        className="flex-1"
                                                        onClick={async () => {
                                                            try {
                                                                const form = document.getElementById(`form-manual-${student.id}`) as HTMLFormElement;
                                                                if (!form) {
                                                                    toast.error("Error: Formulario no encontrado en el DOM");
                                                                    return;
                                                                }
                                                                const formData = new FormData(form);
                                                                const grade = formData.get("grade") as string;
                                                                const feedback = formData.get("feedback") as string;
                                                                if (!student?.id) { toast.error("Error: ID de estudiante no encontrado"); return; }
                                                                if (!activity?.id) { toast.error("Error: ID de actividad no encontrado"); return; }
                                                                await handleGradeManual(grade, feedback, student.id, activity.id);
                                                            } catch (err: any) {
                                                                toast.error("Error crítico en el botón", { description: err.message });
                                                            }
                                                        }}
                                                    >
                                                        {submission?.grade !== null && submission?.grade !== undefined ? "Actualizar Nota" : "Guardar Nota"}
                                                    </Button>
                                                    {submission && (
                                                        <Button 
                                                            type="button"
                                                            onClick={async () => {
                                                                const { rejectManualActivityAction } = await import("@/features/teacher/actions/gradingActions");
                                                                const formData = new FormData();
                                                                formData.append("activityId", activity.id);
                                                                formData.append("userId", student.id);
                                                                formData.append("courseId", activity.courseId);
                                                                await rejectManualActivityAction(formData);
                                                                toast.success("Entrega rechazada");
                                                            }}
                                                            variant="outline"
                                                            className="text-destructive hover:bg-destructive/10"
                                                        >
                                                            Rechazar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            </form>
                                    </div>
                                )}

                            </div>
                        </SheetContent>
                    </Sheet>
                );
            })()}

            {/* Validation Results Dialog */}
            <AlertDialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
                <AlertDialogContent className="!max-w-[95vw] sm:!max-w-[95vw] lg:!max-w-[1200px] max-h-[90vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Análisis de Enlaces Únicos
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Resultados de la validación de enlaces en las entregas de los estudiantes
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {validationResults && (
                        <div className="space-y-6 py-4">
                            {/* Statistics Cards */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-lg border p-4 bg-card">
                                    <div className="text-2xl font-bold">{validationResults.totalSubmissions}</div>
                                    <p className="text-xs text-muted-foreground">Total Entregas</p>
                                </div>
                                <div className="rounded-lg border p-4 bg-card">
                                    <div className="text-2xl font-bold text-green-600">{validationResults.uniqueCount}</div>
                                    <p className="text-xs text-muted-foreground">Enlaces Únicos</p>
                                </div>
                                <div className="rounded-lg border p-4 bg-card">
                                    <div className="text-2xl font-bold text-red-600">{validationResults.duplicateCount}</div>
                                    <p className="text-xs text-muted-foreground">Enlaces Duplicados</p>
                                </div>
                                <div className="rounded-lg border p-4 bg-card">
                                    <div className="text-2xl font-bold text-blue-600">{validationResults.originalityPercentage}%</div>
                                    <p className="text-xs text-muted-foreground">Originalidad</p>
                                </div>
                            </div>

                            {/* Duplicates List */}
                            {validationResults.duplicates.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        <span>Enlaces Duplicados Detectados ({validationResults.duplicates.length})</span>
                                    </div>

                                    {validationResults.duplicates.map((duplicate: any, index: number) => (
                                        <div key={index} className="rounded-lg border bg-card p-4">
                                            <div className="flex items-start gap-3 mb-3">
                                                <Badge variant="secondary" className="mt-1">
                                                    {duplicate.count} estudiantes
                                                </Badge>
                                                <div className="flex-1 flex items-center gap-2">
                                                    <p className="text-sm font-mono text-muted-foreground break-all flex-1">
                                                        {duplicate.url}
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={() => {
                                                            const urlToOpen = duplicate.students[0]?.originalUrl || duplicate.url;
                                                            const finalUrl = urlToOpen.startsWith('http') ? urlToOpen : `https://${urlToOpen}`;
                                                            window.open(finalUrl, '_blank');
                                                        }}
                                                        title="Abrir enlace en nueva pestaña"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Batch Grading Section */}
                                            <div className="mt-4 pt-4 border-t space-y-4">
                                                <div className="space-y-1 mb-4">
                                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                        <Users className="w-3 h-3" /> Integrantes del Grupo:
                                                    </Label>
                                                    <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded border border-dashed">
                                                        {duplicate.students.map((student: any) => {
                                                            const status = studentStatus.find(s => s.student.id === student.id);
                                                            return (
                                                                <div key={student.id} className="flex items-center justify-between text-[11px] bg-background/50 px-2 py-1 rounded">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <span className="font-medium py-0.5" title={student.name}>{student.name}</span>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-6 w-6 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                                                                            title="Ver retroalimentación individual"
                                                                            onClick={() => {
                                                                                const index = studentStatus.findIndex(s => s.student.id === student.id);
                                                                                if (index !== -1) {
                                                                                    setSelectedStudentIndex(index);
                                                                                    setValidationDialogOpen(false);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    {status?.submission?.grade !== null && status?.submission?.grade !== undefined && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                                                                            {status.submission.grade.toFixed(1)}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>


                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-6 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                                    <p className="font-semibold text-green-800 dark:text-green-400">
                                        ¡Excelente! No se detectaron enlaces duplicados
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Todos los estudiantes entregaron enlaces únicos
                                    </p>
                                </div>
                            )}

                            {/* Unique Links Section */}
                            {validationResults.uniques && validationResults.uniques.length > 0 && (
                                <div className="mt-8 pt-8 border-t space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>Enlaces Únicos Confirmados ({validationResults.uniques.length})</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground italic">
                                        Estos estudiantes entregaron trabajos individuales con enlaces no compartidos.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {validationResults.uniques.map((item: any, idx: number) => {
                                            const status = studentStatus.find(s => s.student.id === item.student.id);
                                            return (
                                                <div key={idx} className="rounded-lg border bg-background/50 p-3 shadow-sm hover:border-primary/30 transition-all group">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex-1 overflow-hidden">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-[12px] truncate block" title={item.student.name}>
                                                                    {item.student.name}
                                                                </span>
                                                                {status?.submission?.grade !== null && status?.submission?.grade !== undefined && (
                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-700 border-green-200 shrink-0">
                                                                        {status.submission.grade.toFixed(1)}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-muted-foreground opacity-70">
                                                                <Link2 className="w-2.5 h-2.5 shrink-0" />
                                                                <p className="text-[9px] truncate font-mono" title={item.url}>{item.url}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                                                onClick={() => {
                                                                    const index = studentStatus.findIndex(s => s.student.id === item.student.id);
                                                                    if (index !== -1) {
                                                                        setSelectedStudentIndex(index);
                                                                        setValidationDialogOpen(false);
                                                                    }
                                                                }}
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                onClick={() => {
                                                                    const finalUrl = item.url.startsWith('http') ? item.url : `https://${item.url}`;
                                                                    window.open(finalUrl, '_blank');
                                                                }}
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setValidationDialogOpen(false)}>
                            Cerrar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar entrega?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la entrega del estudiante
                            {submissionToDelete && ` (${submissionToDelete.user?.name || 'estudiante'})`}.
                            <br /><br />
                            <strong>Nota:</strong> Al eliminar la entrega, se reiniciará el contador de intentos del estudiante, permitiéndole volver a entregar como si fuera la primera vez.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal/Sheet Lateral de Calificación por Lotes */}
            <Sheet open={showBatchSheet} onOpenChange={(open) => {
                if (!isBatchGrading) setShowBatchSheet(open);
            }}>
                {/* Agregamos pointer-events-auto para interactuar con lo que hay debajo del overlay */}
                <SheetContent side="right" className="flex flex-col w-full sm:max-w-xl lg:max-w-2xl overflow-hidden p-6 pointer-events-auto data-[state=closed]:duration-200" onInteractOutside={(e) => {
                    // Prevenir el cierre automático si estamos escaneando
                    if (isBatchGrading) {
                        e.preventDefault();
                    }
                }}>
                    <SheetHeader className="pb-4 border-b shrink-0">
                        <SheetTitle>
                            {batchStep === "selection" ? "Seleccionar Estudiantes para Lote" : "Evaluación por Lote Asistida por IA"}
                        </SheetTitle>
                        <SheetDescription>
                            {batchStep === "selection"
                                ? "Selecciona los estudiantes listos para ser evaluados por Gemini."
                                : "Evaluación en segundo plano. Puedes minimizar este panel y seguir operando."}
                        </SheetDescription>
                    </SheetHeader>

                    {batchStep === "selection" && (
                        <div className="flex-1 overflow-y-auto mt-4 px-1 py-1">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium">
                                    {selectedStudentsForBatch.length} de {studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission).length} listos
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudentsForBatch(studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission).map(s => s.student.id))}
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudentsForBatch(studentStatus.filter(s => s.status === "submitted").filter(s => s.submission).map(s => s.student.id))}
                                    >
                                        Solo Entregados
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudentsForBatch([])}
                                    >
                                        Ninguno
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={
                                                        selectedStudentsForBatch.length > 0 &&
                                                        selectedStudentsForBatch.length === studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission).length
                                                    }
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedStudentsForBatch(studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission).map(s => s.student.id));
                                                        } else {
                                                            setSelectedStudentsForBatch([]);
                                                        }
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead>Estudiante</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentStatus
                                            .filter(s => s.status === "submitted" || s.status === "graded")
                                            .filter(s => s.submission)
                                            .map((s, index) => {
                                                const isSelected = selectedStudentsForBatch.includes(s.student.id);
                                                return (
                                                    <TableRow key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedStudentsForBatch(prev => prev.filter(id => id !== s.student.id));
                                                        } else {
                                                            setSelectedStudentsForBatch(prev => [...prev, s.student.id]);
                                                        }
                                                    }}>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedStudentsForBatch(prev => [...prev, s.student.id]);
                                                                    } else {
                                                                        setSelectedStudentsForBatch(prev => prev.filter(id => id !== s.student.id));
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {formatName(s.student.name, s.student.profile)}
                                                            <span className="block text-muted-foreground text-xs font-normal mt-0.5">{s.student.email}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={s.status === "graded" ? "default" : "secondary"}>
                                                                {s.status === "graded" ? "Calificado" : "Entregado"}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        {studentStatus.filter(s => s.status === "submitted" || s.status === "graded").filter(s => s.submission).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                    No hay estudiantes con entregas pendientes o evaluables.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-6 p-4 rounded-lg bg-muted/50 border space-y-4">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Optimización de Lote
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            id="batch-skip-graded" 
                                            checked={batchSkipGraded}
                                            onCheckedChange={(v) => setBatchSkipGraded(!!v)}
                                            className="mt-1"
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="batch-skip-graded" className="text-xs font-medium cursor-pointer">Depuración de la Cola</Label>
                                            <p className="text-[10px] text-muted-foreground">Excluir automáticamente de la evaluación a estudiantes que ya cuentan con una nota previa.</p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3 mt-3">
                                        <Label className="text-xs font-medium mb-2 block">Nivel de Exigencia de la IA</Label>
                                        <GradingModeSelector gradingMode={gradingMode} setGradingMode={setGradingMode} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {batchStep === "selection" && (
                        <SheetFooter className="mt-6 pt-4 border-t">
                            <Button 
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2 h-11"
                                disabled={selectedStudentsForBatch.length === 0}
                                onClick={handleBatchGradeWithAI}
                            >
                                <Bot className="h-5 w-5" />
                                Iniciar Evaluación de {selectedStudentsForBatch.length} Estudiantes
                            </Button>
                        </SheetFooter>
                    )}

                    {batchStep === "progress" && (
                        <div className="flex-1 flex flex-col mt-4 py-1 min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Progreso Global</span>
                                <span className="text-sm font-bold text-primary">
                                    {batchProgress} / {batchTotal}
                                </span>
                            </div>

                            <div className="w-full bg-secondary rounded-full h-2.5 mb-4 border">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                    style={{ width: (batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0) + "%" }}
                                />
                            </div>

                            <div
                                ref={batchScrollRef}
                                className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed whitespace-pre-wrap shadow-inner min-h-[150px]"
                            >
                                {batchLogs.map((log, index) => (
                                    <div key={index} className={"mb-1 " + (
                                        log.includes('✅') ? 'text-green-400' :
                                            log.includes('❌') ? 'text-red-400' :
                                                log.includes('---') ? 'text-blue-400 mt-4 font-bold' :
                                                    log.includes('🎉') ? 'text-yellow-400 mt-4 font-bold text-sm' : 'text-slate-300'
                                    )}>
                                        {log}
                                    </div>
                                ))}
                            </div>

                            {!isBatchGrading && batchReport.length > 0 && (
                                <div className="mt-4 p-4 border rounded-md overflow-hidden flex flex-col max-h-[40vh] bg-muted/30">
                                    <h4 className="font-semibold text-sm mb-3 shrink-0 flex items-center justify-between border-b pb-2">
                                        Resumen de Resultados
                                        <Badge variant="outline" className="bg-background">Total: {batchReport.length}</Badge>
                                    </h4>
                                    <div className="flex-1 overflow-y-auto pr-2">
                                        <Table>
                                            <TableBody>
                                                {batchReport.map((r, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium whitespace-nowrap pl-0 text-sm max-w-[150px] truncate" title={r.name}>
                                                            {r.name}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-0">
                                                            {r.error ? (
                                                                <span className="text-red-500 font-medium text-xs break-words max-w-[200px] inline-block text-left" title={r.error}>Fallido: {r.error}</span>
                                                            ) : (
                                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completado ({r.grade?.toFixed(1)})</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t flex justify-between shrink-0">
                                {isBatchGrading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        Evaluando en segundo plano...
                                    </div>
                                ) : (
                                    <div className="flex-1" />
                                )}
                                <Button
                                    onClick={() => {
                                        setShowBatchSheet(false);
                                        if (!isBatchGrading) {
                                            window.location.reload();
                                        }
                                    }}
                                    variant={isBatchGrading ? "outline" : "default"}
                                >
                                    {isBatchGrading ? "Ocultar Panel (Sigue procesando)" : "Finalizar y Actualizar"}
                                </Button>
                            </div>
                        </div>
                    )}

                </SheetContent>
            </Sheet>
        </div>
    );
}

function GradingModeSelector({ gradingMode, setGradingMode }: { gradingMode: string, setGradingMode: (m: any) => void }) {
    return (
        <div className="flex flex-col gap-1.5 mb-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nivel de Exigencia IA</Label>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-full border border-muted">
                {(['normal', 'moderate', 'strict'] as const).map((mode) => (
                    <Button 
                        key={mode}
                        type="button"
                        variant={gradingMode === mode ? "secondary" : "ghost"} 
                        size="sm" 
                        className={`flex-1 h-8 text-[11px] capitalize transition-all ${
                            gradingMode === mode 
                                ? "bg-white dark:bg-background shadow-sm font-semibold text-primary" 
                                : "text-muted-foreground hover:text-foreground"
                        }`} 
                        onClick={() => setGradingMode(mode)}
                    >
                        {mode === 'normal' ? 'Normal' : mode === 'moderate' ? 'Moderado' : 'Estricto'}
                    </Button>
                ))}
            </div>
            {gradingMode === 'strict' && (
                <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 px-1 flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Penaliza redacción, ortografía y normas de documentación.
                </p>
            )}
        </div>
    );
}
