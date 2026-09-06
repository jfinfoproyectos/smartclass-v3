import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
    page: {
        padding: 25,
        fontSize: 8,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
        paddingBottom: 55,
    },
    header: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: "#0f172a",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    appTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginBottom: 2,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    subtitle: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#1e3a5f",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        backgroundColor: "#f8fafc",
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    statBox: {
        alignItems: "center",
        flex: 1,
    },
    statVal: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#1e293b",
    },
    statLabel: {
        fontSize: 7,
        color: "#64748b",
        textTransform: "uppercase",
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#1e293b",
        marginBottom: 6,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        textTransform: "uppercase",
    },
    studentCard: {
        marginBottom: 8,
        padding: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        backgroundColor: "#ffffff",
    },
    studentCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingBottom: 3,
        marginBottom: 3,
    },
    studentName: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    studentEmail: {
        fontSize: 8,
        color: "#64748b",
    },
    gradeBadge: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
    },
    gradePass: {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
    },
    gradeFail: {
        backgroundColor: "#fff1f2",
        color: "#9f1239",
    },
    gradePending: {
        backgroundColor: "#f1f5f9",
        color: "#475569",
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 7,
        color: "#475569",
        marginBottom: 3,
    },
    feedbackBox: {
        marginTop: 3,
        padding: 5,
        backgroundColor: "#f8fafc",
        borderRadius: 3,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    feedbackLabel: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: "#1e3a5f",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    feedbackText: {
        fontSize: 7,
        color: "#334155",
        lineHeight: 1.3,
    },
    footer: {
        position: "absolute",
        bottom: 15,
        left: 25,
        right: 25,
        fontSize: 7,
        color: "#94a3b8",
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 4,
    },
});

interface ActivitySummaryPDFDocumentProps {
    activity: any;
    studentStatusList: Array<{
        student: any;
        submission: any;
        status: string;
        isRejected?: boolean;
    }>;
}

export function ActivitySummaryPDFDocument({
    activity,
    studentStatusList,
}: ActivitySummaryPDFDocumentProps) {
    const totalStudents = studentStatusList.length;
    const submittedCount = studentStatusList.filter((s) => s.status !== "pending").length;
    const gradedList = studentStatusList.filter(
        (s) => s.submission?.grade !== null && s.submission?.grade !== undefined
    );
    const gradedCount = gradedList.length;

    const avgGrade =
        gradedCount > 0
            ? (
                  gradedList.reduce((acc, curr) => acc + (curr.submission?.grade || 0), 0) /
                  gradedCount
              ).toFixed(1)
            : "-";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.appTitle}>{activity?.title || "Actividad"}</Text>
                        <Text style={styles.subtitle}>
                            {activity?.course?.title || activity?.courseTitle || "Curso"} — Reporte General y Retroalimentación
                        </Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{totalStudents}</Text>
                        <Text style={styles.statLabel}>Estudiantes</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{submittedCount}</Text>
                        <Text style={styles.statLabel}>Entregas</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{gradedCount}</Text>
                        <Text style={styles.statLabel}>Calificados</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{avgGrade}</Text>
                        <Text style={styles.statLabel}>Promedio</Text>
                    </View>
                </View>

                {/* Student Results */}
                <Text style={styles.sectionTitle}>Resultados por Estudiante</Text>

                {studentStatusList.map(({ student, submission, status, isRejected }, idx) => {
                    const gradeVal =
                        submission?.grade !== null && submission?.grade !== undefined
                            ? Number(submission.grade)
                            : null;

                    const studentDisplayName =
                        student.name ||
                        `${student.profile?.nombres || ""} ${student.profile?.apellido || ""}`.trim() ||
                        "Estudiante";

                    const isPass = gradeVal !== null && gradeVal >= 3.0;

                    const cleanFeedback = submission?.feedback
                        ? String(submission.feedback)
                              .replace(/\\n/g, "\n")
                              .replace(/^#{1,6}\s*/gm, "")
                              .replace(/^>\s*/gm, "")
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                              .replace(/[*`]/g, "")
                              .trim()
                        : "";

                    return (
                        <View key={student.id || idx} style={styles.studentCard} wrap={false}>
                            <View style={styles.studentCardHeader}>
                                <View>
                                    <Text style={styles.studentName}>{studentDisplayName}</Text>
                                    <Text style={styles.studentEmail}>{student.email}</Text>
                                </View>
                                <View>
                                    {gradeVal !== null ? (
                                        <Text
                                            style={[
                                                styles.gradeBadge,
                                                isPass ? styles.gradePass : styles.gradeFail,
                                            ]}
                                        >
                                            Nota: {gradeVal.toFixed(1)} / 5.0
                                        </Text>
                                    ) : (
                                        <Text style={[styles.gradeBadge, styles.gradePending]}>
                                            {isRejected ? "RECHAZADO" : status === "submitted" ? "POR CALIFICAR" : "PENDIENTE"}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {submission && (
                                <View style={styles.metaRow}>
                                    <Text>
                                        Fecha:{" "}
                                        {format(
                                            new Date(submission.lastSubmittedAt || submission.createdAt),
                                            "PP p",
                                            { locale: es }
                                        )}
                                    </Text>
                                    <Text>
                                        Intentos: {submission.attemptCount || 1} / {activity.maxAttempts || 1}
                                    </Text>
                                </View>
                            )}

                            {cleanFeedback && (
                                <View style={styles.feedbackBox}>
                                    <Text style={styles.feedbackLabel}>Retroalimentación:</Text>
                                    <Text style={styles.feedbackText}>{cleanFeedback}</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text>SmartClass • EIA Learning System</Text>
                    <Text
                        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}
