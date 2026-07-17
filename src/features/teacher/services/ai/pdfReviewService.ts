import { getAIModel, repairFeedbackText } from "./client";
import type { GradingResult } from "./gradingService";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Attempts to fetch a PDF from a URL and return its text content.
 * Supports Google Drive share links.
 */
async function fetchPdfContent(url: string): Promise<{ data: Uint8Array; mimeType: string } | null> {
    let fetchUrl = url;

    // Convert Google Drive share links to a direct download URL
    const driveMatch = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch && driveMatch[1]) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    try {
        const response = await fetch(fetchUrl, { redirect: "follow" });

        if (!response.ok) {
            console.error(`[PdfReviewService] Failed to fetch PDF: ${response.status} ${response.statusText}`);
            return null;
        }

        const buffer = await response.arrayBuffer();

        // Guard: reject files larger than 15 MB to avoid AI inline data limits
        if (buffer.byteLength > 15 * 1024 * 1024) {
            throw new Error(
                "El archivo PDF es demasiado grande (máx. 15 MB). Comprime el documento o usa un PDF más liviano."
            );
        }

        const data = new Uint8Array(buffer);
        
        // Basic PDF header validation (%PDF-)
        const header = String.fromCharCode(...data.slice(0, 5));
        if (header !== "%PDF-") {
            console.error("[PdfReviewService] Downloaded content is not a valid PDF. Header:", header);
            throw new Error(
                "El enlace no apunta a un archivo PDF válido. Es posible que el archivo esté protegido o el enlace sea incorrecto."
            );
        }

        // Always force application/pdf
        return { data, mimeType: "application/pdf" };
    } catch (e: any) {
        if (e.message?.includes("PDF válido") || e.message?.includes("demasiado grande")) throw e;
        console.error("[PdfReviewService] Error fetching PDF content:", e);
        return null;
    }
}


/**
 * Grade a PDF submission against a list of criteria using Vercel AI SDK.
 * The criteria are extracted from the activity's `statement` (Markdown).
 */
