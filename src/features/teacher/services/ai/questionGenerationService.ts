import { getAIModel } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Generate a complete question (enunciated) based on a topic or evaluation title.
 */
export async function generateQuestion(
    topic: string,
    type: string,
    language?: string,
    customPrompt?: string,
    size: "short" | "medium" | "long" = "medium",
    openness: "concrete" | "balanced" | "open" = "balanced",
    includeCode: boolean = false,
    difficulty: "easy" | "medium" | "hard" | "expert" = "medium",
    bloomTaxonomy: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create" = "apply",
    includeBoilerplate: boolean = false,
    includeTestCases: boolean = false,
    userId?: string
): Promise<string> {
    try {
        const model = await getAIModel(userId);

        const typeDesc = type === "Code"
            ? `una pregunta de programación en lenguaje ${language || "JavaScript"}. El enunciado DEBE pedir una solución técnica en este lenguaje.`
            : "una pregunta teórica o de razonamiento. El lenguaje de programación a usar NO es obligatorio a menos que el profesor lo mencione en su prompt; de lo contrario, usa conceptos generales.";

        const codeDesc = includeCode
            ? "La pregunta DEBE incluir fragmentos de código, ejemplos técnicos o un bloque de código inicial como referencia."
            : "La pregunta NO debe incluir bloques de código extensos, debe centrarse en el planteamiento narrativo o lógico.";

        const sizeDesc = {
            short: "Concisa y directa al punto (aprox 3-5 líneas).",
            medium: "Balanceada con contexto y requerimientos claros (aprox 6-10 líneas).",
            long: "Detallada, con escenario de fondo, múltiples requerimientos y restricciones (más de 10 líneas)."
        }[size];

        const opennessDesc = {
            concrete: "Muy concreta: busca respuestas específicas, hechos técnicos u objetivos precisos. No debe dejar mucho espacio a la interpretación.",
            balanced: "Balanceada: una mezcla de conceptos teóricos y aplicación práctica con requerimientos claros.",
            open: "Muy abierta: fomenta el pensamiento crítico, el análisis profundo y puede tener múltiples enfoques o soluciones válidas."
        }[openness];

        const difficultyDesc = {
            easy: "Nivel Inicial/Básico: conceptos fundamentales y problemas sencillos aptos para primera exposición.",
            medium: "Nivel Intermedio: requiere comprensión sólida y aplicación de conceptos con cierta complejidad.",
            hard: "Nivel Avanzado: problemas complejos que requieren integración de múltiples conceptos y razonamiento profundo.",
            expert: "Nivel Experto: retos de alto nivel, optimización, casos de borde críticos y diseño de soluciones no triviales."
        }[difficulty];

        const bloomDesc = {
            remember: "Recordar: el estudiante debe recuperar y reconocer conceptos o hechos específicos de memoria.",
            understand: "Comprender: el estudiante debe explicar, parafrasear o interpretar un concepto con sus propias palabras.",
            apply: "Aplicar: el estudiante debe usar un procedimiento o concepto en una situación concreta y nueva.",
            analyze: "Analizar: el estudiante debe descomponer el material, identificar relaciones o causas y sacar conclusiones.",
            evaluate: "Evaluar: el estudiante debe emitir un juicio crítico basado en criterios y justificar su postura.",
            create: "Crear: el estudiante debe diseñar, producir o construir algo nuevo combinando elementos de forma coherente."
        }[bloomTaxonomy];

        const boilerplateDesc = includeBoilerplate
            ? "DEBES incluir un bloque de código base (boilerplate) o estructura inicial que el estudiante deba completar, corregir o extender."
            : "No incluyas un bloque de código base. El estudiante debe desarrollar su solución desde cero.";

        const testCasesDesc = includeTestCases
            ? "DEBES incluir al menos 2-3 ejemplos de casos de prueba (entradas de ejemplo y sus salidas esperadas) para que el estudiante pueda validar su propia solución."
            : "No incluyas casos de prueba específicos en el enunciado.";

        const prompt = `
        Actúa como un profesor universitario experto en pedagogía y evaluación.
        Tu tarea es generar el enunciado (en markdown) para una pregunta de examen.
        
        **Contexto General (Título de la Evaluación)**: ${topic}
        **Tipo de Pregunta**: ${typeDesc}
        **Tamaño/Profundidad**: ${sizeDesc}
        **Nivel de Apertura**: ${opennessDesc}
        **Fragmentos de Código**: ${codeDesc}
        **Dificultad**: ${difficultyDesc}
        **Taxonomía de Bloom**: ${bloomDesc}
        **Código Base (Boilerplate)**: ${boilerplateDesc}
        **Casos de Prueba**: ${testCasesDesc}
        ${customPrompt ? `**Instrucciones/Estilo del Profesor**: ${customPrompt}` : ""}
        
        **INSTRUCCIONES DE GENERACIÓN**:
        1. Crea un enunciado claro, profesional y desafiante.
        2. Usa formato Markdown para que se vea bien (negritas, listas, bloques de código si es necesario).
        3. Si es de código, describe un problema específico que el estudiante deba resolver programando.
        4. Si es teórica, pide una explicación o análisis profundo.
        5. Respeta estrictamente el **Tamaño/Profundidad** solicitado.
        6. Evita dar la respuesta en el enunciado.
        7. Sé directo: no digas "Aquí tienes tu pregunta", solo devuelve el contenido de la pregunta.
        `;

        const { object } = await generateObject({
            model,
            schema: z.object({
                questionText: z.string()
            }),
            prompt,
        });

        if (!object) {
            throw new Error("No response received from AI.");
        }

        return object.questionText;
    } catch (error: any) {
        console.error("Error generating question:", error);
        const errorString = typeof error === 'string' ? error : (error.message || JSON.stringify(error) || "");
        if (
            errorString.includes("429") ||
            errorString.toLowerCase().includes("quota") ||
            errorString.toLowerCase().includes("exhausted") ||
            errorString.includes("RESOURCE_EXHAUSTED") ||
            errorString.toLowerCase().includes("rate limit")
        ) {
            throw new Error("Has excedido la cuota gratuita de peticiones a la IA. Espera unos segundos o cambia de modelo o API Key.");
        }
        throw new Error(`No se pudo generar la pregunta: ${error.message}`);
    }
}

