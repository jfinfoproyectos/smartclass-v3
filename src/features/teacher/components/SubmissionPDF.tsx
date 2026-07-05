import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDateTime } from "@/lib/dateUtils";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#1e293b",
    },
    header: {
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: "#2563eb",
        borderBottomStyle: "solid",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    headerLeft: { flex: 1 },
    appTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2563eb",
        marginBottom: 2,
    },
    reportTitle: {
        fontSize: 11,
        color: "#64748b",
    },
    scoreBox: {
        backgroundColor: "#f0f9ff",
        borderWidth: 1,
        borderColor: "#bae6fd",
        borderStyle: "solid",
        borderRadius: 4,
        padding: 8,
        alignItems: "center",
        minWidth: 80,
    },
    scoreValue: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0369a1",
    },
    scoreLabel: {
        fontSize: 8,
        color: "#64748b",
        textTransform: "uppercase",
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "solid",
        borderRadius: 4,
        padding: 10,
        backgroundColor: "#f8fafc",
    },
    infoItem: {
        width: "50%",
        marginBottom: 6,
        fontSize: 9,
    },
    labelText: {
        fontWeight: "bold",
        color: "#475569",
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#1e293b",
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
    },
    questionContainer: {
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "solid",
        borderRadius: 4,
        overflow: "hidden",
    },
    questionHeader: {
        backgroundColor: "#f1f5f9",
        padding: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
    },
    questionNum: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#1e293b",
    },
    questionType: {
        fontSize: 8,
        color: "#64748b",
        textTransform: "uppercase",
    },
    questionText: {
        fontSize: 9,
        padding: 8,
        color: "#334155",
    },
    answerSection: {
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
    },
    answerLabel: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#64748b",
        marginBottom: 3,
        textTransform: "uppercase",
    },
    answerText: {
        fontSize: 9,
        color: "#334155",
        backgroundColor: "#f8fafc",
        padding: 6,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "solid",
        borderRadius: 2,
    },
    feedbackSection: {
        padding: 8,
        backgroundColor: "#eff6ff",
        borderTopWidth: 1,
        borderTopColor: "#bfdbfe",
        borderTopStyle: "solid",
    },
    feedbackLabel: {
        fontSize: 8,
        fontWeight: "bold",
        color: "#1d4ed8",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    feedbackItem: {
        marginBottom: 4,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#bfdbfe",
        borderBottomStyle: "solid",
    },
    feedbackStatus: {
        fontSize: 8,
        fontWeight: "bold",
        marginBottom: 2,
    },
    feedbackStatusOk: { color: "#15803d" },
    feedbackStatusFail: { color: "#b45309" },
    feedbackText: {
        fontSize: 8,
        color: "#1e3a8a",
    },
    scoreRow: {
        padding: 6,
        flexDirection: "row",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
    },
    scoreChip: {
        fontSize: 9,
        fontWeight: "bold",
        color: "#2563eb",
        backgroundColor: "#eff6ff",
        padding: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: "#bfdbfe",
        borderStyle: "solid",
    },
    noAnswer: {
        fontSize: 9,
        color: "#94a3b8",
        padding: 8,
        textAlign: "center",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
        fontSize: 8,
        color: "#94a3b8",
        textAlign: "center",
    },
});

