"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EvaluationLiveMonitor } from "./EvaluationLiveMonitor";
import { getAttemptSubmissionsAction } from "@/features/teacher/actions/evaluationActions";
import { toast } from "sonner";

interface EvaluationLivePageClientProps {
    courseId: string;
    attemptId: string;
    initialSubmissions: any[];
    attempt: any;
    courseName: string;
    evaluationTitle: string;
    initialMode: "teacher" | "projector";
}

export function EvaluationLivePageClient({
    courseId,
    attemptId,
    initialSubmissions,
    attempt,
    courseName,
    evaluationTitle,
    initialMode
}: EvaluationLivePageClientProps) {
    const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshIntervalSec, setRefreshIntervalSec] = useState(10);
    const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [isLocked, setIsLocked] = useState<boolean>(!!attempt?.isLocked);

    const isRefreshingRef = useRef(false);
    isRefreshingRef.current = isRefreshing;

    const intervalSecRef = useRef(refreshIntervalSec);
    intervalSecRef.current = refreshIntervalSec;

    const lastEventTimeRef = useRef(0);

    const fetchSubmissions = useCallback(async (isManual = false) => {
        if (isRefreshingRef.current) return;
        setIsRefreshing(true);
        try {
            const res = await getAttemptSubmissionsAction(attemptId);
            if (res.success && res.submissions) {
                setSubmissions(res.submissions);
                setLastRefreshedAt(new Date());
                if (isManual) {
                    toast.success("Avance actualizado con éxito", { duration: 2500 });
                }
            } else if (isManual) {
                toast.error(res.error || "No se pudo actualizar el avance");
            }
        } catch (err: any) {
            console.error("Error al refrescar entregas en vivo:", err);
            if (isManual) {
                toast.error("Ocurrió un error al contactar al servidor");
            }
        } finally {
            setIsRefreshing(false);
            setSecondsUntilRefresh(intervalSecRef.current);
        }
    }, [attemptId]);

    // Conexión Server-Sent Events (SSE) para actualizaciones instantáneas en tiempo real
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;

        const connectSSE = () => {
            try {
                eventSource = new EventSource(`/api/evaluations/${attemptId}/events`);

                eventSource.onopen = () => {
                    setIsLiveConnected(true);
                };

                eventSource.addEventListener("connected", () => {
                    setIsLiveConnected(true);
                });

                eventSource.addEventListener("evaluation-updated", (event: MessageEvent) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data?.type === "EVALUATION_LOCKED") {
                            setIsLocked(true);
                        } else if (data?.type === "EVALUATION_UNLOCKED") {
                            setIsLocked(false);
                        }
                    } catch {}

                    const now = Date.now();
                    // Debounce de 400ms para evitar avalanchas de peticiones concurrentes
                    if (now - lastEventTimeRef.current > 400) {
                        lastEventTimeRef.current = now;
                        fetchSubmissions(false);
                    }
                });

                eventSource.addEventListener("teacher-message", () => {
                    fetchSubmissions(false);
                });

                eventSource.onerror = () => {
                    setIsLiveConnected(false);
                    if (eventSource) {
                        eventSource.close();
                        eventSource = null;
                    }
                    reconnectTimeout = setTimeout(connectSSE, 4000);
                };
            } catch (err) {
                console.error("Error al conectar SSE en monitor:", err);
                setIsLiveConnected(false);
                reconnectTimeout = setTimeout(connectSSE, 5000);
            }
        };

        connectSSE();

        return () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
        };
    }, [attemptId, fetchSubmissions]);

    // Manejar cambio de intervalo (para modo offline / fallback)
    const handleIntervalChange = (newInterval: number) => {
        setRefreshIntervalSec(newInterval);
        setSecondsUntilRefresh(newInterval);
    };

    // Respaldo pasivo periódico: con SSE activo corre cada 45s, en fallback según refreshIntervalSec
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = isLiveConnected ? 45 : refreshIntervalSec;
        let secondsRemaining = interval;
        setSecondsUntilRefresh(interval);

        const timer = setInterval(() => {
            secondsRemaining -= 1;
            if (secondsRemaining <= 0) {
                secondsRemaining = interval;
                setSecondsUntilRefresh(interval);
                fetchSubmissions(false);
            } else {
                setSecondsUntilRefresh(secondsRemaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [autoRefresh, isLiveConnected, refreshIntervalSec, fetchSubmissions]);

    return (
        <EvaluationLiveMonitor
            courseId={courseId}
            attemptId={attemptId}
            submissions={submissions}
            questions={attempt.evaluation?.questions || []}
            startTime={attempt.startTime}
            endTime={attempt.endTime}
            courseName={courseName}
            evaluationTitle={evaluationTitle}
            initialMode={initialMode}
            isStandalonePage={true}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={setAutoRefresh}
            refreshIntervalSec={refreshIntervalSec}
            secondsUntilRefresh={secondsUntilRefresh}
            onChangeRefreshInterval={handleIntervalChange}
            onRefreshManual={() => {
                setSecondsUntilRefresh(refreshIntervalSec);
                fetchSubmissions(true);
            }}
            isRefreshing={isRefreshing}
            lastRefreshedAt={lastRefreshedAt}
            isLiveConnected={isLiveConnected}
            isLocked={isLocked}
            evaluationId={attempt?.evaluationId}
        />
    );
}
