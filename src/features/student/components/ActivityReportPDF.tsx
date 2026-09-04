import { Page, Text, View, Document, StyleSheet, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Colores de la marca
const COLORS = {
    primary: '#2563eb', // blue-600
    secondary: '#1e40af', // blue-800
    accent: '#3b82f6', // blue-500
    background: '#f8fafc', // slate-50
    text: '#1e293b', // slate-800
    textLight: '#64748b', // slate-500
    border: '#e2e8f0', // slate-200
    codeBg: '#f1f5f9', // slate-100
    codeBorder: '#cbd5e1', // slate-300
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: COLORS.text,
        backgroundColor: '#ffffff',
        paddingBottom: 55,
    },
    header: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        padding: 18,
        color: '#ffffff',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    universityName: {
        fontSize: 8,
        opacity: 0.9,
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 15,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        lineHeight: 1.2,
    },
    courseTitle: {
        fontSize: 9.5,
        opacity: 0.9,
    },
    gradeBadge: {
        backgroundColor: '#ffffff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
        minWidth: 70,
    },
    gradeValue: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.primary,
    },
    gradeLabel: {
        fontSize: 7,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    metaSection: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 7,
        color: COLORS.textLight,
        marginBottom: 2,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
    },
    metaValue: {
        fontSize: 8.5,
        color: COLORS.text,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 14,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 3,
    },
    sectionTitle: {
        fontSize: 10.5,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.secondary,
        textTransform: 'uppercase',
    },
    paragraph: {
        fontSize: 8.5,
        lineHeight: 1.4,
        marginBottom: 5,
        color: COLORS.text,
    },
    heading: {
        fontSize: 9.5,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.primary,
        marginTop: 6,
        marginBottom: 3,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 3,
        paddingRight: 10,
    },
    bulletDot: {
        width: 10,
        fontSize: 9,
        color: COLORS.accent,
    },
    bulletText: {
        flex: 1,
        fontSize: 8.5,
        lineHeight: 1.4,
        color: COLORS.text,
    },
    blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
        paddingLeft: 8,
        paddingVertical: 4,
        marginVertical: 5,
        backgroundColor: COLORS.background,
        borderRadius: 2,
    },
    blockquoteText: {
        fontSize: 8.5,
        fontStyle: 'italic',
        color: COLORS.textLight,
        lineHeight: 1.4,
    },
    // PDF Table Styles
    pdfTable: {
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        marginVertical: 6,
        overflow: 'hidden',
    },
    pdfTableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    pdfTableHeaderCell: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        flex: 1,
    },
    pdfTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingVertical: 5,
        paddingHorizontal: 6,
        backgroundColor: '#ffffff',
    },
    pdfTableCell: {
        fontSize: 8,
        color: COLORS.text,
        flex: 1,
    },
    // Required Files Styles
    reqFilesContainer: {
        marginTop: 4,
        padding: 6,
        backgroundColor: COLORS.background,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    reqFilesTitle: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        color: COLORS.text,
    },
    reqFileBadge: {
        fontSize: 8,
        fontFamily: 'Courier',
        backgroundColor: '#ffffff',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 4,
        marginBottom: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    footerText: {
        fontSize: 7.5,
        color: COLORS.textLight,
    },
});

