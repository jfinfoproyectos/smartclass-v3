import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { getAIModel, extractJSON } from "./client";
import { formatCodeString } from "@/lib/codeFormatter";

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

        case "WORKSHOP_GITHUB":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Tutorial Guiado de Proyecto en Repositorio GitHub (Paso a Paso).
El estudiante construye un proyecto completo en su repositorio de GitHub siguiendo una secuencia guiada de pasos, con código y comandos Git explicados.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Proyecto / Tutorial GitHub]

## Objetivo del Tutorial
[Descripción general del producto, sistema o funcionalidad a construir de principio a fin]

## Stack Tecnológico y Arquitectura
[Lenguajes, frameworks, librerías y patrones de diseño a implementar]

## Metodología y Dinámica de Trabajo
1. El estudiante sigue la secuencia progresiva de pasos configurados para el proyecto.
2. Cada paso especifica el archivo a crear/modificar en el repositorio, el código fuente funcional y los comandos Git a ejecutar en la terminal.
3. Se verifica el historial de commits y la presencia de los archivos esperados en la rama principal.

## Criterios de Evaluación
* **Cumplimiento de Pasos del Repositorio (40%)**: [Implementación de los archivos y etapas requeridas]
* **Arquitectura y Calidad de Código (35%)**: [Código limpio, funcional, modular y con buenas prácticas]
* **Historial de Commits y Flujo Git (25%)**: [Commits semánticos y sincronización correcta con GitHub]`;
            break;

        case "WORKSHOP_CODE":
            activityTypeGuidance = `
TIPO DE ACTIVIDAD: Taller de Programación Interactivo Paso a Paso (Codelab Monaco Editor).
El estudiante resuelve etapas secuenciales directamente en el editor interactivo con código base, pistas y verificación.
ESTRUCTURA OBLIGATORIA DEL ENUNCIADO:
# [Título del Taller de Programación Paso a Paso]

## Objetivo del Taller
[Problema o reto secuencial que el estudiante resolverá etapa por etapa]

## Requerimientos Técnicos
1. [Requerimiento de la etapa inicial]
2. [Requerimiento de la etapa intermedia]
3. [Requerimiento de la etapa final]

## Criterios de Evaluación
* **Resolución de Etapas Secuenciales (40%)**: [Cumplimiento de los retos programados en cada paso]
* **Lógica y Buenas Prácticas (35%)**: [Calidad algorítmica, legibilidad y modularidad]
* **Pruebas y Manejo de Errores (25%)**: [Verificación de casos de prueba y robustez]`;
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
    statement?: string;
    language?: string;
    techStack?: string;
    architectureFocus?: string;
    generateFullContent?: boolean;
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
        targetFilePath?: string;
        targetFileContent?: string;
        gitCommands?: Array<{ command: string; explanation: string }>;
        validationRule?: string;
        hints: string[];
        suggestedMinutes?: number;
    }>;
}> {
    const {
        title,
        topicPrompt,
        workshopType,
        statement,
        language = "javascript",
        techStack,
        architectureFocus,
        generateFullContent = false,
        stepCount,
        level = "intermedio",
        userId,
        aiModelName
    } = params;

    // Detectar si el docente solicitó explícitamente una cantidad de pasos en el prompt (ej: "en 5 pasos", "dividir en 4 pasos")
    const promptStepMatch = topicPrompt?.match(/(?:en\s+|de\s+|con\s+|dividir en\s+)(\d+)\s*pasos?/i);
    const promptStepCount = promptStepMatch ? parseInt(promptStepMatch[1], 10) : undefined;
    const effectiveStepCount = stepCount || promptStepCount;

    const model = await getAIModel(userId, aiModelName);
    const isCode = workshopType === "WORKSHOP_CODE";
    const effectiveStack = techStack?.trim() || "Deducir automáticamente a partir de la temática y prompt del proyecto";

    const systemPrompt = `Eres un docente universitario y arquitecto de software de élite.
Tu objetivo es diseñar la secuencia pedagógica de pasos para el ${isCode ? "Codelab interactivo (Monaco Editor)" : "Tutorial GitHub de Proyectos (Paso a Paso con Verificación)"} "${title}".

REGLA CRÍTICA Y FUNDAMENTAL DE COHERENCIA CON EL ENUNCIADO:
${statement?.trim() ? `TODOS los pasos pedagógicos, rutas de archivo (targetFilePath), instrucciones, código y comandos DEBEN BASARSE ESTRICTAMENTE EN EL ENUNCIADO GENERAL DE LA ACTIVIDAD provisto a continuación.
- Cada paso debe representar un avance secuencial y directo para construir la solución del proyecto requerido en el enunciado.
- El stack tecnológico (lenguaje, framework, librerías y base de datos), las entidades del dominio, modelos, controladores y reglas de negocio DEBEN corresponder con exactitud rigurosa a lo estipulado en el enunciado.
- ESTÁ TERMINANTEMENTE PROHIBIDO cambiar de stack o inventar tecnologías que no pertenezcan al enunciado (por ejemplo: si el enunciado es de Spring Boot / Java, NO generes React, Node ni Python; si es React, no generes Spring Boot).
- Cada paso debe tener sentido dentro de la arquitectura exigida en el enunciado (ej: capas Controller, Service, Repository, Model).
- NO inventes funcionalidades no solicitadas o divergentes.` : `Diseña los pasos pedagógicos para implementar con rigor técnico el proyecto solicitado.`}

DIRECTRICES ESTRICTAS:
1. Pasos pedagógicos y secuenciales:
   ${effectiveStepCount 
       ? `Diseña exactamente ${effectiveStepCount} pasos pedagógicos secuenciales que representen una progresión lógica, limpia y realista del software.`
       : `Determina y diseña la cantidad óptima de pasos pedagógicos secuenciales (típicamente entre 3 y 6 pasos, adaptados con precisión a la complejidad y alcance del enunciado del proyecto) que representen una progresión lógica, limpia y realista del software.`
   }
2. Stack tecnológico y arquitectura:
   - Deduce el stack tecnológico (ej: Java / Spring Boot, React / Next.js, Python / FastAPI / Django, Node.js / Express, etc.) DIRECTAMENTE a partir del enunciado y la temática del docente.
   - Las rutas de archivo (targetFilePath) y extensiones DEBEN corresponder con absoluta precisión a la tecnología detectada (por ejemplo, si es Spring Boot: "pom.xml", "src/main/java/.../Application.java", "src/main/java/.../controller/ProductoController.java"; si es React: "src/App.jsx" o "src/components/..."; si es Python: "requirements.txt", "main.py", etc.).
   ${techStack ? `- Stack explícito solicitado: ${techStack}.` : ""}
   ${architectureFocus ? `- Enfoque arquitectónico solicitado: ${architectureFocus}.` : "- Aplica una arquitectura limpia y modular adecuada para el reto."}
