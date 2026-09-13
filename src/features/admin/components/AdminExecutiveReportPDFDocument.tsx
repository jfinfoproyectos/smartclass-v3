import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

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
    primary: '#0f172a',      // Slate 900
    secondary: '#1e3a5f',    // Corporate Navy
    accent: '#2563eb',       // Royal Blue
    gray900: '#0f172a',
    gray700: '#334155',
    gray500: '#64748b',
    gray200: '#e2e8f0',
    gray100: '#f1f5f9',
    gray50: '#f8fafc',
    
    // Status colors
    emerald800: '#065f46',
    emerald100: '#d1fae5',
    
    blue800: '#1e40af',
    blue100: '#dbeafe',

    amber800: '#92400e',
    amber100: '#fef3c7',

    purple800: '#581c87',
    purple100: '#f3e8ff',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        paddingTop: 36,
        paddingLeft: 36,
        paddingRight: 36,
        paddingBottom: 48,
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
        paddingBottom: 12,
        marginBottom: 14,
    },
    brandSub: {
        fontSize: 8,
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
    docSubtitle: {
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
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 3,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    metaDate: {
        fontSize: 7.5,
        color: COLORS.gray500,
    },

    // Sections
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 6,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.gray200,
        marginLeft: 8,
    },

    // Grid of Metric Cards
    metricGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    metricCard: {
        flex: 1,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        backgroundColor: COLORS.gray50,
        padding: 8,
    },
    metricCardTitle: {
        fontSize: 7,
        fontWeight: 700,
        color: COLORS.gray500,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    metricCardValue: {
        fontSize: 15,
        fontWeight: 700,
        color: COLORS.primary,
        marginBottom: 2,
    },
    metricCardSub: {
        fontSize: 6.8,
        color: COLORS.gray500,
    },

    // Two Column Block
    twoCol: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14,
    },
    colHalf: {
        flex: 1,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        padding: 10,
        backgroundColor: '#ffffff',
    },
    colTitle: {
        fontSize: 9,
        fontWeight: 700,
        color: COLORS.secondary,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray100,
    },
    rowItemLabel: {
        fontSize: 8,
        color: COLORS.gray700,
    },
    rowItemValue: {
        fontSize: 8,
        fontWeight: 700,
        color: COLORS.primary,
    },

    // Table
    table: {
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.gray200,
        marginTop: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 5,
        paddingHorizontal: 8,
    },
    thText: {
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 7.5,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        alignItems: 'center',
    },
    tableRowEven: {
        backgroundColor: COLORS.gray50,
    },
    tdText: {
        fontSize: 7.5,
        color: COLORS.gray700,
    },
    tdTextBold: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.gray900,
    },

    // Signatures
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 24,
        paddingTop: 12,
    },
    signatureBox: {
        alignItems: 'center',
        width: 180,
    },
    signatureLine: {
        width: 140,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray500,
        marginBottom: 4,
    },
    signatureTitle: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.primary,
    },
    signatureRole: {
        fontSize: 6.8,
        color: COLORS.gray500,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 36,
        right: 36,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 6.8,
        color: COLORS.gray500,
    },
    pageNumber: {
        fontSize: 6.8,
        fontWeight: 700,
        color: COLORS.gray700,
    },
});

interface AdminExecutiveReportPDFDocumentProps {
    stats: {
        users: {
            admin: number;
            teacher: number;
            student: number;
            total: number;
        };
        courses: {
            total: number;
            active: number;
            archived: number;
        };
        activity: {
            submissions: number;
        };
        documentation?: {
            total: number;
        };
        health: {
            connected: boolean;
        };
    };
    recentActivity: any[];
    generatedAt?: string;
}

