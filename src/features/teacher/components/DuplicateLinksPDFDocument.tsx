import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontSize: 8.5,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
        paddingBottom: 40,
    },
    header: {
        marginBottom: 14,
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
    courseTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#1e3a5f",
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 7.5,
        color: "#64748b",
    },
    metaDate: {
        fontSize: 7.5,
        color: "#64748b",
    },
    activityBlock: {
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        overflow: "hidden",
    },
    activityHeader: {
        backgroundColor: "#f8fafc",
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        flexDirection: "row",
        justifyContent: "space-between",
    },
    activityTitle: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
    },
    dupContainer: {
        padding: 6,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    urlText: {
        fontSize: 7.5,
        fontFamily: "Courier",
        color: "#9f1239",
        marginBottom: 4,
    },
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 3,
        overflow: "hidden",
    },
    thRow: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        minHeight: 16,
        alignItems: "center",
    },
    thCell: {
        color: "#ffffff",
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        paddingHorizontal: 4,
    },
    trRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        minHeight: 16,
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
    tdCell: {
        fontSize: 7,
        paddingHorizontal: 4,
    },
    footer: {
        position: "absolute",
        bottom: 12,
        left: 28,
        right: 28,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 6,
    },
    footerText: {
        fontSize: 7,
        color: "#94a3b8",
    },
});

interface DuplicateLinksPDFProps {
    courseName: string;
    data: any[];
}

export function DuplicateLinksPDFDocument({ courseName, data }: DuplicateLinksPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.appTitle}>SmartClass — Auditoría de Enlaces Duplicados</Text>
                        <Text style={styles.courseTitle}>Curso: {courseName}</Text>
                        <Text style={styles.subtitle}>
                            Actividades con entregas duplicadas detectadas: {data.length}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.metaDate}>
                            Generado: {format(new Date(), "PPpp", { locale: es })}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                {data.map((act) => (
                    <View key={act.activityId} style={styles.activityBlock} wrap={false}>
                        <View style={styles.activityHeader}>
                            <Text style={styles.activityTitle}>Actividad: {act.activityTitle}</Text>
                            <Text style={{ fontSize: 7.5, color: "#64748b" }}>
                                {act.duplicates.length} enlace(s) duplicado(s)
                            </Text>
                        </View>

                        {act.duplicates.map((dup: any, dIdx: number) => (
                            <View key={dIdx} style={styles.dupContainer}>
                                <Text style={styles.urlText}>URL Duplicada: {dup.url}</Text>

                                <View style={styles.table}>
                                    <View style={styles.thRow}>
                                        <Text style={[styles.thCell, { width: "35%" }]}>Estudiante</Text>
                                        <Text style={[styles.thCell, { width: "35%" }]}>Correo</Text>
                                        <Text style={[styles.thCell, { width: "30%" }]}>Fecha de Entrega</Text>
                                    </View>
                                    {dup.students.map((st: any, sIdx: number) => (
                                        <View key={sIdx} style={styles.trRow}>
                                            <Text style={[styles.tdCell, { width: "35%", fontFamily: "Helvetica-Bold" }]}>
                                                {st.name}
                                            </Text>
                                            <Text style={[styles.tdCell, { width: "35%", color: "#475569" }]}>
                                                {st.email}
                                            </Text>
                                            <Text style={[styles.tdCell, { width: "30%", color: "#64748b" }]}>
                                                {new Date(st.submissionDate).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Audit System
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
