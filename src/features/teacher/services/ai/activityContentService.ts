import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel } from "./client";

/**
 * Generate activity description/instructions using Vercel AI SDK
 */
export async function generateActivityDescription(
    prompt: string,
    activityType: string,
    userId: string
): Promise<string> {
    const model = await getAIModel(userId);

    const systemPrompt = `Eres un asistente educativo experto en crear instrucciones claras y detalladas para actividades académicas.
Tu tarea es generar instrucciones informativas para una actividad de tipo ${activityType}.

Las instrucciones deben:
- Ser claras y fáciles de entender
- Incluir el contexto y objetivos de aprendizaje
- Proporcionar información útil para los estudiantes
- Estar en formato Markdown
- Ser concisas pero completas (200-400 palabras)

NO incluyas:
- Criterios de evaluación (eso va en el enunciado)
- Rúbricas de calificación
- Puntos específicos a evaluar

Genera instrucciones para: ${prompt}`;

    const { object } = await generateObject({
        model,
        schema: z.object({
            content: z.string()
        }),
        prompt: systemPrompt
    });

    if (!object?.content) {
        throw new Error("No se pudo generar contenido");
    }

    return object.content;
}

/**
 * Generate activity statement/rubric using Vercel AI SDK
 */
export async function generateActivityStatement(
    prompt: string,
    activityType: string,
    userId: string
): Promise<string> {
    const model = await getAIModel(userId);

    const systemPrompt = `Eres un asistente educativo experto en crear enunciados y rúbricas de evaluación para actividades académicas.
Tu tarea es generar un enunciado detallado con rúbrica de evaluación para una actividad de tipo ${activityType}.

El enunciado debe incluir:
- Descripción clara de lo que se debe entregar
- Requisitos específicos y detallados
- Rúbrica de evaluación con criterios y porcentajes
- Formato de entrega esperado
- Ejemplos si es apropiado
- Estar en formato Markdown con tablas para la rúbrica

Estructura sugerida:
# Enunciado
[Descripción de la actividad]

## Requisitos
- Requisito 1
- Requisito 2
...

## Rúbrica de Evaluación
| Criterio | Descripción | Porcentaje |
|----------|-------------|------------|
| ... | ... | ... |

## Formato de Entrega
[Especificaciones del formato]

Genera un enunciado completo con rúbrica para: ${prompt}`;

    const { object } = await generateObject({
        model,
        schema: z.object({
            content: z.string()
        }),
        prompt: systemPrompt
    });

    if (!object?.content) {
        throw new Error("No se pudo generar contenido");
    }

    return object.content;
}

export interface ChecklistCriterion {
    id: string;
    name: string;
    question?: string;
    expectedAnswer?: string;
    description: string;
    percentage: number;
}

/**
 * Genera criterios de evaluación estructurados (Checklist) a partir del enunciado de la actividad,
 * formulando preguntas clave de sustentación conceptual para que el docente evalúe si el estudiante
 * comprende en profundidad lo que desarrolló y entregó.
 */