export function AdminExecutiveReportPDFDocument({
    stats,
    recentActivity = [],
    generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm:ss')
}: AdminExecutiveReportPDFDocumentProps) {
    const studentPct = stats.users.total > 0 ? Math.round((stats.users.student / stats.users.total) * 100) : 0;
    const activeCoursesPct = stats.courses.total > 0 ? Math.round((stats.courses.active / stats.courses.total) * 100) : 0;

    return (
        <Document title="Balance Ejecutivo Institucional - SmartClass Suite" author="SmartClass Academic Suite">
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Suite • Dirección General</Text>
                        <Text style={styles.docTitle}>BALANCE EJECUTIVO INSTITUCIONAL</Text>
                        <Text style={styles.docSubtitle}>
                            Informe Integral de Operaciones, Infraestructura y Comunidad
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.badgeOfficial}>DOCUMENTO DE AUDITORÍA</Text>
                        <Text style={styles.metaDate}>Generado: {generatedAt}</Text>
                    </View>
                </View>

                {/* Section: KPIs */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>1. Indicadores Clave de Desempeño</Text>
                    <View style={styles.sectionLine} />
                </View>

                <View style={styles.metricGrid}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Comunidad Global</Text>
                        <Text style={styles.metricCardValue}>{stats.users.total}</Text>
                        <Text style={styles.metricCardSub}>{studentPct}% estudiantes</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Cursos Activos</Text>
                        <Text style={[styles.metricCardValue, { color: COLORS.accent }]}>{stats.courses.active}</Text>
                        <Text style={styles.metricCardSub}>{activeCoursesPct}% del catálogo</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Entregas Recibidas</Text>
                        <Text style={[styles.metricCardValue, { color: COLORS.emerald800 }]}>{stats.activity.submissions}</Text>
                        <Text style={styles.metricCardSub}>Evaluaciones procesadas</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricCardTitle}>Documentación</Text>
                        <Text style={[styles.metricCardValue, { color: COLORS.purple800 }]}>{stats.documentation?.total || 0}</Text>
                        <Text style={styles.metricCardSub}>Proyectos manuales</Text>
                    </View>
                </View>

                {/* Section: Desglose */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>2. Distribución y Capacidad</Text>
                    <View style={styles.sectionLine} />
                </View>

                <View style={styles.twoCol}>
                    <View style={styles.colHalf}>
                        <Text style={styles.colTitle}>Desglose de Comunidad y Roles</Text>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Estudiantes Matriculados</Text>
                            <Text style={styles.rowItemValue}>{stats.users.student}</Text>
                        </View>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Cuerpo Docente (Profesores)</Text>
                            <Text style={styles.rowItemValue}>{stats.users.teacher}</Text>
                        </View>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Administradores del Sistema</Text>
                            <Text style={styles.rowItemValue}>{stats.users.admin}</Text>
                        </View>
                        <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                            <Text style={styles.rowItemLabel}>Total Cuentas Registradas</Text>
                            <Text style={[styles.rowItemValue, { color: COLORS.accent }]}>{stats.users.total}</Text>
                        </View>
                    </View>

                    <View style={styles.colHalf}>
                        <Text style={styles.colTitle}>Estado del Catálogo de Asignaturas</Text>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Cursos en Vigencia (Activos)</Text>
                            <Text style={styles.rowItemValue}>{stats.courses.active}</Text>
                        </View>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Cursos Concluidos (Archivados)</Text>
                            <Text style={styles.rowItemValue}>{stats.courses.archived}</Text>
                        </View>
                        <View style={styles.rowItem}>
                            <Text style={styles.rowItemLabel}>Salud Base de Datos</Text>
                            <Text style={[styles.rowItemValue, { color: COLORS.emerald800 }]}>
                                {stats.health.connected ? '100% OPERATIVA' : 'DEGRADADO'}
                            </Text>
                        </View>
                        <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                            <Text style={styles.rowItemLabel}>Catálogo Total de Materias</Text>
                            <Text style={[styles.rowItemValue, { color: COLORS.accent }]}>{stats.courses.total}</Text>
                        </View>
                    </View>
                </View>

                {/* Section: Auditoría Reciente */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>3. Registro Reciente de Auditoría y Eventos</Text>
                    <View style={styles.sectionLine} />
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, { width: '15%' }]}>Acción</Text>
                        <Text style={[styles.thText, { width: '35%' }]}>Usuario Responsable</Text>
                        <Text style={[styles.thText, { width: '30%' }]}>Detalle / Recurso</Text>
                        <Text style={[styles.thText, { width: '20%' }]}>Fecha y Hora</Text>
                    </View>

                    {recentActivity.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tdText, { width: '100%', textAlign: 'center', paddingVertical: 8 }]}>
                                Sin eventos de auditoría registrados recientemente.
                            </Text>
                        </View>
                    ) : (
                        recentActivity.slice(0, 8).map((activity, idx) => (
                            <View key={activity.id || idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                                <Text style={[styles.tdTextBold, { width: '15%' }]}>
                                    {activity.action || 'OPERACIÓN'}
                                </Text>
                                <Text style={[styles.tdText, { width: '35%' }]}>
                                    {activity.user?.name || activity.user?.email || 'Sistema'}
                                </Text>
                                <Text style={[styles.tdText, { width: '30%' }]}>
                                    {activity.resource || (typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details)) || '-'}
                                </Text>
                                <Text style={[styles.tdText, { width: '20%' }]}>
                                    {activity.createdAt ? format(new Date(activity.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Signatures */}
                <View style={styles.signatureContainer}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureTitle}>DIRECCIÓN ADMINISTRATIVA</Text>
                        <Text style={styles.signatureRole}>Control Institucional SmartClass</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureTitle}>AUDITORÍA DEL SISTEMA</Text>
                        <Text style={styles.signatureRole}>Supervisión de Datos y Plataforma</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Suite • Documento Ejecutivo Oficial de Alta Dirección
                    </Text>
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
