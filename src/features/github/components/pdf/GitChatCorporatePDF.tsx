import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { 
    parseMarkdownToEditorialSections, 
    getTokenColor, 
    cleanPdfText,
    EditorialSection, 
    InlineToken 
} from "@/features/documentation/components/pdf/markdownToPdfAst";

export interface GitChatMessagePdfItem {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    toolCallsCount?: number;
}

export interface GitChatCorporatePDFProps {
    repoInfo: {
        fullName: string;
        owner: string;
        repo: string;
        url: string;
        branch: string;
    };
    messages: GitChatMessagePdfItem[];
    sessionTitle?: string;
    generatedAt?: string;
    userName?: string;
}

const COLORS = {
    primary: "#0f172a",       // Deep Slate 900
    secondary: "#1e293b",     // Slate 800
    text: "#334155",          // Slate 700
    textMuted: "#64748b",     // Slate 500
    accent: "#4f46e5",        // Indigo 600
    accentLight: "#eef2ff",   // Indigo 50
    accentBorder: "#c7d2fe",  // Indigo 200
    surfaceAlt: "#f8fafc",    // Slate 50
    border: "#e2e8f0",        // Slate 200
    borderDark: "#cbd5e1",    // Slate 300
    white: "#ffffff",
    
    // Message role colors
    userBg: "#f8fafc",
    userBorder: "#cbd5e1",
    userText: "#1e293b",

    asstBg: "#ffffff",
    asstBorder: "#e2e8f0",
    asstText: "#0f172a",

    toolBg: "#fef3c7",
    toolBorder: "#fde68a",
    toolText: "#92400e",

    codeBg: "#0f172a",
    codeHeader: "#1e293b",
    codeBorder: "#1e293b",
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 38,
        paddingBottom: 38,
        paddingHorizontal: 36,
        backgroundColor: COLORS.white,
        fontFamily: "Helvetica",
        color: COLORS.text,
        fontSize: 8.5,
        lineHeight: 1.45,
    },
    // Header fijo superior en cada página
    fixedHeader: {
        position: "absolute",
        top: 14,
        left: 36,
        right: 36,
        paddingBottom: 5,
        borderBottomWidth: 0.8,
        borderBottomColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    brandTitle: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.accent,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    brandSubtitle: {
        fontSize: 7,
        color: COLORS.textMuted,
    },
    // Footer fijo inferior en cada página
    fixedFooter: {
        position: "absolute",
        bottom: 14,
        left: 36,
        right: 36,
        paddingTop: 5,
        borderTopWidth: 0.8,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerNotice: {
        fontSize: 6.5,
        color: COLORS.textMuted,
    },
    pageNumber: {
        fontSize: 7,
        color: COLORS.textMuted,
        fontFamily: "Helvetica-Bold",
    },

    // Portada / Tarjeta de Resumen
    coverCard: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    primaryBadge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 3,
    },
    primaryBadgeText: {
        color: COLORS.white,
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    secondaryBadge: {
        backgroundColor: COLORS.accentLight,
        borderColor: COLORS.accentBorder,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 3,
    },
    secondaryBadgeText: {
        color: COLORS.accent,
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
    },
    mainTitle: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        marginBottom: 3,
    },
    mainSubtitle: {
        fontSize: 8,
        color: COLORS.textMuted,
        marginBottom: 8,
        lineHeight: 1.35,
    },
    metaGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingTop: 8,
        borderTopWidth: 0.8,
        borderTopColor: COLORS.border,
    },
    metaItem: {
        width: "23%",
    },
    metaLabel: {
        fontSize: 6.5,
        color: COLORS.textMuted,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.secondary,
    },

    // Contenedores de Mensajes (sin wrap={false} en el contenedor exterior para evitar saltos artificiales de página)
    messageContainer: {
        marginBottom: 10,
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
    },
    userContainer: {
        backgroundColor: COLORS.userBg,
        borderColor: COLORS.userBorder,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    asstContainer: {
        backgroundColor: COLORS.asstBg,
        borderColor: COLORS.asstBorder,
        borderLeftWidth: 3,
        borderLeftColor: "#10b981",
    },
    messageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 5,
        marginBottom: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    roleLabel: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        letterSpacing: 0.4,
    },
    userRoleLabel: {
        color: COLORS.accent,
    },
    asstRoleLabel: {
        color: "#059669",
    },
    timeLabel: {
        fontSize: 7,
        color: COLORS.textMuted,
    },
    toolCallsBadge: {
        backgroundColor: COLORS.toolBg,
        borderColor: COLORS.toolBorder,
        borderWidth: 0.5,
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
    },
    toolCallsText: {
        fontSize: 6.5,
        color: COLORS.toolText,
        fontFamily: "Helvetica-Bold",
    },
    messageBody: {
        fontSize: 8.5,
        lineHeight: 1.45,
        color: COLORS.text,
    },

    // Estilos para elementos Markdown enriquecidos
    mdH1: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        marginTop: 8,
        marginBottom: 4,
        paddingBottom: 2,
        borderBottomWidth: 0.8,
        borderBottomColor: COLORS.border,
    },
    mdH2Container: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 4,
        paddingBottom: 2,
        borderBottomWidth: 0.6,
        borderBottomColor: COLORS.border,
    },
    mdH2Bar: {
        width: 3,
        height: 10,
        backgroundColor: COLORS.accent,
        borderRadius: 1.5,
        marginRight: 5,
    },
    mdH2Text: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    mdH3: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: COLORS.secondary,
        marginTop: 6,
        marginBottom: 3,
    },
    mdH4: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.text,
        marginTop: 5,
        marginBottom: 2,
    },
    mdParagraph: {
        fontSize: 8.5,
        lineHeight: 1.45,
        color: COLORS.text,
        marginBottom: 4,
    },
    mdBold: {
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    mdItalic: {
        fontFamily: "Helvetica-Oblique",
        color: COLORS.text,
    },
    mdInlineCode: {
        fontFamily: "Courier",
        fontSize: 7.5,
        backgroundColor: "#f1f5f9",
        color: "#4f46e5",
    },
    mdListContainer: {
        marginBottom: 4,
        paddingLeft: 2,
    },
    mdListItemRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 2.5,
    },
    mdBullet: {
        width: 10,
        fontSize: 9,
        color: COLORS.accent,
        fontFamily: "Helvetica-Bold",
    },
    mdOrderedBadge: {
        width: 11,
        height: 11,
        borderRadius: 5.5,
        backgroundColor: COLORS.accent,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 5,
        marginTop: 1,
    },
    mdOrderedBadgeText: {
        color: COLORS.white,
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
    },
    mdListContent: {
        flex: 1,
        fontSize: 8.5,
        lineHeight: 1.4,
        color: COLORS.text,
    },
    mdCodeCard: {
        backgroundColor: COLORS.codeBg,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.codeBorder,
        marginVertical: 4,
        overflow: "hidden",
    },
    mdCodeHeader: {
        backgroundColor: COLORS.codeHeader,
        paddingHorizontal: 6,
        paddingVertical: 3,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 0.5,
        borderBottomColor: "#334155",
    },
    macDots: {
        flexDirection: "row",
        gap: 3,
    },
    dot: {
        width: 4.5,
        height: 4.5,
        borderRadius: 2.25,
    },
    mdCodeLang: {
        color: "#94a3b8",
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
        letterSpacing: 0.5,
    },
    mdCodeBody: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    mdCodeLineRow: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 9,
    },
    mdCodeLineNumber: {
        width: 16,
        fontFamily: "Courier",
        fontSize: 6,
        color: "#475569",
        textAlign: "right",
        paddingRight: 4,
    },
    mdCodeLineText: {
        fontFamily: "Courier",
        fontSize: 6.5,
        lineHeight: 1.3,
        color: "#f8fafc",
        flex: 1,
    },
    mdCalloutCard: {
        borderLeftWidth: 2.5,
        borderRadius: 3,
        paddingHorizontal: 7,
        paddingVertical: 5,
        marginVertical: 4,
    },
    mdCalloutHeader: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
        letterSpacing: 0.3,
    },
    mdCalloutBody: {
        fontSize: 8,
        lineHeight: 1.4,
        color: COLORS.text,
    },
    mdTableContainer: {
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 3,
        marginVertical: 4,
        overflow: "hidden",
    },
    mdTableHeaderRow: {
        flexDirection: "row",
        backgroundColor: COLORS.surfaceAlt,
        borderBottomWidth: 0.8,
        borderBottomColor: COLORS.border,
        paddingVertical: 3,
        paddingHorizontal: 5,
    },
    mdTableHeaderCell: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    mdTableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        paddingVertical: 3,
        paddingHorizontal: 5,
    },
    mdTableRowAlt: {
        backgroundColor: "#fcfcfd",
    },
    mdTableCell: {
        fontSize: 7,
        color: COLORS.text,
    },
    mdDivider: {
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginVertical: 6,
    },
});

