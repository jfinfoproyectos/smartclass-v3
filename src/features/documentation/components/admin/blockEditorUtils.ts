import { Block } from "../BlockComponents";

export type { Block };

// Compile GFM Markdown to structured Block array
export const markdownToBlocks = (md: string): Block[] => {
  const blocks: Block[] = [];
  if (!md) return blocks;
  const lines = md.split("\n");
  let i = 0;
  const listPattern = /^(\s*)([-*+]|\d+\.)\s+(.*)/;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // 0. Custom comment JSON blocks
    if (line.trim().startsWith("<!--")) {
      const typeMatch = line.trim().match(/^<!--\s*(\w+)/);
      if (typeMatch) {
        const blockType = typeMatch[1];
        const commentLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().endsWith("-->")) {
          commentLines.push(lines[i]);
          i++;
        }
        if (i < lines.length && lines[i].trim().endsWith("-->")) {
          const lastLine = lines[i].trim().replace(/-->$/, "").trim();
          if (lastLine) commentLines.push(lastLine);
        }
        i++;
        try {
          const blockData = JSON.parse(commentLines.join("\n"));
          blocks.push({ id: Math.random().toString(36).substring(2, 9), type: blockType as Block["type"], data: blockData });
          continue;
        } catch (e) {
          console.warn("Failed to parse custom comment block JSON:", e);
        }
      }
    }

    // 1. Fenced Code Block
    if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
      const fence = line.trim().substring(0, 3);
      const match = line.trim().match(/^(?:```|~~~)\s*([\w\-+:]*)/);
      let language = "javascript";
      let title = "";
      if (match && match[1]) {
        const parts = match[1].split(":");
        language = parts[0] || "javascript";
        title = parts[1] || "";
      }
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing fence
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "code",
        data: { code: codeLines.join("\n"), language, title }
      });
      continue;
    }

    // 2. Horizontal Rule / Divider (---, ***, ___)
    if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "divider",
        data: {}
      });
      i++;
      continue;
    }

    // 3. Setext Headings (Line followed by === or ---)
    if (i + 1 < lines.length && /^\s*={3,}\s*$/.test(lines[i + 1])) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "header",
        data: { title: line.trim(), level: "h1", align: "left" }
      });
      i += 2;
      continue;
    }
    if (i + 1 < lines.length && /^\s*-{3,}\s*$/.test(lines[i + 1]) && !line.trim().startsWith("-")) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "header",
        data: { title: line.trim(), level: "h2", align: "left" }
      });
      i += 2;
      continue;
    }

    // 4. ATX Headings (# h1, ## h2, ### h3, #### h4, ##### h5, ###### h6)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const levelNum = headerMatch[1].length;
      const level = levelNum === 1 ? "h1" : levelNum === 2 ? "h2" : "h3";
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "header",
        data: { title: headerMatch[2].trim(), level, align: "left" }
      });
      i++;
      continue;
    }

    // 5. Blockquote / GitHub Alerts (> quote, > [!NOTE], etc.)
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      let alertStyle = "info";
      let alertTitle = "";

      while (i < lines.length && lines[i].trim().startsWith(">")) {
        const qLine = lines[i].trim().replace(/^>\s?/, "");
        if (qLine.startsWith("[!")) {
          const matchAlert = qLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
          if (matchAlert) {
            const type = matchAlert[1].toUpperCase();
            alertTitle = type;
            if (type === "WARNING") alertStyle = "warning";
            else if (type === "CAUTION") alertStyle = "danger";
            else if (type === "TIP") alertStyle = "success";
            else alertStyle = "info";
            i++;
            continue;
          }
        }
        quoteLines.push(qLine);
        i++;
      }

      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "callout",
        data: { style: alertStyle, title: alertTitle, text: quoteLines.join("\n") }
      });
      continue;
    }

    // 6. GFM Tables
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const isSeparator = /^\|[\s-:-|]+\|?$/.test(tableLines[1]);
        if (isSeparator) {
          const parseRow = (rowStr: string) => {
            const cells = rowStr.split("|");
            if (cells.length > 1 && cells[0].trim() === "") cells.shift();
            if (cells.length > 0 && cells[cells.length - 1].trim() === "") cells.pop();
            return cells.map(c => c.trim());
          };

          const headers = parseRow(tableLines[0]);
          const rows: string[][] = [];
          for (let k = 2; k < tableLines.length; k++) {
            rows.push(parseRow(tableLines[k]));
          }

          blocks.push({
            id: Math.random().toString(36).substring(2, 9),
            type: "table",
            data: { headers, rows }
          });
          continue;
        }
      }
    }

    // 7. GFM Lists (Ordered, Unordered, Task lists, Indented items)
    if (listPattern.test(line)) {
      const listItems: { text: string; checked?: boolean; indent?: number }[] = [];
      let isOrdered = false;

      while (i < lines.length && listPattern.test(lines[i])) {
        const itemLine = lines[i];
        const match = itemLine.match(listPattern);
        if (match) {
          const indentStr = match[1] || "";
          const bullet = match[2];
          let text = match[3].trim();
          const indent = Math.floor(indentStr.length / 2);

          if (/^\d+\./.test(bullet)) isOrdered = true;
          let checked: boolean | undefined = undefined;
          if (text.startsWith("[ ]")) {
            checked = false;
            text = text.substring(3).trim();
          } else if (text.startsWith("[x]") || text.startsWith("[X]")) {
            checked = true;
            text = text.substring(3).trim();
          }

          listItems.push({ text, checked, indent });
        }
        i++;
      }

      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "list",
        data: { items: listItems, ordered: isOrdered }
      });
      continue;
    }

    // 8. Standalone Image
    const imgPattern = /^!\[(.*?)\]\((.*?)\)$/;
    if (imgPattern.test(line.trim())) {
      const match = line.trim().match(imgPattern);
      if (match) {
        blocks.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "image",
          data: { alt: match[1], url: match[2] }
        });
        i++;
        continue;
      }
    }

    // 9. Paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("~~~") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !/^(\s*[-*_]){3,}\s*$/.test(lines[i]) &&
      !listPattern.test(lines[i]) &&
      !lines[i].match(/^#{1,6}\s+/) &&
      !imgPattern.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("<!--")
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        id: Math.random().toString(36).substring(2, 9),
        type: "paragraph",
        data: { text: pLines.join("\n") }
      });
    } else {
      i++;
    }
  }

  return blocks;
};

// Compile blocks back to a clean Markdown document string
export const blocksToMarkdown = (blocksArray: Block[]): string => {
  return blocksArray.map(block => {
    const { type, data } = block;
    switch (type) {
      case "divider": return "---";
      case "header": {
        const prefix = data.level === "h2" ? "##" : data.level === "h3" ? "###" : "#";
        let out = `${prefix} ${data.title}`;
        if (data.subtitle) out += `\n_${data.subtitle}_`;
        return out;
      }
      case "paragraph": return data.text;
      case "callout": {
        const stylePrefix = data.style === "warning" ? "WARNING" : data.style === "danger" ? "CAUTION" : data.style === "success" ? "TIP" : "NOTE";
        const titleLine = data.title ? ` [!${stylePrefix}]\n> **${data.title}**` : ` [!${stylePrefix}]`;
        const bodyLines = (data.text || "").split("\n").map((l: string) => `> ${l}`).join("\n");
        return `>${titleLine}\n${bodyLines}`;
      }
      case "code": {
        if ((data.tabs && data.tabs.length > 0) || data.highlightLines) {
          return `<!-- code\n${JSON.stringify({ title: data.title, language: data.language, code: data.code, tabs: data.tabs, highlightLines: data.highlightLines }, null, 2)}\n-->`;
        }
        return `\`\`\`${data.language || "javascript"}${data.title ? `:${data.title}` : ""}\n${data.code || ""}\n\`\`\``;
      }
      case "quiz": return `<!-- quiz\n${JSON.stringify({ question: data.question, options: data.options, correctIndex: data.correctIndex, explanation: data.explanation }, null, 2)}\n-->`;
      case "card": return `<!-- card\n${JSON.stringify({ title: data.title, description: data.description, url: data.url, icon: data.icon }, null, 2)}\n-->`;
      case "accordion": return `<!-- accordion\n${JSON.stringify({ items: data.items }, null, 2)}\n-->`;
      case "featureGrid": return `<!-- featureGrid\n${JSON.stringify({ columns: data.columns, items: data.items }, null, 2)}\n-->`;
      case "stepList": return `<!-- stepList\n${JSON.stringify({ steps: data.steps }, null, 2)}\n-->`;
      case "aiPrompt": return `<!-- aiPrompt\n${JSON.stringify({ promptText: data.promptText, buttonText: data.buttonText, helperText: data.helperText }, null, 2)}\n-->`;
      case "table": {
        const headers = data.headers || [];
        const rows = data.rows || [];
        const headerRow = `| ${headers.join(" | ")} |`;
        const sepRow = `| ${headers.map(() => "---").join(" | ")} |`;
        const dataRows = rows.map((row: string[]) => `| ${row.join(" | ")} |`).join("\n");
        return `${headerRow}\n${sepRow}\n${dataRows}`;
      }
      case "list": {
        const items = data.items || [];
        return items.map((item: { text: string; checked?: boolean; indent?: number }, idx: number) => {
          const indentStr = "  ".repeat(item.indent || 0);
          const prefix = data.ordered ? `${idx + 1}.` : "-";
          if (item.checked !== undefined) return `${indentStr}${prefix} [${item.checked ? "x" : " "}] ${item.text}`;
          return `${indentStr}${prefix} ${item.text}`;
        }).join("\n");
      }
      case "image": {
        if (data.align || data.width || data.radius) {
          return `<!-- image\n${JSON.stringify({ url: data.url, alt: data.alt, align: data.align, width: data.width, radius: data.radius }, null, 2)}\n-->`;
        }
        return `![${data.alt || "Imagen"}](${data.url})`;
      }
      case "video": return `<!-- video\n${JSON.stringify({ url: data.url, caption: data.caption }, null, 2)}\n-->`;
      case "carousel": return `<!-- carousel\n${JSON.stringify({ items: data.items, autoplay: data.autoplay, interval: data.interval, width: data.width, align: data.align, transitionEffect: data.transitionEffect }, null, 2)}\n-->`;
      case "codeExplain": return `<!-- codeExplain\n${JSON.stringify({ code: data.code, language: data.language, steps: data.steps, tabs: data.tabs }, null, 2)}\n-->`;
      case "flashcard": {
        const cards = data.cards || [{ frontText: data.frontText, backText: data.backText, hint: data.hint }];
        return `<!-- flashcard\n${JSON.stringify({ cards }, null, 2)}\n-->`;
      }
      case "timeline": return `<!-- timeline\n${JSON.stringify({ items: data.items }, null, 2)}\n-->`;
      case "matching": return `<!-- matching\n${JSON.stringify({ pairs: data.pairs }, null, 2)}\n-->`;
      case "embed": return `<!-- embed\n${JSON.stringify({ url: data.url, height: data.height, caption: data.caption }, null, 2)}\n-->`;
      case "pdf": return `<!-- pdf\n${JSON.stringify({ url: data.url, height: data.height, title: data.title }, null, 2)}\n-->`;
      case "mermaid": return `<!-- mermaid\n${JSON.stringify({ chart: data.chart }, null, 2)}\n-->`;
      default: return "";
    }
  }).join("\n\n");
};

