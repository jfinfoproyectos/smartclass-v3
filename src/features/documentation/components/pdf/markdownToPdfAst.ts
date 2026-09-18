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

export interface CodeThemeConfig {
  id: string;
  name: string;
  bg: string;
  headerBg: string;
  border: string;
  lineNumbers: string;
  text: string;
  tokens: Record<string, string>;
}

// 10 Paletas de temas de código soportadas para impresión y PDF
export const CODE_THEME_PALETTES: Record<string, CodeThemeConfig> = {
  "one-dark-pro": {
    id: "one-dark-pro",
    name: "One Dark Pro",
    bg: "#282c34",
    headerBg: "#21252b",
    border: "#1e2024",
    lineNumbers: "#5c6370",
    text: "#abb2bf",
    tokens: {
      keyword: "#c678dd",
      string: "#98c379",
      "template-string": "#98c379",
      char: "#98c379",
      function: "#61afef",
      "class-name": "#e5c07b",
      number: "#d19a66",
      boolean: "#d19a66",
      comment: "#7f848e",
      operator: "#56b6c2",
      punctuation: "#abb2bf",
      property: "#e06c75",
      variable: "#e06c75",
      constant: "#d19a66",
      tag: "#e06c75",
      "attr-name": "#d19a66",
      "attr-value": "#98c379",
      builtin: "#e5c07b",
      regex: "#98c379",
      annotation: "#e5c07b",
      selector: "#c678dd",
      important: "#c678dd",
      default: "#abb2bf",
    },
  },
  "github-dark": {
    id: "github-dark",
    name: "GitHub Dark",
    bg: "#0d1117",
    headerBg: "#161b22",
    border: "#30363d",
    lineNumbers: "#8b949e",
    text: "#c9d1d9",
    tokens: {
      keyword: "#ff7b72",
      string: "#a5d6ff",
      "template-string": "#a5d6ff",
      char: "#a5d6ff",
      function: "#d2a8ff",
      "class-name": "#ffa657",
      number: "#79c0ff",
      boolean: "#79c0ff",
      comment: "#8b949e",
      operator: "#ff7b72",
      punctuation: "#c9d1d9",
      property: "#79c0ff",
      variable: "#79c0ff",
      constant: "#79c0ff",
      tag: "#7ee787",
      "attr-name": "#79c0ff",
      "attr-value": "#a5d6ff",
      builtin: "#ffa657",
      regex: "#7ee787",
      annotation: "#ffa657",
      selector: "#7ee787",
      important: "#ff7b72",
      default: "#c9d1d9",
    },
  },
  "github-light": {
    id: "github-light",
    name: "GitHub Light",
    bg: "#f6f8fa",
    headerBg: "#eaeef2",
    border: "#d0d7de",
    lineNumbers: "#57606a",
    text: "#24292f",
    tokens: {
      keyword: "#cf222e",
      string: "#0a3069",
      "template-string": "#0a3069",
      char: "#0a3069",
      function: "#8250df",
      "class-name": "#953800",
      number: "#0550ae",
      boolean: "#0550ae",
      comment: "#6e7781",
      operator: "#cf222e",
      punctuation: "#24292f",
      property: "#0550ae",
      variable: "#0550ae",
      constant: "#0550ae",
      tag: "#116329",
      "attr-name": "#0550ae",
      "attr-value": "#0a3069",
      builtin: "#953800",
      regex: "#116329",
      annotation: "#953800",
      selector: "#116329",
      important: "#cf222e",
      default: "#24292f",
    },
  },
  "dracula": {
    id: "dracula",
    name: "Dracula",
    bg: "#282a36",
    headerBg: "#191a21",
    border: "#44475a",
    lineNumbers: "#6272a4",
    text: "#f8f8f2",
    tokens: {
      keyword: "#ff79c6",
      string: "#f1fa8c",
      "template-string": "#f1fa8c",
      char: "#f1fa8c",
      function: "#50fa7b",
      "class-name": "#8be9fd",
      number: "#bd93f9",
      boolean: "#bd93f9",
      comment: "#6272a4",
      operator: "#ff79c6",
      punctuation: "#f8f8f2",
      property: "#8be9fd",
      variable: "#f8f8f2",
      constant: "#bd93f9",
      tag: "#ff79c6",
      "attr-name": "#50fa7b",
      "attr-value": "#f1fa8c",
      builtin: "#8be9fd",
      regex: "#f1fa8c",
      annotation: "#bd93f9",
      selector: "#50fa7b",
      important: "#ff79c6",
      default: "#f8f8f2",
    },
  },
  "nord": {
    id: "nord",
    name: "Nord",
    bg: "#2e3440",
    headerBg: "#242933",
    border: "#3b4252",
    lineNumbers: "#4c566a",
    text: "#d8dee9",
    tokens: {
      keyword: "#81a1c1",
      string: "#a3be8c",
      "template-string": "#a3be8c",
      char: "#a3be8c",
      function: "#88c0d0",
      "class-name": "#8fbcbb",
      number: "#b48ead",
      boolean: "#b48ead",
      comment: "#4c566a",
      operator: "#81a1c1",
      punctuation: "#e5e9f0",
      property: "#8fbcbb",
      variable: "#d8dee9",
      constant: "#b48ead",
      tag: "#81a1c1",
      "attr-name": "#8fbcbb",
      "attr-value": "#a3be8c",
      builtin: "#8fbcbb",
      regex: "#ebcb8b",
      annotation: "#d08770",
      selector: "#81a1c1",
      important: "#bf616a",
      default: "#d8dee9",
    },
  },
  "tokyo-night": {
    id: "tokyo-night",
    name: "Tokyo Night",
    bg: "#1a1b26",
    headerBg: "#16161e",
    border: "#24283b",
    lineNumbers: "#565f89",
    text: "#a9b1d6",
    tokens: {
      keyword: "#9abdf5",
      string: "#9ece6a",
      "template-string": "#9ece6a",
      char: "#9ece6a",
      function: "#7aa2f7",
      "class-name": "#2ac3de",
      number: "#ff9e64",
      boolean: "#ff9e64",
      comment: "#565f89",
      operator: "#89ddff",
      punctuation: "#a9b1d6",
      property: "#7ad5f7",
      variable: "#c0caf5",
      constant: "#ff9e64",
      tag: "#f7768e",
      "attr-name": "#7aa2f7",
      "attr-value": "#9ece6a",
      builtin: "#2ac3de",
      regex: "#b4f9f8",
      annotation: "#ff9e64",
      selector: "#bb9af7",
      important: "#f7768e",
      default: "#a9b1d6",
    },
  },
  "ayu-dark": {
    id: "ayu-dark",
    name: "Ayu Dark",
    bg: "#0a0e14",
    headerBg: "#0f1419",
    border: "#1f2430",
    lineNumbers: "#62605c",
    text: "#b3b1ad",
    tokens: {
      keyword: "#ff7733",
      string: "#c2d94c",
      "template-string": "#c2d94c",
      char: "#c2d94c",
      function: "#ffb454",
      "class-name": "#59c2ff",
      number: "#95e6cb",
      boolean: "#95e6cb",
      comment: "#5c6773",
      operator: "#f29718",
      punctuation: "#b3b1ad",
      property: "#39bae6",
      variable: "#e6b450",
      constant: "#ffee99",
      tag: "#39bae6",
      "attr-name": "#ffb454",
      "attr-value": "#c2d94c",
      builtin: "#59c2ff",
      regex: "#95e6cb",
      annotation: "#ff7733",
      selector: "#ffb454",
      important: "#f07178",
      default: "#b3b1ad",
    },
  },
  "one-light": {
    id: "one-light",
    name: "One Light",
    bg: "#fafafa",
    headerBg: "#f0f0f0",
    border: "#e5e5e6",
    lineNumbers: "#a0a1a7",
    text: "#383a42",
    tokens: {
      keyword: "#a626a4",
      string: "#50a14f",
      "template-string": "#50a14f",
      char: "#50a14f",
      function: "#4078f2",
      "class-name": "#c18401",
      number: "#986801",
      boolean: "#986801",
      comment: "#a0a1a7",
      operator: "#0184bc",
      punctuation: "#383a42",
      property: "#e45649",
      variable: "#e45649",
      constant: "#986801",
      tag: "#e45649",
      "attr-name": "#986801",
      "attr-value": "#50a14f",
      builtin: "#c18401",
      regex: "#50a14f",
      annotation: "#a626a4",
      selector: "#4078f2",
      important: "#e45649",
      default: "#383a42",
    },
  },
  "monokai": {
    id: "monokai",
    name: "Monokai",
    bg: "#272822",
    headerBg: "#1e1f1c",
    border: "#3e3d32",
    lineNumbers: "#75715e",
    text: "#f8f8f2",
    tokens: {
      keyword: "#f92672",
      string: "#e6db74",
      "template-string": "#e6db74",
      char: "#e6db74",
      function: "#a6e22e",
      "class-name": "#66d9ef",
      number: "#ae81ff",
      boolean: "#ae81ff",
      comment: "#75715e",
      operator: "#f92672",
      punctuation: "#f8f8f2",
      property: "#fd971f",
      variable: "#f8f8f2",
      constant: "#ae81ff",
      tag: "#f92672",
      "attr-name": "#a6e22e",
      "attr-value": "#e6db74",
      builtin: "#66d9ef",
      regex: "#e6db74",
      annotation: "#ae81ff",
      selector: "#a6e22e",
      important: "#f92672",
      default: "#f8f8f2",
    },
  },
  "catppuccin-mocha": {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    bg: "#1e1e2e",
    headerBg: "#11111b",
    border: "#313244",
    lineNumbers: "#585b70",
    text: "#cdd6f4",
    tokens: {
      keyword: "#cba6f7",
      string: "#a6e3a1",
      "template-string": "#a6e3a1",
      char: "#a6e3a1",
      function: "#89b4fa",
      "class-name": "#f9e2af",
      number: "#fab387",
      boolean: "#fab387",
      comment: "#6c7086",
      operator: "#89dceb",
      punctuation: "#cdd6f4",
      property: "#f38ba8",
      variable: "#cdd6f4",
      constant: "#fab387",
      tag: "#f38ba8",
      "attr-name": "#89b4fa",
      "attr-value": "#a6e3a1",
      builtin: "#f9e2af",
      regex: "#f5c2e7",
      annotation: "#cba6f7",
      selector: "#89b4fa",
      important: "#f38ba8",
      default: "#cdd6f4",
    },
  },
};

