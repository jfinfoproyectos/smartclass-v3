import { getAIModel, repairFeedbackText } from "./client";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export interface InterviewMessage {
    role: "interviewer" | "student";
    content: string;
    timestamp?: string;
}

export interface InterviewGradingResult {
    grade: number; // 0.0 - 5.0
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    questionFeedback: Array<{
        question: string;
        studentAnswer: string;
        evaluation: string;
        score: number; // 0.0 - 5.0
    }>;
    feedback: string;
}

const InterviewGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación final sugerida en escala de 0.0 a 5.0"),
    technicalScore: z.number().min(0).max(5).describe("Puntaje de precisión conceptual y dominio técnico (0.0 a 5.0)"),
    communicationScore: z.number().min(0).max(5).describe("Puntaje de claridad, estructura y comunicación oral/escrita (0.0 a 5.0)"),
    problemSolvingScore: z.number().min(0).max(5).describe("Puntaje de capacidad para razonar y resolver problemas (0.0 a 5.0)"),
    summary: z.string().describe("Resumen general del desempeño del estudiante en la entrevista"),
    strengths: z.array(z.string()).describe("Fortalezas demostradas por el estudiante"),
    weaknesses: z.array(z.string()).describe("Áreas de oportunidad o vacíos conceptuales identificados"),
    questionFeedback: z.array(z.object({
        question: z.string().describe("Pregunta formulada"),
        studentAnswer: z.string().describe("Respuesta dada por el estudiante"),
        evaluation: z.string().describe("Análisis formativo de la respuesta"),
        score: z.number().min(0).max(5).describe("Calificación específica para esta pregunta"),
    })).describe("Desglose pregunta a pregunta"),
    feedback: z.string().describe("Retroalimentación formativa completa y pedagógica estructurada en Markdown"),
});

/**
 * Genera la siguiente pregunta adaptativa en la entrevista técnica
 */
export async function getNextInterviewQuestion(params: {
    statement: string;
    targetRole?: string;
    history: InterviewMessage[];
    questionNumber: number;
    totalQuestions: number;
    teacherId: string;
}): Promise<string> {
    const {
        statement,
        targetRole = "Junior",
        history,
        questionNumber,
        totalQuestions,
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);

    const historyFormatted = history.map(m => `${m.role === "interviewer" ? "Entrevistador" : "Estudiante"}: ${m.content}`).join("\n\n");

    const prompt = `
Eres un líder técnico y entrevistador experto, amable pero riguroso, realizando una entrevista técnica interactiva a un estudiante.
NIVEL EVALUADO: ${targetRole.toUpperCase()}
PROGRESO: Pregunta ${questionNumber} de ${totalQuestions}.

---
TEMÁTICA Y ALCANCE DE LA EVALUACIÓN:
${statement || "Fundamentos de desarrollo de software, arquitectura y buenas prácticas."}

---
HISTORIAL DE LA CONVERSACIÓN HASTA EL MOMENTO:
${historyFormatted || "(Aún no hay mensajes previos. Inicia la entrevista presentándote brevemente y formulando la primera pregunta)."}

---
INSTRUCCIONES:
1. Si es la primera pregunta (pregunta 1), saluda cordialmente, explica en una frase el propósito de la entrevista y formula una primera pregunta clara y relevante para el nivel ${targetRole}.
2. Si ya hay respuestas previas, haz un brevísimo comentario (1 frase) sobre la respuesta anterior y luego formula la pregunta #${questionNumber}, profundizando o pasando al siguiente tema clave.
3. Mantén un tono profesional, motivador y directo. No reveles las respuestas correctas.
4. Tu respuesta debe ser ÚNICAMENTE el mensaje que le dirás al estudiante.
`;

    const { text } = await generateText({
        model,
        prompt,
    });

    return repairFeedbackText(text);
}

/**
 * Evalúa y califica la entrevista completa una vez finalizada
 */
export async function gradeInterview(params: {
    statement: string;
    targetRole?: string;
    history: InterviewMessage[];
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<InterviewGradingResult> {
    const {
        statement,
        targetRole = "Junior",
        history,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);

    const modePrompt = {
        normal: "Sé formativo y tolerante. Valora la intención, lógica general y disposición comunicativa.",
        moderate: "Equilibra el rigor en la precisión conceptual con la habilidad comunicativa.",
        strict: "Sé riguroso con la profundidad técnica, exactitud en conceptos y manejo de casos límite.",
    }[gradingMode];

    const historyFormatted = history.map((m, i) => `[Turno ${i + 1}] ${m.role === "interviewer" ? "ENTREVISTADOR" : "ESTUDIANTE"}:\n${m.content}`).join("\n\n");

    const prompt = `
Eres un evaluador senior y docente evaluando la transcripción completa de una entrevista técnica realizada a un estudiante.
NIVEL EVALUADO: ${targetRole.toUpperCase()}
MODO DE CALIFICACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
CRITERIOS Y ENUNCIADO DE LA ACTIVIDAD:
${statement || "Evaluación conceptual y técnica."}

---
TRANSCRIPCIÓN COMPLETA DE LA ENTREVISTA:
${historyFormatted}

---
INSTRUCCIONES DE CALIFICACIÓN:
1. Analiza cada respuesta del estudiante:
   - ¿Demostró dominio técnico real o respuestas superficiales?
   - ¿Explicó con claridad y lógica sus decisiones de diseño o algoritmos?
   - ¿Supo responder ante preguntas de profundización?
2. Califica en escala de 0.0 a 5.0 los tres ejes:
   - Técnico (conceptos, precisión).
   - Comunicación (claridad, capacidad de síntesis).
   - Resolución de problemas (criterio, enfoque ingenieril).
3. Asigna la nota global sugerida (0.0 a 5.0) y un desglose pregunta a pregunta.
4. Genera una retroalimentación formativa y pedagógica completa en Markdown.
`;

    const { object } = await generateObject({
        model,
        schema: InterviewGradingSchema,
        prompt,
    });

    return {
        ...object,
        feedback: repairFeedbackText(object.feedback),
        summary: repairFeedbackText(object.summary),
    };
}
