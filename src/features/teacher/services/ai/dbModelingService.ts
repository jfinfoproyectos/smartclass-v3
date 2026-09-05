import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";
import { executeSqlInSandbox, SqlSandboxExecutionResult } from "../dbSandboxService";
import { auditCloudPostgres, CloudPostgresAuditResult } from "../postgresMcpService";

export interface DbModelingGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    ddlScore: number; // 0.0 - 5.0
    dmlScore: number; // 0.0 - 5.0
    integrityScore: number; // 0.0 - 5.0
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
    sandboxResult?: SqlSandboxExecutionResult;
    cloudResult?: CloudPostgresAuditResult;
}

const DbModelingGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación global sugerida en escala de 0.0 a 5.0"),
    summary: z.string().describe("Resumen general del diseño, estructura relacional y base de datos entregada"),
    ddlScore: z.number().min(0).max(5).describe("Puntaje DDL: Estructura de tablas, tipos de datos, PK, FK y sintaxis (0.0 - 5.0)"),
    dmlScore: z.number().min(0).max(5).describe("Puntaje DML / Datos Reales: Inserciones de datos de prueba, volumen y consistencia (0.0 - 5.0)"),
    integrityScore: z.number().min(0).max(5).describe("Puntaje de integridad referencial, restricciones (NOT NULL, UNIQUE, CHECK, FK), índices y validación en Sandbox/Cloud (0.0 - 5.0)"),
    normalizationScore: z.number().min(0).max(5).describe("Puntaje de normalización (1FN, 2FN, 3FN) de 0.0 a 5.0"),
    normalizationLevelAchieved: z.string().describe("Nivel de normalización alcanzado (ej. 3FN, 2FN, Parcial)"),
    entitiesStatus: z.array(z.object({
        entityName: z.string().describe("Nombre de la tabla o entidad evaluada"),
        status: z.enum(["CORRECT", "WARNING", "MISSING"]).describe("Estado del diseño de la entidad"),
        comment: z.string().describe("Observación sobre atributos, tipos, restricciones, índices y llaves"),
    })).describe("Evaluación detallada tabla por tabla"),
    dmlStatus: z.object({
        hasDml: z.boolean().describe("Si la base de datos contiene datos (registros de prueba o datos reales de producción)"),
        isValid: z.boolean().describe("Si los datos respetan integridad referencial y tipos"),
        comment: z.string().describe("Observación sobre la consistencia de los datos y consultas"),
    }).optional().describe("Diagnóstico de manipulación de datos o estado en producción"),
    strengths: z.array(z.string()).describe("Aciertos, buenas prácticas de modelado, índices o código SQL"),
    weaknesses: z.array(z.string()).describe("Problemas de diseño, errores de sintaxis, falta de índices o dependencias transitivas"),
    feedback: z.string().describe("Retroalimentación formativa y pedagógica completa estructurada en Markdown"),
});

