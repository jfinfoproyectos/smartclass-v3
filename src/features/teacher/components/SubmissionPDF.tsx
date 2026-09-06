import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDateTime } from "@/lib/dateUtils";

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingHorizontal: 35,
        paddingBottom: 55,
        fontSize: 9,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
    },
    header: {
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        borderStyle: "solid",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    headerLeft: { flex: 1, paddingRight: 10 },
    appTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginBottom: 2,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    reportTitle: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#1e3a5f",
        marginBottom: 2,
    },
    studentSubTitle: {
        fontSize: 8.5,
        color: "#475569",
    },
    scoreBox: {
        backgroundColor: "#ecfdf5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        borderStyle: "solid",
        borderRadius: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 85,
    },
    scoreBoxFail: {
        backgroundColor: "#fff1f2",
        borderColor: "#fecdd3",
    },
    scoreValue: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: "#065f46",
    },
    scoreValueFail: {
        color: "#9f1239",
    },
    scoreLabel: {
        fontSize: 7,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 1,
    },
    badgePass: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#15803d",
        marginTop: 1,
    },
    badgeFail: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#dc2626",
        marginTop: 1,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "solid",
        borderRadius: 4,
        padding: 8,
        backgroundColor: "#f8fafc",
    },
    infoItem: {
        width: "50%",
        marginBottom: 4,
        fontSize: 8.5,
        paddingRight: 6,
    },
    labelText: {
        fontFamily: "Helvetica-Bold",
        color: "#475569",
    },
    sectionTitle: {
        fontSize: 10.5,
        fontFamily: "Helvetica-Bold",
        marginBottom: 8,
        color: "#0f172a",
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
    },
    questionContainer: {
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderStyle: "solid",
        borderRadius: 4,
        backgroundColor: "#ffffff",
    },
    questionHeader: {
        backgroundColor: "#f1f5f9",
        paddingVertical: 5,
        paddingHorizontal: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        borderBottomStyle: "solid",
    },
    questionNum: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    questionTypeBadge: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#475569",
        backgroundColor: "#e2e8f0",
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
        textTransform: "uppercase",
    },
    questionBody: {
        padding: 8,
        backgroundColor: "#ffffff",
    },
    answerSection: {
        padding: 8,
        backgroundColor: "#fdfdfd",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
    },
    answerLabel: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#475569",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    feedbackSection: {
        padding: 8,
        backgroundColor: "#f0fdf4",
        borderTopWidth: 1,
        borderTopColor: "#dcfce7",
        borderTopStyle: "solid",
    },
    feedbackLabel: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#166534",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    feedbackItem: {
        marginBottom: 4,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#dcfce7",
        borderBottomStyle: "solid",
    },
    feedbackStatus: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
    },
    feedbackStatusOk: { color: "#15803d" },
    feedbackStatusFail: { color: "#b45309" },
    feedbackStatusNeutral: { color: "#1e40af" },
    feedbackText: {
        fontSize: 8,
        color: "#1e3a8a",
        lineHeight: 1.35,
    },
    scoreRow: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
    },
    scoreRowLabel: {
        fontSize: 7.5,
        color: "#64748b",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
    },
    scoreChip: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: "#1e293b",
    },
    noAnswer: {
        fontSize: 8.5,
        color: "#94a3b8",
        fontStyle: "italic",
        padding: 8,
        textAlign: "center",
    },
    // Prose styling
    proseText: {
        fontSize: 8.5,
        lineHeight: 1.4,
        color: "#1e293b",
        marginBottom: 3,
    },
    bulletRow: {
        flexDirection: "row",
        marginBottom: 2,
        paddingLeft: 4,
    },
    bulletDot: {
        width: 10,
        fontSize: 8.5,
        color: "#2563eb",
        fontFamily: "Helvetica-Bold",
    },
    bulletContent: {
        flex: 1,
        fontSize: 8.5,
        lineHeight: 1.35,
        color: "#334155",
    },
    headingText: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginTop: 4,
        marginBottom: 2,
    },
    // Code block styling (Print-Friendly High Contrast)
    codeContainer: {
        marginVertical: 4,
        borderRadius: 4,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderStyle: "solid",
        overflow: "hidden",
    },
    codeHeader: {
        backgroundColor: "#e2e8f0",
        paddingHorizontal: 6,
        paddingVertical: 3,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        borderBottomStyle: "solid",
    },
    codeLangBadge: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#334155",
        textTransform: "uppercase",
    },
    codeLinesCount: {
        fontSize: 6.5,
        color: "#64748b",
    },
    codeBody: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    codeLineRow: {
        flexDirection: "row",
        minHeight: 11,
    },
    codeLineNumber: {
        fontFamily: "Courier",
        fontSize: 7,
        color: "#94a3b8",
        textAlign: "right",
        paddingRight: 6,
    },
    codeLineContent: {
        fontFamily: "Courier",
        fontSize: 7.5,
        color: "#0f172a",
        flex: 1,
        lineHeight: 1.25,
    },
    // Fixed Header / Footer
    footer: {
        position: "absolute",
        bottom: 20,
        left: 35,
        right: 35,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        borderTopStyle: "solid",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerText: {
        fontSize: 7.5,
        color: "#94a3b8",
    },
});

