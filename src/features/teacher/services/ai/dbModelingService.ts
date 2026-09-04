import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface DbModelingGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    ddlScore: number; // 0.0 - 5.0
    dmlScore: number; // 0.0 - 5.0
    erScore: number; // 0.0 - 5.0
    normalizationScore: number; // 0.0 - 5.0
    normalizationLevelAchieved: string;
    entitiesStatus: Array<{
        entityName: string;
        status: "CORRECT" | "WARNING" | "MISSING";
        comment: string;
    }>;
    dmlStatus?: {
        hasDml: boolean;
        isValid: boolean;
        comment: string;
    };
    strengths: string[];
    weaknesses: string[];
    feedback: string;
}

const DbModelingGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación global sugerida en escala de 0.0 a 5.0"),
    summary: z.string().describe("Resumen general del diseño, estructura relacional y código SQL entregado"),
    ddlScore: z.number().min(0).max(5).describe("Puntaje DDL: CREATE TABLE, tipos, PK, FK y restricciones (0.0 - 5.0)"),
    dmlScore: z.number().min(0).max(5).describe("Puntaje DML: Inserciones de datos de prueba, consistencia, updates/deletes (0.0 - 5.0)"),
    erScore: z.number().min(0).max(5).describe("Puntaje del Modelo Entidad-Relación / Diagrama Mermaid (0.0 - 5.0)"),
    normalizationScore: z.number().min(0).max(5).describe("Puntaje de normalización (1FN, 2FN, 3FN) de 0.0 a 5.0"),
    normalizationLevelAchieved: z.string().describe("Nivel de normalización alcanzado (ej. 3FN, 2FN, Parcial)"),
    entitiesStatus: z.array(z.object({
        entityName: z.string().describe("Nombre de la tabla o entidad evaluada"),
        status: z.enum(["CORRECT", "WARNING", "MISSING"]).describe("Estado del diseño de la entidad"),
        comment: z.string().describe("Observación sobre atributos, tipos, restricciones y llaves"),
    })).describe("Evaluación detallada tabla por tabla"),
    dmlStatus: z.object({
        hasDml: z.boolean().describe("Si el estudiante incluyó sentencias DML (INSERT, UPDATE, DELETE o consultas)"),
        isValid: z.boolean().describe("Si los datos insertados respetan integridad referencial y tipos"),
        comment: z.string().describe("Observación sobre la consistencia de los datos de prueba y consultas"),
    }).optional().describe("Diagnóstico de las sentencias DML y manipulación de datos"),
    strengths: z.array(z.string()).describe("Aciertos, buenas prácticas de modelado y SQL"),
    weaknesses: z.array(z.string()).describe("Problemas de diseño, errores de sintaxis DDL/DML o dependencias transitivas"),
    feedback: z.string().describe("Retroalimentación formativa y pedagógica completa estructurada en Markdown"),
});

export async function gradeDbModeling(params: {
    diagramCode?: string;
    sqlScript?: string;
    statement: string;
    dbConfig?: {
        targetEngine?: string;
        requiredEntities?: string[];
        requiredNormalization?: string;
        scopeOptions?: {
            includeDiagram?: boolean;
            includeDdl?: boolean;
            includeDml?: boolean;
            includeQueries?: boolean;
        };
    };
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<DbModelingGradingResult> {
    const {
        diagramCode = "",
        sqlScript = "",
        statement,
        dbConfig,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);

    const modePrompt = {
        normal: "Sé constructivo y motivador. Valora la identificación de entidades clave, relaciones fundamentales y coherencia básica de SQL.",
        moderate: "Equilibra el rigor conceptual con la ejecución técnica. Valora normalización (3FN), restricciones DDL e integridad de datos DML.",
        strict: "Sé riguroso con la sintaxis exacta del motor, tipos óptimos, constraints NOT NULL/UNIQUE/CHECK/FK, 3FN estricta y consistencia transaccional DML.",
    }[gradingMode];

    const requiredEntitiesText = dbConfig?.requiredEntities && dbConfig.requiredEntities.length > 0
        ? dbConfig.requiredEntities.map(e => `- ${e}`).join("\n")
        : "Diseño y modelado según el enunciado provisto.";

    const prompt = `
Eres un DBA Senior y Catedrático Universitario experto en Arquitectura de Bases de Datos Relacionales, SQL (DDL, DML, DQL) y Modelado Conceptual/Lógico.
Tu misión es evaluar el trabajo de base de datos entregado por un estudiante.

---
### ESPECIFICACIONES DE LA ACTIVIDAD:
- MOTOR DE BASE DE DATOS: ${dbConfig?.targetEngine || "PostgreSQL"}
- NIVEL DE NORMALIZACIÓN REQUERIDO: ${dbConfig?.requiredNormalization || "3FN (Tercera Forma Normal)"}
- MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### ENTIDADES / TABLAS REQUERIDAS:
${requiredEntitiesText}

---
### ENUNCIADO Y REQUERIMIENTOS DEL TALLER:
${statement || "Modelado relacional y programación SQL del sistema."}

---
### DIAGRAMA ENTIDAD-RELACIÓN DEL ESTUDIANTE (Mermaid / Código):
\`\`\`mermaid
${diagramCode.trim() ? diagramCode : "(No se adjuntó diagrama Mermaid)"}
\`\`\`

---
### SCRIPT SQL DEL ESTUDIANTE (DDL, DML, CONSULTAS):
\`\`\`sql
${sqlScript.trim() ? sqlScript : "(No se adjuntó script SQL)"}
\`\`\`

---
### CRITERIOS DE AUDITORÍA:
1. **Definición de Estructura (DDL)**:
   - Sentencias \`CREATE TABLE\`, \`ALTER TABLE\`.
   - Claves Primarias (\`PRIMARY KEY\`) y Foráneas (\`FOREIGN KEY / REFERENCES\`).
   - Acciones referenciales (\`ON DELETE CASCADE / SET NULL / RESTRICT\`).
   - Restricciones (\`NOT NULL\`, \`UNIQUE\`, \`CHECK\`) y tipos de datos idóneos para ${dbConfig?.targetEngine || "el motor seleccionado"}.
2. **Manipulación de Datos (DML) y Consultas**:
   - Sentencias \`INSERT INTO\` con datos de prueba realistas.
   - Orden de inserción (respetando tablas padre antes de tablas hijas dependientes).
   - Sentencias \`UPDATE\`, \`DELETE\` o consultas \`SELECT\` con \`JOIN\` si fueron requeridas.
3. **Normalización (1FN, 2FN, 3FN)**:
   - Ausencia de atributos multivaluados o redundantes.
   - Eliminación de dependencias parciales y transitivas.
4. **Correspondencia del Modelo ER**:
   - Si se adjuntó diagrama Mermaid, verificar que las tablas, atributos y cardinalidades coincidan con el script SQL.

Asigna puntajes individuales (0.0 a 5.0) para DDL, DML, Diagrama ER y Normalización, y genera retroalimentación formativa y detallada en Markdown.
`;

    const { object } = await generateObject({
        model,
        schema: DbModelingGradingSchema,
        prompt,
    });

    const repairedFeedback = repairFeedbackText(object.feedback);

    return {
        ...object,
        feedback: repairedFeedback,
    };
}
