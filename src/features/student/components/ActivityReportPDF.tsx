import { Page, Text, View, Document, StyleSheet, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getActivityChecklistConfig, extractEvaluationMetadata, stripEvaluationMetadata } from '@/features/teacher/utils/checklistGradingUtils';
import { formatEvidenceUrl } from '@/lib/utils';

// Colores corporativos
const COLORS = {
    primary: '#0f172a', // Deep Executive Slate
    secondary: '#1e3a5f', // Rich Corporate Navy
    accent: '#0284c7', // Professional Corporate Cyan
    background: '#f8fafc', // Clean slate-50
    text: '#0f172a', // Slate-900
    textLight: '#475569', // Slate-600
    border: '#cbd5e1', // Slate-300
    codeBg: '#f1f5f9', // Slate-100
    codeBorder: '#cbd5e1',
    success: '#047857',
    warning: '#b45309',
    danger: '#9f1239',
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
        backgroundColor: '#0f172a',
        padding: 16,
        borderBottomWidth: 3,
        borderBottomColor: '#0284c7',
        color: '#ffffff',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    universityName: {
        fontSize: 7.5,
        color: '#94a3b8',
        marginBottom: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
        lineHeight: 1.2,
        color: '#ffffff',
    },
    courseTitle: {
        fontSize: 9,
        color: '#cbd5e1',
    },
    gradeBadge: {
        backgroundColor: '#ffffff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
        minWidth: 72,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    gradeValue: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
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
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.secondary,
        textTransform: 'uppercase',
    },
    // Weighting summary box
    weightsContainer: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    weightsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    weightCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 3,
        padding: 5,
        marginHorizontal: 2,
        alignItems: 'center',
    },
    weightCardTitle: {
        fontSize: 7,
        color: COLORS.textLight,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
    },
    weightCardValue: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.primary,
        marginTop: 1,
    },
    // Criteria items
    criterionCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 7,
        marginBottom: 5,
        backgroundColor: '#ffffff',
    },
    criterionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    criterionName: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: COLORS.text,
        flex: 1,
    },
    levelBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 3,
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
    },
    criterionQuestion: {
        fontSize: 7.5,
        color: COLORS.textLight,
        marginTop: 2,
        fontStyle: 'italic',
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
    const rawFeedbackFull = submission?.feedback || "Sin comentarios adicionales.";
    const cleanFeedbackWithoutMeta = stripEvaluationMetadata(rawFeedbackFull);
    const rawStatement = activity?.statement || "Sin enunciado disponible.";
    const filePaths = activity?.filePaths ? (typeof activity.filePaths === 'string' ? activity.filePaths.split(',') : activity.filePaths) : [];

    // Extract checklist config & eval metadata
    const checklistConfig = getActivityChecklistConfig(activity?.description);
    const evalMetadata = extractEvaluationMetadata(rawFeedbackFull);

    // Split AI feedback and Teacher observations
    let aiFeedbackText = cleanFeedbackWithoutMeta;
    let teacherObservationsText = "";

    const teacherMarker = "### 👨‍🏫 Observaciones del Profesor";
    const markerIdx = cleanFeedbackWithoutMeta.indexOf(teacherMarker);
    if (markerIdx !== -1) {
        aiFeedbackText = cleanFeedbackWithoutMeta.substring(0, markerIdx).trim();
        teacherObservationsText = cleanFeedbackWithoutMeta.substring(markerIdx + teacherMarker.length).trim();
    } else if (cleanFeedbackWithoutMeta.includes("Observaciones del Profesor")) {
        const parts = cleanFeedbackWithoutMeta.split(/Observaciones del Profesor/i);
        aiFeedbackText = parts[0].trim();
        teacherObservationsText = parts.slice(1).join("").trim();
    }

    // Parse statement into clean lines
    const statementLines = rawStatement
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

    // Parse feedback into clean lines and table rows
    const feedbackLines = aiFeedbackText
        .replace(/\\n/g, '\n')
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

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

    const getLevelInfo = (factor?: number) => {
        if (factor === 1.0) return { label: 'Sabe (100%)', bg: '#ecfdf5', text: '#065f46' };
        if (factor === 0.75) return { label: 'Aceptable (75%)', bg: '#f0f9ff', text: '#0369a1' };
        if (factor === 0.5) return { label: 'Parcial (50%)', bg: '#fffbeb', text: '#92400e' };
        if (factor === 0) return { label: 'No Sabe (0%)', bg: '#fff1f2', text: '#9f1239' };
        return null;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Banner */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.universityName}>SmartClass — Reporte de Evaluación Académica</Text>
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
                            {submission?.submittedAt || submission?.createdAt || submission?.lastSubmittedAt ? format(new Date(submission.submittedAt || submission.createdAt || submission.lastSubmittedAt), "PP p", { locale: es }) : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Repositorio / URL</Text>
                        {(() => {
                            const evidenceUrl = formatEvidenceUrl(submission?.url);
                            return evidenceUrl ? (
                                <Link src={evidenceUrl} style={[styles.metaValue, { color: COLORS.accent, fontSize: 8 }]}>
                                    {evidenceUrl}
                                </Link>
                            ) : (
                                <Text style={styles.metaValue}>{submission?.url || 'N/A'}</Text>
                            );
                        })()}
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Desglose de Ponderación (si aplica sustentación oral docente) */}
                    {checklistConfig && (
                        <View style={styles.weightsContainer} wrap={false}>
                            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.secondary }}>
                                PONDERACIÓN DE CALIFICACIÓN ({checklistConfig.aiWeight}% IA + {checklistConfig.checklistWeight}% Sustentación Docente)
                            </Text>
                            <View style={styles.weightsRow}>
                                <View style={styles.weightCard}>
                                    <Text style={styles.weightCardTitle}>Evaluación IA ({checklistConfig.aiWeight}%)</Text>
                                    <Text style={styles.weightCardValue}>
                                        {evalMetadata?.aiGrade !== null && evalMetadata?.aiGrade !== undefined ? evalMetadata.aiGrade.toFixed(1) : '—'}
                                    </Text>
                                </View>
                                <View style={styles.weightCard}>
                                    <Text style={styles.weightCardTitle}>Sustentación ({checklistConfig.checklistWeight}%)</Text>
                                    <Text style={styles.weightCardValue}>
                                        {evalMetadata?.checklistScore !== null && evalMetadata?.checklistScore !== undefined ? evalMetadata.checklistScore.toFixed(1) : '—'}
                                    </Text>
                                </View>
                                <View style={[styles.weightCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                                    <Text style={[styles.weightCardTitle, { color: '#065f46' }]}>Nota Ponderada</Text>
                                    <Text style={[styles.weightCardValue, { color: '#065f46' }]}>
                                        {submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade).toFixed(1) : '—'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Criterios de Sustentación Oral Calificados */}
                    {checklistConfig?.criteria && checklistConfig.criteria.length > 0 && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    Criterios de Sustentación Oral Calificados ({checklistConfig.criteria.length} Criterios)
                                </Text>
                            </View>
                            {checklistConfig.criteria.map((crit, idx) => {
                                const factor = evalMetadata?.criteriaLevels?.[crit.id]
                                    ?? evalMetadata?.criteriaLevels?.[`crit-${idx + 1}`]
                                    ?? evalMetadata?.criteriaLevels?.[String(idx + 1)];
                                const level = typeof factor === 'number' ? getLevelInfo(factor) : null;
                                const criterionGrade = typeof factor === 'number' ? (factor * 5.0).toFixed(1) : '—';

                                return (
                                    <View key={crit.id || idx} style={styles.criterionCard} wrap={false}>
                                        <View style={styles.criterionHeader}>
                                            <Text style={styles.criterionName}>
                                                #{idx + 1} {crit.name} ({crit.percentage}%)
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                {level && (
                                                    <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
                                                        <Text style={{ color: level.text, fontSize: 7, fontFamily: 'Helvetica-Bold' }}>
                                                            {level.label}
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.textLight, marginLeft: 4 }}>
                                                    Nota: {criterionGrade} / 5.0
                                                </Text>
                                            </View>
                                        </View>
                                        {crit.question && (
                                            <Text style={styles.criterionQuestion}>
                                                Pregunta: {crit.question}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Observaciones del Profesor (si existen) */}
                    {teacherObservationsText && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Observaciones del Profesor</Text>
                            </View>
                            <View style={styles.blockquote}>
                                <Text style={styles.blockquoteText}>{teacherObservationsText}</Text>
                            </View>
                        </View>
                    )}

                    {/* Tabla de Archivos Evaluados (si existe) */}
                    {tableHeaders.length > 0 && tableRows.length > 0 && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Entregables / Archivos Evaluados</Text>
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

                    {/* Retroalimentación de la IA */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader} wrap={false}>
                            <Text style={styles.sectionTitle}>Retroalimentación de la IA (Gemini)</Text>
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

                    {/* Archivos Requeridos */}
                    {filePaths.length > 0 && (
                        <View style={styles.section} wrap={false}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Archivos Requeridos</Text>
                            </View>
                            <View style={styles.reqFilesContainer}>
                                <Text style={styles.reqFilesTitle}>Archivos Requeridos por la Actividad:</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {filePaths.map((path: string, index: number) => (
                                        <Text key={index} style={styles.reqFileBadge}>{String(path).trim()}</Text>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Enunciado / Rúbrica */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader} wrap={false}>
                            <Text style={styles.sectionTitle}>Enunciado y Rúbrica de la Actividad</Text>
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
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Generado por SmartClass • {format(new Date(), "PP", { locale: es })}
                    </Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    );
};
