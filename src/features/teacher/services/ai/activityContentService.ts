import { generateObject, generateText } from "ai";
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
 * Generate activity statement/rubric using Vercel AI SDK, customized per activity type and model
 */
export async function generateActivityStatement(
    prompt: string,
    activityType: string,
    userId: string,
    aiModelName?: string,
    options?: {
        level?: string;
    }
): Promise<string> {
    const model = await getAIModel(userId, aiModelName);

    const levelText = options?.level ? `Nivel de dificultad / complejidad académica: ${options.level}.` : "";

    let activityTypeGuidance = "";
    switch (activityType) {
        case "GITHUB":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Evaluación Automática con IA (Repositorio GitHub).
Los estudiantes entregarán un repositorio de código GitHub. La IA inspecciona los archivos y evalúa la arquitectura y ejecución.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Taller / Proyecto]

## Descripción del Proyecto
[Explicación contextual del problema, objetivo formativo y alcance del sistema]

## Requerimientos Técnicos
1. **[Módulo/Componente 1]**: [Detalles específicos, funciones esperadas, patrones]
2. **[Módulo/Componente 2]**: [Validaciones, tipos de datos, casos especiales]
3. **[Buenas Prácticas]**: [Clean Code, modularidad, separación de responsabilidades]

## Rúbrica de Evaluación
* **Funcionalidad y Lógica (40%)**: [Descripción clara del cumplimiento funcional esperado]
* **Arquitectura y Calidad de Código (30%)**: [Modularidad, legibilidad y estándares]
* **Manejo de Errores y Casos Límite (20%)**: [Control de excepciones y robustez]
* **Pruebas y Documentación (10%)**: [Comentarios técnicos o pruebas unitarias]

## Formato de Entrega (Opcional - Ignorado por la IA)
- Repositorio GitHub con los archivos solicitados en la raíz o rutas correspondientes.`;
            break;

        case "CODE_CHALLENGE":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Desafío de Código / Algoritmos en Vivo (Monaco Editor integrado).
El estudiante resuelve el ejercicio directamente en la plataforma escribiendo código en archivos específicos.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Taller de Programación en Vivo]

## Enunciado y Objetivos
[Descripción clara y rigurosa del problema a resolver, entradas y salidas esperadas]

## Requerimientos Técnicos
1. **Lógica Principal**: [Explicación de la función o algoritmo central a implementar]
2. **Casos Especiales y Validaciones**: [Manejo de valores extremos, nulos o vacíos]
3. **Eficiencia y Complejidad**: [Restricciones de tiempo/espacio si aplica]

## Archivos a Resolver
- Revisa los archivos de código asignados en el editor para implementar la solución.

## Criterios de Evaluación
* **Lógica y Corrección (40%)**: [Cumplimiento riguroso de las especificaciones del problema]
* **Estructura y Calidad de Código (35%)**: [Legibilidad, buenas prácticas y modularidad]
* **Control de Errores y Eficiencia (25%)**: [Manejo de casos límite y rendimiento de la solución]`;
            break;

        case "DB_MODELING":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Base de Datos Relacional y Programación SQL.
El estudiante debe entregar scripts SQL estructurados (DDL, DML, DQL) y justificar el diseño relacional.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Taller de Modelado y Programación SQL]

## Enunciado y Requerimientos del Negocio
[Contexto del negocio real o caso de estudio, descripción de las entidades principales]

## Reglas del Negocio
1. [Regla de cardinalidad o integridad 1, ej: Claves primarias únicas y obligatorias]
2. [Regla 2, ej: Normalización hasta 3FN eliminando dependencias transitivas]
3. [Regla 3, ej: Restricciones de integridad referencial con ON DELETE CASCADE / RESTRICT]

## Entregables Solicitados en el Script SQL (.sql)
1. **Definición de Estructura (DDL)**: Sentencias CREATE TABLE con tipos de datos correctos, PKs y FKs.
2. **Datos de Prueba (DML)**: Sentencias INSERT con registros coherentes para poblar las tablas.
3. **Consultas de Negocio (DQL)**: Consultas SELECT que involucren JOINs, filtros y funciones de agregación.

## Criterios de Evaluación
* **Estructura e Integridad DDL (40%)**: [Correcta definición de esquemas, PKs, FKs y restricciones]
* **Manipulación de Datos DML (30%)**: [Coherencia de datos de prueba y operaciones de inserción]
* **Normalización 3FN (20%)**: [Eliminación de redundancias y dependencias parciales/transitivas]
* **Consultas DQL (10%)**: [Precisión técnica y optimización de las consultas SQL solicitadas]`;
            break;

        case "PDF_REVIEW":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Revisión de Documento e Informe Técnico (PDF con IA).
El estudiante redacta y entrega un informe o ensayo en PDF que la IA analizará en estructura y contenido.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Informe / Documento Técnico]

## Descripción del Documento
[Contexto temático, objetivo de la investigación o reporte técnico escrito]

## Estructura Esperada del Documento
1. **Introducción y Objetivos**: [Definición del tema y alcance]
2. **Desarrollo y Fundamentación Técnica**: [Análisis en profundidad de los conceptos]
3. **Casos Prácticos o Resultados**: [Evidencias, diagramas o métricas]
4. **Conclusiones y Referencias Bibliográficas**: [Síntesis final y fuentes consultadas]

## Rúbrica de Calificación
* **Calidad y Profundidad del Contenido (50%)**: [Rigor conceptual, argumentos y cobertura de temas]
* **Estructura y Coherencia (30%)**: [Organización lógica, fluidez y claridad en la redacción]
* **Normas y Presentación Académica (20%)**: [Uso de citas bibliográficas, ortografía y formato]

## Formato de Entrega (Opcional - Ignorado por la IA)
- Documento en formato PDF compartido mediante enlace de acceso público.`;
            break;

        case "VIDEO_PITCH":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Sustentación en Video / Pitch del Proyecto.