// Retrocompatibilidad con TOKEN_COLORS
export const TOKEN_COLORS: Record<string, string> = CODE_THEME_PALETTES["one-dark-pro"].tokens;

export function getCodeThemePalette(themeId?: string): CodeThemeConfig {
  if (!themeId) return CODE_THEME_PALETTES["one-dark-pro"];
  const id = themeId.toLowerCase().trim();
  return CODE_THEME_PALETTES[id] || CODE_THEME_PALETTES["one-dark-pro"];
}

export function getTokenColor(type?: string, codeTheme?: CodeThemeConfig | string): string {
  const palette = typeof codeTheme === "object" && codeTheme !== null
    ? codeTheme 
    : getCodeThemePalette(typeof codeTheme === "string" ? codeTheme : undefined);

  if (!type) return palette.tokens.default || palette.text;
  if (palette.tokens[type]) return palette.tokens[type];
  const parts = type.split(/\s+/);
  for (const p of parts) {
    if (palette.tokens[p]) return palette.tokens[p];
  }
  return palette.tokens.default || palette.text;
}

// Mapeo de acentos primarios de los 25 temas de la aplicación
export const THEME_ACCENTS: Record<string, string> = {
  "ocean-breeze": "#0d9488",
  "clean-slate": "#475569",
  "cyberpunk": "#f43f5e",
  "dracula": "#bd93f9",
  "interstellar": "#6366f1",
  "nature": "#16a34a",
  "tokyo-night": "#7aa2f7",
  "claude": "#d97706",
  "caffeine": "#b45309",
  "dark-academia": "#78350f",
  "deus-ex": "#ca8a04",
  "dune": "#ea580c",
  "elegant-luxury": "#e11d48",
  "marshmallow": "#ec4899",
  "matcha-zen": "#65a30d",
  "matrix": "#10b981",
  "nordic-frost": "#0284c7",
  "notebook": "#d97706",
  "perplexity": "#06b6d4",
  "punk-runner": "#e11d48",
  "slack": "#611f69",
  "summer": "#f59e0b",
  "supabase": "#22c55e",
  "synthwave-80s": "#d946ef",
  "vs-code": "#007acc",
  "zinc": "#52525b",
};

/**
 * Convierte un color en formato HSL, RGB o Hex a una representación Hexadecimal (#RRGGBB) válida para React-PDF.
 */
export function parseColorToHex(colorStr?: string, fallback = "#0d9488"): string {
  if (!colorStr) return fallback;
  const str = colorStr.trim();
  if (str.startsWith("#")) {
    if (str.length === 4) {
      return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
    }
    return str.slice(0, 7);
  }

  // Soporte HSL: hsl(210 100% 50%) o hsl(210, 100%, 50%)
  const hslMatch = str.match(/hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  return fallback;
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
