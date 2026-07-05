import { Page, Text, View, Document, StyleSheet, Font, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Ensure fonts are registered if not already globally available where this is rendered
// The parent component or global setup might already handle this, but it's safe to have here if isolated.
// Assuming ActivityReportPDF registers them, we might not strictly need it, but we'll include it.
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontWeight: 400, fontStyle: 'italic' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-mediumitalic-webfont.ttf', fontWeight: 500, fontStyle: 'italic' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bolditalic-webfont.ttf', fontWeight: 700, fontStyle: 'italic' },
    ]
});

const COLORS = {
    primary: '#1f2937', // gray-800 for titles
    secondary: '#374151', // gray-700
    gray500: '#6b7280',
    gray200: '#e5e7eb',
    gray50: '#f9fafb',
    blue50: '#eff6ff',
    blue100: '#dbeafe',
    blue600: '#2563eb',
    blue900: '#1e3a8a',
    emerald50: '#ecfdf5',
    emerald100: '#d1fae5',
    emerald600: '#059669',
    emerald800: '#065f46',
    green100: '#dcfce3',
    green800: '#166534',
    yellow100: '#fef9c3',
    yellow800: '#854d0e',
    red100: '#fee2e2',
    red800: '#991b1b',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        padding: 40,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 10,
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 4,
    },
    courseName: {
        fontSize: 14,
        color: COLORS.secondary,
    },
    dateHeader: {
        alignItems: 'flex-end',
    },
    dateLabel: {
        fontSize: 8,
        color: COLORS.gray500,
    },
    dateValue: {
        fontSize: 10,
        fontWeight: 500,
    },
    infoGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray50,
        padding: 15,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        marginBottom: 20,
    },
    infoColumn: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 8,
        color: COLORS.gray500,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 12,
        fontWeight: 700,
        color: '#111827',
    },
    infoValueTeacher: {
        fontSize: 12,
        fontWeight: 500,
        color: '#111827',
    },
    summaryGrid: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 15,
    },
    summaryCardBlue: {
        flex: 1,
        backgroundColor: COLORS.blue50,
        padding: 15,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.blue100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryCardEmerald: {
        flex: 1,
        backgroundColor: COLORS.emerald50,
        padding: 15,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.emerald100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryTitleBlue: {
        fontSize: 8,
        color: COLORS.blue600,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryTitleEmerald: {
        fontSize: 8,
        color: COLORS.emerald600,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    summaryMainValueBlue: {
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.blue900,
    },
    summaryMainValueEmerald: {
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.emerald800, // Slightly darker than requested for readability
    },
    summarySideInfoBlue: {
        alignItems: 'flex-end',
    },
    summarySideInfoEmerald: {
        alignItems: 'flex-end',
    },
    summarySideLabelBlue: {
        fontSize: 8,
        color: COLORS.blue600,
        marginBottom: 4,
    },
    summarySideLabelEmerald: {
        fontSize: 8,
        color: '#064e3b',
        marginBottom: 2,
    },
    summarySideValueBlue: {
        fontSize: 14,
        fontWeight: 700,
        color: COLORS.blue900,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        paddingBottom: 5,
        marginBottom: 10,
    },
    // Table Styles
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderBottomColor: '#d1d5db',
        paddingBottom: 5,
        marginBottom: 5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray50,
        paddingVertical: 5,
        alignItems: 'center',
    },
    thRowId: { width: '5%', fontSize: 9, fontWeight: 700, color: COLORS.secondary },
    thActivity: { width: '40%', fontSize: 9, fontWeight: 700, color: COLORS.secondary },
    thWeight: { width: '10%', fontSize: 9, fontWeight: 700, color: COLORS.secondary, textAlign: 'center' },
    thStatus: { width: '15%', fontSize: 9, fontWeight: 700, color: COLORS.secondary, textAlign: 'center' },
    thLink: { width: '15%', fontSize: 9, fontWeight: 700, color: COLORS.secondary, textAlign: 'center' },
    thGrade: { width: '15%', fontSize: 9, fontWeight: 700, color: COLORS.secondary, textAlign: 'right' },

    tdRowId: { width: '5%', fontSize: 9, color: COLORS.gray500 },
    tdActivity: { width: '40%', fontSize: 9, fontWeight: 500, color: '#111827' },
    tdWeight: { width: '10%', fontSize: 9, color: '#4b5563', textAlign: 'center' },
    tdStatusContainer: { width: '15%', alignItems: 'center' },
    tdLinkContainer: { width: '15%', alignItems: 'center' },
    tdGrade: { width: '15%', fontSize: 10, fontWeight: 700, color: '#111827', textAlign: 'right' },
    
    // Hierarchical Rows
    categoryRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray200,
        paddingVertical: 4,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
    },
    categoryTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.primary,
        flex: 1,
    },
    categoryGrade: {
        width: '15%',
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.primary,
        textAlign: 'right',
    },
    groupRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray50,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
    },
    groupTitle: {
        fontSize: 9,
        fontWeight: 700,
        fontStyle: 'italic',
        color: COLORS.secondary,
        flex: 1,
    },
    groupGrade: {
        width: '15%',
        fontSize: 9,
        fontWeight: 700,
        color: COLORS.secondary,
        textAlign: 'right',
    },

    badgeCommon: {
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 10,
        fontSize: 7,
        fontWeight: 700,
        textTransform: 'uppercase',
    },
    linkText: {
        fontSize: 8,
        color: COLORS.blue600,
        textDecoration: 'underline',
    },
    noLinkText: {
        fontSize: 9,
        color: COLORS.gray500,
    },

    // Attendance Table
    thDate: { width: '30%', fontSize: 9, fontWeight: 700, color: COLORS.secondary },
    thAttStatus: { width: '20%', fontSize: 9, fontWeight: 700, color: COLORS.secondary },
    thJustification: { width: '50%', fontSize: 9, fontWeight: 700, color: COLORS.secondary },
    tdDate: { width: '30%', fontSize: 9, color: '#111827' },
    tdAttStatusContainer: { width: '20%', alignItems: 'flex-start' },
    tdJustification: { width: '50%', fontSize: 8, color: '#4b5563' },

    // Remarks
    remarkCardAttention: {
        backgroundColor: COLORS.red100,
        borderColor: '#fca5a5',
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
    },
    remarkCardCongrats: {
        backgroundColor: COLORS.green100,
        borderColor: '#86efac',
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
    },
    remarkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    remarkTitleBlock: {
        flex: 1,
    },
    remarkBadgeAttention: {
        backgroundColor: '#fee2e2',
        color: COLORS.red800,
        fontSize: 7,
        fontWeight: 700,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 2,
    },
    remarkBadgeCongrats: {
        backgroundColor: '#dcfce3',
        color: COLORS.green800,
        fontSize: 7,
        fontWeight: 700,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
        marginBottom: 2,
    },
    remarkTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: '#111827',
    },
    remarkDate: {
        fontSize: 8,
        color: COLORS.gray500,
    },
    remarkDesc: {
        fontSize: 9,
        color: '#374151',
    },
    emptyText: {
        fontSize: 9,
        fontStyle: 'italic',
        color: COLORS.gray500,
    }
});