El estudiante graba un video breve (3 a 5 minutos) exponiendo oralmente y demostrando el sistema desarrollado.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título de la Sustentación en Video / Pitch]

## Objetivo
[Propósito de la sustentación oral, tiempo máximo sugerido de 3 a 5 minutos]

## Estructura Recomendada del Pitch
1. **Introducción y Problema (1 min)**: [Definición clara del problema y propuesta de valor]
2. **Arquitectura y Stack Tecnológico (1.5 min)**: [Justificación de herramientas y diseño de software]
3. **Demostración en Vivo del Producto (1.5 min)**: [Recorrido funcional evidenciando los requerimientos]
4. **Retos y Aprendizajes (1 min)**: [Principales desafíos técnicos superados y conclusiones]

## Criterios de Evaluación
* **Dominio Técnico (40%)**: [Solvencia conceptual y argumentación de las decisiones de ingeniería]
* **Estructura y Claridad Oral (30%)**: [Capacidad de síntesis, fluidez y comunicación asertiva]
* **Demostración Práctica (30%)**: [Evidencia tangible del funcionamiento correcto del software]`;
            break;

        case "AUDIO_DEFENSE":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Sustentación en Audio / Podcast Técnico.
El estudiante entrega una pista de audio técnica (3 a 5 minutos) defendiendo su solución con rigor conceptual.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Podcast / Sustentación en Audio]

## Objetivo
[Propósito de la defensa oral en formato podcast, tiempo máximo sugerido de 3 a 5 minutos]

## Estructura Recomendada del Audio
1. **Introducción y Contexto (1 min)**: [Presentación y justificación del problema resuelto]
2. **Decisiones Técnicas y Arquitectura (2 min)**: [Argumentación profunda del diseño y patrones]
3. **Retos Técnicos y Conclusiones (2 min)**: [Dificultades encontradas y lecciones aprendidas]

## Criterios de Evaluación
* **Argumentación y Coherencia (40%)**: [Solidez para defender técnicamente las decisiones tomadas]
* **Profundidad y Vocabulario Técnico (35%)**: [Uso preciso de terminología de ingeniería de software]
* **Estructura y Síntesis (25%)**: [Organización lógica y apego al tiempo asignado]`;
            break;

        case "AI_INTERVIEW":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Entrevista Técnica Simulada con Asistente IA.
El estudiante interactúa en una sesión de preguntas y respuestas en vivo con la IA sobre temas técnicos clave.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título de la Entrevista Técnica con IA]

## Objetivo de la Evaluación
[Propósito del examen oral interactivo y simulación de entrevista profesional]

## Temas a Evaluar
- **Conceptos Fundamentales**: [Puntos clave teóricos y de arquitectura que formulará la IA]
- **Toma de Decisiones**: [Justificación técnica de patrones, librerías y estructuras]
- **Resolución de Escenarios**: [Respuestas ante casos prácticos y solución de problemas]

## Criterios de Evaluación
* **Dominio Técnico (40%)**: [Precisión teórica y vocabulario técnico especializado]
* **Resolución de Problemas (35%)**: [Criterio ingenieril ante preguntas situacionales]
* **Claridad y Comunicación (25%)**: [Estructura en las respuestas y poder de síntesis]`;
            break;

        case "DOCUMENTATION":
            activityTypeGuidance = `
TIPO DE DOCUMENTO: Lección o Módulo de Documentación Académica y Técnica en Markdown (GFM).
El docente está creando material de estudio interactivo, guías paso a paso o documentación técnica de la materia.
ESTRUCTURA DE LA DOCUMENTACIÓN:
# [Título del Tema o Módulo]

> [!NOTE]
> Introducción conceptual o resumen de objetivos clave.

## 1. Fundamentos y Contexto
[Explicación teórica clara, pedagógica y accesible con analogías o casos de uso]

## 2. Ejemplos Prácticos y Código
\`\`\`[lenguaje]
// Código de ejemplo detallado y documentado con comentarios didácticos
\`\`\`

## 3. Arquitectura y Buenas Prácticas
[Directrices, tablas comparativas GFM o patrones recomendados]

## 4. Guía Paso a Paso
1. **Paso 1**: [Descripción]
2. **Paso 2**: [Descripción]

## 5. Resumen y Puntos Clave
* **Punto clave 1**: [Detalle]
* **Punto clave 2**: [Detalle]`;
            break;

        case "MANUAL":
        default:
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Entrega Libre / Calificación Manual Docente.
Actividad académica evaluada directamente por el profesor sin procesamiento automático de IA.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título de la Actividad / Taller]