function stripMarkdown(text: string): string {
    if (!text) return "";
    return text
        .replace(/```[\s\S]*?```/g, "[código]")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

interface SubmissionPDFProps {
    appTitle: string;
    studentName: string;
    studentEmail: string;
    evaluationTitle: string;
    courseName: string;
    teacherName: string;
    startTime: Date;
    endTime: Date;
    submittedAt: Date | null;
    score: number | null;
    totalQuestions: number;
    answeredQuestions: number;
    expulsions: number;
    questions: Array<{
        id: string;
        text: string;
        type: string;
        answer?: {
            answer: string;
            score: number | null;
            aiFeedback: any;
        };
    }>;
}

export function SubmissionPDF({
    appTitle,
    studentName,
    studentEmail,
    evaluationTitle,
    courseName,
    teacherName,
    startTime,
    endTime,
    submittedAt,
    score,
    totalQuestions,
    answeredQuestions,
    expulsions,
    questions,
}: SubmissionPDFProps) {
    const passed = score !== null && score >= 3.0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.appTitle}>{appTitle}</Text>
                        <Text style={styles.reportTitle}>Reporte Individual de Evaluación</Text>
                        <Text style={[styles.reportTitle, { marginTop: 2 }]}>{studentName} — {studentEmail}</Text>
                    </View>
                    <View style={styles.scoreBox}>
                        <Text style={styles.scoreValue}>{score !== null ? Number(score).toFixed(2) : "—"}</Text>
                        <Text style={styles.scoreLabel}>Nota Final</Text>
                        {score !== null && (
                            <Text style={{ fontSize: 8, color: passed ? "#15803d" : "#dc2626", fontWeight: "bold", marginTop: 2 }}>
                                {passed ? "APROBADO" : "REPROBADO"}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Evaluación: </Text>{evaluationTitle}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Curso: </Text>{courseName}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Docente: </Text>{teacherName}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Período: </Text>{formatDateTime(startTime, "dd/MM/yyyy HH:mm")} - {formatDateTime(endTime, "dd/MM/yyyy HH:mm")}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Estado: </Text>{submittedAt ? "Enviado" : "En progreso"}</Text>
                    </View>
                    {submittedAt && (
                        <View style={styles.infoItem}>
                            <Text><Text style={styles.labelText}>Fecha de envío: </Text>{formatDateTime(submittedAt)}</Text>
                        </View>
                    )}
                    <View style={styles.infoItem}>
                        <Text><Text style={styles.labelText}>Preguntas contestadas: </Text>{answeredQuestions} / {totalQuestions}</Text>
                    </View>
                    {expulsions > 0 && (
                        <View style={styles.infoItem}>
                            <Text><Text style={styles.labelText}>Expulsiones: </Text>{expulsions}</Text>
                        </View>
                    )}
                </View>

                {/* Questions */}
                <Text style={styles.sectionTitle}>Respuestas del Estudiante</Text>

                {questions.map((question, index) => {
                    const answer = question.answer;
                    const feedbacks = answer?.aiFeedback
                        ? (Array.isArray(answer.aiFeedback) ? answer.aiFeedback : [answer.aiFeedback])
                        : [];

                    return (
                        <View key={question.id} style={styles.questionContainer}>
                            {/* Question Header */}
                            <View style={styles.questionHeader}>
                                <Text style={styles.questionNum}>Pregunta {index + 1}</Text>
                                <Text style={styles.questionType}>{question.type}</Text>
                            </View>

                            {/* Question Text */}
                            <Text style={styles.questionText}>{stripMarkdown(question.text)}</Text>

                            {answer ? (
                                <>
                                    {/* Answer */}
                                    <View style={styles.answerSection}>
                                        <Text style={styles.answerLabel}>Respuesta del estudiante</Text>
                                        <Text style={styles.answerText}>{stripMarkdown(answer.answer)}</Text>
                                    </View>

                                    {/* AI Feedback */}
                                    {feedbacks.length > 0 && (
                                        <View style={styles.feedbackSection}>
                                            <Text style={styles.feedbackLabel}>Feedback Automático (IA)</Text>
                                            {feedbacks.map((fb: any, fi: number) => (
                                                <View key={fi} style={fi < feedbacks.length - 1 ? styles.feedbackItem : {}}>
                                                    <Text style={[styles.feedbackStatus, fb.isCorrect ? styles.feedbackStatusOk : styles.feedbackStatusFail]}>
                                                        Intento {fb.attempt} — Nota: {fb.score} — {fb.isCorrect ? "Correcto" : "Incorrecto"}
                                                    </Text>
                                                    <Text style={styles.feedbackText}>{stripMarkdown(fb.feedback || "")}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Score */}
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreChip}>
                                            Puntuación: {answer.score !== null ? Number(answer.score).toFixed(2) : "0.00"}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noAnswer}>Sin respuesta del estudiante</Text>
                            )}
                        </View>
                    );
                })}

                {/* Footer */}
                <Text style={styles.footer}>
                    Reporte generado por {appTitle} el {formatDateTime(new Date(), "dd/MM/yyyy HH:mm:ss")}
                </Text>
            </Page>
        </Document>
    );
}