// Default initial data per block type
export const getInitialBlockData = (type: Block["type"]): Record<string, unknown> => {
  switch (type) {
    case "header": return { title: "Nuevo Título", subtitle: "", level: "h1", align: "left" };
    case "paragraph": return { text: "Escribe tu contenido aquí..." };
    case "callout": return { style: "info", title: "Nota importante", text: "Detalles del aviso..." };
    case "code": return { title: "", language: "javascript", code: "// escribe tu código aquí", tabs: [], highlightLines: "" };
    case "quiz": return { question: "¿Cuál es la respuesta correcta?", options: ["Opción A", "Opción B", "Opción C", "Opción D"], correctIndex: 0, explanation: "Explicación de la respuesta." };
    case "card": return { title: "Enlace útil", description: "Descripción del sitio", url: "https://google.com", icon: "Link" };
    case "accordion": return { items: [{ title: "Pregunta frecuente 1", content: "Respuesta detallada 1." }] };
    case "featureGrid": return { columns: 2, items: [{ title: "Característica 1", text: "Detalle rápido 1.", icon: "Sparkles" }, { title: "Característica 2", text: "Detalle rápido 2.", icon: "Code2" }] };
    case "stepList": return { steps: [{ title: "Paso 1: Configurar", text: "Haz esto primero." }, { title: "Paso 2: Compilar", text: "Haz esto segundo." }] };
    case "codeExplain": return { language: "kotlin", code: "val planetas = arrayOf(\"Mercurio\", \"Venus\")\nfor (p in planetas) {\n  println(p)\n}", steps: [{ title: "Definición del Arreglo", content: "Declaramos un arreglo de planetas.", lines: "1" }, { title: "Bucle for", content: "Iteramos sobre el arreglo e imprimimos.", lines: "2-4" }] };
    case "flashcard": return { cards: [{ frontText: "Pregunta o término de estudio", backText: "Respuesta detallada o explicación del concepto", hint: "Pista de ayuda opcional" }] };
    case "timeline": return { items: [{ title: "Hito 1: Fundamentos", description: "Explicación del primer paso en el mapa de ruta.", completed: true }, { title: "Hito 2: Desarrollo", description: "Explicación del segundo paso en el mapa de ruta.", completed: false }] };
    case "matching": return { pairs: [{ id: "1", premise: "Concepto A", definition: "Definición correspondiente al concepto A." }, { id: "2", premise: "Concepto B", definition: "Definición correspondiente al concepto B." }] };
    case "embed": return { url: "https://codepen.io/pen/", height: 450, caption: "Ejemplo de simulación interactiva" };
    case "pdf": return { url: "", height: 650, title: "Documento de Lectura PDF" };
    case "mermaid": return { chart: "graph TD\n  A[Inicio] --> B(Proceso)\n  B --> C{¿Correcto?}\n  C -- Sí --> D[Fin]\n  C -- No --> B" };
    case "aiPrompt": return { promptText: "¿Quieres profundizar en este tema?", buttonText: "Preguntar al Asistente IA", helperText: "Presiona para obtener explicaciones y resúmenes hechos por inteligencia artificial." };
    case "image": return { url: "", alt: "Descripción de la imagen" };
    case "video": return { url: "", caption: "Título o leyenda del video" };
    case "carousel": return { items: [{ url: "", caption: "Foto 1" }, { url: "", caption: "Foto 2" }], autoplay: false, interval: 5, width: "large", align: "center", transitionEffect: "fade" };
    case "list": return { ordered: false, items: [{ text: "Elemento 1" }, { text: "Elemento 2" }] };
    case "table": return { headers: ["Cabecera 1", "Cabecera 2"], rows: [["Celda A1", "Celda A2"], ["Celda B1", "Celda B2"]] };
    case "divider": return {};
    default: return {};
  }
};
