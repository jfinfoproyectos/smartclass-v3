import { getAIModel } from "./client";
import { generateObject, generateText } from "ai";
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
    userId?: string,
    docContext?: { docName: string; files: { title: string; slug: string; content: string }[] }
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

        let docContextPrompt = "";
        if (docContext && docContext.files.length > 0) {
            const formattedFiles = docContext.files.map(f => {
                const truncated = f.content.length > 8000 ? f.content.substring(0, 8000) + "\n..." : f.content;
                return `--- Archivo: ${f.title} (${f.slug}) ---\n${truncated}`;
            }).join("\n\n");
            docContextPrompt = `
        **DOCUMENTACIÓN BASE OBLIGATORIA (Fuente: ${docContext.docName})**:
        """
        ${formattedFiles}
        """
        La pregunta DEBE construirse y fundamentarse estrictamente a partir de los conceptos, arquitecturas o código contenidos en esta documentación.`;
        }

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
        ${docContextPrompt}
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

export interface DocPageContent {
    id: string;
    title: string;
    slug: string;
    content: string;
    category?: string | null;
}

export interface DocGenerationConfig {
    type: "both" | "Code" | "Text";
    codeCount?: number;
    textCount?: number;
    difficulty?: "easy" | "medium" | "hard" | "expert";
    language?: string;
    customPrompt?: string;
    includeBoilerplate?: boolean;
    includeTestCases?: boolean;
}

export interface GeneratedQuestionItem {
    type: "Code" | "Text";
    language?: string;
    text: string;
    referenceAnswer: string;
}

/**
 * Genera preguntas (de código y/o texto) basadas rigurosamente en archivos de documentación seleccionados.
 */
