import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar fuentes
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

Font.register({
    family: 'Courier',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Droid_Sans_Mono/DroidSansMono.ttf'
});

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
        fontFamily: 'Roboto',
        fontSize: 10,
        color: COLORS.text,
        backgroundColor: '#ffffff',
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        padding: 25,
        color: '#ffffff',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    universityName: {
        fontSize: 9,
        opacity: 0.9,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 6,
    },
    courseTitle: {
        fontSize: 12,
        fontWeight: 400,
        opacity: 0.9,
    },
    gradeBadge: {
        backgroundColor: '#ffffff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 20,
        minWidth: 80,
    },
    gradeValue: {
        fontSize: 20,
        fontWeight: 700,
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
        padding: 15,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 8,
        color: COLORS.textLight,
        marginBottom: 2,
        textTransform: 'uppercase',
        fontWeight: 500,
    },
    metaValue: {
        fontSize: 10,
        fontWeight: 500,
        color: COLORS.text,
    },
    content: {
        padding: 30,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 5,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: COLORS.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Markdown Styles
    mdParagraph: {
        fontSize: 10,
        lineHeight: 1.5,
        marginBottom: 8,
        textAlign: 'justify',
    },
    mdH1: {
        fontSize: 16,
        fontWeight: 700,
        color: COLORS.primary,
        marginTop: 12,
        marginBottom: 6,
    },
    mdH2: {
        fontSize: 14,
        fontWeight: 700,
        color: COLORS.secondary,
        marginTop: 10,
        marginBottom: 5,
    },
    mdH3: {
        fontSize: 12,
        fontWeight: 700,
        color: COLORS.text,
        marginTop: 8,
        marginBottom: 4,
    },
    mdCodeBlock: {
        fontFamily: 'Courier',
        backgroundColor: COLORS.codeBg,
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.codeBorder,
        marginBottom: 10,
        fontSize: 9,
    },
    mdInlineCode: {
        fontFamily: 'Courier',
        backgroundColor: COLORS.codeBg,
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 2,
        fontSize: 9,
        color: '#d63384', // pink-600 style
    },
    mdList: {
        marginLeft: 10,
        marginBottom: 8,
    },
    mdListItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    mdBullet: {
        width: 15,
        fontSize: 14,
        color: COLORS.accent,
        lineHeight: 1,
    },
    mdBold: {
        fontWeight: 700,
    },
    mdItalic: {
        fontStyle: 'italic',
    },
    // Required Files Styles
    reqFilesContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: COLORS.background,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    reqFilesTitle: {
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 5,
        color: COLORS.text,
    },
    reqFileBadge: {
        fontSize: 9,
        fontFamily: 'Courier',
        backgroundColor: '#ffffff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 5,
        marginBottom: 5,
        alignSelf: 'flex-start',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
    },
    footerText: {
        fontSize: 8,
        color: COLORS.textLight,
    },
});

// --- Advanced Block-Aware Markdown Parser ---

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'code-block' | 'list';

interface MarkdownBlock {
    type: BlockType;
    content: string | string[]; // string for most, string[] for lists
}

const parseMarkdown = (text: string): MarkdownBlock[] => {
    if (!text) return [];

    const blocks: MarkdownBlock[] = [];
    const lines = text.split('\n');

    let currentBlock: MarkdownBlock | null = null;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 1. Handle Code Blocks
        if (trimmedLine.startsWith('```')) {
            if (inCodeBlock) {
                // End of code block
                if (currentBlock && currentBlock.type === 'code-block') {
                    blocks.push(currentBlock);
                    currentBlock = null;
                }
                inCodeBlock = false;
            } else {
                // Start of code block
                // If we were building a paragraph, push it first
                if (currentBlock && currentBlock.type === 'paragraph') {
                    blocks.push(currentBlock);
                }
                currentBlock = { type: 'code-block', content: '' };
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            if (currentBlock && currentBlock.type === 'code-block') {
                currentBlock.content = (currentBlock.content as string) + line + '\n';
            }
            continue;
        }

        // 2. Handle Headers
        if (trimmedLine.startsWith('#')) {
            // Push previous block if exists
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }

            if (trimmedLine.startsWith('# ')) {
                blocks.push({ type: 'h1', content: trimmedLine.substring(2) });
            } else if (trimmedLine.startsWith('## ')) {
                blocks.push({ type: 'h2', content: trimmedLine.substring(3) });
            } else if (trimmedLine.startsWith('### ')) {
                blocks.push({ type: 'h3', content: trimmedLine.substring(4) });
            }
            continue;
        }

        // 3. Handle Lists
        const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine);

        if (isListItem) {
            const itemContent = trimmedLine.replace(/^[-*]\s|^\d+\.\s/, '');

            if (currentBlock && currentBlock.type === 'list') {
                (currentBlock.content as string[]).push(itemContent);
            } else {
                // Push previous block if it wasn't a list
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                currentBlock = { type: 'list', content: [itemContent] };
            }
            continue;
        }

        // 4. Handle Paragraphs & Empty Lines
        if (trimmedLine.length === 0) {
            // Empty line means end of current block (paragraph or list)
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
            continue;
        }

        // It's a normal text line
        if (currentBlock && currentBlock.type === 'paragraph') {
            // Append to current paragraph
            currentBlock.content = (currentBlock.content as string) + ' ' + trimmedLine;
        } else {
            // If we were in a list, close it
            if (currentBlock && currentBlock.type === 'list') {
                blocks.push(currentBlock);
                currentBlock = null;
            }

            // Start new paragraph
            currentBlock = { type: 'paragraph', content: trimmedLine };
        }
    }

    // Push remaining block
    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
};

