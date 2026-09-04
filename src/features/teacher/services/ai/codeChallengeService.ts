import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface CodeChallengeGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    timeComplexity: string;
    spaceComplexity: string;
    algorithmicEfficiency: string;
    strengths: string[];
    weaknesses: string[];
    edgeCasesHandled: boolean;
    suggestedImprovements: string[];
    feedback: string;
}

const CodeChallengeGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación final recomendada en escala de 0.0 a 5.0"),
    summary: z.string().describe("Resumen general conciso del desempeño del estudiante en el algoritmo"),
    timeComplexity: z.string().describe("Complejidad temporal en notación Big-O (ej. O(1), O(n), O(n log n), O(n^2))"),
    spaceComplexity: z.string().describe("Complejidad espacial en notación Big-O (ej. O(1), O(n))"),
    algorithmicEfficiency: z.string().describe("Diagnóstico de eficiencia: Óptima, Aceptable, Ineficiente"),
    strengths: z.array(z.string()).describe("Lista de puntos fuertes de la solución"),
    weaknesses: z.array(z.string()).describe("Lista de oportunidades de mejora o errores"),
    edgeCasesHandled: z.boolean().describe("Si la solución contempla casos extremos/límites adecuadamente"),
    suggestedImprovements: z.array(z.string()).describe("Recomendaciones técnicas concretas para optimizar"),
    feedback: z.string().describe("Retroalimentación formativa completa estructurada en Markdown con consejos de aprendizaje"),
});

/**
 * Evalúa una solución de Desafío de Código (Code Challenge) con Gemini.
 */
export async function gradeCodeChallenge(params: {
    studentCode?: string;
    files?: Array<{ name: string; content: string }>;
    language: string;
    statement: string;
    testCases?: Array<{ input: string; expectedOutput: string; isSecret?: boolean }>;
    testExecutionSummary?: { passed: number; total: number; details?: string };
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<CodeChallengeGradingResult> {
    const {
        studentCode = "",
        files = [],
        language,
        statement,
        testCases = [],
        testExecutionSummary,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);

    const modePrompt = {
        normal: "Sé constructivo y formativo. Reconoce el esfuerzo algorítmico y premia la lógica básica.",
        moderate: "Equilibra la precisión algorítmica con la comprensión teórica. Evalúa tanto corrección como eficiencia Big-O.",
        strict: "Sé riguroso con la eficiencia O(N), legibilidad, edge cases y cumplimiento exacto de la rúbrica.",
    }[gradingMode];

    const prompt = `
Eres un profesor y evaluador experto en Algoritmos, Estructuras de Datos y Ciencias de la Computación.
Tu misión es evaluar la solución de código de un estudiante para un desafío de programación.

---
### LENGUAJE: ${language}
### MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### ENUNCIADO Y RESTRICCIONES DEL PROBLEMA:
${statement || "No se proveyó enunciado explícito. Evalúa la corrección general del código."}

---
### CASOS DE PRUEBA CONFIGURADOS:
${
    testCases.length > 0
        ? testCases.map((tc, idx) => `Test #${idx + 1}: Input: ${tc.input} | Expected Output: ${tc.expectedOutput} ${tc.isSecret ? "(Oculto)" : ""}`).join("\n")
        : "No hay casos de prueba preconfigurados."
}

${
    testExecutionSummary
        ? `\n### RESULTADOS DE EJECUCIÓN PREVIA DE PRUEBAS:\nPasaron: ${testExecutionSummary.passed}/${testExecutionSummary.total}\nDetalles: ${testExecutionSummary.details || "N/A"}`
        : ""
}

---
### CÓDIGO DEL ESTUDIANTE:
${
    files && files.length > 0
        ? files.map(f => `#### Archivo: \`${f.name}\`\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")
        : `\`\`\`${language}\n${studentCode}\n\`\`\``
}

---
### INSTRUCCIONES DE CALIFICACIÓN:
1. Analiza cuidadosamente la lógica del código entregado:
   - ¿El algoritmo resuelve efectivamente el problema planteado?
   - ¿Cuál es su complejidad temporal en notación Big-O (ej: O(1), O(n), O(n log n), O(n^2))?
   - ¿Cuál es su complejidad espacial en memoria auxiliar (O(1), O(n))?
   - ¿Maneja casos borde (arreglos vacíos, números negativos, valores repetidos)?
2. Calificación (0.0 a 5.0):
   - 4.5 - 5.0: Solución correcta, eficiente con complejidad óptima, código limpio y bien estructurado.
   - 3.8 - 4.4: Solución funcional correcta pero con oportunidades de optimización en complejidad o estilo.
   - 3.0 - 3.7: Solución parcialmente correcta o ineficiente (O(n^2) cuando se esperaba O(n)), fallando algunos casos borde.
   - 1.0 - 2.9: Lógica incompleta o con errores conceptuales severos de sintaxis/ejecución.
   - 0.0 - 0.9: Código no funcional, vacío o fuera de tema.
3. Genera una retroalimentación detallada y pedagógica en Markdown que incluya:
   - Resumen del análisis.
   - Cuadro comparativo de Complejidad Temporal y Espacial obtenida vs. esperada.
   - Buenas prácticas observadas y sugerencias de refactorización con pequeños fragmentos si aplica.
`;

    const { object } = await generateObject({
        model,
        schema: CodeChallengeGradingSchema,
        prompt,
    });

    return {
        ...object,
        feedback: repairFeedbackText(object.feedback),
        summary: repairFeedbackText(object.summary),
    };
}