${generateFullContent ? `
3. MODO COMPLETO: Debes generar para cada paso:
   - title: Título descriptivo (ej: "Paso 1: Configuración del Proyecto y Dependencias").
   - instructions: Explicación didáctica completa en Markdown con los objetivos y detalles claros, articulando cómo este paso contribuye al enunciado general.
   - targetFilePath: Ruta del archivo a crear/modificar en el repo con su extensión adecuada.
   - targetFileContent: Código 100% COMPLETO y funcional para ese archivo, sin TODOs ni código recortado.
   - codeExplanation: Desglose didáctico en Markdown explicando la arquitectura, los imports, clases, métodos y lógica clave del archivo para que el alumno aprenda por qué y cómo funciona.
   - localVerification: Comando o indicación exacta de prueba local (ej: './mvnw spring-boot:run', 'curl ...', 'npm test') para verificar el paso antes de hacer Git commit.
   - gitCommands: Array de comandos Git explicados didácticamente para la terminal.
   - validationRule: Regla de verificación básica en el repositorio.
` : `
3. MODO ESTRUCTURA (HOJA DE RUTA): Para cada paso define ÚNICAMENTE su estructura y planificación:
   - title: Título descriptivo (ej: "Paso 1: Configuración Inicial del Repositorio", "Paso 2: Modelos y Conexión").
   - instructions: Breve objetivo pedagógico del paso (1 a 2 oraciones) alineado con el enunciado.
   - targetFilePath: Ruta relativa del archivo que se creará o modificará en este paso según el stack (ej: "README.md", "pom.xml", "src/index.js", etc.).
   - validationRule: Regla de verificación básica en el repositorio.
   - targetFileContent: Debe ser una cadena VACÍA "" (el código se generará paso a paso posteriormente con el asistente).
`}
4. Flexibilidad de Pasos (Pasos solo de Instrucciones / Sin Archivo o Sin Git):
   - Si un paso es meramente conceptual, explicativo o de configuración local previa que no requiere crear o modificar un archivo en el repositorio, establece requiresFile: false y targetFilePath: null.
   - Si un paso no requiere ejecutar comandos Git, establece requiresGitCommands: false y gitCommands: [].
5. Nivel académico: ${level || "intermedio"}.
6. hints: En tutoriales GitHub debe ser un arreglo vacío [].`;

    const userPrompt = `Título del tutorial/proyecto: "${title}"
${statement?.trim() ? `ENUNCIADO GENERAL DE LA ACTIVIDAD (FUENTE DE VERDAD OBLIGATORIA):\n"""\n${statement.trim()}\n"""\n` : ""}
Temática / Requisitos específicos solicitados por el docente:
${topicPrompt || "Estructurar los pasos pedagógicos para implementar fielmente el proyecto especificado en el enunciado general."}
${techStack ? `Stack tecnológico explícito: ${techStack}` : "Deduce el stack del enunciado o del prompt"}
${architectureFocus ? `Enfoque: ${architectureFocus}` : ""}
${effectiveStepCount ? `Cantidad de pasos a estructurar: ${effectiveStepCount}` : "Cantidad de pasos: Determina la cantidad óptima según el alcance y requerimientos del proyecto/enunciado (o si el docente indicó un número en su prompt)"}
Modo de generación: ${generateFullContent ? "Tutorial Completo con Código" : "Solo Estructura y Hoja de Ruta"}`;

    const StepItemSchema = z.object({
        title: z.string().describe("Título del paso con prefijo Paso N: ..."),
        instructions: z.string().nullish().default("").describe("Instrucciones didácticas u objetivo pedagógico del paso"),
        requiresFile: z.boolean().nullish().default(true).describe("false si el paso es solo instructivo sin archivo de código, true si requiere archivo"),
        requiresGitCommands: z.boolean().nullish().default(true).describe("false si no requiere comandos Git, true si requiere Git"),
        targetFilePath: z.string().nullish().describe("Ruta relativa del archivo principal a crear/modificar en el repo GitHub (o null/vacío si requiresFile es false)"),
        targetFileContent: z.string().nullish().default("").describe("Código fuente del archivo (solo si es modo completo, o vacío si es solo estructura)"),
        codeExplanation: z.string().nullish().describe("Desglose pedagógico del código fuente explicando imports, métodos clave y arquitectura"),
        localVerification: z.string().nullish().describe("Instrucción o comando de prueba local antes de hacer commit (ej: npm test, curl, etc.)"),
        gitCommands: z.array(z.object({
            command: z.string().describe("Comando exacto de Git"),
            explanation: z.string().nullish().default("").describe("Explicación didáctica del comando Git")
        })).nullish().default([]).describe("Comandos Git paso a paso"),
        validationRule: z.string().nullish().describe("Regla de validación básica para comprobar en GitHub"),
        hints: z.array(z.string()).nullish().default([]).describe("Pistas orientativas (vacío para Tutorial GitHub)"),
        suggestedMinutes: z.number().nullish().describe("Minutos estimados para este paso")
    });

    const StepSchema = z.object({
        summary: z.string().nullish().default("").describe("Resumen general conciso del tutorial y su objetivo formativo"),
        steps: z.array(StepItemSchema).min(1).describe("Lista de pasos secuenciales del tutorial")
    });

    let generatedPlan: { summary?: string | null; steps: Array<z.infer<typeof StepItemSchema>> } | null = null;

    try {
        const { object } = await generateObject({
            model,
            schema: StepSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
        });
        generatedPlan = object;
    } catch (err: any) {
        console.warn("generateAllWorkshopSteps: generateObject falló (" + err?.message + "), activando rescate estructurado...");
        const rawText = err?.text || err?.response?.text || (typeof err?.cause === "object" ? (err.cause as any)?.text : undefined) || "";

        if (rawText && rawText.trim().length > 10) {
            try {
                const rawParsed = extractJSON<any>(rawText);
                const safeParsed = StepSchema.safeParse(rawParsed);
                if (safeParsed.success) {
                    generatedPlan = safeParsed.data;
                } else if (rawParsed?.steps && Array.isArray(rawParsed.steps)) {
                    generatedPlan = {
                        summary: rawParsed.summary || "",
                        steps: rawParsed.steps.map((s: any, idx: number) => ({
                            title: s.title || `Paso ${idx + 1}`,
                            instructions: s.instructions || "",
                            targetFilePath: s.targetFilePath || null,
                            targetFileContent: s.targetFileContent || "",
                            gitCommands: Array.isArray(s.gitCommands) ? s.gitCommands : [],
                            validationRule: s.validationRule || null,
                            hints: Array.isArray(s.hints) ? s.hints : [],
                            suggestedMinutes: typeof s.suggestedMinutes === "number" ? s.suggestedMinutes : null
                        }))
                    };
                }
            } catch (recoveryErr) {
                console.warn("extractJSON no pudo parsear rawText en generateAllWorkshopSteps:", recoveryErr);
            }
        }

        // Tier 2: Fallback con generateText si el proveedor falló en modo objeto
        if (!generatedPlan) {
            try {
                const textResult = await generateText({
                    model,
                    system: systemPrompt + "\nIMPORTANTE: Devuelve ÚNICAMENTE un objeto JSON con las claves 'summary' y 'steps'.",
                    prompt: userPrompt,
                    temperature: 0.2
                });
                if (textResult?.text) {
                    const parsed = extractJSON<any>(textResult.text);
                    if (parsed?.steps && Array.isArray(parsed.steps)) {
                        generatedPlan = {
                            summary: parsed.summary || "",
                            steps: parsed.steps.map((s: any, idx: number) => ({
                                title: s.title || `Paso ${idx + 1}`,
                                instructions: s.instructions || "",
                                targetFilePath: s.targetFilePath || null,
                                targetFileContent: s.targetFileContent || "",
                                gitCommands: Array.isArray(s.gitCommands) ? s.gitCommands : [],
                                validationRule: s.validationRule || null,
                                hints: Array.isArray(s.hints) ? s.hints : [],
                                suggestedMinutes: typeof s.suggestedMinutes === "number" ? s.suggestedMinutes : null
                            }))
                        };
                    }
                }
            } catch (genTextErr) {
                console.warn("Fallback generateText falló en generateAllWorkshopSteps:", genTextErr);
            }
        }

        // Tier 3: Fallback determinista seguro para que la experiencia de usuario nunca sea un error 500
        if (!generatedPlan || !generatedPlan.steps || generatedPlan.steps.length === 0) {
            const count = Math.max(1, Math.min(12, stepCount || 4));
            const baseExt = effectiveStack.toLowerCase().includes("python") ? "py" :
                            effectiveStack.toLowerCase().includes("java") ? "java" :
                            effectiveStack.toLowerCase().includes("react") || effectiveStack.toLowerCase().includes("next") ? "jsx" : "js";
            generatedPlan = {
                summary: `Tutorial de ${title} organizado en ${count} pasos secuenciales.`,
                steps: Array.from({ length: count }, (_, i) => ({
                    title: `Paso ${i + 1}: ${i === 0 ? "Configuración Inicial del Repositorio" : i === count - 1 ? "Pruebas y Verificación Final" : `Implementación Módulo ${i}`}`,
                    instructions: `Objetivo pedagógico de la fase ${i + 1}: Configurar y desarrollar los componentes correspondientes a esta etapa del proyecto.`,
                    requiresFile: true,
                    requiresGitCommands: true,
                    targetFilePath: i === 0 ? "README.md" : `src/step_${i + 1}.${baseExt}`,
                    targetFileContent: "",
                    gitCommands: [
                        { command: `git add .`, explanation: `Prepara los cambios del paso ${i + 1}.` },
                        { command: `git commit -m "feat: implementar paso ${i + 1}"`, explanation: "Confirma los cambios localmente." },
                        { command: "git push origin main", explanation: "Sincroniza con GitHub." }
                    ],
                    validationRule: "El archivo debe existir en el repositorio y contener la solución.",
                    hints: [],
                    suggestedMinutes: 20
                }))
            };
        }
    }

    const safePlan = generatedPlan || {
        summary: `Tutorial de ${title}`,
        steps: []
    };

    const steps = (safePlan.steps || []).map((s, idx) => ({
        ...s,
        requiresFile: s.requiresFile ?? Boolean(s.targetFilePath && s.targetFilePath.trim().length > 0),
        requiresGitCommands: s.requiresGitCommands ?? Boolean(s.gitCommands && s.gitCommands.length > 0),
        title: s.title || `Paso ${idx + 1}`,
        instructions: s.instructions || `Completar las consignas y directrices del paso ${idx + 1}.`,
        starterCode: undefined,
        expectedSolution: undefined,
        targetFilePath: s.targetFilePath || undefined,
        targetFileContent: generateFullContent ? (s.targetFileContent || "") : "",
        codeExplanation: s.codeExplanation || undefined,
        localVerification: s.localVerification || undefined,
        gitCommands: (s.gitCommands || []).map(gc => ({
            command: gc.command,
            explanation: gc.explanation || ""
        })),
        validationRule: s.validationRule || undefined,
        hints: !isCode ? [] : ((s.hints || []).filter(Boolean) as string[]),
        suggestedMinutes: s.suggestedMinutes || undefined
    }));

    return {
        summary: safePlan.summary || "",
        steps
    };
}

/**
 * Genera o enriquece el contenido completo de un paso individual de un taller.
 */
export async function generateSingleWorkshopStep(params: {
    stepTitle: string;
    prompt?: string;
    currentInstructions?: string;
    targetFilePath?: string;
    workshopType: "WORKSHOP_CODE" | "WORKSHOP_GITHUB";
    statement?: string;
    language?: string;
    techStack?: string;
    workshopTitle?: string;
    stepIndex?: number;
    totalSteps?: number;
    userId: string;
    aiModelName?: string;
}): Promise<{
    title: string;
    instructions: string;
    starterCode?: string;
    expectedSolution?: string;
    targetFilePath?: string;
    targetFileContent?: string;
    codeExplanation?: string;
    localVerification?: string;
    gitCommands?: Array<{ command: string; explanation: string }>;
    validationRule?: string;
    hints: string[];
}> {
    const {
        stepTitle,
        prompt = "",
        currentInstructions = "",
        targetFilePath = "",
        workshopType,
        statement,
        language = "javascript",
        techStack,
        workshopTitle = "",
        stepIndex,
        totalSteps,
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const isCode = workshopType === "WORKSHOP_CODE";
    const effectiveStack = techStack || language;

    const systemPrompt = `Eres un docente universitario experto en ${effectiveStack} e ingeniería de software.
