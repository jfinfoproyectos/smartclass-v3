"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
} from "chart.js";
import { Bar, Doughnut, Pie, Scatter } from "react-chartjs-2";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Wand2, ShieldAlert, AlertTriangle, Maximize2, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getGroupAIInsightsAction, getPlagiarismAnalysisAction } from "@/features/teacher/actions/evaluationActions";
import { pdf } from "@react-pdf/renderer";
import { AIInsightsPDF } from "./AIInsightsPDF";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

function CountUp({ value, duration = 1 }: { value: number, duration?: number }) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => latest.toFixed(value % 1 === 0 ? 0 : 2));

    useEffect(() => {
        const controls = animate(count, value, { duration, ease: "easeOut" });
        return controls.stop;
    }, [value, count, duration]);

    return <motion.span>{rounded}</motion.span>;
}

interface EvaluationStatsProps {
    submissions: any[];
    totalQuestions: number;
    questions?: Array<{ id: string; text: string; type: string }>;
    evaluationId: string;
    attemptId: string;
    courseId: string;
    courseName: string;
    teacherName: string;
}

function generateColors(count: number) {
    const palette = [
        "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
        "#06b6d4", "#f97316", "#10b981", "#ec4899", "#64748b",
        "#a855f7", "#0ea5e9", "#84cc16", "#e11d48", "#14b8a6",
        "#f43f5e", "#6366f1", "#d97706", "#2dd4bf", "#fb923c",
    ];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

const BUCKET_LABELS = ["0 – 1", "1 – 2", "2 – 3", "3 – 4", "4 – 5"];
const BUCKET_COLORS_BG = [
    "rgba(239,68,68,0.75)", "rgba(249,115,22,0.75)",
    "rgba(234,179,8,0.75)", "rgba(34,197,94,0.75)", "rgba(16,185,129,0.75)",
];

interface ModalState {
    open: boolean;
    title: string;
    students: { id: string; name: string; email: string; score: number | null; submitted: boolean }[];
}

export function EvaluationStats({
    submissions, totalQuestions, questions = [], evaluationId, attemptId, courseId, courseName, teacherName
}: EvaluationStatsProps) {
    const [modal, setModal] = useState<ModalState>({ open: false, title: "", students: [] });
    const [questionModal, setQuestionModal] = useState<{
        open: boolean;
        index: number;
        text: string;
        avg: number | null;
        type: string;
    }>({ open: false, index: 0, text: "", avg: null, type: "" });

    const [aiInsights, setAiInsights] = useState<{ loading: boolean }>({
        loading: false,
    });

    const [plagiarismData, setPlagiarismData] = useState<{ matches: any[]; loading: boolean }>({
        matches: [],
        loading: false,
    });

    const [expandedChart, setExpandedChart] = useState<{
        open: boolean;
        title: string;
        component: React.ReactNode;
    }>({ open: false, title: "", component: null });

    const handlePlagiarismAnalysis = async () => {
        setPlagiarismData({ ...plagiarismData, loading: true });
        try {
            const results = await getPlagiarismAnalysisAction(attemptId);
            setPlagiarismData({ matches: results, loading: false });
        } catch (error: any) {
            console.error("Plagiarism analysis error:", error);
            setPlagiarismData({ matches: [], loading: false });
            alert(`Error en análisis de plagio: ${error.message}`);
        }
    };

    const handleGetAIInsights = async () => {
        setAiInsights({ loading: true });
        try {
            const insights = await getGroupAIInsightsAction(evaluationId, attemptId);

            // Generate PDF
            const blob = await pdf(
                <AIInsightsPDF
                    evaluationTitle={questions.length > 0 ? "Resultados de Evaluación" : "Evaluación"} // We don't have the title here easily but we can use a placeholder or pass it
                    courseName={courseName}
                    teacherName={teacherName}
                    insights={insights}
                    stats={{
                        avgScore: avgScore.toFixed(2),
                        passRate: ((passCount / submitted.length) * 100).toFixed(1),
                        totalStudents: submissions.length
                    }}
                    plagiarismMatches={plagiarismData.matches}
                />
            ).toBlob();

            // Download PDF
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `AI_Insights_${evaluationId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setAiInsights({ loading: false });
        } catch (error: any) {
            console.error("Error generating insights:", error);
            setAiInsights({ loading: false });
            alert(`Error al generar el reporte: ${error.message}`);
        }
    };

    const submitted = submissions.filter(s => s.submittedAt);
    const inProgress = submissions.filter(s => !s.submittedAt);

    if (submissions.length === 0) return null;

    const scores = submitted.map(s => Number(s.score) || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 3.0).length;
    const failCount = scores.filter(s => s < 3.0).length;

    const buckets: any[][] = [[], [], [], [], []];
    submitted.forEach(s => {
        const score = Number(s.score) || 0;
        const idx = Math.min(Math.floor(score), 4);
        buckets[idx].push(s);
    });

    const openModal = (title: string, list: any[]) => {
        setModal({
            open: true,
            title,
            students: list.map(s => ({
                id: s.id,
                name: s.user?.name || "—",
                email: s.user?.email || "—",
                score: s.score !== undefined ? Number(s.score) : null,
                submitted: !!s.submittedAt,
            })),
        });
    };

    /* ── Bar chart (distribution) ── */
    const barData = {
        labels: BUCKET_LABELS,
        datasets: [{
            label: "Estudiantes",
            data: buckets.map(b => b.length),
            backgroundColor: BUCKET_COLORS_BG,
            borderColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"],
            borderWidth: 1.5,
            borderRadius: 4,
        }],
    };

    const barOptions: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(148,163,184,0.15)" } },
            x: { grid: { display: false } },
        },
        onClick: (_: any, elements: any[]) => {
            if (!elements.length) return;
            const i = elements[0].index;
            if (buckets[i].length > 0) openModal(`Rango ${BUCKET_LABELS[i]} (${buckets[i].length})`, buckets[i]);
        },
        onHover: (_: any, elements: any[], chart: any) => {
            chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        },
    };

    /* ── Doughnut chart ── */
    const doughnutCategories = [
        submitted.filter(s => (Number(s.score) || 0) >= 3.0),
        submitted.filter(s => (Number(s.score) || 0) < 3.0),
        inProgress,
    ];
    const doughnutLabels = ["Aprobados", "Reprobados", "En progreso"];

    const doughnutData = {
        labels: doughnutLabels,
        datasets: [{
            data: doughnutCategories.map(g => g.length),
            backgroundColor: ["rgba(34,197,94,0.8)", "rgba(239,68,68,0.8)", "rgba(148,163,184,0.8)"],
            borderColor: ["#22c55e", "#ef4444", "#94a3b8"],
            borderWidth: 2,
        }],
    };

    const doughnutOptions: any = {
        responsive: true, maintainAspectRatio: false, cutout: "60%",
        plugins: { legend: { position: "bottom", labels: { padding: 12, boxWidth: 12 } } },
        onClick: (_: any, elements: any[]) => {
            if (!elements.length) return;
            const i = elements[0].index;
            if (doughnutCategories[i].length > 0) openModal(`${doughnutLabels[i]}`, doughnutCategories[i]);
        },
        onHover: (_: any, elements: any[], chart: any) => {
            chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        },
    };

    /* ── Pie chart (per student) ── */
    const studentColors = generateColors(submitted.length);
    const pieData = {
        labels: submitted.map(s => `${s.user?.name || "Estudiante"} (${Number(s.score || 0).toFixed(2)})`),
        datasets: [{
            data: submitted.map(s => Number(s.score || 0).toFixed(2)),
            backgroundColor: studentColors.map(c => c + "cc"),
            borderColor: studentColors,
            borderWidth: 2,
        }],
    };

    const pieOptions: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: "right", labels: { padding: 10, boxWidth: 12, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx: any) => ` Nota: ${ctx.raw}` } },
        },
        onClick: (_: any, elements: any[]) => {
            if (!elements.length) return;
            const s = submitted[elements[0].index];
            if (s) openModal(s.user?.name || "Estudiante", [s]);
        },
        onHover: (_: any, elements: any[], chart: any) => {
            chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        },
    };

    /* ── Per-question performance ── */
    const questionAvgs = questions.map((q, index) => {
        const answersForQ = submitted
            .flatMap(s => (s.answersList || []))
            .filter((a: any) => a.questionId === q.id && a.score !== null);
        const avg = answersForQ.length > 0
            ? answersForQ.reduce((acc: number, a: any) => acc + Number(a.score), 0) / answersForQ.length
            : null;
        return { label: `P${index + 1}`, fullText: q.text, avg, type: q.type, id: q.id };
    });

    const BUCKET_COLORS_BORDER = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

    const questionChartData = {
        labels: questionAvgs.map(q => q.label),
        datasets: [{
            label: "Nota promedio",
            data: questionAvgs.map(q => q.avg !== null ? Number(q.avg.toFixed(2)) : 0),
            backgroundColor: questionAvgs.map(q =>
                q.avg === null ? "rgba(148,163,184,0.4)" : BUCKET_COLORS_BG[Math.min(Math.floor(q.avg), 4)]
            ),
            borderColor: questionAvgs.map(q =>
                q.avg === null ? "#94a3b8" : BUCKET_COLORS_BORDER[Math.min(Math.floor(q.avg), 4)]
            ),
            borderWidth: 1.5,
            borderRadius: 4,
        }],
    };

    const questionChartOptions: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items: any[]) => {
                        const idx = items[0].dataIndex;
                        return `Pregunta ${idx + 1}`;
                    },
                    label: (ctx: any) => ` Promedio: ${ctx.raw} / 5.0`,
                    afterLabel: (ctx: any) => {
                        const q = questionAvgs[ctx.dataIndex];
                        const truncated = q.fullText.replace(/```[\s\S]*?```/g, "[código]").trim().slice(0, 60);
                        return truncated + (q.fullText.length > 60 ? "…" : "");
                    },
                },
            },
        },
        scales: {
            y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: "rgba(148,163,184,0.15)" } },
            x: { grid: { display: false } },
        },
        onClick: (_: any, elements: any[]) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const q = questionAvgs[idx];
            if (q) {
                setQuestionModal({ open: true, index: idx, text: q.fullText, avg: q.avg, type: q.type });
            }
        },
        onHover: (_: any, elements: any[], chart: any) => {
            chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        },
    };

    /* ── Trend Bar: Nota vs Expulsiones ── */
    const trendLabels = ["0 Salidas", "1-2 Salidas", "3-5 Salidas", "6+ Salidas"];
    const trendGroups: any[][] = [[], [], [], []];

    submitted.forEach(s => {
        const e = s.expulsions || 0;
        if (e === 0) trendGroups[0].push(s);
        else if (e <= 2) trendGroups[1].push(s);
        else if (e <= 5) trendGroups[2].push(s);
        else trendGroups[3].push(s);
    });

    const trendAvgs = trendGroups.map(group => {
        if (group.length === 0) return 0;
        const sum = group.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
        return Number((sum / group.length).toFixed(2));
    });

    // Color gradient: Green to Red as risk increases
    const trendColorsBG = [
        "rgba(34,197,94,0.75)",  // Green
        "rgba(234,179,8,0.75)",  // Yellow
        "rgba(249,115,22,0.75)", // Orange
        "rgba(239,68,68,0.75)",  // Red
    ];
    const trendColorsBorder = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

    const trendData = {
        labels: trendLabels,
        datasets: [{
            label: "Nota Promedio",
            data: trendAvgs,
            backgroundColor: trendColorsBG,
            borderColor: trendColorsBorder,
            borderWidth: 1.5,
            borderRadius: 6,
        }]
    };

    const trendOptions: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => ` Nota Promedio: ${ctx.raw} / 5.0`,
                    afterLabel: (ctx: any) => ` Estudiantes: ${trendGroups[ctx.dataIndex].length}`
                }
            }
        },
        scales: {
            y: {
                min: 0, max: 5.1,
                title: { display: true, text: "Nota Promedio", color: "#64748b", font: { weight: 'bold' } },
                grid: { color: "rgba(148,163,184,0.1)" },
                ticks: { stepSize: 1 }
            },
            x: {
                grid: { display: false },
                title: { display: true, text: "Rango de Expulsiones", color: "#64748b", font: { weight: 'bold' } }
            }
        },
        onClick: (_: any, elements: any[]) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            if (trendGroups[idx].length > 0) {
                openModal(`Rango: ${trendLabels[idx]} (${trendGroups[idx].length} estudiantes)`, trendGroups[idx]);
            }
        },
        onHover: (_: any, elements: any[], chart: any) => {
            chart.canvas.style.cursor = elements.length ? "pointer" : "default";
        },
    };

    return (
        <div className="space-y-4 mt-8">
            <div className="border-b pb-2">
                <h3 className="text-lg font-semibold">Estadísticas de la Evaluación</h3>
                <p className="text-sm text-muted-foreground">Haz clic en los gráficos para ver los estudiantes de cada segmento</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Estudiantes", value: submissions.length, color: "text-foreground" },
                    { label: "Nota Promedio", value: avgScore.toFixed(2), color: "text-blue-600 dark:text-blue-400" },
                    { label: "Nota Máxima", value: maxScore.toFixed(2), color: "text-green-600 dark:text-green-400" },
                    { label: "Nota Mínima", value: submitted.length === 0 ? "—" : minScore.toFixed(2), color: submitted.length === 0 ? "text-muted-foreground" : "text-red-600 dark:text-red-400" },
                ].map((kpi, idx) => (
                    <motion.div 
                        key={kpi.label} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        className="rounded-xl border bg-card p-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Activity className="w-8 h-8" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{kpi.label}</span>
                        <span className={`text-2xl font-black ${kpi.color} tracking-tight`}>
                            {typeof kpi.value === 'string' && kpi.value === '—' ? '—' : <CountUp value={Number(kpi.value)} />}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* AI and Plagiarism Actions */}
            <div className="flex flex-wrap gap-4 items-center">
                <Button
                    onClick={handleGetAIInsights}
                    disabled={aiInsights.loading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/20 border-0 transition-all duration-300 hover:scale-105"
                >
                    {aiInsights.loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    IA INSIGHTS (REPORT)
                </Button>

                <Button
                    variant="destructive"
                    onClick={handlePlagiarismAnalysis}
                    disabled={plagiarismData.loading}
                    className="shadow-lg shadow-red-200 dark:shadow-red-900/20 transition-all duration-300 hover:scale-105"
                >
                    {plagiarismData.loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ShieldAlert className="mr-2 h-4 w-4" />
                    )}
                    ANÁLISIS DE PLAGIO
                </Button>
            </div>

            {/* Plagiarism Results */}
            {plagiarismData.matches.length > 0 && (
                <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-4 w-4" />
                            Hallazgos de Similitud Sospechosa
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {plagiarismData.matches.filter(m => m.similarityScore > 0.4).slice(0, 10).map((match, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-card border border-red-100 dark:border-red-900/30 shadow-sm">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <span className="text-zinc-600 dark:text-zinc-400">{match.studentA.name}</span>
                                            <span className="text-red-500 font-bold">↔</span>
                                            <span className="text-zinc-600 dark:text-zinc-400">{match.studentB.name}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">
                                            {match.reason}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-lg font-black ${match.isSuspicious ? 'text-red-600' : 'text-amber-600'}`}>
                                                {(match.similarityScore * 100).toFixed(0)}%
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Similitud</span>
                                        </div>
                                        <Badge variant={match.isSuspicious ? "destructive" : "secondary"} className="h-6">
                                            {match.isSuspicious ? "Crítico" : "Advertencia"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Distribution */}
                <div className="relative rounded-lg border bg-card p-4">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Distribución de Notas</p>
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setExpandedChart({ open: true, title: "Distribución de Notas", component: <div className="h-full w-full"><Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} /></div> })}
                        >
                            <Maximize2 className="h-3 w-3" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Clic en una barra para ver los estudiantes del rango</p>
                    <div className="h-52"><Bar data={barData} options={barOptions} /></div>
                </div>

                {/* State */}
                <div className="relative rounded-lg border bg-card p-4">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Estado General</p>
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setExpandedChart({ open: true, title: "Estado General", component: <div className="h-full w-full"><Doughnut data={doughnutData} options={{ ...doughnutOptions, maintainAspectRatio: false }} /></div> })}
                        >
                            <Maximize2 className="h-3 w-3" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Clic en un segmento para ver los estudiantes</p>
                    <div className="h-52"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                        <div><div className="font-bold text-green-600 dark:text-green-400">{passCount}</div><div className="text-xs text-muted-foreground">Aprobados</div></div>
                        <div><div className="font-bold text-red-600 dark:text-red-400">{failCount}</div><div className="text-xs text-muted-foreground">Reprobados</div></div>
                        <div><div className="font-bold text-slate-500">{inProgress.length}</div><div className="text-xs text-muted-foreground">En Progreso</div></div>
                    </div>
                </div>

                {/* Performance by Question */}
                {questions.length > 0 && (
                    <div className="relative rounded-lg border bg-card p-4 md:col-span-2">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">📝 Rendimiento por Pregunta</p>
                            <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setExpandedChart({ open: true, title: "Rendimiento por Pregunta", component: <div className="h-full w-full"><Bar data={questionChartData} options={{ ...questionChartOptions, maintainAspectRatio: false }} /></div> })}
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Nota promedio obtenida en cada pregunta · Verde ≥ 3.0 · Rojo &lt; 3.0 · Clic para ver estudiantes</p>
                        <div className="h-56"><Bar data={questionChartData} options={questionChartOptions} /></div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {questionAvgs.map((q, i) => (
                                <div key={q.id} className="text-xs rounded border bg-muted/20 px-2 py-1.5">
                                    <span className="font-bold">P{i + 1}</span>
                                    <span className={`ml-2 font-mono ${q.avg === null ? "text-muted-foreground" : q.avg >= 3 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                        {q.avg !== null ? q.avg.toFixed(2) : "—"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Note vs Expulsiones (Trend) */}
                {submitted.length > 0 && (
                    <div className="relative rounded-lg border bg-card p-4">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">📊 Nota vs Expulsiones</p>
                            <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setExpandedChart({ open: true, title: "Nota vs Expulsiones (Tendencia)", component: <div className="h-full w-full"><Bar data={trendData} options={{ ...trendOptions, maintainAspectRatio: false }} /></div> })}
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Tendencia de notas promedio según cantidad de salidas de la pestaña</p>
                        <div className="h-64"><Bar data={trendData} options={trendOptions} /></div>
                    </div>
                )}

                {/* Pie scores */}
                {submitted.length > 0 && (
                    <div className="relative rounded-lg border bg-card p-4">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nota por Estudiante</p>
                            <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setExpandedChart({ open: true, title: "Nota por Estudiante", component: <div className="h-full w-full"><Pie data={pieData} options={{ ...pieOptions, maintainAspectRatio: false }} /></div> })}
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Distribución de notas por estudiante</p>
                        <div className="h-64"><Pie data={pieData} options={pieOptions} /></div>
                    </div>
                )}

                {/* Student Ranking */}
                {submitted.length > 0 && (() => {
                    const ranked = [...submitted].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
                    const topData = {
                        labels: ranked.map((s, i) => `#${i + 1} ${(s.user?.name || "Estudiante").split(" ").slice(0, 2).join(" ")}`),
                        datasets: [{
                            label: "Nota",
                            data: ranked.map(s => Number(s.score || 0).toFixed(2)),
                            backgroundColor: ranked.map(s => (Number(s.score) || 0) >= 3 ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)"),
                            borderColor: ranked.map(s => (Number(s.score) || 0) >= 3 ? "#22c55e" : "#ef4444"),
                            borderWidth: 1.5, borderRadius: 4,
                        }],
                    };
                    const topOptions: any = {
                        indexAxis: "y" as const, responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` Nota: ${ctx.raw} / 5.0` } } },
                        scales: {
                            x: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: "rgba(148,163,184,0.15)" } },
                            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                        },
                        onClick: (_: any, elements: any[]) => {
                            if (!elements.length) return;
                            const s = ranked[elements[0].index];
                            if (s) openModal(s.user?.name || "Estudiante", [s]);
                        },
                        onHover: (_: any, elements: any[], chart: any) => { chart.canvas.style.cursor = elements.length ? "pointer" : "default"; },
                    };
                    return (
                        <div key="ranking" className="relative rounded-lg border bg-card p-4 md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">🏆 Ranking de Estudiantes</p>
                                <Button
                                    variant="ghost" size="icon" className="h-6 w-6"
                                    onClick={() => setExpandedChart({ open: true, title: "Ranking de Estudiantes", component: <div className="h-full w-full"><Bar data={topData} options={{ ...topOptions, maintainAspectRatio: false }} /></div> })}
                                >
                                    <Maximize2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">Clic en una barra para ver el detalle</p>
                            <div style={{ height: `${Math.max(200, ranked.length * 36)}px` }}>
                                <Bar data={topData} options={topOptions} />
                            </div>
                        </div>
                    );
                })()}

                {/* Top Expulsions */}
                {(() => {
                    const withExpulsions = submissions.filter(s => (s.expulsions || 0) > 0)
                        .sort((a, b) => (b.expulsions || 0) - (a.expulsions || 0));
                    if (withExpulsions.length === 0) return null;
                    const maxExp = Math.max(...withExpulsions.map(s => s.expulsions || 0));
                    const expColors = withExpulsions.map(s => {
                        const r = (s.expulsions || 0) / maxExp;
                        return r <= 0.33 ? "rgba(245,158,11,0.8)" : r <= 0.66 ? "rgba(249,115,22,0.8)" : "rgba(239,68,68,0.8)";
                    });
                    const expBorder = withExpulsions.map(s => {
                        const r = (s.expulsions || 0) / maxExp;
                        return r <= 0.33 ? "#f59e0b" : r <= 0.66 ? "#f97316" : "#ef4444";
                    });
                    const expData = {
                        labels: withExpulsions.map((s, i) => `#${i + 1} ${(s.user?.name || "Estudiante").split(" ").slice(0, 2).join(" ")}`),
                        datasets: [{ label: "Expulsiones", data: withExpulsions.map(s => s.expulsions || 0), backgroundColor: expColors, borderColor: expBorder, borderWidth: 1.5, borderRadius: 4 }],
                    };
                    const expOptions: any = {
                        indexAxis: "y" as const, responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} expulsión${ctx.raw !== 1 ? "es" : ""}` } } },
                        scales: {
                            x: { min: 0, ticks: { stepSize: 1 }, grid: { color: "rgba(148,163,184,0.15)" } },
                            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                        },
                        onClick: (_: any, elements: any[]) => {
                            if (!elements.length) return;
                            const s = withExpulsions[elements[0].index];
                            if (s) openModal(`${s.user?.name || "Estudiante"} — Expulsiones`, [s]);
                        },
                        onHover: (_: any, elements: any[], chart: any) => { chart.canvas.style.cursor = elements.length ? "pointer" : "default"; },
                    };
                    return (
                        <div key="expulsions" className="relative rounded-lg border bg-card p-4 md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">🚨 Top Expulsiones</p>
                                <Button
                                    variant="ghost" size="icon" className="h-6 w-6"
                                    onClick={() => setExpandedChart({ open: true, title: "Top Expulsiones", component: <div className="h-full w-full"><Bar data={expData} options={{ ...expOptions, maintainAspectRatio: false }} /></div> })}
                                >
                                    <Maximize2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <div style={{ height: `${Math.max(150, withExpulsions.length * 38)}px` }}>
                                <Bar data={expData} options={expOptions} />
                            </div>
                        </div>
                    );
                })()}

                {/* Pass rate progress bar */}
                <div className="rounded-lg border bg-card p-4 md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tasa de Aprobación</span>
                        <span className="text-sm font-bold">{((passCount / Math.max(1, submitted.length)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${(passCount / Math.max(1, submitted.length)) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Dialog open={questionModal.open} onOpenChange={(open) => setQuestionModal(m => ({ ...m, open }))}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Pregunta {questionModal.index + 1}</span>
                            <Badge variant="outline">{questionModal.type}</Badge>
                            {questionModal.avg !== null && (
                                <Badge className={questionModal.avg >= 3 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none"}>
                                    Promedio: {questionModal.avg.toFixed(2)}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 p-4 rounded-lg bg-muted/30 border">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{questionModal.text}</ReactMarkdown>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => {
                                const q = questions[questionModal.index];
                                const studentsWithAnswer = submitted.filter((s: any) =>
                                    (s.answersList || []).some((a: any) => a.questionId === q.id)
                                );
                                setQuestionModal((m: any) => ({ ...m, open: false }));
                                setTimeout(() => {
                                    openModal(`Pregunta ${questionModal.index + 1} — Rendimiento`, studentsWithAnswer);
                                }, 200);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Ver estudiantes ({submitted.filter((s: any) => (s.answersList || []).some((a: any) => a.questionId === questions[questionModal.index]?.id)).length})
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={modal.open} onOpenChange={(open) => setModal((m: any) => ({ ...m, open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{modal.title}</DialogTitle>
                        <DialogDescription>{modal.students.length} estudiante{modal.students.length !== 1 ? "s" : ""} en este grupo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mt-4">
                        {modal.students.map((s, i) => (
                            <div key={i} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold">{s.name}</span>
                                        <span className="text-xs text-muted-foreground">{s.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {s.score !== null && <span className="text-sm font-black text-blue-600 dark:text-blue-400">{Number(s.score).toFixed(2)}</span>}
                                        <Badge variant={!s.submitted ? "secondary" : s.score !== null && s.score >= 3 ? "default" : "destructive"}>
                                            {!s.submitted ? "En progreso" : s.score !== null && s.score >= 3 ? "Aprobado" : "Reprobado"}
                                        </Badge>
                                    </div>
                                </div>
                                {s.submitted && (
                                    <Button variant="outline" size="sm" asChild className="w-full h-8 text-xs font-bold uppercase tracking-wider bg-background hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors">
                                        <Link href={`/dashboard/teacher/courses/${courseId}/evaluations/${attemptId}/submissions/${s.id}`}>
                                            Ver Respuestas
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={expandedChart.open} onOpenChange={(open) => setExpandedChart((m: any) => ({ ...m, open }))}>
                <DialogContent className="fixed !inset-0 z-[9999] !max-w-none !w-screen !h-screen m-0 p-0 border-none rounded-none bg-background overflow-hidden flex flex-col !translate-x-0 !translate-y-0 !left-0 !top-0 duration-0">
                    <DialogTitle className="sr-only">{expandedChart.title}</DialogTitle>
                    <div className="flex-1 w-full h-full p-4 relative">
                        {expandedChart.component}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
