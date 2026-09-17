import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { cleanPdfText } from "@/features/documentation/components/pdf/markdownToPdfAst";

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
    userBg: "#f1f5f9",
    userBorder: "#cbd5e1",
    userText: "#1e293b",

    asstBg: "#f8fafc",
    asstBorder: "#e2e8f0",
    asstText: "#0f172a",

    toolBg: "#fef3c7",
    toolBorder: "#fde68a",
    toolText: "#92400e",
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 46,
        paddingBottom: 46,
        paddingHorizontal: 36,
        backgroundColor: COLORS.white,
        fontFamily: "Helvetica",
        color: COLORS.text,
        fontSize: 10,
        lineHeight: 1.45,
    },
    // Header fijo superior
    fixedHeader: {
        position: "absolute",
        top: 16,
        left: 36,
        right: 36,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    brandTitle: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: COLORS.accent,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    brandSubtitle: {
        fontSize: 7,
        color: COLORS.textMuted,
    },
    // Footer fijo inferior
    fixedFooter: {
        position: "absolute",
        bottom: 16,
        left: 36,
        right: 36,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerNotice: {
        fontSize: 7,
        color: COLORS.textMuted,
    },
    pageNumber: {
        fontSize: 7,
        color: COLORS.textMuted,
        fontFamily: "Helvetica-Bold",
    },

    // Portada / Cabecera Principal
    coverCard: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    badgeRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 8,
    },
    primaryBadge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    primaryBadgeText: {
        color: COLORS.white,
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    secondaryBadge: {
        backgroundColor: COLORS.accentLight,
        borderColor: COLORS.accentBorder,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    secondaryBadgeText: {
        color: COLORS.accent,
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
    },
    mainTitle: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        marginBottom: 4,
    },
    mainSubtitle: {
        fontSize: 9,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    metaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    metaItem: {
        width: "45%",
    },
    metaLabel: {
        fontSize: 7.5,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: COLORS.secondary,
    },

    // Mensajes
    messageContainer: {
        marginBottom: 12,
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
    },
    userContainer: {
        backgroundColor: COLORS.userBg,
        borderColor: COLORS.userBorder,
        marginLeft: 20,
    },
    asstContainer: {
        backgroundColor: COLORS.asstBg,
        borderColor: COLORS.asstBorder,
        marginRight: 10,
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
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
    },
    userRoleLabel: {
        color: COLORS.secondary,
    },
    asstRoleLabel: {
        color: COLORS.accent,
    },
    timeLabel: {
        fontSize: 7.5,
        color: COLORS.textMuted,
    },
    toolCallsBadge: {
        backgroundColor: COLORS.toolBg,
        borderColor: COLORS.toolBorder,
        borderWidth: 0.5,
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        alignSelf: "flex-start",
        marginBottom: 6,
    },
    toolCallsText: {
        fontSize: 7,
        color: COLORS.toolText,
        fontFamily: "Helvetica-Bold",
    },
    messageBody: {
        fontSize: 8.5,
        lineHeight: 1.45,
        color: COLORS.text,
    },
    paragraph: {
        marginBottom: 4,
    },
    codeBlock: {
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        padding: 6,
        borderRadius: 4,
        fontFamily: "Courier",
        fontSize: 7.5,
        marginVertical: 4,
    },
});

function parseSimpleMarkdownLines(text: string): Array<{ type: "paragraph" | "code"; text: string }> {
    if (!text) return [];
    const lines = text.split("\n");
    const blocks: Array<{ type: "paragraph" | "code"; text: string }> = [];
    let inCode = false;
    let codeBuffer: string[] = [];

    for (const line of lines) {
        if (line.trim().startsWith("```")) {
            if (inCode) {
                blocks.push({ type: "code", text: codeBuffer.join("\n") });
                codeBuffer = [];
                inCode = false;
            } else {
                inCode = true;
            }
            continue;
        }

        if (inCode) {
            codeBuffer.push(line);
        } else {
            const cleaned = line.trim();
            if (cleaned) {
                blocks.push({ type: "paragraph", text: cleaned });
            }
        }
    }

    if (codeBuffer.length > 0) {
        blocks.push({ type: "code", text: codeBuffer.join("\n") });
    }

    return blocks;
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
                            <Text style={styles.metaLabel}>Repositorio Evaluado</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(repoInfo.fullName)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Fecha y Hora de Emisión</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(generatedAt)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Docente / Auditor</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(userName)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Consultas Realizadas</Text>
                            <Text style={styles.metaValue}>{displayMessages.length} interacciones</Text>
                        </View>
                    </View>
                </View>

                {/* Flujo de Conversación */}
                {displayMessages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const blocks = parseSimpleMarkdownLines(msg.content);

                    return (
                        <View
                            key={msg.id || idx}
                            style={[
                                styles.messageContainer,
                                isUser ? styles.userContainer : styles.asstContainer,
                            ]}
                            wrap={false}
                        >
                            <View style={styles.messageHeader}>
                                <Text
                                    style={[
                                        styles.roleLabel,
                                        isUser ? styles.userRoleLabel : styles.asstRoleLabel,
                                    ]}
                                >
                                    {isUser ? "👤 CONSULTA DEL DOCENTE" : "🤖 ASISTENTE GITHUB MCP"}
                                </Text>
                                <Text style={styles.timeLabel}>
                                    {cleanPdfText(new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                                </Text>
                            </View>

                            {!isUser && msg.toolCallsCount && msg.toolCallsCount > 0 ? (
                                <View style={styles.toolCallsBadge}>
                                    <Text style={styles.toolCallsText}>
                                        ⚡ Herramientas MCP invocadas: {msg.toolCallsCount}
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.messageBody}>
                                {blocks.map((block, bIdx) => {
                                    if (block.type === "code") {
                                        return (
                                            <Text key={bIdx} style={styles.codeBlock}>
                                                {cleanPdfText(block.text)}
                                            </Text>
                                        );
                                    }
                                    return (
                                        <Text key={bIdx} style={styles.paragraph}>
                                            {cleanPdfText(block.text)}
                                        </Text>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </Page>
        </Document>
    );
}