export async function gradeDbModeling(params: {
    diagramCode?: string;
    sqlScript?: string;
    connectionString?: string;
    statement: string;
    dbConfig?: {
        deliveryMode?: "sandbox" | "cloud";
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
        sqlScript = "",
        connectionString = "",
        statement,
        dbConfig,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const isCloudMode = Boolean(connectionString?.trim()) || dbConfig?.deliveryMode === "cloud";

    let sandboxResult: SqlSandboxExecutionResult | undefined;
    let cloudResult: CloudPostgresAuditResult | undefined;
    let auditReportText = "";

    if (isCloudMode && connectionString?.trim()) {
        // Modo Cloud: Conexión mediante PostgreSQL MCP en vivo a la base de datos del estudiante
        cloudResult = await auditCloudPostgres(connectionString.trim(), {
            requiredEntities: dbConfig?.requiredEntities || [],
        });

        if (cloudResult.success) {
            auditReportText = `
☁️ REPORTE DE AUDITORÍA EN VIVO POSTGRESQL MCP (NUBE / PRODUCCIÓN):
- Host remoto: ${cloudResult.host} (Base de datos: ${cloudResult.databaseName})
- Versión del motor: ${cloudResult.postgresVersion}
- Tiempo de respuesta / Latencia: ${cloudResult.executionTimeMs} ms
- Tablas activas en producción (${cloudResult.totalTables}): ${cloudResult.createdTableNames.join(", ") || "Ninguna"}
${cloudResult.missingRequiredTables && cloudResult.missingRequiredTables.length > 0
    ? `- ⚠️ Tablas requeridas que NO existen en la base de datos: ${cloudResult.missingRequiredTables.join(", ")}`
    : "- ✅ Todas las tablas requeridas fueron detectadas en la base de datos remota."}
- Detalle de tablas en producción:
${cloudResult.tables.map(t => `  * ${t.tableName}: ${t.rowCount} filas reales (Tamaño: ${t.sizeBytes}).
    Columnas: [${t.columns.map(c => `${c.columnName} (${c.dataType}${c.isNullable ? "" : " NOT NULL"})`).join(", ")}]
    Primary Keys: [${t.primaryKeys.join(", ") || "Ninguna"}]
    Foreign Keys: [${t.foreignKeys.map(fk => `${fk.column} -> ${fk.foreignTable}.${fk.foreignColumn}`).join(", ") || "Ninguna"}]
    Índices configurados: [${t.indexes.map(i => i.indexName).join(", ") || "Solo índices de PK"}]`).join("\n")}
`;
        } else {
            auditReportText = `
❌ FALLO DE CONEXIÓN A POSTGRESQL EN LA NUBE:
- Host: ${cloudResult.host}
- Errores de conexión:
${cloudResult.errors.map(err => `  * ${err}`).join("\n")}
`;
        }
    } else {
        // Modo Sandbox: Ejecución aislada en memoria (PGlite)
        sandboxResult = await executeSqlInSandbox(sqlScript, {
            targetEngine: dbConfig?.targetEngine || "PostgreSQL",
            requiredEntities: dbConfig?.requiredEntities || [],
        });

        if (sandboxResult.success) {
            auditReportText = `
📦 RESULTADO DE EJECUCIÓN EN SANDBOX LOCAL (PGlite):
- Estado: EXITOSO (El script corrió sin errores de sintaxis en el motor).
- Tiempo de ejecución: ${sandboxResult.executionTimeMs} ms
- Tablas creadas en memoria: ${sandboxResult.createdTableNames.join(", ") || "Ninguna"}
${sandboxResult.missingRequiredTables && sandboxResult.missingRequiredTables.length > 0 
    ? `- ⚠️ Tablas requeridas que NO fueron creadas: ${sandboxResult.missingRequiredTables.join(", ")}` 
    : "- ✅ Todas las tablas requeridas fueron detectadas."}
- Conteo de datos insertados:
${sandboxResult.tables.map(t => `  * ${t.tableName}: ${t.rowCount} registros insertados. Columnas: [${t.columns.map(c => `${c.columnName} (${c.dataType})`).join(", ")}]`).join("\n") || "  (Sin tablas inspeccionadas)"}
`;
        } else {
            auditReportText = `
❌ RESULTADO DE EJECUCIÓN EN SANDBOX POSTGRESQL:
- Estado: ERROR DE EJECUCIÓN NATIVO EN EL MOTOR
- Errores arrojados por PostgreSQL:
${sandboxResult.errors.map(err => `  * ${err}`).join("\n")}
`;
        }
    }

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
Eres un DBA Senior y Catedrático Universitario experto en Arquitectura de Bases de Datos Relacionales, SQL (DDL, DML, DQL) y Bases de Datos en Producción Cloud.
Tu misión es evaluar el proyecto de base de datos entregado por un estudiante, apoyándote en el REPORTE TÉCNICO DE AUDITORÍA (MCP / SANDBOX).

---
### ESPECIFICACIONES DE LA ACTIVIDAD:
- MODALIDAD: ${isCloudMode ? "BASE DE DATOS EN LA NUBE (PostgreSQL MCP en vivo - Supabase, Neon, Render)" : "SANDBOX EN MEMORIA (Script SQL)"}
- MOTOR: ${dbConfig?.targetEngine || "PostgreSQL"}
- NIVEL DE NORMALIZACIÓN REQUERIDO: ${dbConfig?.requiredNormalization || "3FN (Tercera Forma Normal)"}
- MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### REPORTE TÉCNICO DE AUDITORÍA:
${auditReportText}

---
### ENTIDADES / TABLAS REQUERIDAS:
${requiredEntitiesText}

---
### ENUNCIADO Y REQUERIMIENTOS DEL TALLER:
${statement || "Modelado relacional y programación SQL del sistema."}

${sqlScript.trim() ? `
---
### SCRIPT SQL / NOTAS DEL ESTUDIANTE:
\`\`\`sql
${sqlScript.trim()}
\`\`\`
` : ""}

---
### CRITERIOS DE AUDITORÍA:
1. **Definición de Estructura (DDL)**:
   - ¿Se crearon las tablas solicitadas? ¿Los tipos de datos son idóneos para producción?
   - Claves Primarias (\`PRIMARY KEY\`) y Foráneas (\`FOREIGN KEY / REFERENCES\`).
2. **Manipulación de Datos y Volumen (DML)**:
   - ${isCloudMode ? "Verificar si la base de datos remota tiene registros reales insertados y consistentes." : "Sentencias INSERT INTO con datos de prueba consistentes."}
3. **Integridad, Restricciones e Índices**:
   - Acciones referenciales (\`ON DELETE\`), restricciones (\`NOT NULL\`, \`UNIQUE\`, \`CHECK\`) y estrategia de indexación para producción.
4. **Normalización (1FN, 2FN, 3FN)**:
   - Ausencia de redundancias, dependencias transitivas o parciales.

Asigna puntajes individuales (0.0 a 5.0) para DDL, DML, Integridad y Normalización fundamentados en el reporte técnico, y genera retroalimentación formativa y detallada en Markdown.
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
        sandboxResult,
        cloudResult,
    };
}
