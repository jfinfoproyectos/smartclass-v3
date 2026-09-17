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
import "prismjs/components/prism-yaml";

// Palette One Dark Pro optimizada para impresión y lectura editorial de alta nitidez
export const TOKEN_COLORS: Record<string, string> = {
  keyword: "#c678dd",         // Magenta/Purple (fun, val, var, class, return, import)
  string: "#98c379",          // Green
  "template-string": "#98c379",
  char: "#98c379",
  function: "#61afef",        // Blue
  "class-name": "#e5c07b",    // Yellow/Gold
  number: "#d19a66",          // Orange
  boolean: "#d19a66",         // Orange
  comment: "#7f848e",         // Muted gray
  operator: "#56b6c2",        // Cyan
  punctuation: "#abb2bf",     // Light gray
  property: "#e06c75",        // Red/Coral
  variable: "#e06c75",
  constant: "#d19a66",
  tag: "#e06c75",             // HTML/XML
  "attr-name": "#d19a66",
  "attr-value": "#98c379",
  builtin: "#e5c07b",
  regex: "#98c379",
  annotation: "#e5c07b",
  selector: "#c678dd",
  important: "#c678dd",
  default: "#abb2bf",
};

export function getTokenColor(type?: string): string {
  if (!type) return TOKEN_COLORS.default;
  if (TOKEN_COLORS[type]) return TOKEN_COLORS[type];
  const parts = type.split(/\s+/);
  for (const p of parts) {
    if (TOKEN_COLORS[p]) return TOKEN_COLORS[p];
  }
  return TOKEN_COLORS.default;
}

export interface CodeToken {
  text: string;
  type?: string;
}

export interface CodeLine {
  lineNumber: number;
  tokens: CodeToken[];
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

export function getPrismGrammar(lang?: string) {
  if (!lang) return Prism.languages.javascript || Prism.languages.clike;
  const l = lang.toLowerCase().trim();
  const aliasMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    kt: "kotlin",
    kts: "kotlin",
    py: "python",
    python3: "python",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    html: "markup",
    xml: "markup",
    svg: "markup",
    yml: "yaml",
    json: "json",
    sql: "sql",
    java: "java",
    cpp: "cpp",
    c: "c",
  };
  const target = aliasMap[l] || l;
  return Prism.languages[target] || Prism.languages.clike || Prism.languages.javascript;
}

/**
 * Tokeniza código en líneas y tokens preservando indentación y caracteres.
 */
export function tokenizeCodeToLines(code: string, language?: string): CodeLine[] {
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

  const lines: CodeLine[] = [];
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

/**
 * Limpia caracteres emoji, selectores de variación y glifos Unicode no soportados
 * por fuentes PDF estándar (Type 1 Helvetica/Courier), evitando caracteres rotos y superposiciones.
 */
export function cleanPdfText(text: string): string {
  if (!text) return "";
  return text
    // Emojis, símbolos extendidos Unicode, dingbats, caracteres de control
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200B}-\u{200F}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Token inline para párrafos con formato enriquecido (bold, italic, inline code)
export interface InlineToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export function parseInlineFormatting(text: string): InlineToken[] {
  if (!text) return [];

  const sanitized = cleanPdfText(text);
  if (!sanitized) return [];

  // Regex para detectar `código`, **negrita**, *cursiva*, __negrita__, _cursiva_, y [enlace](url)
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[[^\]]+\]\([^\)]+\))/g;
  const parts = sanitized.split(pattern);
  const result: InlineToken[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      result.push({ text: part.slice(1, -1), code: true });
    } else if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      result.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      result.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      result.push({ text: part.slice(1, -1), italic: true });
    } else if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      result.push({ text: part.slice(1, -1), italic: true });
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

export type SectionType = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'paragraph' 
  | 'code' 
  | 'callout' 
  | 'list' 
  | 'ordered-list' 
  | 'table' 
  | 'image'
  | 'divider';

export interface EditorialSection {
  type: SectionType;
  title?: string;
  url?: string;
  inlineTokens?: InlineToken[];
  language?: string;
  codeLines?: CodeLine[];
  calloutType?: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';
  calloutTitle?: string;
  calloutTokens?: InlineToken[];
  items?: Array<{ number?: number; inlineTokens: InlineToken[] }>;
  tableHeaders?: string[];
  tableRows?: string[][];
}

/**
 * Parser de Markdown robusto y completo que convierte texto plano en secciones para el PDF editorial y corporativo.
 */
