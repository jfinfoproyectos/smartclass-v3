import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDateTime } from "@/lib/dateUtils";

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b", backgroundColor: "#ffffff" },
    header: {
        marginBottom: 20, paddingBottom: 12,
        borderBottomWidth: 2, borderBottomColor: "#8b5cf6", borderBottomStyle: "solid",
    },
    appTitle: { fontSize: 22, fontWeight: "bold", color: "#8b5cf6", marginBottom: 4 },
    reportTitle: { fontSize: 14, color: "#64748b" },
    infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
    infoItem: { width: "50%", marginBottom: 6, fontSize: 10 },
    labelText: { fontWeight: "bold", color: "#475569" },
    
    // Stats
    statsContainer: {
        flexDirection: "row", marginBottom: 20,
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid", borderRadius: 6,
        backgroundColor: "#f8fafc"
    },
    statBox: { alignItems: "center", flex: 1, padding: 12 },
    statDivider: { borderRightWidth: 1, borderRightColor: "#e2e8f0", borderRightStyle: "solid" },
    statValue: { fontSize: 20, fontWeight: "bold", color: "#8b5cf6" },
    statLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginTop: 4 },

    // Section Titles
    sectionTitle: {
        fontSize: 14, fontWeight: "bold", color: "#1e293b",
        marginTop: 20, marginBottom: 10,
        backgroundColor: "#f1f5f9", padding: 6, borderRadius: 4
    },
    subSectionTitle: {
        fontSize: 12, fontWeight: "bold", color: "#334155",
        marginTop: 12, marginBottom: 6,
    },

    // Global Analysis
    globalAnalysisBox: {
        padding: 12, backgroundColor: "#fdf4ff", 
        borderLeftWidth: 4, borderLeftColor: "#d946ef", borderLeftStyle: "solid",
        borderRadius: 4, marginBottom: 16
    },
    globalAnalysisText: { fontSize: 10, color: "#4a044e", lineHeight: 1.4 },

    // Lists
    listItem: { flexDirection: "row", marginBottom: 6 },
    bulletPoint: { width: 12, fontSize: 10, color: "#8b5cf6", fontWeight: "bold" },
    listText: { flex: 1, fontSize: 10, lineHeight: 1.4 },

    // Common Errors Table
    tableWrapper: {
        borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid",
        borderRadius: 4, marginBottom: 16
    },
    tableHeader: {
        flexDirection: "row", backgroundColor: "#f1f5f9",
        borderBottomWidth: 1, borderBottomColor: "#cbd5e1", borderBottomStyle: "solid",
        padding: 6, alignItems: "center",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid",
        padding: 6, alignItems: "center",
    },
    tableRowAlt: { backgroundColor: "#f8fafc" },
    colConcept: { width: "25%", fontWeight: "bold" },
    colDesc: { width: "55%", paddingHorizontal: 4 },
    colPrev: { width: "20%", textAlign: "right", color: "#ef4444", fontWeight: "bold" },

    // Plagiarism
    plagiarismCard: {
        borderWidth: 1, borderColor: "#fecaca", borderStyle: "solid",
        backgroundColor: "#fef2f2", padding: 10, borderRadius: 4, marginBottom: 8
    },
    plagHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    plagStudents: { fontSize: 10, fontWeight: "bold", color: "#991b1b" },
    plagScore: { fontSize: 10, fontWeight: "bold", color: "#dc2626" },
    plagReason: { fontSize: 9, color: "#7f1d1d", fontStyle: "italic" },
    plagWarningBadge: { 
        fontSize: 8, color: "#ffffff", backgroundColor: "#dc2626", 
        paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2, alignSelf: "flex-start", marginTop: 4 
    },

    footer: {
        position: "absolute", bottom: 30, left: 40, right: 40,
        paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0", borderTopStyle: "solid",
        fontSize: 8, color: "#94a3b8", textAlign: "center",
    },
});

export interface AIInsightsResponse {
    weaknesses: string[];
    strengths: string[];
    recommendations: string[];
    globalAnalysis: string;
    commonErrors: { concept: string; description: string; prevalence: string }[];
}

export interface PlagiarismMatch {
    studentA: { id: string; name: string };
    studentB: { id: string; name: string };
    similarityScore: number;
    reason: string;
    isSuspicious: boolean;
}

interface AIInsightsPDFProps {
    evaluationTitle: string;
    courseName: string;
    teacherName: string;
    insights: AIInsightsResponse;
    stats: {
        avgScore: string;
        passRate: string;
        totalStudents: number;
    };
    plagiarismMatches: PlagiarismMatch[];
}

