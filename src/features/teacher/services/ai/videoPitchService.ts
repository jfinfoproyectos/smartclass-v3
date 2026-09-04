import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface VideoPitchGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    structureScore: number;
    technicalClarityScore: number;
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

const VideoPitchGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación global sugerida en escala de 0.0 a 5.0"),
    summary: z.string().describe("Resumen conciso del desempeño y sustentación del estudiante"),
    structureScore: z.number().min(0).max(5).describe("Puntaje de estructura y narrativa (0.0 - 5.0)"),
    technicalClarityScore: z.number().min(0).max(5).describe("Puntaje de claridad conceptual y dominio técnico (0.0 - 5.0)"),
    coveragePercentage: z.number().min(0).max(100).describe("Porcentaje de cobertura de los temas solicitados (0-100%)"),
    topicsCoverage: z.array(z.object({
        topic: z.string().describe("Nombre del tema o apartado requerido"),
        covered: z.boolean().describe("Si fue abordado y explicado"),
        comment: z.string().describe("Observación sobre cómo fue explicado"),
    })).describe("Evaluación de cada tema requerido en el pitch"),
    strengths: z.array(z.string()).describe("Aspectos destacados de la presentación"),
    weaknesses: z.array(z.string()).describe("Puntos débiles o elementos omitidos"),
    feedback: z.string().describe("Retroalimentación formativa y constructiva completa en formato Markdown"),
});

export async function gradeVideoPitch(params: {
    videoUrl: string;
    studentNotes?: string;
    statement: string;
    pitchConfig?: {
        maxDurationMinutes?: number;
        requiredTopics?: string[];
        keyQuestions?: string[];
    };
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<VideoPitchGradingResult> {
    const {
        videoUrl,
        studentNotes = "",
        statement,
        pitchConfig,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);

    const modePrompt = {
        normal: "Sé flexible y motivador. Valora el esfuerzo comunicativo y la comprensión general del proyecto.",
        moderate: "Equilibra la claridad expositiva con el rigor técnico y la cobertura de los temas solicitados.",
        strict: "Sé riguroso con la precisión técnica, profundidad de la arquitectura, manejo del tiempo y cumplimiento de todos los temas.",
    }[gradingMode];

    const requiredTopicsText = pitchConfig?.requiredTopics && pitchConfig.requiredTopics.length > 0
        ? pitchConfig.requiredTopics.map((t, idx) => `${idx + 1}. ${t}`).join("\n")
        : "1. Introducción y Problema\n2. Solución y Arquitectura Técnica\n3. Demostración o Resultados\n4. Lecciones Aprendidas y Conclusiones";

    const keyQuestionsText = pitchConfig?.keyQuestions && pitchConfig.keyQuestions.length > 0
        ? pitchConfig.keyQuestions.map((q, idx) => `¿${q}?`).join("\n")
        : "No hay preguntas específicas adicionales.";

    const prompt = `
Eres un docente universitario experto en Comunicación Técnica, Evaluación de Proyectos y Sustentaciones de Software.
Tu labor es evaluar el Video Pitch / Sustentación en Video entregado por un estudiante.

---
### INFORMACIÓN DE LA ENTREGA:
- Enlace al video de la sustentación: ${videoUrl}
- Notas adicionales o transcripción provista por el estudiante:
${studentNotes ? `"""\n${studentNotes}\n"""` : "Ninguna nota adicional provista."}

---
### DIRECTRICES DE LA ACTIVIDAD:
${statement || "Sustentación en video del proyecto desarrollado."}

---
### TEMAS / HITOS QUE EL ESTUDIANTE DEBÍA CUBRIR:
${requiredTopicsText}

---
### PREGUNTAS CLAVE QUE DEBÍA RESPONDER:
${keyQuestionsText}
${pitchConfig?.maxDurationMinutes ? `- Duración máxima sugerida: ${pitchConfig.maxDurationMinutes} minutos.` : ""}

---
### MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### INSTRUCCIONES DE EVALUACIÓN:
1. Evalúa el contenido del pitch analizando la información aportada, las notas del estudiante y el cumplimiento de los tópicos requeridos.
2. Determina:
   - Cobertura de temas solicitados (qué temas se abordaron y con qué calidad).
   - Claridad y coherencia técnica (uso de vocabulario adecuado, precisión).
   - Estructura y capacidad de síntesis (introducción, desarrollo, demostración, cierre).
3. Asigna la calificación en escala de 0.0 a 5.0:
   - 4.5 - 5.0: Pitch sobresaliente, cubre todos los tópicos con claridad técnica y fluidez.
   - 3.8 - 4.4: Buena sustentación, cubre los puntos principales con pequeños detalles a mejorar.
   - 3.0 - 3.7: Sustentación aceptable, pero superficial o con temas importantes omitidos.
   - 1.0 - 2.9: Sustentación deficiente, desorganizada o con errores conceptuales severos.
   - 0.0 - 0.9: No entregado, enlace inválido o sin relación con el proyecto.
4. Genera una retroalimentación detallada y pedagógica en Markdown con consejos concretos para futuras presentaciones.
`;

    const { object } = await generateObject({
        model,
        schema: VideoPitchGradingSchema,
        prompt,
    });

    return {
        ...object,
        feedback: repairFeedbackText(object.feedback),
        summary: repairFeedbackText(object.summary),
    };
}
