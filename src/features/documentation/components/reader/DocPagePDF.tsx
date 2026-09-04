import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";

// One Dark Pro Syntax Highlighting Palette
const TOKEN_COLORS: Record<string, string> = {
    keyword: "#c678dd",         // Magenta/Purple (fun, val, var, class, return, import)
    string: "#98c379",          // Green strings
    "template-string": "#98c379",
    char: "#98c379",
    function: "#61afef",        // Blue functions
    "class-name": "#e5c07b",    // Yellow/Gold classes and types
    number: "#d19a66",          // Orange numbers
    boolean: "#d19a66",         // Orange booleans
    comment: "#7f848e",         // Muted gray comments
    operator: "#56b6c2",        // Cyan operators
    punctuation: "#abb2bf",     // Light gray punctuation
    property: "#e06c75",        // Red/Coral properties
    variable: "#e06c75",
    constant: "#d19a66",
    tag: "#e06c75",             // HTML/XML tags
    "attr-name": "#d19a66",     // HTML attributes
    "attr-value": "#98c379",    // HTML attribute values
    builtin: "#e5c07b",
    regex: "#98c379",
    annotation: "#e5c07b",      // @Annotations
    selector: "#c678dd",
    important: "#c678dd",
    default: "#abb2bf",
};

function getTokenColor(type?: string): string {
    if (!type) return TOKEN_COLORS.default;
    if (TOKEN_COLORS[type]) return TOKEN_COLORS[type];
    const parts = type.split(/\s+/);
    for (const p of parts) {
        if (TOKEN_COLORS[p]) return TOKEN_COLORS[p];
    }
    return TOKEN_COLORS.default;
}

interface CodeToken {
    text: string;
    type?: string;
}

function flattenPrismTokens(tokens: (string | Prism.Token)[], parentType?: string): CodeToken[] {
    const result: CodeToken[] = [];
    for (const token of tokens) {
        if (typeof token === "string") {
            result.push({ text: token, type: parentType });
        } else {
            const type = token.type || parentType;
            if (typeof token.content === "string") {
                result.push({ text: token.content, type });
            } else if (Array.isArray(token.content)) {
                result.push(...flattenPrismTokens(token.content, type));
            } else {
                result.push({ text: String(token.content), type });
            }
        }
    }
    return result;
}

function getPrismGrammar(lang?: string) {
    if (!lang) return Prism.languages.javascript || Prism.languages.clike;
    const l = lang.toLowerCase().trim();
    const aliasMap: Record<string, string> = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        kt: "kotlin",
        py: "python",
        sh: "bash",
        shell: "bash",
        zsh: "bash",
        html: "markup",
        xml: "markup",
        svg: "markup",
        yml: "yaml",
    };
    const target = aliasMap[l] || l;
    return Prism.languages[target] || Prism.languages.clike || Prism.languages.javascript;
}

function tokenizeCodeToLines(code: string, language?: string): { lineNumber: number; tokens: CodeToken[] }[] {
    const cleanCode = (code || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, "    ");
    const grammar = getPrismGrammar(language);

    let rawTokens: (string | Prism.Token)[];
    try {
        rawTokens = grammar ? Prism.tokenize(cleanCode, grammar) : [cleanCode];
    } catch {
        rawTokens = [cleanCode];
    }
    const flatTokens = flattenPrismTokens(rawTokens);

    const lines: { lineNumber: number; tokens: CodeToken[] }[] = [];
    let currentTokens: CodeToken[] = [];

    for (const token of flatTokens) {
        if (token.text.includes("\n")) {
            const parts = token.text.split("\n");
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].length > 0) {
                    currentTokens.push({ text: parts[i], type: token.type });
                }
                if (i < parts.length - 1) {
                    lines.push({ lineNumber: lines.length + 1, tokens: currentTokens });
                    currentTokens = [];
                }
            }
        } else {
            currentTokens.push(token);
        }
    }

    if (currentTokens.length > 0 || lines.length === 0) {
        lines.push({ lineNumber: lines.length + 1, tokens: currentTokens });
    }

    return lines;
}

