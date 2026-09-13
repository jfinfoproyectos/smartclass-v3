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
    gray900: '#0f172a',
    gray700: '#334155',
    gray500: '#64748b',
    gray200: '#e2e8f0',
    gray100: '#f1f5f9',
    gray50: '#f8fafc',
    
    // Status colors
    emerald800: '#065f46',
    emerald600: '#059669',
    emerald100: '#d1fae5',
    
    amber800: '#92400e',
    amber600: '#d97706',
    amber100: '#fef3c7',

    blue800: '#1e40af',
    blue600: '#2563eb',
    blue100: '#dbeafe',

    purple800: '#581c87',
    purple100: '#f3e8ff',
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
    colTitle: { width: '23%' },
    colCode: { width: '10%' },
    colTeacher: { width: '18%' },
    colDates: { width: '16%' },
    colSchedule: { width: '13%' },
    colStats: { width: '8%' },
    colStatus: { width: '8%' },

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
    codeBadge: {
        fontSize: 7,
        fontWeight: 700,
        fontFamily: 'Roboto',
        color: COLORS.secondary,
        backgroundColor: COLORS.gray100,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
        textAlign: 'center',
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
    badgeArchived: {
        backgroundColor: COLORS.amber100,
        color: COLORS.amber800,
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

interface CourseReportItem {
    id: string;
    title: string;
    description: string | null;
    enrollmentCode?: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    startTime?: string | null;
    endTime?: string | null;
    classDays?: string | null;
    teacher: {
        id: string;
        name: string | null;
        email: string;
        profile?: {
            nombres?: string | null;
            apellido?: string | null;
            identificacion?: string | null;
        } | null;
    };
    _count: {
        enrollments: number;
        activities: number;
    };
}

interface CoursesReportPDFDocumentProps {
    courses: CourseReportItem[];
    stats: {
        total: number;
        active: number;
        archived: number;
        totalStudents: number;
        totalActivities: number;
    };
    filterStatus?: string;
    filterTeacher?: string;
    generatedAt?: string;
}

export function CoursesReportPDFDocument({
    courses,
    stats,
    filterStatus = 'Todos',
    filterTeacher = 'Todos',
    generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm:ss')
}: CoursesReportPDFDocumentProps) {
    const now = new Date();

    const isCourseActive = (c: CourseReportItem) => {
        if (!c.endDate) return true;
        return new Date(c.endDate) >= now;
    };

    return (
        <Document title="Reporte Corporativo de Cursos - SmartClass Suite" author="SmartClass Academic Suite">
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.brandSub}>SmartClass Academic Suite • Gestión Curricular</Text>
                        <Text style={styles.docTitle}>CATÁLOGO EJECUTIVO DE ASIGNATURAS & CURSOS</Text>
                        <Text style={styles.docSubtitle}>
                            Inventario Oficial de Materias, Horarios, Titulares y Matrículas
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
                        <Text style={styles.infoLabel}>Filtro de Estado</Text>
                        <Text style={styles.infoValue}>
                            {filterStatus === 'active' ? 'Solo Activos' : filterStatus === 'archived' ? 'Solo Archivados' : 'Todos'}
                        </Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Docente Titular</Text>
                        <Text style={styles.infoValue}>{filterTeacher}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Total Cursos en Reporte</Text>
                        <Text style={styles.infoValue}>{courses.length} materias</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Total Matrículas</Text>
                        <Text style={styles.infoValue}>{stats.totalStudents} estudiantes</Text>
                    </View>
                </View>

                {/* KPI Summary */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{stats.total}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.gray500 }]}>Total Cursos</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.emerald100, borderColor: '#a7f3d0' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.emerald800 }]}>{stats.active}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.emerald800 }]}>Cursos Activos</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.amber100, borderColor: '#fde68a' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.amber800 }]}>{stats.archived}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.amber800 }]}>Archivados</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.blue100, borderColor: '#bfdbfe' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.blue800 }]}>{stats.totalStudents}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.blue800 }]}>Estudiantes Inscritos</Text>
                    </View>
                    <View style={[styles.kpiCard, { backgroundColor: COLORS.purple100, borderColor: '#e9d5ff' }]}>
                        <Text style={[styles.kpiValue, { color: COLORS.purple800 }]}>{stats.totalActivities}</Text>
                        <Text style={[styles.kpiLabel, { color: COLORS.purple800 }]}>Actividades Académicas</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colIndex]}>#</Text>
                        <Text style={[styles.thText, styles.colTitle]}>Asignatura / Curso</Text>
                        <Text style={[styles.thText, styles.colCode]}>Código</Text>
                        <Text style={[styles.thText, styles.colTeacher]}>Profesor Titular</Text>
                        <Text style={[styles.thText, styles.colDates]}>Vigencia</Text>
                        <Text style={[styles.thText, styles.colSchedule]}>Horario y Días</Text>
                        <Text style={[styles.thText, styles.colStats]}>Alumnos</Text>
                        <Text style={[styles.thText, styles.colStatus]}>Estado</Text>
                    </View>

                    {courses.slice(0, 100).map((course, idx) => {
                        const active = isCourseActive(course);
                        const teacherName = formatName(course.teacher.name, course.teacher.profile);
                        const startStr = course.startDate ? format(new Date(course.startDate), 'dd/MM/yy') : '-';
                        const endStr = course.endDate ? format(new Date(course.endDate), 'dd/MM/yy') : '-';
                        const scheduleStr = course.startTime && course.endTime ? `${course.startTime} - ${course.endTime}` : 'No definido';
                        const daysStr = course.classDays ? course.classDays : '';

                        return (
                            <View key={course.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                                <Text style={[styles.tdText, styles.colIndex]}>{idx + 1}</Text>
                                <View style={styles.colTitle}>
                                    <Text style={styles.tdTextBold}>{course.title}</Text>
                                    {course.description && (
                                        <Text style={[styles.tdText, { fontSize: 6.5, color: COLORS.gray500 }]}>
                                            {course.description.length > 60 ? `${course.description.substring(0, 57)}...` : course.description}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.codeBadge, styles.colCode]}>
                                    {course.enrollmentCode || 'S/C'}
                                </Text>
                                <View style={styles.colTeacher}>
                                    <Text style={styles.tdTextBold}>{teacherName}</Text>
                                    <Text style={[styles.tdText, { fontSize: 6.5, color: COLORS.gray500 }]}>
                                        {course.teacher.email}
                                    </Text>
                                </View>
                                <Text style={[styles.tdText, styles.colDates]}>
                                    {`${startStr} al ${endStr}`}
                                </Text>
                                <View style={styles.colSchedule}>
                                    <Text style={styles.tdText}>{scheduleStr}</Text>
                                    {daysStr ? <Text style={[styles.tdText, { fontSize: 6.5, color: COLORS.gray500 }]}>{daysStr}</Text> : null}
                                </View>
                                <Text style={[styles.tdTextBold, styles.colStats, { textAlign: 'center' }]}>
                                    {course._count.enrollments}
                                </Text>
                                <View style={styles.colStatus}>
                                    <Text style={active ? styles.badgeActive : styles.badgeArchived}>
                                        {active ? 'ACTIVO' : 'ARCHIVADO'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass Academic Suite • Documento oficial de inventario curricular y asignación docente
                    </Text>
                    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