## Descripción de la Actividad
[Explicación clara del contexto, metas y entregables solicitados al estudiante]

## Instrucciones y Requerimientos
1. [Requerimiento 1 detallado]
2. [Requerimiento 2 detallado]
3. [Requerimiento 3 detallado]

## Criterios de Calificación
* **[Criterio Principal] (50%)**: [Descripción del cumplimiento esperado]
* **[Criterio Secundario] (30%)**: [Descripción de calidad y metodología]
* **[Puntualidad y Presentación] (20%)**: [Normas de presentación y rigor formal]`;
            break;
    }

    const isDoc = activityType === "DOCUMENTATION";
    const systemPrompt = `Eres un diseñador instruccional y docente universitario experto en ingeniería de software y ciencias de la computación.
Tu misión es redactar ${isDoc ? "una lección o documento educativo completo, motivador y profesional" : "un enunciado académico completo, motivador y profesional con su respectiva rúbrica de evaluación"} en formato Markdown para una ${isDoc ? "lección de documentación" : `actividad académica de tipo "${activityType}"`}.
${levelText}

${activityTypeGuidance}

REGLAS CRÍTICAS Y OBLIGATORIAS:
${isDoc ? `1. Diseña una lección pedagógica enriquecida con encabezados claros (#, ##, ###), bloques de notas (> [!NOTE], > [!TIP], > [!WARNING]), código con sintaxis resaltada y tablas comparativas.
2. Explica los conceptos de manera progresiva, desde lo más básico hasta casos avanzados con buenas prácticas.
3. No incluyas rúbricas de calificación de entregas (es un documento de estudio/lección).` : `1. La sección de criterios de evaluación (Rúbrica) DEBE OBLIGATORIAMENTE usar viñetas con el formato exacto:
   * **Nombre del Criterio (Porcentaje%)**: Descripción detallada de lo evaluado.
   Ejemplo:
   * **Funcionalidad y Lógica (40%)**: Cumple con todos los requisitos pedidos.
   * **Arquitectura de Software (35%)**: Modularidad y buenas prácticas.
   * **Manejo de Errores (25%)**: Tratamiento de excepciones.

2. La suma exacta de los porcentajes de todos los criterios DEBE SER EXACTAMENTE 100%. NUNCA generes una rúbrica que sume más o menos de 100%.`}

3. Adapta todo el contenido específicamente al prompt del docente, personalizando nombres de componentes, casos de uso, tecnologías y requerimientos técnicos relevantes.

4. Responde ÚNICAMENTE con el documento Markdown generado. NO incluyas introducciones como "Aquí tienes el enunciado..." ni bloques de código envolventes markdown de nivel raíz (\`\`\`markdown ... \`\`\`). Devuelve el Markdown puro comenzando en el encabezado #.`;

    const result = await generateText({
        model,
        system: systemPrompt,
        prompt: `Tema o requerimientos dados por el profesor para la actividad:
"${prompt}"

Genera el enunciado completo con su rúbrica siguiendo estrictamente la estructura y reglas indicadas.`,
    });

    let content = result.text.trim();

    // Eliminar envoltorios de bloques de código markdown si el LLM los colocó
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

    return content.trim();
}

/**
 * Refines or adapts an existing activity statement based on teacher's follow-up chat prompts/instructions
 */
