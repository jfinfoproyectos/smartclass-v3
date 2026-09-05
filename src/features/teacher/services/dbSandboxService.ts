import { PGlite } from "@electric-sql/pglite";

export interface SandboxTableInfo {
    tableName: string;
    columns: Array<{
        columnName: string;
        dataType: string;
        isNullable: boolean;
    }>;
    rowCount: number;
    sampleRows: Array<Record<string, any>>;
}

export interface SqlSandboxExecutionResult {
    success: boolean;
    executionTimeMs: number;
    tables: SandboxTableInfo[];
    createdTableNames: string[];
    missingRequiredTables?: string[];
    errors: string[];
    summary: string;
}

/**
 * Ejecuta un script SQL en un sandbox efímero en memoria (PostgreSQL WASM / PGlite).
 * No requiere servidores externos ni cadenas de conexión remotas.
 */
export async function executeSqlInSandbox(
    sqlScript: string,
    options?: {
        targetEngine?: string;
        requiredEntities?: string[];
        timeoutMs?: number;
    }
): Promise<SqlSandboxExecutionResult> {
    const startTime = Date.now();
    const cleanScript = (sqlScript || "").trim();

    if (!cleanScript) {
        return {
            success: false,
            executionTimeMs: 0,
            tables: [],
            createdTableNames: [],
            errors: ["El script SQL entregado está vacío."],
            summary: "No se proporcionó ningún código SQL para ejecutar.",
        };
    }

    let db: PGlite | null = null;
    try {
        // 1. Instanciar base de datos PostgreSQL aislada en memoria RAM
        db = new PGlite();

        // 2. Ejecutar el script SQL del estudiante (DDL, DML, DQL)
        await db.exec(cleanScript);

        // 3. Inspeccionar tablas creadas en el esquema público
        const tablesQuery = await db.query<{ table_name: string }>(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name ASC;
        `);

        const tablesCreated = (tablesQuery.rows || []).map((r) => r.table_name);
        const tablesInfo: SandboxTableInfo[] = [];

        // 4. Extraer columnas y muestras de datos de cada tabla
        for (const tableName of tablesCreated) {
            try {
                // Columnas
                const colsQuery = await db.query<{
                    column_name: string;
                    data_type: string;
                    is_nullable: string;
                }>(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = '${tableName}'
                    ORDER BY ordinal_position ASC;
                `);

                const columns = (colsQuery.rows || []).map((c) => ({
                    columnName: c.column_name,
                    dataType: c.data_type,
                    isNullable: c.is_nullable === "YES",
                }));

                // Muestra de datos y conteo
                let rowCount = 0;
                let sampleRows: Array<Record<string, any>> = [];

                try {
                    const countQuery = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM "${tableName}";`);
                    rowCount = parseInt(countQuery.rows[0]?.count || "0", 10);

                    const dataQuery = await db.query(`SELECT * FROM "${tableName}" LIMIT 5;`);
                    sampleRows = (dataQuery.rows || []) as Array<Record<string, any>>;
                } catch {
                    // Fallback si la tabla tiene restricciones especiales
                }

                tablesInfo.push({
                    tableName,
                    columns,
                    rowCount,
                    sampleRows,
                });
            } catch (err: any) {
                console.warn(`Error inspeccionando tabla ${tableName}:`, err?.message);
            }
        }

        // 5. Comparar con entidades requeridas (si se configuraron)
        const requiredEntities = options?.requiredEntities || [];
        const missingRequiredTables = requiredEntities.filter((req) => {
            const normalizedReq = req.toLowerCase().trim();
            return !tablesCreated.some((created) => created.toLowerCase().trim() === normalizedReq);
        });

        const executionTimeMs = Date.now() - startTime;

        return {
            success: true,
            executionTimeMs,
            tables: tablesInfo,
            createdTableNames: tablesCreated,
            missingRequiredTables,
            errors: [],
            summary: `Ejecución exitosa en ${executionTimeMs}ms. Se crearon ${tablesCreated.length} tablas (${tablesCreated.join(", ") || "ninguna"}).`,
        };
    } catch (err: any) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = err?.message || String(err);

        return {
            success: false,
            executionTimeMs,
            tables: [],
            createdTableNames: [],
            errors: [errorMessage],
            summary: `Fallo de ejecución PostgreSQL: ${errorMessage}`,
        };
    } finally {
        if (db) {
            try {
                await db.close();
            } catch {
                // Silenciar cierre
            }
        }
    }
}
