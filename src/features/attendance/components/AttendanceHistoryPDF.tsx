import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Ensure Roboto font is registered for @react-pdf/renderer
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontWeight: 400, fontStyle: 'italic' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ]
});

const COLORS = {
    primary: '#0f172a',      // Deep Executive Slate
    secondary: '#1e3a5f',    // Rich Corporate Navy
    accent: '#2563eb',       // Royal Blue
    accentLight: '#eff6ff',  // Soft Blue
    gray900: '#0f172a',
    gray700: '#334155',
    gray500: '#64748b',
    gray400: '#94a3b8',
    gray300: '#cbd5e1',
    gray200: '#e2e8f0',
    gray100: '#f1f5f9',
    gray50: '#f8fafc',
    
    // Status badges
    emerald800: '#065f46',
    emerald600: '#059669',
    emerald100: '#d1fae5',
    emerald50: '#ecfdf5',
    
    rose800: '#9f1239',
    rose600: '#e11d48',
    rose100: '#ffe4e6',
    rose50: '#fff1f2',
    
    amber800: '#92400e',
    amber600: '#d97706',
    amber100: '#fef3c7',
    amber50: '#fffbeb',

    indigo800: '#3730a3',
    indigo600: '#4f46e5',
    indigo100: '#e0e7ff',
    indigo50: '#eef2ff',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        paddingTop: 36,
        paddingLeft: 38,
        paddingRight: 38,
        paddingBottom: 50,
        backgroundColor: '#ffffff',
        fontSize: 9,
        color: COLORS.gray700,
    },
    
    // Header
    headerContainer: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.secondary,
        paddingBottom: 10,
        marginBottom: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    brandSub: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.accent,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    docTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: COLORS.primary,
        marginBottom: 2,
    },
    docCourse: {
        fontSize: 10.5,
        fontWeight: 500,
        color: COLORS.secondary,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    badgeOfficial: {
        backgroundColor: COLORS.accentLight,
        borderColor: COLORS.accent,
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 2,
        paddingHorizontal: 6,
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.accent,
        marginBottom: 4,
    },
    metaDate: {
        fontSize: 8,
        color: COLORS.gray500,
    },
    metaCode: {
        fontSize: 7.5,
        color: COLORS.gray400,
        marginTop: 1,
    },

    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray50,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        padding: 10,
        marginBottom: 14,
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.gray500,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 9.5,
        fontWeight: 700,
        color: COLORS.primary,
    },
    infoValueSub: {
        fontSize: 8,
        color: COLORS.gray700,
    },

    // KPI Summary
    kpiRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    kpiCard: {
        flex: 1,
        borderRadius: 5,
        borderWidth: 1,
        padding: 8,
        alignItems: 'center',
    },
    kpiValue: {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 2,
    },
    kpiLabel: {
        fontSize: 6.8,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Section title
    sectionTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: COLORS.primary,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
        paddingLeft: 6,
        marginBottom: 8,
    },

    // Table
    table: {
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 14,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    thCell: {
        fontSize: 7.5,
        fontWeight: 700,
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    tableRowAlt: {
        backgroundColor: COLORS.gray50,
    },
    tdCell: {
        fontSize: 8.5,
        color: COLORS.gray700,
    },

    // Badges inside table
    badge: {
        borderRadius: 3,
        paddingVertical: 1.5,
        paddingHorizontal: 5,
        fontSize: 7,
        fontWeight: 700,
        alignSelf: 'flex-start',
    },
    badgeRose: {
        backgroundColor: COLORS.rose50,
        color: COLORS.rose800,
        borderWidth: 1,
        borderColor: COLORS.rose100,
    },
    badgeAmber: {
        backgroundColor: COLORS.amber50,
        color: COLORS.amber800,
        borderWidth: 1,
        borderColor: COLORS.amber100,
    },
    badgeIndigo: {
        backgroundColor: COLORS.indigo50,
        color: COLORS.indigo800,
        borderWidth: 1,
        borderColor: COLORS.indigo100,
    },
    badgeEmerald: {
        backgroundColor: COLORS.emerald50,
        color: COLORS.emerald800,
        borderWidth: 1,
        borderColor: COLORS.emerald100,
    },

    // Signatures
    signaturesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    signatureBlock: {
        width: '40%',
        alignItems: 'center',
    },
    signatureLine: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray400,
        marginBottom: 5,
    },
    signatureName: {
        fontSize: 8.5,
        fontWeight: 700,
        color: COLORS.primary,
        textAlign: 'center',
    },
    signatureRole: {
        fontSize: 7,
        color: COLORS.gray500,
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 38,
        right: 38,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 7,
        color: COLORS.gray500,
    },
    footerPageNum: {
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.gray700,
    },
});

