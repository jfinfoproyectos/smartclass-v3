import { 
  tokenizeCodeToLines, 
  cleanPdfText, 
  CodeLine, 
  InlineToken 
} from "@/features/documentation/components/pdf/markdownToPdfAst";

export interface KpiMetric {
  value: string;
  label: string;
  subtext?: string;
}

export interface SignatureItem {
  roleLabel: string;
  name: string;
  position: string;
  entity?: string;
}

export interface TaskItem {
  checked: boolean;
  inlineTokens: InlineToken[];
}

export interface ListItem {
  number?: number;
  level?: number;
  inlineTokens: InlineToken[];
}

export type CorporateSectionType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "paragraph"
  | "code"
  | "callout"
  | "blockquote"
  | "math"
  | "list"
  | "ordered-list"
  | "task-list"
  | "table"
  | "kpi-grid"
  | "signatures"
  | "divider"
  | "pagebreak";

export interface CorporateSection {
  type: CorporateSectionType;
  title?: string;
  inlineTokens?: InlineToken[];
  language?: string;
  codeLines?: CodeLine[];
  calloutType?: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
  calloutTitle?: string;
  calloutTokens?: InlineToken[];
  items?: ListItem[];
  taskItems?: TaskItem[];
  tableHeaders?: InlineToken[][];
  tableRows?: InlineToken[][][];
  mathFormula?: string;
  kpiMetrics?: KpiMetric[];
  signaturesList?: SignatureItem[];
}

/**
 * Limpia y formatea expresiones matemáticas LaTeX sencillas para PDF (eliminando \text{}, \rightarrow, etc.)
 */
export function cleanLatexFormula(latex: string): string {
  if (!latex) return "";
  return latex
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\rightarrow/g, " → ")
    .replace(/\\leftarrow/g, " ← ")
    .replace(/\\Rightarrow/g, " ⇒ ")
    .replace(/\\cdot/g, " · ")
    .replace(/\\times/g, " × ")
    .replace(/\\leq/g, " ≤ ")
    .replace(/\\geq/g, " ≥ ")
    .replace(/\\neq/g, " ≠ ")
    .replace(/\\pm/g, " ± ")
    .replace(/\\%/g, "%")
    .trim();
}

/**
 * Parsea el formato inline (negrita, cursiva, código, enlaces, fórmulas cortas)
 */
export function parseAdvancedInlineFormatting(text: string): InlineToken[] {
  if (!text) return [];

  const sanitized = cleanPdfText(text);
  if (!sanitized) return [];

  // Regex para detectar `código`, **negrita**, *cursiva*, __negrita__, _cursiva_, [enlace](url) y $math$
  const pattern = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|___[^_]+___|__[^_]+__|_[^_]+_|\[[^\]]+\]\([^\)]+\)|\$[^$]+\$)/g;
  const parts = sanitized.split(pattern);
  const result: InlineToken[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      result.push({ text: part.slice(1, -1), code: true });
    } else if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      result.push({ text: part.slice(3, -3), bold: true, italic: true });
    } else if (part.startsWith("___") && part.endsWith("___") && part.length >= 6) {
      result.push({ text: part.slice(3, -3), bold: true, italic: true });
    } else if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      result.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
      result.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      result.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith("_") && part.endsWith("_") && part.length >= 2) {
      result.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
      result.push({ text: cleanLatexFormula(part), italic: true, code: true });
    } else if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (linkMatch) {
        result.push({ text: linkMatch[1], bold: true });
      } else {
        result.push({ text: part });
      }
    } else {
      result.push({ text: part });
    }
  }

  return result.length > 0 ? result : [{ text: sanitized }];
}

/**
 * Extrae el primer encabezado # H1 para usarlo como título automático si no se define uno.
 */
export function extractFirstH1(markdown: string): string | null {
  if (!markdown) return null;
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? cleanPdfText(match[1]) : null;
}

/**
 * Parser de Markdown fiel al 100% que convierte exactamente la estructura del markdown de entrada en secciones PDF.
 */
