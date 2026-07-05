import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDateTime } from "@/lib/dateUtils";
import { formatName } from "@/lib/utils";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
    header: {
        marginBottom: 16, paddingBottom: 10,
        borderBottomWidth: 2, borderBottomColor: "#2563eb", borderBottomStyle: "solid",
    },
    appTitle: { fontSize: 20, fontWeight: "bold", color: "#2563eb", marginBottom: 2 },
    reportTitle: { fontSize: 12, color: "#64748b" },
    infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, marginTop: 12 },
    infoItem: { width: "50%", marginBottom: 4, fontSize: 9 },
    labelText: { fontWeight: "bold", color: "#475569" },
    statsContainer: {
        flexDirection: "row", marginBottom: 16,
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid", borderRadius: 4,
    },
    statBox: { alignItems: "center", flex: 1, padding: 8 },
    statDivider: { borderRightWidth: 1, borderRightColor: "#e2e8f0", borderRightStyle: "solid" },
    statValue: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
    statLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginTop: 2 },
    tableHeader: {
        flexDirection: "row", backgroundColor: "#f1f5f9",
        borderWidth: 1, borderColor: "#cbd5e1", borderStyle: "solid",
        minHeight: 24, alignItems: "center",
    },
    tableRow: {
        flexDirection: "row",
        borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
        borderColor: "#e2e8f0", borderStyle: "solid",
        minHeight: 22, alignItems: "center",
    },
    tableRowAlt: { backgroundColor: "#f8fafc" },
    tableCell: { fontSize: 9, padding: 4 },
    tableCellBold: { fontSize: 9, padding: 4, fontWeight: "bold" },
    colStudent: { width: "40%", borderRightWidth: 1, borderRightColor: "#e2e8f0", borderRightStyle: "solid" },
    colStatus: { width: "20%", borderRightWidth: 1, borderRightColor: "#e2e8f0", borderRightStyle: "solid", textAlign: "center" },
    colScore: { width: "20%", borderRightWidth: 1, borderRightColor: "#e2e8f0", borderRightStyle: "solid", textAlign: "center" },
    colExpul: { width: "20%", textAlign: "center" },
    footer: {
        position: "absolute", bottom: 30, left: 40, right: 40,
        paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0", borderTopStyle: "solid",
        fontSize: 8, color: "#94a3b8", textAlign: "center",
    },
    // Stats page styles
    statsPageTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 12, color: "#1e293b" },
    statsSectionTitle: {
        fontSize: 10, fontWeight: "bold", color: "#475569",
        textTransform: "uppercase", marginBottom: 6, marginTop: 14,
    },
    kpiRow: { flexDirection: "row", marginBottom: 14, gap: 8 },
    kpiBox: {
        flex: 1, padding: 10, alignItems: "center",
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid", borderRadius: 4,
        backgroundColor: "#f8fafc",
    },
    kpiValue: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
    kpiLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginTop: 2 },
    // Bar chart simulation
    barChartContainer: {
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid",
        borderRadius: 4, padding: 12, marginBottom: 8,
    },
    barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    barLabel: { fontSize: 8, width: 30, color: "#475569" },
    barTrack: { flex: 1, height: 16, backgroundColor: "#f1f5f9", borderRadius: 2, marginHorizontal: 6 },
    barFill: { height: 16, borderRadius: 2 },
    barCount: { fontSize: 8, width: 20, textAlign: "right", color: "#475569" },
    // Distribution table
    distRow: {
        flexDirection: "row", alignItems: "center",
        borderBottomWidth: 1, borderBottomColor: "#f1f5f9", borderBottomStyle: "solid",
        paddingVertical: 4,
    },
    distLabel: { fontSize: 9, width: "25%", color: "#475569" },
    distValue: { fontSize: 9, width: "25%", fontWeight: "bold", textAlign: "center" },
    distPct: { fontSize: 9, width: "25%", textAlign: "center", color: "#64748b" },
    distBar: { width: "25%", paddingLeft: 6 },
    // Pass rate row
    passRateContainer: {
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid",
        borderRadius: 4, padding: 12,
    },
    passRateTrack: { height: 12, backgroundColor: "#f1f5f9", borderRadius: 4, marginTop: 6 },
    passRateFill: { height: 12, borderRadius: 4, backgroundColor: "#22c55e" },
});

