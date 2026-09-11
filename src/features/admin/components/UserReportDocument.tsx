import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { formatName } from '@/lib/utils';

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
    secondary: '#1e3a5f',    // Corporate Navy
    accent: '#2563eb',       // Royal Blue
    accentLight: '#eff6ff',  // Soft Blue
    gray900: '#0f172a',
    gray700: '#334155',
    gray500: '#64748b',
    gray400: '#94a3b8',
    gray200: '#e2e8f0',
    gray100: '#f1f5f9',
    gray50: '#f8fafc',
    
    // Status colors
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
        fontSize: 8.5,
        color: COLORS.gray700,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 10,
        marginBottom: 12,
    },
    brandSub: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    docTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: COLORS.primary,
        marginBottom: 2,
    },
    docCourse: {
        fontSize: 9,
        fontWeight: 500,
        color: COLORS.secondary,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    badgeOfficial: {
        backgroundColor: COLORS.primary,
        color: '#ffffff',
        fontSize: 7,
        fontWeight: 700,
        paddingVertical: 2.5,
        paddingHorizontal: 7,
        borderRadius: 3,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    metaDate: {
        fontSize: 7.5,
        color: COLORS.gray500,
        marginBottom: 1.5,
    },
    metaCode: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.accent,
        fontFamily: 'Roboto',
    },

    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray50,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        padding: 9,
        marginBottom: 12,
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
        marginBottom: 12,
    },
    kpiCard: {
        flex: 1,
        borderRadius: 5,
        borderWidth: 1,
        padding: 7,
        alignItems: 'center',
    },
    kpiValue: {
        fontSize: 13,
        fontWeight: 700,
        marginBottom: 1,
    },
    kpiLabel: {
        fontSize: 6.8,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Section title
    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.primary,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
        paddingLeft: 6,
        marginBottom: 6,
        marginTop: 4,
    },

    // Table
    table: {
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 5,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    tableHeaderCell: {
        color: '#ffffff',
        fontSize: 7.5,
        fontWeight: 700,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        paddingVertical: 5,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    tableRowZebra: {
        backgroundColor: COLORS.gray50,
    },
    tableCell: {
        fontSize: 8,
        color: COLORS.gray700,
    },

    // Badges
    badgeBase: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 3,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 7,
        fontWeight: 700,
        textTransform: 'uppercase',
    },

    // Remarks
    remarkCard: {
        backgroundColor: COLORS.gray50,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        borderRadius: 4,
        padding: 7,
        marginBottom: 6,
    },
    remarkTitle: {
        fontSize: 8.5,
        fontWeight: 700,
        color: COLORS.primary,
        marginBottom: 2,
    },
    remarkDesc: {
        fontSize: 8,
        color: COLORS.gray700,
        lineHeight: 1.3,
        marginBottom: 3,
    },
    remarkBy: {
        fontSize: 7,
        color: COLORS.gray500,
        fontStyle: 'italic',
    },

    // Signatures
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        marginBottom: 10,
    },
    signatureBox: {
        alignItems: 'center',
        width: 170,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: COLORS.gray400,
        width: '100%',
        marginBottom: 4,
    },
    signatureName: {
        fontSize: 8.5,
        fontWeight: 700,
        color: COLORS.primary,
    },
    signatureRole: {
        fontSize: 7.5,
        color: COLORS.gray500,
        textTransform: 'uppercase',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 38,
        right: 38,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerBrand: {
        fontSize: 7,
        color: COLORS.gray400,
    },
    footerPageNum: {
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.gray500,
    },
});

interface UserReportProps {
    user: any;
    details: any;
}