const styles = StyleSheet.create({
    page: {
        paddingTop: 36,
        paddingBottom: 55,
        paddingHorizontal: 40,
        fontSize: 9.5,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
    },
    headerBar: {
        marginBottom: 18,
        paddingBottom: 10,
        borderBottomWidth: 1.5,
        borderBottomColor: "#0d9488",
        borderBottomStyle: "solid",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    brandText: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#0d9488",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    projectTitle: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        maxWidth: 380,
    },
    dateText: {
        fontSize: 7.5,
        color: "#64748b",
        fontFamily: "Helvetica",
    },
    titleContainer: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    badge: {
        backgroundColor: "#f0fdfa",
        borderWidth: 1,
        borderColor: "#ccfbf1",
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: "flex-start",
        marginBottom: 6,
    },
    badgeText: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: "#0d9488",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    mainTitle: {
        fontSize: 20,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        lineHeight: 1.25,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: "#475569",
        lineHeight: 1.4,
    },
    h1: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginTop: 14,
        marginBottom: 6,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    h2: {
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#0d9488",
        marginTop: 12,
        marginBottom: 5,
    },
    h3: {
        fontSize: 10.5,
        fontFamily: "Helvetica-Bold",
        color: "#334155",
        marginTop: 10,
        marginBottom: 4,
    },
    paragraph: {
        fontSize: 9,
        lineHeight: 1.5,
        color: "#334155",
        marginBottom: 7,
    },
    codeBlock: {
        backgroundColor: "#1e222a",
        borderRadius: 5,
        marginVertical: 7,
        borderWidth: 1,
        borderColor: "#282c34",
        overflow: "hidden",
    },
    codeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#16181d",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#282c34",
    },
    macDots: {
        flexDirection: "row",
        alignItems: "center",
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginRight: 3.5,
    },
    codeLang: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    codeContent: {
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    codeLine: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 1,
    },
    lineNumber: {
        width: 20,
        fontSize: 6.8,
        fontFamily: "Courier",
        color: "#4b5563",
        textAlign: "right",
        paddingRight: 5,
        marginRight: 6,
        borderRightWidth: 1,
        borderRightColor: "#282c34",
    },
    codeText: {
        flex: 1,
        fontSize: 7.2,
        fontFamily: "Courier",
        color: "#abb2bf",
        lineHeight: 1.3,
    },
    callout: {
        backgroundColor: "#f8fafc",
        borderLeftWidth: 3.5,
        borderLeftColor: "#0d9488",
        borderRadius: 4,
        padding: 8,
        marginVertical: 6,
    },
    calloutTitle: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: "#0f172a",
        marginBottom: 2,
        textTransform: "uppercase",
    },
    calloutText: {
        fontSize: 8.5,
        color: "#334155",
        lineHeight: 1.4,
    },
    listItem: {
        flexDirection: "row",
        marginBottom: 4,
        paddingLeft: 4,
    },
    bullet: {
        width: 12,
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: "#0d9488",
    },
    listText: {
        flex: 1,
        fontSize: 9,
        lineHeight: 1.45,
        color: "#334155",
    },
    tableWrapper: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 4,
        marginVertical: 8,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: "#334155",
        textTransform: "uppercase",
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 4.5,
        paddingHorizontal: 6,
    },
    tableCell: {
        fontSize: 8,
        color: "#334155",
    },
    footer: {
        position: "absolute",
        bottom: 20,
        left: 40,
        right: 40,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    footerText: {
        fontSize: 7.5,
        color: "#94a3b8",
    },
});

export interface DocPDFSection {
    type: 'header' | 'paragraph' | 'code' | 'list' | 'callout' | 'table';
    level?: 'h1' | 'h2' | 'h3';
    title?: string;
    text?: string;
    items?: string[];
    language?: string;
    code?: string;
    variant?: 'info' | 'warning' | 'success' | 'note';
    tableHeaders?: string[];
    tableRows?: string[][];
}

export interface DocPagePDFProps {
    projectName: string;
    pageTitle: string;
    pageSubtitle?: string;
    dateStr?: string;
    sections: DocPDFSection[];
}