Tu tarea es generar el CONTENIDO COMPLETO, DETALLADO Y 100% FUNCIONAL para el PASO formativo "${stepTitle}" del ${isCode ? "Codelab interactivo" : "Tutorial GitHub de proyecto"} "${workshopTitle}".

${statement?.trim() ? `REGLA DE COHERENCIA CON EL ENUNCIADO GENERAL:
El contenido, código fuente, explicaciones didácticas y comandos de este paso DEBEN BASARSE Y RESPONDER DIRECTAMENTE al Enunciado General del Proyecto provisto:
- Modela exactamente las entidades, reglas de negocio y lógica descritas en dicho enunciado.
- El archivo "${targetFilePath || 'del proyecto'}" debe solucionar la parte correspondiente a esta etapa dentro del proyecto global.` : ""}

Debes retornar:
- title: Título conciso del paso.
- instructions: Explicación didáctica, clara y detallada en formato Markdown describiendo el objetivo, la arquitectura y el propósito. El estudiante NO debe investigar por su cuenta ni resolver enigmas: TODAS las indicaciones deben estar completamente provistas en cada paso.
${isCode 
    ? `- starterCode: Código base con comentarios TODO en ${language}.
- expectedSolution: Solución completa de referencia funcional.
- hints: 2 a 3 pistas pedagógicas.`
    : `- targetFilePath: Ruta relativa del archivo que el alumno debe crear o modificar en su repo (ej: "${targetFilePath || 'src/index.js'}").
- targetFileContent: Código fuente o contenido 100% COMPLETO, limpio y funcional a ubicar en ese archivo. NO uses comentarios de 'TODO' para que el alumno adivine; el código debe estar completamente provisto para que construya el proyecto y entienda el tutorial.
- codeExplanation: Desglose didáctico y pedagógico en Markdown explicando imports, clases, métodos y decisiones arquitectónicas de este archivo.
- localVerification: Indicación o comando exacto de prueba local (ej: compilación, ejecución o prueba con curl) antes de Git.
- gitCommands: Array de comandos Git necesarios (ej: 'git add ...', 'git commit -m "..."', 'git push origin main') con su explicación clara de lo que hace cada uno.
- validationRule: Criterio de validación en GitHub (ej: "El archivo debe existir en la rama y no estar vacío").
- hints: Lista vacía [] (las pistas no aplican en este tipo de tutorial guiado).`}`;

    const userPrompt = `Paso a completar: ${stepTitle}
