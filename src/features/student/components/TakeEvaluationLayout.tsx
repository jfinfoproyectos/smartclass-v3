"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeAnswerEditor } from "./CodeAnswerEditor";
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
    CheckCircle, Clock, AlertTriangle, MessageSquare, Loader2, Sparkles, BookOpen, 
    LogOut, ShieldAlert, ShieldCheck, Lightbulb, RotateCcw, ZoomIn, ZoomOut, RefreshCw, 
    ChevronLeft, ChevronRight, ListChecks, Send, BarChart3, CheckCircle2, ArrowRight,
    ArrowLeft, Monitor, Laptop, Maximize2, ExternalLink, Calendar, Check, X, Lock,
    AlertCircle, XCircle, Copy
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { submitEvaluationAction, saveAnswerAction, evaluateAnswerWithAIAction, registerTabSwitchLogAction, registerExpulsionAction, useAiHintAction as requestAiHintAction, getEvaluationAttemptDataAction } from "@/features/student/actions/evaluationActions";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { CodeThemeSelector } from "@/components/theme/CodeThemeSelector";
import { cn } from "@/lib/utils";
import { formatDurationHMS, formatDurationHuman } from "@/lib/dateUtils";
import { TextAnswerEditor } from "./TextAnswerEditor";
import { EvaluationPreExamBarrier } from "./EvaluationPreExamBarrier";
import { EvaluationTabSwitchesModal } from "./EvaluationTabSwitchesModal";
import { formatHintMarkdown } from "@/features/student/utils/formatHintMarkdown";

