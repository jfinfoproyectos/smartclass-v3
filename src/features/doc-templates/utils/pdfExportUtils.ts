import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DigitalSignatureData } from "./docxUtils";

interface GeneratePdfOptions {
    fileName: string;
    plainText: string;
    paragraphs?: Array<{ index: number; text: string }>;
    signatures?: Record<string, DigitalSignatureData>;
    metadata?: {
        documentType?: string;
        author?: string;
        institution?: string;
    };
}

/**
 * Convierte un Data URL en base64 (ej: 'data:image/png;base64,...') a Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(",")[1] || dataUrl;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Divide un texto largo en líneas que quepan en el ancho disponible de la página PDF
 */
function splitTextIntoLines(
    text: string, 
    font: any, 
    fontSize: number, 
    maxWidth: number
): string[] {
    const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rawParagraphs = cleanText.split("\n");
    const lines: string[] = [];

    for (const rawPara of rawParagraphs) {
        if (!rawPara.trim()) {
            lines.push("");
            continue;
        }

        const words = rawPara.split(/\s+/);
        let currentLine = "";

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (textWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // La palabra sola es más ancha que la línea, partirla
                    lines.push(word);
                    currentLine = "";
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }
    }

    return lines;
}

/**
 * Genera un archivo PDF (.pdf) formal de alta calidad con paginación y firmas digitales estampadas
 */
