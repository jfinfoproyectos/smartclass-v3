import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { 
  parseMarkdownToEditorialSections, 
  getTokenColor, 
  cleanPdfText,
  EditorialSection, 
  InlineToken 
} from "../pdf/markdownToPdfAst";

export type { EditorialSection };
export type DocPDFSection = EditorialSection;

export interface DocPagePDFProps {
  projectName: string;
  pageTitle: string;
  pageSubtitle?: string;
  category?: string;
  dateStr?: string;
  markdownContent?: string;
  sections?: EditorialSection[];
}

const COLORS = {
  primary: "#0f172a",       // Deep Slate 900
  secondary: "#1e293b",     // Slate 800
  text: "#334155",          // Slate 700 (High-contrast body text)
  textMuted: "#64748b",     // Slate 500
  accent: "#0d9488",        // Teal 600 (SmartClass signature)
  accentLight: "#f0fdfa",   // Teal 50
  accentBorder: "#ccfbf1",  // Teal 100
  surfaceAlt: "#f8fafc",    // Slate 50
  border: "#e2e8f0",        // Slate 200
  borderDark: "#cbd5e1",    // Slate 300
  codeBg: "#0f172a",        // Terminal dark background
  codeHeader: "#1e293b",    // Terminal header bar
  codeBorder: "#1e293b",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 45,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  // Repeating Header on every page
  fixedHeader: {
    position: "absolute",
    top: 18,
    left: 40,
    right: 40,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fixedHeaderLeft: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fixedHeaderRight: {
    fontSize: 7.5,
    color: COLORS.textMuted,
    fontFamily: "Helvetica",
    maxWidth: 280,
  },
  // Hero Document Title (Page 1)
  heroBanner: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  categoryBadgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    lineHeight: 1.25,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 1.45,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  metaValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  // Headings
  h1: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h2Container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.border,
  },
  h2Bar: {
    width: 3.5,
    height: 14,
    backgroundColor: COLORS.accent,
    borderRadius: 1.5,
    marginRight: 6,
  },
  h2Text: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  h3: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    marginTop: 12,
    marginBottom: 5,
  },
  h4: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  // Paragraph
  paragraph: {
    fontSize: 9,
    lineHeight: 1.55,
    color: COLORS.text,
    marginBottom: 7,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  italic: {
    fontFamily: "Helvetica-Oblique",
    color: COLORS.text,
  },
  inlineCode: {
    fontFamily: "Courier",
    fontSize: 8,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.primary,
  },
  // Lists
  listContainer: {
    marginBottom: 6,
    paddingLeft: 2,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  bullet: {
    width: 14,
    fontSize: 10,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
  },
  orderedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    marginTop: 1,
  },
  orderedBadgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  listContent: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.45,
    color: COLORS.text,
  },
  // Callouts
  calloutCard: {
    borderRadius: 5,
    borderLeftWidth: 3.5,
    padding: 9,
    marginVertical: 7,
  },
  calloutHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  calloutBody: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: COLORS.text,
  },
  // Code Blocks
  codeCard: {
    backgroundColor: COLORS.codeBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.codeBorder,
    marginVertical: 8,
    overflow: "hidden",
  },
  codeHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.codeHeader,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.codeBorder,
  },
  macDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  codeLangLabel: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  codeBody: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  codeLineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  codeLineNumber: {
    width: 22,
    fontSize: 6.8,
    fontFamily: "Courier",
    color: "#4b5563",
    textAlign: "right",
    paddingRight: 6,
    marginRight: 6,
    borderRightWidth: 1,
    borderRightColor: "#282c34",
  },
  codeLineText: {
    flex: 1,
    fontSize: 7.2,
    fontFamily: "Courier",
    color: "#abb2bf",
    lineHeight: 1.3,
  },
  // Table
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 4,
    marginVertical: 8,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  tableDataCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  // Repeating Footer
  fixedFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7.5,
    color: COLORS.textMuted,
  },
});

