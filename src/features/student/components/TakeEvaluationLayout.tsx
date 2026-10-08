"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Editor, { loader } from "@monaco-editor/react";

// Configurar Monaco para usar CDN de Cloudflare para autocompletado y workers
loader.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    CheckCircle, Clock, AlertTriangle, MessageSquare, Loader2, Sparkles, BookOpen, 
    LogOut, ShieldAlert, ShieldCheck, Lightbulb, RotateCcw, ZoomIn, ZoomOut, 
    ChevronLeft, ChevronRight, ListChecks, Send, BarChart3, CheckCircle2, ArrowRight,
    ArrowLeft, BellOff, Monitor, Laptop, Maximize2, CopySlash, Keyboard, SlidersHorizontal,
    HelpCircle, Info, ExternalLink, FileText, Calendar, Check, X, Shield, Lock, BellRing,
    AlertCircle, Zap
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { submitEvaluationAction, saveAnswerAction, evaluateAnswerWithAIAction, registerExpulsionAction, useAiHintAction } from "@/features/student/actions/evaluationActions";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { CodeThemeSelector } from "@/components/theme/CodeThemeSelector";
import { cn } from "@/lib/utils";

function getScoreColorClass(score: number): string {
    if (score >= 4.5) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (score >= 4.0) return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30";
    if (score >= 3.0) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    if (score >= 2.0) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    return "bg-destructive/15 text-destructive border-destructive/30";
}

// Flag para registrar proveedores de autocompletado de Monaco una sola vez a nivel global
let monacoCompletionsRegistered = false;