export async function refineActivityStatement(
    currentStatement: string,
    instruction: string,
    activityType: string,
    userId: string
): Promise<string> {
    const model = await getAIModel(userId);
    const isDoc = activityType === "DOCUMENTATION";

    const systemPrompt = isDoc
        ? `Eres un docente y educador técnico experto en ingeniería de software y redacción pedagógica.
Tu labor es modificar, adaptar, expandir o perfeccionar una lección o documento educativo según las instrucciones específicas que te dé el profesor (por ejemplo: explicar conceptos paso a paso, añadir ejemplos de código prácticos y comentados, resumir, estructurar en tablas comparativas, agregar diagramas Mermaid, profundizar en detalles técnicos, etc.).

DOCUMENTO ACTUAL DE LA LECCIÓN:
"""markdown
${currentStatement}
"""

REGLAS CRÍTICAS Y ESTRICTAS:
1. Aplica con máxima precisión los cambios solicitados por el profesor en la instrucción dada, manteniendo intactas las partes que no solicitó modificar.
2. Este es un documento de estudio / lección: NO agregues rúbricas ni criterios de evaluación con porcentajes (es material de aprendizaje, no un examen de entrega).
3. Utiliza Markdown GFM enriquecido: títulos claros (#, ##, ###), bloques de notas (> [!NOTE], > [!TIP], > [!WARNING]), bloques de código con sintaxis resaltada y tablas o diagramas cuando corresponda.
4. Devuelve ÚNICAMENTE el documento Markdown completo actualizado. NO agregues saludos, explicaciones, ni envuelvas todo el documento en bloques de código markdown (\`\`\`markdown ... \`\`\`). Empieza directamente con el encabezado # o el contenido del documento.`
        : `Eres un diseñador instruccional y docente universitario experto en ingeniería de software.
Tu labor es modificar, adaptar o refinar un enunciado de actividad académica y su rúbrica según las instrucciones específicas que te dé el profesor (por ejemplo: simplificar, resumir, aumentar nivel, cambiar lenguaje, agregar o quitar requerimientos, etc.).

TIPO DE ACTIVIDAD: "${activityType}".

DOCUMENTO ACTUAL (ENUNCIADO Y RÚBRICA EXISTENTE):
"""markdown
${currentStatement}
"""

REGLAS CRÍTICAS Y ESTRICTAS:
1. Aplica con precisión los cambios solicitados por el profesor en la instrucción dada, preservando lo que no se pidió cambiar.
2. Si la rúbrica de evaluación cambia, DEBE OBLIGATORIAMENTE mantener el formato de viñetas:
   * **Nombre del Criterio (Porcentaje%)**: Descripción detallada.
   Y la suma de todos los porcentajes DEBE TOTALIZAR EXACTAMENTE 100%.
3. Mantén un formato Markdown limpio, profesional y consistente con la estructura de la actividad.
4. Devuelve ÚNICAMENTE el documento Markdown completo actualizado. NO agregues saludos, explicaciones, ni envuelvas todo en bloques de código markdown (\`\`\`markdown ... \`\`\`). Empieza directamente con el encabezado #.`;

    const userPrompt = isDoc
        ? `Instrucción del profesor para adaptar el documento o lección:
"${instruction}"

Genera el documento Markdown completo actualizado aplicando los cambios solicitados.`
        : `Instrucción del profesor para adaptar el enunciado:
"${instruction}"

Genera el documento Markdown completo actualizado aplicando los cambios solicitados.`;

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

    return content.trim();
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

/**
 * Genera el código inicial / plantilla pedagógica para un archivo de código a partir de un prompt del docente.
 */
export async function generateCodeFileTemplate(
    prompt: string,
    fileName: string,
    language: string,
    userId: string,
    context?: {
        activityTitle?: string;
        activityStatement?: string;
        otherFiles?: { name: string }[];
        currentCode?: string;
    },
    aiModelName?: string
): Promise<string> {
    const model = await getAIModel(userId, aiModelName);

    const systemPrompt = `Eres un docente universitario experto en ingeniería de software y programación.
Tu misión es generar el código inicial / plantilla para el archivo "${fileName}" en el lenguaje "${language}".
Esta plantilla será la que vea el estudiante para resolver el ejercicio en su editor de código.

DIRECTRICES ESTRICTAS:
1. Devuelve ÚNICAMENTE el código fuente válido para el archivo "${fileName}".
2. NO incluyas explicaciones en lenguaje natural antes ni después del código.
3. NO utilices bloques de formato markdown (\`\`\` o \`\`\`${language}). Devuelve exclusivamente el texto plano del código.
4. Escribe una estructura limpia, idiomática y pedagógica:
   - Clases, interfaces, funciones o métodos requeridos con firmas y tipos adecuados.
   - Comentarios explicativos y directrices // TODO: indicando claramente al estudiante qué lógica o método debe implementar.
   - Si se trata de una clase base con métodos abstractos, decláralos abstractos o lanza excepciones/valores por defecto adecuados (ej. throw new UnsupportedOperationException("TODO: Implementar"); o pass).
   - Incluye importaciones necesarias según el lenguaje.`;

    let userPrompt = `ARCHIVO A GENERAR: ${fileName}\nLENGUAJE: ${language}\n\n`;
    if (context?.activityTitle) {
        userPrompt += `TÍTULO DE LA ACTIVIDAD: ${context.activityTitle}\n`;
    }
    if (context?.otherFiles && context.otherFiles.length > 0) {
        userPrompt += `OTROS ARCHIVOS DEL PROYECTO: ${context.otherFiles.map(f => f.name).join(", ")}\n`;
    }
    if (context?.activityStatement) {
        userPrompt += `CONTEXTO DEL ENUNCIADO GENERAL:\n${context.activityStatement.slice(0, 1800)}\n\n`;
    }
    if (context?.currentCode && context.currentCode.trim().length > 0 && !context.currentCode.includes("Código inicial para este archivo")) {
        userPrompt += `CÓDIGO ACTUAL DEL ARCHIVO (Referencia):\n${context.currentCode.slice(0, 1000)}\n\n`;
    }
    userPrompt += `INSTRUCCIÓN DEL DOCENTE (PROMPT):\n${prompt}`;

    const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
    });

    let code = result.text.trim();
    return formatSourceCode(code, language);
}

/**
 * Normaliza y formatea código fuente para asegurar que tenga saltos de línea y sangría limpia.
 * Previene que el código generado por IA aparezca en una sola línea minificada.
 */