${statement?.trim() ? `ENUNCIADO GENERAL DEL PROYECTO (CONTEXTO OBLIGATORIO):\n"""\n${statement.trim()}\n"""\n` : ""}
${targetFilePath ? `Archivo objetivo configurado: ${targetFilePath}` : ""}
${stepIndex && totalSteps ? `Progreso en el taller: Paso ${stepIndex} de ${totalSteps}` : ""}
Objetivo inicial del paso: ${currentInstructions || "Generar paso completo"}
Petición o ajuste específico del docente: ${prompt || "Genera el contenido exhaustivo, el código fuente completo funcional y los comandos Git explicados paso a paso."}
Stack tecnológico: ${effectiveStack}`;

    const SingleStepSchema = z.object({
        title: z.string().nullish().default("").describe("Título del paso"),
        instructions: z.string().nullish().default("").describe("Instrucciones didácticas y completas en Markdown con todas las explicaciones necesarias"),
        starterCode: z.string().nullish().describe("Código inicial para Codelab"),
        expectedSolution: z.string().nullish().describe("Solución de referencia para Codelab"),
        targetFilePath: z.string().nullish().describe("Ruta relativa del archivo a crear en GitHub"),
        targetFileContent: z.string().nullish().default("").describe("Código fuente o contenido 100% completo del archivo a crear en GitHub"),
        codeExplanation: z.string().nullish().describe("Desglose pedagógico del código fuente explicando imports, métodos y arquitectura"),
        localVerification: z.string().nullish().describe("Instrucción o comando de prueba local"),
        gitCommands: z.array(z.object({
            command: z.string().describe("Comando exacto de Git"),
            explanation: z.string().nullish().default("").describe("Explicación pedagógica de lo que hace este comando Git")
        })).nullish().default([]).describe("Comandos Git paso a paso con explicación didáctica"),
        validationRule: z.string().nullish().describe("Regla de validación en el repositorio"),
        hints: z.array(z.string()).nullish().default([]).describe("Pistas pedagógicas (vacío para Tutorial GitHub)")
    });

    let object: z.infer<typeof SingleStepSchema> | null = null;

    try {
        const result = await generateObject({
            model,
            schema: SingleStepSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
        });
        object = result.object;
    } catch (err: any) {
        console.warn("generateSingleWorkshopStep: generateObject falló (" + err?.message + "), activando rescate de contenido...");
        const rawText = err?.text || err?.response?.text || (typeof err?.cause === "object" ? (err.cause as any)?.text : undefined) || "";

        // Tier 1: Intentar parsear el rawText con el extractor robusto
        if (rawText && rawText.trim().length > 10) {
            try {
                const rawParsed = extractJSON<any>(rawText);
                const safeParsed = SingleStepSchema.safeParse(rawParsed);
                if (safeParsed.success) {
                    object = safeParsed.data;
                } else if (rawParsed && typeof rawParsed === "object") {
                    object = {
                        title: rawParsed.title || stepTitle,
                        instructions: rawParsed.instructions || currentInstructions || "Completar las directrices de este paso.",
                        starterCode: rawParsed.starterCode || null,
                        expectedSolution: rawParsed.expectedSolution || null,
                        targetFilePath: rawParsed.targetFilePath || targetFilePath || null,
                        targetFileContent: rawParsed.targetFileContent || "",
                        gitCommands: Array.isArray(rawParsed.gitCommands) ? rawParsed.gitCommands : [],
                        validationRule: rawParsed.validationRule || null,
                        hints: Array.isArray(rawParsed.hints) ? rawParsed.hints : []
                    };
                }
            } catch (recoveryErr) {
                console.warn("extractJSON no pudo parsear rawText en generateSingleWorkshopStep:", recoveryErr);
            }
        }

        // Tier 2: Fallback con generateText si generateObject falló en el proveedor
        if (!object) {
            try {
                const textResult = await generateText({
                    model,
                    system: systemPrompt + "\nIMPORTANTE: Devuelve ÚNICAMENTE un objeto JSON con las claves: title, instructions, targetFilePath, targetFileContent, gitCommands, validationRule.",
                    prompt: userPrompt,
                    temperature: 0.2
                });
                if (textResult?.text) {
                    const parsed = extractJSON<any>(textResult.text);
                    if (parsed && typeof parsed === "object") {
                        object = {
                            title: parsed.title || stepTitle,
                            instructions: parsed.instructions || currentInstructions || "Completar este paso.",
                            starterCode: parsed.starterCode || null,
                            expectedSolution: parsed.expectedSolution || null,
                            targetFilePath: parsed.targetFilePath || targetFilePath || null,
                            targetFileContent: parsed.targetFileContent || "",
                            gitCommands: Array.isArray(parsed.gitCommands) ? parsed.gitCommands : [],
                            validationRule: parsed.validationRule || null,
                            hints: Array.isArray(parsed.hints) ? parsed.hints : []
                        };
                    }
                }
            } catch (genTextErr) {
                console.warn("Fallback generateText falló en generateSingleWorkshopStep:", genTextErr);
            }
        }

        // Tier 3: Fallback determinista seguro para evitar errores 500
        if (!object) {
            const cleanTitle = stepTitle || "Paso formativo";
            const effectiveFile = targetFilePath || (isCode ? "solucion.js" : "src/index.js");
            object = {
                title: cleanTitle,
                instructions: currentInstructions || `### Objetivo\nImplementar la funcionalidad correspondiente a **${cleanTitle}** en el archivo \`${effectiveFile}\`.\n\n### Indicaciones\n1. Edita o crea el archivo en tu repositorio.\n2. Sigue las convenciones y estándares de código de ${effectiveStack}.\n3. Realiza commit y sincroniza los cambios en GitHub.`,
                starterCode: isCode ? "// Implementar código aquí" : null,
                expectedSolution: null,
                targetFilePath: effectiveFile,
                targetFileContent: "",
                gitCommands: [
                    { command: `git add ${effectiveFile}`, explanation: `Prepara ${effectiveFile} para el commit.` },
                    { command: `git commit -m "feat: ${cleanTitle.replace(/^Paso \d+:\s*/i, "").toLowerCase()}"`, explanation: "Confirma los cambios localmente." },
                    { command: "git push origin main", explanation: "Envía los commits a GitHub." }
                ],
                validationRule: "El archivo debe existir en el repositorio y no estar vacío",
                hints: []
            };
        }
    }

    return {
        title: object.title || stepTitle || "Paso",
        instructions: object.instructions || currentInstructions || "Completar las directrices de este paso.",
        starterCode: object.starterCode || undefined,
        expectedSolution: object.expectedSolution || undefined,
        targetFilePath: object.targetFilePath || undefined,
        targetFileContent: object.targetFileContent || "",
        codeExplanation: (object as any).codeExplanation || undefined,
        localVerification: (object as any).localVerification || undefined,
        gitCommands: (object.gitCommands || []).map(gc => ({
            command: gc.command,
            explanation: gc.explanation || ""
        })),
        validationRule: object.validationRule || undefined,
        hints: !isCode ? [] : ((object.hints || []).filter(Boolean) as string[])
    };
}