/**
 * Generate a sample (ideal) answer for a given question.
 */
export async function generateSampleAnswer(
    questionText: string,
    type: string,
    language?: string,
    userId?: string
): Promise<string> {
    try {
        const model = await getAIModel(userId);

        const prompt = `
        Eres un estudiante brillante o un asistente de enseñanza.
        Tu tarea es proporcionar una respuesta perfecta y concisa a la siguiente pregunta:
        
        **Enunciado de la Pregunta**:
        """
        ${questionText}
        """
        
        **Tipo**: ${type}
        
        **INSTRUCCIONES**:
        1. Genera la respuesta ideal que un profesor esperaría recibir.
        2. Para preguntas de código, devuelve el código perfectamente formateado e indentado, con todos los saltos de línea y tabulaciones estándar correspondientes al lenguaje ${language || 'el lenguaje de la pregunta'}. NO comprimas el código en una sola línea. No incluyas explicaciones adicionales ni bloques de markdown.
        3. Para preguntas de texto, sé preciso y usa un tono académico. NO uses formato markdown (asteriscos, negritas, estilos) porque la respuesta se mostrará en un textarea de texto plano.
        4. La respuesta debe ser directamente utilizable como referencia.
        5. IMPORTANTE: El código DEBE contener saltos de línea ('\\n') después de cada instrucción, punto y coma, llaves de apertura/cierre, etc. El código NO DEBE estar en una única línea corrida. Debe estar perfectamente formateado e indentado de tal forma que sea 100% legible y limpio.
        `;

        const { object } = await generateObject({
            model,
            schema: z.object({
                answer: z.string()
            }),
            prompt,
        });

        if (!object) {
            throw new Error("No response received from AI.");
        }

        return object.answer;
    } catch (error: any) {
        console.error("Error generating answer:", error);
        const errorString = typeof error === 'string' ? error : (error.message || JSON.stringify(error) || "");
        if (
            errorString.includes("429") ||
            errorString.toLowerCase().includes("quota") ||
            errorString.toLowerCase().includes("exhausted") ||
            errorString.includes("RESOURCE_EXHAUSTED") ||
            errorString.toLowerCase().includes("rate limit")
        ) {
            throw new Error("Has excedido la cuota gratuita de peticiones a la IA. Espera unos segundos o cambia de modelo o API Key.");
        }
        throw new Error(`No se pudo generar la respuesta: ${error.message}`);
    }
}