export async function generateDocumentPdf(options: GeneratePdfOptions): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();

    // Metadatos oficiales del PDF
    const cleanTitle = options.fileName.replace(/\.docx$/i, "");
    pdfDoc.setTitle(cleanTitle);
    pdfDoc.setAuthor(options.metadata?.author || "SmartClass Academic Engine");
    pdfDoc.setSubject("Documento Diligenciado Oficial");
    pdfDoc.setProducer("SmartClass Document Automation System");
    pdfDoc.setCreationDate(new Date());

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Dimensiones tamaño Carta (Letter: 612 x 792 pt)
    const pageWidth = 612;
    const pageHeight = 792;
    const marginHorizontal = 54; // 0.75 in
    const marginTop = 60;
    const marginBottom = 60;
    const contentWidth = pageWidth - (marginHorizontal * 2);

    const fontSizeTitle = 14;
    const fontSizeBody = 10.5;
    const fontSizeMeta = 8;
    const lineHeightBody = 15;

    // Procesar texto
    const textToPrint = options.paragraphs && options.paragraphs.length > 0
        ? options.paragraphs.map(p => p.text).join("\n\n")
        : options.plainText || "Documento generado sin contenido.";

    const allLines = splitTextIntoLines(textToPrint, regularFont, fontSizeBody, contentWidth);

    // Iniciar primera página
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - marginTop;

    // Función auxiliar para crear nueva página
    const createNewPage = () => {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - marginTop;
        drawPageDecorations();
    };

    // Decoraciones de página (Cabecera y Pie)
    const drawPageDecorations = () => {
        // Línea sutil superior
        currentPage.drawLine({
            start: { x: marginHorizontal, y: pageHeight - 35 },
            end: { x: pageWidth - marginHorizontal, y: pageHeight - 35 },
            thickness: 0.75,
            color: rgb(0.2, 0.4, 0.7) // Azul institucional SmartClass
        });

        // Encabezado institucional
        currentPage.drawText("SMARTCLASS ACADEMIC ENGINE • SISTEMA DE GESTIÓN Y AUTOMATIZACIÓN", {
            x: marginHorizontal,
            y: pageHeight - 30,
            size: 7,
            font: boldFont,
            color: rgb(0.3, 0.4, 0.5)
        });

        // Pie de página sutil
        currentPage.drawLine({
            start: { x: marginHorizontal, y: 35 },
            end: { x: pageWidth - marginHorizontal, y: 35 },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7)
        });

        currentPage.drawText(`Documento: ${cleanTitle}`, {
            x: marginHorizontal,
            y: 24,
            size: 7,
            font: italicFont,
            color: rgb(0.4, 0.4, 0.4)
        });

        const dateStr = new Date().toLocaleDateString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
        currentPage.drawText(`Expedido el ${dateStr}`, {
            x: pageWidth - marginHorizontal - 140,
            y: 24,
            size: 7,
            font: regularFont,
            color: rgb(0.4, 0.4, 0.4)
        });
    };

    drawPageDecorations();

    // Dibujar Título del Documento en la primera página
    const titleLines = splitTextIntoLines(cleanTitle.toUpperCase(), boldFont, fontSizeTitle, contentWidth);
    for (const tLine of titleLines) {
        const titleWidth = boldFont.widthOfTextAtSize(tLine, fontSizeTitle);
        const titleX = marginHorizontal + ((contentWidth - titleWidth) / 2);
        currentPage.drawText(tLine, {
            x: titleX,
            y: currentY,
            size: fontSizeTitle,
            font: boldFont,
            color: rgb(0.1, 0.15, 0.25)
        });
        currentY -= (fontSizeTitle + 5);
    }

    currentY -= 15; // Espacio después del título

    // Imprimir líneas del cuerpo del documento
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];

        if (currentY < marginBottom + 60) {
            createNewPage();
        }

        if (line === "") {
            currentY -= (lineHeightBody * 0.7);
            continue;
        }

        // Si la línea parece ser un encabezado o subtítulo en mayúsculas
        const isHeaderLike = line.length < 80 && line === line.toUpperCase() && /^[A-Z0-9\s\.\:\,\-]+$/.test(line) && line.trim().length > 3;

        if (isHeaderLike) {
            currentY -= 6;
            if (currentY < marginBottom + 50) createNewPage();
            currentPage.drawText(line, {
                x: marginHorizontal,
                y: currentY,
                size: fontSizeBody + 0.5,
                font: boldFont,
                color: rgb(0.12, 0.2, 0.35)
            });
            currentY -= (lineHeightBody + 3);
        } else {
            currentPage.drawText(line, {
                x: marginHorizontal,
                y: currentY,
                size: fontSizeBody,
                font: regularFont,
                color: rgb(0.15, 0.15, 0.18)
            });
            currentY -= lineHeightBody;
        }
    }

    // Incrustar Firmas Digitales si existen
    const signatureList = options.signatures ? Object.values(options.signatures) : [];
    if (signatureList.length > 0) {
        for (const sig of signatureList) {
            // Requiere al menos 160pt para estampar la firma cómodamente
            if (currentY < marginBottom + 160) {
                createNewPage();
            }

            currentY -= 20;

            // Caja de certificación de firma
            const boxHeight = 110;
            const boxY = currentY - boxHeight;

            // Fondo y borde de la tarjeta de firma
            currentPage.drawRectangle({
                x: marginHorizontal,
                y: boxY,
                width: contentWidth,
                height: boxHeight,
                borderWidth: 1,
                borderColor: rgb(0.2, 0.45, 0.75),
                color: rgb(0.97, 0.98, 1.0)
            });

            // Etiqueta de Certificación
            currentPage.drawText("CERTIFICACIÓN DE FIRMA DIGITALIZADA • SMARTCLASS VERIFIED", {
                x: marginHorizontal + 12,
                y: boxY + boxHeight - 16,
                size: 7.5,
                font: boldFont,
                color: rgb(0.15, 0.35, 0.65)
            });

            currentPage.drawLine({
                start: { x: marginHorizontal + 12, y: boxY + boxHeight - 22 },
                end: { x: marginHorizontal + contentWidth - 12, y: boxY + boxHeight - 22 },
                thickness: 0.5,
                color: rgb(0.8, 0.85, 0.9)
            });

            // Incrustar imagen de la firma si es válida
            let imageDrawn = false;
            if (sig.signatureDataUrl && sig.signatureDataUrl.startsWith("data:image/")) {
                try {
                    const imageBytes = dataUrlToUint8Array(sig.signatureDataUrl);
                    let embeddedImage;
                    if (sig.signatureDataUrl.startsWith("data:image/jpeg") || sig.signatureDataUrl.startsWith("data:image/jpg")) {
                        embeddedImage = await pdfDoc.embedJpg(imageBytes);
                    } else {
                        embeddedImage = await pdfDoc.embedPng(imageBytes);
                    }

                    const imgWidth = 140;
                    const imgHeight = 45;
                    currentPage.drawImage(embeddedImage, {
                        x: marginHorizontal + 20,
                        y: boxY + 28,
                        width: imgWidth,
                        height: imgHeight
                    });
                    imageDrawn = true;
                } catch (imgErr) {
                    console.warn("[PDF Export] No se pudo incrustar imagen de firma:", imgErr);
                }
            }

            if (!imageDrawn) {
                // Fallback de línea de firma caligráfica
                currentPage.drawText("✍️ [Firma Digital Validada]", {
                    x: marginHorizontal + 25,
                    y: boxY + 50,
                    size: 13,
                    font: italicFont,
                    color: rgb(0.1, 0.25, 0.5)
                });
            }

            // Línea de firma
            currentPage.drawLine({
                start: { x: marginHorizontal + 15, y: boxY + 25 },
                end: { x: marginHorizontal + 180, y: boxY + 25 },
                thickness: 1,
                color: rgb(0.3, 0.3, 0.3)
            });

            // Datos del firmante
            currentPage.drawText(`Firmante: ${sig.signerName || "Autorizado"}`, {
                x: marginHorizontal + 200,
                y: boxY + boxHeight - 40,
                size: 9.5,
                font: boldFont,
                color: rgb(0.1, 0.15, 0.2)
            });

            if (sig.signerId) {
                currentPage.drawText(`Documento de Identidad: ${sig.signerId}`, {
                    x: marginHorizontal + 200,
                    y: boxY + boxHeight - 55,
                    size: 8.5,
                    font: regularFont,
                    color: rgb(0.25, 0.25, 0.25)
                });
            }

            if (sig.signerRole) {
                currentPage.drawText(`Cargo / Calidad: ${sig.signerRole}`, {
                    x: marginHorizontal + 200,
                    y: boxY + boxHeight - 70,
                    size: 8.5,
                    font: regularFont,
                    color: rgb(0.25, 0.25, 0.25)
                });
            }

            const signDate = sig.signedAt ? new Date(sig.signedAt).toLocaleString("es-CO") : new Date().toLocaleString("es-CO");
            currentPage.drawText(`Fecha y Hora: ${signDate}`, {
                x: marginHorizontal + 200,
                y: boxY + 22,
                size: 7.5,
                font: regularFont,
                color: rgb(0.35, 0.35, 0.35)
            });

            currentPage.drawText(`Código Verificación: ${sig.verificationCode || "SC-VERIF-DEFAULT"}`, {
                x: marginHorizontal + 200,
                y: boxY + 10,
                size: 7.5,
                font: boldFont,
                color: rgb(0.15, 0.45, 0.3)
            });

            currentY = boxY - 15;
        }
    }

    // Agregar número de página en todas las páginas
    const totalPages = pdfDoc.getPageCount();
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const page = pdfDoc.getPage(pIdx);
        page.drawText(`Página ${pIdx + 1} de ${totalPages}`, {
            x: marginHorizontal + (contentWidth / 2) - 25,
            y: 24,
            size: 7.5,
            font: regularFont,
            color: rgb(0.4, 0.4, 0.4)
        });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as any], { type: "application/pdf" });
}

