import React from "react";
import { Document, Page, Text, View, StyleSheet, Link, Image } from "@react-pdf/renderer";
import { 
  parseMarkdownToEditorialSections, 
  getTokenColor, 
  cleanPdfText,
  EditorialSection, 
  InlineToken,
  getCodeThemePalette,
  CodeThemeConfig,
  THEME_ACCENTS,
  parseColorToHex
} from "./markdownToPdfAst";

export interface EditorialThemeConfig {
  adoptTheme?: boolean;
  adoptCodeTheme?: boolean;
  themeId?: string;
  themeName?: string;
  primaryColor?: string;
  codeThemeId?: string;
  codeThemeName?: string;
}

export interface EditorialBookData {
  projectName: string;
  projectSlug?: string;
  subtitle?: string;
  authorName: string;
  academicYear?: string;
  institutionName?: string;
  edition?: string;
  logoUrl?: string;
  createdAt?: string;
  themeConfig?: EditorialThemeConfig;
  intro?: {
    title: string;
    content: string;
  };
  chapters: Array<{
    number: number;
    title: string;
    description?: string;
    introContent?: string;
    lessons: Array<{
      number: string;
      title: string;
      content: string;
    }>;
  }>;
}

function blendWithWhite(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 13;
  const g = parseInt(clean.substring(2, 4), 16) || 148;
  const b = parseInt(clean.substring(4, 6), 16) || 136;
  const nr = Math.round(r + (255 - r) * (1 - percent));
  const ng = Math.round(g + (255 - g) * (1 - percent));
  const nb = Math.round(b + (255 - b) * (1 - percent));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

export function resolveEditorialTheme(themeConfig?: EditorialThemeConfig) {
  const adoptTheme = themeConfig?.adoptTheme ?? false;
  const adoptCodeTheme = themeConfig?.adoptCodeTheme ?? false;

  let accent = "#0d9488"; // Teal clásico SmartClass
  if (adoptTheme) {
    if (themeConfig?.primaryColor) {
      accent = parseColorToHex(themeConfig.primaryColor, "#0d9488");
    } else if (themeConfig?.themeId && THEME_ACCENTS[themeConfig.themeId]) {
      accent = THEME_ACCENTS[themeConfig.themeId];
    }
  }

  const codeThemeId = adoptCodeTheme ? (themeConfig?.codeThemeId || "one-dark-pro") : "one-dark-pro";
  const codePalette = getCodeThemePalette(codeThemeId);

  const colors = {
    primary: "#0f172a",      // Slate 900 profundo
    primaryDark: "#020617",  // Slate 950
    secondary: "#1e293b",    // Slate 800
    accent,
    accentLight: blendWithWhite(accent, 0.08),
    accentBorder: blendWithWhite(accent, 0.28),
    gold: "#d97706",         // Amber 600
    goldLight: "#fef3c7",
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",   // Slate 50
    border: "#e2e8f0",       // Slate 200
    borderDark: "#cbd5e1",   // Slate 300
    text: "#334155",         // Slate 700
    textDark: "#0f172a",     // Slate 900
    textMuted: "#64748b",    // Slate 500
    codeBg: codePalette.bg,
    codeBorder: codePalette.border,
    codeBar: codePalette.headerBg,
    codeLineNumber: codePalette.lineNumbers,
    codeText: codePalette.text,
  };

  return { colors, codePalette };
}

export type EditorialColors = ReturnType<typeof resolveEditorialTheme>["colors"];

function buildEditorialStyles(COLORS: EditorialColors) {
  return StyleSheet.create({
    // Portada
    coverPage: {
      padding: 0,
      backgroundColor: "#ffffff",
      fontFamily: "Helvetica",
    },
  coverContainer: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverHeaderBanner: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 48,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accent,
  },
  coverHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  coverEditorialTag: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  coverLogoContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxHeight: 46,
    maxWidth: 130,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  coverLogoImage: {
    maxHeight: 36,
    maxWidth: 114,
    objectFit: "contain",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    lineHeight: 1.2,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.4,
    maxWidth: 440,
  },
  coverBody: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 36,
    justifyContent: "center",
  },
  coverFeatureBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
  },
  coverFeatureTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  coverFeatureDesc: {
    fontSize: 9.5,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  coverFooterBanner: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 48,
    paddingVertical: 28,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverAuthorLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  coverAuthorName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  coverMetaText: {
    fontSize: 8.5,
    color: COLORS.textMuted,
    textAlign: "right",
    lineHeight: 1.4,
  },

  // Páginas estándar
  contentPage: {
    paddingTop: 45,
    paddingBottom: 55,
    paddingHorizontal: 44,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.text,
  },

  // Running Header & Footer
  runningHeader: {
    position: "absolute",
    top: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.border,
  },
  imageBlockContainer: {
    marginVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editorialContentImage: {
    maxHeight: 260,
    maxWidth: 480,
    borderRadius: 4,
    objectFit: "contain",
  },
  imageCaptionText: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Helvetica-Oblique",
  },
  runningHeaderLeft: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    maxWidth: 320,
  },
  runningHeaderRight: {
    fontSize: 7.5,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
  },
  runningFooter: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.border,
  },
  runningFooterLeft: {
    fontSize: 7.5,
    color: COLORS.textMuted,
  },
  runningFooterRight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },

  // Tabla de Contenido (TOC)
  tocContainer: {
    marginBottom: 20,
  },
  tocHeader: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.accent,
  },
  tocSubtitle: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    marginBottom: 18,
  },
  tocChapterBlock: {
    marginBottom: 12,
  },
  tocChapterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    marginBottom: 4,
  },
  tocChapterTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  tocLessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingLeft: 12,
    paddingRight: 6,
  },
  tocLessonNumber: {
    width: 28,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  tocLessonTitle: {
    flex: 1,
    fontSize: 8.5,
    color: COLORS.text,
  },

  // Portadilla de Capítulo
  chapterCover: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
  },
  chapterCoverTag: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  chapterCoverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  chapterCoverDesc: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.5,
    marginBottom: 14,
  },
  chapterSummaryListTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  chapterSummaryItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 6,
  },
  chapterSummaryBullet: {
    width: 12,
    fontSize: 9,
    color: COLORS.accent,
    fontFamily: "Helvetica-Bold",
  },
  chapterSummaryText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // Encabezado de Lección
  lessonHeaderContainer: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lessonBadge: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  lessonBadgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  lessonTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    lineHeight: 1.25,
  },

  // Encabezados de contenido
  h1: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginTop: 12,
    marginBottom: 5,
  },
  h3: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    marginTop: 10,
    marginBottom: 4,
  },
  h4: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 3,
  },

  // Párrafos y formato inline
  paragraph: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.text,
    marginBottom: 8,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  italic: {
    fontFamily: "Helvetica-Oblique",
  },
  inlineCode: {
    fontFamily: "Courier",
    fontSize: 8.5,
    color: "#e11d48",
    backgroundColor: "#f1f5f9",
  },

  // Bloques de código (Terminal Window Style)
  codeCard: {
    backgroundColor: COLORS.codeBg,
    borderRadius: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.codeBorder,
  },
  codeHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.codeBar,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderBottomWidth: 1,
    borderBottomColor: "#282c34",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  macDotsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  macDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  codeLangLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeBody: {
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  codeLineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 1.5,
  },
  codeLineNumber: {
    width: 22,
    fontSize: 7,
    fontFamily: "Courier",
    color: "#475569",
    textAlign: "right",
    paddingRight: 6,
    marginRight: 6,
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },
  codeLineText: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Courier",
    lineHeight: 1.3,
    flexWrap: "wrap", // CRÍTICO: Envuelve líneas largas para que NUNCA se corten
  },

  // Alertas / Callouts GFM
  calloutCard: {
    borderRadius: 5,
    padding: 10,
    marginVertical: 8,
    borderLeftWidth: 4,
  },
  calloutHeader: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  calloutBody: {
    fontSize: 9,
    lineHeight: 1.45,
    color: COLORS.text,
  },

  // Tablas GFM
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 5,
    marginVertical: 9,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 5.5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableDataRowAlt: {
    backgroundColor: COLORS.surfaceAlt,
  },
  tableDataCell: {
    fontSize: 8,
    color: COLORS.text,
    lineHeight: 1.3,
  },

  // Listas
  listContainer: {
    marginVertical: 5,
    paddingLeft: 4,
  },
  listItemRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  listBullet: {
    width: 14,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  listOrderedNumber: {
    width: 18,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
  },
  listContent: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: COLORS.text,
  },

  // Separador horizontal
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  });
}