const BUCKET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
const BUCKET_LABELS = ["0 – 1", "1 – 2", "2 – 3", "3 – 4", "4 – 5"];

interface EvaluationReportPDFProps {
    appTitle: string;
    courseName: string;
    teacherName: string;
    evaluationTitle: string;
    startTime: Date;
    endTime: Date;
    submissions: any[];
}

export function EvaluationReportPDF({
    appTitle, courseName, teacherName,
    evaluationTitle, startTime, endTime, submissions,
}: EvaluationReportPDFProps) {
    const submittedOnes = submissions.filter(s => s.submittedAt);
    const totalStudents = submissions.length;
    const inProgressCount = submissions.filter(s => !s.submittedAt).length;
    const scores = submittedOnes.map(s => Number(s.score) || 0);
    const avgScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : "0.00";
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : "—";
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : "—";
    const passCount = scores.filter(s => s >= 3.0).length;
    const failCount = scores.filter(s => s < 3.0).length;
    const passRate = submittedOnes.length > 0
        ? ((passCount / submittedOnes.length) * 100).toFixed(1)
        : "0";

    // Score distribution buckets
    const buckets = [0, 0, 0, 0, 0];
    scores.forEach(s => { buckets[Math.min(Math.floor(s), 4)]++; });
    const maxBucket = Math.max(...buckets, 1);

    const passRatePct = submittedOnes.length > 0
        ? (passCount / submittedOnes.length)
        : 0;

    const footerText = `Generado por ${appTitle} el ${formatDateTime(new Date(), "dd/MM/yyyy HH:mm:ss")}`;

    return (
        <Document>
            {/* ─── Page 1: Results Table ─── */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.appTitle}>{appTitle}</Text>
                    <Text style={styles.reportTitle}>Reporte de Resultados de Evaluación</Text>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Evaluación: </Text>{evaluationTitle}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Curso: </Text>{courseName}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Docente: </Text>{teacherName}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Período: </Text>{formatDateTime(startTime)} - {formatDateTime(endTime)}</Text></View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={[styles.statBox, styles.statDivider]}>
                        <Text style={styles.statValue}>{totalStudents}</Text>
                        <Text style={styles.statLabel}>Estudiantes</Text>
                    </View>
                    <View style={[styles.statBox, styles.statDivider]}>
                        <Text style={styles.statValue}>{avgScore}</Text>
                        <Text style={styles.statLabel}>Nota Promedio</Text>
                    </View>
                    <View style={[styles.statBox, styles.statDivider]}>
                        <Text style={styles.statValue}>{passCount}</Text>
                        <Text style={styles.statLabel}>Aprobados</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{passRate}%</Text>
                        <Text style={styles.statLabel}>Tasa Aprobación</Text>
                    </View>
                </View>

                <View style={styles.tableHeader}>
                    <View style={styles.colStudent}><Text style={styles.tableCellBold}>Estudiante</Text></View>
                    <View style={styles.colStatus}><Text style={styles.tableCellBold}>Estado</Text></View>
                    <View style={styles.colScore}><Text style={styles.tableCellBold}>Nota / 5.0</Text></View>
                    <View style={styles.colExpul}><Text style={styles.tableCellBold}>Expulsiones</Text></View>
                </View>

                {submissions.map((sub, index) => (
                    <View key={sub.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
                        <View style={styles.colStudent}>
                            <Text style={styles.tableCell}>{formatName(sub.user.name, sub.user.profile)}</Text>
                            <Text style={[styles.tableCell, { fontSize: 7, color: "#64748b" }]}>{sub.user.email}</Text>
                        </View>
                        <View style={styles.colStatus}>
                            <Text style={styles.tableCell}>{sub.submittedAt ? "Enviado" : "En proceso"}</Text>
                        </View>
                        <View style={styles.colScore}>
                            <Text style={styles.tableCellBold}>{sub.score !== null ? Number(sub.score).toFixed(2) : "—"}</Text>
                        </View>
                        <View style={styles.colExpul}>
                            <Text style={styles.tableCell}>{sub.expulsions || 0}</Text>
                        </View>
                    </View>
                ))}

                <Text style={styles.footer}>{footerText}</Text>
            </Page>

            {/* ─── Page 2: Statistics ─── */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.appTitle}>{appTitle}</Text>
                    <Text style={styles.reportTitle}>Estadísticas — {evaluationTitle}</Text>
                </View>

                {/* KPI cards */}
                <Text style={styles.statsSectionTitle}>Indicadores Clave</Text>
                <View style={styles.kpiRow}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiValue}>{totalStudents}</Text>
                        <Text style={styles.kpiLabel}>Total Estudiantes</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={[styles.kpiValue, { color: "#2563eb" }]}>{avgScore}</Text>
                        <Text style={styles.kpiLabel}>Nota Promedio</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={[styles.kpiValue, { color: "#22c55e" }]}>{maxScore}</Text>
                        <Text style={styles.kpiLabel}>Nota Máxima</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={[styles.kpiValue, { color: "#ef4444" }]}>{minScore}</Text>
                        <Text style={styles.kpiLabel}>Nota Mínima</Text>
                    </View>
                </View>

                {/* State summary row */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                        <Text style={[styles.kpiValue, { color: "#15803d", fontSize: 16 }]}>{passCount}</Text>
                        <Text style={styles.kpiLabel}>Aprobados (≥3.0)</Text>
                    </View>
                    <View style={[styles.kpiBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                        <Text style={[styles.kpiValue, { color: "#dc2626", fontSize: 16 }]}>{failCount}</Text>
                        <Text style={styles.kpiLabel}>Reprobados (&lt;3.0)</Text>
                    </View>
                    <View style={[styles.kpiBox, { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }]}>
                        <Text style={[styles.kpiValue, { color: "#64748b", fontSize: 16 }]}>{inProgressCount}</Text>
                        <Text style={styles.kpiLabel}>En Progreso</Text>
                    </View>
                    <View style={[styles.kpiBox, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                        <Text style={[styles.kpiValue, { color: "#2563eb", fontSize: 16 }]}>{passRate}%</Text>
                        <Text style={styles.kpiLabel}>Tasa Aprobación</Text>
                    </View>
                </View>

                {/* Tasa de aprobación bar */}
                <Text style={styles.statsSectionTitle}>Tasa de Aprobación</Text>
                <View style={styles.passRateContainer}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 9, color: "#475569" }}>
                            {passCount} aprobados de {submittedOnes.length} enviados
                        </Text>
                        <Text style={{ fontSize: 9, fontWeight: "bold", color: "#15803d" }}>{passRate}%</Text>
                    </View>
                    <View style={styles.passRateTrack}>
                        <View style={[styles.passRateFill, { width: `${Math.round(passRatePct * 100)}%` }]} />
                    </View>
                    <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>Mínimo aprobatorio: 3.0 / 5.0</Text>
                </View>

                {/* Score distribution bar chart */}
                <Text style={styles.statsSectionTitle}>Distribución de Notas</Text>
                <View style={styles.barChartContainer}>
                    {buckets.map((count, i) => (
                        <View key={i} style={styles.barRow}>
                            <Text style={styles.barLabel}>{BUCKET_LABELS[i]}</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, {
                                    width: count > 0 ? `${Math.round((count / maxBucket) * 100)}%` : "2%",
                                    backgroundColor: BUCKET_COLORS[i],
                                }]} />
                            </View>
                            <Text style={styles.barCount}>{count}</Text>
                        </View>
                    ))}
                </View>

                {/* Distribution detail table */}
                <Text style={styles.statsSectionTitle}>Detalle por Rango</Text>
                <View style={[styles.tableHeader, { marginBottom: 0 }]}>
                    <Text style={[styles.tableCellBold, { width: "25%" }]}>Rango</Text>
                    <Text style={[styles.tableCellBold, { width: "25%", textAlign: "center" }]}>Estudiantes</Text>
                    <Text style={[styles.tableCellBold, { width: "25%", textAlign: "center" }]}>Porcentaje</Text>
                    <Text style={[styles.tableCellBold, { width: "25%", textAlign: "center" }]}>Estado</Text>
                </View>
                {buckets.map((count, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                        <Text style={[styles.tableCell, { width: "25%" }]}>{BUCKET_LABELS[i]}</Text>
                        <Text style={[styles.tableCellBold, { width: "25%", textAlign: "center" }]}>{count}</Text>
                        <Text style={[styles.tableCell, { width: "25%", textAlign: "center" }]}>
                            {submittedOnes.length > 0 ? ((count / submittedOnes.length) * 100).toFixed(1) : "0"}%
                        </Text>
                        <Text style={[styles.tableCell, { width: "25%", textAlign: "center", color: i >= 3 ? "#15803d" : "#dc2626" }]}>
                            {i >= 3 ? "Aprobado" : "Reprobado"}
                        </Text>
                    </View>
                ))}

                <Text style={styles.footer}>{footerText}</Text>
            </Page>

            {/* ─── Page 3: Per-Student Breakdown ─── */}
            {submittedOnes.length > 0 && (
                <Page size="A4" style={styles.page}>
                    <View style={styles.header}>
                        <Text style={styles.appTitle}>{appTitle}</Text>
                        <Text style={styles.reportTitle}>Nota por Estudiante — {evaluationTitle}</Text>
                    </View>

                    <Text style={styles.statsSectionTitle}>Distribución Individual (Gráfico Circular)</Text>
                    <Text style={{ fontSize: 8, color: "#64748b", marginBottom: 10 }}>
                        Cada estudiante y su proporción de nota respecto al total de la evaluación (5.0).
                        El color indica si aprobó (verde) o reprobó (rojo).
                    </Text>

                    {/* Student rows with visual bar */}
                    {submittedOnes.map((sub: any, index: number) => {
                        const score = Number(sub.score || 0);
                        const pct = Math.min((score / 5.0) * 100, 100);
                        const passed = score >= 3.0;
                        const barColor = passed ? "#22c55e" : "#ef4444";
                        const bgColor = passed ? "#f0fdf4" : "#fef2f2";
                        const borderColor = passed ? "#bbf7d0" : "#fecaca";
                        return (
                            <View key={sub.id} style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 5,
                                padding: 6,
                                backgroundColor: index % 2 === 0 ? bgColor : "#f8fafc",
                                borderRadius: 3,
                                borderWidth: 1,
                                borderColor: index % 2 === 0 ? borderColor : "#e2e8f0",
                                borderStyle: "solid",
                            }}>
                                {/* Color dot */}
                                <View style={{
                                    width: 10, height: 10, borderRadius: 5,
                                    backgroundColor: barColor, marginRight: 8, flexShrink: 0,
                                }} />
                                {/* Name */}
                                <View style={{ width: "35%", flexShrink: 0 }}>
                                    <Text style={{ fontSize: 9, fontWeight: "bold" }}>{formatName(sub.user.name, sub.user.profile)}</Text>
                                    <Text style={{ fontSize: 7, color: "#64748b" }}>{sub.user.email}</Text>
                                </View>
                                {/* Bar */}
                                <View style={{ flex: 1, height: 10, backgroundColor: "#e2e8f0", borderRadius: 3, marginHorizontal: 8 }}>
                                    <View style={{
                                        height: 10, borderRadius: 3,
                                        backgroundColor: barColor,
                                        width: `${Math.max(pct, 2)}%`,
                                    }} />
                                </View>
                                {/* Score */}
                                <Text style={{
                                    fontSize: 10, fontWeight: "bold",
                                    color: barColor, width: 36, textAlign: "right", flexShrink: 0,
                                }}>
                                    {score.toFixed(2)}
                                </Text>
                                {/* Status */}
                                <Text style={{
                                    fontSize: 8, width: 50, textAlign: "center", flexShrink: 0,
                                    color: passed ? "#15803d" : "#dc2626",
                                    fontWeight: "bold",
                                }}>
                                    {passed ? "APROBADO" : "REPROBADO"}
                                </Text>
                            </View>
                        );
                    })}

                    {/* Legend */}
                    <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#22c55e" }} />
                            <Text style={{ fontSize: 8, color: "#475569" }}>Aprobado (≥ 3.0)</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444" }} />
                            <Text style={{ fontSize: 8, color: "#475569" }}>Reprobado (&lt; 3.0)</Text>
                        </View>
                        <Text style={{ fontSize: 8, color: "#94a3b8", marginLeft: "auto" }}>
                            Barra proporcional a 5.0
                        </Text>
                    </View>

                    <Text style={styles.footer}>{footerText}</Text>
                </Page>
            )}
        </Document>
    );
}