/**
 * Asistente Granular: Genera o redacta únicamente las instrucciones didácticas del paso en Markdown.
 * NO modifica el código ni los comandos Git.
 */
export async function generateWorkshopStepInstructions(params: {
    stepTitle: string;
    targetFilePath?: string;
    currentInstructions?: string;
    currentCode?: string;
    workshopTitle?: string;
    statement?: string;
    language?: string;
    techStack?: string;
    userId: string;
    aiModelName?: string;
}): Promise<string> {
    const {
        stepTitle,
        targetFilePath = "",
        currentInstructions = "",
        currentCode = "",
        workshopTitle = "",
        statement,
        language = "javascript",
        techStack,
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const effectiveStack = techStack || language;

    const systemPrompt = `Eres un docente universitario experto en ${effectiveStack} y didáctica de la programación.
Tu única tarea es redactar las INSTRUCCIONES DIDÁCTICAS Y PEDAGÓGICAS completas, claras y bien estructuradas en formato Markdown para el paso formativo "${stepTitle}" del taller "${workshopTitle}".

${statement?.trim() ? `COHERENCIA CON EL ENUNCIADO:
Enmarca la explicación del paso en el contexto del Enunciado General del Proyecto. Explica cómo la implementación de este archivo resuelve los requerimientos especificados en el enunciado.` : ""}

DIRECTRICES DE REDACCIÓN:
1. Usa formato Markdown con subtítulos claros (### Objetivo, ### Qué aprenderás, ### Explicación conceptual, ### Pasos a seguir).
2. Explica el "por qué" y el "cómo" de lo que se realiza en este paso y su relación con el archivo "${targetFilePath || "del proyecto"}".
3. Sé pedagógico, motivador y exhaustivo: el estudiante debe comprender a fondo qué está construyendo sin ambigüedades.
4. NO generes bloques gigantes de código fuente aquí (el código tiene su propio espacio dedicado). Solo incluye fragmentos breves explicativos si es estrictamente necesario para la comprensión.`;

    const userPrompt = `Paso: ${stepTitle}
${statement?.trim() ? `Enunciado General del Proyecto:\n"""\n${statement.trim().slice(0, 1500)}\n"""\n` : ""}
Archivo asociado: ${targetFilePath || "src/index.js"}
Objetivo o borrador previo:
${currentInstructions || "Sin instrucciones previas"}

${currentCode ? `Código actual configurado en el archivo:\n\`\`\`${language}\n${currentCode.slice(0, 800)}\n\`\`\`` : ""}

Stack tecnológico: ${effectiveStack}
Redacta las instrucciones didácticas completas y detalladas.`;

    const InstructionsSchema = z.object({
        instructions: z.string().describe("Instrucciones detalladas del paso en formato Markdown")
    });

    try {
        const { object } = await generateObject({
            model,
            schema: InstructionsSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
        });

        return object?.instructions || currentInstructions;
    } catch (err: any) {
        console.warn("generateWorkshopStepInstructions falló en generateObject, activando fallback...");
        const rawText = err?.text || err?.response?.text || (typeof err?.cause === "object" ? (err.cause as any)?.text : undefined) || "";
        if (rawText && rawText.trim().length > 20) {
            try {
                const recovered = extractJSON<any>(rawText);
                if (recovered?.instructions) return recovered.instructions;
            } catch {
                if (rawText.trim().length > 20) return rawText.trim();
            }
        }

        try {
            const txt = await generateText({
                model,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0.3
            });
            if (txt?.text && txt.text.trim().length > 20) {
                return txt.text.trim();
            }
        } catch (fallbackErr) {
            console.warn("Fallback generateText en instrucciones falló:", fallbackErr);
        }

        return currentInstructions || `### Objetivo del Paso\nCompletar las directrices de desarrollo para **${stepTitle}** en el archivo \`${targetFilePath || "del proyecto"}\`.\n\n### Indicaciones\n1. Realiza las modificaciones requeridas según la arquitectura del proyecto.\n2. Sigue las convenciones y estándares de código.\n3. Valida y sincroniza con Git.`;
    }
}

/**
 * Asistente Granular: Genera únicamente el código fuente completo y funcional para el archivo objetivo.
 * NO modifica las instrucciones ni los comandos Git.
 */