export async function gradePdfReviewSubmission(
    criteria: string,
    pdfUrl: string,
    teacherId?: string,
    gradingMode: string = "normal"
): Promise<GradingResult> {
    const model = await getAIModel(teacherId);

    console.log(`[PdfReviewService] Starting PDF review for: ${pdfUrl}`);

    // 1. Download PDF
    const pdfData = await fetchPdfContent(pdfUrl);
    if (!pdfData) {
        throw new Error(
            "No se pudo descargar el PDF. Asegúrate de que el enlace sea público y apunte a un archivo PDF válido (Google Drive: 'Cualquiera con el enlace puede ver')."
        );
    }

    // 2. Build prompt
    const prompt = `Eres un evaluador académico experto. Tu tarea es evaluar el documento PDF adjunto basándote EXCLUSIVAMENTE en los criterios de evaluación proporcionados.

**CRITERIOS DE EVALUACIÓN (Rúbrica)**:
${criteria}

**INSTRUCCIONES PARA LA EVALUACIÓN (${gradingMode.toUpperCase()})**:
1. Lee el documento completo.
2. Para cada criterio, asigna una puntuación parcial basada en el peso indicado.
3. La nota final es la suma de todas las puntuaciones parciales (escala 0.0 a 5.0).
4. Si la suma supera 5.0, limítala a 5.0.
5. ${gradingMode === "strict" 
    ? "SÉ EXTREMADAMENTE ESTRICTO. Penaliza rigurosamente errores de redacción, ortografía, falta de coherencia, cohesión y cumplimiento estricto de normatividad de documentación y presentación." 
    : gradingMode === "moderate" 
    ? "Evaluación moderada: considera legibilidad, estructura y claridad además del contenido." 
    : "Evaluación estándar: enfócate principalmente en el cumplimiento de los criterios solicitados."}
6. **REGLA CRÍTICA DE FORMATO DE ENTREGA**: Si en la rúbrica o criterios de evaluación se menciona algún requisito o criterio sobre el formato de entrega física del archivo (como por ejemplo: entregar en formato ZIP, Word, PDF, estructuración de carpetas, nombres de archivo de entrega específicos, o cómo subir o empaquetar el trabajo), **IGNÓRALO COMPLETAMENTE**. NO debes penalizar al estudiante ni restar puntos por no cumplir con estas pautas de formato de entrega, empaquetado o carga del archivo.

**FORMATO DE RESPUESTA** (JSON estricto):
{
  "grade": <número decimal entre 0.0 y 5.0>,
  "criteriaResults": [
    {
      "criterion": "<nombre del criterio>",
      "maxPoints": <puntos máximos del criterio>,
      "earnedPoints": <puntos obtenidos>,
      "comment": "<observación específica sobre este criterio>"
    }
  ],
  "generalFeedback": "<retroalimentación general sobre el documento>",
  "strengths": ["<fortaleza 1>", "<fortaleza 2>"],
  "improvements": ["<mejora 1>", "<mejora 2>"]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON. No incluyas texto adicional, no uses bloques de código markdown.`;

    let apiRequestsCount = 1;

    try {
        const { object } = await generateObject({
            model,
            schema: z.object({
                grade: z.union([z.number(), z.string()]),
                criteriaResults: z.array(z.object({
                    criterion: z.string(),
                    maxPoints: z.union([z.number(), z.string()]),
                    earnedPoints: z.union([z.number(), z.string()]),
                    comment: z.string()
                })),
                generalFeedback: z.string(),
                strengths: z.array(z.string()),
                improvements: z.array(z.string())
            }),
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            data: pdfData.data,
                            mediaType: pdfData.mimeType,
                        },
                        {
                            type: "text",
                            text: prompt,
                        },
                    ],
                },
            ],
        });

        if (!object) throw new Error("No response text received from AI");

        const grade = Math.min(5.0, Math.max(0.0, typeof object.grade === "string" ? parseFloat(object.grade) : object.grade || 0));
        const parsed = object;

        // Build structured markdown feedback
        const feedbackLines: string[] = [];
        feedbackLines.push(`## Evaluación de PDF — Nota: ${grade.toFixed(1)} / 5.0\n`);

        if (parsed.criteriaResults && Array.isArray(parsed.criteriaResults)) {
            feedbackLines.push("### Resultados por Criterio\n");
            feedbackLines.push("| Criterio | Nota obtenida | Nota máxima | Comentario |");
            feedbackLines.push("|----------|:-------------:|:-----------:|------------|");
            for (const cr of parsed.criteriaResults) {
                feedbackLines.push(
                    `| ${cr.criterion || "—"} | **${parseFloat(String(cr.earnedPoints || 0)).toFixed(1)}** | ${parseFloat(String(cr.maxPoints || 0)).toFixed(1)} | ${cr.comment || "—"} |`
                );
            }
            feedbackLines.push("");
        }

        if (parsed.strengths && parsed.strengths.length > 0) {
            feedbackLines.push("### ✅ Fortalezas");
            for (const s of parsed.strengths) feedbackLines.push(`- ${s}`);
            feedbackLines.push("");
        }

        if (parsed.improvements && parsed.improvements.length > 0) {
            feedbackLines.push("### 🔧 Aspectos a Mejorar");
            for (const m of parsed.improvements) feedbackLines.push(`- ${m}`);
            feedbackLines.push("");
        }

        if (parsed.generalFeedback) {
            feedbackLines.push("### 📝 Retroalimentación General");
            feedbackLines.push(parsed.generalFeedback);
        }

        const feedback = repairFeedbackText(feedbackLines.join("\n"));

        console.log(`[PdfReviewService] Evaluation complete. Grade: ${grade.toFixed(1)}/5.0`);

        return {
            grade,
            feedback,
            apiRequestsCount,
        };
    } catch (error: any) {
        console.error("[PdfReviewService] AI Error:", error);

        const errorString = typeof error === "string" ? error : error.message || JSON.stringify(error) || "";
        let errorMessage = "Error al evaluar el PDF.";

        if (errorString.includes("SAFETY")) {
            errorMessage = "Evaluación detenida por filtros de seguridad.";
        } else if (
            errorString.includes("429") ||
            errorString.toLowerCase().includes("quota") ||
            errorString.toLowerCase().includes("exhausted") ||
            errorString.includes("RESOURCE_EXHAUSTED")
        ) {
            errorMessage = "Has excedido la cuota de peticiones a la IA. Intenta más tarde.";
        } else if (errorString.length > 0) {
            errorMessage = errorString;
        }

        throw new Error(errorMessage);
    }
}
