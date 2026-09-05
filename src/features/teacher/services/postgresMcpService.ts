import { Client } from "pg";

export interface CloudColumnInfo {
    columnName: string;
    dataType: string;
    isNullable: boolean;
    columnDefault: string | null;
}

export interface CloudTableInfo {
    tableName: string;
    rowCount: number;
    sizeBytes: string;
    columns: CloudColumnInfo[];
    primaryKeys: string[];
    foreignKeys: Array<{
        column: string;
        foreignTable: string;
        foreignColumn: string;
    }>;
    indexes: Array<{
        indexName: string;
        indexDef: string;
    }>;
    sampleRows: Array<Record<string, any>>;
}

export interface CloudPostgresAuditResult {
    success: boolean;
    executionTimeMs: number;
    host: string;
    databaseName: string;
    maskedUri: string;
    postgresVersion: string;
    totalTables: number;
    tables: CloudTableInfo[];
    createdTableNames: string[];
    missingRequiredTables?: string[];
    errors: string[];
    summary: string;
}

/**
 * Enmascara la contraseña de una URI de conexión PostgreSQL para visualización segura.
 */
export function maskPostgresUri(uri: string): { maskedUri: string; host: string; dbName: string } {
    try {
        const parsed = new URL(uri);
        const host = parsed.hostname;
        const dbName = parsed.pathname.replace(/^\//, "");
        if (parsed.password) {
            parsed.password = "••••••••";
        }
        return {
            maskedUri: parsed.toString(),
            host: `${host}${parsed.port ? `:${parsed.port}` : ""}`,
            dbName,
        };
    } catch {
        return {
            maskedUri: "postgresql://***:••••••••@hidden-host/db",
            host: "servidor-remoto",
            dbName: "postgres",
        };
    }
}

/**
 * Conector MCP para bases de datos PostgreSQL en la nube (Supabase, Neon, Render, AWS RDS).
 * Ejecuta en modo seguro de solo lectura y extrae el catálogo en vivo para la auditoría de proyectos.
 */
export async function auditCloudPostgres(
    connectionUri: string,
    options?: {
        requiredEntities?: string[];
        timeoutMs?: number;
    }
): Promise<CloudPostgresAuditResult> {
    const startTime = Date.now();
    const cleanUri = (connectionUri || "").trim();

    const { maskedUri, host, dbName } = maskPostgresUri(cleanUri);

    if (!cleanUri.startsWith("postgres://") && !cleanUri.startsWith("postgresql://")) {
        return {
            success: false,
            executionTimeMs: 0,
            host,
            databaseName: dbName,
            maskedUri,
            postgresVersion: "Desconocida",
            totalTables: 0,
            tables: [],
            createdTableNames: [],
            errors: ["La cadena de conexión debe comenzar con 'postgresql://' o 'postgres://'."],
            summary: "Formato de URI de PostgreSQL inválido.",
        };
    }

    const isLocal = cleanUri.includes("localhost") || cleanUri.includes("127.0.0.1");

    const client = new Client({
        connectionString: cleanUri,
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
        connectionTimeoutMillis: options?.timeoutMs || 6000,
        statement_timeout: 4000,
    });

    try {
        // 1. Conexión segura con timeout
        await client.connect();

        // 2. Forzar modo de solo lectura para evitar alteraciones accidentales
        try {
            await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;");
        } catch {
            // Algunos proveedores gestionan el modo transacción externamente
        }

        // 3. Consultar versión de PostgreSQL
        const versionRes = await client.query("SELECT version();");
        const postgresVersion = versionRes.rows[0]?.version || "PostgreSQL";

        // 4. MCP Tool: list_tables (tablas en esquema public)
        const tablesRes = await client.query<{ table_name: string }>(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name ASC;
        `);

        const createdTableNames = (tablesRes.rows || []).map((r) => r.table_name);
        const tables: CloudTableInfo[] = [];

        // 5. MCP Tool: describe_table (columnas, PKs, FKs, índices y métricas)
        for (const tableName of createdTableNames) {
            try {
                // Columnas
                const colsRes = await client.query<{
                    column_name: string;
                    data_type: string;
                    is_nullable: string;
                    column_default: string | null;
                }>(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position ASC;
                `, [tableName]);

                const columns: CloudColumnInfo[] = (colsRes.rows || []).map((c) => ({
                    columnName: c.column_name,
                    dataType: c.data_type,
                    isNullable: c.is_nullable === "YES",
                    columnDefault: c.column_default,
                }));

                // Primary Keys
                const pkRes = await client.query<{ column_name: string }>(`
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_name = $1
                      AND tc.table_schema = 'public';
                `, [tableName]);
                const primaryKeys = (pkRes.rows || []).map((r) => r.column_name);

                // Foreign Keys
                const fkRes = await client.query<{
                    column_name: string;
                    foreign_table_name: string;
                    foreign_column_name: string;
                }>(`
                    SELECT
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_name = $1
                      AND tc.table_schema = 'public';
                `, [tableName]);

                const foreignKeys = (fkRes.rows || []).map((r) => ({
                    column: r.column_name,
                    foreignTable: r.foreign_table_name,
                    foreignColumn: r.foreign_column_name,
                }));

                // Índices reales en producción (pg_indexes)
                const indexRes = await client.query<{ indexname: string; indexdef: string }>(`
                    SELECT indexname, indexdef
                    FROM pg_indexes
                    WHERE schemaname = 'public' AND tablename = $1;
                `, [tableName]);

                const indexes = (indexRes.rows || []).map((idx) => ({
                    indexName: idx.indexname,
                    indexDef: idx.indexdef,
                }));

                // Conteo de registros reales y tamaño en disco
                let rowCount = 0;
                let sizeBytes = "0 kB";
                let sampleRows: Array<Record<string, any>> = [];

                try {
                    const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}";`);
                    rowCount = parseInt(countRes.rows[0]?.count || "0", 10);

                    const sizeRes = await client.query(`SELECT pg_size_pretty(pg_total_relation_size('"' || $1 || '"')) as size;`, [tableName]);
                    sizeBytes = sizeRes.rows[0]?.size || "0 kB";

                    const sampleRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 5;`);
                    sampleRows = (sampleRes.rows || []) as Array<Record<string, any>>;
                } catch {
                    // Fallback si la tabla no permite conteo rápido
                }

                tables.push({
                    tableName,
                    rowCount,
                    sizeBytes,
                    columns,
                    primaryKeys,
                    foreignKeys,
                    indexes,
                    sampleRows,
                });
            } catch (err: any) {
                console.warn(`Error inspeccionando tabla remota ${tableName}:`, err?.message);
            }
        }

        // 6. Validar contra requerimientos de la actividad
        const requiredEntities = options?.requiredEntities || [];
        const missingRequiredTables = requiredEntities.filter((req) => {
            const normReq = req.toLowerCase().trim();
            return !createdTableNames.some((c) => c.toLowerCase().trim() === normReq);
        });

        const executionTimeMs = Date.now() - startTime;

        return {
            success: true,
            executionTimeMs,
            host,
            databaseName: dbName,
            maskedUri,
            postgresVersion,
            totalTables: createdTableNames.length,
            tables,
            createdTableNames,
            missingRequiredTables,
            errors: [],
            summary: `Conexión exitosa a PostgreSQL en la nube (${host}). Se inspeccionaron ${createdTableNames.length} tablas activas en ${executionTimeMs}ms.`,
        };
    } catch (err: any) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = err?.message || String(err);

        return {
            success: false,
            executionTimeMs,
            host,
            databaseName: dbName,
            maskedUri,
            postgresVersion: "No disponible",
            totalTables: 0,
            tables: [],
            createdTableNames: [],
            errors: [errorMessage],
            summary: `Fallo de conexión a la base de datos en la nube (${host}): ${errorMessage}`,
        };
    } finally {
        try {
            await client.end();
        } catch {
            // Silenciar cierre
        }
    }
}