function renderEditorialSection(sec: EditorialSection, sIdx: number) {
    switch (sec.type) {
        case "h1":
            return (
                <Text key={sIdx} style={styles.mdH1}>
                    {cleanPdfText(sec.title || "")}
                </Text>
            );

        case "h2":
            return (
                <View key={sIdx} style={styles.mdH2Container} wrap={false}>
                    <View style={styles.mdH2Bar} />
                    <Text style={styles.mdH2Text}>
                        {cleanPdfText(sec.title || "")}
                    </Text>
                </View>
            );

        case "h3":
            return (
                <Text key={sIdx} style={styles.mdH3} wrap={false}>
                    {cleanPdfText(sec.title || "")}
                </Text>
            );

        case "h4":
            return (
                <Text key={sIdx} style={styles.mdH4} wrap={false}>
                    {cleanPdfText(sec.title || "")}
                </Text>
            );

        case "paragraph":
            return (
                <Text key={sIdx} style={styles.mdParagraph}>
                    {(sec.inlineTokens || []).map((tok, tIdx) => (
                        <Text
                            key={tIdx}
                            style={[
                                tok.bold ? styles.mdBold : {},
                                tok.italic ? styles.mdItalic : {},
                                tok.code ? styles.mdInlineCode : {},
                            ]}
                        >
                            {cleanPdfText(tok.text)}
                        </Text>
                    ))}
                </Text>
            );

        case "list":
            return (
                <View key={sIdx} style={styles.mdListContainer}>
                    {(sec.items || []).map((item, itemIdx) => (
                        <View key={itemIdx} style={styles.mdListItemRow} wrap={false}>
                            <Text style={styles.mdBullet}>•</Text>
                            <Text style={styles.mdListContent}>
                                {item.inlineTokens.map((tok, tIdx) => (
                                    <Text
                                        key={tIdx}
                                        style={[
                                            tok.bold ? styles.mdBold : {},
                                            tok.italic ? styles.mdItalic : {},
                                            tok.code ? styles.mdInlineCode : {},
                                        ]}
                                    >
                                        {cleanPdfText(tok.text)}
                                    </Text>
                                ))}
                            </Text>
                        </View>
                    ))}
                </View>
            );

        case "ordered-list":
            return (
                <View key={sIdx} style={styles.mdListContainer}>
                    {(sec.items || []).map((item, itemIdx) => (
                        <View key={itemIdx} style={styles.mdListItemRow} wrap={false}>
                            <View style={styles.mdOrderedBadge}>
                                <Text style={styles.mdOrderedBadgeText}>{item.number}</Text>
                            </View>
                            <Text style={styles.mdListContent}>
                                {item.inlineTokens.map((tok, tIdx) => (
                                    <Text
                                        key={tIdx}
                                        style={[
                                            tok.bold ? styles.mdBold : {},
                                            tok.italic ? styles.mdItalic : {},
                                            tok.code ? styles.mdInlineCode : {},
                                        ]}
                                    >
                                        {cleanPdfText(tok.text)}
                                    </Text>
                                ))}
                            </Text>
                        </View>
                    ))}
                </View>
            );

        case "code":
            return (
                <View key={sIdx} style={styles.mdCodeCard} wrap={true}>
                    <View style={styles.mdCodeHeader} wrap={false}>
                        <View style={styles.macDots}>
                            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                            <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                            <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                        </View>
                        <Text style={styles.mdCodeLang}>{sec.language || "CÓDIGO"}</Text>
                    </View>
                    <View style={styles.mdCodeBody}>
                        {(sec.codeLines || []).map((line) => (
                            <View key={line.lineNumber} style={styles.mdCodeLineRow} wrap={false}>
                                <Text style={styles.mdCodeLineNumber}>{line.lineNumber}</Text>
                                <Text style={styles.mdCodeLineText}>
                                    {line.tokens.length === 0 ? (
                                        <Text> </Text>
                                    ) : (
                                        line.tokens.map((tok, tokIdx) => (
                                            <Text
                                                key={tokIdx}
                                                style={{
                                                    color: getTokenColor(tok.type),
                                                    fontFamily: "Courier",
                                                }}
                                            >
                                                {tok.text.replace(/ /g, "\u00A0")}
                                            </Text>
                                        ))
                                    )}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            );

        case "callout": {
            const cType = sec.calloutType || "NOTE";
            const calloutColor =
                cType === "TIP" ? "#059669" :
                cType === "IMPORTANT" ? "#2563eb" :
                cType === "WARNING" ? "#d97706" :
                cType === "CAUTION" ? "#dc2626" : "#4f46e5";
            const calloutBg =
                cType === "TIP" ? "#ecfdf5" :
                cType === "IMPORTANT" ? "#eff6ff" :
                cType === "WARNING" ? "#fffbeb" :
                cType === "CAUTION" ? "#fef2f2" : "#eef2ff";

            return (
                <View
                    key={sIdx}
                    style={[
                        styles.mdCalloutCard,
                        { backgroundColor: calloutBg, borderLeftColor: calloutColor }
                    ]}
                    wrap={false}
                >
                    {sec.calloutTitle ? (
                        <Text style={[styles.mdCalloutHeader, { color: calloutColor }]}>
                            {sec.calloutTitle}
                        </Text>
                    ) : null}
                    <Text style={styles.mdCalloutBody}>
                        {(sec.calloutTokens || []).map((tok, tIdx) => (
                            <Text
                                key={tIdx}
                                style={[
                                    tok.bold ? styles.mdBold : {},
                                    tok.italic ? styles.mdItalic : {},
                                    tok.code ? styles.mdInlineCode : {},
                                ]}
                            >
                                {cleanPdfText(tok.text)}
                            </Text>
                        ))}
                    </Text>
                </View>
            );
        }

        case "table": {
            const headers = sec.tableHeaders || [];
            const rows = sec.tableRows || [];
            if (headers.length === 0 && rows.length === 0) return null;
            const colWidth = `${100 / Math.max(headers.length, 1)}%`;

            return (
                <View key={sIdx} style={styles.mdTableContainer} wrap={true}>
                    {headers.length > 0 && (
                        <View style={styles.mdTableHeaderRow} wrap={false}>
                            {headers.map((h, hIdx) => (
                                <Text key={hIdx} style={[styles.mdTableHeaderCell, { width: colWidth }]}>
                                    {cleanPdfText(h)}
                                </Text>
                            ))}
                        </View>
                    )}
                    {rows.map((row, rIdx) => (
                        <View key={rIdx} style={[styles.mdTableRow, rIdx % 2 === 1 ? styles.mdTableRowAlt : {}]} wrap={false}>
                            {row.map((cell, cIdx) => (
                                <Text key={cIdx} style={[styles.mdTableCell, { width: colWidth }]}>
                                    {cleanPdfText(cell)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>
            );
        }

        case "divider":
            return <View key={sIdx} style={styles.mdDivider} />;

        default:
            return null;
    }
}

export function GitChatCorporatePDF({
    repoInfo,
    messages,
    sessionTitle = "Auditoría Técnica MCP",
    generatedAt = new Date().toLocaleString(),
    userName = "Docente",
}: GitChatCorporatePDFProps) {
    // Filtrar mensaje de bienvenida si es meramente inicial
    const displayMessages = messages.filter(
        (m) => !m.id.startsWith("welcome") && !m.id.startsWith("branch-change")
    );

    return (
        <Document
            title={`Reporte_GitHub_MCP_${repoInfo.repo}`}
            author="SmartClass GitHub Engine"
            subject={`Auditoría técnica de repositorio: ${repoInfo.fullName}`}
        >
            <Page size="A4" style={styles.page}>
                {/* Header Fijo */}
                <View style={styles.fixedHeader} fixed>
                    <Text style={styles.brandTitle}>SMARTCLASS • AUDITORÍA GITHUB MCP</Text>
                    <Text style={styles.brandSubtitle}>Protocolo Model Context Protocol (MCP)</Text>
                </View>

                {/* Footer Fijo */}
                <View style={styles.fixedFooter} fixed>
                    <Text style={styles.footerNotice}>
                        Documento corporativo confidencial de uso docente y formativo • Generado en memoria sin persistencia en BD
                    </Text>
                    <Text
                        style={styles.pageNumber}
                        render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`}
                    />
                </View>

                {/* Portada / Tarjeta de Resumen */}
                <View style={styles.coverCard}>
                    <View style={styles.badgeRow}>
                        <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Model Context Protocol</Text>
                        </View>
                        <View style={styles.secondaryBadge}>
                            <Text style={styles.secondaryBadgeText}>Rama: {cleanPdfText(repoInfo.branch)}</Text>
                        </View>
                    </View>

                    <Text style={styles.mainTitle}>{cleanPdfText(sessionTitle)}</Text>
                    <Text style={styles.mainSubtitle}>
                        Informe consolidado de inspección técnica, auditoría de commits y análisis de código fuente.
                    </Text>

                    <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Repositorio</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(repoInfo.fullName)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Emisión</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(generatedAt)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Docente / Auditor</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(userName)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Consultas</Text>
                            <Text style={styles.metaValue}>{displayMessages.length} interacciones</Text>
                        </View>
                    </View>
                </View>

                {/* Flujo de Conversación: wrap={true} por defecto para fluir sin huecos entre páginas */}
                {displayMessages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const sections = parseMarkdownToEditorialSections(msg.content);

                    return (
                        <View
                            key={msg.id || idx}
                            style={[
                                styles.messageContainer,
                                isUser ? styles.userContainer : styles.asstContainer,
                            ]}
                        >
                            {/* Cabecera del mensaje atómica con wrap={false} */}
                            <View style={styles.messageHeader} wrap={false}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                    <Text
                                        style={[
                                            styles.roleLabel,
                                            isUser ? styles.userRoleLabel : styles.asstRoleLabel,
                                        ]}
                                    >
                                        {isUser ? "CONSULTA DEL DOCENTE" : "ASISTENTE TÉCNICO GITHUB MCP"}
                                    </Text>
                                    {!isUser && msg.toolCallsCount && msg.toolCallsCount > 0 ? (
                                        <View style={styles.toolCallsBadge}>
                                            <Text style={styles.toolCallsText}>
                                                {msg.toolCallsCount} {msg.toolCallsCount === 1 ? "herramienta MCP" : "herramientas MCP"}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.timeLabel}>
                                    {cleanPdfText(new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                                </Text>
                            </View>

                            {/* Contenido formateado editorialmente */}
                            <View style={styles.messageBody}>
                                {sections.length === 0 ? (
                                    <Text style={styles.mdParagraph}>{cleanPdfText(msg.content)}</Text>
                                ) : (
                                    sections.map((sec, sIdx) => renderEditorialSection(sec, sIdx))
                                )}
                            </View>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
}
