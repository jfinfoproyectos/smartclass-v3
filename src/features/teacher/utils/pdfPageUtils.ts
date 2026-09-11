import { PDFDocument } from "pdf-lib";

export interface PdfReviewConfig {
    mode: "first_n" | "range" | "all";
    maxPages?: number;
    pageRange?: string;
}

export interface SlicePdfResult {
    slicedData: Uint8Array;
    totalPages: number;
    extractedPagesCount: number;
    pageDescription: string;
    isTrimmed: boolean;
}

/**
 * Obtiene la configuración de revisión de PDF desde la descripción JSON de la actividad.
 */
export function getPdfReviewConfig(descriptionOrActivity: any): PdfReviewConfig | null {
    if (!descriptionOrActivity) return null;
    try {
        let raw = descriptionOrActivity;
        if (typeof raw === "object" && raw !== null && "description" in raw) {
            raw = raw.description;
        }

        let data: any = null;
        if (typeof raw === "string") {
            try {
                data = JSON.parse(raw);
            } catch {
                return null;
            }
        } else if (typeof raw === "object") {
            data = raw;
        }

        if (data && typeof data === "object" && data.pdfReviewConfig) {
            return data.pdfReviewConfig as PdfReviewConfig;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Parsea un string de rango de páginas (ej: "1-5", "2-8", "3") a índices base 0 válidos.
 */
export function parsePageRangeToIndices(pageRangeStr: string, totalPages: number): number[] {
    const indices = new Set<number>();
    if (!pageRangeStr || !pageRangeStr.trim()) return [];

    const parts = pageRangeStr.split(",").map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
        if (part.includes("-")) {
            const [startStr, endStr] = part.split("-").map((s) => parseInt(s.trim(), 10));
            if (!isNaN(startStr) && !isNaN(endStr)) {
                const start = Math.max(1, Math.min(startStr, endStr));
                const end = Math.min(totalPages, Math.max(startStr, endStr));
                for (let p = start; p <= end; p++) {
                    indices.add(p - 1);
                }
            }
        } else {
            const page = parseInt(part, 10);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                indices.add(page - 1);
            }
        }
    }

    return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Recorta un documento PDF en memoria extrayendo solo las páginas configuradas.
 * Esto reduce drásticamente el tamaño del archivo y el consumo de tokens en llamadas a la IA.
 */
export async function slicePdfByConfig(
    pdfBytes: Uint8Array,
    config?: PdfReviewConfig | null
): Promise<SlicePdfResult> {
    try {
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        // Si no hay configuración o el modo es "all", o el PDF tiene solo 1 página:
        if (!config || config.mode === "all" || totalPages <= 1) {
            return {
                slicedData: pdfBytes,
                totalPages,
                extractedPagesCount: totalPages,
                pageDescription: `Documento completo (${totalPages} ${totalPages === 1 ? "página" : "páginas"})`,
                isTrimmed: false,
            };
        }

        let targetIndices: number[] = [];
        let description = "";

        if (config.mode === "first_n") {
            const maxPages = config.maxPages && config.maxPages > 0 ? config.maxPages : 5;
            const countToExtract = Math.min(maxPages, totalPages);
            targetIndices = Array.from({ length: countToExtract }, (_, i) => i);
            description = `Páginas 1 a ${countToExtract} de ${totalPages}`;
        } else if (config.mode === "range") {
            const rangeStr = config.pageRange?.trim() || "1-5";
            targetIndices = parsePageRangeToIndices(rangeStr, totalPages);

            if (targetIndices.length === 0) {
                // Fallback si el rango es inválido
                const fallbackCount = Math.min(5, totalPages);
                targetIndices = Array.from({ length: fallbackCount }, (_, i) => i);
                description = `Páginas 1 a ${fallbackCount} de ${totalPages} (Fallback)`;
            } else {
                const firstPage = targetIndices[0] + 1;
                const lastPage = targetIndices[targetIndices.length - 1] + 1;
                description = `Páginas ${firstPage}-${lastPage} (${targetIndices.length} págs. de ${totalPages})`;
            }
        }

        // Si se extraen todas las páginas de todos modos, retornar original sin re-codificar
        if (targetIndices.length >= totalPages) {
            return {
                slicedData: pdfBytes,
                totalPages,
                extractedPagesCount: totalPages,
                pageDescription: `Documento completo (${totalPages} páginas)`,
                isTrimmed: false,
            };
        }

        // Crear nuevo documento con sólo las páginas seleccionadas
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
        copiedPages.forEach((page) => newDoc.addPage(page));

        const slicedData = await newDoc.save();

        return {
            slicedData,
            totalPages,
            extractedPagesCount: targetIndices.length,
            pageDescription: description,
            isTrimmed: true,
        };
    } catch (err) {
        console.error("[PdfPageUtils] Error al recortar PDF, enviando original:", err);
        return {
            slicedData: pdfBytes,
            totalPages: 1,
            extractedPagesCount: 1,
            pageDescription: "Documento original",
            isTrimmed: false,
        };
    }
}
