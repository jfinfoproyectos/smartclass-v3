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
    primary: '#0f172a',      // Slate 900
    secondary: '#1e3a5f',    // Corporate Navy
    accent: '#2563eb',       // Royal Blue
    accentLight: '#eff6ff',
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
    
    rose800: '#9f1239',
    rose600: '#e11d48',
    rose100: '#ffe4e6',
    
    amber800: '#92400e',
    amber600: '#d97706',
    amber100: '#fef3c7',

    blue800: '#1e40af',
    blue600: '#2563eb',
    blue100: '#dbeafe',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        paddingTop: 32,
        paddingLeft: 32,
        paddingRight: 32,
        paddingBottom: 45,
        backgroundColor: '#ffffff',
        fontSize: 8,
        color: COLORS.gray700,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 10,
        marginBottom: 10,
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
        fontSize: 15,
        fontWeight: 700,
        color: COLORS.primary,
        marginBottom: 2,
    },
    docSubtitle: {
        fontSize: 8.5,
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
    },

    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.gray50,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        padding: 8,
        marginBottom: 10,
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 6.8,
        fontWeight: 700,
        color: COLORS.gray500,
        textTransform: 'uppercase',
        marginBottom: 1.5,
    },
    infoValue: {
        fontSize: 8.5,
        fontWeight: 700,
        color: COLORS.primary,
    },

    // KPI Summary
    kpiRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    kpiCard: {
        flex: 1,
        borderRadius: 5,
        borderWidth: 1,
        padding: 6,
        alignItems: 'center',
    },
    kpiValue: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 1,
    },
    kpiLabel: {
        fontSize: 6.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Table
    table: {
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.gray200,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    thText: {
        color: '#ffffff',
        fontWeight: 700,
        fontSize: 7,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 4.5,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray200,
        alignItems: 'center',
    },
    tableRowEven: {
        backgroundColor: COLORS.gray50,
    },

    // Column widths
    colIndex: { width: '4%' },
    colName: { width: '22%' },
    colDoc: { width: '13%' },
    colEmail: { width: '25%' },
    colRole: { width: '12%' },
    colAuth: { width: '12%' },
    colStatus: { width: '12%' },

    // Cell texts
    tdText: {
        fontSize: 7.5,
        color: COLORS.gray700,
    },
    tdTextBold: {
        fontSize: 7.5,
        fontWeight: 700,
        color: COLORS.gray900,
    },

    // Badges
    badgeStudent: {
        backgroundColor: COLORS.blue100,
        color: COLORS.blue800,
        fontSize: 6.5,
        fontWeight: 700,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: 'center',
        alignSelf: 'flex-start',
    },
    badgeTeacher: {
        backgroundColor: COLORS.emerald100,
        color: COLORS.emerald800,
        fontSize: 6.5,
        fontWeight: 700,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: 'center',
        alignSelf: 'flex-start',
    },
    badgeAdmin: {
        backgroundColor: COLORS.rose100,
        color: COLORS.rose800,
        fontSize: 6.5,
        fontWeight: 700,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: 'center',
        alignSelf: 'flex-start',
    },
    badgeActive: {
        backgroundColor: COLORS.emerald100,
        color: COLORS.emerald800,
        fontSize: 6.5,
        fontWeight: 700,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: 'center',
        alignSelf: 'flex-start',
    },
    badgeBanned: {
        backgroundColor: COLORS.rose100,
        color: COLORS.rose800,
        fontSize: 6.5,
        fontWeight: 700,
        paddingVertical: 1.5,
        paddingHorizontal: 4,
        borderRadius: 3,
        textAlign: 'center',
        alignSelf: 'flex-start',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 32,
        right: 32,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray200,
        paddingTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 6.5,
        color: COLORS.gray500,
    },
    pageNumber: {
        fontSize: 6.5,
        fontWeight: 700,
        color: COLORS.gray700,
    },
});

interface UserReportItem {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    createdAt: Date | string;
    banned?: boolean | null;
    accounts?: { providerId: string }[];
    profile?: {
        identificacion: string | null;
        nombres: string | null;
        apellido: string | null;
        telefono: string | null;
    } | null;
    _count?: {
        coursesCreated: number;
        enrollments: number;
        submissions: number;
    };
}

interface UsersReportPDFDocumentProps {
    users: UserReportItem[];
    stats: {
        total: number;
        student: number;
        teacher: number;
        admin: number;
        active: number;
        banned: number;
    };
    filterRole?: string;
    filterTeacher?: string;
    filterCourse?: string;
    filterStatus?: string;
    filterSearch?: string;
    generatedAt?: string;
}