/**
 * Imprime o exporta a PDF el documento Word diligenciado respetando estrictamente
 * el 100% del formato original (márgenes nativos, tipografía, tablas, celdas, imágenes, encabezados, pies de página y saltos de página).
 */
export function printFaithfulWordDocument(containerElement: HTMLElement, title: string = "documento"): void {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        window.print();
        return;
    }

    // 1. Clonar el contenedor para limpiar elementos interactivos de edición
    const clone = containerElement.cloneNode(true) as HTMLElement;

    // Eliminar badges flotantes de variables (ej: {{nombre_supervisor}})
    clone.querySelectorAll(".docx-var-pill").forEach(el => el.remove());

    // Limpiar etiquetas de resaltado <mark> para que se vea como texto normal limpio
    clone.querySelectorAll("mark.docx-var-highlight").forEach(m => {
        const textNode = document.createTextNode(m.textContent || "");
        m.parentNode?.replaceChild(textNode, m);
    });

    // 2. Extraer todas las hojas de estilo del documento y de docx-preview
    let collectedStyles = "";
    
    // Extraer estilos de document.head (incluyendo fuentes de Google Fonts, docx-preview, etc.)
    document.querySelectorAll("style, link[rel='stylesheet']").forEach(styleEl => {
        collectedStyles += styleEl.outerHTML + "\n";
    });

    // Extraer cualquier etiqueta style dentro del contenedor original
    containerElement.querySelectorAll("style").forEach(styleEl => {
        collectedStyles += styleEl.outerHTML + "\n";
    });

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            ${collectedStyles}
            <style>
                @page {
                    size: auto;
                    margin: 0mm !important; /* Respetar los márgenes nativos de cada sección de Word */
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .docx-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: block !important;
                }
                .docx-preview-sheet, section.docx {
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    background: #ffffff !important;
                    box-sizing: border-box !important;
                }
                .docx-preview-sheet:last-child, section.docx:last-child {
                    page-break-after: auto !important;
                    break-after: auto !important;
                }
                /* Tablas fieles al documento Word original */
                table {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                td, th {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                img {
                    max-width: 100% !important;
                    page-break-inside: avoid !important;
                }
                @media print {
                    body {
                        background: #ffffff !important;
                    }
                    .docx-preview-sheet, section.docx {
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div id="docx-print-container">
                ${clone.innerHTML}
            </div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(function() {
                        window.frameElement?.remove();
                    }, 1500);
                };
            </script>
        </body>
        </html>
    `);
    doc.close();
}

/**
 * Imprime un elemento HTML en alta fidelidad usando el diálogo nativo del navegador con estilos optimizados
 */
export function printHtmlElementToPdf(elementHtml: string, title: string = "documento"): void {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        window.print();
        return;
    }

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
                @page {
                    size: letter;
                    margin: 18mm 15mm 18mm 15mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    color: #111827;
                    background: #ffffff;
                    line-height: 1.6;
                    font-size: 11pt;
                }
                h1, h2, h3, h4 {
                    color: #0f172a;
                    font-weight: 700;
                    page-break-after: avoid;
                }
                p {
                    margin-bottom: 1em;
                    text-align: justify;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1.5em 0;
                    page-break-inside: avoid;
                }
                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                    text-align: left;
                    font-size: 10pt;
                }
                th {
                    background-color: #f1f5f9;
                    font-weight: 600;
                }
                .docx-preview-sheet {
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div id="print-root">
                ${elementHtml}
            </div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(function() {
                        window.frameElement?.remove();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    doc.close();
}