export function parseMarkdownToEditorialSections(markdown: string): EditorialSection[] {
  if (!markdown) return [];

  // 0. Quitar Frontmatter (YAML inicial delimitado por ---) si existe
  let cleanMarkdown = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (cleanMarkdown.trim().startsWith("---")) {
    const secondFence = cleanMarkdown.indexOf("\n---", 3);
    if (secondFence !== -1) {
      cleanMarkdown = cleanMarkdown.slice(secondFence + 4).trim();
    }
  }

  const rawLines = cleanMarkdown.split("\n");

  const sections: EditorialSection[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Líneas vacías
    if (!trimmed) {
      i++;
      continue;
    }

    // 1.1 Imagen Markdown (![alt](url))
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
    if (imgMatch) {
      sections.push({
        type: 'image',
        title: cleanPdfText(imgMatch[1]) || "Figura ilustrativa",
        url: imgMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 2. Separadores horizontales (--- o ***)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      sections.push({ type: 'divider' });
      i++;
      continue;
    }

    // 3. Bloques de código (```lang ... ```)
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
        type: 'code',
        language: language.toUpperCase(),
        codeLines: lines,
      });
      continue;
    }

    // 4. Alertas y Callouts GFM (> [!NOTE], > [!TIP], etc.) o Citas simples (> texto)
    if (trimmed.startsWith(">")) {
      let calloutType: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION' = 'NOTE';
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
        ? (calloutType === 'NOTE' ? 'NOTA CLAVE'
          : calloutType === 'TIP' ? 'CONSEJO PRÁCTICO'
          : calloutType === 'IMPORTANT' ? 'IMPORTANTE'
          : calloutType === 'WARNING' ? 'ADVERTENCIA' : 'PRECAUCIÓN')
        : undefined;

      sections.push({
        type: 'callout',
        calloutType,
        calloutTitle,
        calloutTokens: parseInlineFormatting(fullCalloutText || (isGfmCallout ? "" : trimmed.replace(/^>\s*/, ""))),
      });
      continue;
    }

    // 5. Encabezados (#, ##, ###, ####)
    if (trimmed.startsWith("#")) {
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      const h2Match = trimmed.match(/^##\s+(.+)$/);
      const h3Match = trimmed.match(/^###\s+(.+)$/);
      const h4Match = trimmed.match(/^####\s+(.+)$/);

      if (h1Match) {
        sections.push({ type: 'h1', title: cleanPdfText(h1Match[1]) });
        i++;
        continue;
      }
      if (h2Match) {
        sections.push({ type: 'h2', title: cleanPdfText(h2Match[1]) });
        i++;
        continue;
      }
      if (h3Match) {
        sections.push({ type: 'h3', title: cleanPdfText(h3Match[1]) });
        i++;
        continue;
      }
      if (h4Match) {
        sections.push({ type: 'h4', title: cleanPdfText(h4Match[1]) });
        i++;
        continue;
      }
    }

    // 6. Tablas GFM (| Header 1 | Header 2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const splitRow = (rowStr: string) => 
          rowStr.slice(1, -1).split("|").map(cell => cleanPdfText(cell));

        const headers = splitRow(tableLines[0]);
        // Ignorar fila de separadores |---|---|
        const dataRows = tableLines.slice(2).map(splitRow);

        sections.push({
          type: 'table',
          tableHeaders: headers,
          tableRows: dataRows,
        });
        continue;
      }
    }

    // 7. Listas ordenadas (1. , 2. o 1) , 2) )
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const items: Array<{ number: number; inlineTokens: InlineToken[] }> = [];
      let itemNum = 1;

      while (i < rawLines.length && /^\d+[\.\)]\s+/.test(rawLines[i].trim())) {
        const match = rawLines[i].trim().match(/^(\d+)[\.\)]\s+(.+)$/);
        if (match) {
          items.push({
            number: parseInt(match[1]) || itemNum,
            inlineTokens: parseInlineFormatting(match[2].trim())
          });
          itemNum++;
        }
        i++;
      }

      sections.push({
        type: 'ordered-list',
        items,
      });
      continue;
    }

    // 8. Listas no ordenadas (- , * , + )
    if (/^[\*\-\+]\s+/.test(trimmed)) {
      const items: Array<{ inlineTokens: InlineToken[] }> = [];

      while (i < rawLines.length && /^[\*\-\+]\s+/.test(rawLines[i].trim())) {
        const itemText = rawLines[i].trim().replace(/^[\*\-\+]\s+/, "");
        items.push({
          inlineTokens: parseInlineFormatting(itemText)
        });
        i++;
      }

      sections.push({
        type: 'list',
        items,
      });
      continue;
    }

    // 9. Párrafos normales (agrupar líneas continuas de texto)
    const paragraphLines: string[] = [];
    while (
      i < rawLines.length && 
      rawLines[i].trim() && 
      !rawLines[i].trim().startsWith("#") &&
      !rawLines[i].trim().startsWith("```") &&
      !rawLines[i].trim().startsWith(">") &&
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
        type: 'paragraph',
        inlineTokens: parseInlineFormatting(fullParagraph),
      });
    }
  }

  return sections;
}