export async function generateWorkshopStepCode(params: {
    stepTitle: string;
    targetFilePath: string;
    stepInstructions?: string;
    currentCode?: string;
    workshopTitle?: string;
    statement?: string;
    language?: string;
    techStack?: string;
    userId: string;
    aiModelName?: string;
}): Promise<string> {
    const {
        stepTitle,
        targetFilePath,
        stepInstructions = "",
        currentCode = "",
        workshopTitle = "",
        statement,
        language = "javascript",
        techStack,
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const effectiveStack = techStack || language;

    const systemPrompt = `Eres un ingeniero de software senior y arquitecto de software especializado en ${effectiveStack}.
Tu única tarea es generar el CÓDIGO FUENTE 100% COMPLETO, PROFESIONALMENTE ESTRUCTURADO, LIMPIO Y FORMATEADO para el archivo "${targetFilePath}" del proyecto "${workshopTitle}".

${statement?.trim() ? `COHERENCIA CON EL ENUNCIADO GENERAL:
El código DEBE implementar las reglas de negocio, modelos de datos, endpoints y requerimientos especificados en el Enunciado General del Proyecto. Respeta los nombres de clases, entidades y campos descritos en el enunciado.` : ""}

REGLAS DE FORMATEO Y ESTRUCTURA:
1. FORMATEO ESTRICTO: El código DEBE contener saltos de línea legibles (\\n), sangrías de 4 espacios (para Java, C#, Python) o 2 espacios (para JS/TS), y líneas en blanco separando imports y métodos. NUNCA minifiques ni comprimas el código en una sola línea.
2. 100% COMPLETO: NUNCA uses comentarios de 'TODO', '// Implementar aquí', '/* ... */' ni dejes código incompleto.
3. Convenciones: Sigue las mejores prácticas y estándares de la industria para ${effectiveStack} (anotaciones en su propia línea, modificadores de visibilidad, imports explícitos).
4. Devuelve ÚNICAMENTE el código fuente dentro de un bloque markdown delimitado por tres comillas invertidas.`;

    const userPrompt = `Paso: ${stepTitle}
${statement?.trim() ? `Enunciado General del Proyecto:\n"""\n${statement.trim().slice(0, 2000)}\n"""\n` : ""}
Archivo objetivo: ${targetFilePath}
Instrucciones y requerimientos del paso:
${stepInstructions || "Implementar la funcionalidad correspondiente a este paso con código limpio y funcional."}

${currentCode ? `Código existente (para refactorizar o completar):\n${currentCode.slice(0, 1000)}` : ""}

Stack tecnológico: ${effectiveStack}
Genera el código fuente definitivo formateado con saltos de línea para este archivo.`;

    // 1. Intentar primero con generateText y bloque markdown: es el formato natural donde los LLMs nunca minifican código
    try {
        const txt = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2
        });

        if (txt?.text && txt.text.trim().length > 10) {
            const codeMatch = txt.text.match(/```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
            const rawCode = codeMatch ? codeMatch[1].trim() : txt.text.replace(/^```[\w-]*\n?|```$/g, '').trim();
            if (rawCode.length > 5) {
                return formatCodeString(rawCode, targetFilePath);
            }
        }
    } catch (textErr) {
        console.warn("generateWorkshopStepCode con generateText falló, intentando generateObject:", textErr);
    }

    // 2. Fallback con generateObject
    try {
        const CodeSchema = z.object({
            code: z.string().describe("Código fuente 100% funcional y completo, con saltos de línea e indentación estándar")
        });

        const { object } = await generateObject({
            model,
            schema: CodeSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        if (object?.code) {
            return formatCodeString(object.code, targetFilePath);
        }
    } catch (objErr: any) {
        console.warn("generateWorkshopStepCode falló en generateObject:", objErr);
        const rawText = objErr?.text || objErr?.response?.text || (typeof objErr?.cause === "object" ? (objErr.cause as any)?.text : undefined) || "";

        if (rawText && rawText.trim().length > 10) {
            try {
                const recovered = extractJSON<any>(rawText);
                if (recovered?.code) return formatCodeString(recovered.code, targetFilePath);
            } catch {
                const codeMatch = rawText.match(/```(?:\w+)?\s*([\s\S]*?)```/);
                if (codeMatch?.[1]) return formatCodeString(codeMatch[1].trim(), targetFilePath);
            }
        }
    }

    return formatCodeString(currentCode, targetFilePath) || `// Código base para ${targetFilePath}\n// Implementar la lógica del paso ${stepTitle}\n`;
}

/**
 * Asistente Especializado: Genera una explicación técnica y pedagógica en Markdown del código fuente de un paso.
 * Explica librerías/imports, clases, métodos principales, patrones de diseño y decisiones arquitectónicas.
 */
export async function generateWorkshopStepCodeExplanation(params: {
    stepTitle: string;
    targetFilePath?: string;
    code: string;
    statement?: string;
    language?: string;
    techStack?: string;
    userId: string;
    aiModelName?: string;
}): Promise<string> {
    const {
        stepTitle,
        targetFilePath = "",
        code = "",
        statement,
        language = "javascript",
        techStack,
        userId,
        aiModelName
    } = params;

    if (!code || code.trim().length === 0) {
        return "No hay código fuente configurado para este archivo aún.";
    }

    const model = await getAIModel(userId, aiModelName);
    const effectiveStack = techStack || language;

    const systemPrompt = `Eres un docente universitario y arquitecto de software de élite experto en ${effectiveStack}.
Tu tarea es escribir una EXPLICACIÓN PEDAGÓGICA Y TÉCNICA RIGUROSA del archivo de código fuente para el paso "${stepTitle}" (${targetFilePath || "archivo de proyecto"}).

OBJETIVO FORMATIVO:
El estudiante va a integrar este archivo a su proyecto. Necesita comprender a fondo CÓMO FUNCIONA cada parte de este código, qué patrones de diseño se aplican y por qué está estructurado de esa manera, para que no sea un simple "copiar y pegar".

ESTRUCTURA OBLIGATORIA DEL DESGLOSE (en formato Markdown GFM):
### 🔍 Propósito del Archivo
[1 o 2 párrafos explicando qué rol cumple esta clase/módulo dentro de la arquitectura del sistema].

### 📦 Dependencias y Componentes Clave
- **[Librería o Anotación / Import 1]**: Explicación concreta de para qué sirve.
- **[Librería o Anotación / Import 2]**: Explicación concreta.

### ⚙️ Lógica y Métodos Principales
- **\`[nombreDelMetodoOPropiedad()]\`**: Qué hace, qué parámetros recibe, qué retorna y qué lógica de negocio o validación ejecuta.
- **\`[otroMetodo()]\`**: Explicación didáctica clara.

### 💡 Buenas Prácticas y Patrones Aplicados
[Mencionar principios Clean Code, SOLID, inyección de dependencias o patrones usados en este archivo].

REGLAS:
1. Sé didáctico, riguroso, claro y profesional.
2. NO repitas el código fuente completo en un bloque gigante (el estudiante ya lo tiene en el editor). Cita únicamente firmas breves o nombres de métodos entre comillas invertidas.`;

    const userPrompt = `Paso: ${stepTitle}
Archivo: ${targetFilePath}
${statement?.trim() ? `Contexto del Proyecto:\n"""\n${statement.trim().slice(0, 1000)}\n"""\n` : ""}

CÓDIGO FUENTE A EXPLICAR:
\`\`\`${language}
${code}
\`\`\`

Genera el desglose explicativo didáctico del código en Markdown.`;

    const ExplanationSchema = z.object({
        explanation: z.string().describe("Desglose pedagógico estructurado en Markdown")
    });

    try {
        const { object } = await generateObject({
            model,
            schema: ExplanationSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3
        });
        return object?.explanation || "";
    } catch (err: any) {
        console.warn("generateWorkshopStepCodeExplanation falló en generateObject, activando fallback...");
        const rawText = err?.text || err?.response?.text || (typeof err?.cause === "object" ? (err.cause as any)?.text : undefined) || "";
        if (rawText && rawText.trim().length > 20) {
            try {
                const recovered = extractJSON<any>(rawText);
                if (recovered?.explanation) return recovered.explanation;
            } catch {
                if (rawText.trim().length > 20) return rawText.trim();
            }
        }

        try {
            const textResult = await generateText({
                model,
                system: systemPrompt + "\nDevuelve ÚNICAMENTE el texto Markdown con el desglose del código.",
                prompt: userPrompt,
                temperature: 0.2
            });
            if (textResult?.text) return textResult.text.trim();
        } catch (textErr) {
            console.warn("Fallback generateText falló en generateWorkshopStepCodeExplanation:", textErr);
        }
    }

    return "No se pudo generar la explicación automática del código.";
}


/**
 * Asistente Granular: Sugiere los comandos Git idóneos con explicaciones didácticas para el paso.
 */
export async function suggestWorkshopStepGitCommands(params: {
    stepTitle: string;
    targetFilePath?: string;
    stepIndex: number;
    totalSteps: number;
    statement?: string;
    language?: string;
    techStack?: string;
    userId: string;
    aiModelName?: string;
}): Promise<Array<{ command: string; explanation: string }>> {
    const {
        stepTitle,
        targetFilePath = "",
        stepIndex,
        totalSteps,
        statement,
        language = "javascript",
        techStack,
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const effectiveStack = techStack || language;

    const systemPrompt = `Eres un instructor experto en control de versiones con Git y flujos de trabajo en GitHub.
Tu tarea es sugerir la secuencia óptima de comandos de consola/Git (entre 2 y 4 comandos) para el Paso ${stepIndex} de ${totalSteps} ("${stepTitle}") con archivo objetivo "${targetFilePath || "proyecto"}".

${statement?.trim() ? `Alinea los mensajes de commit y las operaciones con las funcionalidades descritas en el Enunciado General del Proyecto.` : ""}

DIRECTRICES:
1. Si es el Paso 1 y se trata de iniciar el proyecto, puedes incluir comandos de preparación o git iniciales adecuados si aplica.
2. Para pasos de desarrollo estándar, incluye:
   - Preparación de cambios (ej: git add ${targetFilePath || "."})
   - Confirmación con mensaje descriptivo y convencional (ej: git commit -m "feat: ...")
   - Sincronización con el repositorio remoto (ej: git push origin main)
3. Para cada comando, redacta una explicación didáctica en español claro, de 1 o 2 oraciones, explicando qué efecto tiene en el árbol de trabajo, el área de preparación (staging) o el historial del repositorio.`;

    const userPrompt = `Paso ${stepIndex} de ${totalSteps}: ${stepTitle}
${statement?.trim() ? `Contexto del Proyecto (Enunciado):\n"""\n${statement.trim().slice(0, 800)}\n"""\n` : ""}
Archivo objetivo: ${targetFilePath || "src/index.js"}
Stack del proyecto: ${effectiveStack}`;

    const GitCommandsSchema = z.object({
        gitCommands: z.array(z.object({
            command: z.string().describe("Comando exacto de Git / terminal (ej: 'git add .', 'git commit -m \"...\"')"),
            explanation: z.string().nullish().default("").describe("Explicación pedagógica clara de lo que hace el comando en el repositorio")
        })).min(1).describe("Lista secuencial de comandos Git para el paso con sus explicaciones")
    });

    try {
        const { object } = await generateObject({
            model,
            schema: GitCommandsSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        if (object?.gitCommands && object.gitCommands.length > 0) {
            return object.gitCommands.map(c => ({
                command: c.command,
                explanation: c.explanation || ""
            }));
        }
    } catch (err: any) {
        if (NoObjectGeneratedError.isInstance(err) && err.text) {
            try {
                const recovered = extractJSON<any>(err.text);
                if (Array.isArray(recovered)) {
                    return recovered.map((c: any) => ({
                        command: c.command || "git status",
                        explanation: c.explanation || ""
                    }));
                }
                if (Array.isArray(recovered?.gitCommands)) {
                    return recovered.gitCommands.map((c: any) => ({
                        command: c.command || "git status",
                        explanation: c.explanation || ""
                    }));
                }
            } catch {
                // Fall through to default commands
            }
        }
        console.warn("suggestWorkshopStepGitCommands usando comandos por defecto debido a:", err?.message);
    }

    return [
        { command: `git add ${targetFilePath || "."}`, explanation: `Prepara los cambios de ${targetFilePath || "este paso"} para el commit.` },
        { command: `git commit -m "feat: implementar paso ${stepIndex} - ${stepTitle.replace(/^Paso \d+:\s*/i, "")}"`, explanation: "Confirma los cambios en el historial local con un mensaje claro." },
        { command: "git push origin main", explanation: "Envía los commits locales a la rama principal en GitHub." }
    ];
}

/**
 * Genera pistas pedagógicas para un paso específico de un taller.
 */
export async function generateWorkshopStepHints(params: {
    stepTitle: string;
    instructions: string;
    statement?: string;
    language?: string;
    userId: string;
    aiModelName?: string;
}): Promise<string[]> {
    const { stepTitle, instructions, statement, language = "java", userId, aiModelName } = params;
    const model = await getAIModel(userId, aiModelName);

    const systemPrompt = `Eres un tutor pedagógico de programación.
Genera entre 2 y 3 pistas breves (1 a 2 oraciones cada una) para guiar a un estudiante en la resolución del siguiente paso formativo, sin regalarle la solución directa.
${statement?.trim() ? "Asegúrate de que las pistas sean coherentes con el proyecto global definido en el enunciado." : ""}`;

    const userPrompt = `Paso: ${stepTitle}
${statement?.trim() ? `Enunciado del Proyecto:\n"""\n${statement.trim().slice(0, 800)}\n"""\n` : ""}
Instrucciones del paso: ${instructions}
Lenguaje: ${language}`;

    const StepHintsSchema = z.object({
        hints: z.array(z.string().describe("Pista breve orientativa para el estudiante")).min(1)
    });

    try {
        const { object } = await generateObject({
            model,
            schema: StepHintsSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
        });

        if (object?.hints && object.hints.length > 0) {
            return object.hints;
        }
    } catch (err: any) {
        if (NoObjectGeneratedError.isInstance(err) && err.text) {
            try {
                const recovered = extractJSON<any>(err.text);
                if (Array.isArray(recovered)) return recovered.map(String);
                if (Array.isArray(recovered?.hints)) return recovered.hints.map(String);
            } catch {
                // Ignore fallback error
            }
        }
    }

    return [];
}

/**
 * Modifica o adapta interactivamente la estructura de pasos de un taller mediante chat con IA.
 * Permite agregar, eliminar, reordenar, dividir o ajustar pasos (archivos, comandos git, instrucciones).
 */
export async function refineWorkshopSteps(params: {
    steps: Array<{
        id: string;
        title: string;
        instructions: string;
        starterCode?: string;
        expectedSolution?: string;
        requiresFile?: boolean;
        requiresGitCommands?: boolean;
        targetFilePath?: string;
        targetFileContent?: string;
        codeExplanation?: string;
        localVerification?: string;
        gitCommands?: Array<{ command: string; explanation: string }>;
        validationRule?: string;
        hints?: string[];
        order: number;
    }>;
    instruction: string;
    statement?: string;
    workshopType: "WORKSHOP_CODE" | "WORKSHOP_GITHUB";
    techStack?: string;
    userId: string;
    aiModelName?: string;
}): Promise<{
    message: string;
    steps: Array<{
        id: string;
        title: string;
        instructions: string;
        starterCode?: string;
        expectedSolution?: string;
        requiresFile: boolean;
        requiresGitCommands: boolean;
        targetFilePath?: string;
        targetFileContent?: string;
        codeExplanation?: string;
        localVerification?: string;
        gitCommands: Array<{ command: string; explanation: string }>;
        validationRule?: string;
        hints: string[];
        order: number;
    }>;
}> {
    const {
        steps,
        instruction,
        statement,
        workshopType,
        techStack,
        userId,
        aiModelName
    } = params;

    const model = await getAIModel(userId, aiModelName);
    const isCode = workshopType === "WORKSHOP_CODE";

    // Formatear pasos actuales de forma compacta y legible para el prompt
    const stepsSummary = steps.map((s, i) => ({
        order: i + 1,
        id: s.id,
        title: s.title,
        instructions: s.instructions,
        requiresFile: s.requiresFile ?? Boolean(s.targetFilePath && s.targetFilePath.trim().length > 0),
        requiresGitCommands: s.requiresGitCommands ?? Boolean(s.gitCommands && s.gitCommands.length > 0),
        targetFilePath: s.targetFilePath || null,
        gitCommandsCount: s.gitCommands?.length || 0,
        validationRule: s.validationRule || null
    }));

    const systemPrompt = `Eres un docente universitario y arquitecto de software de élite.
Tu tarea es MODIFICAR O REFINAR LA SECUENCIA DE PASOS de un ${isCode ? "Codelab interactivo" : "Tutorial de proyecto GitHub paso a paso"} basándote en las instrucciones directas del profesor.

REGLAS FUNDAMENTALES:
1. El profesor te dará una instrucción (por ejemplo: agregar un paso, eliminar uno existente, dividir un paso, cambiar orden, convertir un paso en solo instructivo sin archivo/git, agregar comandos git, etc.).
2. Aplica con absoluta precisión la solicitud del profesor preservando lo que no se pidió modificar.
3. Asegúrate de que los títulos de los pasos queden ordenados y numerados coherentemente ("Paso 1: ...", "Paso 2: ...", etc.).
4. Si se añade o modifica un paso, las rutas de archivo (targetFilePath) deben coincidir con la tecnología del proyecto.
5. Flexibilidad de Pasos:
   - Si un paso es meramente explicativo o conceptual y no requiere crear ni editar un archivo en el repo, establece requiresFile: false y targetFilePath: null.
   - Si no requiere comandos Git, establece requiresGitCommands: false y gitCommands: [].
6. En 'message', escribe una respuesta breve y amigable al profesor explicando qué cambios específicos realizaste en la estructura de pasos.`;

    const userPrompt = `INSTRUCCIÓN DEL PROFESOR:
"${instruction}"

${statement?.trim() ? `ENUNCIADO GENERAL DEL PROYECTO (CONTEXTO OBLIGATORIO):\n"""\n${statement.trim()}\n"""\n` : ""}
${techStack ? `Stack tecnológico: ${techStack}` : ""}

ESTRUCTURA ACTUAL DE PASOS (${steps.length} pasos):
${JSON.stringify(stepsSummary, null, 2)}`;

    const RefineStepItemSchema = z.object({
        id: z.string().nullish().describe("ID previo del paso si se mantiene, o nuevo ID si es nuevo"),
        title: z.string().describe("Título del paso numerado (ej: 'Paso 1: ...')"),
        instructions: z.string().nullish().default("").describe("Instrucciones didácticas u objetivo pedagógico del paso"),
        requiresFile: z.boolean().nullish().default(true).describe("false si no requiere archivo de código, true si requiere archivo"),
        requiresGitCommands: z.boolean().nullish().default(true).describe("false si no requiere comandos Git, true si requiere Git"),
        targetFilePath: z.string().nullish().describe("Ruta relativa del archivo a crear/modificar en el repo, o null si requiresFile es false"),
        targetFileContent: z.string().nullish().describe("Contenido del archivo si ya existía"),
        codeExplanation: z.string().nullish().describe("Desglose pedagógico del código"),
        localVerification: z.string().nullish().describe("Prueba o verificación local previa a Git"),
        gitCommands: z.array(z.object({
            command: z.string().describe("Comando Git exacto"),
            explanation: z.string().nullish().default("").describe("Explicación breve del comando Git")
        })).nullish().default([]).describe("Comandos Git asociados a este paso"),
        validationRule: z.string().nullish().describe("Regla de validación opcional"),
        hints: z.array(z.string()).nullish().default([]).describe("Pistas orientativas")
    });

    const RefineResponseSchema = z.object({
        message: z.string().describe("Mensaje breve explicando qué cambios se realizaron a la estructura"),
        steps: z.array(RefineStepItemSchema).min(1).describe("Lista actualizada de pasos")
    });

    let result: { message?: string; steps: Array<z.infer<typeof RefineStepItemSchema>> } | null = null;

    try {
        const { object } = await generateObject({
            model,
            schema: RefineResponseSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3
        });
        result = object;
    } catch (err: any) {
        console.warn("refineWorkshopSteps: generateObject falló, intentando recuperación:", err?.message);
        const rawText = err?.text || err?.response?.text || (typeof err?.cause === "object" ? (err.cause as any)?.text : undefined) || "";
        if (rawText) {
            try {
                const parsed = extractJSON<any>(rawText);
                if (parsed?.steps && Array.isArray(parsed.steps)) {
                    result = {
                        message: parsed.message || "Estructura de pasos actualizada.",
                        steps: parsed.steps
                    };
                }
            } catch (recoveryErr) {
                console.warn("Fallo al recuperar JSON en refineWorkshopSteps:", recoveryErr);
            }
        }

        if (!result) {
            try {
                const textResult = await generateText({
                    model,
                    system: systemPrompt + "\nIMPORTANTE: Devuelve ÚNICAMENTE un objeto JSON válido con las claves 'message' y 'steps'.",
                    prompt: userPrompt,
                    temperature: 0.2
                });
                if (textResult?.text) {
                    const parsed = extractJSON<any>(textResult.text);
                    if (parsed?.steps && Array.isArray(parsed.steps)) {
                        result = {
                            message: parsed.message || "Estructura de pasos adaptada.",
                            steps: parsed.steps
                        };
                    }
                }
            } catch (textErr) {
                console.warn("Fallback generateText falló en refineWorkshopSteps:", textErr);
            }
        }
    }

    if (!result || !result.steps || result.steps.length === 0) {
        throw new Error("No se pudo adaptar la estructura de pasos con IA. Por favor intenta reformular tu instrucción.");
    }

    // Mapa de pasos existentes para preservar targetFileContent y starterCode cuando aplique
    const existingMap = new Map(steps.map(s => [s.id, s]));

    const mappedSteps = result.steps.map((s, idx) => {
        const existing = s.id ? existingMap.get(s.id) : undefined;
        const hasFile = s.requiresFile !== undefined ? Boolean(s.requiresFile) : Boolean(s.targetFilePath && s.targetFilePath.trim().length > 0);
        const hasGit = s.requiresGitCommands !== undefined ? Boolean(s.requiresGitCommands) : Boolean(s.gitCommands && s.gitCommands.length > 0);
        const targetPath = hasFile ? (s.targetFilePath || existing?.targetFilePath || undefined) : undefined;

        return {
            id: existing?.id || (s.id && !s.id.startsWith("step-") ? s.id : `m-${Date.now()}-${idx}`),
            title: s.title || `Paso ${idx + 1}`,
            instructions: s.instructions || existing?.instructions || `Completar las directrices de la etapa ${idx + 1}.`,
            starterCode: existing?.starterCode,
            expectedSolution: existing?.expectedSolution,
            requiresFile: hasFile,
            requiresGitCommands: hasGit,
            targetFilePath: targetPath,
            targetFileContent: s.targetFileContent ? s.targetFileContent : (existing?.targetFileContent || ""),
            codeExplanation: s.codeExplanation || existing?.codeExplanation || undefined,
            localVerification: s.localVerification || existing?.localVerification || undefined,
            gitCommands: hasGit ? (
                s.gitCommands && s.gitCommands.length > 0
                    ? s.gitCommands.map(g => ({ command: g.command, explanation: g.explanation || "" }))
                    : (existing?.gitCommands || [])
            ) : [],
            validationRule: hasFile ? (s.validationRule || existing?.validationRule || "El archivo debe existir en la rama") : undefined,
            hints: s.hints || existing?.hints || [],
            order: idx + 1
        };
    });

    return {
        message: result.message || "Estructura de pasos actualizada con éxito.",
        steps: mappedSteps
    };
}