export function DocPagePDF({
    projectName,
    pageTitle,
    pageSubtitle,
    dateStr,
    sections,
}: DocPagePDFProps) {
    const formattedDate = dateStr || new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return (
        <Document
            title={`${pageTitle} - ${projectName}`}
            author="SmartClass"
            subject="Documentación Técnica"
        >
            <Page size="A4" style={styles.page}>
                {/* Header Superior */}
                <View style={styles.headerBar}>
                    <View>
                        <Text style={styles.brandText}>SmartClass • Documentación</Text>
                        <Text style={styles.projectTitle}>
                            {projectName}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                </View>

                {/* Título Principal de la Página */}
                <View style={styles.titleContainer}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Material Pedagógico</Text>
                    </View>
                    <Text style={styles.mainTitle}>{pageTitle}</Text>
                    {pageSubtitle ? (
                        <Text style={styles.subtitle}>{pageSubtitle}</Text>
                    ) : null}
                </View>

                {/* Secciones y Contenido */}
                {sections.map((section, idx) => {
                    switch (section.type) {
                        case 'header': {
                            const headerStyle =
                                section.level === 'h1'
                                    ? styles.h1
                                    : section.level === 'h3'
                                    ? styles.h3
                                    : styles.h2;
                            return (
                                <Text key={idx} style={headerStyle}>
                                    {section.title || section.text || ""}
                                </Text>
                            );
                        }
                        case 'paragraph': {
                            return (
                                <Text key={idx} style={styles.paragraph}>
                                    {section.text || ""}
                                </Text>
                            );
                        }
                        case 'code': {
                            const rawCode = section.code || section.text || "";
                            const lines = tokenizeCodeToLines(rawCode, section.language);

                            return (
                                <View key={idx} style={styles.codeBlock}>
                                    {/* Code Block Header with Mac-style Dots & Language Badge */}
                                    <View style={styles.codeHeader}>
                                        <View style={styles.macDots}>
                                            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                                            <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                                            <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                                        </View>
                                        <Text style={styles.codeLang}>
                                            {section.language ? section.language.toUpperCase() : "CÓDIGO"}
                                        </Text>
                                    </View>

                                    {/* Code Lines with Line Numbers and Syntax Highlighting */}
                                    <View style={styles.codeContent}>
                                        {lines.map((line) => (
                                            <View key={line.lineNumber} style={styles.codeLine} wrap={false}>
                                                <Text style={styles.lineNumber}>{line.lineNumber}</Text>
                                                <Text style={styles.codeText}>
                                                    {line.tokens.length === 0 ? (
                                                        <Text> </Text>
                                                    ) : (
                                                        line.tokens.map((token, tIdx) => (
                                                            <Text
                                                                key={tIdx}
                                                                style={{
                                                                    color: getTokenColor(token.type),
                                                                    fontFamily: "Courier",
                                                                }}
                                                            >
                                                                {token.text.replace(/ /g, "\u00A0")}
                                                            </Text>
                                                        ))
                                                    )}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        }
                        case 'list': {
                            return (
                                <View key={idx} style={{ marginVertical: 4 }}>
                                    {(section.items || []).map((item, itemIdx) => (
                                        <View key={itemIdx} style={styles.listItem}>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.listText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            );
                        }
                        case 'callout': {
                            return (
                                <View key={idx} style={styles.callout}>
                                    {section.title ? (
                                        <Text style={styles.calloutTitle}>{section.title}</Text>
                                    ) : null}
                                    <Text style={styles.calloutText}>{section.text || ""}</Text>
                                </View>
                            );
                        }
                        case 'table': {
                            const headers = section.tableHeaders || [];
                            const rows = section.tableRows || [];
                            if (headers.length === 0 && rows.length === 0) return null;
                            const colWidth = `${100 / Math.max(headers.length, 1)}%`;

                            return (
                                <View key={idx} style={styles.tableWrapper}>
                                    {headers.length > 0 && (
                                        <View style={styles.tableHeaderRow}>
                                            {headers.map((h, hIdx) => (
                                                <Text key={hIdx} style={[styles.tableHeaderCell, { width: colWidth }]}>
                                                    {h}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                    {rows.map((row, rIdx) => (
                                        <View
                                            key={rIdx}
                                            style={[
                                                styles.tableRow,
                                                rIdx % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}
                                            ]}
                                        >
                                            {row.map((cell, cIdx) => (
                                                <Text key={cIdx} style={[styles.tableCell, { width: colWidth }]}>
                                                    {cell}
                                                </Text>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            );
                        }
                        default:
                            return null;
                    }
                })}

                {/* Pie de Página con Numeración */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SmartClass • Plataforma de Aprendizaje Interactivo
                    </Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
}