export function TakeEvaluationLayout({
    attempt,
    submission,
    studentId,
    themes = []
}: {
    attempt: any;
    submission: any;
    studentId: string;
    themes?: any[];
}) {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Modal states
    const [alertMessage, setAlertMessage] = useState<{ title: string; desc: string } | null>(null);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [finishConfirmText, setFinishConfirmText] = useState("");
    const [showOverviewModal, setShowOverviewModal] = useState(false);

    // Security/Anti-cheat states
    const [hasStarted, setHasStarted] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [expulsionsCount, setExpulsionsCount] = useState<number>(submission.expulsions || 0);
    const expulsionsCountRef = useRef(submission.expulsions || 0);
    const isExpellingRef = useRef(false);
    const lastViolationTimeRef = useRef(0);
    const isProcessingViolationRef = useRef(false);
    const [isMobile, setIsMobile] = useState(false);
    const [hasMultipleScreens, setHasMultipleScreens] = useState(false);

    // Refs para acceder a las respuestas y pregunta activa en eventos asíncronos y expulsiones
    const answersRef = useRef<Record<string, string>>({});
    const currentQuestionRef = useRef<any>(null);
    const editorRef = useRef<any>(null);
    const internalCodeClipboardRef = useRef<string>("");

    // Keep ref in sync with state
    useEffect(() => {
        expulsionsCountRef.current = expulsionsCount;
    }, [expulsionsCount]);

    // Surveillance and restriction configuration from attempt
    const surveillanceEnabled = attempt.enableSurveillance !== false;
    const blockTabSwitch = surveillanceEnabled && (attempt.blockTabSwitch !== false);
    const requireFullscreen = surveillanceEnabled && (attempt.requireFullscreen !== false);
    const blockMultipleDisplays = surveillanceEnabled && (attempt.blockMultipleDisplays !== false);
    const blockClipboard = surveillanceEnabled && (attempt.blockClipboard !== false);
    const maxWarnings = attempt.maxWarnings ?? 3;

    // Wildcards State
    const maxAiHints = attempt.wildcardAiHints ?? attempt.evaluation.wildcardAiHints ?? 0;
    const initialWildcards: any = submission.wildcardsUsed || {};
    const [aiHintsUsed, setAiHintsUsed] = useState<number>(initialWildcards.aiHintsUsed || 0);
    const [isUsingHint, setIsUsingHint] = useState(false);
    const [showHintConfirm, setShowHintConfirm] = useState(false);

    // Help Mode State
    const [isHelpMode, setIsHelpMode] = useState(false);
    // Zoom State
    const [zoomLevel, setZoomLevel] = useState(1.0);
    // Ref to read isHelpMode inside event handlers without stale closures
    const isHelpModeRef = useRef(false);
    useEffect(() => { isHelpModeRef.current = isHelpMode; }, [isHelpMode]);
    const effectiveHelpUrl = attempt.helpUrl || attempt.evaluation.helpUrl;
    const hasHelpUrl = !!effectiveHelpUrl;

    const handleExpulsion = async (reason: string, details: string) => {
        if (!surveillanceEnabled) return;
        if (isExpellingRef.current) return;

        isExpellingRef.current = true;

        // Guardar inmediatamente la respuesta actual (código o texto) antes de ser expulsado
        try {
            const currentQ = currentQuestionRef.current;
            if (currentQ?.id) {
                const currentAns = answersRef.current[currentQ.id];
                if (currentAns !== undefined) {
                    await saveAnswerAction(submission.id, currentQ.id, currentAns || "");
                }
            }
        } catch (saveErr) {
            console.error("Error guardando borrador previo a la expulsión:", saveErr);
        }

        try {
            const currentWarnings = expulsionsCountRef.current;
            const result = await registerExpulsionAction(submission.id);
            const newCount = result?.expulsions ?? (currentWarnings + 1);

            expulsionsCountRef.current = newCount;
            setExpulsionsCount(newCount);
        } catch (e) {
            console.error("Failed to register expulsion / exit violation:", e);
        }

        toast.error(`🚫 Has sido expulsado de la evaluación`, {
            description: `${reason}: ${details} Has perdido el foco o salido de la evaluación y la prueba se ha cerrado definitivamente.`,
            duration: 8000,
        });

        // Redirigir de inmediato al dashboard del estudiante indicando la expulsión
        router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations&error=${encodeURIComponent(`Expulsado de la evaluación: ${reason}. ${details}`)}`);
    };

    const handleExpulsionRef = useRef(handleExpulsion);
    useEffect(() => {
        handleExpulsionRef.current = handleExpulsion;
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    const questions = attempt.evaluation.questions || [];
    const currentQuestion = questions[activeQuestionIdx];
    const isSubmitted = !!submission.submittedAt;

    // In case the student already submitted, they don't need the security screen and can be considered "started"
    useEffect(() => {
        if (isSubmitted) {
            setHasStarted(true);
        }
    }, [isSubmitted]);

    // Device checks: mobile and multi-monitor
    useEffect(() => {
        if (!mounted) return;
        // Mobile detection: touch-only pointer + user agent
        const hasTouchPointer = window.matchMedia('(pointer: coarse)').matches;
        const uaIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(hasTouchPointer || uaIsMobile);

        // Multi-monitor detection via screen.isExtended (Chrome 100+)
        if (blockMultipleDisplays) {
            const screenExt = (window.screen as any).isExtended;
            if (typeof screenExt === 'boolean') {
                setHasMultipleScreens(screenExt);
            }
            // Listen for changes (e.g. plugging in a monitor)
            const screenChangeHandler = () => {
                setHasMultipleScreens(!!(window.screen as any).isExtended);
            };
            const screenAsAny = window.screen as any;
            screenAsAny.addEventListener?.('change', screenChangeHandler);
            return () => {
                screenAsAny.removeEventListener?.('change', screenChangeHandler);
            };
        }
    }, [mounted, blockMultipleDisplays]);

    // Anti-cheat verification
    useEffect(() => {
        if (!mounted || isSubmitted || !surveillanceEnabled) return;

        const checkMaximized = () => {
            if (!requireFullscreen) {
                setIsMaximized(true);
                return true;
            }
            // Acceptable threshold since some browsers differ by a few pixels on toolbars
            const isWidthMax = window.outerWidth >= window.screen.availWidth - 10;
            const isHeightMax = window.outerHeight >= window.screen.availHeight - 10;
            setIsMaximized(isWidthMax && isHeightMax);
            return isWidthMax && isHeightMax;
        };

        // Check immediately
        checkMaximized();

        const handleResize = () => {
            if (!requireFullscreen) return;
            const currentlyMaximized = checkMaximized();
            if (hasStarted && !currentlyMaximized) {
                handleExpulsionRef.current("Cambio de tamaño de ventana", "Has reducido o modificado el tamaño de la ventana de la evaluación.");
            }
        };

        const handleVisibilityChange = () => {
            if (!blockTabSwitch) return;
            if (hasStarted && document.visibilityState === 'hidden') {
                handleExpulsionRef.current("Abandono de pestaña", "Has abandonado o cambiado la pestaña de la evaluación.");
            }
        };

        const handleBlur = () => {
            if (!blockTabSwitch) return;
            if (hasStarted && !isHelpModeRef.current) {
                handleExpulsionRef.current("Pérdida de foco", "Has interactuado fuera de la aplicación o cambiado de ventana.");
            }
        };

        const handleScreenChange = () => {
            if (!blockMultipleDisplays) return;
            if (hasStarted && (window.screen as any).isExtended) {
                handleExpulsionRef.current("Múltiples monitores detectados", "Has conectado un monitor adicional durante la evaluación.");
            }
        };

        if (requireFullscreen) window.addEventListener('resize', handleResize);
        if (blockTabSwitch) {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleBlur);
        }
        if (blockMultipleDisplays) {
            (window.screen as any).addEventListener?.('change', handleScreenChange);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            (window.screen as any).removeEventListener?.('change', handleScreenChange);
        };
    }, [mounted, isSubmitted, hasStarted, surveillanceEnabled, blockTabSwitch, requireFullscreen, blockMultipleDisplays]);

    // Bloqueo de portapapeles y menú contextual si está habilitado
    useEffect(() => {
        if (!mounted || !hasStarted || isSubmitted || !blockClipboard) return;

        const preventClipboard = (e: Event) => {
            const target = e.target as HTMLElement | null;
            const isEditorArea = !!target?.closest('.monaco-editor') ||
                                 target?.tagName === "TEXTAREA" ||
                                 target?.tagName === "INPUT" ||
                                 target?.isContentEditable;

            // En el editor de código y campos de respuesta, permitir copiar y cortar texto propio con total libertad
            if ((e.type === "copy" || e.type === "cut") && isEditorArea) {
                return;
            }

            // En el pegado dentro de Monaco o áreas de respuesta, su propio manejador verifica origen interno
            if (e.type === "paste" && isEditorArea) {
                return;
            }

            e.preventDefault();
            toast.warning("Acción restringida", {
                description: "Copiar el contenido del examen está restringido en esta evaluación.",
            });
        };

        const handleContextMenu = (e: MouseEvent) => {
            // Permitir menú contextual en el editor de código Monaco y en campos editables
            const target = e.target as HTMLElement | null;
            const isEditable = target && (
                target.tagName === "TEXTAREA" ||
                target.tagName === "INPUT" ||
                target.isContentEditable ||
                !!target.closest('.monaco-editor')
            );

            if (isEditable && !target?.hasAttribute("readonly") && !(target as any)?.disabled) {
                // Se permite menú nativo o de Monaco para corrector y acciones del editor
                return;
            }

            e.preventDefault();
            toast.warning("Acción restringida", {
                description: "El menú contextual está deshabilitado en esta evaluación.",
            });
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isEditorArea = !!target?.closest('.monaco-editor') ||
                                 target?.tagName === "TEXTAREA" ||
                                 target?.tagName === "INPUT" ||
                                 target?.isContentEditable;

            // Permitir copiar y cortar (Ctrl+C, Ctrl+X) en el editor y campos de respuesta del estudiante
            if ((e.ctrlKey || e.metaKey) && ["c", "x", "C", "X"].includes(e.key)) {
                if (isEditorArea) {
                    return;
                }
                e.preventDefault();
                toast.warning("Acción restringida", {
                    description: "Copiar enunciados está deshabilitado en esta evaluación.",
                });
                return;
            }

            // Pegar (Ctrl+V): si está fuera de áreas editables, bloquear
            if ((e.ctrlKey || e.metaKey) && ["v", "V"].includes(e.key)) {
                if (!isEditorArea) {
                    e.preventDefault();
                    toast.warning("Acción restringida", {
                        description: "Pegar contenido está deshabilitado.",
                    });
                }
            }
        };

        document.addEventListener("copy", preventClipboard);
        document.addEventListener("cut", preventClipboard);
        document.addEventListener("paste", preventClipboard);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("copy", preventClipboard);
            document.removeEventListener("cut", preventClipboard);
            document.removeEventListener("paste", preventClipboard);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [mounted, hasStarted, isSubmitted, blockClipboard]);

    // Initialize local state for answers based on what's already saved
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const initialMap: Record<string, string> = {};
        if (submission.answersList) {
            submission.answersList.forEach((ans: any) => {
                initialMap[ans.questionId] = ans.answer || ans.content; // fallback check
            });
        }
        return initialMap;
    });

    // Mantener refs sincronizadas en todo momento para expulsiones y eventos
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        currentQuestionRef.current = currentQuestion;
    }, [currentQuestion]);

    // Auto-guardado continuo en segundo plano (debounce 800ms) para código y texto
    useEffect(() => {
        if (!hasStarted || isSubmitted) return;
        const currentQId = currentQuestion?.id;
        if (!currentQId) return;
        const currentAns = answers[currentQId];
        if (currentAns === undefined) return;

        const timer = setTimeout(() => {
            saveAnswerAction(submission.id, currentQId, currentAns || "");
        }, 800);

        return () => clearTimeout(timer);
    }, [answers, currentQuestion?.id, hasStarted, isSubmitted, submission.id]);

    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);

    // Feedback state is now a dictionary per question, holding a history array
    const [aiFeedbackMap, setAiFeedbackMap] = useState<Record<string, Array<{ attempt: number, feedback: string, score: number, isCorrect: boolean, requestedAt?: string }>>>(() => {
        const initialMap: Record<string, Array<{ attempt: number, feedback: string, score: number, isCorrect: boolean, requestedAt?: string }>> = {};
        if (submission.answersList) {
            submission.answersList.forEach((ans: any) => {
                if (ans.aiFeedback) {
                    try {
                        const parsed = typeof ans.aiFeedback === "string" ? JSON.parse(ans.aiFeedback) : ans.aiFeedback;
                        initialMap[ans.questionId] = Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        initialMap[ans.questionId] = [];
                    }
                }
            });
        }
        return initialMap;
    });

    const aiFeedbackHistory = aiFeedbackMap[currentQuestion.id] || [];
    const hasAI = aiFeedbackHistory.length > 0;

    const [timeLeftStr, setTimeLeftStr] = useState<string>("");
    const [evalRemainingSeconds, setEvalRemainingSeconds] = useState<number>(0);

    // Global accumulated score
    const [accumulatedScore, setAccumulatedScore] = useState<number>(submission.score || 0);

    // Active tab in the answer panel
    const [activeTab, setActiveTab] = useState("answer");

    // Tracking support attempts locally so the UI updates
    const [supportAttempts, setSupportAttempts] = useState<Record<string, number>>(() => {
        const initialAttempts: Record<string, number> = {};
        if (submission.answersList) {
            submission.answersList.forEach((ans: any) => {
                initialAttempts[ans.questionId] = ans.supportAttempts || 0;
            });
        }
        return initialAttempts;
    });

    // Tracking individual answer scores for the navigation buttons
    const [answerScores, setAnswerScores] = useState<Record<string, number>>(() => {
        const initialMap: Record<string, number> = {};
        if (submission.answersList) {
            submission.answersList.forEach((ans: any) => {
                initialMap[ans.questionId] = ans.score || 0;
            });
        }
        return initialMap;
    });

    const activeChipRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (activeChipRef.current) {
            activeChipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeQuestionIdx]);

    const answeredCount = useMemo(() => {
        return questions.filter((q: any) => !!answers[q.id]?.trim()).length;
    }, [questions, answers]);

    const pendingCount = Math.max(0, questions.length - answeredCount);
    const allAnswered = answeredCount === questions.length && questions.length > 0;

    const gradedQuestionsCount = useMemo(() => {
        return questions.filter((q: any) => {
            const qHistory = aiFeedbackMap[q.id] || [];
            const ansScore = answerScores[q.id];
            return (ansScore !== undefined && ansScore > 0) || qHistory.length > 0;
        }).length;
    }, [questions, aiFeedbackMap, answerScores]);

    const draftedQuestionsCount = useMemo(() => {
        return questions.filter((q: any) => {
            const hasAns = !!answers[q.id]?.trim();
            const qHistory = aiFeedbackMap[q.id] || [];
            const ansScore = answerScores[q.id];
            const isGraded = (ansScore !== undefined && ansScore > 0) || qHistory.length > 0;
            return hasAns && !isGraded;
        }).length;
    }, [questions, answers, aiFeedbackMap, answerScores]);

    const unansweredQuestionsCount = Math.max(0, questions.length - (gradedQuestionsCount + draftedQuestionsCount));
    const completionPercent = Math.round((answeredCount / (questions.length || 1)) * 100);

    const currentQuestionScore = useMemo(() => {
        if (!currentQuestion) return null;
        const qHistory = aiFeedbackMap[currentQuestion.id] || [];
        const maxAiScore = qHistory.length > 0 ? Math.max(...qHistory.map(h => h.score ?? 0)) : null;
        const ansScore = answerScores[currentQuestion.id];
        return isSubmitted && ansScore !== undefined ? ansScore : (ansScore !== undefined && ansScore > 0 ? ansScore : maxAiScore);
    }, [currentQuestion, aiFeedbackMap, answerScores, isSubmitted]);

    const timeEnd = new Date(attempt.endTime);
    const maxSupportAttempts = attempt.maxSupportAttempts ?? attempt.evaluation.maxSupportAttempts ?? 3;
    const aiSupportDelaySeconds = attempt.aiSupportDelaySeconds ?? attempt.evaluation.aiSupportDelaySeconds ?? 60;

    // Get the most recent requestedAt timestamp across all questions
    const latestGlobalRequestTime = useMemo(() => {
        let latest: string | null = null;
        let maxTime = 0;

        Object.values(aiFeedbackMap).forEach(history => {
            if (history && history.length > 0) {
                const lastEntry = history[history.length - 1];
                if (lastEntry?.requestedAt) {
                    const timeInt = new Date(lastEntry.requestedAt).getTime();
                    if (timeInt > maxTime) {
                        maxTime = timeInt;
                        latest = lastEntry.requestedAt;
                    }
                }
            }
        });

        return latest;
    }, [aiFeedbackMap]);

    // AI Evaluation Delay Timer
    useEffect(() => {
        const updateEvalTimer = () => {
            if (!latestGlobalRequestTime) {
                setEvalRemainingSeconds(0);
                return;
            }

            const requestedTime = new Date(latestGlobalRequestTime);
            const secondsSinceRequest = differenceInSeconds(new Date(), requestedTime);
            const remaining = Math.max(0, aiSupportDelaySeconds - secondsSinceRequest);

            setEvalRemainingSeconds(remaining);
        };

        updateEvalTimer(); // Intial call

        let intervalId: NodeJS.Timeout;
        if (evalRemainingSeconds > 0 || latestGlobalRequestTime) {
            intervalId = setInterval(updateEvalTimer, 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [latestGlobalRequestTime, aiSupportDelaySeconds]);

    // Countdown Timer
    const hasAutoSubmitted = useRef(false);

    useEffect(() => {
        // If already submitted, stop the timer and show a completed message
        if (isSubmitted) {
            setTimeLeftStr("Completada");
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date();
            const diffMs = timeEnd.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeLeftStr("00:00:00");
                if (!isSubmitted && !isSubmitting && !hasAutoSubmitted.current) {
                    hasAutoSubmitted.current = true;
                    // Llamamos handleFinish de forma automática simulando el click
                    handleFinish();
                }
                return;
            }

            const h = Math.floor(diffMs / (1000 * 60 * 60));
            const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diffMs % (1000 * 60)) / 1000);

            setTimeLeftStr(
                `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            );
        };

        calculateTimeLeft();
        const intv = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(intv);
    }, [timeEnd, isSubmitted, isSubmitting]);

    if (questions.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Card className="p-8 text-center max-w-md">
                    <h2 className="text-xl font-bold mb-2">Evaluación Vacía</h2>
                    <p className="text-muted-foreground mb-4">Esta evaluación aún no tiene preguntas configuradas.</p>
                    <Button onClick={() => router.push("/dashboard/student")}>Volver al Inicio</Button>
                </Card>
            </div>
        );
    }

    // Pantalla completa de inicio y validación de requisitos antes de comenzar
    if (!hasStarted && !isSubmitted && mounted) {
        const canStart = !surveillanceEnabled || (!isMobile && (!blockMultipleDisplays || !hasMultipleScreens) && (!requireFullscreen || isMaximized));
        const startTime = attempt.startTime ? new Date(attempt.startTime) : null;
        const endTime = attempt.endTime ? new Date(attempt.endTime) : null;

        return (
            <div className="fixed inset-0 z-50 bg-background overflow-y-auto flex flex-col min-h-screen text-foreground">
                {/* Header Superior Coherente con SmartClass */}
                <header className="border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-xs font-semibold h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations`)}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver al Curso</span>
                        </Button>
                        <div className="h-4 w-px bg-border/60 hidden sm:block" />
                        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                            SmartClass • Módulo de Evaluaciones
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeSelector themes={themes} />
                        <ModeToggle />
                    </div>
                </header>

                {/* Contenedor Principal que ocupa todo el espacio */}
                <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

                    {/* Banner Hero Principal */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2.5 max-w-4xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {surveillanceEnabled ? (
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-xs font-bold gap-1 px-2.5 py-0.5">
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            Vigilancia Activa
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-xs font-bold gap-1 px-2.5 py-0.5">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Modo Libre
                                        </Badge>
                                    )}

                                    {blockTabSwitch && (
                                        <Badge variant="destructive" className="text-xs font-bold gap-1 px-2.5 py-0.5 shadow-2xs">
                                            <Zap className="w-3 h-3" />
                                            Expulsión Inmediata por Pérdida de Foco
                                        </Badge>
                                    )}

                                    {blockTabSwitch && (
                                        <Badge variant="outline" className={cn(
                                            "text-xs font-bold font-mono gap-1 px-2.5 py-0.5",
                                            expulsionsCount > 0 
                                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" 
                                                : "bg-muted text-muted-foreground border-border/50"
                                        )}>
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                            <span>{expulsionsCount} {expulsionsCount === 1 ? 'Expulsión acumulada' : 'Expulsiones acumuladas'}</span>
                                        </Badge>
                                    )}

                                    <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                                        {questions.length} {questions.length === 1 ? 'Pregunta' : 'Preguntas'}
                                    </Badge>
                                </div>

                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                                    {attempt.evaluation.title}
                                </h1>

                                {attempt.evaluation.description && (
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed [&_p]:text-muted-foreground [&_strong]:text-foreground [&_p]:my-1"
                                        data-color-mode={mounted && theme === "dark" ? "dark" : "light"}
                                    >
                                        <MDEditor.Markdown
                                            source={attempt.evaluation.description}
                                            style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tiempos de Entrega */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                            {startTime && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    <span>Inicio: <strong className="text-foreground">{format(startTime, "d 'de' MMMM, p", { locale: es })}</strong></span>
                                </div>
                            )}
                            {endTime && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Cierre: <strong className="text-foreground">{format(endTime, "d 'de' MMMM, p", { locale: es })}</strong></span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Guardado: <strong className="text-foreground">Automático en la nube</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Banner Destacado si tiene expulsiones previas por pérdida de foco */}
                    {blockTabSwitch && expulsionsCount > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 flex items-start gap-4 shadow-2xs">
                            <ShieldAlert className="w-6 h-6 shrink-0 text-red-500 mt-0.5" />
                            <div className="flex-1 space-y-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="font-bold text-sm sm:text-base">
                                        Registro de Seguridad: Has sido expulsado {expulsionsCount} {expulsionsCount === 1 ? 'vez' : 'veces'} de esta evaluación
                                    </h3>
                                    <Badge variant="outline" className="font-mono text-xs font-black bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30">
                                        {expulsionsCount} {expulsionsCount === 1 ? 'expulsión previa' : 'expulsiones previas'}
                                    </Badge>
                                </div>
                                <p className="text-xs leading-relaxed opacity-95">
                                    La restricción de pérdida de foco está activa. Cada vez que cambias de pestaña, sales de la ventana del navegador o una aplicación en segundo plano toma el foco, la prueba se cierra de inmediato y se suma una nueva falta ante tu profesor. Lee atentamente la guía de recomendaciones para evitar expulsiones involuntarias.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cuadrícula Principal de 3 Columnas utilizando todo el ancho */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Columna 1: Configuración de la Evaluación (4 cols) */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                                <CardHeader className="pb-3 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-sm font-bold">Parámetros de la Evaluación</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Reglas configuradas para esta prueba
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3 flex-1 text-xs">
                                    {/* Pérdida de foco */}
                                    <div className={cn(
                                        "p-3 rounded-xl border flex items-start gap-3",
                                        blockTabSwitch ? "bg-red-500/5 border-red-500/25" : "bg-muted/40 border-border/60"
                                    )}>
                                        <ShieldAlert className={cn("w-4 h-4 shrink-0 mt-0.5", blockTabSwitch ? "text-red-500" : "text-muted-foreground")} />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Control de Foco</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", blockTabSwitch ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" : "bg-muted text-muted-foreground")}>
                                                    {blockTabSwitch ? "Estricto" : "Libre"}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                {blockTabSwitch
                                                    ? "Prohibido cambiar de pestaña o ventana. Provoca expulsión inmediata sin advertencias."
                                                    : "Puedes cambiar de pestaña sin que se cierre tu prueba."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tamaño de ventana */}
                                    <div className={cn(
                                        "p-3 rounded-xl border flex items-start gap-3",
                                        requireFullscreen ? "bg-amber-500/5 border-amber-500/25" : "bg-muted/40 border-border/60"
                                    )}>
                                        <Maximize2 className={cn("w-4 h-4 shrink-0 mt-0.5", requireFullscreen ? "text-amber-500" : "text-muted-foreground")} />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Ventana Maximizada</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", requireFullscreen ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground")}>
                                                    {requireFullscreen ? "Obligatorio" : "Flexible"}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                {requireFullscreen
                                                    ? "La ventana debe permanecer maximizada durante todo el examen."
                                                    : "Puedes ajustar las dimensiones del navegador según tu preferencia."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Múltiples monitores */}
                                    <div className={cn(
                                        "p-3 rounded-xl border flex items-start gap-3",
                                        blockMultipleDisplays ? "bg-blue-500/5 border-blue-500/25" : "bg-muted/40 border-border/60"
                                    )}>
                                        <Monitor className={cn("w-4 h-4 shrink-0 mt-0.5", blockMultipleDisplays ? "text-blue-500" : "text-muted-foreground")} />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Pantallas Conectadas</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", blockMultipleDisplays ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" : "bg-muted text-muted-foreground")}>
                                                    {blockMultipleDisplays ? "1 Monitor" : "Múltiples"}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                {blockMultipleDisplays
                                                    ? "Solo se permite una pantalla conectada al equipo."
                                                    : "Puedes usar pantallas secundarias o externas."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Portapapeles */}
                                    <div className="p-3 rounded-xl border bg-muted/40 border-border/60 flex items-start gap-3">
                                        <CopySlash className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-foreground">Portapapeles</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", blockClipboard ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground")}>
                                                    {blockClipboard ? "Bloqueado" : "Habilitado"}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                {blockClipboard
                                                    ? "Copiar, pegar, cortar y menú contextual deshabilitados."
                                                    : "Acceso libre al portapapeles."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Material de ayuda y comodines */}
                                    {hasHelpUrl && (
                                        <div className="p-3 rounded-xl border bg-primary/5 border-primary/25 flex items-start gap-3">
                                            <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-foreground">Material de Consulta</span>
                                                    <Badge className="bg-primary/15 text-primary text-[10px] px-1.5 py-0">Permitido</Badge>
                                                </div>
                                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                    El profesor habilitó material de apoyo. Puedes consultarlo dentro del examen sin penalización.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {maxAiHints > 0 && (
                                        <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/25 flex items-start gap-3">
                                            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-foreground">Pistas con IA</span>
                                                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0 font-bold">{maxAiHints} Pistas</Badge>
                                                </div>
                                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                                    Dispones de {maxAiHints} consultas conceptuales asistidas por IA para desbloquearte.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Columna 2: Sugerencias Cruciales Anti-Interrupción (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                                <CardHeader className="pb-3 border-b border-border/50">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <BellOff className="w-4 h-4 text-red-500" />
                                            <CardTitle className="text-sm font-bold">Guía Anti-Interrupciones</CardTitle>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-bold text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10">
                                            Importante
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Evita que notificaciones del sistema o aplicaciones externas provoquen tu expulsión
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3.5 flex-1 text-xs">
                                    {/* Sugerencia 1: Notificaciones del Sistema Operativo */}
                                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span>1. Desactiva las Notificaciones del Sistema Operativo</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            Un cartel emergente de correo, calendario o antivirus roba el foco de la ventana activa del navegador.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                                            <div className="p-2 rounded-lg bg-background border border-border/60">
                                                <span className="font-bold text-primary block mb-0.5">En Windows:</span>
                                                <span className="text-muted-foreground">Presiona <strong>Win + N</strong> y activa el modo <strong>No molestar</strong> o Asistente de concentración.</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-background border border-border/60">
                                                <span className="font-bold text-primary block mb-0.5">En macOS:</span>
                                                <span className="text-muted-foreground">Abre el <strong>Centro de Control</strong> arriba a la derecha y activa <strong>No molestar (Focus)</strong>.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sugerencia 2: Apps en segundo plano */}
                                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span>2. Cierra Mensajería y Apps en Segundo Plano</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            Cierra completamente <strong>WhatsApp, Telegram, Discord, Teams, Slack, Outlook o Skype</strong>. Una llamada entrante o mensaje con notificación flotante desenfoca el navegador y genera expulsión inmediata.
                                        </p>
                                    </div>

                                    {/* Sugerencia 3: Atajos de teclado */}
                                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            <Keyboard className="w-4 h-4 text-purple-500 shrink-0" />
                                            <span>3. Evita Atajos de Teclado del Sistema</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            No presiones <strong>Alt + Tab</strong>, la tecla <strong>Windows / Command</strong>, ni combinaciones como <strong>Ctrl + Esc</strong> o <strong>Win + D</strong> que abran el menú de inicio o la barra de tareas.
                                        </p>
                                    </div>

                                    {/* Sugerencia 4: Gestos del touchpad */}
                                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                            <Laptop className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span>4. Cuidado con Gestos en Computadores Portátiles</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            Si usas laptop, evita deslizar con 3 o 4 dedos en el touchpad para no alternar de escritorio virtual ni minimizar la pantalla sin querer.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Columna 3: Estado de tus Requisitos (3 cols) */}
                        <div className="lg:col-span-3 flex flex-col gap-4">
                            <Card className="flex-1 border-border/80 shadow-xs flex flex-col">
                                <CardHeader className="pb-3 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        <CardTitle className="text-sm font-bold">Verificación en Vivo</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Estado de tu equipo y navegador
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3 flex-1 text-xs">
                                    {/* Dispositivo compatible */}
                                    <div className={cn(
                                        "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                        !isMobile ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            <Laptop className="w-4 h-4 shrink-0" />
                                            <span className="font-semibold">Dispositivo</span>
                                        </div>
                                        <span className="font-bold text-[11px]">
                                            {!isMobile ? "Compatible ✓" : "Móvil detectado ✕"}
                                        </span>
                                    </div>

                                    {/* Pantalla única */}
                                    {blockMultipleDisplays && (
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                            !hasMultipleScreens ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-500/25 text-red-700 dark:text-red-300"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <Monitor className="w-4 h-4 shrink-0" />
                                                <span className="font-semibold">Monitores</span>
                                            </div>
                                            <span className="font-bold text-[11px]">
                                                {!hasMultipleScreens ? "1 Monitor ✓" : "Desconecta el 2do ✕"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Ventana maximizada */}
                                    {requireFullscreen && (
                                        <div className={cn(
                                            "p-2.5 rounded-xl border flex items-center justify-between gap-2",
                                            isMaximized ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <Maximize2 className="w-4 h-4 shrink-0" />
                                                <span className="font-semibold">Ventana</span>
                                            </div>
                                            <span className="font-bold text-[11px]">
                                                {isMaximized ? "Maximizada ✓" : "Maximizar ⚠️"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Conexión */}
                                    <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <span className="font-semibold">Conexión</span>
                                        </div>
                                        <span className="font-bold text-[11px]">En línea ✓</span>
                                    </div>

                                    {/* Estado global */}
                                    <div className={cn(
                                        "p-3 rounded-xl border mt-2 text-center",
                                        canStart 
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300" 
                                            : "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300"
                                    )}>
                                        <p className="font-bold text-xs">
                                            {canStart ? "Entorno Validado ✓" : "Requisitos Incompletos"}
                                        </p>
                                        <p className="text-[10px] opacity-80 mt-0.5">
                                            {canStart ? "Puedes comenzar la evaluación" : "Ajusta tu entorno para continuar"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </div>

                </main>

                {/* Footer Barra de Acción Pegajosa Inferior */}
                <footer className="border-t border-border/70 bg-card/95 backdrop-blur sticky bottom-0 z-30 p-4 px-4 sm:px-8 shadow-lg">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs">
                            {canStart ? (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Todos los requisitos cumplidos. Estás listo para comenzar.
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                    <AlertTriangle className="w-4 h-4" />
                                    Por favor cumple los requisitos de la columna de verificación para poder comenzar.
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                className="flex-1 sm:flex-none text-xs font-semibold h-10 cursor-pointer"
                                onClick={() => router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations`)}
                            >
                                Volver al Curso
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1 sm:flex-none font-bold text-sm h-10 cursor-pointer gap-2 shadow-sm"
                                disabled={!canStart}
                                onClick={() => setHasStarted(true)}
                            >
                                {canStart ? (
                                    <>
                                        <span>Acepto las normas — Comenzar Evaluación</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                ) : (
                                    <span>Requisitos pendientes para iniciar</span>
                                )}
                            </Button>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    const handleQuestionSelect = (idx: number) => {
        // Guardar la respuesta actual (código o texto) antes de navegar
        if (currentQuestion?.id) {
            const currentVal = editorRef.current && currentQuestion.type === "Code"
                ? editorRef.current.getValue()
                : answers[currentQuestion.id];
            if (currentVal !== undefined) {
                saveAnswerAction(submission.id, currentQuestion.id, currentVal || "");
            }
        }
        setActiveQuestionIdx(idx);
        setActiveTab("answer"); // Reset tab
    };

    const handleAnswerChange = (val: string) => {
        answersRef.current[currentQuestion.id] = val;
        setAnswers(prev => {
            if (prev[currentQuestion.id] === val) return prev;
            return {
                ...prev,
                [currentQuestion.id]: val
            };
        });
    };

    const handleSaveCurrent = async (notify: boolean | React.SyntheticEvent = false) => {
        setIsSaving(true);
        if (currentQuestion?.id) {
            const val = editorRef.current && currentQuestion.type === "Code"
                ? editorRef.current.getValue()
                : answers[currentQuestion.id];
            if (val !== undefined && val !== null) {
                await saveAnswerAction(submission.id, currentQuestion.id, val || "");
                if (notify === true) {
                    toast.success("Borrador guardado", {
                        description: "Tu respuesta se ha sincronizado correctamente.",
                        duration: 2500,
                    });
                }
            }
        }
        setIsSaving(false);
    };

    const handleFinish = async () => {
        setShowFinishConfirm(false);
        setIsSubmitting(true);
        await handleSaveCurrent();
        await submitEvaluationAction(submission.id);
        router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations`);
    };

    const handleAskAI = async () => {
        const currentAns = (editorRef.current && currentQuestion.type === "Code")
            ? editorRef.current.getValue()
            : (answers[currentQuestion.id] || "");

        if (!currentAns?.trim()) {
            toast.warning("Respuesta Vacía", {
                description: "Debes escribir alguna respuesta antes de pedirle a la IA que la evalúe.",
            });
            return;
        }

        const toastId = toast.loading("Evaluando respuesta con IA...", {
            description: "Analizando criterios pedagógicos y precisión técnica...",
        });

        setIsEvaluatingAI(true);
        try {
            const res = await evaluateAnswerWithAIAction(
                submission.id,
                currentQuestion.id,
                currentAns
            );

            setAiFeedbackMap(prev => {
                const currentHistory = prev[currentQuestion.id] || [];
                return {
                    ...prev,
                    [currentQuestion.id]: [
                        ...currentHistory,
                        {
                            attempt: currentHistory.length + 1,
                            feedback: res.feedback,
                            score: res.scoreContribution,
                            isCorrect: res.isCorrect,
                            requestedAt: res.requestedAt
                        }
                    ]
                };
            });
            if (res.accumulatedScore !== undefined) {
                setAccumulatedScore(res.accumulatedScore);
            }
            // Update individual answer score
            if (res.scoreContribution !== undefined) {
                setAnswerScores(prev => ({
                    ...prev,
                    [currentQuestion.id]: res.scoreContribution
                }));
            }
            // Automatically switch to the "feedback" tab
            setActiveTab("feedback");

            setSupportAttempts(prev => ({
                ...prev,
                [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1
            }));

            toast.success(`Evaluación completada • Nota: ${res.scoreContribution.toFixed(1)} / 5.0`, {
                id: toastId,
                description: res.attemptsRemaining === 0
                    ? "Has agotado las solicitudes a la IA para esta pregunta."
                    : `Te quedan ${res.attemptsRemaining} intento(s) de mejora.`,
            });
        } catch (error: any) {
            toast.error("Error al evaluar con IA", {
                id: toastId,
                description: error.message || "No se pudo consultar a la IA. Inténtalo de nuevo.",
            });
        } finally {
            setIsEvaluatingAI(false);
        }
    };

    const currentAttempts = supportAttempts[currentQuestion.id] || 0;
    const canAskAI = currentAttempts < maxSupportAttempts && evalRemainingSeconds === 0;

    // Wildcard Handlers
    const handleUseAiHint = async () => {
        setShowHintConfirm(false);
        setIsUsingHint(true);
        const toastId = toast.loading("Obteniendo pista de IA...");
        try {
            const res = await useAiHintAction(submission.id, currentQuestion.id, answers[currentQuestion.id] || "");
            setAiHintsUsed(prev => prev + 1);
            toast.info("💡 Pista de la IA", {
                id: toastId,
                description: res.hint,
                duration: 12000,
            });
        } catch (error: any) {
            toast.error("Error al obtener pista", {
                id: toastId,
                description: error.message || "No se pudo generar la pista.",
            });
        } finally {
            setIsUsingHint(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Minimal Header with theme consistency */}
            <header className="shrink-0 flex items-center justify-between px-4 border-b border-border bg-card text-card-foreground z-50 h-12 shadow-none">
                <div className="flex items-center gap-2">
                    {/* Timer */}
                    {!isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 h-8 rounded-lg border cursor-default shadow-2xs transition-all",
                                    timeLeftStr.startsWith("00:0")
                                        ? "bg-destructive/15 text-destructive border-destructive/40 font-black animate-pulse"
                                        : "bg-muted/50 text-foreground border-border/60 hover:bg-muted/80"
                                )}>
                                    <Clock className={cn(
                                        "w-3.5 h-3.5",
                                        timeLeftStr.startsWith("00:0") ? "text-destructive animate-pulse" : "text-muted-foreground"
                                    )} />
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-0.5 hidden sm:inline">Tiempo:</span>
                                    <span className={cn(
                                        "text-xs font-mono font-bold tracking-wider",
                                        timeLeftStr.startsWith("00:0") ? "text-destructive font-black" : "text-foreground"
                                    )}>
                                        {timeLeftStr === "Completada" ? "✓" : timeLeftStr || "..."}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>Tiempo restante de la evaluación</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Calificación Actual */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setShowOverviewModal(true)}
                                className="flex items-center gap-1.5 px-3 h-8 bg-primary/10 text-primary rounded-lg border border-primary/30 font-bold cursor-pointer shadow-2xs hover:bg-primary/20 transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/25 shrink-0" />
                                <span className="text-[10px] uppercase font-bold text-primary/80 mr-0.5 hidden sm:inline">Nota:</span>
                                <span className="text-xs font-black">{accumulatedScore.toFixed(1)}</span>
                                <span className="text-[10px] font-semibold text-primary/60">/ 5.0</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Calificación actual: {accumulatedScore.toFixed(1)} / 5.0 (clic para ver panorámica)</TooltipContent>
                    </Tooltip>

                    {/* Indicador de Vigilancia Estricta y Expulsiones */}
                    {surveillanceEnabled && !isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs",
                                    expulsionsCount > 0 
                                        ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" 
                                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                )}>
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] uppercase font-bold hidden sm:inline">Vigilancia Estricta</span>
                                    {blockTabSwitch && (
                                        <span className="flex items-center gap-1 ml-1 pl-1.5 border-l border-red-500/30 text-[11px] font-mono font-bold">
                                            <span className="text-[10px] uppercase font-semibold opacity-80 hidden md:inline">Expulsiones:</span>
                                            <span className={cn(
                                                "px-1.5 py-0.2 rounded font-black",
                                                expulsionsCount > 0 ? "bg-red-600 text-white" : "text-foreground"
                                            )}>{expulsionsCount}</span>
                                        </span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {blockTabSwitch 
                                    ? `Vigilancia de foco activa. Veces expulsado: ${expulsionsCount}. Salir o perder el foco provocará expulsión inmediata.`
                                    : "Vigilancia estricta activa: salir de la pantalla, cambiar de ventana o perder el foco provocará tu expulsión inmediata del examen."}
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {blockTabSwitch && isSubmitted && (
                        <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold bg-muted/50 border-border/50 text-muted-foreground">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-[10px] uppercase">Expulsiones:</span>
                            <span className="font-mono font-black text-foreground">{expulsionsCount}</span>
                        </div>
                    )}

                    {/* Wildcard Buttons */}
                    {!isSubmitted && maxAiHints > 0 && (
                        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border/50">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setShowHintConfirm(true)}
                                        disabled={aiHintsUsed >= maxAiHints || isUsingHint}
                                        className={cn(
                                            "group flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                                            aiHintsUsed >= maxAiHints
                                                ? "bg-muted/60 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                                        )}
                                    >
                                        {isUsingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                                            aiHintsUsed >= maxAiHints ? "bg-muted text-muted-foreground" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                        )}>
                                            {maxAiHints - aiHintsUsed}
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>💡 Pista de IA — Obtén una orientación sin revelar la respuesta ({maxAiHints - aiHintsUsed} disponibles)</TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    {hasHelpUrl && !isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant={isHelpMode ? "default" : "outline"}
                                    className={cn(
                                        "h-8 text-xs px-3 rounded-lg flex items-center gap-1.5 transition-all font-semibold cursor-pointer shadow-2xs",
                                        isHelpMode
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground border border-primary shadow-xs"
                                            : "border-border/70 bg-card text-foreground hover:bg-muted dark:border-border dark:text-foreground"
                                    )}
                                    onClick={() => setIsHelpMode(!isHelpMode)}
                                >
                                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                    <span className="hidden sm:inline">
                                        {isHelpMode ? "Volver a la evaluación" : "Material de Ayuda"}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isHelpMode ? "Volver a la evaluación" : "Abrir material de ayuda del profesor"}</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Zoom Controls */}
                    <div className="flex items-center h-8 bg-muted/50 px-1 rounded-lg border border-border/60 gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
                            title="Disminuir texto"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-xs font-mono font-bold w-9 text-center text-foreground">{Math.round(zoomLevel * 100)}%</span>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.1))}
                            title="Aumentar texto"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Controles de Tema y Modo Claro/Oscuro */}
                    <div className="flex items-center h-8 bg-muted/50 px-0.5 rounded-lg border border-border/60 gap-0.5">
                        <ThemeSelector themes={themes} className="h-7 w-7 rounded-md" />
                        <CodeThemeSelector className="h-7 w-7 rounded-md" />
                        <ModeToggle className="h-7 w-7 rounded-md" />
                    </div>

                    {!isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                        "h-8 text-xs px-3 rounded-lg font-semibold transition-all cursor-pointer border shadow-2xs gap-1.5",
                                        allAnswered
                                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500"
                                            : "border-border/70 bg-card hover:bg-destructive/10 text-foreground hover:text-destructive hover:border-destructive/40"
                                    )}
                                    onClick={() => {
                                        setFinishConfirmText("");
                                        setShowFinishConfirm(true);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <Send className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                    <span>{isSubmitting ? "Enviando..." : "Terminar Evaluación"}</span>
                                    {!allAnswered && pendingCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/50">
                                            {pendingCount} pend.
                                        </span>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs max-w-[240px]">
                                {allAnswered
                                    ? "✓ Has respondido todas las preguntas. Listo para enviar."
                                    : `⚠️ Tienes ${pendingCount} pregunta(s) sin responder de ${questions.length}.`}
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {isSubmitted && (
                        <>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full border border-green-500/20 font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="text-xs">Evaluación Enviada</span>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs px-3 font-semibold cursor-pointer"
                                onClick={() => router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations`)}
                            >
                                <LogOut className="w-3.5 h-3.5 mr-1" />
                                Salir de Vista Previa
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Help View overlay iframe (keeps loaded in background) */}
            {hasHelpUrl && (
                <div className={`flex-1 w-full bg-background overflow-hidden z-40 ${isHelpMode ? 'block' : 'hidden'}`}>
                    <iframe
                        src={effectiveHelpUrl}
                        className="w-full h-full border-0"
                        title="Material de Ayuda"
                    />
                </div>
            )}

            {/* Main Workspace */}
            <div className={`flex flex-col flex-1 overflow-hidden z-10 ${isHelpMode ? 'hidden' : 'flex'}`}>

                {/* Mapa Visual de Preguntas (Chips de Estado y Calificación) */}
                <div className="w-full bg-card/70 backdrop-blur-xs border-b border-border px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 shrink-0 select-none">
                    {/* Indicador / Resumen */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <ListChecks className="w-4 h-4 text-primary shrink-0" />
                            <span className="hidden sm:inline">Mapa de Preguntas</span>
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                            {answeredCount}/{questions.length} respondidas
                        </span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-semibold gap-1.5 text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 hover:text-primary rounded-md cursor-pointer shadow-2xs"
                                    onClick={() => setShowOverviewModal(true)}
                                >
                                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                                    <span className="hidden md:inline">Panorámica</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver vista panorámica completa del estado de la evaluación</TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Fila desplazable de Chips */}
                    <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1.5 py-1 px-1">
                        {questions.map((q: any, idx: number) => {
                            const isCurrent = idx === activeQuestionIdx;
                            const isAnswered = !!answers[q.id]?.trim();
                            const qHistory = aiFeedbackMap[q.id] || [];
                            const maxAiScore = qHistory.length > 0 ? Math.max(...qHistory.map(h => h.score ?? 0)) : null;
                            const ansScore = answerScores[q.id];
                            const score = isSubmitted && ansScore !== undefined ? ansScore : (ansScore !== undefined && ansScore > 0 ? ansScore : maxAiScore);
                            const hasScore = score !== null && score !== undefined;

                            return (
                                <Tooltip key={q.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            ref={isCurrent ? activeChipRef : null}
                                            type="button"
                                            onClick={() => handleQuestionSelect(idx)}
                                            className={cn(
                                                "group relative flex items-center gap-1.5 px-2.5 h-[30px] rounded-lg text-xs transition-colors cursor-pointer shrink-0 select-none font-medium",
                                                isCurrent
                                                    ? "border-2 border-primary bg-primary/20 text-primary font-bold shadow-xs"
                                                    : hasScore
                                                        ? "border border-border/70 bg-card hover:bg-muted/80 text-foreground"
                                                        : isAnswered
                                                            ? "border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-foreground"
                                                            : "border border-border/40 bg-muted/25 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[11px] transition-colors",
                                                isCurrent ? "text-primary font-black" : "text-foreground font-semibold"
                                            )}>
                                                P{idx + 1}
                                            </span>

                                            {hasScore ? (
                                                <span className={cn(
                                                    "text-[10px] font-black px-1.5 py-0.5 rounded border leading-none tracking-tight",
                                                    getScoreColorClass(score)
                                                )}>
                                                    {score.toFixed(1)}
                                                </span>
                                            ) : isAnswered ? (
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isCurrent ? "bg-primary" : "bg-sky-500 shadow-xs shadow-sky-500/50"
                                                )} />
                                            ) : null}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                                        <p className="font-bold">Pregunta {idx + 1} ({q.type === 'Text' ? 'Texto' : 'Código'})</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {hasScore
                                                ? `Nota obtenida: ${score.toFixed(1)} / 5.0`
                                                : isAnswered
                                                    ? "Respuesta redactada (sin evaluar con IA)"
                                                    : "Pendiente por responder"}
                                        </p>
                                        {qHistory.length > 0 && (
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                {qHistory.length} intento(s) de IA usados
                                            </p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>

                    {/* Navegación Rápida */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            disabled={activeQuestionIdx === 0}
                            onClick={() => handleQuestionSelect(activeQuestionIdx - 1)}
                            title="Pregunta anterior"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                            <span className="hidden md:inline">Atrás</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            disabled={activeQuestionIdx === questions.length - 1}
                            onClick={() => handleQuestionSelect(activeQuestionIdx + 1)}
                            title="Siguiente pregunta"
                        >
                            <span className="hidden md:inline">Adelante</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                    </div>
                </div>

                {/* Main Split Panels */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel: Question Statement */}
                    <div className="w-1/2 flex flex-col border-r border-border bg-card/30 h-full">
                        {/* Barra superior de la pregunta */}
                        <div className="px-4 py-1.5 border-b border-border shrink-0 bg-muted/20 flex items-center justify-between gap-3 h-[49px]">
                            {/* Izquierda: Nombre de la Evaluación, Pregunta y Nota */}
                            <div className="flex flex-col justify-center min-w-0">
                                {attempt.evaluation?.title && (
                                    <span className="text-[11px] font-medium text-muted-foreground truncate leading-tight" title={attempt.evaluation.title}>
                                        {attempt.evaluation.title}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-bold text-sm text-foreground tracking-tight whitespace-nowrap">
                                        Pregunta {activeQuestionIdx + 1} de {questions.length}
                                    </span>
                                    {currentQuestionScore !== null && (
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 shadow-2xs shrink-0",
                                            getScoreColorClass(currentQuestionScore)
                                        )}>
                                            <Sparkles className="w-2.5 h-2.5" />
                                            <span>Nota: {currentQuestionScore.toFixed(1)} / 5.0</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Derecha: Tipo de Pregunta */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] uppercase font-bold px-2.5 py-1 bg-muted rounded-md tracking-wider text-muted-foreground border border-border">
                                    {currentQuestion.type === 'Text' ? 'TEXTO' : 'CÓDIGO'}
                                </span>
                            </div>
                        </div>

                    {/* Question Statement (Markdown) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-color-mode={mounted && theme === "dark" ? "dark" : "light"}>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none transition-all duration-200 text-foreground"
                            style={{ fontSize: `${14 * zoomLevel}px` }}
                            onCopy={(e) => { if (!isSubmitted) e.preventDefault(); }}
                            onCut={(e) => { if (!isSubmitted) e.preventDefault(); }}
                            onContextMenu={(e) => { if (!isSubmitted) e.preventDefault(); }}
                        >
                            <MDEditor.Markdown
                                source={currentQuestion.text || ""}
                                style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Student Answer Area */}
                <div className="w-1/2 flex flex-col h-full bg-card">
                    <Tabs defaultValue="answer" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-border shrink-0 bg-muted/20 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <TabsList className="h-8">
                                    <TabsTrigger value="answer" className="text-xs px-3">Tu Respuesta</TabsTrigger>
                                    <TabsTrigger value="feedback" className="text-xs px-3" disabled={!hasAI}>Feedback IA</TabsTrigger>
                                </TabsList>
                                <div className="flex gap-2 items-center">
                                    {currentQuestion.type === "Code" && currentQuestion.language && (
                                        <span className="text-[10px] text-muted-foreground font-mono bg-background border px-2 py-0.5 rounded">
                                            {currentQuestion.language}
                                        </span>
                                    )}
                                    {currentQuestion.type === "Text" && (
                                        <span className="text-[10px] text-muted-foreground">Texto Libre</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {/* Answer Tab */}
                            <TabsContent value="answer" className="h-full m-0 data-[state=inactive]:hidden">
                                {currentQuestion.type === "Target" || currentQuestion.type === "Text" ? (
                                    <Textarea
                                        className="w-full h-full min-h-full resize-none font-medium leading-relaxed bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4 rounded-none shadow-none transition-all duration-200"
                                        style={{ fontSize: `${16 * zoomLevel}px` }}
                                        placeholder={isSubmitted ? "No hubo respuesta provista." : "Escribe tu respuesta detallada aquí..."}
                                        value={answers[currentQuestion.id] || ""}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        onBlur={handleSaveCurrent}
                                        disabled={isSubmitted}
                                        readOnly={isSubmitted}
                                        spellCheck={true}
                                        lang="es"
                                        autoComplete="on"
                                        autoCorrect="on"
                                        onPaste={(e) => { 
                                            if (!isSubmitted && blockClipboard) {
                                                const pasted = e.clipboardData?.getData('text/plain') || '';
                                                const isInternal = internalCodeClipboardRef.current && (
                                                    pasted === internalCodeClipboardRef.current ||
                                                    internalCodeClipboardRef.current.includes(pasted)
                                                );
                                                if (!isInternal) {
                                                    e.preventDefault();
                                                    toast.warning("Acción restringida", { description: "Pegar texto externo está deshabilitado en esta evaluación." });
                                                }
                                            }
                                        }}
                                        onDrop={(e) => {
                                            if (!isSubmitted) {
                                                e.preventDefault();
                                                toast.warning("Acción restringida", { description: "Arrastrar y soltar contenido está deshabilitado." });
                                            }
                                        }}
                                    />
                                ) : (
                                    <Editor
                                        key={currentQuestion.id}
                                        height="100%"
                                        width="100%"
                                        language={currentQuestion.language === "arduino" ? "cpp" : (currentQuestion.language || "javascript")}
                                        theme={mounted && theme === "dark" ? "vs-dark" : "light"}
                                        defaultValue={answers[currentQuestion.id] || ""}
                                        onChange={(value) => handleAnswerChange(value || "")}
                                        options={{
                                            fontSize: 14 * zoomLevel,
                                            minimap: { enabled: false },
                                            lineNumbers: "on",
                                            scrollBeyondLastLine: false,
                                            wordWrap: "on",
                                            fontFamily: "'Fira Code', 'Monaco', 'Cascadia Code', monospace",
                                            fontWeight: "500",
                                            padding: { top: 16, bottom: 16 },
                                            readOnly: isSubmitted,
                                            contextmenu: true,
                                            copyWithSyntaxHighlighting: false,
                                            automaticLayout: true,
                                            accessibilitySupport: "off",
                                            unicodeHighlight: { ambiguousCharacters: false },
                                            acceptSuggestionOnEnter: "off",
                                            tabCompletion: "off",
                                            quickSuggestions: {
                                                other: true,
                                                comments: false,
                                                strings: true
                                            },
                                            suggestOnTriggerCharacters: true,
                                            wordBasedSuggestions: "currentDocument",
                                            dragAndDrop: false,
                                            formatOnPaste: false,
                                        }}
                                        onMount={(editor, monaco) => {
                                            editorRef.current = editor;

                                            // Helper para registrar autocompletado de palabras clave pedagógicas una sola vez
                                            if (!monacoCompletionsRegistered) {
                                                monacoCompletionsRegistered = true;
                                                const registerCompletions = (langId: string, keywords: string[], builtins: string[]) => {
                                                    monaco.languages.registerCompletionItemProvider(langId, {
                                                        provideCompletionItems: (model: any, position: any) => {
                                                            const word = model.getWordUntilPosition(position);
                                                            const range = {
                                                                startLineNumber: position.lineNumber,
                                                                endLineNumber: position.lineNumber,
                                                                startColumn: word.startColumn,
                                                                endColumn: word.endColumn
                                                            };
                                                            const suggestions = [
                                                                ...keywords.map((kw: string) => ({
                                                                    label: kw,
                                                                    kind: monaco.languages.CompletionItemKind.Keyword,
                                                                    insertText: kw,
                                                                    range: range
                                                                })),
                                                                ...builtins.map((bi: string) => ({
                                                                    label: bi,
                                                                    kind: monaco.languages.CompletionItemKind.Function,
                                                                    insertText: bi,
                                                                    range: range
                                                                }))
                                                            ];
                                                            return { suggestions };
                                                        }
                                                    });
                                                };

                                                // Python
                                                registerCompletions('python',
                                                    ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'pass', 'break', 'continue', 'and', 'or', 'not', 'is', 'in', 'None', 'True', 'False'],
                                                    ['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'enumerate', 'zip', 'map', 'filter', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'any', 'all', 'input', 'open', 'type', 'isinstance', 'help']
                                                );

                                                // Arduino / C++
                                                registerCompletions('cpp',
                                                    ['void', 'int', 'float', 'double', 'char', 'long', 'unsigned', 'const', 'static', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'class', 'public', 'private', 'protected', 'virtual', 'override', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false'],
                                                    ['setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'millis', 'micros', 'Serial.begin', 'Serial.print', 'Serial.println', 'Serial.available', 'Serial.read', 'attachInterrupt', 'detachInterrupt', 'bitRead', 'bitWrite', 'abs', 'min', 'max', 'map', 'constrain']
                                                );

                                                // Java
                                                registerCompletions('java',
                                                    ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'new', 'this', 'super', 'import', 'package', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'instanceof', 'void', 'int', 'boolean', 'double', 'float', 'long', 'char', 'byte', 'short', 'true', 'false', 'null'],
                                                    ['System.out.println', 'System.out.print', 'Scanner', 'ArrayList', 'HashMap', 'String.valueOf', 'Integer.parseInt', 'Math.max', 'Math.min', 'Math.sqrt', 'Math.pow']
                                                );

                                                // C#
                                                registerCompletions('csharp',
                                                    ['using', 'namespace', 'class', 'public', 'private', 'protected', 'internal', 'static', 'void', 'int', 'string', 'bool', 'double', 'float', 'long', 'char', 'decimal', 'var', 'new', 'this', 'return', 'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'task', 'true', 'false', 'null'],
                                                    ['Console.WriteLine', 'Console.ReadLine', 'List', 'Dictionary', 'Math.Max', 'Math.Min', 'String.Format', 'int.Parse', 'double.Parse']
                                                );

                                                // PHP
                                                registerCompletions('php',
                                                    ['echo', 'print', 'if', 'else', 'elseif', 'foreach', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'function', 'class', 'public', 'private', 'protected', 'static', 'global', 'return', 'new', 'try', 'catch', 'finally', 'throw', 'array', 'true', 'false', 'null'],
                                                    ['count', 'strlen', 'array_push', 'array_pop', 'array_merge', 'json_encode', 'json_decode', 'isset', 'empty', 'die', 'exit', 'str_replace', 'substr', 'explode', 'implode']
                                                );

                                                // SQL
                                                registerCompletions('sql',
                                                    ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'VALUES'],
                                                    ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'DATE', 'CONCAT', 'SUBSTR', 'LENGTH', 'UPPER', 'LOWER', 'ROUND']
                                                );
                                            }

                                            // Permitir copiar y cortar (Ctrl+C, Ctrl+X) nativamente y guardar el texto copiado internamente
                                            const updateInternalClipboard = () => {
                                                const selection = editor.getSelection();
                                                if (selection && !selection.isEmpty()) {
                                                    const text = editor.getModel()?.getValueInRange(selection);
                                                    if (text) {
                                                        internalCodeClipboardRef.current = text;
                                                    }
                                                }
                                            };

                                            editor.onKeyDown((e: any) => {
                                                if ((e.ctrlKey || e.metaKey) && (e.keyCode === monaco.KeyCode.KeyC || e.keyCode === monaco.KeyCode.KeyX)) {
                                                    updateInternalClipboard();
                                                }
                                            });

                                            const domNode = editor.getDomNode();
                                            if (domNode) {
                                                domNode.addEventListener('copy', updateInternalClipboard, true);
                                                domNode.addEventListener('cut', updateInternalClipboard, true);

                                                // Si la evaluación tiene bloqueo de portapapeles, solo permitir pegar lo que el estudiante haya copiado dentro del propio examen
                                                if (blockClipboard && !isSubmitted) {
                                                    domNode.addEventListener('paste', (e: ClipboardEvent) => {
                                                        const clipboardText = e.clipboardData?.getData('text/plain') || '';
                                                        const isInternal = internalCodeClipboardRef.current && (
                                                            clipboardText === internalCodeClipboardRef.current ||
                                                            internalCodeClipboardRef.current.includes(clipboardText) ||
                                                            clipboardText.includes(internalCodeClipboardRef.current)
                                                        );

                                                        if (!isInternal) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toast.warning("Pegado externo bloqueado", {
                                                                description: "Por seguridad académica, solo puedes duplicar o pegar código que hayas redactado dentro de esta prueba.",
                                                            });
                                                        }
                                                    }, true);
                                                }
                                            }

                                            // Guardar borrador de código cuando Monaco pierde el foco
                                            editor.onDidBlurEditorText(() => {
                                                const val = editor.getValue();
                                                const currentQ = currentQuestionRef.current;
                                                if (val !== undefined && currentQ?.id) {
                                                    saveAnswerAction(submission.id, currentQ.id, val);
                                                }
                                            });
                                        }}
                                    />
                                )}
                            </TabsContent>

                            {/* Feedback Tab */}
                            <TabsContent value="feedback" className="h-full m-0 p-6 overflow-y-auto data-[state=inactive]:hidden bg-muted/5">
                                {hasAI ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center bg-card p-3 rounded-md border shadow-sm">
                                            <h3 className="font-bold text-sm">Historial de Evaluaciones de IA</h3>
                                            <span className="text-sm font-semibold text-primary">
                                                Mejor Nota: {Math.max(...aiFeedbackHistory.map((h) => h.score || 0)).toFixed(1)} / 5.0
                                            </span>
                                        </div>
                                        {aiFeedbackHistory.slice().reverse().map((attemptData, index) => (
                                            <div key={index} className={`p-4 rounded-lg border ${attemptData.isCorrect ? 'bg-green-500/5 border-green-500/20 text-green-800 dark:text-green-300' : 'bg-orange-500/5 border-orange-500/20 text-orange-800 dark:text-orange-300'} animate-in fade-in zoom-in-95 transition-all duration-200`} style={{ fontSize: `${14 * zoomLevel}px` }}>
                                                <div className="flex items-center justify-between gap-2 mb-3 border-b pb-2 border-inherit">
                                                    <div className="flex items-center gap-2">
                                                        {attemptData.isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" /> : <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500" />}
                                                        <h3 className="font-bold text-sm">Intento #{attemptData.attempt}</h3>
                                                    </div>
                                                    <span className="text-xs font-bold px-2 py-1 bg-background/50 rounded-full border border-inherit">
                                                        Nota: {Number(attemptData.score || 0).toFixed(1)} / 5.0
                                                    </span>
                                                </div>
                                                <div
                                                    className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                                                    data-color-mode={mounted && theme === "dark" ? "dark" : "light"}
                                                >
                                                    <MDEditor.Markdown
                                                        source={attemptData.feedback || ""}
                                                        style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-4">
                                        <Sparkles className="w-12 h-12 mb-2" />
                                        <p>Solicita una evaluación con IA para ver los resultados aquí.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>

                        {/* Botón de Evaluar con IA a todo lo ancho en la parte inferior */}
                        <div className="px-3 py-2 border-t bg-card/95 backdrop-blur shrink-0 space-y-1">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAskAI}
                                disabled={!canAskAI || isEvaluatingAI || evalRemainingSeconds > 0 || isSubmitted}
                                className="w-full h-8 sm:h-8.5 font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                            >
                                {isEvaluatingAI ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                        <span>Evaluando y calificando tu respuesta con IA...</span>
                                    </>
                                ) : evalRemainingSeconds > 0 ? (
                                    <>
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Espera {evalRemainingSeconds}s para volver a evaluar</span>
                                    </>
                                ) : isSubmitted ? (
                                    <span>Evaluación finalizada (Modo solo lectura)</span>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                        <span>
                                            Evaluar con IA para Guardar Respuesta ({maxSupportAttempts - currentAttempts} {maxSupportAttempts - currentAttempts === 1 ? "intento restante" : "intentos restantes"})
                                        </span>
                                    </>
                                )}
                            </Button>
                            {!isSubmitted && (
                                <p className="text-center text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1.5 px-2">
                                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span>
                                        <strong>¡Importante!</strong> Debes presionar este botón para que la IA califique y guarde formalmente tu respuesta.
                                    </span>
                                </p>
                            )}
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>

            {/* Modales Shadcn UI */}
            <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" />
                            <span>¿Terminar y Enviar Evaluación?</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                                {!allAnswered && pendingCount > 0 ? (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                            <strong className="block font-bold mb-0.5">Preguntas pendientes:</strong>
                                            Tienes <strong>{pendingCount} de {questions.length}</strong> preguntas sin responder. Si decides terminar ahora, esas preguntas quedarán con nota 0.0.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>Has respondido todas las preguntas ({questions.length}/{questions.length}).</span>
                                    </div>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    Una vez enviada, la evaluación finalizará formalmente y no podrás modificar ninguna respuesta.
                                </span>
                                <div className="pt-1">
                                    <span className="text-xs text-foreground font-semibold block mb-1.5">
                                        Para confirmar, escribe la palabra <strong>ENVIAR</strong> en mayúsculas:
                                    </span>
                                    <Input
                                        value={finishConfirmText}
                                        onChange={(e) => setFinishConfirmText(e.target.value)}
                                        placeholder="Escribe ENVIAR"
                                        autoComplete="off"
                                        className="font-mono text-center tracking-widest uppercase font-bold"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setFinishConfirmText("")}>Volver al Examen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e: any) => {
                                if (finishConfirmText !== "ENVIAR") {
                                    e.preventDefault();
                                    return;
                                }
                                handleFinish();
                            }}
                            disabled={finishConfirmText !== "ENVIAR"}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer"
                        >
                            Confirmar y Enviar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Wildcard: AI Hint Confirmation */}
            <AlertDialog open={showHintConfirm} onOpenChange={setShowHintConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            ¿Usar Pista de IA?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            La IA te dará una <strong>pista orientativa</strong> para la pregunta actual sin revelar la respuesta completa.
                            <br /><br />
                            Te quedan <strong>{maxAiHints - aiHintsUsed}</strong> pista(s) disponible(s) de un total de <strong>{maxAiHints}</strong>.
                            <br /><br />
                            <em>Esta acción no se puede deshacer.</em>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUseAiHint} className="bg-amber-500 text-amber-950 hover:bg-amber-600">
                            <Lightbulb className="w-4 h-4 mr-1" />
                            Usar Pista
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal Panorámica de la Evaluación */}
            <Dialog open={showOverviewModal} onOpenChange={setShowOverviewModal}>
                <DialogContent showCloseButton={false} className="sm:max-w-[760px] md:max-w-[860px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
                    <DialogHeader className="p-5 pb-3 border-b border-border/80 bg-muted/20 shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                                        Panorámica de la Evaluación
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground truncate max-w-[480px]">
                                        {attempt.evaluation?.title}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                        Tiempo Restante
                                    </span>
                                    <span className="text-sm font-mono font-black text-foreground">
                                        {timeLeftStr || "..."}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowOverviewModal(false)}
                                    className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg border-border/80 hover:bg-muted cursor-pointer"
                                    title="Cerrar modal"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cerrar</span>
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Contenido scrolleable */}
                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                        {/* Fila de Tarjetas KPI Resumen */}
                        <div className={cn(
                            "grid gap-3",
                            blockTabSwitch ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"
                        )}>
                            {/* Nota Actual */}
                            <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-primary/80">Nota Actual</span>
                                <div className="flex items-baseline gap-1 my-1">
                                    <span className="text-2xl font-black text-primary">{accumulatedScore.toFixed(1)}</span>
                                    <span className="text-xs font-semibold text-primary/70">/ 5.0</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded w-fit border leading-none",
                                    getScoreColorClass(accumulatedScore)
                                )}>
                                    {accumulatedScore >= 4.5 ? "Excelente" : accumulatedScore >= 3.0 ? "Aprobando" : "Por Mejorar"}
                                </span>
                            </div>

                            {/* Progreso de Respuestas */}
                            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Progreso Global</span>
                                <div className="flex items-baseline gap-1 my-1">
                                    <span className="text-2xl font-black text-foreground">{completionPercent}%</span>
                                    <span className="text-xs text-muted-foreground">({answeredCount}/{questions.length})</span>
                                </div>
                                <Progress value={completionPercent} className="h-1.5 bg-muted" />
                            </div>

                            {/* Calificadas con IA */}
                            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Calificadas por IA</span>
                                <div className="flex items-baseline gap-1 my-1">
                                    <span className="text-2xl font-black text-foreground">{gradedQuestionsCount}</span>
                                    <span className="text-xs text-muted-foreground">preguntas</span>
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Con nota registrada</span>
                                </span>
                            </div>

                            {/* En Borrador vs Sin Responder */}
                            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Pendientes</span>
                                <div className="flex items-baseline gap-1 my-1">
                                    <span className="text-2xl font-black text-foreground">{unansweredQuestionsCount}</span>
                                    <span className="text-xs text-muted-foreground">sin responder</span>
                                </div>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                    {draftedQuestionsCount > 0 ? `${draftedQuestionsCount} en borrador` : "Al día"}
                                </span>
                            </div>

                            {/* Expulsiones por Pérdida de Foco */}
                            {blockTabSwitch && (
                                <div className={cn(
                                    "p-3 rounded-xl border flex flex-col justify-between",
                                    expulsionsCount > 0 
                                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" 
                                        : "bg-muted/30 border-border/80 text-muted-foreground"
                                )}>
                                    <span className="text-[10px] uppercase font-bold">Expulsiones</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className={cn("text-2xl font-black", expulsionsCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                            {expulsionsCount}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{expulsionsCount === 1 ? 'vez' : 'veces'}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
                                        <span>Pérdida de foco</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Cuadrícula Panorámica de Preguntas */}
                        <div>
                            <div className="flex items-center justify-between mb-2.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <span>Matriz de Preguntas</span>
                                    <span className="text-[10px] font-normal lowercase opacity-70">• Haz clic en cualquier pregunta para saltar a ella</span>
                                </h4>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {questions.map((q: any, idx: number) => {
                                    const isCurrent = idx === activeQuestionIdx;
                                    const isAnswered = !!answers[q.id]?.trim();
                                    const qHistory = aiFeedbackMap[q.id] || [];
                                    const maxAiScore = qHistory.length > 0 ? Math.max(...qHistory.map(h => h.score ?? 0)) : null;
                                    const ansScore = answerScores[q.id];
                                    const score = isSubmitted && ansScore !== undefined ? ansScore : (ansScore !== undefined && ansScore > 0 ? ansScore : maxAiScore);
                                    const hasScore = score !== null && score !== undefined;

                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => {
                                                handleQuestionSelect(idx);
                                                setShowOverviewModal(false);
                                            }}
                                            className={cn(
                                                "group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none",
                                                isCurrent
                                                    ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-xs"
                                                    : hasScore
                                                        ? "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40 shadow-2xs"
                                                        : isAnswered
                                                            ? "border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 shadow-2xs"
                                                            : "border-border/50 bg-muted/20 hover:bg-muted/50 opacity-80"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn(
                                                        "text-xs font-black",
                                                        isCurrent ? "text-primary" : "text-foreground"
                                                    )}>
                                                        Pregunta {idx + 1}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                    )}
                                                </div>
                                                <span className="text-[9px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border/60">
                                                    {q.type === "Text" ? "Texto" : "Código"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                {hasScore ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className={cn(
                                                            "text-[11px] font-black px-1.5 py-0.5 rounded border leading-none tracking-tight",
                                                            getScoreColorClass(score)
                                                        )}>
                                                            {score.toFixed(1)}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                                                    </div>
                                                ) : isAnswered ? (
                                                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                                        Borrador
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/60 italic">
                                                        Sin responder
                                                    </span>
                                                )}

                                                <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                                    <span>Ir</span>
                                                    <ArrowRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer del Modal */}
                    <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between w-full">
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {!allAnswered && pendingCount > 0 ? (
                                <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>Te faltan <strong>{pendingCount} pregunta(s)</strong> por responder.</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">¡Has respondido todas las preguntas!</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-semibold cursor-pointer"
                                onClick={() => setShowOverviewModal(false)}
                            >
                                Volver a la Prueba
                            </Button>
                            {!isSubmitted && (
                                <Button
                                    size="sm"
                                    className="h-8 text-xs font-semibold cursor-pointer gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => {
                                        setShowOverviewModal(false);
                                        setFinishConfirmText("");
                                        setShowFinishConfirm(true);
                                    }}
                                >
                                    <Send className="w-3 h-3" />
                                    <span>Terminar Evaluación</span>
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!alertMessage} onOpenChange={(open) => !open && setAlertMessage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{alertMessage?.title}</DialogTitle>
                        <DialogDescription className="whitespace-pre-wrap mt-2">
                            {alertMessage?.desc}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setAlertMessage(null)}>Aceptar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