export async function generateChecklistCriteria(
    statement: string,
    userId: string,
    aiModelName?: string,
    options?: {
        isAlternative?: boolean;
        existingCriteria?: Array<{ name: string; question?: string; expectedAnswer?: string }>;
    }
): Promise<ChecklistCriterion[]> {
    const model = await getAIModel(userId, aiModelName);

    let alternativeSection = "";
    if (options?.isAlternative && options.existingCriteria && options.existingCriteria.length > 0) {
        const listText = options.existingCriteria
            .map((c, i) => `${i + 1}. Criterio actual: "${c.name}" | Pregunta ya formulada: "${c.question || ''}"`)
            .join("\n");

        alternativeSection = `
MISIÓN CRÍTICA - CREAR EXACTAMENTE UNA (1) NUEVA PREGUNTA ADICIONAL (SIN REPETIR LAS YA EXISTENTES):
El docente ya tiene las siguientes preguntas y criterios en su lista:
${listText}

INSTRUCCIONES:
- Debes generar EXACTAMENTE UN (1) criterio nuevo con su pregunta de sustentación complementaria.
- NO repitas ninguno de los criterios ni preguntas anteriores.
- Identifica otro aspecto o requerimiento puntual del enunciado que aún no esté evaluado.
- Esta única nueva pregunta se agregará a la lista del docente manteniendo intactas las existentes.
`;
    }

    const systemPrompt = `Eres un docente universitario y evaluador académico experto en ingeniería de software.
Tu tarea es analizar a fondo el siguiente enunciado de actividad y formular una **Lista de Chequeo de Sustentación Oral y Verificación Conceptual**.

REGLA FUNDAMENTAL DE FIDELIDAD AL ENUNCIADO (ESTRICTA Y OBLIGATORIA):
1. DEBES EXTRAER Y BASARTE EXCLUSIVAMENTE EN LOS TEMAS PRINCIPALES Y PUNTUALES QUE APARECEN EN EL ENUNCIADO.
2. Lee cada título, sección, requerimiento, tecnología, framework, biblioteca, convención institucional, regla de negocio y entidad mencionada en el texto.
   - Ejemplo real: si el enunciado especifica "Convenciones de Nombres CESDE (kebab-case y estructura de repositorios)", "Configuración del Proyecto en Spring Boot (Group com.cesde y Artifact en Maven/Gradle)", o "Modelado de Dominio y Mapeo de Entidades JPA", los criterios DEBEN titularse exactamente sobre esos temas y requerimientos puntuales.
3. PROHIBIDO GENERAR TÍTULOS GENÉRICOS DE PLANTILLA (NO uses títulos vagos como "Comprensión de Arquitectura", "Principios de POO" o "Manejo de Errores" a menos que el enunciado trate específicamente de eso). Los criterios deben ser un reflejo fiel y directo de los temas puntuales solicitados en la actividad.
4. Las preguntas de sustentación DEBEN interrogar al estudiante sobre cómo y por qué implementó esos requisitos específicos exigidos en el enunciado, verificando que comprende cada decisión y no se limitó a copiar o generar código a ciegas.

REQUISITOS ESTRUCTURALES:
1. Genera ${options?.isAlternative ? "EXACTAMENTE 1 nuevo criterio adicional" : "entre 3 y 5 criterios principales que cubran los temas medulares del enunciado"}.
2. Para cada criterio:
   - name: Título específico que nombre el tema o requisito puntual del enunciado.
   - question: 1 a 2 preguntas orales técnicas directas para hacerle al estudiante en la sustentación (mencionando las herramientas, convenciones, clases, anotaciones o configs solicitadas).
   - expectedAnswer: La justificación técnica puntual y conceptual que el estudiante debe dar para demostrar comprensión real.
   - description: Qué archivos, configuraciones o elementos de código específicos se deben inspeccionar en el repositorio.
   - percentage: Porcentaje entero asignado al criterio.
${alternativeSection}

Texto del Enunciado de la Actividad:
"""
${statement}
"""`;

    const minCount = options?.isAlternative ? 1 : 2;
    const maxCount = options?.isAlternative ? 1 : 5;

    const { object } = await generateObject({
        model,
        schema: z.object({
            criteria: z.array(z.object({
                name: z.string().describe("Nombre o concepto clave evaluado"),
                question: z.string().describe("Preguntas de sustentación que el docente le formulará al estudiante"),
                expectedAnswer: z.string().describe("Respuesta esperada o evidencia conceptual que debe dar el estudiante"),
                description: z.string().describe("Descripción de lo que se evalúa"),
                percentage: z.number().min(1).max(100).describe("Porcentaje o peso del criterio"),
            })).min(minCount).max(maxCount)
        }),
        prompt: systemPrompt
    });

    if (!object?.criteria || object.criteria.length === 0) {
        throw new Error("No se pudieron generar criterios a partir del enunciado");
    }

    return object.criteria.map((c, idx) => ({
        id: `crit_${Date.now()}_${idx}`,
        name: c.name,
        question: c.question,
        expectedAnswer: c.expectedAnswer,
        description: c.description,
        percentage: c.percentage,
    }));
}

export interface VerifyCriterionResult {
    isRelated: boolean;
    feedback: string;
    suggestedName?: string;
    suggestedQuestion?: string;
    suggestedExpectedAnswer?: string;
    suggestedDescription?: string;
}

/**
 * Verifica individualmente si una pregunta o criterio tiene relación directa con el contenido
 * del enunciado de la actividad. Si es necesario, lo alinea y ajusta usando IA.
 */
