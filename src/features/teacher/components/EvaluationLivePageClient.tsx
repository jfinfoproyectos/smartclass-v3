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

    const isRefreshingRef = useRef(false);
    isRefreshingRef.current = isRefreshing;

    const intervalSecRef = useRef(refreshIntervalSec);
    intervalSecRef.current = refreshIntervalSec;

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

    // Manejar cambio de intervalo
    const handleIntervalChange = (newInterval: number) => {
        setRefreshIntervalSec(newInterval);
        setSecondsUntilRefresh(newInterval);
    };

    // Temporizador periódico de cuenta regresiva y auto-refresco
    useEffect(() => {
        if (!autoRefresh) return;

        let secondsRemaining = refreshIntervalSec;
        setSecondsUntilRefresh(refreshIntervalSec);

        const timer = setInterval(() => {
            secondsRemaining -= 1;
            if (secondsRemaining <= 0) {
                secondsRemaining = refreshIntervalSec;
                setSecondsUntilRefresh(refreshIntervalSec);
                fetchSubmissions(false);
            } else {
                setSecondsUntilRefresh(secondsRemaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [autoRefresh, refreshIntervalSec, fetchSubmissions]);

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
        />
    );
}