export async function generateQuestionsFromDocumentation(
    evaluationTitle: string,
    docName: string,
    files: DocPageContent[],
    config: DocGenerationConfig,
    userId?: string
): Promise<GeneratedQuestionItem[]> {
    try {
        const model = await getAIModel(userId);

        if (!files || files.length === 0) {
            throw new Error("Debes seleccionar al menos un archivo de la documentación.");
        }

        const difficultyDesc = {
            easy: "Nivel Inicial/Básico: conceptos esenciales y problemas directos.",
            medium: "Nivel Intermedio: aplicación de conceptos con lógica estructurada y comprensión clara.",
            hard: "Nivel Avanzado: análisis detallado, integración conceptual y manejo de casos complejos.",
            expert: "Nivel Experto: arquitectura, patrones, optimización y casos de borde críticos."
        }[config.difficulty || "medium"];

        const targetLanguage = config.language || "java";

        // Formatear archivos con límite de caracteres para evitar saturación de tokens
        const MAX_CHARS_PER_FILE = 12000;
        const formattedFiles = files.map(f => {
            const truncatedContent = f.content.length > MAX_CHARS_PER_FILE
                ? f.content.substring(0, MAX_CHARS_PER_FILE) + "\n...[Contenido truncado por longitud]..."
                : f.content;
            return `--- Archivo: ${f.title} (${f.slug}) ---\n${truncatedContent}`;
        }).join("\n\n");

        // Determinar requerimientos de distribución de preguntas
        let distributionText = "";
        const codeCount = config.codeCount ?? 1;
        const textCount = config.textCount ?? 1;

        if (config.type === "both") {
            distributionText = `Debes generar EXACTAMENTE ${textCount} pregunta(s) de tipo 'Text' (teórica/conceptual) Y ${codeCount} pregunta(s) de tipo 'Code' (ejercicio práctico en ${targetLanguage}). En total DEBES generar ${textCount + codeCount} preguntas.`;
        } else if (config.type === "Code") {
            distributionText = `Debes generar EXACTAMENTE ${codeCount} pregunta(s) de tipo 'Code' (ejercicio práctico de programación en lenguaje ${targetLanguage}).`;
        } else {
            distributionText = `Debes generar EXACTAMENTE ${textCount} pregunta(s) de tipo 'Text' (teórica/conceptual o de razonamiento).`;
        }

        const boilerplateInstruction = config.includeBoilerplate
            ? `Para las preguntas de tipo Code: DEBES incluir en el enunciado un bloque de código base o plantilla inicial (boilerplate) que el estudiante deba completar o corregir.`
            : `Para las preguntas de tipo Code: Pide al estudiante que escriba la solución desde cero.`;

        const testCasesInstruction = config.includeTestCases
            ? `Para las preguntas de tipo Code: DEBES incluir en el enunciado ejemplos de entrada y salida esperada (casos de prueba).`
            : `No incluyas casos de prueba extensos a menos que sea indispensable.`;

        const prompt = `
        Actúa como un profesor universitario experto en evaluación y pedagogía técnica.
        Tu tarea es generar preguntas de examen de calidad profesional basadas ESTRICTAMENTE en el contenido de los archivos de documentación suministrados.

        **CONTEXTO DE LA EVALUACIÓN**:
        - Título de la evaluación: "${evaluationTitle}"
        - Documentación fuente: "${docName}"
        - Dificultad general: ${difficultyDesc}
        - Lenguaje objetivo para preguntas de código: ${targetLanguage}
        ${config.customPrompt ? `- Indicaciones específicas del profesor: "${config.customPrompt}"` : ""}

        **DISTRIBUCIÓN Y CANTIDAD DE PREGUNTAS**:
        ${distributionText}
        ${boilerplateInstruction}
        ${testCasesInstruction}

        **CONTENIDO DE LA DOCUMENTACIÓN SELECCIONADA**:
        """
        ${formattedFiles}
        """

        **PAUTAS OBLIGATORIAS**:
        1. **Fidelidad al contenido**: Todas las preguntas deben evaluar conocimientos, conceptos, sintaxis o ejemplos directamente explicados en los archivos de la documentación suministrados.
        2. **Preguntas de Texto (Type: 'Text')**:
           - Deben estar redactadas en Markdown enriquecido (títulos, negritas, listas ordenadas).
           - Evalúan comprensión conceptual, comparación de enfoques, identificación de componentes o diseño.
           - "referenceAnswer": Una respuesta modelo clara, completa y pedagógica que un profesor usaría para calificar.
        3. **Preguntas de Código (Type: 'Code')**:
           - 'language' debe ser '${targetLanguage}'.
           - El enunciado debe plantear un problema o caso práctico realista directamente relacionado con lo expuesto en la documentación.
           - "referenceAnswer": El código completo y correcto con indentación y saltos de línea claros.
        4. No des la respuesta dentro del enunciado de la pregunta.
        5. Devuelve la lista en el orden solicitado.
        `;

        const { object } = await generateObject({
            model,
            schema: z.object({
                questions: z.array(z.object({
                    type: z.enum(["Text", "Code"]),
                    language: z.string().optional().describe("Lenguaje de programación en minúsculas (ej: java, javascript, python) si es Code"),
                    text: z.string().describe("Enunciado de la pregunta en Markdown, completo y pedagógico"),
                    referenceAnswer: z.string().describe("Respuesta ideal de referencia o solución en código"),
                }))
            }),
            prompt,
        });

        if (!object || !object.questions || object.questions.length === 0) {
            throw new Error("No se recibieron preguntas de la IA.");
        }

        // Normalizar tipos y lenguajes
        return object.questions.map(q => ({
            type: q.type,
            language: q.type === "Code" ? (q.language || targetLanguage).toLowerCase() : undefined,
            text: q.text,
            referenceAnswer: q.referenceAnswer || ""
        }));
    } catch (error: any) {
        console.error("Error generating questions from documentation:", error);
        const errorString = typeof error === 'string' ? error : (error.message || JSON.stringify(error) || "");
        if (
            errorString.includes("429") ||
            errorString.toLowerCase().includes("quota") ||
            errorString.toLowerCase().includes("exhausted") ||
            errorString.includes("RESOURCE_EXHAUSTED") ||
            errorString.toLowerCase().includes("rate limit")
        ) {
            throw new Error("Has excedido la cuota de peticiones a la IA. Espera unos segundos o cambia de modelo o API Key.");
        }
        throw new Error(`No se pudo generar preguntas desde la documentación: ${error.message}`);
    }
}