export function formatSourceCode(rawCode: string, language: string = "java"): string {
    if (!rawCode) return "";

    let code = rawCode.trim();

    // Eliminar posibles bloques envolventes de markdown
    if (code.startsWith("```")) {
        code = code.replace(/^```[a-zA-Z0-9_\-#]*\n?/, "").replace(/\n?```$/, "").trim();
    }

    // Si tiene secuencias literales de escape "\n" o "\r\n" sin saltos de línea reales
    if (!code.includes("\n") && code.includes("\\n")) {
        code = code.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "    ");
    }

    const lines = code.split("\n");

    // Verificar si el código está comprimido en una sola línea o muy pocas líneas largas
    const isSingleLine = lines.length <= 4 && code.length > 80 && (code.includes("{") || code.includes(";"));
    const lang = language.toLowerCase();
    const isCStyle = !["python", "yaml", "yml"].includes(lang);

    if (isSingleLine && isCStyle) {
        return beautifyCStyleCode(code);
    }

    return lines
        .map(l => l.trimEnd())
        .join("\n")
        .trim();
}

/**
 * Beautifier de respaldo para lenguajes con llaves (Java, C#, C++, JS, TS, PHP, etc.)
 * si el modelo devolviera código condensado en una o pocas líneas.
 */
function beautifyCStyleCode(code: string): string {
    let result = "";
    let indentLevel = 0;
    const indentStr = "    ";
    let inString: string | null = null;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let inForParen = 0;
    let isEscaped = false;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || "";

        if (isEscaped) {
            result += char;
            isEscaped = false;
            continue;
        }

        if (char === "\\" && inString) {
            result += char;
            isEscaped = true;
            continue;
        }

        if (inString) {
            result += char;
            if (char === inString) {
                inString = null;
            }
            continue;
        }

        if (inSingleLineComment) {
            result += char;
            if (char === "\n") {
                inSingleLineComment = false;
            }
            continue;
        }

        if (inMultiLineComment) {
            result += char;
            if (char === "*" && nextChar === "/") {
                result += "/";
                i++;
                inMultiLineComment = false;
            }
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            inString = char;
            result += char;
            continue;
        }

        if (char === "/" && nextChar === "/") {
            inSingleLineComment = true;
            result += "//";
            i++;
            continue;
        }

        if (char === "/" && nextChar === "*") {
            inMultiLineComment = true;
            result += "/*";
            i++;
            continue;
        }

        // Detección de bucles for (...) para no romper líneas en ';'
        if (char === "(") {
            const precedingText = code.slice(Math.max(0, i - 10), i).trim();
            if (precedingText.endsWith("for") || inForParen > 0) {
                inForParen++;
            }
            result += char;
            continue;
        }

        if (char === ")") {
            if (inForParen > 0) {
                inForParen--;
            }
            result += char;
            continue;
        }

        // Apertura de bloque {
        if (char === "{") {
            result = result.trimEnd();
            result += " {\n";
            indentLevel++;
            result += indentStr.repeat(indentLevel);
            while (code[i + 1] === " " || code[i + 1] === "\t") {
                i++;
            }
            continue;
        }

        // Cierre de bloque }
        if (char === "}") {
            result = result.trimEnd();
            indentLevel = Math.max(0, indentLevel - 1);
            result += "\n" + indentStr.repeat(indentLevel) + "}\n";
            result += indentStr.repeat(indentLevel);
            while (code[i + 1] === " " || code[i + 1] === "\t") {
                i++;
            }
            continue;
        }

        // Fin de sentencia ;
        if (char === ";") {
            result += ";";
            if (inForParen === 0) {
                result += "\n" + indentStr.repeat(indentLevel);
                while (code[i + 1] === " " || code[i + 1] === "\t") {
                    i++;
                }
            } else {
                result += " ";
            }
            continue;
        }

        if (char === "\n") {
            result = result.trimEnd() + "\n" + indentStr.repeat(indentLevel);
            continue;
        }

        result += char;
    }

    return result
        .split("\n")
        .map(l => l.trimEnd())
        .filter((line, idx, arr) => {
            if (line.trim() === "" && (arr[idx - 1]?.trim() === "" || idx === 0 || idx === arr.length - 1)) {
                return false;
            }
            return true;
        })
        .join("\n")
        .trim();
}

/**
 * Genera la solución completa y funcional para TODOS los archivos de un taller de código (Code Challenge).
 * Diseñado para que el docente pueda simular y probar la actividad en el "Modo Estudiante".
 */