interface CourseReportPDFDocumentProps {
    studentName: string;
    courseName: string;
    teacherName: string;
    averageGrade: number;
    categories: any[];
    attendances: any[];
    remarks: any[];
}

export const CourseReportPDFDocument = ({
    studentName,
    courseName,
    teacherName,
    averageGrade,
    categories = [],
    attendances = [],
    remarks = []
}: CourseReportPDFDocumentProps) => {

    // Calculate Attendance Stats
    const totalClasses = attendances.length;
    const presentCount = attendances.filter(a => a.status === "PRESENT").length;
    const absentCount = attendances.filter(a => a.status === "ABSENT").length;
    const lateCount = attendances.filter(a => a.status === "LATE").length;
    const excusedCount = attendances.filter(a => a.status === "EXCUSED").length;
    const attendancePercentage = totalClasses > 0
        ? ((presentCount + lateCount) / totalClasses) * 100
        : 100;

    const evaluatedCount = categories.reduce((acc, cat) => 
        acc + cat.groups.reduce((gAcc: any, group: any) => 
            gAcc + group.items.filter((i: any) => i.grade > 0).length, 0), 0);
    const totalItems = categories.reduce((acc, cat) => 
        acc + cat.groups.reduce((gAcc: any, group: any) => 
            gAcc + group.items.length, 0), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>Informe de Desempeño Académico</Text>
                        <Text style={styles.courseName}>{courseName}</Text>
                    </View>
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateLabel}>Fecha de generación</Text>
                        <Text style={styles.dateValue}>{format(new Date(), "PPP", { locale: es })}</Text>
                    </View>
                </View>

                {/* Student Info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoColumn}>
                        <Text style={styles.infoLabel}>Estudiante</Text>
                        <Text style={styles.infoValue}>{studentName}</Text>
                    </View>
                    <View style={styles.infoColumn}>
                        <Text style={styles.infoLabel}>Profesor</Text>
                        <Text style={styles.infoValueTeacher}>{teacherName}</Text>
                    </View>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCardBlue}>
                        <View>
                            <Text style={styles.summaryTitleBlue}>Promedio Acumulado</Text>
                            <Text style={styles.summaryMainValueBlue}>{averageGrade.toFixed(1)}</Text>
                        </View>
                        <View style={styles.summarySideInfoBlue}>
                            <Text style={styles.summarySideLabelBlue}>Actividades Evaluadas</Text>
                            <Text style={styles.summarySideValueBlue}>
                                {evaluatedCount} / {totalItems}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryCardEmerald}>
                        <View>
                            <Text style={styles.summaryTitleEmerald}>Asistencia</Text>
                            <Text style={styles.summaryMainValueEmerald}>{attendancePercentage.toFixed(0)}%</Text>
                        </View>
                        <View style={styles.summarySideInfoEmerald}>
                            <Text style={styles.summarySideLabelEmerald}>Presente: {presentCount}</Text>
                            <Text style={styles.summarySideLabelEmerald}>Tarde: {lateCount}</Text>
                            <Text style={styles.summarySideLabelEmerald}>Ausente: {absentCount}</Text>
                            <Text style={styles.summarySideLabelEmerald}>Excusado: {excusedCount}</Text>
                        </View>
                    </View>
                </View>

                {/* Activities Table */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionTitle}>Detalle de Calificaciones (Jerárquico)</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={styles.thRowId}>#</Text>
                            <Text style={styles.thActivity}>Elemento / Actividad</Text>
                            <Text style={styles.thWeight}>Peso Rel.</Text>
                            <Text style={styles.thStatus}>Estado</Text>
                            <Text style={styles.thLink}>Ref.</Text>
                            <Text style={styles.thGrade}>Nota</Text>
                        </View>
                        
                        {categories.map((cat, catIndex) => (
                            <View key={cat.id || catIndex} wrap={false}>
                                {/* Category Header */}
                                <View style={styles.categoryRow}>
                                    <Text style={styles.categoryTitle}>{cat.name} ({cat.weight}%)</Text>
                                    <Text style={styles.categoryGrade}>{cat.grade.toFixed(2)}</Text>
                                </View>
                                
                                {cat.groups.map((group: any, groupIndex: number) => (
                                    <View key={group.id || groupIndex} wrap={false}>
                                        {/* Group Header */}
                                        <View style={styles.groupRow}>
                                            <Text style={styles.groupTitle}>  • {group.name} ({group.weight}%)</Text>
                                            <Text style={styles.groupGrade}>{group.grade.toFixed(2)}</Text>
                                        </View>
                                        
                                        {/* Items */}
                                        {group.items.map((item: any, itemIndex: number) => {
                                            const isGraded = item.grade > 0;
                                            
                                            return (
                                                <View key={item.id || itemIndex} style={styles.tableRow} wrap={false}>
                                                    <Text style={styles.tdRowId}>{itemIndex + 1}</Text>
                                                    <View style={[styles.tdActivity, { paddingLeft: 20 }]}>
                                                        {item.activityLink ? (
                                                            <Link src={item.activityLink} style={{ color: COLORS.blue600, textDecoration: 'underline' }}>
                                                                <Text>{item.title}</Text>
                                                            </Link>
                                                        ) : (
                                                            <Text>{item.title}</Text>
                                                        )}
                                                    </View>
                                                    <Text style={styles.tdWeight}>{item.weight}%</Text>
                                                    <View style={styles.tdStatusContainer}>
                                                        <Text style={[styles.badgeCommon, { 
                                                            backgroundColor: isGraded ? COLORS.green100 : COLORS.gray50, 
                                                            color: isGraded ? COLORS.green800 : COLORS.gray500 
                                                        }]}>
                                                            {isGraded ? "Calificado" : "Pendiente"}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.tdLinkContainer}>
                                                        {item.link ? (
                                                            <Link src={item.link} style={styles.linkText}>Link</Link>
                                                        ) : (
                                                            <Text style={styles.noLinkText}>-</Text>
                                                        )}
                                                    </View>
                                                    <Text style={styles.tdGrade}>{item.grade.toFixed(2)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        ))}
                        
                        {categories.length === 0 && (
                            <View style={{ padding: 10 }}>
                                <Text style={styles.emptyText}>No hay actividades configuradas.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Attendance Table */}
                <View style={{ marginBottom: 20 }} break={attendances.length > 5}>
                    <Text style={styles.sectionTitle}>Historial de Asistencia</Text>
                    {attendances.length > 0 ? (
                        <View style={styles.table}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={styles.thDate}>Fecha</Text>
                                <Text style={styles.thAttStatus}>Estado</Text>
                                <Text style={styles.thJustification}>Justificación</Text>
                            </View>
                            {attendances.map((record) => {
                                let statusText = "Presente";
                                let statusBg = COLORS.green100;
                                let statusColor = COLORS.green800;

                                if (record.status === "ABSENT") {
                                    statusText = "Ausente";
                                    statusBg = COLORS.red100;
                                    statusColor = COLORS.red800;
                                } else if (record.status === "LATE") {
                                    statusText = "Tarde";
                                    statusBg = COLORS.yellow100;
                                    statusColor = COLORS.yellow800;
                                } else if (record.status === "EXCUSED") {
                                    statusText = "Excusado";
                                    statusBg = COLORS.blue100;
                                    statusColor = COLORS.blue600;
                                }

                                return (
                                    <View key={record.id} style={styles.tableRow} wrap={false}>
                                        <Text style={styles.tdDate}>{format(new Date(record.date), "PPP", { locale: es })}</Text>
                                        <View style={styles.tdAttStatusContainer}>
                                            <Text style={[styles.badgeCommon, { backgroundColor: statusBg, color: statusColor }]}>
                                                {statusText}
                                            </Text>
                                        </View>
                                        <View style={{ width: '50%' }}>
                                            <Text style={styles.tdJustification}>{record.justification || "-"}</Text>
                                            {record.justificationUrl && (
                                                <Link src={record.justificationUrl} style={[styles.linkText, { marginTop: 2 }]}>Ver Soporte</Link>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No hay registros de asistencia.</Text>
                    )}
                </View>

                {/* Remarks */}
                {remarks.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Observaciones</Text>
                        {remarks.map(remark => (
                            <View
                                key={remark.id}
                                style={remark.type === "ATTENTION" ? styles.remarkCardAttention : styles.remarkCardCongrats}
                                wrap={false}
                            >
                                <View style={styles.remarkHeader}>
                                    <View style={styles.remarkTitleBlock}>
                                        <Text style={remark.type === "ATTENTION" ? styles.remarkBadgeAttention : styles.remarkBadgeCongrats}>
                                            {remark.type === "ATTENTION" ? "Llamado de Atención" : "Felicitación"}
                                        </Text>
                                        <Text style={styles.remarkTitle}>{remark.title}</Text>
                                    </View>
                                    <Text style={styles.remarkDate}>{format(new Date(remark.date), "PPP", { locale: es })}</Text>
                                </View>
                                <Text style={styles.remarkDesc}>{remark.description}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Page>
        </Document>
    );
};
