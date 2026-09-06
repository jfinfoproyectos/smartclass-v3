/**
 * Utilidades para cálculo de calificaciones ponderadas con Lista de Chequeo (Sustentación Docente)
 * y persistencia de metadatos de evaluación en la retroalimentación de la entrega.
 */

export interface EvaluationMetadata {
    aiGrade?: number | null;
    checklistScore?: number | null;
    criteriaLevels?: Record<string, number | undefined>;
    manualSustentacionScore?: number | null;
    calculatedFinalGrade?: number | null;
    updatedAt?: string;
}

export interface ChecklistCriterion {
    id: string;
    name: string;
    percentage: number | string;
    question?: string;
    expectedAnswer?: string;
}

export interface ActivityChecklistConfig {
    enabled: boolean;
    aiWeight: number;
    checklistWeight: number;
    criteria: ChecklistCriterion[];
}

const METADATA_START = "<!-- EVAL_METADATA_START";
const METADATA_END = "EVAL_METADATA_END -->";

/**
 * Obtiene la configuración de lista de chequeo / sustentación oral de una actividad a partir de su descripción JSON.
 */
export function getActivityChecklistConfig(description: string | null | undefined): ActivityChecklistConfig | null {
    if (!description) return null;
    try {
        const data = typeof description === "string" ? JSON.parse(description) : description;
        if (data && typeof data === "object" && data.hasChecklist && Array.isArray(data.criteria) && data.criteria.length > 0) {
            const aiWeight = typeof data.aiWeight === "number" ? data.aiWeight : 30;
            const checklistWeight = typeof data.checklistWeight === "number" ? data.checklistWeight : 70;
            return {
                enabled: true,
                aiWeight,
                checklistWeight,
                criteria: data.criteria,
            };
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Extrae los metadatos estructurados de evaluación guardados dentro del feedback Markdown.
 */
export function extractEvaluationMetadata(feedback: string | null | undefined): EvaluationMetadata | null {
    if (!feedback) return null;
    let meta: EvaluationMetadata | null = null;
    const match = feedback.match(/<!-- EVAL_METADATA_START\s*([\s\S]*?)\s*EVAL_METADATA_END -->/);
    if (match && match[1]) {
        try {
            meta = JSON.parse(match[1].trim());
        } catch {
            // fall through to text fallback
        }
    }

    if (!meta) {
        // Fallback: extraer desde texto plano de desglose si no existe bloque invisible
        const aiMatch = feedback.match(/Evaluación (?:Automática )?IA[^:]*:\s*([0-9.]+)/i);
        const teacherMatch = feedback.match(/Sustentación (?:Oral Docente)?[^:]*:\s*([0-9.]+)/i);
        const finalMatch = feedback.match(/NOTA FINAL (?:CONSOLIDADA)?[^:]*:\s*([0-9.]+)/i);

        if (aiMatch || teacherMatch || finalMatch) {
            meta = {
                aiGrade: aiMatch ? parseFloat(aiMatch[1]) : null,
                checklistScore: teacherMatch ? parseFloat(teacherMatch[1]) : null,
                calculatedFinalGrade: finalMatch ? parseFloat(finalMatch[1]) : null,
            };
        }
    }

    // Fallback para extraer criteriaLevels si no estaban en el JSON pero están en el texto
    if (meta && (!meta.criteriaLevels || Object.keys(meta.criteriaLevels).length === 0)) {
        const criteriaRegex = /•\s*#?(\d+)\s+([^(]+)\s+\((\d+)%\):\s+([A-Za-zñáéíóúÁÉÍÓÚ\s]+)\s*\(([\d.]+)%\)/g;
        let cMatch;
        const parsedLevels: Record<string, number> = {};
        while ((cMatch = criteriaRegex.exec(feedback)) !== null) {
            const index = cMatch[1];
            const pctVal = parseFloat(cMatch[5]);
            if (!isNaN(pctVal)) {
                parsedLevels[`crit-${index}`] = pctVal / 100;
                parsedLevels[index] = pctVal / 100;
            }
        }
        if (Object.keys(parsedLevels).length > 0) {
            meta.criteriaLevels = parsedLevels;
        }
    }

    return meta;
}

/**
 * Elimina el bloque de metadatos invisible del texto de retroalimentación Markdown.
 */
export function stripEvaluationMetadata(feedback: string | null | undefined): string {
    if (!feedback) return "";
    return feedback.replace(/<!-- EVAL_METADATA_START[\s\S]*?EVAL_METADATA_END -->/g, "").trim();
}

/**
 * Inserta o reemplaza el bloque de metadatos invisible al final del texto de retroalimentación Markdown.
 */
export function embedEvaluationMetadata(feedback: string | null | undefined, metadata: EvaluationMetadata): string {
    const cleanFeedback = stripEvaluationMetadata(feedback || "");
    const updatedMeta: EvaluationMetadata = {
        ...metadata,
        updatedAt: new Date().toISOString(),
    };
    const metaBlock = `${METADATA_START}\n${JSON.stringify(updatedMeta, null, 2)}\n${METADATA_END}`;
    return cleanFeedback ? `${cleanFeedback}\n\n${metaBlock}` : metaBlock;
}

/**
 * Calcula la nota de sustentación oral (0.0 - 5.0) en base a los criterios y niveles seleccionados.
 */
export function calculateChecklistScore(
    criteria: ChecklistCriterion[] | null | undefined,
    criteriaLevels: Record<string, number | undefined>,
    manualScore?: number | null
): number {
    if (manualScore !== null && manualScore !== undefined) {
        return Math.min(5.0, Math.max(0.0, Number(manualScore)));
    }
    if (!criteria || criteria.length === 0) return 0;

    const totalEarnedWeight = criteria.reduce((acc: number, crit: ChecklistCriterion) => {
        const factor = criteriaLevels[crit.id];
        if (typeof factor !== "number") return acc;
        const weight = Number(crit.percentage) || 0;
        return acc + (weight * factor);
    }, 0);

    return Math.min(5.0, Math.max(0.0, Number(((totalEarnedWeight / 100) * 5.0).toFixed(2))));
}

/**
 * Calcula la nota final combinada ponderada:
 * Formula: Nota Final = (Nota IA * aiWeight%) + (NotaSustentacion * checklistWeight%)
 */
export function calculateCombinedFinalGrade(
    aiGrade: number | null | undefined,
    checklistScore: number | null | undefined,
    aiWeight: number = 30,
    checklistWeight: number = 70
): number {
    const aiVal = Math.min(5.0, Math.max(0.0, Number(aiGrade) || 0));
    const teacherVal = Math.min(5.0, Math.max(0.0, Number(checklistScore) || 0));
    const aiPart = aiVal * (aiWeight / 100);
    const teacherPart = teacherVal * (checklistWeight / 100);
    return Math.min(5.0, Math.max(0.0, Number((aiPart + teacherPart).toFixed(1))));
}