export async function generateAllCodeChallengeSolutions(
    files: Array<{ id: string; name: string; content: string }>,
    language: string,
    statement: string,
    activityTitle: string,
    userId: string,
    aiModelName?: string
): Promise<Array<{ id: string; name: string; content: string }>> {
    const model = await getAIModel(userId, aiModelName);

    const systemPrompt = `Eres un arquitecto de software senior y docente universitario experto en ${language}.
Tu misión es resolver y escribir la solución COMPLETA, FUNCIONAL, DE MÁXIMA CALIDAD ACADÉMICA y PERFECTAMENTE FORMATEADA para TODOS los archivos de un taller práctico de programación.

DIRECTRICES OBLIGATORIAS DE FORMATO Y CONTENIDO:
1. FORMATO Y LEGIBILIDAD (MÁXIMA PRIORIDAD):
   - ESTÁ ESTRICTAMENTE PROHIBIDO generar código en una sola línea o minificado.
   - Cada clase, interfaz, método, bloque (if, for, while, switch, try-catch), llave de apertura '{' y llave de cierre '}' DEBE estar en su propia línea con saltos de línea '\\n'.
   - Usa sangría/indentación estándar de exactamente 4 espacios por cada nivel de anidamiento.
   - Deja exactamente una línea en blanco entre métodos y constructores.
   - Incluye comentarios Javadoc o comentarios explicativos breves antes de cada clase, método y constructor.

2. SOLUCIÓN COMPLETA Y FUNCIONAL (100% CUMPLIMIENTO):
   - Resuelve TODOS los requerimientos y reglas de negocio del enunciado sin omitir ningún método ni validación.
   - Implementa constructores completos, getters, setters, métodos abstractos o sobreescritos (@Override), validaciones de parámetros (lanzando excepciones pertinentes como IllegalArgumentException, etc.).
   - PROHIBIDO dejar stubs vacíos, comentarios "// TODO" o métodos sin implementar. Todo el código debe ser funcional, compilable y de nivel profesional.

3. CONSISTENCIA ENTRE ARCHIVOS:
   - Respeta estrictamente los nombres de archivos, paquetes, imports y relaciones de herencia e interfaces entre los archivos del taller.

4. FORMATO DE SALIDA:
   - Devuelve para cada archivo el código fuente limpio y listo para guardar, sin bloques envolventes de markdown (\`\`\`).`;

    const filesContext = files.map((f, i) => `--- ARCHIVO #${i + 1}: ${f.name} ---\nPlantilla actual:\n${f.content || "// Vacío"}`).join("\n\n");

    const userPrompt = `TÍTULO DE LA ACTIVIDAD: ${activityTitle}
LENGUAJE: ${language}

ENUNCIADO Y REQUERIMIENTOS:
${statement}

ARCHIVOS DEL TALLER QUE DEBES RESOLVER:
${filesContext}

RECUERDA: Genera la solución COMPLETA para cada archivo, con código limpio, ordenado, indentado a 4 espacios y con saltos de línea '\\n' entre cada instrucción. NUNCA generes código en una sola línea.`;

    const SolutionSchema = z.object({
        solutions: z.array(
            z.object({
                name: z.string().describe("Nombre exacto del archivo con su extensión"),
                content: z.string().describe("Código fuente COMPLETO y EXTENSO con saltos de línea '\\n' e indentación de 4 espacios. NUNCA minificado ni en una sola línea.")
            })
        ).describe("Lista de soluciones completas y formateadas para cada archivo")
    });

    const { object } = await generateObject({
        model,
        schema: SolutionSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.1,
    });

    // Mapear soluciones generadas respetando IDs originales y aplicando formateador estricto
    const updatedFiles = files.map(file => {
        const found = object.solutions.find(s => s.name.trim().toLowerCase() === file.name.trim().toLowerCase());
        if (found) {
            const formattedCode = formatSourceCode(found.content, language);
            return {
                ...file,
                content: formattedCode
            };
        }
        return file;
    });

    return updatedFiles;
}

/**
 * Genera la lista de temas o apartados obligatorios requeridos para la sustentación
 * en Video Pitch, Audio Defense o Entrevista con IA.
 */