// Helper to render inline formatting (bold, italic, code)
const renderInlineMarkdown = (text: string) => {
    // Split by formatting tokens: **bold**, *italic*, `code`
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <Text key={index} style={styles.mdInlineCode}>{part.slice(1, -1)}</Text>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <Text key={index} style={styles.mdBold}>{part.slice(2, -2)}</Text>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <Text key={index} style={styles.mdItalic}>{part.slice(1, -1)}</Text>;
        }
        return <Text key={index}>{part}</Text>;
    });
};

const MarkdownPDF = ({ content }: { content: string }) => {
    const blocks = parseMarkdown(content);

    return (
        <View>
            {blocks.map((block, index) => {
                switch (block.type) {
                    case 'h1':
                        return <Text key={index} style={styles.mdH1}>{block.content as string}</Text>;
                    case 'h2':
                        return <Text key={index} style={styles.mdH2}>{block.content as string}</Text>;
                    case 'h3':
                        return <Text key={index} style={styles.mdH3}>{block.content as string}</Text>;
                    case 'code-block':
                        return (
                            <View key={index} style={styles.mdCodeBlock}>
                                <Text>{block.content as string}</Text>
                            </View>
                        );
                    case 'list':
                        return (
                            <View key={index} style={styles.mdList}>
                                {(block.content as string[]).map((item, i) => (
                                    <View key={i} style={styles.mdListItem}>
                                        <Text style={styles.mdBullet}>•</Text>
                                        <Text style={{ flex: 1, fontSize: 10 }}>{renderInlineMarkdown(item)}</Text>
                                    </View>
                                ))}
                            </View>
                        );
                    case 'paragraph':
                    default:
                        return (
                            <Text key={index} style={styles.mdParagraph}>
                                {renderInlineMarkdown(block.content as string)}
                            </Text>
                        );
                }
            })}
        </View>
    );
};

interface ActivityReportPDFProps {
    activity: any;
    submission: any;
    studentName: string;
}

export const ActivityReportPDF = ({ activity, submission, studentName }: ActivityReportPDFProps) => {
    const feedbackText = submission?.feedback || "Sin comentarios adicionales.";
    const instructions = activity.description || "Sin instrucciones disponibles.";
    const statement = activity.statement || "Sin enunciado disponible.";
    const filePaths = activity.filePaths ? activity.filePaths.split(',') : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.universityName}>Escuela de Ingeniería de Antioquia</Text>
                        <Text style={styles.title}>{activity.title}</Text>
                        <Text style={styles.courseTitle}>{activity.course.title}</Text>
                    </View>
                    <View style={styles.gradeBadge}>
                        <Text style={styles.gradeValue}>{submission?.grade?.toFixed(1) || '-'}</Text>
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
                            {submission?.submittedAt ? format(new Date(submission.submittedAt), "PP p", { locale: es }) : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Repositorio</Text>
                        <Text style={[styles.metaValue, { color: COLORS.primary, fontSize: 9 }]}>
                            {submission?.url || 'N/A'}
                        </Text>
                    </View>
                </View>

                <View style={styles.content}>

                    {/* 1. Instrucciones */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Instrucciones</Text>
                        </View>
                        <MarkdownPDF content={instructions} />

                        {/* Archivos Requeridos */}
                        {filePaths.length > 0 && (
                            <View style={styles.reqFilesContainer}>
                                <Text style={styles.reqFilesTitle}>Archivos Requeridos para Evaluación:</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                    {filePaths.map((path: string, index: number) => (
                                        <Text key={index} style={styles.reqFileBadge}>{path.trim()}</Text>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* 2. Enunciado / Rúbrica */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Enunciado / Rúbrica de Evaluación</Text>
                        </View>
                        <MarkdownPDF content={statement} />
                    </View>

                    {/* 3. Retroalimentación */}
                    <View style={styles.section} break>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Retroalimentación</Text>
                        </View>
                        <MarkdownPDF content={feedbackText} />
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