export const UserReportDocument: React.FC<UserReportProps> = ({ user, details }) => {
    const userName = formatName(user.name, user.profile);
    const userRole = (user.role || 'Usuario').toUpperCase();
    const userEmail = user.email || '';
    const userId = user.profile?.identificacion || user.id.substring(0, 10);
    const enrollmentsCount = details?.enrollments?.length ?? (user._count?.enrollments || 0);
    const submissionsCount = details?.submissions?.length ?? (user._count?.submissions || 0);
    const attendancesCount = details?.attendances?.length ?? 0;

    return (
        <Document title={`Reporte_Usuario_${userName.replace(/\s+/g, '_')}`} author="SmartClass Academic Suite">
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Platform • Administración</Text>
                        <Text style={styles.docTitle}>Expediente Oficial de Usuario</Text>
                        <Text style={styles.docCourse}>Rol: {userRole} • ID: {userId}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.badgeOfficial}>DOCUMENTO OFICIAL</Text>
                        <Text style={styles.metaDate}>Emisión: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
                        <Text style={styles.metaCode}>REF: USR-{user.id.substring(0, 8).toUpperCase()}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Nombre Completo</Text>
                        <Text style={styles.infoValue}>{userName}</Text>
                        <Text style={styles.infoValueSub}>{userEmail}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Identificación / ID</Text>
                        <Text style={styles.infoValue}>{userId}</Text>
                        <Text style={styles.infoValueSub}>Tel: {user.profile?.telefono || 'No registrado'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Fecha de Registro</Text>
                        <Text style={styles.infoValue}>
                            {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy') : '—'}
                        </Text>
                        <Text style={styles.infoValueSub}>Estado: {user.banned ? 'Inhabilitado' : 'Activo'}</Text>
                    </View>
                </View>

                {/* KPI Metrics */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.accent }]}>{enrollmentsCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.accent }]}>Cursos Vinculados</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.emerald50, borderColor: COLORS.emerald100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.emerald600 }]}>{submissionsCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.emerald800 }]}>Entregas Registradas</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.indigo50, borderColor: COLORS.indigo100 }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.indigo600 }]}>{attendancesCount}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.indigo800 }]}>Registros Asistencia</Text>
                    </View>
                </View>

                {/* Courses Table */}
                {details?.enrollments?.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Cursos Vinculados</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Nombre del Curso</Text>
                                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'center' }]}>Fecha Inscripción</Text>
                                <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Estado</Text>
                            </View>
                            {details.enrollments.map((enr: any, idx: number) => (
                                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowZebra : {}]}>
                                    <Text style={[styles.tableCell, { width: '55%', fontWeight: 700 }]}>
                                        {enr.course?.title || 'Sin título'}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>
                                        {enr.createdAt ? format(new Date(enr.createdAt), 'dd/MM/yyyy') : '—'}
                                    </Text>
                                    <View style={{ width: '20%', alignItems: 'center' }}>
                                        <View style={[styles.badgeBase, { backgroundColor: COLORS.emerald50, borderColor: COLORS.emerald100, borderWidth: 1 }]}>
                                            <Text style={[styles.badgeText, { color: COLORS.emerald800 }]}>
                                                {enr.status || 'ACTIVO'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Attendance Table */}
                {details?.attendances?.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Historial de Asistencias</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Fecha y Hora</Text>
                                <Text style={[styles.tableHeaderCell, { width: '45%' }]}>Curso</Text>
                                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'center' }]}>Novedad</Text>
                            </View>
                            {details.attendances.map((att: any, idx: number) => {
                                const isPresent = att.status === 'PRESENT';
                                const isAbsent = att.status === 'ABSENT';
                                const isLate = att.status === 'LATE';
                                const bg = isPresent ? COLORS.emerald50 : isAbsent ? COLORS.rose50 : isLate ? COLORS.amber50 : COLORS.indigo50;
                                const fg = isPresent ? COLORS.emerald800 : isAbsent ? COLORS.rose800 : isLate ? COLORS.amber800 : COLORS.indigo800;
                                const border = isPresent ? COLORS.emerald100 : isAbsent ? COLORS.rose100 : isLate ? COLORS.amber100 : COLORS.indigo100;

                                return (
                                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowZebra : {}]}>
                                        <Text style={[styles.tableCell, { width: '30%', fontWeight: 700 }]}>
                                            {att.date ? format(new Date(att.date), 'dd/MM/yyyy HH:mm') : '—'}
                                        </Text>
                                        <Text style={[styles.tableCell, { width: '45%' }]}>
                                            {att.course?.title || 'N/A'}
                                        </Text>
                                        <View style={{ width: '25%', alignItems: 'center' }}>
                                            <View style={[styles.badgeBase, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}>
                                                <Text style={[styles.badgeText, { color: fg }]}>
                                                    {att.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Remarks Section */}
                {details?.remarks?.length > 0 && (
                    <View wrap={false}>
                        <Text style={styles.sectionTitle}>Observaciones y Felicitaciones</Text>
                        {details.remarks.map((rem: any, idx: number) => (
                            <View 
                                key={idx} 
                                style={[
                                    styles.remarkCard, 
                                    { borderLeftWidth: 3, borderLeftColor: rem.type === 'COMMENDATION' ? COLORS.emerald600 : COLORS.amber600 }
                                ]}
                            >
                                <Text style={styles.remarkTitle}>
                                    {rem.title} ({rem.date ? format(new Date(rem.date), 'dd/MM/yyyy') : '—'})
                                </Text>
                                <Text style={styles.remarkDesc}>{rem.description}</Text>
                                <Text style={styles.remarkBy}>
                                    Registrado por: {rem.teacher ? formatName(rem.teacher.name, rem.teacher.profile) : 'Docente'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Signatures */}
                <View style={styles.signatureContainer} wrap={false}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>Administración del Sistema</Text>
                        <Text style={styles.signatureRole}>SmartClass Academic Platform</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>Coordinación Académica</Text>
                        <Text style={styles.signatureRole}>Dirección Institucional</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerBrand}>
                        SmartClass Academic Suite • Expediente oficial generado automáticamente con validez institucional.
                    </Text>
                    <Text 
                        style={styles.footerPageNum} 
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} 
                    />
                </View>
            </Page>
        </Document>
    );
};