/**
 * Modifica o adapta interactivamente el enunciado de una pregunta mediante chat con IA.
 */
export async function refineQuestionStatement(
    currentStatement: string,
    instruction: string,
    type: "Text" | "Code" = "Text",
    language?: string,
    userId?: string
): Promise<string> {
    const model = await getAIModel(userId);

    const typeDesc = type === "Code"
        ? `de programación (Código) en lenguaje ${language || "el lenguaje indicado en la pregunta"}`
        : "de Texto / razonamiento conceptual";

    const systemPrompt = `Eres un docente universitario experto en pedagogía técnica, didáctica y diseño de evaluaciones académicas.
Tu labor es modificar, adaptar, simplificar, profundizar o perfeccionar el enunciado de una PREGUNTA DE EXAMEN ${typeDesc} según las instrucciones específicas que te dé el profesor (por ejemplo: simplificar para principiantes, subir exigencia técnica, cambiar lenguaje, agregar o quitar requerimientos, incluir fragmentos de código, plantear casos de prueba, añadir casos límite, etc.).

ENUNCIADO ACTUAL DE LA PREGUNTA:
"""markdown
${currentStatement}
"""

REGLAS CRÍTICAS Y ESTRICTAS:
1. Aplica con máxima precisión los cambios solicitados por el profesor en la instrucción dada, preservando las partes que no solicitó cambiar.
2. NO agregues rúbricas de calificación con porcentajes ni criterios de entrega grupal (se trata de una PREGUNTA DE EXAMEN individual, no un taller de entrega libre).
3. Utiliza Markdown GFM limpio y profesional: títulos (#, ##, ###), negritas, listas ordenadas y bloques de código con sintaxis resaltada (\`\`\`${language || "lenguaje"}\`\`\`) cuando corresponda.
4. NO des la respuesta o solución resuelta dentro del enunciado de la pregunta (el enunciado es lo que ve el estudiante antes de responder).
5. Devuelve ÚNICAMENTE el enunciado Markdown completo actualizado. NO agregues saludos, explicaciones ("Aquí tienes tu pregunta:"), ni envuelvas todo el documento en bloques externos \`\`\`markdown ... \`\`\`. Empieza directamente con el contenido de la pregunta.`;

    const userPrompt = `Instrucción del profesor para adaptar la pregunta:
"${instruction}"

Genera el enunciado Markdown completo actualizado aplicando los cambios solicitados.`;

    try {
        const result = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
        });

        let content = result.text.trim();

        if (content.startsWith("```markdown")) {
            content = content.replace(/^```markdown\s*/i, "");
            content = content.replace(/\s*```$/i, "");
        } else if (content.startsWith("```")) {
            content = content.replace(/^```[a-z]*\s*/i, "");
            content = content.replace(/\s*```$/i, "");
        }

        if (!content) {
            throw new Error("El modelo de IA no devolvió contenido.");
        }

        return content;
    } catch (error: any) {
        console.error("Error refining question statement:", error);
        const errorString = typeof error === 'string' ? error : (error.message || JSON.stringify(error) || "");
        if (
            errorString.includes("429") ||
            errorString.toLowerCase().includes("quota") ||
            errorString.toLowerCase().includes("exhausted") ||
            errorString.includes("RESOURCE_EXHAUSTED") ||
            errorString.toLowerCase().includes("rate limit")
        ) {
            throw new Error("Has excedido la cuota de peticiones a la IA. Espera unos segundos o cambia de modelo o API Key.");
        }
        throw new Error(`No se pudo adaptar la pregunta: ${error.message}`);
    }
}

