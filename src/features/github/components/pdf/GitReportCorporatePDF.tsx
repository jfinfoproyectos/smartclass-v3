import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { cleanPdfText } from "@/features/documentation/components/pdf/markdownToPdfAst";
import type { GitReportData } from "../../services/gitReportService";
import type { GitAiReportResult } from "../../actions/gitReportActions";

import type { GitReportMode } from "../../actions/gitReportActions";

export interface GitReportCorporatePDFProps {
    reportData: GitReportData;
    aiReport?: GitAiReportResult | null;
    generatedAt?: string;
    includeAuthors?: boolean;
    includeCommitHashes?: boolean;
    reportMode?: GitReportMode;
}

const COLORS = {
    primary: "#0f172a",       // Deep Slate 900
    secondary: "#1e293b",     // Slate 800
    text: "#334155",          // Slate 700
    textMuted: "#64748b",     // Slate 500
    accent: "#0d9488",        // Teal 600
    accentLight: "#f0fdfa",   // Teal 50
    accentBorder: "#ccfbf1",  // Teal 100
    surfaceAlt: "#f8fafc",    // Slate 50
    border: "#e2e8f0",        // Slate 200
    borderDark: "#cbd5e1",    // Slate 300
    white: "#ffffff",
    
    // Category colors
    emeraldBg: "#ecfdf5",
    emeraldBorder: "#a7f3d0",
    emeraldText: "#047857",

    blueBg: "#eff6ff",
    blueBorder: "#bfdbfe",
    blueText: "#1d4ed8",

    amberBg: "#fffbeb",
    amberBorder: "#fde68a",
    amberText: "#b45309",

    purpleBg: "#faf5ff",
    purpleBorder: "#e9d5ff",
    purpleText: "#7e22ce",

    slateBg: "#f1f5f9",
    slateBorder: "#cbd5e1",
    slateText: "#475569",
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 42,
        paddingBottom: 42,
        paddingHorizontal: 36,
        backgroundColor: COLORS.white,
        fontFamily: "Helvetica",
        color: COLORS.text,
    },
    // Header fijo en todas las páginas
    fixedHeader: {
        position: "absolute",
        top: 16,
        left: 36,
        right: 36,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fixedHeaderLeft: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: COLORS.accent,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    fixedHeaderRight: {
        fontSize: 7,
        color: COLORS.textMuted,
        fontFamily: "Helvetica",
    },
    // Footer fijo en todas las páginas
    fixedFooter: {
        position: "absolute",
        bottom: 16,
        left: 36,
        right: 36,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fixedFooterLeft: {
        fontSize: 6.5,
        color: COLORS.textMuted,
        fontFamily: "Helvetica",
    },
    fixedFooterRight: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.accent,
    },
    // Hero Banner
    heroBanner: {
        marginBottom: 14,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.accent,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 7,
        flexWrap: "wrap",
    },
    badge: {
        backgroundColor: COLORS.accentLight,
        borderWidth: 1,
        borderColor: COLORS.accentBorder,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: COLORS.accent,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    secondaryBadge: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    secondaryBadgeText: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: COLORS.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    mainTitle: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        lineHeight: 1.2,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 8.5,
        color: COLORS.textMuted,
        lineHeight: 1.35,
        marginBottom: 8,
    },
    metaGrid: {
        flexDirection: "row",
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 5,
        paddingVertical: 6,
        paddingHorizontal: 8,
        justifyContent: "space-between",
        alignItems: "center",
    },
    metaItem: {
        flexDirection: "column",
    },
    metaLabel: {
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    metaValue: {
        fontSize: 7.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    // KPI Cards
    kpiRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 12,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 5,
        padding: 6,
        alignItems: "center",
    },
    kpiValue: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        marginBottom: 1,
    },
    kpiLabel: {
        fontSize: 6.5,
        fontFamily: "Helvetica",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    // Callout Box (Resumen Ejecutivo)
    executiveBox: {
        backgroundColor: COLORS.surfaceAlt,
        borderLeftWidth: 3.5,
        borderLeftColor: COLORS.accent,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 8,
        marginBottom: 12,
    },
    executiveTitle: {
        fontSize: 9.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        marginBottom: 4,
    },
    paragraph: {
        fontSize: 8,
        lineHeight: 1.45,
        color: COLORS.text,
        marginBottom: 5,
    },
    // Headings
    sectionHeading: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 6,
        paddingBottom: 2.5,
        borderBottomWidth: 0.8,
        borderBottomColor: COLORS.border,
    },
    headingBar: {
        width: 3,
        height: 11,
        backgroundColor: COLORS.accent,
        borderRadius: 1,
        marginRight: 5,
    },
    headingText: {
        fontSize: 10.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    // Categorized items
    categoryCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 6,
        marginBottom: 6,
        backgroundColor: COLORS.white,
    },
    categoryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
    },
    categoryBadge: {
        borderRadius: 3,
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderWidth: 0.8,
    },
    categoryBadgeText: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
    },
    categoryTitle: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        flex: 1,
        marginRight: 6,
    },
    categoryDescription: {
        fontSize: 7.5,
        color: COLORS.text,
        lineHeight: 1.35,
        marginBottom: 2,
    },
    categoryImpact: {
        fontSize: 7,
        fontFamily: "Helvetica-Oblique",
        color: COLORS.accent,
    },
    // Detailed Tasks Styles
    taskItemCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 6,
        marginBottom: 5,
        backgroundColor: COLORS.white,
    },
    taskItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
    },
    taskItemTitle: {
        fontSize: 8.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
        flex: 1,
        marginRight: 6,
    },
    taskItemMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
    },
    taskItemAuthor: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.secondary,
    },
    taskItemCommits: {
        fontSize: 6,
        fontFamily: "Courier",
        color: COLORS.textMuted,
    },
    taskItemDesc: {
        fontSize: 7.5,
        color: COLORS.text,
        lineHeight: 1.35,
        marginBottom: 2,
    },
    taskItemTech: {
        fontSize: 6.8,
        color: COLORS.secondary,
        backgroundColor: COLORS.surfaceAlt,
        padding: 3,
        borderRadius: 2.5,
        marginBottom: 2,
    },
    taskItemImpact: {
        fontSize: 6.8,
        fontFamily: "Helvetica-Oblique",
        color: COLORS.accent,
    },
    // Tables
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 10,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: COLORS.secondary,
        paddingVertical: 4.5,
        paddingHorizontal: 6,
    },
    tableHeaderCell: {
        fontSize: 6.5,
        fontFamily: "Helvetica-Bold",
        color: COLORS.white,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: "row",
        borderTopWidth: 0.8,
        borderTopColor: COLORS.border,
        paddingVertical: 4,
        paddingHorizontal: 6,
        alignItems: "center",
    },
    tableRowAlt: {
        backgroundColor: COLORS.surfaceAlt,
    },
    tableCell: {
        fontSize: 7,
        color: COLORS.text,
    },
    tableCellBold: {
        fontSize: 7,
        fontFamily: "Helvetica-Bold",
        color: COLORS.primary,
    },
    tableCellCode: {
        fontFamily: "Courier",
        fontSize: 6.5,
        color: COLORS.accent,
    },
    // Key Achievements Bullets
    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 3,
    },
    bulletDot: {
        width: 10,
        fontSize: 9,
        color: COLORS.accent,
        fontFamily: "Helvetica-Bold",
    },
    bulletText: {
        flex: 1,
        fontSize: 7.5,
        lineHeight: 1.35,
        color: COLORS.text,
    }
});