export interface StudentAttendanceHistoryPDFProps {
    student: {
        id: string;
        name: string | null;
        email: string;
        profile?: {
            identificacion?: string;
            nombres?: string;
            apellido?: string;
        } | null;
    };
    courseTitle: string;
    teacherName?: string;
    records: Array<{
        id: string;
        date: string | Date;
        status: string;
        arrivalTime?: string | Date | null;
        departureTime?: string | Date | null;
        justification?: string | null;
        justificationUrl?: string | null;
    }>;
    stats?: {
        absences: number;
        late: number;
        leaveEarly: number;
        excused?: number;
        totalSessions?: number;
        percentage?: number;
    };
}

export const StudentAttendanceHistoryPDF: React.FC<StudentAttendanceHistoryPDFProps> = ({
    student,
    courseTitle,
    teacherName = "Docente Titular",
    records = [],
    stats
}) => {
    const studentFullName = student.profile?.nombres && student.profile?.apellido
        ? `${student.profile.nombres} ${student.profile.apellido}`
        : (student.name || "Estudiante");
    const studentId = student.profile?.identificacion || student.id;

    const absencesCount = stats?.absences ?? records.filter(r => r.status === "ABSENT").length;
    const lateCount = stats?.late ?? records.filter(r => r.status === "LATE" || Boolean(r.arrivalTime)).length;
    const leaveEarlyCount = stats?.leaveEarly ?? records.filter(r => r.status === "LEAVE_EARLY" || Boolean(r.departureTime)).length;
    const excusedCount = stats?.excused ?? records.filter(r => r.status === "EXCUSED" || Boolean(r.justification)).length;
    const totalSessions = stats?.totalSessions || records.length || 1;
    const attended = Math.max(0, totalSessions - absencesCount);
    const percentage = stats?.percentage !== undefined 
        ? stats.percentage 
        : Math.round((attended / totalSessions) * 100);

    return (
        <Document title={`Reporte_Asistencia_${studentFullName.replace(/\s+/g, '_')}`} author="SmartClass Academic Suite">
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Platform • Control de Asistencias</Text>
                        <Text style={styles.docTitle}>Historial Individual de Asistencia</Text>
                        <Text style={styles.docCourse}>Materia: {courseTitle}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.badgeOfficial}>DOCUMENTO OFICIAL</Text>
                        <Text style={styles.metaDate}>Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
                        <Text style={styles.metaCode}>REF: ATT-{student.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Estudiante</Text>
                        <Text style={styles.infoValue}>{studentFullName}</Text>
                        <Text style={styles.infoValueSub}>{student.email}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Identificación</Text>
                        <Text style={styles.infoValue}>{studentId}</Text>
                        <Text style={styles.infoValueSub}>ID Sistema: {student.id.substring(0, 10)}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Docente / Responsable</Text>
                        <Text style={styles.infoValue}>{teacherName}</Text>
                        <Text style={styles.infoValueSub}>Gestión Académica</Text>
                    </View>
                </View>

                {/* KPI Metrics */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.accent }]}>{percentage}%</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.accent }]}>% Asistencia</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.rose50, borderColor: COLORS.rose100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.rose600 }]}>{absencesCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.rose800 }]}>Inasistencias</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.amber50, borderColor: COLORS.amber100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.amber600 }]}>{lateCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.amber800 }]}>Llegadas Tarde</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.indigo50, borderColor: COLORS.indigo100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.indigo600 }]}>{leaveEarlyCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.indigo800 }]}>Retiros</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.emerald50, borderColor: COLORS.emerald100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.emerald600 }]}>{excusedCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.emerald800 }]}>Justificadas</Text>
                    </View>
                </View>

                {/* Table of Records */}
                <Text style={styles.sectionTitle}>Registro Detallado de Novedades y Asistencias</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.thCell, { width: '22%' }]}>Fecha</Text>
                        <Text style={[styles.thCell, { width: '20%' }]}>Novedad / Estado</Text>
                        <Text style={[styles.thCell, { width: '22%' }]}>Hora / Detalle</Text>
                        <Text style={[styles.thCell, { width: '36%' }]}>Justificación / Soporte</Text>
                    </View>

                    {records.length === 0 ? (
                        <View style={{ padding: 14, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: COLORS.gray500, fontStyle: 'italic' }}>
                                Sin registros de novedades en este curso.
                            </Text>
                        </View>
                    ) : (
                        records.map((rec, index) => {
                            const isAlt = index % 2 === 1;
                            const isLate = rec.status === 'LATE' || Boolean(rec.arrivalTime);
                            const isLeaveEarly = rec.status === 'LEAVE_EARLY' || Boolean(rec.departureTime);
                            const isAbsent = rec.status === 'ABSENT';
                            const isExcused = rec.status === 'EXCUSED' || Boolean(rec.justification?.trim());

                            let dateStr = "";
                            try {
                                dateStr = format(new Date(rec.date), "dd/MM/yyyy (EEE)", { locale: es });
                            } catch {
                                dateStr = String(rec.date);
                            }

                            let arrStr = rec.arrivalTime ? String(rec.arrivalTime).substring(11, 16) : null;
                            let depStr = rec.departureTime ? String(rec.departureTime).substring(11, 16) : null;

                            return (
                                <View key={rec.id || index} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} wrap={false}>
                                    <Text style={[styles.tdCell, { width: '22%', fontWeight: 700 }]}>{dateStr}</Text>
                                    <View style={{ width: '20%' }}>
                                        {isAbsent && (
                                            <Text style={[styles.badge, styles.badgeRose]}>FALTA</Text>
                                        )}
                                        {isLate && !isLeaveEarly && (
                                            <Text style={[styles.badge, styles.badgeAmber]}>TARDE</Text>
                                        )}
                                        {isLeaveEarly && !isLate && (
                                            <Text style={[styles.badge, styles.badgeIndigo]}>RETIRO</Text>
                                        )}
                                        {isLate && isLeaveEarly && (
                                            <Text style={[styles.badge, styles.badgeAmber]}>TARDE + RETIRO</Text>
                                        )}
                                        {rec.status === 'PRESENT' && !isLate && !isLeaveEarly && (
                                            <Text style={[styles.badge, styles.badgeEmerald]}>PRESENTE</Text>
                                        )}
                                    </View>
                                    <View style={{ width: '22%' }}>
                                        {arrStr && <Text style={styles.tdCell}>Entrada: {arrStr}</Text>}
                                        {depStr && <Text style={styles.tdCell}>Salida: {depStr}</Text>}
                                        {!arrStr && !depStr && (
                                            <Text style={[styles.tdCell, { color: COLORS.gray400 }]}>Jornada regular</Text>
                                        )}
                                    </View>
                                    <View style={{ width: '36%' }}>
                                        <Text style={[styles.tdCell, { fontStyle: rec.justification ? 'normal' : 'italic', color: rec.justification ? COLORS.gray900 : COLORS.gray400 }]}>
                                            {rec.justification?.trim() || "Sin justificación"}
                                        </Text>
                                        {rec.justificationUrl && (
                                            <Link src={rec.justificationUrl} style={{ fontSize: 7, color: COLORS.accent, marginTop: 2, fontWeight: 700 }}>
                                                [Ver soporte digital]
                                            </Link>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Signatures */}
                <View style={styles.signaturesContainer} wrap={false}>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>{teacherName}</Text>
                        <Text style={styles.signatureRole}>Docente Titular del Curso</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>Coordinación Académica</Text>
                        <Text style={styles.signatureRole}>Registro y Control Estudiantil</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Suite • Documento generado automáticamente con validez institucional.
                    </Text>
                    <Text style={styles.footerPageNum} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};

export interface CourseAttendanceHistoryPDFProps {
    courseTitle: string;
    teacherName?: string;
    students: Array<{
        id: string;
        name: string | null;
        email: string;
        profile?: {
            identificacion?: string;
            nombres?: string;
            apellido?: string;
        } | null;
    }>;
    allStudentStats: Record<string, { absences: number; late: number; leaveEarly: number }>;
    records: Array<{
        id: string;
        userId: string;
        date: string | Date;
        status: string;
        arrivalTime?: string | Date | null;
        departureTime?: string | Date | null;
        justification?: string | null;
        justificationUrl?: string | null;
    }>;
    classDates?: string[];
    filterApplied?: string;
}

export const CourseAttendanceHistoryPDF: React.FC<CourseAttendanceHistoryPDFProps> = ({
    courseTitle,
    teacherName = "Docente Titular",
    students = [],
    allStudentStats = {},
    records = [],
    classDates = [],
    filterApplied = "Todos los estudiantes"
}) => {
    const totalStudents = students.length;
    let totalAbsences = 0;
    let totalLate = 0;
    let totalLeaveEarly = 0;

    Object.values(allStudentStats).forEach(s => {
        totalAbsences += s.absences || 0;
        totalLate += s.late || 0;
        totalLeaveEarly += s.leaveEarly || 0;
    });

    const totalSessions = classDates.length || 1;

    return (
        <Document title={`Consolidado_Asistencias_${courseTitle.replace(/\s+/g, '_')}`} author="SmartClass Academic Suite">
            <Page size="A4" orientation="landscape" style={[styles.page, { paddingLeft: 30, paddingRight: 30 }]}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Platform • Reporte Consolidado</Text>
                        <Text style={styles.docTitle}>Historial General de Asistencia del Curso</Text>
                        <Text style={styles.docCourse}>Materia: {courseTitle} • Docente: {teacherName}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.badgeOfficial}>REPORTE CONSOLIDADO</Text>
                        <Text style={styles.metaDate}>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
                        <Text style={styles.metaCode}>Filtro: {filterApplied}</Text>
                    </View>
                </View>

                {/* KPI Metrics */}
                <View style={[styles.kpiRow, { marginBottom: 12 }]}>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.accent }]}>{totalStudents}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.accent }]}>Estudiantes</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.gray100, borderColor: COLORS.gray300 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.gray900 }]}>{totalSessions}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.gray700 }]}>Sesiones Programadas</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.rose50, borderColor: COLORS.rose100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.rose600 }]}>{totalAbsences}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.rose800 }]}>Total Faltas</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.amber50, borderColor: COLORS.amber100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.amber600 }]}>{totalLate}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.amber800 }]}>Total Tardes</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.indigo50, borderColor: COLORS.indigo100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.indigo600 }]}>{totalLeaveEarly}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.indigo800 }]}>Total Retiros</Text>
                    </View>
                </View>

                {/* Consolidated Table */}
                <Text style={styles.sectionTitle}>Resumen Consolidado por Estudiante</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.thCell, { width: '25%' }]}>Estudiante</Text>
                        <Text style={[styles.thCell, { width: '15%' }]}>Identificación</Text>
                        <Text style={[styles.thCell, { width: '10%', textAlign: 'center' }]}>Clases</Text>
                        <Text style={[styles.thCell, { width: '12%', textAlign: 'center' }]}>Faltas</Text>
                        <Text style={[styles.thCell, { width: '12%', textAlign: 'center' }]}>Tardes</Text>
                        <Text style={[styles.thCell, { width: '12%', textAlign: 'center' }]}>Retiros</Text>
                        <Text style={[styles.thCell, { width: '14%', textAlign: 'center' }]}>% Asistencia</Text>
                    </View>

                    {students.map((student, index) => {
                        const isAlt = index % 2 === 1;
                        const s = allStudentStats[student.id] || { absences: 0, late: 0, leaveEarly: 0 };
                        const studentName = student.profile?.nombres && student.profile?.apellido
                            ? `${student.profile.apellido}, ${student.profile.nombres}`
                            : (student.name || "Estudiante");
                        const studentId = student.profile?.identificacion || student.id.substring(0, 10);
                        
                        const attended = Math.max(0, totalSessions - s.absences);
                        const pct = Math.round((attended / totalSessions) * 100);

                        return (
                            <View key={student.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} wrap={false}>
                                <Text style={[styles.tdCell, { width: '25%', fontWeight: 700 }]}>{studentName}</Text>
                                <Text style={[styles.tdCell, { width: '15%', color: COLORS.gray500 }]}>{studentId}</Text>
                                <Text style={[styles.tdCell, { width: '10%', textAlign: 'center' }]}>{totalSessions}</Text>
                                <Text style={[styles.tdCell, { width: '12%', textAlign: 'center', color: s.absences > 0 ? COLORS.rose600 : COLORS.gray700, fontWeight: s.absences > 0 ? 700 : 400 }]}>
                                    {s.absences}
                                </Text>
                                <Text style={[styles.tdCell, { width: '12%', textAlign: 'center', color: s.late > 0 ? COLORS.amber600 : COLORS.gray700, fontWeight: s.late > 0 ? 700 : 400 }]}>
                                    {s.late}
                                </Text>
                                <Text style={[styles.tdCell, { width: '12%', textAlign: 'center', color: s.leaveEarly > 0 ? COLORS.indigo600 : COLORS.gray700, fontWeight: s.leaveEarly > 0 ? 700 : 400 }]}>
                                    {s.leaveEarly}
                                </Text>
                                <View style={{ width: '14%', alignItems: 'center' }}>
                                    <Text style={[
                                        styles.badge, 
                                        pct >= 80 ? styles.badgeEmerald : pct >= 70 ? styles.badgeAmber : styles.badgeRose
                                    ]}>
                                        {pct}%
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Suite • Documento oficial consolidado de control de asistencia.
                    </Text>
                    <Text style={styles.footerPageNum} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};