/**
 * Formats multi-line code with line numbers and monospace Courier font
 */
function renderCodeBlock(code: string, language?: string) {
    if (!code || typeof code !== "string") {
        return <Text style={styles.noAnswer}>Sin código registrado.</Text>;
    }

    const lines = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const maxLineNumWidth = lines.length >= 100 ? 22 : 16;

    return (
        <View style={styles.codeContainer}>
            <View style={styles.codeHeader}>
                <Text style={styles.codeLangBadge}>{language ? language.toUpperCase() : "CÓDIGO"}</Text>
                <Text style={styles.codeLinesCount}>{lines.length} líneas</Text>
            </View>
            <View style={styles.codeBody}>
                {lines.map((line, idx) => (
                    <View key={idx} style={styles.codeLineRow}>
                        <Text style={[styles.codeLineNumber, { width: maxLineNumWidth }]}>
                            {idx + 1}
                        </Text>
                        <Text style={styles.codeLineContent}>
                            {line || " "}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * Parses markdown text into styled paragraphs, headings, bullet lists and inline code
 */
function renderFormattedContent(text: string) {
    if (!text || typeof text !== "string") return null;

    // Detect and separate fenced code blocks ```...```
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
        <View>
            {parts.map((part, pIdx) => {
                if (!part) return null;

                // Fenced code block
                if (part.startsWith("```") && part.endsWith("```")) {
                    const firstNewline = part.indexOf("\n");
                    const lang = firstNewline !== -1 ? part.slice(3, firstNewline).trim() : "";
                    const codeContent = firstNewline !== -1 ? part.slice(firstNewline + 1, -3).trim() : part.slice(3, -3).trim();
                    return (
                        <View key={`code-${pIdx}`}>
                            {renderCodeBlock(codeContent, lang)}
                        </View>
                    );
                }

                // Regular prose markdown lines
                const lines = part.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

                return (
                    <View key={`prose-${pIdx}`}>
                        {lines.map((rawLine, lIdx) => {
                            const line = rawLine.trim();
                            if (!line) return null;

                            // Headings #, ##, ###
                            if (line.startsWith("#")) {
                                const cleanHeading = line.replace(/^#+\s*/, "");
                                return (
                                    <Text key={lIdx} style={styles.headingText}>
                                        {cleanHeading}
                                    </Text>
                                );
                            }

                            // Bullet lists -, *, •
                            if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
                                const cleanBullet = line.replace(/^[-*•]\s*/, "");
                                return (
                                    <View key={lIdx} style={styles.bulletRow}>
                                        <Text style={styles.bulletDot}>•</Text>
                                        <Text style={styles.bulletContent}>{cleanBullet}</Text>
                                    </View>
                                );
                            }

                            // Regular text line with cleaned markdown delimiters
                            const cleanText = line
                                .replace(/`([^`]+)`/g, "$1")
                                .replace(/\*\*([^*]+)\*\*/g, "$1")
                                .replace(/\*([^*]+)\*/g, "$1")
                                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

                            return (
                                <Text key={lIdx} style={styles.proseText}>
                                    {cleanText}
                                </Text>
                            );
                        })}
                    </View>
                );
            })}
        </View>
    );
}

export interface SubmissionPDFProps {
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
        language?: string;
        referenceAnswer?: string;
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
                        <Text style={styles.studentSubTitle}>{studentName} — {studentEmail}</Text>
                    </View>
                    <View style={[styles.scoreBox, !passed && score !== null ? styles.scoreBoxFail : {}]}>
                        <Text style={[styles.scoreValue, !passed && score !== null ? styles.scoreValueFail : {}]}>
                            {score !== null ? Number(score).toFixed(2) : "—"}
                        </Text>
                        <Text style={styles.scoreLabel}>Nota Final / 5.0</Text>
                        {score !== null && (
                            <Text style={passed ? styles.badgePass : styles.badgeFail}>
                                {passed ? "APROBADO" : "REPROBADO"}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Info Metadata */}
                <View style={styles.infoGrid} wrap={false}>
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
                            <Text><Text style={styles.labelText}>Expulsiones registradas: </Text>{expulsions}</Text>
                        </View>
                    )}
                </View>

                {/* Questions Section Title */}
                <Text style={styles.sectionTitle} wrap={false}>Respuestas del Estudiante</Text>

                {/* Questions List */}
                {questions.map((question, index) => {
                    const answer = question.answer;
                    const isCode = question.type?.toLowerCase() === "code";

                    // Parse AI Feedback
                    let feedbackList: Array<{ attempt?: number; score?: number; isCorrect?: boolean; feedback: string }> = [];
                    if (answer?.aiFeedback) {
                        if (Array.isArray(answer.aiFeedback)) {
                            feedbackList = answer.aiFeedback.map(fb => ({
                                attempt: fb.attempt,
                                score: fb.score,
                                isCorrect: fb.isCorrect,
                                feedback: typeof fb.feedback === "string" ? fb.feedback : (typeof fb === "string" ? fb : JSON.stringify(fb)),
                            }));
                        } else if (typeof answer.aiFeedback === "object") {
                            feedbackList = [{
                                attempt: (answer.aiFeedback as any).attempt,
                                score: (answer.aiFeedback as any).score,
                                isCorrect: (answer.aiFeedback as any).isCorrect,
                                feedback: (answer.aiFeedback as any).feedback || JSON.stringify(answer.aiFeedback),
                            }];
                        } else if (typeof answer.aiFeedback === "string") {
                            feedbackList = [{ feedback: answer.aiFeedback }];
                        }
                    }

                    return (
                        <View key={question.id || index} style={styles.questionContainer}>
                            {/* Question Header & Statement: kept together with wrap={false} */}
                            <View wrap={false}>
                                <View style={styles.questionHeader}>
                                    <Text style={styles.questionNum}>Pregunta {index + 1}</Text>
                                    <Text style={styles.questionTypeBadge}>
                                        {question.type}{question.language ? ` (${question.language})` : ""}
                                    </Text>
                                </View>

                                <View style={styles.questionBody}>
                                    {renderFormattedContent(question.text)}
                                </View>
                            </View>

                            {/* Answer Section */}
                            {answer ? (
                                <View style={styles.answerSection}>
                                    <Text style={styles.answerLabel}>Respuesta del estudiante</Text>
                                    {isCode ? (
                                        renderCodeBlock(answer.answer || "", question.language)
                                    ) : (
                                        renderFormattedContent(answer.answer || "Sin contenido")
                                    )}
                                </View>
                            ) : (
                                <Text style={styles.noAnswer}>Sin respuesta registrada para esta pregunta.</Text>
                            )}

                            {/* AI Feedback Section */}
                            {feedbackList.length > 0 && (
                                <View style={styles.feedbackSection}>
                                    <Text style={styles.feedbackLabel}>Feedback Automático (IA)</Text>
                                    {feedbackList.map((fb, fi) => (
                                        <View key={fi} style={fi < feedbackList.length - 1 ? styles.feedbackItem : {}} wrap={false}>
                                            {(fb.attempt !== undefined || fb.score !== undefined || fb.isCorrect !== undefined) && (
                                                <Text style={[
                                                    styles.feedbackStatus,
                                                    fb.isCorrect === true ? styles.feedbackStatusOk :
                                                        fb.isCorrect === false ? styles.feedbackStatusFail :
                                                            styles.feedbackStatusNeutral
                                                ]}>
                                                    {fb.attempt ? `Intento ${fb.attempt}` : "Intento 1"}
                                                    {fb.score !== undefined && fb.score !== null ? ` — Nota: ${Number(fb.score).toFixed(1)}` : ""}
                                                    {fb.isCorrect !== undefined ? ` — ${fb.isCorrect ? "Correcto" : "Requiere Revisión"}` : ""}
                                                </Text>
                                            )}
                                            {fb.feedback ? renderFormattedContent(fb.feedback) : null}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Score Row */}
                            {answer && (
                                <View style={styles.scoreRow} wrap={false}>
                                    <Text style={styles.scoreRowLabel}>Puntuación Obtenida</Text>
                                    <Text style={styles.scoreChip}>
                                        {answer.score !== null && answer.score !== undefined
                                            ? `${Number(answer.score).toFixed(2)} pts`
                                            : "0.00 pts"}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Fixed Footer with Dynamic Pagination on Every Page */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {appTitle} • Reporte de Evaluación • {formatDateTime(new Date(), "dd/MM/yyyy HH:mm")}
                    </Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}