export async function verifyCriterionRelation(
    statement: string,
    criterion: {
        name: string;
        question?: string;
        expectedAnswer?: string;
        description?: string;
    },
    userId: string,
    aiModelName?: string
): Promise<VerifyCriterionResult> {
    const model = await getAIModel(userId, aiModelName);

    const systemPrompt = `Eres un auditor académico y docente experto en ingeniería de software.
Tu misión es VERIFICAR PREGUNTA POR PREGUNTA que el siguiente criterio de sustentación TENGA RELACIÓN DIRECTA, REAL Y EXACTA con el contenido y requerimientos del ENUNCIADO de la actividad.

OBJETIVO OBLIGATORIO:
Comprobar si la pregunta y su concepto tienen relación real, directa y explícita con los temas, requisitos, tecnologías, clases, entidades o estándares del enunciado.

ENUNCIADO DE LA ACTIVIDAD:
"""
${statement}
"""

CRITERIO Y PREGUNTA A VERIFICAR:
- Criterio / Tema: "${criterion.name}"
- Pregunta de sustentación: "${criterion.question || ''}"
- Respuesta esperada: "${criterion.expectedAnswer || ''}"
- Descripción técnica: "${criterion.description || ''}"

INSTRUCCIONES DE AUDITORÍA Y VERIFICACIÓN:
1. Revisa minuciosamente el enunciado para ver si este tema o pregunta corresponde a algo solicitado o relevante en la actividad.
2. Si tiene relación directa:
   - isRelated = true
   - feedback: Indica con qué sección, tecnología o requisito puntual del enunciado se relaciona.
   - Pule si es necesario la pregunta y respuesta esperada para citar textualmente los términos y requisitos exactos del enunciado.
3. Si NO tiene relación directa o es genérica/desconectada del enunciado:
   - isRelated = false
   - feedback: Explica brevemente el motivo de la desconexión.
   - Reformular suggestedName, suggestedQuestion, suggestedExpectedAnswer y suggestedDescription para que queden 100% basados en un requerimiento real y puntual que sí esté en el enunciado.`;

    const { object } = await generateObject({
        model,
        schema: z.object({
            isRelated: z.boolean().describe("Indica si el criterio y pregunta tienen relación directa con el enunciado"),
            feedback: z.string().describe("Retroalimentación sobre la relación con el enunciado"),
            suggestedName: z.string().describe("Nombre del criterio verificado o alineado al enunciado"),
            suggestedQuestion: z.string().describe("Pregunta de sustentación verificada o alineada al enunciado"),
            suggestedExpectedAnswer: z.string().describe("Respuesta conceptual esperada y alineada"),
            suggestedDescription: z.string().describe("Aspectos técnicos puntuales a verificar en el código"),
        }),
        prompt: systemPrompt
    });

    return object;
}

/**
 * Asigna la ponderación porcentual de cada pregunta/criterio usando IA
 * según la complejidad, impacto técnico e importancia pedagógica de cada una en el enunciado.
 * La suma total de los porcentajes siempre es exactamente 100%.
 */
export async function balanceCriteriaPercentagesWithAI(
    statement: string,
    criteria: Array<{
        id: string;
        name: string;
        question?: string;
        description?: string;
    }>,
    userId: string,
    aiModelName?: string
): Promise<Array<{ id: string; percentage: number; justification?: string }>> {
    const model = await getAIModel(userId, aiModelName);

    const criteriaListText = criteria
        .map((c, i) => `ID: "${c.id}" | Criterio #${i + 1}: "${c.name}" | Pregunta: "${c.question || ''}" | Descripción: "${c.description || ''}"`)
        .join("\n");

    const systemPrompt = `Eres un docente universitario y director de cátedra experto en evaluación de proyectos de software.
Tu misión es EVALUAR LA IMPORTANCIA RELATIVA DE CADA UNA DE LAS SIGUIENTES PREGUNTAS / CRITERIOS y ASIGNARLES UNA PONDERACIÓN PORCENTUAL JUSTA que sume exactamente 100%.

ENUNCIADO DE LA ACTIVIDAD:
"""
${statement}
"""

LISTA ACTUAL DE CRITERIOS / PREGUNTAS A PONDERAR:
${criteriaListText}

CRITERIOS DE PONDERACIÓN PEDAGÓGICA:
1. Revisa qué temas son centrales, complejos y críticos en el enunciado (por ejemplo: modelado de dominio, JPA, persistencia, arquitectura, lógica de negocio principal). Esos temas deben recibir mayor peso porcentual.
2. Revisa qué temas son introductorios o de configuración formal (por ejemplo: convención de nombres, creación de repositorios, dependencias iniciales). Deben tener un porcentaje menor pero acorde a su valor.
3. La suma TOTAL de los porcentajes asignados a todos los criterios DEBE SER ESTRICTAMENTE 100%.
4. Asigna porcentajes enteros (mínimo 5%, máximo 70%).
5. Debes devolver la ponderación para cada criterio referenciando su ID exacto.`;

    const { object } = await generateObject({
        model,
        schema: z.object({
            weights: z.array(z.object({
                id: z.string().describe("ID exacto del criterio evaluado"),
                percentage: z.number().int().min(5).max(80).describe("Porcentaje asignado al criterio"),
                justification: z.string().describe("Breve justificación de por qué tiene este peso según el enunciado"),
            }))
        }),
        prompt: systemPrompt
    });

    const weights = object.weights;
    const currentSum = weights.reduce((acc, w) => acc + w.percentage, 0);
    if (currentSum !== 100 && weights.length > 0) {
        const diff = 100 - currentSum;
        weights[0].percentage += diff;
    }

    return weights;
}

