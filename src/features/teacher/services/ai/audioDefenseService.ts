import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface AudioDefenseGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    argumentationScore: number;
    structureScore: number;
    technicalDepthScore: number;
    coveragePercentage: number;
    topicsCoverage: Array<{
        topic: string;
        covered: boolean;
        comment: string;
    }>;
    strengths: string[];
    weaknesses: string[];
    feedback: string;
}

const AudioDefenseGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación global recomendada en escala de 0.0 a 5.0"),
    summary: z.string().describe("Resumen conciso del desempeño, argumentación y sustentación en audio del estudiante"),
    argumentationScore: z.number().min(0).max(5).describe("Puntaje de argumentación, coherencia y fluidez oral (0.0 - 5.0)"),
    structureScore: z.number().min(0).max(5).describe("Puntaje de estructura, introducción, desarrollo y conclusión (0.0 - 5.0)"),
    technicalDepthScore: z.number().min(0).max(5).describe("Puntaje de vocabulario técnico y dominio de conceptos (0.0 - 5.0)"),
    coveragePercentage: z.number().min(0).max(100).describe("Porcentaje de cobertura de los requerimientos y temas solicitados (0-100%)"),
    topicsCoverage: z.array(z.object({
        topic: z.string().describe("Nombre del tema o apartado requerido"),
        covered: z.boolean().describe("Si el estudiante abordó y explicó este punto"),
        comment: z.string().describe("Observación sobre la solidez de la explicación en el audio"),
    })).describe("Evaluación punto por punto de cada tema solicitado"),
    strengths: z.array(z.string()).describe("Aspectos destacados de la sustentación en audio"),
    weaknesses: z.array(z.string()).describe("Puntos débiles, omisiones o conceptos erróneos"),
    feedback: z.string().describe("Retroalimentación formativa y pedagógica completa estructurada en Markdown"),
});

/**
 * Evalúa una sustentación técnica en audio o podcast con Gemini.
 */
export async function gradeAudioDefense(params: {
    audioUrl: string;
    studentNotes?: string;
    statement: string;
    audioConfig?: {
        maxDurationMinutes?: number;
        requiredTopics?: string[];
        keyQuestions?: string[];
    };
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<AudioDefenseGradingResult> {
    const {
        audioUrl,
        studentNotes = "",
        statement,
        audioConfig,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);
    const { extractMediaMetadata } = await import("./mediaMetadataService");
    const mediaMetadata = await extractMediaMetadata(audioUrl);

    const modePrompt = {
        normal: "Sé motivador y constructivo. Valora la intención comunicativa, el esfuerzo oral y la comprensión de las ideas centrales.",
        moderate: "Equilibra la fluidez verbal con la exactitud técnica y la cobertura de los temas del enunciado.",
        strict: "Sé riguroso con la profundidad técnica, la precisión terminológica, la estructura de la sustentación y el cumplimiento exhaustivo del enunciado.",
    }[gradingMode];

    const mediaDetails = [
        `- Enlace del audio/recurso: ${audioUrl}`,
        `- Plataforma detectada: ${mediaMetadata.platform}`,
        `- Estado de verificación técnica: ${mediaMetadata.isAccessible ? "Enlace verificado y activo" : "Enlace no accesible"}`,
        mediaMetadata.title ? `- Título de la grabación: "${mediaMetadata.title}"` : null,
        mediaMetadata.durationFormatted ? `- Duración detectada: ${mediaMetadata.durationFormatted}` : null,
        mediaMetadata.author ? `- Autor o podcaster: ${mediaMetadata.author}` : null,
        mediaMetadata.description && mediaMetadata.description.trim() ? `- Resumen / Transcripción del audio extraída de la plataforma:\n"""\n${mediaMetadata.description.trim()}\n"""` : null,
    ].filter(Boolean).join("\n");

    const prompt = `
Eres un docente universitario y jurado evaluador experto en Ingeniería de Software, Arquitectura de Sistemas y Comunicación Técnica Oral.
Tu misión es evaluar una sustentación en formato de audio / podcast técnico entregada por un estudiante.

---
### MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### ENUNCIADO Y REQUERIMIENTOS DEL TALLER/ACTIVIDAD:
${statement || "No se proveyó enunciado explícito. Evalúa la calidad argumentativa y técnica general."}

---
### CONFIGURACIÓN DE LA SUSTENTACIÓN EN AUDIO:
- Duración sugerida / máxima: ${audioConfig?.maxDurationMinutes ? `${audioConfig.maxDurationMinutes} minutos` : "Libre / No especificada"}
- Temas clave obligatorios:
${audioConfig?.requiredTopics && audioConfig.requiredTopics.length > 0
    ? audioConfig.requiredTopics.map((t, idx) => `  ${idx + 1}. ${t}`).join("\n")
    : "  (No se configuraron temas específicos, evaluar según el enunciado)"}

---
### INFORMACIÓN DE LA ENTREGA DEL ESTUDIANTE:
${mediaDetails}

### NOTAS / MINUTERO / TIMESTAMPS DEL ESTUDIANTE:
${studentNotes.trim() ? studentNotes : "El estudiante no adjuntó marcas de tiempo o notas complementarias."}

---
### REGLAS OBLIGATORIAS DE EVALUACIÓN:
1. El enlace provisto por el estudiante ES VÁLIDO y HA SIDO VERIFICADO POR EL SERVIDOR. NO indiques que el enlace no funciona o que no se pudo acceder.
2. Evalúa el desempeño del estudiante considerando el contenido extraído de la grabación, la claridad técnica, las notas y los requerimientos del enunciado.
3. Si el estudiante incluyó notas o marcas de tiempo (timestamps), úsalas como evidencia de la estructura de su exposición.
4. Asigna puntajes justos en escala 0.0 a 5.0 para:
   - Argumentación y Fluidez (0.0 - 5.0)
   - Estructura y Organización (0.0 - 5.0)
   - Profundidad y Vocabulario Técnico (0.0 - 5.0)
5. Calcula el porcentaje de cobertura de los temas solicitados (0 a 100%).
6. Genera una retroalimentación formativa y detallada en Markdown que incluya:
   - **Diagnóstico General**: Síntesis del audio y claridad expositiva.
   - **Evaluación de Temas**: Cumplimiento de cada punto solicitado.
   - **Buenas Prácticas Observadas y Recomendaciones**: Consejos para mejorar la defensa técnica oral.
`;

    const { object } = await generateObject({
        model,
        schema: AudioDefenseGradingSchema,
        prompt,
    });

    const repairedFeedback = repairFeedbackText(object.feedback);

    return {
        ...object,
        feedback: repairedFeedback,
    };
}