export function DocPagePDF({
  projectName,
  pageTitle,
  pageSubtitle,
  category,
  dateStr,
  markdownContent,
  sections,
}: DocPagePDFProps) {
  const cleanTitle = cleanPdfText(pageTitle) || "Documento Técnico";
  const cleanProject = cleanPdfText(projectName) || "SmartClass";
  const cleanCategory = cleanPdfText(category || "Documentación");
  const formattedDate = dateStr || new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const parsedSections = markdownContent 
    ? parseMarkdownToEditorialSections(markdownContent)
    : (sections || []);

  return (
    <Document
      title={`${cleanTitle} - ${cleanProject}`}
      author="SmartClass Enterprise"
      subject="Documentación Técnica y Material Pedagógico"
    >
      <Page size="A4" style={styles.page}>
        {/* Repeating Header (Every Page) */}
        <View style={styles.fixedHeader} fixed>
          <Text style={styles.fixedHeaderLeft}>SmartClass • Documentación Corporativa</Text>
          <Text style={styles.fixedHeaderRight}>
            {cleanProject} • {cleanTitle}
          </Text>
        </View>

        {/* Hero Document Title Banner (Page 1) */}
        <View style={styles.heroBanner}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DOCUMENTO TÉCNICO OFICIAL</Text>
            </View>
            {cleanCategory ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{cleanCategory}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.mainTitle}>{cleanTitle}</Text>

          {pageSubtitle ? (
            <Text style={styles.subtitle}>{cleanPdfText(pageSubtitle)}</Text>
          ) : null}

          {/* Corporate Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Proyecto</Text>
              <Text style={styles.metaValue}>{cleanProject}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Emisión</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Plataforma</Text>
              <Text style={styles.metaValue}>SmartClass Enterprise</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Estado</Text>
              <Text style={styles.metaValue}>Aprobado / Oficial</Text>
            </View>
          </View>
        </View>

        {/* Renderizado completo de secciones Markdown */}
        {parsedSections.map((sec, idx) => {
          switch (sec.type) {
            case 'h1': {
              return (
                <Text key={idx} style={styles.h1}>
                  {cleanPdfText(sec.title || "")}
                </Text>
              );
            }

            case 'h2': {
              return (
                <View key={idx} style={styles.h2Container}>
                  <View style={styles.h2Bar} />
                  <Text style={styles.h2Text}>
                    {cleanPdfText(sec.title || "")}
                  </Text>
                </View>
              );
            }

            case 'h3': {
              return (
                <Text key={idx} style={styles.h3}>
                  {cleanPdfText(sec.title || "")}
                </Text>
              );
            }

            case 'h4': {
              return (
                <Text key={idx} style={styles.h4}>
                  {cleanPdfText(sec.title || "")}
                </Text>
              );
            }

            case 'divider': {
              return <View key={idx} style={styles.divider} />;
            }

            case 'paragraph': {
              return (
                <Text key={idx} style={styles.paragraph}>
                  {(sec.inlineTokens || []).map((t, tIdx) => (
                    <Text
                      key={tIdx}
                      style={
                        t.bold
                          ? styles.bold
                          : t.italic
                          ? styles.italic
                          : t.code
                          ? styles.inlineCode
                          : undefined
                      }
                    >
                      {t.text}
                    </Text>
                  ))}
                </Text>
              );
            }

            case 'code': {
              const lines = sec.codeLines || [];
              return (
                <View key={idx} style={styles.codeCard} wrap={true}>
                  <View style={styles.codeHeaderBar}>
                    <View style={styles.macDots}>
                      <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                      <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                      <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                    </View>
                    <Text style={styles.codeLangLabel}>{sec.language || "CÓDIGO"}</Text>
                  </View>

                  <View style={styles.codeBody}>
                    {lines.map((line) => (
                      <View key={line.lineNumber} style={styles.codeLineRow} wrap={false}>
                        <Text style={styles.codeLineNumber}>{line.lineNumber}</Text>
                        <Text style={styles.codeLineText}>
                          {line.tokens.length === 0 ? (
                            <Text> </Text>
                          ) : (
                            line.tokens.map((token, tokIdx) => (
                              <Text
                                key={tokIdx}
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

            case 'callout': {
              const cType = sec.calloutType || 'NOTE';
              const calloutColor = 
                cType === 'TIP' ? '#059669' :
                cType === 'IMPORTANT' ? '#2563eb' :
                cType === 'WARNING' ? '#d97706' :
                cType === 'CAUTION' ? '#dc2626' : '#0d9488';

              const calloutBg = 
                cType === 'TIP' ? '#ecfdf5' :
                cType === 'IMPORTANT' ? '#eff6ff' :
                cType === 'WARNING' ? '#fffbeb' :
                cType === 'CAUTION' ? '#fef2f2' : '#f0fdfa';

              return (
                <View 
                  key={idx} 
                  style={[
                    styles.calloutCard, 
                    { backgroundColor: calloutBg, borderLeftColor: calloutColor }
                  ]}
                  wrap={false}
                >
                  {sec.calloutTitle && (
                    <Text style={[styles.calloutHeader, { color: calloutColor }]}>
                      {sec.calloutTitle}
                    </Text>
                  )}
                  <Text style={styles.calloutBody}>
                    {(sec.calloutTokens || []).map((t, tIdx) => (
                      <Text
                        key={tIdx}
                        style={
                          t.bold
                            ? styles.bold
                            : t.italic
                            ? styles.italic
                            : t.code
                            ? styles.inlineCode
                            : undefined
                        }
                      >
                        {t.text}
                      </Text>
                    ))}
                  </Text>
                </View>
              );
            }

            case 'list': {
              return (
                <View key={idx} style={styles.listContainer}>
                  {(sec.items || []).map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.listItemRow} wrap={false}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listContent}>
                        {item.inlineTokens.map((t, tIdx) => (
                          <Text
                            key={tIdx}
                            style={
                              t.bold
                                ? styles.bold
                                : t.italic
                                ? styles.italic
                                : t.code
                                ? styles.inlineCode
                                : undefined
                            }
                          >
                            {t.text}
                          </Text>
                        ))}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }

            case 'ordered-list': {
              return (
                <View key={idx} style={styles.listContainer}>
                  {(sec.items || []).map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.listItemRow} wrap={false}>
                      <View style={styles.orderedBadge}>
                        <Text style={styles.orderedBadgeText}>{item.number}</Text>
                      </View>
                      <Text style={styles.listContent}>
                        {item.inlineTokens.map((t, tIdx) => (
                          <Text
                            key={tIdx}
                            style={
                              t.bold
                                ? styles.bold
                                : t.italic
                                ? styles.italic
                                : t.code
                                ? styles.inlineCode
                                : undefined
                            }
                          >
                            {t.text}
                          </Text>
                        ))}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }

            case 'table': {
              const headers = sec.tableHeaders || [];
              const rows = sec.tableRows || [];
              if (headers.length === 0 && rows.length === 0) return null;
              const colWidth = `${100 / Math.max(headers.length, 1)}%`;

              return (
                <View key={idx} style={styles.tableContainer} wrap={true}>
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
                        styles.tableDataRow,
                        rIdx % 2 === 1 ? { backgroundColor: COLORS.surfaceAlt } : {}
                      ]}
                      wrap={false}
                    >
                      {row.map((cell, cIdx) => (
                        <Text key={cIdx} style={[styles.tableDataCell, { width: colWidth }]}>
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

        {/* Repeating Footer (Every Page) */}
        <View style={styles.fixedFooter} fixed>
          <Text style={styles.footerText}>
            SmartClass Enterprise • Plataforma de Documentación Técnica
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
