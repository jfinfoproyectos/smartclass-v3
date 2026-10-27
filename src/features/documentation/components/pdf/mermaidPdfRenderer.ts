"use client";

import mermaid from "mermaid";

let isMermaidInitialized = false;

function ensureMermaidInitialized() {
  if (isMermaidInitialized) return;
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      fontFamily: "Helvetica, Arial, sans-serif",
      flowchart: { useMaxWidth: false, htmlLabels: false },
      sequence: { useMaxWidth: false },
      gantt: { useMaxWidth: false },
      er: { useMaxWidth: false },
    });
    isMermaidInitialized = true;
  } catch (err) {
    console.warn("Mermaid initialize error:", err);
  }
}

/**
 * Convierte un SVG en un Data URL PNG de alta resolución usando un Canvas off-screen.
 */
export async function svgToPngDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (!svgString || typeof window === "undefined") {
        return resolve("");
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return resolve("");

      let width = 700;
      let height = 350;

      const viewBox = svgEl.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      } else {
        const wAttr = parseFloat(svgEl.getAttribute("width") || "0");
        const hAttr = parseFloat(svgEl.getAttribute("height") || "0");
        if (wAttr > 0) width = wAttr;
        if (hAttr > 0) height = hAttr;
      }

      // Asegurar atributos estándar requeridos
      svgEl.setAttribute("width", `${width}`);
      svgEl.setAttribute("height", `${height}`);
      if (!svgEl.getAttribute("xmlns")) {
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const cleanSvg = new XMLSerializer().serializeToString(svgEl);
      const svgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(cleanSvg);

      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeoutId = setTimeout(() => {
        // Fallback a URI de SVG si la carga tarda más de 2 segundos
        resolve(svgDataUri);
      }, 2500);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const scale = 2; // Alta resolución para impresión PDF nítida
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(Math.round(width * scale), 200);
          canvas.height = Math.max(Math.round(height * scale), 100);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(svgDataUri);
          }

          // Fondo blanco para contraste perfecto en documento corporativo
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          resolve(pngUrl);
        } catch {
          resolve(svgDataUri);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(svgDataUri);
      };

      img.src = svgDataUri;
    } catch (err) {
      console.warn("svgToPngDataUrl failed:", err);
      resolve("");
    }
  });
}

/**
 * Extrae todas las definiciones de diagramas Mermaid presentes en el markdown,
 * soportando tanto bloques ```mermaid como bloques comentados <!-- mermaid ... -->
 * que contengan flechas '-->' dentro del contenido del gráfico sin cortar prematuramente.
 */
export function extractMermaidChartsFromMarkdown(markdown: string): string[] {
  const charts: string[] = [];
  if (!markdown) return charts;

  // 1. Extraer diagramas de bloques de código estándar: ```mermaid ... ```
  const codeBlockRegex = /```mermaid\s*\n([\s\S]*?)\n```/gi;
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(markdown)) !== null) {
    if (codeMatch[1]?.trim()) {
      charts.push(codeMatch[1].trim());
    }
  }

  // 2. Extraer diagramas de bloques comentados: <!-- mermaid ... -->
  const commentStartRegex = /<!--\s*mermaid\b/gi;
  let m;
  while ((m = commentStartRegex.exec(markdown)) !== null) {
    const afterStart = markdown.slice(m.index + m[0].length);
    const braceIdx = afterStart.indexOf("{");
    
    // Si contiene un objeto JSON {...}
    if (braceIdx !== -1 && braceIdx < 100) {
      let depth = 0;
      let inString = false;
      let escape = false;
      let endBraceIdx = -1;

      for (let j = braceIdx; j < afterStart.length; j++) {
        const char = afterStart[j];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === "{") depth++;
          else if (char === "}") {
            depth--;
            if (depth === 0) {
              endBraceIdx = j;
              break;
            }
          }
        }
      }

      if (endBraceIdx !== -1) {
        const jsonStr = afterStart.slice(braceIdx, endBraceIdx + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.chart && typeof parsed.chart === "string") {
            charts.push(parsed.chart.trim());
          }
        } catch {
          const chartMatch = jsonStr.match(/"chart"\s*:\s*"((?:\\.|[^"\\])*)"/);
          if (chartMatch) {
            try {
              const decoded = JSON.parse(`"${chartMatch[1]}"`);
              charts.push(decoded.trim());
            } catch {
              charts.push(chartMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim());
            }
          }
        }
      }
    } else {
      // No tiene JSON, buscar terminación estándar -->
      const endCommentIdx = afterStart.indexOf("-->");
      if (endCommentIdx !== -1) {
        const rawContent = afterStart.slice(0, endCommentIdx).trim();
        if (rawContent) charts.push(rawContent);
      }
    }
  }

  return charts;
}

/**
 * Pre-renderiza todos los diagramas de Mermaid presentes en el markdown (bloques de comentarios <!-- mermaid ... -->
 * o bloques de código ```mermaid ... ```) a imágenes base64 de alta resolución para incrustar en @react-pdf/renderer.
 */
export async function renderMermaidDiagramsForPdf(markdown: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!markdown || typeof window === "undefined") return result;

  const rawCharts = extractMermaidChartsFromMarkdown(markdown);
  if (rawCharts.length === 0) return result;

  ensureMermaidInitialized();

  // Intentar primero capturar SVGs ya renderizados en el DOM para mayor velocidad y fidelidad
  const domContainers = Array.from(document.querySelectorAll(".mermaid-svg-container svg"));
  
  for (let idx = 0; idx < rawCharts.length; idx++) {
    const rawChart = rawCharts[idx];
    const chart = rawChart.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (result[rawChart] || result[chart]) continue;

    try {
      // Si el elemento SVG ya está renderizado en el DOM de la página activa
      if (domContainers[idx]) {
        const svgStr = domContainers[idx].outerHTML;
        if (svgStr && svgStr.length > 50) {
          const pngUrl = await svgToPngDataUrl(svgStr);
          if (pngUrl) {
            result[rawChart] = pngUrl;
            result[chart] = pngUrl;
            continue;
          }
        }
      }

      // Renderizar mediante la API de Mermaid en memoria
      const elementId = `mermaid-pdf-${Math.random().toString(36).substring(2, 9)}`;
      const { svg } = await mermaid.render(elementId, chart);
      
      const pngUrl = await svgToPngDataUrl(svg);
      if (pngUrl) {
        result[rawChart] = pngUrl;
        result[chart] = pngUrl;
      }

      // Limpiar elementos temporales creados por mermaid en el DOM
      const tempEl = document.getElementById(elementId);
      if (tempEl) tempEl.remove();
      const bindEl = document.getElementById(`d${elementId}`);
      if (bindEl) bindEl.remove();
    } catch (err) {
      console.warn("Failed to render Mermaid chart for PDF:", err);
    }
  }

  return result;
}