// Helper to clean raw Markdown text into pure clean strings
function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/\\n/g, '\n')
        .replace(/^#{1,6}\s*/, '')
        .replace(/^=>\s*/, '')
        .replace(/^>\s*/, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*`#]/g, '')
        .trim();
}

interface ActivityReportPDFProps {
    activity: any;
    submission: any;
    studentName: string;
}

export const ActivityReportPDF = ({ activity, submission, studentName }: ActivityReportPDFProps) => {
    const rawFeedback = submission?.feedback || "Sin comentarios adicionales.";
    const rawStatement = activity?.statement || "Sin enunciado disponible.";
    const filePaths = activity?.filePaths ? activity.filePaths.split(',') : [];

    // Parse statement into clean lines
    const statementLines = rawStatement
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

    // Parse feedback into clean lines and table rows
    const feedbackLines = rawFeedback
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

    // Extract Markdown Table from feedback if present
    const tableHeaders: string[] = [];
    const tableRows: string[][] = [];
    const regularFeedbackLines: Array<{ text: string; isHeader: boolean; isBullet: boolean; isQuote: boolean }> = [];

    let inTable = false;

    feedbackLines.forEach((line: string) => {
        if (line.startsWith('|')) {
            const cells = line.split('|').map((c: string) => cleanText(c)).filter(Boolean);
            if (line.includes('---')) {
                inTable = true;
                return;
            }
            if (!inTable) {
                tableHeaders.push(...cells);
                inTable = true;
            } else {
                tableRows.push(cells);
            }
        } else {
            inTable = false;
            const cleaned = cleanText(line);
            if (cleaned) {
                const isHeader = line.startsWith('#') || line.startsWith('**') || line.startsWith('=>');
                const isBullet = line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line);
                const isQuote = line.startsWith('>');
                regularFeedbackLines.push({ text: cleaned, isHeader, isBullet, isQuote });
            }
        }
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Banner */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.universityName}>Escuela de Ingeniería de Antioquia</Text>
                        <Text style={styles.title}>{cleanText(activity?.title || 'Actividad')}</Text>
                        <Text style={styles.courseTitle}>{cleanText(activity?.course?.title || activity?.courseTitle || 'Curso')}</Text>
                    </View>
                    <View style={styles.gradeBadge}>
                        <Text style={styles.gradeValue}>
                            {submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade).toFixed(1) : '-'}
                        </Text>
                        <Text style={styles.gradeLabel}>Nota Final</Text>
                    </View>
                </View>

                {/* Meta Info */}
                <View style={styles.metaSection}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Estudiante</Text>
                        <Text style={styles.metaValue}>{studentName}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Fecha de Entrega</Text>
                        <Text style={styles.metaValue}>
                            {submission?.submittedAt || submission?.createdAt ? format(new Date(submission.submittedAt || submission.createdAt), "PP p", { locale: es }) : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Repositorio / URL</Text>
                        {submission?.url ? (
                            <Link src={submission.url} style={[styles.metaValue, { color: COLORS.primary, fontSize: 8 }]}>
                                {submission.url}
                            </Link>
                        ) : (
                            <Text style={styles.metaValue}>N/A</Text>
                        )}
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Archivos Requeridos */}
                    {filePaths.length > 0 && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Archivos Requeridos</Text>
                            </View>
                            <View style={styles.reqFilesContainer}>
                                <Text style={styles.reqFilesTitle}>Archivos Requeridos para Evaluación:</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {filePaths.map((path: string, index: number) => (
                                        <Text key={index} style={styles.reqFileBadge}>{path.trim()}</Text>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 2. Enunciado / Rúbrica */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader} wrap={false}>
                            <Text style={styles.sectionTitle}>Enunciado / Rúbrica de Evaluación</Text>
                        </View>
                        {statementLines.map((line: string, idx: number) => {
                            const cleaned = cleanText(line);
                            if (!cleaned) return null;
                            const isHeader = line.startsWith('#') || line.startsWith('**') || line.startsWith('=>');
                            const isQuote = line.startsWith('>');
                            const isBullet = line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line);

                            if (isHeader) {
                                return (
                                    <View key={idx} style={{ marginTop: 6, marginBottom: 2 }} wrap={false}>
                                        <Text style={styles.heading}>{cleaned}</Text>
                                    </View>
                                );
                            }
                            if (isQuote) {
                                return (
                                    <View key={idx} style={styles.blockquote} wrap={false}>
                                        <Text style={styles.blockquoteText}>{cleaned}</Text>
                                    </View>
                                );
                            }
                            if (isBullet) {
                                return (
                                    <View key={idx} style={styles.bulletItem} wrap={false}>
                                        <Text style={styles.bulletDot}>•</Text>
                                        <Text style={styles.bulletText}>{cleaned}</Text>
                                    </View>
                                );
                            }
                            return (
                                <Text key={idx} style={styles.paragraph}>{cleaned}</Text>
                            );
                        })}
                    </View>

                    {/* 3. Tabla de Archivos Evaluados (Si existe) */}
                    {tableHeaders.length > 0 && tableRows.length > 0 && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Entregables Evaluados</Text>
                            </View>
                            <View style={styles.pdfTable}>
                                <View style={styles.pdfTableHeader}>
                                    {tableHeaders.map((h, i) => (
                                        <Text key={i} style={styles.pdfTableHeaderCell}>{h}</Text>
                                    ))}
                                </View>
                                {tableRows.map((row, rIdx) => (
                                    <View key={rIdx} style={styles.pdfTableRow}>
                                        {row.map((cell, cIdx) => (
                                            <Text key={cIdx} style={styles.pdfTableCell}>{cell}</Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* 4. Retroalimentación */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader} wrap={false}>
                            <Text style={styles.sectionTitle}>Retroalimentación de la Entrega</Text>
                        </View>
                        {regularFeedbackLines.map((item, idx) => {
                            if (item.isHeader) {
                                return (
                                    <View key={idx} style={{ marginTop: 6, marginBottom: 2 }} wrap={false}>
                                        <Text style={styles.heading}>{item.text}</Text>
                                    </View>
                                );
                            }
                            if (item.isQuote) {
                                return (
                                    <View key={idx} style={styles.blockquote} wrap={false}>
                                        <Text style={styles.blockquoteText}>{item.text}</Text>
                                    </View>
                                );
                            }
                            if (item.isBullet) {
                                return (
                                    <View key={idx} style={styles.bulletItem} wrap={false}>
                                        <Text style={styles.bulletDot}>•</Text>
                                        <Text style={styles.bulletText}>{item.text}</Text>
                                    </View>
                                );
                            }
                            return (
                                <Text key={idx} style={styles.paragraph}>{item.text}</Text>
                            );
                        })}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Generado por EIA Learning System • {format(new Date(), "PP", { locale: es })}
                    </Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
};