export async function generateRequiredTopics(
    statement: string,
    activityType: "VIDEO_PITCH" | "AUDIO_DEFENSE" | "AI_INTERVIEW" | "DB_MODELING",
    activityTitle?: string,
    userId?: string,
    aiModelName?: string
): Promise<string[]> {
    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const model = await getAIModel(userId, aiModelName);

    let roleDescription = "";
    if (activityType === "VIDEO_PITCH") {
        roleDescription = `Estás formulando la estructura temática obligatoria de un VIDEO PITCH (sustentación corta en video) para una actividad académica.
El estudiante deberá grabar un video de 3 a 7 minutos cubriendo secuencialmente estos apartados.
Debes generar entre 3 y 5 títulos concisos, profesionales y directamente pertinentes al contenido específico de la actividad.
Ejemplos de apartados típicos adaptados al tema:
- "Contexto del Problema y Justificación"
- "Arquitectura de la Solución y Tecnologías Empleadas"
- "Demostración en Vivo del Código y Pruebas"
- "Retos Técnicos, Optimización y Conclusiones"`;
    } else if (activityType === "AUDIO_DEFENSE") {
        roleDescription = `Estás formulando los temas de debate o argumentación oral obligatorios para una SUSTENTACIÓN EN AUDIO O PODCAST TÉCNICO.
El estudiante grabará su defensa oral explicando sus decisiones de diseño y resolución del taller.
Debes generar entre 3 y 5 títulos claros, puntuales y específicos adaptados al enunciado y título del taller.
Ejemplos de apartados:
- "Problema y Contexto de Negocio"
- "Decisiones de Arquitectura y Patrones Implementados"
- "Solución Técnica a Casos Límite y Desafíos"
- "Conclusiones y Aprendizajes Obtenidos"`;
    } else if (activityType === "DB_MODELING") {
        roleDescription = `Estás formulando la lista de ENTIDADES O TABLAS OBLIGATORIAS para un taller o proyecto de MODELADO DE BASE DE DATOS (Relacional / SQL / PostgreSQL).
Debes analizar detalladamente el enunciado o caso de negocio y deducir o extraer entre 3 y 6 nombres de tablas/entidades fundamentales que el estudiante obligatoriamente debe diseñar en su script SQL o modelo entidad-relación (ERD).
Ejemplos de tablas según el contexto:
- Sistema de Ventas: "Usuarios", "Clientes", "Productos", "Pedidos", "Detalle_Pedidos"
- Sistema Académico: "Estudiantes", "Docentes", "Cursos", "Matrículas", "Calificaciones"
- Sistema Financiero: "Clientes", "Cuentas", "Transacciones", "Tarjetas", "Auditoría"
Cada nombre de tabla debe ser conciso (1 a 3 palabras máximo, ej. "Usuarios", "Roles", "Transacciones", "Auditoría"), sin símbolos raros ni numeraciones prefijas.`;
    } else {
        roleDescription = `Estás formulando las áreas temáticas clave de evaluación para una SIMULACIÓN DE ENTREVISTA TÉCNICA O EXAMEN ORAL CON IA.
Debes generar entre 3 y 5 áreas conceptuales y prácticas prioritarias que el entrevistador IA debe interrogar al alumno.`;
    }

    const isDb = activityType === "DB_MODELING";
    const systemPrompt = `${roleDescription}

REGLAS OBLIGATORIAS:
1. Analiza a fondo el título y el enunciado de la actividad.
2. ${isDb 
    ? 'Deduce o extrae las entidades o tablas de base de datos directamente requeridas por el enunciado o indispensables para modelar el dominio descrito. Cada entidad debe ser el nombre de una tabla (ej: "Usuarios", "Roles", "Transacciones", "Auditoría").' 
    : 'Si el enunciado describe tecnologías, conceptos o reglas específicas (ej. Spring Boot, JPA, Normalización SQL, Polimorfismo en Java, Git, React, APIs REST, etc.), los títulos de los temas DEBEN reflejar explícitamente esos conceptos técnicos reales.'}
3. ${isDb 
    ? 'Cada nombre de entidad debe ser conciso (1 a 3 palabras, de 2 a 50 caracteres).' 
    : 'Cada título de tema debe ser conciso (entre 3 y 8 palabras), claro y con formato capitalizado (ej: "Modelado de Datos y Relaciones SQL").'}
4. Genera una lista de 3 a 6 elementos como máximo. No agregues números (#1, #2), solo el texto limpio.`;

    const userPrompt = `TÍTULO DE LA ACTIVIDAD:
${activityTitle || "Sin título definido"}

ENUNCIADO / INSTRUCCIONES:
${statement || "Sin enunciado detallado"}`;

    const TopicsSchema = z.object({
        topics: z.array(z.string().min(2).max(120)).min(2).max(8).describe(
            activityType === "DB_MODELING" 
                ? "Lista de entidades o nombres de tablas obligatorias deducidas del enunciado"
                : "Lista de temas o apartados obligatorios ordenados lógicamente"
        )
    });

    const { object } = await generateObject({
        model,
        schema: TopicsSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
    });

    if (!object?.topics || object.topics.length === 0) {
        throw new Error(
            activityType === "DB_MODELING"
                ? "No se pudieron generar las entidades obligatorias con la IA."
                : "No se pudieron generar los temas requeridos con la IA."
        );
    }

    return object.topics.map(t => t.trim().replace(/^#?\d+[\.\-\)]\s*/, ''));
}

/**
 * Genera la secuencia completa de pasos para un taller (WORKSHOP_CODE o WORKSHOP_GITHUB) con IA.
 */
export async function generateAllWorkshopSteps(params: {
    title: string;
    topicPrompt: string;
    workshopType: "WORKSHOP_CODE" | "WORKSHOP_GITHUB";
    language?: string;
    stepCount?: number;
    level?: string;
    userId: string;
    aiModelName?: string;
}): Promise<{
    summary: string;
    steps: Array<{
        title: string;
        instructions: string;
        starterCode?: string;
        expectedSolution?: string;
        hints: string[];
        suggestedMinutes?: number;
    }>;
}> {
    const {
        title,
        topicPrompt,
        workshopType,
        language = "java",
        stepCount = 4,
        level = "intermedio",
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const isCode = workshopType === "WORKSHOP_CODE";

    const systemPrompt = `Eres un docente universitario y diseñador instruccional experto en ingeniería de software y programación.
Tu objetivo es diseñar un taller formativo práctico paso a paso de tipo ${isCode ? "Codelab interactivo (Monaco Editor)" : "Taller práctico con repositorio Git y GitHub"}.

DIRECTRICES OBLIGATORIAS:
1. Diseña exactamente ${stepCount} pasos pedagógicos secuenciales que vayan de lo simple a lo complejo.
2. Cada paso debe tener un título claro (ej: "Paso 1: Definición de Entidades Base"), instrucciones detalladas en Markdown explicando el problema y qué debe implementar el estudiante.
3. ${isCode 
    ? `Para cada paso, debes incluir:
       - starterCode: Código inicial en ${language} con la firma de métodos/clases y comentarios '// TODO' para que el estudiante complete.
       - expectedSolution: Solución de referencia 100% funcional y correcta en ${language}.
       - hints: 2 o 3 pistas orientativas sin dar la respuesta completa.`
    : `Para cada paso en Git & GitHub:
       - instructions: Comandos git recomendados, diseño de ramas, commits específicos y verificación del código en ${language}.
       - hints: 2 o 3 pistas pedagógicas sobre Git o la arquitectura solicitada.`}
4. Nivel académico: ${level}.
5. Formato de código: Debe ser limpio, con saltos de línea y sangría adecuada de 4 espacios.`;

    const userPrompt = `Título del taller: "${title}"
Temática / Requisitos solicitados por el docente:
${topicPrompt || "Crea un taller completo con pasos secuenciales aplicando buenas prácticas."}
Lenguaje principal: ${language}
Cantidad de pasos solicitados: ${stepCount}`;

    const StepSchema = z.object({
        summary: z.string().describe("Resumen general conciso del taller y sus objetivos"),
        steps: z.array(z.object({
            title: z.string().describe("Título del paso con prefijo Paso N: ..."),
            instructions: z.string().describe("Instrucciones detalladas en Markdown con contexto y requerimientos"),
            starterCode: z.string().optional().describe("Código inicial para el estudiante"),
            expectedSolution: z.string().optional().describe("Solución de referencia completa y funcional"),
            hints: z.array(z.string()).describe("Lista de 2 a 3 pistas orientativas"),
            suggestedMinutes: z.number().optional().describe("Minutos estimados para este paso (ej: 15)")
        })).min(1).max(8)
    });

    const { object } = await generateObject({
        model,
        schema: StepSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
    });

    if (!object?.steps || object.steps.length === 0) {
        throw new Error("No se pudieron generar los pasos del taller con la IA.");
    }

    return object;
}

/**
 * Genera o enriquece un paso individual de un taller.
 */
export async function generateSingleWorkshopStep(params: {
    stepTitle: string;
    prompt?: string;
    currentInstructions?: string;
    workshopType: "WORKSHOP_CODE" | "WORKSHOP_GITHUB";
    language?: string;
    workshopTitle?: string;
    userId: string;
    aiModelName?: string;
}): Promise<{
    title: string;
    instructions: string;
    starterCode?: string;
    expectedSolution?: string;
    hints: string[];
}> {
    const {
        stepTitle,
        prompt = "",
        currentInstructions = "",
        workshopType,
        language = "java",
        workshopTitle = "",
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const isCode = workshopType === "WORKSHOP_CODE";

    const systemPrompt = `Eres un docente universitario experto en ${language}.
Tu tarea es generar o perfeccionar un PASO pedagógico específico para el taller "${workshopTitle}".
${isCode ? "El paso se resolverá en un editor de código interactivo." : "El paso se resolverá en Git y GitHub."}

Debes retornar:
- title: Título conciso del paso.
- instructions: Instrucciones detalladas en formato Markdown con el objetivo, requisitos y guía práctica.
- starterCode: (Opcional, si aplica) Código base con plantillas y comentarios TODO en ${language}.
- expectedSolution: (Opcional, si aplica) Solución completa de referencia.
- hints: 2 a 3 pistas pedagógicas.`;

    const userPrompt = `Paso: ${stepTitle}
Instrucciones previas (si las hay): ${currentInstructions}
Petición o ajuste específico del docente: ${prompt || "Genera el contenido completo y código para este paso."}
Lenguaje: ${language}`;

    const SingleStepSchema = z.object({
        title: z.string().describe("Título del paso"),
        instructions: z.string().describe("Instrucciones claras en Markdown"),
        starterCode: z.string().optional().describe("Código inicial"),
        expectedSolution: z.string().optional().describe("Solución de referencia"),
        hints: z.array(z.string()).describe("2 a 3 pistas pedagógicas")
    });

    const { object } = await generateObject({
        model,
        schema: SingleStepSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
    });

    if (!object?.title) {
        throw new Error("No se pudo generar el contenido del paso con la IA.");
    }

    return object;
}

/**
 * Genera pistas pedagógicas para un paso específico de un taller.
 */
export async function generateWorkshopStepHints(params: {
    stepTitle: string;
    instructions: string;
    language?: string;
    userId: string;
    aiModelName?: string;
}): Promise<string[]> {
    const { stepTitle, instructions, language = "java", userId, aiModelName } = params;
    const model = await getAIModel(userId, aiModelName);

    const systemPrompt = `Eres un tutor pedagógico de programación.
Genera entre 2 y 3 pistas breves (1 a 2 oraciones cada una) para guiar a un estudiante en la resolución del siguiente paso formativo, sin regalarle la solución directa.`;

    const userPrompt = `Paso: ${stepTitle}
Instrucciones del paso: ${instructions}
Lenguaje: ${language}`;

    const HintsSchema = z.object({
        hints: z.array(z.string().min(5).max(200)).min(1).max(4)
    });

    const { object } = await generateObject({
        model,
        schema: HintsSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
    });

    return object?.hints || [];
}

