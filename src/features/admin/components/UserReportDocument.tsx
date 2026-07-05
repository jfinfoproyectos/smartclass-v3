
import { Document, Page, Text, View, StyleSheet, Image as PdfImage } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatName } from '@/lib/utils';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#112233',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#112233',
    },
    subtitle: {
        fontSize: 10,
        color: '#666666',
        marginTop: 4,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#112233',
        marginBottom: 8,
        backgroundColor: '#f0f0f0',
        padding: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 2,
    },
    label: {
        width: '30%',
        fontSize: 10,
        color: '#666666',
        fontWeight: 'bold',
    },
    value: {
        width: '70%',
        fontSize: 10,
        color: '#000000',
    },
    table: {
        display: "flex",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#bfbfbf",
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 10,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
        minHeight: 20,
        alignItems: "center",
    },
    tableHeader: {
        backgroundColor: "#f0f0f0",
        fontWeight: "bold",
    },
    tableCol: {
        width: "25%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: "#bfbfbf",
        padding: 3,
    },
    tableCell: {
        margin: "auto",
        marginTop: 2,
        fontSize: 8,
    },
    statusPresent: { color: 'green' },
    statusAbsent: { color: 'red' },
    statusLate: { color: '#b45309' }, // amber-700
    statusExcused: { color: 'blue' },
});

interface UserReportProps {
    user: any;
    details: any;
}

export const UserReportDocument = ({ user, details }: UserReportProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Reporte de Usuario</Text>
                    <Text style={styles.subtitle}>Generado el {format(new Date(), "PPpp")}</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 12 }}>{formatName(user.name, user.profile)}</Text>
                    <Text style={{ fontSize: 10, color: '#666' }}>{user.email}</Text>
                    <Text style={{ fontSize: 10, color: '#666' }}>Rol: {user.role}</Text>
                </View>
            </View>

            {/* Profile Section */}
            {user.profile && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Identificación:</Text>
                        <Text style={styles.value}>{user.profile.identificacion || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombres:</Text>
                        <Text style={styles.value}>{user.profile.nombres || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Apellidos:</Text>
                        <Text style={styles.value}>{user.profile.apellido || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Teléfono:</Text>
                        <Text style={styles.value}>{user.profile.telefono || "-"}</Text>
                    </View>
                </View>
            )}

            {/* Stats */}
            {user._count && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Cursos Inscritos:</Text>
                        <Text style={styles.value}>{user._count.enrollments}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Entregas Realizadas:</Text>
                        <Text style={styles.value}>{user._count.submissions}</Text>
                    </View>
                </View>
            )}

            {/* Courses Table */}
            {details?.enrollments?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cursos Inscritos</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>Curso</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>Fecha</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>Estado</Text></View>
                        </View>
                        {details.enrollments.map((enrollment: any, index: number) => (
                            <View key={index} style={styles.tableRow}>
                                <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>{enrollment.course.title}</Text></View>
                                <View style={styles.tableCol}><Text style={styles.tableCell}>{format(new Date(enrollment.createdAt), "dd/MM/yyyy")}</Text></View>
                                <View style={styles.tableCol}><Text style={styles.tableCell}>{enrollment.status}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Attendance Table */}
            {details?.attendances?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Historial de Asistencia</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>Fecha</Text></View>
                            <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>Curso</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>Estado</Text></View>
                        </View>
                        {details.attendances.map((record: any, index: number) => (
                            <View key={index} style={styles.tableRow}>
                                <View style={styles.tableCol}><Text style={styles.tableCell}>{format(new Date(record.date), "dd/MM/yyyy HH:mm")}</Text></View>
                                <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{record.course?.title || "N/A"}</Text></View>
                                <View style={styles.tableCol}>
                                    <Text style={[
                                        styles.tableCell,
                                        record.status === 'PRESENT' ? styles.statusPresent :
                                            record.status === 'ABSENT' ? styles.statusAbsent :
                                                record.status === 'LATE' ? styles.statusLate : styles.statusExcused
                                    ]}>
                                        {record.status}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Remarks Section */}
            {details?.remarks?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Observaciones</Text>
                    {details.remarks.map((remark: any, index: number) => (
                        <View key={index} style={{ marginBottom: 8, padding: 5, borderLeftWidth: 2, borderLeftColor: remark.type === 'COMMENDATION' ? 'green' : 'orange' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{remark.title} ({format(new Date(remark.date), "dd/MM/yyyy")})</Text>
                            <Text style={{ fontSize: 9, marginTop: 2 }}>{remark.description}</Text>
                            <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>Por: {formatName(remark.teacher.name, remark.teacher.profile)}</Text>
                        </View>
                    ))}
                </View>
            )}

        </Page>
    </Document>
);
