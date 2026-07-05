"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
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
import { Card } from "@/components/ui/card";
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
import { CheckCircle, Clock, AlertTriangle, MessageSquare, Loader2, Sparkles, BookOpen, LogOut, ShieldAlert, Lightbulb, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitEvaluationAction, saveAnswerAction, evaluateAnswerWithAIAction, registerExpulsionAction, useAiHintAction, useSecondChanceAction } from "@/features/student/actions/evaluationActions";
import { differenceInSeconds } from "date-fns";

function getScoreColorClass(score: number): string {
    if (score >= 4.5) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    if (score >= 4.0) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    if (score >= 3.0) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    if (score >= 2.0) return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
}

export function TakeEvaluationLayout({
    attempt,
    submission,
    studentId
}: {
    attempt: any;
    submission: any;
    studentId: string;
}) {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Modal states
    const [alertMessage, setAlertMessage] = useState<{ title: string; desc: string } | null>(null);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [finishConfirmText, setFinishConfirmText] = useState("");

    // Security/Anti-cheat states
    const [hasStarted, setHasStarted] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [expulsionsCount, setExpulsionsCount] = useState<number>(submission.expulsions || 0);
    const isExpellingRef = useRef(false);
    const [isMobile, setIsMobile] = useState(false);
    const [hasMultipleScreens, setHasMultipleScreens] = useState(false);

    // Wildcards State
    const maxAiHints = attempt.evaluation.wildcardAiHints || 0;
    const maxSecondChance = attempt.evaluation.wildcardSecondChance || 0;
    const initialWildcards: any = submission.wildcardsUsed || {};
    const [aiHintsUsed, setAiHintsUsed] = useState<number>(initialWildcards.aiHintsUsed || 0);
    const [secondChanceUsed, setSecondChanceUsed] = useState<number>(initialWildcards.secondChanceUsed || 0);
    const [isUsingHint, setIsUsingHint] = useState(false);
    const [isUsingSecondChance, setIsUsingSecondChance] = useState(false);
    const [showHintConfirm, setShowHintConfirm] = useState(false);
    const [showSecondChanceConfirm, setShowSecondChanceConfirm] = useState(false);

    // Help Mode State
    const [isHelpMode, setIsHelpMode] = useState(false);
    // Zoom State
    const [zoomLevel, setZoomLevel] = useState(1.0);
    // Ref to read isHelpMode inside event handlers without stale closures
    const isHelpModeRef = useRef(false);
    useEffect(() => { isHelpModeRef.current = isHelpMode; }, [isHelpMode]);
    const hasHelpUrl = !!attempt.evaluation.helpUrl;

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
    }, [mounted]);

    // Anti-cheat verification
    useEffect(() => {
        if (!mounted || isSubmitted) return;

        const checkMaximized = () => {
            // Acceptable threshold since some browsers differ by a few pixels on toolbars
            const isWidthMax = window.outerWidth >= window.screen.availWidth - 10;
            const isHeightMax = window.outerHeight >= window.screen.availHeight - 10;
            setIsMaximized(isWidthMax && isHeightMax);
            return isWidthMax && isHeightMax;
        };

        // Check immediately
        checkMaximized();

        const handleResize = () => {
            const currentlyMaximized = checkMaximized();
            if (hasStarted && !currentlyMaximized) {
                // If they resize during the test, expel them
                handleExpulsion("Cambio de tamaño de ventana", "Has sido expulsado por modificar el tamaño de la ventana de la evaluación.");
            }
        };

        const handleVisibilityChange = () => {
            // Tab switching always triggers expulsion, even in help mode
            if (hasStarted && document.visibilityState === 'hidden') {
                handleExpulsion("Abandono de pestaña", "Has sido expulsado por abandonar la pestaña de la evaluación.");
            }
        };

        const handleBlur = () => {
            // Allow window blur if help mode is active (student clicked inside the help iframe)
            if (hasStarted && !isHelpModeRef.current) {
                handleExpulsion("Pérdida de foco", "Has sido expulsado por perder el foco de la ventana de la evaluación.");
            }
        };

        const handleScreenChange = () => {
            if (hasStarted && (window.screen as any).isExtended) {
                handleExpulsion("Múltiples monitores detectados", "Has sido expulsado por conectar un monitor adicional durante la evaluación.");
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        (window.screen as any).addEventListener?.('change', handleScreenChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            (window.screen as any).removeEventListener?.('change', handleScreenChange);
        };
    }, [mounted, isSubmitted, hasStarted]);

    const handleExpulsion = async (reason: string, details: string) => {
        // Prevent multiple simultaneous expulsions firing at once
        if (isExpellingRef.current) return;
        isExpellingRef.current = true;

        // Register expulsion in the DB to persist the count and apply any configured penalty
        try {
            const result = await registerExpulsionAction(submission.id);
            if (result?.expulsions !== undefined) {
                setExpulsionsCount(result.expulsions);
            }
        } catch (e) {
            console.error("Failed to register expulsion:", e);
        }

        // Redirect to dashboard with error message
        router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations&error=${encodeURIComponent(details)}`);
    };

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

    const timeEnd = new Date(attempt.endTime);
    const maxSupportAttempts = attempt.evaluation.maxSupportAttempts || 3;
    const aiSupportDelaySeconds = attempt.evaluation.aiSupportDelaySeconds || 60;

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

    // Modal de inicio bloqueante antes de habilitar los contenidos
    if (!hasStarted && !isSubmitted && mounted) {
        const canStart = !isMobile && !hasMultipleScreens && isMaximized;
        const expulsionPenalty = attempt.evaluation.expulsionPenalty || 0;

        const RuleItem = ({ icon, text, variant = "neutral" }: { icon: React.ReactNode; text: React.ReactNode; variant?: "neutral" | "warn" | "info" }) => {
            const colors = {
                neutral: "bg-muted/60 border-border/60 text-foreground/80",
                warn: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300",
                info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300",
            };
            return (
                <div className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm ${colors[variant]}`}>
                    <span className="shrink-0 mt-0.5">{icon}</span>
                    <span>{text}</span>
                </div>
            );
        };

        const CheckItem = ({ ok, label, blocking = false }: { ok: boolean; label: string; blocking?: boolean }) => (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${ok
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                : blocking
                    ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                    : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
                }`}>
                {ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : blocking ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                <span>{label}</span>
            </div>
        );

        return (
            <div className="flex h-screen items-center justify-center bg-background/80 backdrop-blur-md z-50 fixed inset-0 p-4">
                <div className="w-full max-w-4xl bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-5 text-white">
                        <div className="flex items-center gap-3 mb-1">
                            <ShieldAlert className="h-6 w-6 shrink-0" />
                            <h2 className="text-lg font-bold tracking-tight">Normas de Seguridad — Evaluación</h2>
                        </div>
                        <p className="text-sm text-white/80 ml-9">{attempt.evaluation.title}</p>
                        <div className="flex flex-wrap gap-2 mt-3 ml-9 text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-white/20 font-medium">{questions.length} preguntas</span>
                            {expulsionPenalty > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-white/20 font-medium">
                                    Penalidad: −{expulsionPenalty.toFixed(2)} pts / expulsión
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 grid grid-cols-2 gap-6 overflow-y-auto max-h-[65vh]">

                        {/* Columna izquierda */}
                        <div className="flex flex-col gap-5">

                            {/* Reglas de Entorno */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Entorno Requerido</h3>
                                <div className="flex flex-col gap-1.5">
                                    <RuleItem variant="neutral" icon={<span>🖥️</span>} text={<>Solo se permite desde un <strong>computador de escritorio o portátil</strong>. No se aceptan móviles ni tablets.</>} />
                                    <RuleItem variant="neutral" icon={<span>🖱️</span>} text={<>La ventana debe estar <strong>maximizada</strong> antes de comenzar.</>} />
                                    <RuleItem variant="neutral" icon={<span>📺</span>} text={<>Solo está permitido <strong>un monitor</strong> conectado al sistema.</>} />
                                </div>
                            </div>

                            {/* Restricciones durante la prueba */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Restricciones durante la Prueba</h3>
                                <div className="flex flex-col gap-1.5">
                                    <RuleItem variant="info" icon={<span>📋</span>} text="Copiar, cortar y pegar están deshabilitados en el enunciado y en el área de respuesta." />
                                    {hasHelpUrl && (
                                        <RuleItem variant="info" icon={<span>📖</span>} text="Puedes usar el Material de Ayuda del profesor. Interactuar con él no genera expulsión, pero cambiar de pestaña sí." />
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Columna derecha */}
                        <div className="flex flex-col gap-5">

                            {/* Causas de Expulsión */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Causas de Expulsión Inmediata</h3>
                                <div className="flex flex-col gap-1.5">
                                    <RuleItem variant="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />} text="Cambiar o minimizar el tamaño de la ventana del navegador." />
                                    <RuleItem variant="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />} text="Cambiar de pestaña del navegador (incluso en modo ayuda)." />
                                    <RuleItem variant="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />} text="Perder el foco de la ventana fuera del área de respuesta y del material de ayuda." />
                                    <RuleItem variant="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />} text="Conectar un monitor adicional durante la evaluación." />
                                    {expulsionPenalty > 0 && (
                                        <RuleItem variant="warn" icon={<AlertTriangle className="h-3.5 w-3.5" />} text={<>Cada expulsión reduce la nota final en <strong>{expulsionPenalty.toFixed(2)} pts</strong>. La penalidad se acumula.</>} />
                                    )}
                                </div>
                            </div>

                            {/* Estado de los requisitos */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Estado de tus Requisitos</h3>
                                <div className="flex flex-col gap-1.5">
                                    <CheckItem ok={!isMobile} blocking={true} label={isMobile ? "Dispositivo móvil detectado — usa un computador" : "Dispositivo compatible ✓"} />
                                    <CheckItem ok={!hasMultipleScreens} blocking={true} label={hasMultipleScreens ? "Múltiples monitores — desconecta el adicional" : "Un solo monitor detectado ✓"} />
                                    <CheckItem ok={isMaximized} blocking={false} label={isMaximized ? "Ventana maximizada ✓" : "Maximiza la ventana para continuar..."} />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex flex-col gap-2">
                        {canStart && (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                Todos los requisitos cumplidos. Puedes comenzar.
                            </div>
                        )}
                        <Button
                            className="w-full h-10 font-semibold text-sm"
                            disabled={!canStart}
                            onClick={() => setHasStarted(true)}
                        >
                            {canStart ? "Acepto las normas — Comenzar Evaluación" : "Debes cumplir los requisitos para continuar"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const handleQuestionSelect = (idx: number) => {
        setActiveQuestionIdx(idx);
        setActiveTab("answer"); // Reset tab
    };

    const handleAnswerChange = (val: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: val
        }));
    };

    const handleSaveCurrent = async () => {
        setIsSaving(true);
        if (answers[currentQuestion.id] != null) {
            await saveAnswerAction(submission.id, currentQuestion.id, answers[currentQuestion.id] || "");
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
        if (!answers[currentQuestion.id]) {
            setAlertMessage({
                title: "Respuesta Vacía",
                desc: "Debes escribir alguna respuesta antes de pedirle a la IA que la evalúe."
            });
            return;
        }

        setIsEvaluatingAI(true);
        try {
            const res = await evaluateAnswerWithAIAction(
                submission.id,
                currentQuestion.id,
                answers[currentQuestion.id]
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

            if (res.attemptsRemaining === 0) {
                setAlertMessage({
                    title: "Intentos Agotados",
                    desc: `Has agotado tus peticiones a la IA para esta pregunta. ${res.feedback || ""}`
                });
            }
        } catch (error: any) {
            setAlertMessage({
                title: "Error al evaluar",
                desc: error.message || "No se pudo consultar a la IA."
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
        try {
            const res = await useAiHintAction(submission.id, currentQuestion.id, answers[currentQuestion.id] || "");
            setAiHintsUsed(prev => prev + 1);
            setAlertMessage({
                title: "💡 Pista de la IA",
                desc: res.hint
            });
        } catch (error: any) {
            setAlertMessage({ title: "Error", desc: error.message });
        } finally {
            setIsUsingHint(false);
        }
    };

    const handleUseSecondChance = async () => {
        setShowSecondChanceConfirm(false);
        setIsUsingSecondChance(true);
        try {
            await useSecondChanceAction(submission.id, currentQuestion.id);
            setSecondChanceUsed(prev => prev + 1);
            // Reset local state for the current question
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: "" }));
            setAiFeedbackMap(prev => ({ ...prev, [currentQuestion.id]: [] }));
            setSupportAttempts(prev => ({ ...prev, [currentQuestion.id]: 0 }));
            setActiveTab("answer");
            setAlertMessage({
                title: "🔄 Segunda Oportunidad",
                desc: "Se ha reiniciado tu respuesta, nota y feedback de IA para esta pregunta. ¡Inténtalo de nuevo!"
            });
        } catch (error: any) {
            setAlertMessage({ title: "Error", desc: error.message });
        } finally {
            setIsUsingSecondChance(false);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
            {/* Top Bar - Title Only */}
            <div className="h-6 shrink-0 flex items-center justify-center px-4 border-b bg-muted/30 z-[60]">
                <h1 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground truncate max-w-xl">
                    {attempt.evaluation.title}
                </h1>
            </div>

            {/* Minimal Header - Tighter Padding to occupy less space */}
            <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-card z-50 h-12 shadow-sm">
                <div className="flex items-center gap-2">
                    {/* Timer */}
                    {!isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-colors cursor-default ${timeLeftStr.startsWith("00:0") ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"}`}>
                                    <Clock className={`w-3.5 h-3.5 ${timeLeftStr.startsWith("00:0") ? "animate-pulse" : ""}`} />
                                    <span className="text-[10px] uppercase font-bold mr-1 hidden sm:inline">Tiempo:</span>
                                    <span className="text-xs font-mono font-black tracking-wider">
                                        {timeLeftStr === "Completada" ? "✓" : timeLeftStr || "..."}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>Tiempo restante de la evaluación</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Score (Acumulada) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 px-3 h-8 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-500/20 font-medium cursor-default">
                                <span className="text-[10px] uppercase font-bold mr-1">Acumulada:</span>
                                <span className="text-xs font-black">{accumulatedScore.toFixed(2)}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>Nota de las respuestas (sin penalidades)</TooltipContent>
                    </Tooltip>

                    {/* Final Score (Definitiva) */}
                    {(() => {
                        const penalty = attempt.evaluation.expulsionPenalty || 0;
                        const totalDeduction = (expulsionsCount || 0) * penalty;
                        const definitiva = Math.max(0, accumulatedScore - totalDeduction);
                        return (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 px-4 h-8 bg-emerald-600 text-white rounded-lg border border-emerald-500/30 font-bold cursor-default shadow-md hover:scale-105 transition-transform">
                                        <Sparkles className="w-3.5 h-3.5 fill-white" />
                                        <span className="text-[10px] uppercase font-black mr-1">Definitiva:</span>
                                        <span className="text-sm font-black">{definitiva.toFixed(2)}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Nota Final (con penalidades): {definitiva.toFixed(2)} / 5.0</TooltipContent>
                            </Tooltip>
                        );
                    })()}

                    {/* Merged Expulsions & Penalty Indicator */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border font-bold cursor-default transition-all duration-300 ${expulsionsCount > 0 ? 'bg-red-500 text-white border-red-400 shadow-sm' : 'bg-muted/30 text-muted-foreground border-border/50 opacity-50'}`}>
                                <ShieldAlert className={`w-3.5 h-3.5 ${expulsionsCount > 0 ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] uppercase font-black mr-1 hidden sm:inline">Expulsiones:</span>
                                <span className="text-sm font-black">{expulsionsCount}</span>
                                {(() => {
                                    const penalty = attempt.evaluation.expulsionPenalty || 0;
                                    if (penalty > 0 && expulsionsCount > 0) {
                                        const totalDeduction = expulsionsCount * penalty;
                                        return (
                                            <span className="ml-1 pl-1.5 border-l border-white/30 text-xs font-black">
                                                −{totalDeduction.toFixed(2)} pts
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {expulsionsCount > 0
                                ? `Has salido de la ventana ${expulsionsCount} veces. Penalidad total: −${((expulsionsCount || 0) * (attempt.evaluation.expulsionPenalty || 0)).toFixed(2)} pts.`
                                : "Número de veces que has salido de la ventana de la evaluación."}
                        </TooltipContent>
                    </Tooltip>

                    {/* Wildcard Buttons */}
                    {!isSubmitted && (maxAiHints > 0 || maxSecondChance > 0) && (
                        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border/50">
                            {maxAiHints > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setShowHintConfirm(true)}
                                            disabled={aiHintsUsed >= maxAiHints || isUsingHint}
                                            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 border ${aiHintsUsed >= maxAiHints
                                                ? "bg-muted/60 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                                                : "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-amber-300 shadow-md shadow-amber-200/50 dark:shadow-amber-900/30 hover:scale-105 hover:shadow-lg dark:from-amber-500 dark:to-yellow-600 dark:border-amber-400"
                                                }`}
                                        >
                                            {isUsingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${aiHintsUsed >= maxAiHints ? "bg-muted text-muted-foreground" : "bg-white/40 text-amber-900"
                                                }`}>{maxAiHints - aiHintsUsed}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>💡 Pista de IA — Obtén una orientación sin revelar la respuesta ({maxAiHints - aiHintsUsed} disponibles)</TooltipContent>
                                </Tooltip>
                            )}
                            {maxSecondChance > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setShowSecondChanceConfirm(true)}
                                            disabled={secondChanceUsed >= maxSecondChance || isUsingSecondChance}
                                            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 border ${secondChanceUsed >= maxSecondChance
                                                ? "bg-muted/60 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                                                : "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-violet-400 shadow-md shadow-violet-200/50 dark:shadow-violet-900/30 hover:scale-105 hover:shadow-lg dark:from-violet-600 dark:to-purple-700 dark:border-violet-500"
                                                }`}
                                        >
                                            {isUsingSecondChance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${secondChanceUsed >= maxSecondChance ? "bg-muted text-muted-foreground" : "bg-white/30 text-white"
                                                }`}>{maxSecondChance - secondChanceUsed}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>🔄 Segunda Oportunidad — Reinicia la pregunta desde cero ({maxSecondChance - secondChanceUsed} disponibles)</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    {hasHelpUrl && !isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 text-[10px] px-2.5 flex items-center gap-1.5 transition-all duration-300 font-bold uppercase tracking-tight ${isHelpMode ? 'bg-primary/20 text-primary border-primary shadow-sm' : 'hover:bg-muted'}`}
                                    onClick={() => setIsHelpMode(!isHelpMode)}
                                >
                                    <BookOpen className={`w-3.5 h-3.5 ${isHelpMode ? 'fill-primary' : ''}`} />
                                    <span className="hidden sm:inline">
                                        {isHelpMode ? "Volver a la evaluación" : "Material de Ayuda"}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isHelpMode ? "Volver a la evaluación" : "Abrir material de ayuda del profesor"}</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
                            title="Disminuir texto"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-[10px] font-black w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.1))}
                            title="Aumentar texto"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {!isSubmitted && (
                        <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs px-3 bg-primary hover:bg-primary/90"
                            onClick={() => {
                                setFinishConfirmText("");
                                setShowFinishConfirm(true);
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Enviando..." : "Terminar Evaluación"}
                        </Button>
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
                                className="h-7 text-xs px-3"
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
                        src={attempt.evaluation.helpUrl}
                        className="w-full h-full border-0"
                        title="Material de Ayuda"
                    />
                </div>
            )}

            {/* Main Workspace */}
            <div className={`flex flex-1 overflow-hidden z-10 ${isHelpMode ? 'hidden' : 'flex'}`}>

                {/* Left Panel: Question Statement */}
                <div className="w-1/2 flex flex-col border-r bg-muted/10 h-full">
                    {/* Question Statement (Markdown) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-color-mode={mounted && theme === "dark" ? "dark" : "light"}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold tracking-tight">Pregunta {activeQuestionIdx + 1}</h2>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-muted rounded tracking-widest text-muted-foreground border">
                                {currentQuestion.type === 'Text' ? 'TEXTO' : 'CÓDIGO'}
                            </span>
                        </div>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none transition-all duration-200"
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
                        <div className="px-4 py-2 border-b shrink-0 bg-muted/20 flex flex-col gap-2">
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
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleAskAI}
                                        disabled={!canAskAI || isEvaluatingAI || evalRemainingSeconds > 0 || isSubmitted}
                                        className="h-7 text-[10px] px-2"
                                    >
                                        {isEvaluatingAI ? (
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : evalRemainingSeconds > 0 ? (
                                            <Clock className="w-3 h-3 mr-1 text-muted-foreground" />
                                        ) : (
                                            <Sparkles className="w-3 h-3 mr-1 text-yellow-500" />
                                        )}
                                        {evalRemainingSeconds > 0
                                            ? `Espera ${evalRemainingSeconds}s`
                                            : `Evaluar con IA (${maxSupportAttempts - currentAttempts} intentos)`}
                                    </Button>
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
                                        onCopy={(e) => { if (!isSubmitted) e.preventDefault(); }}
                                        onCut={(e) => { if (!isSubmitted) e.preventDefault(); }}
                                        onPaste={(e) => { if (!isSubmitted) e.preventDefault(); }}
                                    />
                                ) : (
                                    <Editor
                                        height="100%"
                                        width="100%"
                                        language={currentQuestion.language === "arduino" ? "cpp" : (currentQuestion.language || "javascript")}
                                        theme={mounted && theme === "dark" ? "vs-dark" : "light"}
                                        value={answers[currentQuestion.id] || ""}
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
                                            quickSuggestions: {
                                                other: true,
                                                comments: false,
                                                strings: true
                                            },
                                            suggestOnTriggerCharacters: true,
                                            wordBasedSuggestions: "currentDocument",
                                            acceptSuggestionOnEnter: "on",
                                            tabCompletion: "on",
                                        }}
                                        onMount={(editor, monaco) => {

                                            // 1. Interceptamos el servicio de comandos (usamos 'any' para acceder a la propiedad privada)
                                            const commandService = (editor as any)._commandService;

                                            if (commandService) {
                                                const originalExecuteCommand = commandService.executeCommand;

                                                commandService.executeCommand = function (id: string, ...args: any[]) {
                                                    // Bloqueamos la acción de pegar
                                                    if (id === 'editor.action.clipboardPasteAction') {
                                                        return null;
                                                    }
                                                    return originalExecuteCommand.apply(this, [id, ...args]);
                                                };
                                            }

                                            // 2. Bloqueo total del evento "paste" a nivel DOM
                                            const domNode = editor.getDomNode();
                                            if (domNode) {
                                                domNode.addEventListener('paste', (e: ClipboardEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }, true);
                                            }

                                            // 3. Opcional: Bloqueo de atajos de teclado (Ctrl/Cmd + V)
                                            editor.onKeyDown((e: any) => {
                                                if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }
                                            });

                                            // Helper to register simple keyword/built-in completions
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
                                                            ...keywords.map(kw => ({
                                                                label: kw,
                                                                kind: monaco.languages.CompletionItemKind.Keyword,
                                                                insertText: kw,
                                                                range: range
                                                            })),
                                                            ...builtins.map(bi => ({
                                                                label: bi,
                                                                kind: monaco.languages.CompletionItemKind.Function,
                                                                insertText: bi.includes('(') ? bi : bi + '($1)',
                                                                insertTextRules: bi.includes('(') ? undefined : monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                                                ['setup()', 'loop()', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'millis', 'micros', 'Serial.begin', 'Serial.print', 'Serial.println', 'Serial.available', 'Serial.read', 'attachInterrupt', 'detachInterrupt', 'bitRead', 'bitWrite', 'abs', 'min', 'max', 'map', 'constrain']
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
                                                ['COUNT()', 'SUM()', 'AVG()', 'MIN()', 'MAX()', 'NOW()', 'DATE()', 'CONCAT()', 'SUBSTR()', 'LENGTH()', 'UPPER()', 'LOWER()', 'ROUND()']
                                            );

                                            if (!isSubmitted) {
                                                // Block keyboard shortcuts Ctrl+C / Ctrl+X / Ctrl+V
                                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => { });
                                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => { });
                                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => { });
                                                // Override clipboard actions in the context menu so they are inert
                                                editor.addAction({ id: 'vs.editor.ICodeEditor:1:clipboardCopyAction', label: '', run: () => { } });
                                                editor.addAction({ id: 'vs.editor.ICodeEditor:1:clipboardCutAction', label: '', run: () => { } });
                                                editor.addAction({ id: 'vs.editor.ICodeEditor:1:clipboardPasteAction', label: '', run: () => { } });
                                            }
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
                    </Tabs>
                </div>
            </div>
            {/* Bottom Full-Width Navigation */}
            <div className={`w-full flex-col border-t bg-card shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] ${isHelpMode ? 'hidden' : 'flex'}`}>
                <div className="flex px-4 py-2 gap-1.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent bg-muted/5 justify-center">
                    {questions.map((q: any, idx: number) => {
                        const isAnswered = !!answers[q.id];

                        // Calculate display score (from history or direct answer score if submitted)
                        const qHistory = aiFeedbackMap[q.id] || [];
                        const maxAiScore = qHistory.length > 0
                            ? Math.max(...qHistory.map(h => h.score || 0))
                            : null;

                        const ansScore = answerScores[q.id];
                        const displayScore = isSubmitted && ansScore !== undefined
                            ? ansScore
                            : maxAiScore;

                        // Determine score color string if score exists, otherwise default classes
                        const scoreClasses = displayScore !== null
                            ? getScoreColorClass(displayScore)
                            : isAnswered
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50";

                        return (
                            <div key={q.id} className="relative group">
                                <button
                                    onClick={() => setActiveQuestionIdx(idx)}
                                    className={`relative flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-sm sm:rounded-md transition-all shrink-0 border
                                        ${scoreClasses}
                                        ${activeQuestionIdx === idx ? "outline-2 outline-primary -outline-offset-2 z-10" : "hover:scale-105"}
                                    `}
                                >
                                    <span className="text-[10px] sm:text-xs font-bold leading-none">{idx + 1}</span>
                                    {displayScore !== null && (
                                        <span className="text-[8px] font-bold mt-0.5 opacity-100 leading-none bg-black/20 px-1 rounded-sm">
                                            {displayScore.toFixed(1)}
                                        </span>
                                    )}
                                    {isAnswered && activeQuestionIdx !== idx && displayScore === null && (
                                        <CheckCircle className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500 fill-background bg-background rounded-full" />
                                    )}
                                </button>

                                {/* Tooltip for score */}
                                {displayScore !== null && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
                                        Nota: {displayScore.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modales Shadcn UI */}
            <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Terminar Evaluación?</AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-2">
                            <span>¿Estás seguro de que deseas enviar la evaluación? No podrás cambiar tus respuestas después de confirmarlo.</span>
                            <span className="mt-2 text-foreground font-medium">Por favor, escribe la palabra <strong>ENVIAR</strong> en mayúsculas para confirmar:</span>
                            <Input
                                value={finishConfirmText}
                                onChange={(e) => setFinishConfirmText(e.target.value)}
                                placeholder="Escribe ENVIAR"
                                autoComplete="off"
                            />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setFinishConfirmText("")}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e: any) => {
                                if (finishConfirmText !== "ENVIAR") {
                                    e.preventDefault();
                                    return;
                                }
                                handleFinish();
                            }}
                            disabled={finishConfirmText !== "ENVIAR"}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Enviar y Terminar
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

            {/* Wildcard: Second Chance Confirmation */}
            <AlertDialog open={showSecondChanceConfirm} onOpenChange={setShowSecondChanceConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-violet-500" />
                            ¿Usar Segunda Oportunidad?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Se <strong>eliminará permanentemente</strong> tu respuesta actual, la nota de IA y todo el historial de feedback para la <strong>Pregunta {activeQuestionIdx + 1}</strong>.
                            <br /><br />
                            Podrás empezar la pregunta desde cero, como si fuera la primera vez.
                            <br /><br />
                            Te quedan <strong>{maxSecondChance - secondChanceUsed}</strong> segunda(s) oportunidad(es) de un total de <strong>{maxSecondChance}</strong>.
                            <br /><br />
                            <strong className="text-destructive">⚠️ Esta acción NO se puede deshacer.</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUseSecondChance} className="bg-violet-600 text-white hover:bg-violet-700">
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reiniciar Pregunta
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
