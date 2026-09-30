import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { 
  cleanPdfText, 
  getTokenColor, 
  getCodeThemePalette 
} from "@/features/documentation/components/pdf/markdownToPdfAst";
import { 
  DocumentMetadata, 
  DocumentStyleConfig 
} from "../types";
import { 
  CORPORATE_COLOR_SCHEMES, 
  STATUS_CONFIG 
} from "../constants/themes";
import { 
  parseCorporateMarkdown, 
  extractFirstH1,
  CorporateSection 
} from "../utils/markdownParser";

export interface CorporatePDFDocumentProps {
  markdown: string;
  metadata?: Partial<DocumentMetadata>;
  styleConfig?: Partial<DocumentStyleConfig>;
}

export function CorporatePDFDocument({
  markdown,
  metadata = {},
  styleConfig = {},
}: CorporatePDFDocumentProps) {
  const selectedScheme = styleConfig.colorScheme || "teal";
  const palette = CORPORATE_COLOR_SCHEMES[selectedScheme] || CORPORATE_COLOR_SCHEMES.teal;
  const statusInfo = STATUS_CONFIG[metadata.status || "OFFICIAL"] || STATUS_CONFIG.OFFICIAL;
  const codeThemePalette = getCodeThemePalette(styleConfig.codeTheme || "one-dark-pro");

  // Auto-extraer título del primer # H1 del Markdown si no se especificó uno
  const detectedH1 = extractFirstH1(markdown);
  const cleanTitle = cleanPdfText(metadata.title || detectedH1 || "Documento");
  const cleanSubtitle = cleanPdfText(metadata.subtitle || "");
  const cleanInstitution = cleanPdfText(metadata.institution || "SmartClass");
  const cleanAuthor = cleanPdfText(metadata.author || "");
  const cleanCategory = cleanPdfText(metadata.category || "Documento Oficial");
  const cleanVersion = cleanPdfText(metadata.version || "1.0");
  const cleanFolio = cleanPdfText(metadata.folioCode || "");
  const cleanDate = cleanPdfText(metadata.dateStr || new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }));

  const fontFam = styleConfig.fontFamily || "Helvetica";
  const fontFamBold = fontFam === "Helvetica" ? "Helvetica-Bold" : fontFam === "Times-Roman" ? "Times-Bold" : "Courier-Bold";
  const fontFamOblique = fontFam === "Helvetica" ? "Helvetica-Oblique" : fontFam === "Times-Roman" ? "Times-Italic" : "Courier-Oblique";

  const styles = StyleSheet.create({
    page: {
      paddingTop: styleConfig.showRunningHeader ? 42 : 36,
      paddingBottom: styleConfig.showRunningFooter ? 42 : 36,
      paddingHorizontal: 40,
      backgroundColor: "#ffffff",
      fontFamily: fontFam,
      color: palette.text,
      position: "relative",
    },
    // Watermark
    watermark: {
      position: "absolute",
      top: "40%",
      left: 30,
      right: 30,
      textAlign: "center",
      fontSize: 54,
      fontFamily: fontFamBold,
      color: "#000000",
      opacity: 0.04,
      transform: "rotate(-35deg)",
      letterSpacing: 6,
      textTransform: "uppercase",
    },
    // Header fijo en páginas de contenido
    fixedHeader: {
      position: "absolute",
      top: 16,
      left: 40,
      right: 40,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    fixedHeaderLeft: {
      fontSize: 7.5,
      fontFamily: fontFamBold,
      color: palette.accent,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    fixedHeaderRight: {
      fontSize: 7.5,
      color: palette.textMuted,
      fontFamily: fontFam,
      maxWidth: 320,
    },
    // Footer fijo en páginas
    fixedFooter: {
      position: "absolute",
      bottom: 16,
      left: 40,
      right: 40,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: {
      fontSize: 7.5,
      color: palette.textMuted,
    },
    // Headings
    h1: {
      fontSize: 18,
      fontFamily: fontFamBold,
      color: palette.primary,
      marginTop: 14,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: palette.accent,
    },
    h2Container: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 13,
      marginBottom: 7,
      paddingBottom: 3,
      borderBottomWidth: 0.8,
      borderBottomColor: palette.border,
    },
    h2Bar: {
      width: 3.5,
      height: 13,
      backgroundColor: palette.accent,
      borderRadius: 1.5,
      marginRight: 6,
    },
    h2Text: {
      fontSize: 13,
      fontFamily: fontFamBold,
      color: palette.primary,
    },
    h3: {
      fontSize: 11,
      fontFamily: fontFamBold,
      color: palette.secondary,
      marginTop: 10,
      marginBottom: 4,
    },
    h4: {
      fontSize: 9.8,
      fontFamily: fontFamBold,
      color: palette.text,
      marginTop: 8,
      marginBottom: 3,
    },
    h5: {
      fontSize: 9,
      fontFamily: fontFamBold,
      color: palette.textMuted,
      marginTop: 7,
      marginBottom: 3,
    },
    h6: {
      fontSize: 8.5,
      fontFamily: fontFamBold,
      color: palette.textMuted,
      marginTop: 6,
      marginBottom: 2,
    },
    // Paragraph
    paragraph: {
      fontSize: 9,
      lineHeight: 1.55,
      color: palette.text,
      marginBottom: 6,
    },
    bold: {
      fontFamily: fontFamBold,
      color: palette.primary,
    },
    italic: {
      fontFamily: fontFamOblique,
      color: palette.text,
    },
    inlineCode: {
      fontFamily: "Courier",
      fontSize: 8,
      backgroundColor: palette.surfaceAlt,
      color: palette.primary,
    },
    // Math Formula Card
    mathCard: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.borderDark,
      borderRadius: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      marginVertical: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    mathText: {
      fontSize: 8.8,
      fontFamily: fontFamBold,
      color: palette.primary,
      textAlign: "center",
      lineHeight: 1.4,
    },
    // Blockquote
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: palette.borderDark,
      backgroundColor: palette.surfaceAlt,
      paddingVertical: 5,
      paddingHorizontal: 8,
      marginVertical: 6,
      borderRadius: 3,
    },
    blockquoteText: {
      fontSize: 8.5,
      fontFamily: fontFamOblique,
      color: palette.textMuted,
      lineHeight: 1.45,
    },
    // KPI Grid
    kpiContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginVertical: 8,
    },
    kpiCard: {
      flex: 1,
      minWidth: 100,
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderTopWidth: 2.5,
      borderTopColor: palette.accent,
      borderRadius: 5,
      padding: 8,
    },
    kpiValue: {
      fontSize: 14,
      fontFamily: fontFamBold,
      color: palette.primary,
      marginBottom: 2,
    },
    kpiLabel: {
      fontSize: 7.5,
      fontFamily: fontFamBold,
      color: palette.accent,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    kpiSubtext: {
      fontSize: 6.8,
      color: palette.textMuted,
      marginTop: 2,
    },
    // Lists
    listContainer: {
      marginBottom: 5,
      paddingLeft: 2,
    },
    listItemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 3,
    },
    bullet: {
      width: 12,
      fontSize: 9,
      color: palette.accent,
      fontFamily: fontFamBold,
    },
    orderedBadge: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.accent,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 6,
      marginTop: 1,
    },
    orderedBadgeText: {
      fontSize: 6.8,
      fontFamily: fontFamBold,
      color: "#ffffff",
      textAlign: "center",
    },
    listContent: {
      flex: 1,
      fontSize: 8.8,
      lineHeight: 1.45,
      color: palette.text,
    },
    // Task List Checkboxes
    checkboxSquare: {
      width: 9,
      height: 9,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: palette.borderDark,
      marginRight: 6,
      marginTop: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    checkboxCheckmark: {
      fontSize: 6,
      fontFamily: fontFamBold,
      color: "#ffffff",
    },
    // Callouts
    calloutCard: {
      borderRadius: 5,
      borderLeftWidth: 3.5,
      padding: 8,
      marginVertical: 6,
    },
    calloutHeader: {
      fontSize: 7.8,
      fontFamily: fontFamBold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 3,
    },
    calloutBody: {
      fontSize: 8.5,
      lineHeight: 1.45,
      color: palette.text,
    },
    // Code Card
    codeCard: {
      backgroundColor: codeThemePalette.bg,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: codeThemePalette.border,
      marginVertical: 7,
      overflow: "hidden",
    },
    codeHeaderBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: codeThemePalette.headerBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: codeThemePalette.border,
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
      fontSize: 6.5,
      fontFamily: fontFamBold,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    codeBody: {
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    codeLineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 1,
    },
    codeLineNumber: {
      width: 20,
      fontSize: 6.5,
      fontFamily: "Courier",
      color: codeThemePalette.lineNumbers,
      textAlign: "right",
      paddingRight: 5,
      marginRight: 5,
      borderRightWidth: 1,
      borderRightColor: codeThemePalette.border,
    },
    codeLineText: {
      flex: 1,
      fontSize: 7,
      fontFamily: "Courier",
      color: codeThemePalette.text,
      lineHeight: 1.28,
    },
    // Table
    tableContainer: {
      borderWidth: 1,
      borderColor: palette.borderDark,
      borderRadius: 4,
      marginVertical: 7,
      overflow: "hidden",
    },
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: palette.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderDark,
      paddingVertical: 4.5,
      paddingHorizontal: 6,
    },
    tableHeaderCell: {
      fontSize: 7.2,
      fontFamily: fontFamBold,
      color: palette.primary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    tableDataRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: palette.border,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    tableDataCell: {
      fontSize: 7.8,
      color: palette.text,
      lineHeight: 1.35,
    },
    // Signatures
    signaturesContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 18,
      marginBottom: 8,
    },
    signatureBox: {
      flex: 1,
      borderTopWidth: 1,
      borderTopColor: palette.primary,
      paddingTop: 5,
      alignItems: "center",
    },
    signatureLabel: {
      fontSize: 6.5,
      fontFamBold,
      color: palette.accent,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    signatureName: {
      fontSize: 8,
      fontFamily: fontFamBold,
      color: palette.primary,
      textAlign: "center",
    },
    signatureRole: {
      fontSize: 7,
      color: palette.textMuted,
      textAlign: "center",
    },
    signatureEntity: {
      fontSize: 6.5,
      color: palette.textMuted,
      fontFamily: fontFamOblique,
      textAlign: "center",
    },
    divider: {
      height: 1,
      backgroundColor: palette.border,
      marginVertical: 8,
    },
  });

  // Dividir secciones en páginas si hay saltos explícitos
  const allSections = parseCorporateMarkdown(markdown);
  const pagesSections: CorporateSection[][] = [[]];

  for (const sec of allSections) {
    if (sec.type === "pagebreak") {
      pagesSections.push([]);
    } else {
      pagesSections[pagesSections.length - 1].push(sec);
    }
  }

  const renderTokens = (tokens?: any[]) => {
    if (!tokens || tokens.length === 0) return null;
    return tokens.map((t, tIdx) => (
      <Text
        key={tIdx}
        style={
          t.bold && t.italic
            ? [styles.bold, styles.italic]
            : t.bold
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
    ));
  };

  const renderSection = (sec: CorporateSection, idx: number) => {
    switch (sec.type) {
      case "h1":
        return (
          <Text key={idx} style={styles.h1}>
            {sec.title}
          </Text>
        );

      case "h2":
        return (
          <View key={idx} style={styles.h2Container}>
            <View style={styles.h2Bar} />
            <Text style={styles.h2Text}>{sec.title}</Text>
          </View>
        );

      case "h3":
        return (
          <Text key={idx} style={styles.h3}>
            {sec.title}
          </Text>
        );

      case "h4":
        return (
          <Text key={idx} style={styles.h4}>
            {sec.title}
          </Text>
        );

      case "h5":
        return (
          <Text key={idx} style={styles.h5}>
            {sec.title}
          </Text>
        );

      case "h6":
        return (
          <Text key={idx} style={styles.h6}>
            {sec.title}
          </Text>
        );

      case "divider":
        return <View key={idx} style={styles.divider} />;

      case "math":
        return (
          <View key={idx} style={styles.mathCard} wrap={false}>
            <Text style={styles.mathText}>{sec.mathFormula}</Text>
          </View>
        );

      case "blockquote":
        return (
          <View key={idx} style={styles.blockquote} wrap={false}>
            <Text style={styles.blockquoteText}>
              {renderTokens(sec.inlineTokens)}
            </Text>
          </View>
        );

      case "paragraph":
        return (
          <Text key={idx} style={styles.paragraph}>
            {renderTokens(sec.inlineTokens)}
          </Text>
        );

      case "kpi-grid":
        return (
          <View key={idx} style={styles.kpiContainer} wrap={false}>
            {(sec.kpiMetrics || []).map((kpi, kIdx) => (
              <View key={kIdx} style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                {kpi.subtext && <Text style={styles.kpiSubtext}>{kpi.subtext}</Text>}
              </View>
            ))}
          </View>
        );

      case "callout": {
        const cType = sec.calloutType || "NOTE";
        const calloutColor =
          cType === "TIP" ? "#059669" :
          cType === "IMPORTANT" ? "#2563eb" :
          cType === "WARNING" ? "#d97706" :
          cType === "CAUTION" ? "#dc2626" : palette.accent;

        const calloutBg =
          cType === "TIP" ? "#ecfdf5" :
          cType === "IMPORTANT" ? "#eff6ff" :
          cType === "WARNING" ? "#fffbeb" :
          cType === "CAUTION" ? "#fef2f2" : palette.accentLight;

        return (
          <View
            key={idx}
            style={[
              styles.calloutCard,
              { backgroundColor: calloutBg, borderLeftColor: calloutColor },
            ]}
            wrap={false}
          >
            {sec.calloutTitle && (
              <Text style={[styles.calloutHeader, { color: calloutColor }]}>
                {sec.calloutTitle}
              </Text>
            )}
            <Text style={styles.calloutBody}>
              {renderTokens(sec.calloutTokens)}
            </Text>
          </View>
        );
      }

      case "code": {
        const lines = sec.codeLines || [];
        return (
          <View key={idx} style={styles.codeCard} wrap={true}>
            <View style={styles.codeHeaderBar}>
              <View style={styles.macDots}>
                <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
              </View>
              <Text style={styles.codeLangLabel}>{sec.language || "CODE"}</Text>
            </View>

            <View style={styles.codeBody}>
              {lines.map((line) => (
                <View key={line.lineNumber} style={styles.codeLineRow} wrap={false}>
                  {styleConfig.showLineNumbers && (
                    <Text style={styles.codeLineNumber}>{line.lineNumber}</Text>
                  )}
                  <Text style={styles.codeLineText}>
                    {line.tokens.length === 0 ? (
                      <Text> </Text>
                    ) : (
                      line.tokens.map((token, tokIdx) => (
                        <Text
                          key={tokIdx}
                          style={{
                            color: getTokenColor(token.type, codeThemePalette),
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

      case "table": {
        const headers = sec.tableHeaders || [];
        const rows = sec.tableRows || [];
        if (headers.length === 0 && rows.length === 0) return null;
        const colWidth = `${100 / Math.max(headers.length, 1)}%`;

        return (
          <View key={idx} style={styles.tableContainer} wrap={true}>
            {headers.length > 0 && (
              <View style={styles.tableHeaderRow}>
                {headers.map((hTokens, hIdx) => (
                  <Text key={hIdx} style={[styles.tableHeaderCell, { width: colWidth }]}>
                    {renderTokens(hTokens)}
                  </Text>
                ))}
              </View>
            )}
            {rows.map((rowCells, rIdx) => (
              <View
                key={rIdx}
                style={[
                  styles.tableDataRow,
                  rIdx % 2 === 1 ? { backgroundColor: palette.surfaceAlt } : {},
                ]}
                wrap={false}
              >
                {rowCells.map((cTokens, cIdx) => (
                  <Text key={cIdx} style={[styles.tableDataCell, { width: colWidth }]}>
                    {renderTokens(cTokens)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      }

      case "task-list":
        return (
          <View key={idx} style={styles.listContainer}>
            {(sec.taskItems || []).map((task, itemIdx) => (
              <View key={itemIdx} style={styles.listItemRow} wrap={false}>
                <View style={[styles.checkboxSquare, task.checked ? styles.checkboxChecked : {}]}>
                  {task.checked && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <Text style={styles.listContent}>
                  {renderTokens(task.inlineTokens)}
                </Text>
              </View>
            ))}
          </View>
        );

      case "list":
        return (
          <View key={idx} style={styles.listContainer}>
            {(sec.items || []).map((item, itemIdx) => {
              const paddingLeft = (item.level || 0) * 12;
              return (
                <View key={itemIdx} style={[styles.listItemRow, { paddingLeft }]} wrap={false}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listContent}>
                    {renderTokens(item.inlineTokens)}
                  </Text>
                </View>
              );
            })}
          </View>
        );

      case "ordered-list":
        return (
          <View key={idx} style={styles.listContainer}>
            {(sec.items || []).map((item, itemIdx) => {
              const paddingLeft = (item.level || 0) * 12;
              return (
                <View key={itemIdx} style={[styles.listItemRow, { paddingLeft }]} wrap={false}>
                  <View style={styles.orderedBadge}>
                    <Text style={styles.orderedBadgeText}>{item.number}</Text>
                  </View>
                  <Text style={styles.listContent}>
                    {renderTokens(item.inlineTokens)}
                  </Text>
                </View>
              );
            })}
          </View>
        );

      case "signatures":
        return (
          <View key={idx} style={styles.signaturesContainer} wrap={false}>
            {(sec.signaturesList || []).map((sig, sIdx) => (
              <View key={sIdx} style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>{sig.roleLabel}</Text>
                <Text style={styles.signatureName}>{sig.name}</Text>
                <Text style={styles.signatureRole}>{sig.position}</Text>
                {sig.entity && <Text style={styles.signatureEntity}>{sig.entity}</Text>}
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const pageSize = styleConfig.pageSize || "A4";
  const orientation = styleConfig.orientation || "portrait";
  const showRunningHeader = styleConfig.showRunningHeader ?? true;
  const showRunningFooter = styleConfig.showRunningFooter ?? true;
  const showPageNumbers = styleConfig.showPageNumbers ?? true;

  return (
    <Document
      title={cleanTitle}
      author={cleanAuthor || "SmartClass"}
      subject={cleanCategory}
      creator="SmartClass Markdown to Corporate PDF Studio"
    >
      {/* Páginas de Contenido Directo 1:1 con el Markdown */}
      {pagesSections.map((pageSections, pageIdx) => (
        <Page
          key={pageIdx}
          size={pageSize}
          orientation={orientation}
          style={styles.page}
        >
          {styleConfig.showWatermark && (
            <Text style={styles.watermark}>
              {cleanPdfText(styleConfig.watermarkText || "CONFIDENCIAL")}
            </Text>
          )}

          {/* Running Header */}
          {showRunningHeader && (
            <View style={styles.fixedHeader} fixed>
              <Text style={styles.fixedHeaderLeft}>
                {cleanTitle}
              </Text>
              <Text style={styles.fixedHeaderRight}>
                {cleanDate}
              </Text>
            </View>
          )}

          {/* Renderizado EXACTO 1:1 de las secciones Markdown */}
          {pageSections.map((sec, sIdx) => renderSection(sec, sIdx))}

          {/* Running Footer */}
          {showRunningFooter && (
            <View style={styles.fixedFooter} fixed>
              <Text style={styles.footerText}>
                {styleConfig.customFooterText || `Documento Oficial • ${cleanDate}`}
              </Text>
              {showPageNumbers && (
                <Text
                  style={styles.footerText}
                  render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                />
              )}
            </View>
          )}
        </Page>
      ))}
    </Document>
  );
}