function getBadgeStyle(badgeColor?: string) {
    switch (badgeColor) {
        case "emerald":
            return { bg: COLORS.emeraldBg, border: COLORS.emeraldBorder, text: COLORS.emeraldText };
        case "blue":
            return { bg: COLORS.blueBg, border: COLORS.blueBorder, text: COLORS.blueText };
        case "amber":
            return { bg: COLORS.amberBg, border: COLORS.amberBorder, text: COLORS.amberText };
        case "purple":
            return { bg: COLORS.purpleBg, border: COLORS.purpleBorder, text: COLORS.purpleText };
        default:
            return { bg: COLORS.slateBg, border: COLORS.slateBorder, text: COLORS.slateText };
    }
}

export function GitReportCorporatePDF({ 
    reportData, 
    aiReport, 
    generatedAt,
    includeAuthors = true,
    includeCommitHashes = true,
    reportMode = "pedagogical"
}: GitReportCorporatePDFProps) {
    const { repoInfo, summary, contributors, commits, dateRange, selectedBranch } = reportData;

    const shouldShowAuthors = includeAuthors !== undefined ? includeAuthors : (aiReport?.includeAuthors ?? true);
    const shouldShowHashes = includeCommitHashes !== undefined ? includeCommitHashes : (aiReport?.includeCommitHashes ?? true);
    const activeMode = reportMode || aiReport?.reportMode || "pedagogical";

    const formattedDate = generatedAt || new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    const reportTitle = aiReport?.title || (
        activeMode === "pedagogical" ? `Evaluación Pedagógica y Auditoría Git: ${repoInfo.repo}` :
        activeMode === "technical" ? `Auditoría Técnica y Arquitectura de Software: ${repoInfo.repo}` :
        `Informe Ejecutivo de Entregas y Negocio: ${repoInfo.repo}`
    );
    const branchLabel = selectedBranch === "all" ? "Todas las ramas (Global)" : selectedBranch;

    // Distribución de anchos de columna para la tabla de commits del apéndice
    const colDateWidth = shouldShowAuthors && shouldShowHashes ? "18%" : (!shouldShowAuthors && !shouldShowHashes) ? "25%" : "22%";
    const colAuthorWidth = "22%";
    const colShaWidth = shouldShowAuthors ? "12%" : "15%";
    const colMsgWidth = shouldShowAuthors && shouldShowHashes ? "48%" :
                        shouldShowAuthors && !shouldShowHashes ? "56%" :
                        !shouldShowAuthors && shouldShowHashes ? "63%" : "75%";

    return (
        <Document
            title={`Reporte_GitHub_${repoInfo.repo}_${dateRange.startDate || 'full'}`}
            author="SmartClass Enterprise Engine"
            subject={`Auditoría de Commits y Trabajo Realizado - ${repoInfo.owner}/${repoInfo.repo}`}
        >
            <Page size="A4" style={styles.page}>
                {/* Header fijo superior */}
                <View style={styles.fixedHeader} fixed>
                    <Text style={styles.fixedHeaderLeft}>
                        SmartClass Enterprise • Auditoría & Reporte Git
                    </Text>
                    <Text
                        style={styles.fixedHeaderRight}
                        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
                    />
                </View>

                {/* Hero Banner Ejecutivo */}
                <View style={styles.heroBanner}>
                    <View style={styles.badgeRow}>
                        <View style={[
                            styles.badge, 
                            activeMode === "pedagogical" ? { backgroundColor: COLORS.emeraldBg, borderColor: COLORS.emeraldBorder } :
                            activeMode === "technical" ? { backgroundColor: COLORS.purpleBg, borderColor: COLORS.purpleBorder } :
                            { backgroundColor: COLORS.blueBg, borderColor: COLORS.blueBorder }
                        ]}>
                            <Text style={[
                                styles.badgeText,
                                activeMode === "pedagogical" ? { color: COLORS.emeraldText } :
                                activeMode === "technical" ? { color: COLORS.purpleText } :
                                { color: COLORS.blueText }
                            ]}>
                                {activeMode === "pedagogical" ? "Evaluación Pedagógica Oficial" :
                                 activeMode === "technical" ? "Auditoría Técnica de Software" :
                                 "Informe Ejecutivo Oficial"}
                            </Text>
                        </View>
                        <View style={styles.secondaryBadge}>
                            <Text style={styles.secondaryBadgeText}>Rama: {cleanPdfText(branchLabel)}</Text>
                        </View>
                        <View style={styles.secondaryBadge}>
                            <Text style={styles.secondaryBadgeText}>{cleanPdfText(dateRange.label)}</Text>
                        </View>
                    </View>

                    <Text style={styles.mainTitle}>{cleanPdfText(reportTitle)}</Text>
                    <Text style={styles.subtitle}>
                        {activeMode === "pedagogical"
                            ? "Evaluación formativa de competencias técnicas, consistencia del desarrollo y buenas prácticas de Git."
                            : activeMode === "technical"
                            ? "Auditoría profunda de arquitectura de software, calidad de código, refactorizaciones y diffs."
                            : "Síntesis estratégica de valor de negocio, hitos alcanzados y funcionalidades de producto entregadas."}
                    </Text>

                    {/* Metadata Grid */}
                    <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Repositorio</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(`${repoInfo.owner}/${repoInfo.repo}`)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Fecha de Emisión</Text>
                            <Text style={styles.metaValue}>{cleanPdfText(formattedDate)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Total Commits</Text>
                            <Text style={styles.metaValue}>{summary.totalCommits} registrados</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>{shouldShowAuthors ? "Colaboradores" : "Equipo"}</Text>
                            <Text style={styles.metaValue}>{summary.totalContributors} {shouldShowAuthors ? "miembros activos" : "desarrolladores"}</Text>
                        </View>
                    </View>
                </View>

                {/* KPI Cards */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiValue}>{summary.totalCommits}</Text>
                        <Text style={styles.kpiLabel}>Commits Realizados</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiValue}>{summary.totalContributors}</Text>
                        <Text style={styles.kpiLabel}>{shouldShowAuthors ? "Autores Activos" : "Miembros de Equipo"}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiValue}>{summary.activeDaysCount}</Text>
                        <Text style={styles.kpiLabel}>Días de Actividad</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiValue}>
                            {aiReport?.cadenceAndHealth?.status || "Activo"}
                        </Text>
                        <Text style={styles.kpiLabel}>Estado de Cadencia</Text>
                    </View>
                </View>

                {/* Resumen Ejecutivo IA */}
                {aiReport?.executiveSummary ? (
                    <View style={styles.executiveBox}>
                        <Text style={styles.executiveTitle}>
                            {activeMode === "pedagogical" ? "Dictamen Pedagógico y Resumen Formativo" :
                             activeMode === "technical" ? "Dictamen Técnico de Arquitectura" :
                             "Resumen Ejecutivo de la Actividad"}
                        </Text>
                        <Text style={styles.paragraph}>
                            {cleanPdfText(aiReport.executiveSummary)}
                        </Text>
                    </View>
                ) : null}

                {/* Hitos Principales */}
                {aiReport?.keyAchievements && aiReport.keyAchievements.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                        <View style={styles.sectionHeading}>
                            <View style={styles.headingBar} />
                            <Text style={styles.headingText}>
                                {activeMode === "pedagogical" ? "Evidencias y Logros de Aprendizaje" : "Hitos y Entregas Destacadas"}
                            </Text>
                        </View>
                        {aiReport.keyAchievements.map((ach, idx) => (
                            <View key={idx} style={styles.bulletRow}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.bulletText}>{cleanPdfText(ach)}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Inventario Detallado de Tareas Realizadas */}
                {aiReport?.detailedTasks && aiReport.detailedTasks.length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                        <View style={styles.sectionHeading}>
                            <View style={styles.headingBar} />
                            <Text style={styles.headingText}>
                                Inventario Detallado de Tareas Realizadas ({aiReport.detailedTasks.length} tareas)
                            </Text>
                        </View>
                        {aiReport.detailedTasks.map((task, idx) => {
                            const badgeSt = getBadgeStyle(task.badgeColor);
                            const hasMetaInfo = shouldShowAuthors || (shouldShowHashes && task.relatedCommits && task.relatedCommits.length > 0);

                            return (
                                <View key={idx} style={styles.taskItemCard} wrap={false}>
                                    <View style={styles.taskItemHeader}>
                                        <Text style={styles.taskItemTitle}>
                                            {idx + 1}. {cleanPdfText(task.title)}
                                        </Text>
                                        <View style={[styles.categoryBadge, { backgroundColor: badgeSt.bg, borderColor: badgeSt.border }]}>
                                            <Text style={[styles.categoryBadgeText, { color: badgeSt.text }]}>
                                                {cleanPdfText(task.category)}
                                            </Text>
                                        </View>
                                    </View>

                                    {hasMetaInfo ? (
                                        <View style={styles.taskItemMeta}>
                                            {shouldShowAuthors ? (
                                                <Text style={styles.taskItemAuthor}>
                                                    Responsable: {cleanPdfText(task.author)}
                                                </Text>
                                            ) : null}
                                            {shouldShowHashes && task.relatedCommits && task.relatedCommits.length > 0 ? (
                                                <Text style={styles.taskItemCommits}>
                                                    Commits: {task.relatedCommits.slice(0, 4).join(", ")}
                                                </Text>
                                            ) : null}
                                        </View>
                                    ) : null}

                                    <Text style={styles.taskItemDesc}>
                                        {cleanPdfText(task.description)}
                                    </Text>

                                    {task.technicalDetails ? (
                                        <Text style={styles.taskItemTech}>
                                            Detalles técnicos: {cleanPdfText(task.technicalDetails)}
                                        </Text>
                                    ) : null}

                                    {task.filesTouched && task.filesTouched.length > 0 ? (
                                        <Text style={[styles.taskItemTech, { fontFamily: "Helvetica-Oblique", color: COLORS.accent }]}>
                                            Archivos verificados ({task.filesTouched.length}): {cleanPdfText(task.filesTouched.slice(0, 5).join(", "))}{task.filesTouched.length > 5 ? ` (+${task.filesTouched.length - 5} más)` : ""}
                                        </Text>
                                    ) : null}

                                    {task.impact ? (
                                        <Text style={styles.taskItemImpact}>
                                            Impacto: {cleanPdfText(task.impact)}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {/* Desglose por Categorías de Trabajo */}
                {aiReport?.categories && aiReport.categories.length > 0 ? (
                    <View style={{ marginBottom: 10 }}>
                        <View style={styles.sectionHeading}>
                            <View style={styles.headingBar} />
                            <Text style={styles.headingText}>Desglose Detallado por Áreas de Trabajo</Text>
                        </View>
                        {aiReport.categories.map((cat, idx) => {
                            const badgeSt = getBadgeStyle(cat.badgeColor);
                            return (
                                <View key={idx} style={styles.categoryCard} wrap={false}>
                                    <View style={styles.categoryHeader}>
                                        <Text style={styles.categoryTitle}>{cleanPdfText(cat.title)}</Text>
                                        <View style={[styles.categoryBadge, { backgroundColor: badgeSt.bg, borderColor: badgeSt.border }]}>
                                            <Text style={[styles.categoryBadgeText, { color: badgeSt.text }]}>
                                                {cleanPdfText(cat.category)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.categoryDescription}>{cleanPdfText(cat.description)}</Text>
                                    {cat.impact ? (
                                        <Text style={styles.categoryImpact}>Impacto: {cleanPdfText(cat.impact)}</Text>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {/* Tabla de Colaboradores (Condicional a shouldShowAuthors) */}
                {shouldShowAuthors ? (
                    <View style={{ marginBottom: 12 }} wrap={false}>
                        <View style={styles.sectionHeading}>
                            <View style={styles.headingBar} />
                            <Text style={styles.headingText}>Análisis de Esfuerzo por Colaborador</Text>
                        </View>

                        <View style={styles.table}>
                            <View style={styles.tableHeaderRow}>
                                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Colaborador</Text>
                                <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Commits</Text>
                                <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>% Aporte</Text>
                                <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Rol y Foco Principal</Text>
                            </View>
                            {contributors.slice(0, 10).map((c, idx) => {
                                const highlight = aiReport?.contributorHighlights?.find(
                                    h => h.name.toLowerCase() === c.name.toLowerCase() || (c.login && h.login?.toLowerCase() === c.login.toLowerCase())
                                );
                                return (
                                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                                        <View style={{ width: "30%" }}>
                                            <Text style={styles.tableCellBold}>{cleanPdfText(c.name)}</Text>
                                            {c.login ? (
                                                <Text style={[styles.tableCell, { fontSize: 6, color: COLORS.textMuted }]}>
                                                    @{cleanPdfText(c.login)}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                                            {c.commitsCount}
                                        </Text>
                                        <Text style={[styles.tableCellBold, { width: "15%", textAlign: "center", color: COLORS.accent }]}>
                                            {c.percentage}%
                                        </Text>
                                        <Text style={[styles.tableCell, { width: "40%", fontSize: 6.5 }]}>
                                            {cleanPdfText(highlight?.roleDescription || "Desarrollo y soporte técnico")}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : null}

                {/* Cadencia y Recomendaciones */}
                {aiReport?.cadenceAndHealth ? (
                    <View style={{ marginBottom: 12 }} wrap={false}>
                        <View style={styles.sectionHeading}>
                            <View style={styles.headingBar} />
                            <Text style={styles.headingText}>
                                {activeMode === "pedagogical" ? "Consistencia de Trabajo y Recomendaciones Pedagógicas" : "Cadencia y Próximos Pasos Recomendados"}
                            </Text>
                        </View>
                        {aiReport.cadenceAndHealth.velocityDescription ? (
                            <Text style={styles.paragraph}>
                                {cleanPdfText(aiReport.cadenceAndHealth.velocityDescription)}
                            </Text>
                        ) : null}
                        {aiReport.cadenceAndHealth.recommendations?.map((rec, idx) => (
                            <View key={idx} style={styles.bulletRow}>
                                <Text style={styles.bulletDot}>→</Text>
                                <Text style={styles.bulletText}>{cleanPdfText(rec)}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Apéndice: Historial de Commits Auditados */}
                <View style={{ marginTop: 8 }}>
                    <View style={styles.sectionHeading}>
                        <View style={styles.headingBar} />
                        <Text style={styles.headingText}>
                            Apéndice: Registro Detallado de Commits ({commits.length})
                        </Text>
                    </View>

                    <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, { width: colDateWidth }]}>Fecha / Hora</Text>
                            {shouldShowAuthors ? (
                                <Text style={[styles.tableHeaderCell, { width: colAuthorWidth }]}>Autor</Text>
                            ) : null}
                            {shouldShowHashes ? (
                                <Text style={[styles.tableHeaderCell, { width: colShaWidth }]}>SHA</Text>
                            ) : null}
                            <Text style={[styles.tableHeaderCell, { width: colMsgWidth }]}>Mensaje del Commit</Text>
                        </View>
                        {commits.slice(0, 75).map((cm, idx) => (
                            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
                                <Text style={[styles.tableCell, { width: colDateWidth, fontSize: 6 }]}>
                                    {cm.regionalDate} {cm.regionalTime}
                                </Text>
                                {shouldShowAuthors ? (
                                    <Text style={[styles.tableCellBold, { width: colAuthorWidth, fontSize: 6.5 }]}>
                                        {cleanPdfText(cm.authorName).slice(0, 28)}
                                    </Text>
                                ) : null}
                                {shouldShowHashes ? (
                                    <Text style={[styles.tableCellCode, { width: colShaWidth }]}>
                                        {cm.shortSha}
                                    </Text>
                                ) : null}
                                <Text style={[styles.tableCell, { width: colMsgWidth, fontSize: 6.5 }]}>
                                    {cleanPdfText(cm.title).slice(0, 90)}
                                    {cm.files && cm.files.length > 0 ? (
                                        <Text style={{ fontSize: 5.5, color: COLORS.textMuted }}>
                                            {` [${cm.files.length} arch.${cm.stats ? ` +${cm.stats.additions}/-${cm.stats.deletions}` : ""}]`}
                                        </Text>
                                    ) : null}
                                </Text>
                            </View>
                        ))}
                    </View>
                    {commits.length > 75 ? (
                        <Text style={[styles.paragraph, { fontSize: 6.5, color: COLORS.textMuted, textAlign: "center" }]}>
                            ... y {commits.length - 75} commits adicionales omitidos en el apéndice impreso para optimizar legibilidad.
                        </Text>
                    ) : null}
                </View>

                {/* Footer fijo inferior */}
                <View style={styles.fixedFooter} fixed>
                    <Text style={styles.fixedFooterLeft}>
                        Documento confidencial generado para control de calidad académica y de ingeniería • SmartClass
                    </Text>
                    <Text style={styles.fixedFooterRight}>
                        {cleanPdfText(repoInfo.owner)}/{cleanPdfText(repoInfo.repo)}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