export function UsersReportPDFDocument({
    users,
    stats,
    filterRole = 'Todos',
    filterTeacher = 'Todos',
    filterCourse = 'Todos',
    filterStatus = 'Todos',
    filterSearch = '',
    generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm:ss')
}: UsersReportPDFDocumentProps) {
    const getRoleBadgeStyle = (role: string | null) => {
        if (role === 'admin') return styles.badgeAdmin;
        if (role === 'teacher') return styles.badgeTeacher;
        return styles.badgeStudent;
    };

    const getRoleLabel = (role: string | null) => {
        if (role === 'admin') return 'ADMIN';
        if (role === 'teacher') return 'PROFESOR';
        return 'ESTUDIANTE';
    };

    return (
        <Document title="Reporte Corporativo de Usuarios - SmartClass Suite" author="SmartClass Academic Suite">
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Suite • Auditoría y Control</Text>
                        <Text style={styles.docTitle}>DIRECTORIO CORPORATIVO DE USUARIOS & ROLES</Text>
                        <Text style={styles.docSubtitle}>
                            Consolidado Institucional de Cuentas, Credenciales y Asignaciones
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.badgeOfficial}>DOCUMENTO OFICIAL</Text>
                        <Text style={styles.metaDate}>Emisión: {generatedAt}</Text>
                    </View>
                </View>

                {/* Metadata info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Filtro de Rol</Text>
                        <Text style={styles.infoValue}>
                            {filterRole === 'student' ? 'Estudiantes' : filterRole === 'teacher' ? 'Profesores' : filterRole === 'admin' ? 'Administradores' : 'Todos los roles'}
                        </Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Profesor Asignado</Text>
                        <Text style={styles.infoValue}>{filterTeacher !== 'all' ? filterTeacher : 'Todos'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Curso Seleccionado</Text>
                        <Text style={styles.infoValue}>{filterCourse !== 'all' ? filterCourse : 'Todos'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Estado Cuentas</Text>
                        <Text style={styles.infoValue}>{filterStatus === 'active' ? 'Solo Activos' : filterStatus === 'banned' ? 'Solo Suspendidos' : 'Todos'}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Registros en Reporte</Text>
                        <Text style={styles.infoValue}>{users.length} usuarios</Text>
                    </View>
                </View>

                {/* KPI Summary */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{stats.total}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.gray500 }]}>Total Usuarios</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.blue100, borderColor: '#bfdbfe' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.blue800 }]}>{stats.student}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.blue800 }]}>Estudiantes</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.emerald100, borderColor: '#a7f3d0' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.emerald800 }]}>{stats.teacher}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.emerald800 }]}>Profesores</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.amber100, borderColor: '#fde68a' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.amber800 }]}>{stats.admin}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.amber800 }]}>Administradores</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.emerald800 }]}>{stats.active}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.emerald800 }]}>Cuentas Activas</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.rose800 }]}>{stats.banned}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.rose800 }]}>Suspendidos</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colIndex]}>#</Text>
                        <Text style={[styles.thText, styles.colName]}>Nombre Completo</Text>
                        <Text style={[styles.thText, styles.colDoc]}>Documento (CC)</Text>
                        <Text style={[styles.thText, styles.colEmail]}>Correo Electrónico</Text>
                        <Text style={[styles.thText, styles.colRole]}>Rol</Text>
                        <Text style={[styles.thText, styles.colAuth]}>Autenticación</Text>
                        <Text style={[styles.thText, styles.colStatus]}>Estado</Text>
                    </View>

                    {users.slice(0, 100).map((user, idx) => {
                        const isGoogle = user.accounts && user.accounts.length > 0 && user.accounts.every(a => a.providerId === 'google');
                        const isBanned = !!user.banned;
                        const fullName = formatName(user.name, user.profile);

                        return (
                            <View key={user.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                                <Text style={[styles.tdText, styles.colIndex]}>{idx + 1}</Text>
                                <Text style={[styles.tdTextBold, styles.colName]}>{fullName}</Text>
                                <Text style={[styles.tdText, styles.colDoc]}>
                                    {user.profile?.identificacion || 'Sin documento'}
                                </Text>
                                <Text style={[styles.tdText, styles.colEmail]}>{user.email}</Text>
                                <View style={styles.colRole}>
                                    <Text style={getRoleBadgeStyle(user.role)}>
                                        {getRoleLabel(user.role)}
                                    </Text>
                                </View>
                                <Text style={[styles.tdText, styles.colAuth]}>
                                    {isGoogle ? 'Google OAuth' : 'Contraseña'}
                                </Text>
                                <View style={styles.colStatus}>
                                    <Text style={isBanned ? styles.badgeBanned : styles.badgeActive}>
                                        {isBanned ? 'SUSPENDIDO' : 'ACTIVO'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Suite • Documento de uso confidencial para auditoría y administración escolar
                    </Text>
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