function getScoreColorClass(score: number): string {
    if (score >= 4.5) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (score >= 4.0) return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30";
    if (score >= 3.0) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    if (score >= 2.0) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    return "bg-destructive/15 text-destructive border-destructive/30";
}

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
    const [currentAttempt, setCurrentAttempt] = useState(attempt);
    const [isAttemptLocked, setIsAttemptLocked] = useState<boolean>(!!attempt?.isLocked);
    useEffect(() => {
        setCurrentAttempt(attempt);
        if (attempt?.isLocked !== undefined) {
            setIsAttemptLocked(!!attempt.isLocked);
        }
    }, [attempt]);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLiveConnected, setIsLiveConnected] = useState(false);

    const handleRefreshEvaluation = async (isAutoSync: boolean = false, customMessage?: string) => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const updated = await getEvaluationAttemptDataAction(currentAttempt.id);
            if (updated) {
                setCurrentAttempt(updated);

                // Si el profesor actualizó datos en la entrega del alumno (comodines, faltas, intentos de IA)
                if ((updated as any).studentSubmission) {
                    const sub = (updated as any).studentSubmission;
                    if (sub.expulsions !== undefined) {
                        setExpulsionsCount(sub.expulsions);
                        expulsionsCountRef.current = sub.expulsions;
                    }
                    if (sub.wildcardsUsed) {
                        const w = typeof sub.wildcardsUsed === 'string' ? JSON.parse(sub.wildcardsUsed) : sub.wildcardsUsed;
                        if (w?.aiHintsUsed !== undefined) setAiHintsUsed(w.aiHintsUsed);
                        if (Array.isArray(w?.aiHintQuestions)) {
                            setUnlockedHints(w.aiHintQuestions.filter((h: any) => h && h.hint));
                        }
                    }
                    if (sub.answersList && Array.isArray(sub.answersList)) {
                        setSupportAttempts(prev => {
                            const newMap = { ...prev };
                            sub.answersList.forEach((ans: any) => {
                                if (ans.supportAttempts !== undefined) {
                                    newMap[ans.questionId] = ans.supportAttempts;
                                }
                            });
                            return newMap;
                        });
                    }
                }
            }
        } catch (error: any) {
            console.error("Error al sincronizar evaluación:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Modal states
    const [alertMessage, setAlertMessage] = useState<{ title: string; desc: string } | null>(null);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [finishConfirmText, setFinishConfirmText] = useState("");
    const [showOverviewModal, setShowOverviewModal] = useState(false);

    // Mensaje prioritario del profesor vía SSE con lectura obligatoria (10s)
    const [teacherMessageModal, setTeacherMessageModal] = useState<{
        message: string;
        senderName: string;
        timestamp: number;
    } | null>(null);
    const [messageCountdown, setMessageCountdown] = useState<number>(10);

    // Temporizador de 10 segundos de lectura obligatoria
    useEffect(() => {
        if (!teacherMessageModal) return;
        setMessageCountdown(10);
        const interval = setInterval(() => {
            setMessageCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [teacherMessageModal]);

    // Telemetría de cambios de pestaña cuando la expulsión está desactivada
    const initialWildcards = useMemo(() => {
        try {
            return typeof submission.wildcardsUsed === 'string'
                ? JSON.parse(submission.wildcardsUsed)
                : (submission.wildcardsUsed as any) || {};
        } catch {
            return {};
        }
    }, [submission.wildcardsUsed]);

    const [tabSwitchesCount, setTabSwitchesCount] = useState<number>(initialWildcards.tabSwitchesCount || 0);
    const tabSwitchesCountRef = useRef(initialWildcards.tabSwitchesCount || 0);
    const [totalTimeAwaySeconds, setTotalTimeAwaySeconds] = useState<number>(initialWildcards.totalTimeAwaySeconds || 0);
    const [tabSwitchLogs, setTabSwitchLogs] = useState<any[]>(initialWildcards.tabSwitchLogs || []);
    const [showTabSwitchesModal, setShowTabSwitchesModal] = useState(false);
    const tabLeaveTimeRef = useRef<number>(0);
    const activeQuestionIdxRef = useRef<number>(0);

    const [hasStarted, setHasStarted] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [hasMultipleScreens, setHasMultipleScreens] = useState(false);
    const isSubmitted = Boolean(submission?.submittedAt);

    // Estado y control de expulsiones temporales con reingreso
    const [expulsionsCount, setExpulsionsCount] = useState<number>(submission.expulsions || 0);
    const expulsionsCountRef = useRef<number>(submission.expulsions || 0);
    const [expulsionReason, setExpulsionReason] = useState<"resize" | "multi_screen" | null>(null);
    const isExpellingRef = useRef(false);

    // Refs para acceder a las respuestas y pregunta activa en eventos asíncronos
    const answersRef = useRef<Record<string, string>>({});
    const currentQuestionRef = useRef<any>(null);
    const editorRef = useRef<any>(null);

    const triggerExpulsion = useCallback(async (reason: "resize" | "multi_screen") => {
        if (isExpellingRef.current || isSubmitted || !hasStarted) return;
        isExpellingRef.current = true;
        try {
            setHasStarted(false);
            setExpulsionReason(reason);
            // Guardar borrador de la pregunta actual antes de pausar
            if (currentQuestionRef.current?.id) {
                const currentVal = editorRef.current && currentQuestionRef.current.type === "Code"
                    ? editorRef.current.getValue()
                    : answersRef.current[currentQuestionRef.current.id];
                if (currentVal !== undefined) {
                    saveAnswerAction(submission.id, currentQuestionRef.current.id, currentVal || "").catch(() => {});
                }
            }
            const res = await registerExpulsionAction(submission.id);
            if (res?.success) {
                setExpulsionsCount(res.expulsions);
                expulsionsCountRef.current = res.expulsions;
            }
        } catch (err) {
            console.error("Error al registrar expulsión:", err);
        } finally {
            setTimeout(() => {
                isExpellingRef.current = false;
            }, 1500);
        }
    }, [hasStarted, isSubmitted, submission.id]);

    // Surveillance and restriction configuration from attempt
    const surveillanceEnabled = currentAttempt.enableSurveillance !== false;
    const blockTabSwitch = surveillanceEnabled && (currentAttempt.blockTabSwitch !== false);
    const requireFullscreen = surveillanceEnabled && (currentAttempt.requireFullscreen !== false);
    const blockMultipleDisplays = surveillanceEnabled && (currentAttempt.blockMultipleDisplays !== false);
    const maxExitTimeSeconds = currentAttempt.maxExitTimeSeconds ?? attempt.maxExitTimeSeconds ?? 60;
    const hasExitTimeAlert = blockTabSwitch && (totalTimeAwaySeconds >= maxExitTimeSeconds);

    // Wildcards State
    const maxAiHints = attempt.wildcardAiHints ?? attempt.evaluation.wildcardAiHints ?? 0;
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

    // Sistema sin expulsiones: opera exclusivamente por conteo de salidas y alertas por umbral de tiempo

    useEffect(() => {
        setMounted(true);
        toast.dismiss();
    }, []);

    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    const questions = currentAttempt.evaluation?.questions || attempt.evaluation.questions || [];
    const currentQuestion = questions[activeQuestionIdx] || questions[0];

    // Pistas Permanentes de IA (guardadas en base de datos para consulta ilimitada durante la prueba)
    const [unlockedHints, setUnlockedHints] = useState<Array<{ questionId: string; hint: string; usedAt: string }>>(() => {
        if (Array.isArray(initialWildcards.aiHintQuestions)) {
            return initialWildcards.aiHintQuestions.filter((h: any) => h && h.hint);
        }
        return [];
    });
    const [copiedHintKey, setCopiedHintKey] = useState<string | null>(null);

    const currentQuestionHints = useMemo(() => {
        if (!currentQuestion?.id) return [];
        return unlockedHints.filter(h => h.questionId === currentQuestion.id);
    }, [unlockedHints, currentQuestion?.id]);

    // In case the student already submitted, they don't need the security screen and can be considered "started"
    useEffect(() => {
        if (isSubmitted) {
            setHasStarted(true);
        }
    }, [isSubmitted]);
// Conexión Server-Sent Events (SSE) para recibir cambios del docente en tiempo real
    useEffect(() => {
        if (!mounted || !currentAttempt?.id || isSubmitted) return;

        let eventSource: EventSource | null = null;
        let isCancelled = false;

        try {
            eventSource = new EventSource(`/api/evaluations/${currentAttempt.id}/events`);

            eventSource.onopen = () => {
                if (!isCancelled) setIsLiveConnected(true);
            };

            const processTeacherMessage = (data: any) => {
                const targetMatches = 
                    (!data.studentId && !data.submissionId) ||
                    data.studentId === studentId ||
                    data.submissionId === submission?.id;

                if (targetMatches && data.message) {
                    setTeacherMessageModal({
                        message: data.message,
                        senderName: data.senderName || "El Profesor",
                        timestamp: data.timestamp || Date.now(),
                    });
                    try {
                        if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
                            navigator.vibrate([150, 100, 150]);
                        }
                    } catch {}
                }
            };

            eventSource.addEventListener("evaluation-updated", (event: MessageEvent) => {
                if (isCancelled) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data?.type === "TEACHER_MESSAGE") {
                        processTeacherMessage(data);
                        return;
                    }
                    if (data?.type === "EVALUATION_LOCKED") {
                        setIsAttemptLocked(true);
                        return;
                    }
                    if (data?.type === "EVALUATION_UNLOCKED") {
                        setIsAttemptLocked(false);
                        return;
                    }
                    handleRefreshEvaluation(true, data?.message);
                } catch {
                    handleRefreshEvaluation(true);
                }
            });

            eventSource.addEventListener("teacher-message", (event: MessageEvent) => {
                if (isCancelled) return;
                try {
                    const data = JSON.parse(event.data);
                    processTeacherMessage(data);
                } catch (err) {
                    console.error("Error al procesar teacher-message SSE:", err);
                }
            });

            eventSource.onerror = () => {
                if (!isCancelled) setIsLiveConnected(false);
            };
        } catch (err) {
            console.error("SSE connection error:", err);
        }

        return () => {
            isCancelled = true;
            if (eventSource) {
                eventSource.close();
            }
            setIsLiveConnected(false);
        };
    }, [mounted, currentAttempt?.id, isSubmitted]);


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
                triggerExpulsion("resize");
            }
        };

        const handleTabLeave = () => {
            // Si blockTabSwitch está desactivado, el sistema NO registra nada
            if (!blockTabSwitch) return;
            if (hasStarted && !isSubmitted && !tabLeaveTimeRef.current) {
                tabLeaveTimeRef.current = Date.now();
            }
        };

        const handleTabReturn = () => {
            // Si blockTabSwitch está desactivado, el sistema NO registra nada
            if (!blockTabSwitch) return;
            if (hasStarted && !isSubmitted && tabLeaveTimeRef.current > 0) {
                const leftAtMs = tabLeaveTimeRef.current;
                tabLeaveTimeRef.current = 0;
                const duration = Math.round((Date.now() - leftAtMs) / 1000);
                if (duration >= 1) {
                    const qIdx = activeQuestionIdxRef.current + 1;
                    const qTitle = currentQuestionRef.current?.text?.substring(0, 60) || `Pregunta ${qIdx}`;
                    const leftAtISO = new Date(leftAtMs).toISOString();
                    const returnedAtISO = new Date().toISOString();

                    registerTabSwitchLogAction({
                        submissionId: submission.id,
                        durationSeconds: duration,
                        questionNumber: qIdx,
                        questionTitle: qTitle,
                        leftAt: leftAtISO,
                        returnedAt: returnedAtISO,
                    }).then((res) => {
                        if (res?.success) {
                            tabSwitchesCountRef.current = res.tabSwitchesCount;
                            setTabSwitchesCount(res.tabSwitchesCount);
                            setTotalTimeAwaySeconds(res.totalTimeAwaySeconds);
                            if (res.logEntry) {
                                setTabSwitchLogs((prev) => [...prev, res.logEntry]);
                            }
                        }
                    }).catch((err) => {
                        console.error("Error al registrar salida de pestaña:", err);
                    });
                }
            }
        };

        const handleVisibilityChange = () => {
            if (!blockTabSwitch) return;
            if (document.visibilityState === 'hidden') {
                handleTabLeave();
            } else if (document.visibilityState === 'visible') {
                handleTabReturn();
            }
        };

        const handleBlur = () => {
            if (!blockTabSwitch) return;
            if (hasStarted && !isHelpModeRef.current) {
                handleTabLeave();
            }
        };

        const handleFocus = () => {
            if (!blockTabSwitch) return;
            handleTabReturn();
        };

        const handleScreenChange = () => {
            if (!blockMultipleDisplays) return;
            if (hasStarted && (window.screen as any).isExtended) {
                triggerExpulsion("multi_screen");
            }
        };

        if (requireFullscreen) window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        if (blockMultipleDisplays) {
            (window.screen as any).addEventListener?.('change', handleScreenChange);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            (window.screen as any).removeEventListener?.('change', handleScreenChange);
        };
    }, [mounted, isSubmitted, hasStarted, surveillanceEnabled, blockTabSwitch, requireFullscreen, blockMultipleDisplays, maxExitTimeSeconds, triggerExpulsion]);


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
        activeQuestionIdxRef.current = activeQuestionIdx;
    }, [currentQuestion, activeQuestionIdx]);

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
    const [activeTab, setActiveTab] = useState<"answer" | "feedback" | "hints">("answer");

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

    const timeEnd = useMemo(() => new Date(currentAttempt.endTime), [currentAttempt.endTime]);
    const maxSupportAttempts = currentAttempt.maxSupportAttempts ?? currentAttempt.evaluation?.maxSupportAttempts ?? 3;
    const aiSupportDelaySeconds = currentAttempt.aiSupportDelaySeconds ?? currentAttempt.evaluation?.aiSupportDelaySeconds ?? 60;

    // Asegurar que el índice de pregunta se mantenga válido si el profesor edita la cantidad de preguntas
    useEffect(() => {
        if (questions.length > 0 && activeQuestionIdx >= questions.length) {
            setActiveQuestionIdx(Math.max(0, questions.length - 1));
        }
    }, [questions.length, activeQuestionIdx]);

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

            // Si el profesor otorgó más tiempo, reactivar temporizador y desbloquear auto-envío
            if (hasAutoSubmitted.current && !isSubmitted) {
                hasAutoSubmitted.current = false;
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
        return (
            <EvaluationPreExamBarrier
                attempt={attempt}
                currentAttempt={currentAttempt}
                questions={questions}
                themes={themes}
                mounted={mounted}
                theme={theme}
                surveillanceEnabled={surveillanceEnabled}
                blockTabSwitch={blockTabSwitch}
                requireFullscreen={requireFullscreen}
                blockMultipleDisplays={blockMultipleDisplays}
                maxExitTimeSeconds={maxExitTimeSeconds}
                tabSwitchesCount={tabSwitchesCount}
                totalTimeAwaySeconds={totalTimeAwaySeconds}
                hasExitTimeAlert={hasExitTimeAlert}
                hasHelpUrl={Boolean(attempt.helpUrl)}
                maxAiHints={maxAiHints}
                isMobile={isMobile}
                hasMultipleScreens={hasMultipleScreens}
                isMaximized={isMaximized}
                expulsionReason={expulsionReason}
                expulsionsCount={expulsionsCount}
                onStart={() => {
                    setExpulsionReason(null);
                    setHasStarted(true);
                }}
                onBack={() => router.push(`/dashboard/student?courseId=${attempt.courseId}&tab=evaluations`)}
                onOpenTabSwitchesModal={() => setShowTabSwitchesModal(true)}
            />
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
        if (!currentQuestion?.id) return;
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
            setActiveTab("answer");
            return;
        }

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
        } catch (error: any) {
            console.error("Error al evaluar con IA:", error);
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
            const res = await requestAiHintAction(submission.id, currentQuestion.id, answers[currentQuestion.id] || "");
            setAiHintsUsed(prev => prev + 1);
            if (res.hint) {
                const newHintEntry = {
                    questionId: currentQuestion.id,
                    hint: res.hint,
                    usedAt: new Date().toISOString()
                };
                setUnlockedHints(prev => [...prev, newHintEntry]);
            }
            setActiveTab("hints");
        } catch (error: any) {
            console.error("Error al obtener pista:", error);
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

                    {/* Indicador de Vigilancia de la Evaluación */}
                    {surveillanceEnabled && !isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs cursor-help",
                                    hasExitTimeAlert
                                        ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" 
                                        : "bg-primary/10 text-primary border-primary/20"
                                )}>
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] uppercase font-bold hidden sm:inline">
                                        {blockTabSwitch ? "Supervisión Activa" : "Vigilancia Básica"}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end" className="max-w-xs sm:max-w-sm p-3.5 space-y-2.5 bg-popover/95 backdrop-blur-md shadow-xl border-border">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                                    <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
                                    <div>
                                        <p className="font-bold text-xs text-foreground leading-tight">Medidas de Seguridad de la Evaluación</p>
                                        <p className="text-[10px] text-muted-foreground">Estado de las restricciones configuradas por el docente:</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-[11px] text-left">
                                    <div className="flex items-start gap-2">
                                        {blockTabSwitch ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <span className="font-semibold text-foreground">
                                                Control de Salidas y Pestañas:
                                            </span>{" "}
                                            <span className="text-muted-foreground">
                                                {blockTabSwitch 
                                                    ? `Habilitado (se registran salidas y tiempo fuera. Límite de alerta docente: ${Math.max(1, Math.round(maxExitTimeSeconds / 60))} min).` 
                                                    : "Deshabilitado (el sistema no registra salidas ni tiempo fuera)."}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        {requireFullscreen ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <span className="font-semibold text-foreground">Pantalla Maximizada:</span>{" "}
                                            <span className="text-muted-foreground">
                                                {requireFullscreen 
                                                    ? "Habilitada (se solicita mantener la ventana maximizada)." 
                                                    : "Deshabilitada (modo ventana normal permitido)."}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        {blockMultipleDisplays ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <span className="font-semibold text-foreground">Múltiples Monitores:</span>{" "}
                                            <span className="text-muted-foreground">
                                                {blockMultipleDisplays 
                                                    ? "Supervisado (se avisa si detecta pantallas secundarias)." 
                                                    : "Permitido (pantallas secundarias permitidas)."}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {!surveillanceEnabled && !isSubmitted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-help">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] uppercase font-bold hidden sm:inline">Modo Libre</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end" className="max-w-xs sm:max-w-sm p-3.5 space-y-2 text-left bg-popover/95 backdrop-blur-md shadow-xl border-border">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-xs text-foreground leading-tight">Modo Libre de Vigilancia</p>
                                        <p className="text-[10px] text-muted-foreground">Medidas de seguridad:</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                        <span>Sin expulsión por pérdida de foco ni cambio de ventana.</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <XCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                        <span>Sin restricción de pantalla completa ni monitores.</span>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {blockTabSwitch && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    onClick={() => setShowTabSwitchesModal(true)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-bold transition-all shadow-2xs select-none cursor-pointer",
                                        hasExitTimeAlert
                                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40"
                                            : tabSwitchesCount > 0
                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                                : "bg-muted/30 text-muted-foreground border-border/50"
                                    )}
                                >
                                    {hasExitTimeAlert ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    ) : (
                                        <ExternalLink className={cn("w-3.5 h-3.5 shrink-0", tabSwitchesCount > 0 ? "text-amber-500" : "text-muted-foreground")} />
                                    )}
                                    <span className="text-[10px] uppercase hidden sm:inline">Salidas:</span>
                                    <span className="font-mono font-black">{tabSwitchesCount}</span>
                                    {tabSwitchesCount > 0 && (
                                        <span className="text-[10px] opacity-80 font-normal font-mono hidden md:inline">({formatDurationHMS(totalTimeAwaySeconds)})</span>
                                    )}
                                    {hasExitTimeAlert && (
                                        <span className="text-[9px] uppercase font-black bg-red-600 text-white px-1 py-0.2 rounded ml-0.5">Alerta</span>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="end" className="max-w-xs p-3.5 space-y-2 bg-popover/95 backdrop-blur-md shadow-xl border-border text-left">
                                <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                    <div className="flex items-center gap-1.5">
                                        {hasExitTimeAlert ? (
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        ) : (
                                            <ExternalLink className="w-4 h-4 text-amber-500 shrink-0" />
                                        )}
                                        <span className="font-bold text-xs text-foreground">Control de Salidas</span>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                                        hasExitTimeAlert 
                                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" 
                                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                    )}>
                                        {tabSwitchesCount} {tabSwitchesCount === 1 ? 'salida' : 'salidas'} • {formatDurationHMS(totalTimeAwaySeconds)}
                                    </span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-[11px]">Veces que salió:</span>
                                        <span className="font-bold font-mono text-foreground">
                                            {tabSwitchesCount} {tabSwitchesCount === 1 ? "vez" : "veces"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-[11px]">Tiempo acumulado fuera:</span>
                                        <span className={cn("font-bold font-mono", hasExitTimeAlert ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                                            {formatDurationHMS(totalTimeAwaySeconds)} ({formatDurationHuman(totalTimeAwaySeconds)})
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-[11px]">Límite de alerta docente:</span>
                                        <span className="font-bold font-mono text-muted-foreground">
                                            {Math.max(1, Math.round(maxExitTimeSeconds / 60))} min
                                        </span>
                                    </div>
                                </div>
                                {hasExitTimeAlert ? (
                                    <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-600 dark:text-red-400 font-medium">
                                        ⚠️ <strong>Límite superado:</strong> Has acumulado más tiempo del permitido fuera de la prueba. El docente tiene registrada esta alerta.
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
                                        👁️ Clic para ver historial completo de salidas registradas.
                                    </p>
                                )}
                            </TooltipContent>
                        </Tooltip>
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
                                            "group flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold transition-all border cursor-pointer shadow-2xs",
                                            aiHintsUsed >= maxAiHints
                                                ? "bg-muted/60 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                                        )}
                                    >
                                        {isUsingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                        <span className="hidden md:inline font-semibold">Pista IA</span>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                                            aiHintsUsed >= maxAiHints ? "bg-muted text-muted-foreground" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                        )}>
                                            {maxAiHints - aiHintsUsed}
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>💡 Pista de IA — Obtén una orientación conceptual ({maxAiHints - aiHintsUsed} disponibles)</TooltipContent>
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
                        {isLiveConnected ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="h-7 px-2 rounded-md select-none text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-default">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[11px] font-medium hidden md:inline">
                                            En vivo
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Conectado en tiempo real (SSE) — Los cambios del profesor se reflejan automáticamente
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRefreshEvaluation(false)}
                                        disabled={isRefreshing}
                                        className="h-7 px-2 rounded-md cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/40"></span>
                                        </span>
                                        <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-primary")} />
                                        <span className="text-[11px] font-medium hidden md:inline">
                                            Reconectar
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    {isRefreshing ? "Reconectando..." : "Conexión desconectada. Haz clic para reconectar y sincronizar"}
                                </TooltipContent>
                            </Tooltip>
                        )}
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
                                {currentAttempt.evaluation?.title && (
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

                            {/* Derecha: Tipo de Pregunta y Acceso Rápido a Pistas */}
                            <div className="flex items-center gap-2 shrink-0">
                                {!isSubmitted && maxAiHints > 0 && (
                                    currentQuestionHints.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("hints")}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer shadow-2xs"
                                            title="Ver pistas desbloqueadas para esta pregunta"
                                        >
                                            <Lightbulb className="w-3 h-3 text-amber-500" />
                                            <span>{currentQuestionHints.length} {currentQuestionHints.length === 1 ? "Pista" : "Pistas"}</span>
                                        </button>
                                    ) : aiHintsUsed < maxAiHints ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowHintConfirm(true)}
                                            disabled={isUsingHint}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
                                            title={`Pedir pista de IA (${maxAiHints - aiHintsUsed} disponibles)`}
                                        >
                                            <Lightbulb className="w-3 h-3 text-amber-500" />
                                            <span className="hidden sm:inline">Pista IA</span>
                                        </button>
                                    ) : null
                                )}
                                <span className="text-[11px] uppercase font-bold px-2.5 py-1 bg-muted rounded-md tracking-wider text-muted-foreground border border-border">
                                    {currentQuestion.type === 'Text' ? 'TEXTO' : 'CÓDIGO'}
                                </span>
                            </div>
                        </div>

                    {/* Question Statement (Markdown) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6" data-color-mode={mounted && theme === "dark" ? "dark" : "light"}>
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none transition-all duration-200 text-foreground select-text"
                            style={{ fontSize: `${14 * zoomLevel}px` }}
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
                    <div className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-border shrink-0 bg-muted/20 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="bg-muted text-muted-foreground inline-flex h-8 items-center justify-center rounded-lg p-[3px]">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("answer")}
                                        className={cn(
                                            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                                            activeTab === "answer"
                                                ? "bg-background text-foreground shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Tu Respuesta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => hasAI && setActiveTab("feedback")}
                                        disabled={!hasAI}
                                        className={cn(
                                            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-40",
                                            activeTab === "feedback"
                                                ? "bg-background text-foreground shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Feedback IA
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("hints")}
                                        className={cn(
                                            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                                            activeTab === "hints"
                                                ? "bg-background text-foreground shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Pistas</span>
                                        {currentQuestionHints.length > 0 && (
                                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                                {currentQuestionHints.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
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

                        <div className="flex-1 overflow-hidden relative h-full flex flex-col">
                            {/* Answer Tab */}
                            <div 
                                className={cn(
                                    "h-full m-0 flex flex-col flex-1",
                                    activeTab !== "answer" && "hidden"
                                )}
                            >
                                {currentQuestion?.type === "Target" || currentQuestion?.type === "Text" ? (
                                    <TextAnswerEditor
                                        key={currentQuestion.id}
                                        questionId={currentQuestion.id}
                                        initialValue={answers[currentQuestion?.id] || ""}
                                        onAnswerChange={handleAnswerChange}
                                        onSaveCurrent={handleSaveCurrent}
                                        disabled={isSubmitted}
                                        zoomLevel={zoomLevel}
                                        placeholder={isSubmitted ? "No hubo respuesta provista." : "Escribe tu respuesta detallada aquí..."}
                                    />
                                ) : (
                                    <CodeAnswerEditor
                                        key={currentQuestion.id}
                                        questionId={currentQuestion.id}
                                        language={currentQuestion.language || "javascript"}
                                        initialValue={answers[currentQuestion.id] || ""}
                                        onAnswerChange={handleAnswerChange}
                                        onSaveCurrent={handleSaveCurrent}
                                        disabled={isSubmitted}
                                        zoomLevel={zoomLevel}
                                        theme={mounted && theme === "dark" ? "vs-dark" : "light"}
                                        editorRef={editorRef}
                                        isActiveTab={activeTab === "answer"}
                                    />
                                )}
                            </div>

                            {/* Feedback Tab */}
                            <div className={cn(
                                "h-full m-0 p-6 overflow-y-auto bg-muted/5",
                                activeTab !== "feedback" && "hidden"
                            )}>
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
                            </div>

                            {/* Hints Tab */}
                            <div className={cn(
                                "h-full m-0 p-4 md:p-6 overflow-y-auto bg-muted/5 flex flex-col",
                                activeTab !== "hints" && "hidden"
                            )}>
                                {currentQuestionHints.length > 0 ? (
                                    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
                                        <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                                    <Lightbulb className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-xs sm:text-sm text-foreground">
                                                        Pistas de esta Pregunta
                                                    </h3>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {currentQuestionHints.length} {currentQuestionHints.length === 1 ? "pista desbloqueada" : "pistas desbloqueadas"} • Guardadas permanentemente
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isSubmitted && maxAiHints > aiHintsUsed && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => setShowHintConfirm(true)}
                                                        disabled={isUsingHint}
                                                        className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs h-7 px-2.5 gap-1 shadow-xs cursor-pointer"
                                                    >
                                                        {isUsingHint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                                                        <span>Otra pista</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {currentQuestionHints.map((hintItem, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5 shadow-xs relative overflow-hidden group"
                                            >
                                                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-200">
                                                            Pista #{idx + 1}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(hintItem.usedAt), "HH:mm:ss", { locale: es })}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const key = `hint-tab-${idx}`;
                                                            navigator.clipboard.writeText(hintItem.hint);
                                                            setCopiedHintKey(key);
                                                            setTimeout(() => setCopiedHintKey(prev => prev === key ? null : prev), 2000);
                                                        }}
                                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-500/10 gap-1.5 cursor-pointer"
                                                    >
                                                        {copiedHintKey === `hint-tab-${idx}` ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Copiado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5" />
                                                                <span className="text-[11px]">Copiar</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>

                                                <div
                                                    className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-amber-700 dark:[&_h3]:text-amber-300 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:first:mt-0 [&_p]:my-2.5 [&_p]:leading-relaxed [&_li]:my-1.5 [&_ol]:my-2.5 [&_ul]:my-2.5 bg-card/60 rounded-xl p-4 border border-amber-500/20"
                                                    data-color-mode={mounted && theme === "dark" ? "dark" : "light"}
                                                    style={{ fontSize: `${14 * zoomLevel}px` }}
                                                >
                                                    <MDEditor.Markdown
                                                        source={formatHintMarkdown(hintItem.hint)}
                                                        style={{ backgroundColor: "transparent", fontSize: "inherit" }}
                                                    />
                                                </div>

                                                <div className="mt-3 pt-2 border-t border-amber-500/15 flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span>💡 Orientación pedagógica generada por IA</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Disponible durante toda la prueba</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 text-center py-12 px-4 max-w-md mx-auto">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-3.5">
                                            <Lightbulb className="w-7 h-7" />
                                        </div>
                                        <h3 className="font-bold text-base text-foreground mb-1">
                                            Sin pistas para esta pregunta
                                        </h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                                            Si estás atascado o necesitas orientación conceptual para estructurar tu respuesta, puedes solicitar una pista pedagógica de IA. Quedará guardada permanentemente en esta pregunta para que puedas consultarla cuando quieras.
                                        </p>
                                        {!isSubmitted && maxAiHints > aiHintsUsed ? (
                                            <Button
                                                type="button"
                                                onClick={() => setShowHintConfirm(true)}
                                                disabled={isUsingHint}
                                                className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs h-9 px-4 gap-2 shadow-xs cursor-pointer"
                                            >
                                                {isUsingHint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                                                <span>Solicitar Pista de IA ({maxAiHints - aiHintsUsed} disponibles)</span>
                                            </Button>
                                        ) : maxAiHints === 0 ? (
                                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full border">
                                                Las pistas de IA no están habilitadas para esta evaluación.
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                                                Has utilizado las {maxAiHints} pistas disponibles en este intento.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
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
                    </div>
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

                            {/* Salidas y Tiempo Fuera */}
                            {blockTabSwitch && (
                                <div className={cn(
                                    "p-3 rounded-xl border flex flex-col justify-between",
                                    hasExitTimeAlert 
                                        ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" 
                                        : tabSwitchesCount > 0
                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                            : "bg-muted/30 border-border/80 text-muted-foreground"
                                )}>
                                    <span className="text-[10px] uppercase font-bold">Salidas de Pantalla</span>
                                    <div className="flex items-baseline gap-1 my-1">
                                        <span className={cn("text-2xl font-black", hasExitTimeAlert ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                            {tabSwitchesCount}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{tabSwitchesCount === 1 ? 'salida' : 'salidas'}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold flex items-center gap-1">
                                        {hasExitTimeAlert ? (
                                            <>
                                                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                                <span>⚠️ Límite superado ({formatDurationHMS(totalTimeAwaySeconds)})</span>
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
                                                <span>{formatDurationHMS(totalTimeAwaySeconds)} fuera</span>
                                            </>
                                        )}
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

            {/* Modal de Lectura Obligatoria de Mensaje del Docente vía SSE */}
            <Dialog 
                open={!!teacherMessageModal} 
                onOpenChange={(open) => {
                    if (!open && messageCountdown === 0) {
                        setTeacherMessageModal(null);
                    }
                }}
            >
                <DialogContent 
                    className="sm:max-w-lg border-2 border-blue-500/40 shadow-2xl bg-card p-6"
                    showCloseButton={false}
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shrink-0 animate-pulse">
                                <MessageSquare className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold uppercase tracking-wider mb-1">
                                    Mensaje del Docente • En Vivo
                                </Badge>
                                <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                                    Comunicado Importante
                                </DialogTitle>
                            </div>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                            <span>De: <strong className="text-foreground">{teacherMessageModal?.senderName}</strong></span>
                            <span>•</span>
                            <span>Lectura obligatoria durante la evaluación</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-4 space-y-3">
                        <div className="p-4 rounded-xl bg-muted/60 border border-border/80 text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto select-text shadow-inner">
                            {teacherMessageModal?.message}
                        </div>

                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                            <span>
                                {messageCountdown > 0 ? (
                                    <>Por motivos de seguridad académica, debes leer este mensaje. Podrás cerrarlo en <strong>{messageCountdown} segundos</strong>.</>
                                ) : (
                                    <>Has completado el tiempo de lectura obligatorio. Ya puedes continuar con la evaluación.</>
                                )}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            disabled={messageCountdown > 0}
                            onClick={() => setTeacherMessageModal(null)}
                            className={cn(
                                "w-full h-10 font-bold transition-all cursor-pointer gap-2",
                                messageCountdown > 0
                                    ? "opacity-60 cursor-not-allowed bg-muted text-muted-foreground border"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg"
                            )}
                        >
                            {messageCountdown > 0 ? (
                                <>
                                    <Clock className="w-4 h-4 animate-spin text-amber-500" />
                                    <span>Entendido ({messageCountdown}s)</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Entendido y Continuar Evaluación</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Historial de Salidas a Otras Pestañas (para el Estudiante) */}
            <EvaluationTabSwitchesModal
                open={showTabSwitchesModal}
                onOpenChange={setShowTabSwitchesModal}
                tabSwitchesCount={tabSwitchesCount}
                totalTimeAwaySeconds={totalTimeAwaySeconds}
                maxExitTimeSeconds={maxExitTimeSeconds}
                hasExitTimeAlert={hasExitTimeAlert}
                tabSwitchLogs={tabSwitchLogs}
            />

            {/* Pantalla de Bloqueo / Pausa de Evaluación impuesta por el Docente */}
            {isAttemptLocked && (
                <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-5 shadow-2xl animate-pulse">
                        <Lock className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2">
                        Evaluación Pausada por el Docente
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-lg mb-6 leading-relaxed">
                        El profesor ha puesto en pausa temporalmente la evaluación para toda la clase.
                        Tus respuestas y avances guardados se encuentran 100% a salvo. La prueba se reanudará en cuanto el docente la desbloquee.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <span>Esperando reanudación en vivo...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