export function AIInsightsPDF({
    evaluationTitle, courseName, teacherName, insights, stats, plagiarismMatches
}: AIInsightsPDFProps) {
    const footerText = `Generado el ${formatDateTime(new Date(), "dd/MM/yyyy HH:mm:ss")} - SmartClassv2 AI Analytics`;

    return (
        <Document>
            {/* ─── Page 1: AI Analysis & Insights ─── */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.appTitle}>SmartClassv2 ✨ AI Insights</Text>
                    <Text style={styles.reportTitle}>Reporte de Inteligencia Artificial para el Docente</Text>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Evaluación: </Text>{evaluationTitle}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Curso: </Text>{courseName}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Docente: </Text>{teacherName}</Text></View>
                    <View style={styles.infoItem}><Text><Text style={styles.labelText}>Estudiantes: </Text>{stats.totalStudents}</Text></View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={[styles.statBox, styles.statDivider]}>
                        <Text style={styles.statValue}>{stats.avgScore}</Text>
                        <Text style={styles.statLabel}>Nota Promedio general</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{stats.passRate}%</Text>
                        <Text style={styles.statLabel}>Tasa de Aprobación</Text>
                    </View>
                </View>

                <View style={styles.globalAnalysisBox}>
                    <Text style={[styles.subSectionTitle, { marginTop: 0, color: "#701a75" }]}>Análisis Global (Generado por IA)</Text>
                    <Text style={styles.globalAnalysisText}>{insights.globalAnalysis}</Text>
                </View>

                <Text style={styles.sectionTitle}>Fortalezas del Grupo</Text>
                {insights.strengths.length > 0 ? insights.strengths.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                        <Text style={[styles.bulletPoint, { color: "#10b981" }]}>✓</Text>
                        <Text style={styles.listText}>{item}</Text>
                    </View>
                )) : <Text style={styles.listText}>No se detectaron fortalezas significativas.</Text>}

                <Text style={styles.sectionTitle}>Oportunidades de Mejora</Text>
                {insights.weaknesses.length > 0 ? insights.weaknesses.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                        <Text style={[styles.bulletPoint, { color: "#f59e0b" }]}>!</Text>
                        <Text style={styles.listText}>{item}</Text>
                    </View>
                )) : <Text style={styles.listText}>No se detectaron debilidades críticas.</Text>}

                <Text style={styles.sectionTitle}>Recomendaciones Pedagógicas</Text>
                {insights.recommendations.length > 0 ? insights.recommendations.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                        <Text style={[styles.bulletPoint, { color: "#3b82f6" }]}>→</Text>
                        <Text style={styles.listText}>{item}</Text>
                    </View>
                )) : <Text style={styles.listText}>No hay recomendaciones disponibles en este momento.</Text>}

                <Text style={styles.footer}>{footerText}</Text>
            </Page>

            {/* ─── Page 2: Errors & Plagiarism ─── */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.appTitle}>SmartClassv2 ✨ AI Insights</Text>
                    <Text style={styles.reportTitle}>Diagnóstico Avanzado de Errores e Integridad</Text>
                </View>

                <Text style={styles.sectionTitle}>Diagnóstico de Errores Comunes</Text>
                {insights.commonErrors && insights.commonErrors.length > 0 ? (
                    <View style={styles.tableWrapper}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colConcept, { fontSize: 9 }]}>Concepto</Text>
                            <Text style={[styles.colDesc, { fontSize: 9, fontWeight: "bold" }]}>Descripción del Fallo</Text>
                            <Text style={[styles.colPrev, { fontSize: 9, color: "#1e293b" }]}>Prevalencia</Text>
                        </View>
                        {insights.commonErrors.map((err, i) => (
                            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                                <Text style={[styles.colConcept, { fontSize: 9 }]}>{err.concept}</Text>
                                <Text style={[styles.colDesc, { fontSize: 9 }]}>{err.description}</Text>
                                <Text style={[styles.colPrev, { fontSize: 9 }]}>{err.prevalence}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.listText}>No hay errores comunes reportados para esta evaluación.</Text>
                )}

                <Text style={styles.sectionTitle}>Análisis de Similitud y Plagio</Text>
                {plagiarismMatches && plagiarismMatches.length > 0 ? (
                    <View>
                        {plagiarismMatches.filter(m => m.similarityScore >= 0.4).map((match, i) => (
                            <View key={i} style={styles.plagiarismCard}>
                                <View style={styles.plagHeader}>
                                    <Text style={styles.plagStudents}>{match.studentA.name} ↔ {match.studentB.name}</Text>
                                    <Text style={styles.plagScore}>Similitud: {(match.similarityScore * 100).toFixed(0)}%</Text>
                                </View>
                                <Text style={styles.plagReason}>{match.reason}</Text>
                                {match.isSuspicious && (
                                    <Text style={styles.plagWarningBadge}>NIVEL CRÍTICO: REVISIÓN MANUAL REQUERIDA</Text>
                                )}
                            </View>
                        ))}
                        {plagiarismMatches.filter(m => m.similarityScore >= 0.4).length === 0 && (
                            <Text style={styles.listText}>No se encontraron coincidencias sospechosas mayores al 40%.</Text>
                        )}
                    </View>
                ) : (
                    <Text style={styles.listText}>No se encontraron indicios de plagio en esta evaluación.</Text>
                )}

                <Text style={styles.footer}>{footerText}</Text>
            </Page>
        </Document>
    );
}