const stylesCache = new Map<string, any>();

function getEditorialStyles(colors: EditorialColors) {
  const key = `${colors.accent}_${colors.codeBg}_${colors.codeBar}`;
  if (stylesCache.has(key)) return stylesCache.get(key);
  const s = buildEditorialStyles(colors);
  stylesCache.set(key, s);
  return s;
}

const defaultTheme = resolveEditorialTheme();
const defaultStyles = getEditorialStyles(defaultTheme.colors);
const defaultCodeTheme = defaultTheme.codePalette;

interface SectionRendererProps {
  sections: EditorialSection[];
  styles?: any;
  codeTheme?: CodeThemeConfig;
}

function SectionRenderer({ 
  sections, 
  styles = defaultStyles, 
  codeTheme = defaultCodeTheme 
}: SectionRendererProps) {
  return (
    <View>
      {sections.map((sec, idx) => {
        switch (sec.type) {
          case 'h1':
            return (
              <Text key={idx} style={styles.h1}>
                {sec.title}
              </Text>
            );
          case 'h2':
            return (
              <Text key={idx} style={styles.h2}>
                {sec.title}
              </Text>
            );
          case 'h3':
            return (
              <Text key={idx} style={styles.h3}>
                {sec.title}
              </Text>
            );
          case 'h4':
            return (
              <Text key={idx} style={styles.h4}>
                {sec.title}
              </Text>
            );
          case 'divider':
            return <View key={idx} style={styles.divider} />;

          case 'paragraph':
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

          case 'code': {
            const lines = sec.codeLines || [];
            return (
              <View key={idx} style={styles.codeCard} wrap={true}>
                {/* Cabecera Terminal Mac */}
                <View style={styles.codeHeaderBar}>
                  <View style={styles.macDotsContainer}>
                    <View style={[styles.macDot, { backgroundColor: "#ef4444" }]} />
                    <View style={[styles.macDot, { backgroundColor: "#f59e0b" }]} />
                    <View style={[styles.macDot, { backgroundColor: "#10b981" }]} />
                  </View>
                  <Text style={styles.codeLangLabel}>{sec.language || "CÓDIGO"}</Text>
                </View>

                {/* Contenido con sintaxis resaltada y wrap completo */}
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
                                color: getTokenColor(token.type, codeTheme),
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
              cType === 'IMPORTANT' ? '#7c3aed' :
              cType === 'WARNING' ? '#d97706' :
              cType === 'CAUTION' ? '#dc2626' : '#0284c7';

            const calloutBg = 
              cType === 'TIP' ? '#ecfdf5' :
              cType === 'IMPORTANT' ? '#f5f3ff' :
              cType === 'WARNING' ? '#fffbeb' :
              cType === 'CAUTION' ? '#fef2f2' : '#f0f9ff';

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
                    <Text style={styles.listBullet}>•</Text>
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
                    <Text style={styles.listOrderedNumber}>{item.number}.</Text>
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
                      rIdx % 2 === 1 ? styles.tableDataRowAlt : undefined
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

          case 'image': {
            if (!sec.url) return null;
            return (
              <View key={idx} style={styles.imageBlockContainer} wrap={false}>
                <Image src={sec.url} style={styles.editorialContentImage} />
                {sec.title ? (
                  <Text style={styles.imageCaptionText}>{sec.title}</Text>
                ) : null}
              </View>
            );
          }

          default:
            return null;
        }
      })}
    </View>
  );
}

export function EditorialBookPDF({ bookData }: { bookData: EditorialBookData }) {
  const { colors, codePalette } = resolveEditorialTheme(bookData.themeConfig);
  const styles = getEditorialStyles(colors);

  const cleanProjectName = cleanPdfText(bookData.projectName) || "Libro Técnico";
  const cleanSubtitle = cleanPdfText(bookData.subtitle || "Compendio estructurado de lecciones, fundamentos teóricos y ejercicios prácticos de ingeniería.");
  const cleanAuthorName = cleanPdfText(bookData.authorName) || "Profesor Titular";
  const cleanInstitutionName = cleanPdfText(bookData.institutionName || "SmartClass Academic Press");
  const cleanEdition = cleanPdfText(bookData.edition || "1ª Edición Oficial");
  const cleanAcademicYear = cleanPdfText(bookData.academicYear || new Date().getFullYear().toString());
  const cleanCreatedAt = bookData.createdAt || "Publicación Oficial";
  const { intro, chapters } = bookData;

  const totalLessons = chapters.reduce((acc, c) => acc + c.lessons.length, 0);

  return (
    <Document
      title={`${cleanProjectName} - Libro Editorial`}
      author={cleanAuthorName}
      subject="Manual Técnico y Guía Académica Completa"
      keywords="SmartClass, Documentación, Manual, Ingeniería, Educación"
      creator={cleanInstitutionName}
    >
      {/* 1. PORTADA EDITORIAL DE GRAN LUJO */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContainer}>
          <View style={styles.coverHeaderBanner}>
            <View style={styles.coverHeaderTopRow}>
              <Text style={[styles.coverEditorialTag, { flex: 1, paddingRight: 12 }]}>
                {cleanInstitutionName} • SERIE EDITORIAL • {cleanEdition}
              </Text>
              {bookData.logoUrl ? (
                <View style={styles.coverLogoContainer}>
                  <Image src={bookData.logoUrl} style={styles.coverLogoImage} />
                </View>
              ) : null}
            </View>
            <Text style={styles.coverTitle}>
              {cleanProjectName}
            </Text>
            <Text style={styles.coverSubtitle}>
              {cleanSubtitle}
            </Text>
          </View>

          <View style={styles.coverBody}>
            <View style={styles.coverFeatureBox}>
              <Text style={styles.coverFeatureTitle}>Plan de Estudios Integral</Text>
              <Text style={styles.coverFeatureDesc}>
                Este libro compila {chapters.length} capítulos temáticos y {totalLessons} lecciones técnicas con explicaciones conceptuales rigurosas, sintaxis de código comentada y directrices arquitectónicas para el aprendizaje universitario y profesional.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.coverFeatureBox, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.coverFeatureTitle}>Módulos</Text>
                <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: colors.accent }}>
                  {chapters.length} Capítulos
                </Text>
              </View>
              <View style={[styles.coverFeatureBox, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.coverFeatureTitle}>Contenido</Text>
                <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: colors.primary }}>
                  {totalLessons} Lecciones
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.coverFooterBanner}>
            <View>
              <Text style={styles.coverAuthorLabel}>Autor / Docente</Text>
              <Text style={styles.coverAuthorName}>{cleanAuthorName}</Text>
            </View>
            <View>
              <Text style={styles.coverMetaText}>Edición: {cleanEdition}</Text>
              <Text style={styles.coverMetaText}>Año {cleanAcademicYear} • {cleanCreatedAt}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* 2. TABLA DE CONTENIDO (ÍNDICE GENERAL NAVEGABLE) */}
      <Page size="A4" style={styles.contentPage} bookmark="Índice General">
        {/* Running Header */}
        <View style={styles.runningHeader} fixed>
          <Text style={styles.runningHeaderLeft}>{cleanProjectName}</Text>
          <Text style={styles.runningHeaderRight}>Índice General</Text>
        </View>

        <View style={styles.tocContainer}>
          <Text style={styles.tocHeader}>Tabla de Contenido</Text>
          <Text style={styles.tocSubtitle}>
            Estructura secuencial interactiva: haz clic en cualquier capítulo o lección para saltar a su contenido.
          </Text>

          {chapters.map((ch) => {
            const chTitleClean = cleanPdfText(ch.title);
            const chapterTargetId = `chapter-${ch.number}`;

            return (
              <View key={ch.number} style={styles.tocChapterBlock} wrap={false}>
                <Link src={`#${chapterTargetId}`} style={{ textDecoration: "none" }}>
                  <View style={styles.tocChapterHeader}>
                    <Text style={styles.tocChapterTitle}>
                      CAPÍTULO {String(ch.number).padStart(2, "0")}: {chTitleClean}
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.accent, fontFamily: "Helvetica-Bold" }}>
                      Ir al capítulo ▸
                    </Text>
                  </View>
                </Link>

                {ch.lessons.map((les) => {
                  const lesTitleClean = cleanPdfText(les.title);
                  const lessonTargetId = `lesson-${ch.number}-${les.number.replace(/[^a-zA-Z0-9]/g, '_')}`;

                  return (
                    <Link key={les.number} src={`#${lessonTargetId}`} style={{ textDecoration: "none" }}>
                      <View style={styles.tocLessonRow}>
                        <Text style={styles.tocLessonNumber}>{les.number}</Text>
                        <Text style={styles.tocLessonTitle}>{lesTitleClean}</Text>
                        <Text style={{ fontSize: 7.5, color: colors.accent }}>▸</Text>
                      </View>
                    </Link>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Running Footer */}
        <View style={styles.runningFooter} fixed>
          <Text style={styles.runningFooterLeft}>
            {cleanInstitutionName} • Prohibida su reproducción sin autorización
          </Text>
          <Text
            style={styles.runningFooterRight}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>

      {/* 3. PÁGINA DE INTRODUCCIÓN / PRESENTACIÓN (si existe) */}
      {intro && intro.content && (
        <Page 
          size="A4" 
          style={styles.contentPage} 
          break={true}
          bookmark={cleanPdfText(intro.title || "Introducción")}
        >
          <View style={styles.runningHeader} fixed>
            <Text style={styles.runningHeaderLeft}>{cleanProjectName}</Text>
            <Text style={styles.runningHeaderRight}>{cleanPdfText(intro.title || "Introducción")}</Text>
          </View>

          <SectionRenderer 
            sections={parseMarkdownToEditorialSections(intro.content)} 
            styles={styles} 
            codeTheme={codePalette} 
          />

          <View style={styles.runningFooter} fixed>
            <Text style={styles.runningFooterLeft}>
              {cleanInstitutionName} • Prohibida su reproducción sin autorización
            </Text>
            <Text
              style={styles.runningFooterRight}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* 4. CAPÍTULOS Y LECCIONES */}
      {chapters.map((ch) => {
        const chTitleClean = cleanPdfText(ch.title);
        const chDescClean = cleanPdfText(ch.description || "");
        const chapterTargetId = `chapter-${ch.number}`;
        const introSections = ch.introContent ? parseMarkdownToEditorialSections(ch.introContent) : [];

        return (
          <React.Fragment key={ch.number}>
            {/* Portadilla de Capítulo */}
            <Page 
              size="A4" 
              style={styles.contentPage} 
              break={true}
              bookmark={`Capítulo ${ch.number}: ${chTitleClean}`}
            >
              <View style={styles.runningHeader} fixed>
                <Text style={styles.runningHeaderLeft}>{cleanProjectName}</Text>
                <Text style={styles.runningHeaderRight}>
                  Capítulo {String(ch.number).padStart(2, "0")}
                </Text>
              </View>

              <View id={chapterTargetId} style={styles.chapterCover}>
                <Text style={styles.chapterCoverTag}>
                  UNIDAD TEMÁTICA • CAPÍTULO {String(ch.number).padStart(2, "0")}
                </Text>
                <Text style={styles.chapterCoverTitle}>{chTitleClean}</Text>
                {chDescClean ? (
                  <Text style={styles.chapterCoverDesc}>{chDescClean}</Text>
                ) : null}

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.chapterSummaryListTitle}>
                    Lecciones comprendidas en este módulo:
                  </Text>
                  {ch.lessons.map((les) => {
                    const lesTitleClean = cleanPdfText(les.title);
                    const lessonTargetId = `lesson-${ch.number}-${les.number.replace(/[^a-zA-Z0-9]/g, '_')}`;

                    return (
                      <Link key={les.number} src={`#${lessonTargetId}`} style={{ textDecoration: "none" }}>
                        <View style={styles.chapterSummaryItem}>
                          <Text style={styles.chapterSummaryBullet}>▸</Text>
                          <Text style={styles.chapterSummaryText}>
                            <Text style={{ fontFamily: "Helvetica-Bold" }}>{les.number}: </Text>
                            {lesTitleClean}
                          </Text>
                        </View>
                      </Link>
                    );
                  })}
                </View>
              </View>

              {/* Si el tópico tiene contenido propio introductorio en su index */}
              {introSections.length > 0 && (
                <SectionRenderer sections={introSections} styles={styles} codeTheme={codePalette} />
              )}

              <View style={styles.runningFooter} fixed>
                <Text style={styles.runningFooterLeft}>
                  {cleanInstitutionName} • Prohibida su reproducción sin autorización
                </Text>
                <Text
                  style={styles.runningFooterRight}
                  render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                />
              </View>
            </Page>

            {/* Lecciones del Capítulo */}
            {ch.lessons.map((les) => {
              const lesTitleClean = cleanPdfText(les.title);
              const lessonTargetId = `lesson-${ch.number}-${les.number.replace(/[^a-zA-Z0-9]/g, '_')}`;
              const lessonSections = parseMarkdownToEditorialSections(les.content);

              return (
                <Page 
                  key={les.number} 
                  size="A4" 
                  style={styles.contentPage} 
                  break={true}
                  bookmark={`${les.number} ${lesTitleClean}`}
                >
                  <View style={styles.runningHeader} fixed>
                    <Text style={styles.runningHeaderLeft}>{cleanProjectName}</Text>
                    <Text style={styles.runningHeaderRight}>
                      Cap. {ch.number} • {les.number} {lesTitleClean}
                    </Text>
                  </View>

                  {/* Encabezado Editorial de Lección */}
                  <View id={lessonTargetId} style={styles.lessonHeaderContainer}>
                    <View style={styles.lessonBadge}>
                      <Text style={styles.lessonBadgeText}>
                        Capítulo {ch.number} • Lección {les.number}
                      </Text>
                    </View>
                    <Text style={styles.lessonTitle}>{lesTitleClean}</Text>
                  </View>

                  {/* Renderizado Completo de Secciones */}
                  <SectionRenderer sections={lessonSections} styles={styles} codeTheme={codePalette} />

                  <View style={styles.runningFooter} fixed>
                    <Text style={styles.runningFooterLeft}>
                      {cleanInstitutionName} • Prohibida su reproducción sin autorización
                    </Text>
                    <Text
                      style={styles.runningFooterRight}
                      render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                  </View>
                </Page>
              );
            })}
          </React.Fragment>
        );
      })}
    </Document>
  );
}