export function parseCorporateMarkdown(markdown: string): CorporateSection[] {
  if (!markdown) return [];

  // Normalizar saltos de línea
  let cleanMarkdown = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Quitar Frontmatter YAML si existe
  if (cleanMarkdown.trim().startsWith("---")) {
    const secondFence = cleanMarkdown.indexOf("\n---", 3);
    if (secondFence !== -1) {
      cleanMarkdown = cleanMarkdown.slice(secondFence + 4).trim();
    }
  }

  const rawLines = cleanMarkdown.split("\n");
  const sections: CorporateSection[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Líneas en blanco
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Salto de página explícito (---pagebreak---, \pagebreak, <!-- pagebreak -->)
    if (
      trimmed === "---pagebreak---" ||
      trimmed === "\\pagebreak" ||
      trimmed === "<!-- pagebreak -->" ||
      trimmed === "<!--pagebreak-->"
    ) {
      sections.push({ type: "pagebreak" });
      i++;
      continue;
    }

    // 3. Ecuación Matemática LaTeX en Bloque ($$...$$)
    if (trimmed.startsWith("$$")) {
      const mathLines: string[] = [];
      if (trimmed.endsWith("$$") && trimmed.length > 4) {
        mathLines.push(trimmed);
        i++;
      } else {
        while (i < rawLines.length) {
          mathLines.push(rawLines[i]);
          if (rawLines[i].trim().endsWith("$$") && mathLines.length > 1) {
            i++;
            break;
          }
          i++;
        }
      }
      const rawFormula = mathLines.join(" ");
      sections.push({
        type: "math",
        mathFormula: cleanLatexFormula(rawFormula),
      });
      continue;
    }

    // 4. Bloque de KPI / Métricas destacadas (:::kpi Value | Label | Subtext :::)
    if (trimmed.startsWith(":::kpi")) {
      const kpis: KpiMetric[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith(":::kpi")) {
        const kpiContent = rawLines[i].trim().replace(/^:::kpi\s*/, "").replace(/\s*:::$/, "");
        const parts = kpiContent.split("|").map(p => cleanPdfText(p.trim()));
        if (parts.length >= 2) {
          kpis.push({
            value: parts[0],
            label: parts[1],
            subtext: parts[2] || undefined,
          });
        }
        i++;
      }
      if (kpis.length > 0) {
        sections.push({ type: "kpi-grid", kpiMetrics: kpis });
        continue;
      }
    }

    // 5. Bloque de firmas corporativas (:::signatures ... :::)
    if (trimmed.startsWith(":::signatures")) {
      const sigs: SignatureItem[] = [];
      i++; // Avanzar después de :::signatures
      while (i < rawLines.length && !rawLines[i].trim().startsWith(":::")) {
        const sigLine = rawLines[i].trim();
        if (sigLine) {
          const parts = sigLine.split("|").map(p => cleanPdfText(p.trim()));
          if (parts.length >= 2) {
            sigs.push({
              roleLabel: parts[0] || "Firma Responsable",
              name: parts[1] || "",
              position: parts[2] || "Oficial Técnico",
              entity: parts[3] || undefined,
            });
          }
        }
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith(":::")) {
        i++; // Cerrar :::
      }
      if (sigs.length > 0) {
        sections.push({ type: "signatures", signaturesList: sigs });
        continue;
      }
    }

    // 6. Separador horizontal (--- o *** o ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      sections.push({ type: "divider" });
      i++;
      continue;
    }

    // 7. Bloques de código con sintaxis resaltada (```lang ... ```)
    if (trimmed.startsWith("```")) {
      const langMatch = trimmed.match(/^```([a-zA-Z0-9_\-\.]+)?/);
      const language = langMatch?.[1] || "text";
      const codeLinesRaw: string[] = [];
      i++;

      while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
        codeLinesRaw.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith("```")) {
        i++; // Cerrar ```
      }

      const fullCode = codeLinesRaw.join("\n");
      const lines = tokenizeCodeToLines(fullCode, language);

      sections.push({
        type: "code",
        language: language.toUpperCase(),
        codeLines: lines,
      });
      continue;
    }

    // 8. Alertas corporativas GFM (> [!NOTE], > [!TIP], etc.) o Citas simples
    if (trimmed.startsWith(">")) {
      let calloutType: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION" = "NOTE";
      let isGfmCallout = false;
      const calloutLines: string[] = [];

      const matchGfm = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (matchGfm) {
        isGfmCallout = true;
        calloutType = matchGfm[1].toUpperCase() as any;
        i++;
      }

      while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
        const cleanContent = rawLines[i].trim().replace(/^>\s?/, "");
        if (cleanContent) {
          calloutLines.push(cleanContent);
        }
        i++;
      }

      const fullCalloutText = calloutLines.join(" ");
      const calloutTitle = isGfmCallout 
        ? (calloutType === "NOTE" ? "NOTA CLAVE"
          : calloutType === "TIP" ? "CONSEJO PRÁCTICO"
          : calloutType === "IMPORTANT" ? "IMPORTANTE"
          : calloutType === "WARNING" ? "ADVERTENCIA" : "PRECAUCIÓN")
        : undefined;

      if (isGfmCallout) {
        sections.push({
          type: "callout",
          calloutType,
          calloutTitle,
          calloutTokens: parseAdvancedInlineFormatting(fullCalloutText),
        });
      } else {
        // Cita o Blockquote simple
        sections.push({
          type: "blockquote",
          inlineTokens: parseAdvancedInlineFormatting(fullCalloutText || trimmed.replace(/^>\s*/, "")),
        });
      }
      continue;
    }

    // 9. Encabezados (# H1, ## H2, ### H3, #### H4, ##### H5, ###### H6)
    if (trimmed.startsWith("#")) {
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      const h2Match = trimmed.match(/^##\s+(.+)$/);
      const h3Match = trimmed.match(/^###\s+(.+)$/);
      const h4Match = trimmed.match(/^####\s+(.+)$/);
      const h5Match = trimmed.match(/^#####\s+(.+)$/);
      const h6Match = trimmed.match(/^######+\s+(.+)$/);

      if (h1Match) {
        sections.push({ type: "h1", title: cleanPdfText(h1Match[1]) });
        i++;
        continue;
      }
      if (h2Match) {
        sections.push({ type: "h2", title: cleanPdfText(h2Match[1]) });
        i++;
        continue;
      }
      if (h3Match) {
        sections.push({ type: "h3", title: cleanPdfText(h3Match[1]) });
        i++;
        continue;
      }
      if (h4Match) {
        sections.push({ type: "h4", title: cleanPdfText(h4Match[1]) });
        i++;
        continue;
      }
      if (h5Match) {
        sections.push({ type: "h5", title: cleanPdfText(h5Match[1]) });
        i++;
        continue;
      }
      if (h6Match) {
        sections.push({ type: "h6", title: cleanPdfText(h6Match[1]) });
        i++;
        continue;
      }
    }

    // 10. Tablas GFM (| Header 1 | Header 2 |) con formateo inline dentro de celdas
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const splitRow = (rowStr: string): InlineToken[][] => {
          const cells = rowStr.slice(1, -1).split("|");
          return cells.map(cell => parseAdvancedInlineFormatting(cell.trim()));
        };

        const headers = splitRow(tableLines[0]);
        // Ignorar fila separadora |---|---|
        const dataRows = tableLines.slice(2).map(splitRow);

        sections.push({
          type: "table",
          tableHeaders: headers,
          tableRows: dataRows,
        });
        continue;
      }
    }

    // 11. Checklists / Task lists (- [ ] tarea o - [x] completada)
    if (/^[\*\-\+]\s+\[([ xX])\]\s+/.test(trimmed)) {
      const tasks: TaskItem[] = [];
      while (i < rawLines.length && /^[\*\-\+]\s+\[([ xX])\]\s+/.test(rawLines[i].trim())) {
        const match = rawLines[i].trim().match(/^[\*\-\+]\s+\[([ xX])\]\s+(.+)$/);
        if (match) {
          const checked = match[1].toLowerCase() === "x";
          tasks.push({
            checked,
            inlineTokens: parseAdvancedInlineFormatting(match[2].trim()),
          });
        }
        i++;
      }

      sections.push({
        type: "task-list",
        taskItems: tasks,
      });
      continue;
    }

    // 12. Listas ordenadas (1. , 2. )
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const items: ListItem[] = [];
      let itemNum = 1;

      while (i < rawLines.length && /^\d+[\.\)]\s+/.test(rawLines[i].trim())) {
        const match = rawLines[i].trim().match(/^(\d+)[\.\)]\s+(.+)$/);
        if (match) {
          items.push({
            number: parseInt(match[1]) || itemNum,
            inlineTokens: parseAdvancedInlineFormatting(match[2].trim())
          });
          itemNum++;
        }
        i++;
      }

      sections.push({
        type: "ordered-list",
        items,
      });
      continue;
    }

    // 13. Listas no ordenadas (- , * , + ) con soporte para sub-niveles
    if (/^[\*\-\+]\s+/.test(trimmed)) {
      const items: ListItem[] = [];

      while (i < rawLines.length && /^[\*\-\+]\s+/.test(rawLines[i].trim())) {
        const rawItemLine = rawLines[i];
        // Calcular nivel de indentación
        const leadingSpaces = rawItemLine.search(/\S|$/);
        const level = leadingSpaces >= 4 ? 2 : leadingSpaces >= 2 ? 1 : 0;
        const itemText = rawItemLine.trim().replace(/^[\*\-\+]\s+/, "");

        items.push({
          level,
          inlineTokens: parseAdvancedInlineFormatting(itemText)
        });
        i++;
      }

      sections.push({
        type: "list",
        items,
      });
      continue;
    }

    // 14. Párrafos de texto continuo
    const paragraphLines: string[] = [];
    while (
      i < rawLines.length && 
      rawLines[i].trim() && 
      !rawLines[i].trim().startsWith("#") &&
      !rawLines[i].trim().startsWith("```") &&
      !rawLines[i].trim().startsWith(">") &&
      !rawLines[i].trim().startsWith("$$") &&
      !rawLines[i].trim().startsWith(":::kpi") &&
      !rawLines[i].trim().startsWith(":::signatures") &&
      rawLines[i].trim() !== "---pagebreak---" &&
      rawLines[i].trim() !== "\\pagebreak" &&
      !/^[\*\-\+]\s+/.test(rawLines[i].trim()) &&
      !/^\d+[\.\)]\s+/.test(rawLines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(rawLines[i].trim()) &&
      !(rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|"))
    ) {
      paragraphLines.push(rawLines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      const fullParagraph = paragraphLines.join(" ");
      sections.push({
        type: "paragraph",
        inlineTokens: parseAdvancedInlineFormatting(fullParagraph),
      });
    }
  }

  return sections;
}
