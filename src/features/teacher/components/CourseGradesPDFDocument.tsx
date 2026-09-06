import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 8,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
        paddingBottom: 40,
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
    headerLeft: {
        flex: 1,
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
    metaBox: {
        alignItems: "flex-end",
    },
    metaDate: {
        fontSize: 7.5,
        color: "#64748b",
    },
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 6,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#1e293b",
        minHeight: 22,
        alignItems: "center",
    },
    tableSubHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#334155",
        minHeight: 18,
        alignItems: "center",
    },
    thCell: {
        color: "#ffffff",
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        paddingHorizontal: 4,
        paddingVertical: 3,
        textAlign: "center",
        borderRightWidth: 1,
        borderRightColor: "#475569",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        minHeight: 18,
        alignItems: "center",
    },
    tdCell: {
        fontSize: 7,
        paddingHorizontal: 4,
        paddingVertical: 2.5,
        borderRightWidth: 1,
        borderRightColor: "#e2e8f0",
    },
    gradePassing: {
        color: "#047857",
        fontFamily: "Helvetica-Bold",
    },
    gradeFailing: {
        color: "#9f1239",
        fontFamily: "Helvetica-Bold",
    },
    footer: {
        position: "absolute",
        bottom: 12,
        left: 24,
        right: 24,
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

interface CourseGradesPDFProps {
    courseTitle: string;
    categories: any[];
    students: any[];
    calcCategory: (studentId: string, category: any) => number;
    calcGroup: (studentId: string, group: any) => number;
    calcFinal: (studentId: string) => number;
}

export function CourseGradesPDFDocument({
    courseTitle,
    categories,
    students,
    calcCategory,
    calcGroup,
    calcFinal,
}: CourseGradesPDFProps) {
    const studentColWidth = "22%";
    const finalColWidth = "8%";

    // Compute remaining width for categories
    const totalCategories = categories.length || 1;
    const catColWidth = `${(70 / totalCategories).toFixed(2)}%`;

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.appTitle}>SmartClass — Reporte de Calificaciones</Text>
                        <Text style={styles.courseTitle}>{courseTitle}</Text>
                        <Text style={styles.subtitle}>
                            Estudiantes matriculados: {students.length} • Categorías de evaluación: {categories.length}
                        </Text>
                    </View>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaDate}>
                            Generado: {format(new Date(), "PPpp", { locale: es })}
                        </Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.thCell, { width: studentColWidth, textAlign: "left" }]}>
                            Estudiante
                        </Text>
                        {categories.map((cat: any) => (
                            <Text key={cat.id} style={[styles.thCell, { width: catColWidth }]}>
                                {cat.name} ({cat.weight}%)
                            </Text>
                        ))}
                        <Text style={[styles.thCell, { width: finalColWidth, borderRightWidth: 0 }]}>
                            Nota Final
                        </Text>
                    </View>

                    {/* Student Rows */}
                    {students.map((student: any, idx: number) => {
                        const finalGrade = calcFinal(student.id);
                        const isEven = idx % 2 === 0;
                        const studentName = student.name || `${student.profile?.nombres || ''} ${student.profile?.apellido || ''}`.trim() || student.email;

                        return (
                            <View
                                key={student.id}
                                style={[
                                    styles.tableRow,
                                    { backgroundColor: isEven ? "#ffffff" : "#f8fafc" },
                                ]}
                            >
                                <View style={[styles.tdCell, { width: studentColWidth }]}>
                                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5 }}>
                                        {studentName}
                                    </Text>
                                    <Text style={{ fontSize: 6.5, color: "#64748b" }}>
                                        {student.email}
                                    </Text>
                                </View>

                                {categories.map((cat: any) => {
                                    const catGrade = calcCategory(student.id, cat);
                                    const isPassing = catGrade >= 3.0;

                                    return (
                                        <View key={cat.id} style={[styles.tdCell, { width: catColWidth, alignItems: "center", justifyContent: "center" }]}>
                                            <Text style={isPassing ? styles.gradePassing : styles.gradeFailing}>
                                                {catGrade.toFixed(1)}
                                            </Text>
                                        </View>
                                    );
                                })}

                                <View style={[styles.tdCell, { width: finalColWidth, alignItems: "center", justifyContent: "center", borderRightWidth: 0, backgroundColor: isEven ? "#f1f5f9" : "#e2e8f0" }]}>
                                    <Text
                                        style={[
                                            finalGrade >= 3.0 ? styles.gradePassing : styles.gradeFailing,
                                            { fontSize: 8.5 },
                                        ]}
                                    >
                                        {finalGrade.toFixed(1)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Platform • Escuela de Ingeniería de Antioquia
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
