import { getAIModel, extractJSON } from "@/features/teacher/services/ai/client";
import { generateText } from "ai";
import { 
    TemplateVariable, 
    ParsedDocxResult,
    parseDocxBuffer,
    generateFilledDocx,
    createDemoTutelaDocx
} from "../utils/docxUtils";

export type { TemplateVariable, ParsedDocxResult };

/**
 * Servicio de backend para análisis y diligenciamiento con IA de plantillas Word
 */
export const docxTemplateService = {
    parseDocxBuffer,
    generateFilledDocx,
    createDemoTutelaDocx,

    /**
     * OPCIÓN A: Analiza el texto completo de un documento con IA para detectar automáticamente
     * variables sugeridas, valores a reemplazar, categorías y bloques narrativos
     */
    async analyzeDocumentForVariables(
        plainText: string,
        documentTypeHint?: string,
        userId?: string
    ): Promise<TemplateVariable[]> {
        const model = await getAIModel(userId);

        const systemPrompt = `Eres un Experto en Automatización Documental, Legal Tech y Sistemas de Plantillas Inteligentes.
Tu misión es analizar el texto de un documento (legal, contrato, tutela, informe, acta, etc.) y detectar automáticamente todas las partes o datos variables que deberían poder cambiarse para generar un nuevo caso o versión del documento.

REGLAS PARA DETECTAR VARIABLES:
1. Identifica datos de personas o entidades (Nombres propios, cédulas/DNI/NIT, direcciones, teléfonos, correos, nombres de empresas o juzgados).
2. Identifica montos de dinero y valores contractuales -> asígnales tipo "currency_words" (Moneda con letras) o "number".
3. Identifica períodos o lapsos con fecha inicial y final -> tipo "date_range".
4. Identifica firmas de personas o contratistas -> tipo "signature".
5. Identifica cláusulas o condiciones opcionales de sí/no -> tipo "conditional".
6. Identifica tablas de actividades o filas repetitivas -> tipo "dynamic_table".
7. Identifica citas de leyes, decretos o jurisprudencia -> tipo "legal_citation".
8. Identifica bloques narrativos amplios (antecedentes, hechos, pretensiones) -> tipo "paragraph".
9. Para cada variable asigna:
   - "id": identificador en snake_case (ej: "valor_total_contrato", "firma_contratista", "periodo_ejecucion", "sentencia_aplicable", "hechos_del_caso").
   - "label": etiqueta legible en español (ej: "Valor Total del Contrato").
   - "originalText": el texto EXACTO tal como aparece en el documento para poder reemplazarlo (ej: "$49.743.719" o "Del 1 al 30 de septiembre").
   - "type": "text" | "paragraph" | "date" | "number" | "select" | "currency_words" | "signature" | "conditional" | "dynamic_table" | "date_range" | "legal_citation".
   - "description": breve explicación de qué representa.
   - "aiPromptGuideline": instrucción recomendada para la IA cuando se diligencie el caso.

Debes responder ÚNICAMENTE con un JSON con la propiedad "variables":
{
  "variables": [
    {
      "id": "nombre_accionante",
      "label": "Nombre del Accionante",
      "originalText": "PEDRO PÉREZ",
      "type": "text",
      "description": "Nombre de la persona que interpone la solicitud",
      "aiPromptGuideline": "Nombre completo con apellidos"
    }
  ]
}`;

        const userPrompt = `DOCUMENTO A ANALIZAR:
${plainText.slice(0, 15000)}

${documentTypeHint ? `Tipo de documento indicado por el usuario: ${documentTypeHint}` : ""}

Identifica y extrae las variables sugeridas en formato JSON:`;

        try {
            const response = await generateText({
                model,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0.1,
            });

            const parsed = extractJSON<{ variables: TemplateVariable[] }>(response.text);
            if (parsed && Array.isArray(parsed.variables)) {
                return parsed.variables;
            }
            return [];
        } catch (error) {
            console.error("[docxTemplateService] Error detectando variables con IA:", error);
            return [];
        }
    },

    /**
     * COPILOTO IA: Diligencia automáticamente los valores de las variables a partir de un relato
     * libre del nuevo caso (ej: "Doña Carmen tiene 68 años, sufre de artrosis, EPS Sanitas le negó...")
     */
    async fillVariablesFromCaseDescription(
        caseDescription: string,
        variables: TemplateVariable[],
        userId?: string
    ): Promise<Record<string, string>> {
        const model = await getAIModel(userId);

        const systemPrompt = `Eres un Asistente Senior Especialista en Redacción y Diligenciamiento de Formatos y Documentos Oficiales.
El usuario te proporcionará un relato informal o descripción de un nuevo caso, y una lista de variables que deben ser diligenciadas para el documento final.

REGLAS DE DILIGENCIAMIENTO POR TIPO DE VARIABLE:
1. "text", "date", "number": Extrae los datos exactos del relato.
2. "currency_words": Devuelve el valor formateado seguido de las palabras en mayúsculas (ej: "$ 49.743.719 (CUARENTA Y NUEVE MILLONES SETECIENTOS CUARENTA Y TRES MIL SETECIENTOS DIECINUEVE PESOS M/CTE)").
3. "date_range": Devuelve el período redactado formalmente (ej: "Del 01 de septiembre de 2026 al 30 de septiembre de 2026 (30 días calendario)").
4. "conditional": Si la condición se cumple según el relato, redacta el párrafo correspondiente; si no se cumple, devuelve cadena vacía "".
5. "legal_citation": Cita la ley, decreto, artículo o sentencia constitucional relevante al caso concreto (ej: "Sentencia T-760 de 2008 de la Corte Constitucional y Artículo 8 de la Ley Estatutaria 1751 de 2015").
6. "signature": Coloca el nombre y cargo formal para el pie de firma (ej: "JUAN CARLOS PÉREZ GÓMEZ - C.C. 15.514.637").
7. "dynamic_table": Devuelve el resumen estructurado de las filas o actividades ejecutadas.
8. "paragraph": REDACTA el texto completo con estilo profesional, formal, riguroso y adaptado a las pautas de esa variable.
9. Si un dato no se menciona en el relato, deduce un valor coherente basado en el contexto legal o coloca "[POR DILIGENCIAR: Campo]".

Responde ÚNICAMENTE con un objeto JSON cuyas llaves sean los "id" de las variables y los valores sean las cadenas de texto correspondientes:
{
  "nombre_accionante": "Carmen Rodríguez",
  "hechos_del_caso": "1. El día 14 de agosto de 2024, la suscrita acudió..."
}`;

        const userPrompt = `RELATO DEL NUEVO CASO:
${caseDescription}

VARIABLES A DILIGENCIAR:
${JSON.stringify(variables.map(v => ({
    id: v.id,
    label: v.label,
    type: v.type,
    description: v.description,
    guideline: v.aiPromptGuideline
})), null, 2)}

Devuelve el JSON con los valores diligenciados:`;

        try {
            const response = await generateText({
                model,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0.2,
            });

            const parsed = extractJSON<Record<string, string>>(response.text);
            return parsed || {};
        } catch (error) {
            console.error("[docxTemplateService] Error diligenciando variables por IA:", error);
            throw new Error("No se pudo completar el diligenciamiento automático del caso con IA.");
        }
    },

    /**
     * MEJORA O REDACCIÓN CON IA: Pule, reescribe o redacta un párrafo narrativo según
     * el estilo o prompt seleccionado por el usuario (ej: jurídico, administrativo, etc.).
     */
    async refineNarrativeParagraph(params: {
        rawText: string;
        systemInstruction?: string;
        customGuideline?: string;
        variableLabel?: string;
        originalSampleText?: string;
        userId?: string;
    }): Promise<string> {
        const model = await getAIModel(params.userId);

        const systemPrompt = params.systemInstruction || 
            "Actúa como un experto redactor profesional de documentos formales. Pule, reescribe y mejora la redacción del texto respetando su intención, hechos y datos.";

        const userPrompt = `CAMPO O VARIABLE A REDACTAR: ${params.variableLabel || "Párrafo Narrativo"}
${params.originalSampleText ? `TEXTO DE REFERENCIA EN PLANTILLA ORIGINAL: "${params.originalSampleText}"\n` : ""}${params.customGuideline ? `INSTRUCCIÓN ESPECÍFICA ADICIONAL: "${params.customGuideline}"\n` : ""}
TEXTO O BORRADOR SUMINISTRADO POR EL USUARIO:
"""
${params.rawText}
"""

INSTRUCCIONES DE REDACCIÓN:
1. Aplica el estilo, tono y vocabulario solicitado con la máxima calidad y rigor formal.
2. Corrige puntuación, ortografía, sintaxis y coherencia narrativa.
3. Si el usuario ingresó ideas sueltas, viñetas o notas breves, desarróllalas de manera fluida y profesional sin inventar hechos no suministrados.
4. Devuelve ÚNICAMENTE el texto redactado final, sin preámbulos, sin comillas envolventes, sin explicaciones ni notas meta.`;

        try {
            const response = await generateText({
                model,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0.3,
            });

            return response.text.trim();
        } catch (error) {
            console.error("[docxTemplateService] Error refinando párrafo narrativo:", error);
            throw new Error("No se pudo mejorar la redacción del párrafo con IA.");
        }
    }
};
