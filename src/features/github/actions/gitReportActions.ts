"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { gitReportService, GitReportData, GitReportFilterOptions } from "../services/gitReportService";
import { getGithubToken } from "@/lib/githubTokenHelper";
import { getAIModel, extractJSON, repairFeedbackText } from "@/features/teacher/services/ai/client";
import { generateText } from "ai";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export interface GitDetailedTask {
    id: string; // ej: "TASK-01"
    title: string;
    category: "Nueva Funcionalidad" | "Mejora / Refactor" | "Corrección de Error" | "DevOps / Infraestructura" | "Documentación / Tests";
    badgeColor: "emerald" | "blue" | "amber" | "purple" | "slate";
    description: string; // Qué se realizó exactamente en el repositorio basado en los archivos
    technicalDetails: string; // Qué archivos, módulos, endpoints o interfaces se modificaron
    impact: string; // Qué aporta al usuario o funcionamiento del sistema
    author: string; // Quién lo ejecutó
    date?: string;
    relatedCommits: string[]; // Hashes de commits asociados
    filesTouched?: string[]; // Archivos verificados en el commit
}

export interface GitAiReportResult {
    title: string;
    periodLabel: string;
    executiveSummary: string;
    keyAchievements: string[];
    detailedTasks: GitDetailedTask[];
    categories: Array<{
        category: "Nuevas Funcionalidades" | "Mejoras y Optimización" | "Corrección de Errores" | "DevOps y Configuración" | "Documentación y Pruebas";
        badgeColor: "emerald" | "blue" | "amber" | "purple" | "slate";
        title: string;
        description: string;
        impact: string;
        commitsCount: number;
    }>;
    contributorHighlights: Array<{
        name: string;
        login?: string;
        roleDescription: string;
        mainDeliveries: string[];
        commitsCount: number;
        percentage: number;
    }>;
    cadenceAndHealth: {
        status: "Excelente" | "Constante" | "Acelerado" | "Moderado";
        velocityDescription: string;
        activeDaysSummary: string;
        recommendations: string[];
    };
    markdownText: string;
}

/**
 * Server action para obtener las ramas, commits y métricas del repositorio
 */
export async function getRepoReportDataAction(
    repoUrl: string,
    options: GitReportFilterOptions = {},
    customToken?: string
): Promise<GitReportData> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión no válida. Inicia sesión para continuar.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    // 1. Obtener token personal de la base de datos o usar token temporal suministrado
    let token: string | null = null;
    if (customToken && customToken.trim()) {
        token = customToken.trim();
    } else {
        token = await getGithubToken(session.user.id);
    }

    // 2. Ejecutar servicio de reporte
    const reportData = await gitReportService.getRepoReportData(repoUrl, token || undefined, options);
    return reportData;
}

/**
 * Server action para sintetizar commits con el modelo LLM mediante indagación profunda de archivos y diffs
 */
export async function generateGitAiReportAction(params: {
    repoInfo: {
        owner: string;
        repo: string;
        activeBranch: string;
        repoUrl: string;
    };
    dateRangeLabel: string;
    summary: {
        totalCommits: number;
        totalContributors: number;
        activeDaysCount: number;
    };
    commits: Array<{
        shortSha: string;
        title: string;
        body?: string;
        regionalDate: string;
        regionalTime: string;
        authorName: string;
        authorLogin?: string | null;
        branches: string[];
        stats?: { additions: number; deletions: number; total: number };
        files?: Array<{
            filename: string;
            status: string;
            additions: number;
            deletions: number;
            changes: number;
            patch?: string;
        }>;
    }>;
    contributors: Array<{
        name: string;
        login?: string | null;
        commitsCount: number;
        percentage: number;
    }>;
}): Promise<GitAiReportResult> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }

    let model;
    try {
        model = await getAIModel(session.user.id);
    } catch {
        model = await getAIModel(undefined);
    }

    const { repoInfo, dateRangeLabel, summary, commits, contributors } = params;

    // Filtrar archivos poco informativos o autogenerados (lockfiles, bundles minificados, maps)
    const isNoiseFile = (filename: string) => {
        const lower = filename.toLowerCase();
        return (
            lower.endsWith("package-lock.json") ||
            lower.endsWith("pnpm-lock.yaml") ||
            lower.endsWith("yarn.lock") ||
            lower.endsWith("cargo.lock") ||
            lower.endsWith(".min.js") ||
            lower.endsWith(".min.css") ||
            lower.endsWith(".map")
        );
    };

    // Formatear commits con información exhaustiva de archivos modificados y fragmentos de parche
    const formattedCommits = commits.slice(0, 45).map(c => {
        const allFiles = c.files || [];
        const meaningfulFiles = allFiles.filter(f => !isNoiseFile(f.filename));
        const selectedFiles = (meaningfulFiles.length > 0 ? meaningfulFiles : allFiles).slice(0, 12);

        const fileList = selectedFiles.map(f => ({
            file: f.filename,
            status: f.status,
            adds: f.additions,
            dels: f.deletions,
            snippet: f.patch ? f.patch.substring(0, 450) : undefined
        }));

        return {
            sha: c.shortSha,
            date: `${c.regionalDate} ${c.regionalTime}`,
            author: c.authorLogin || c.authorName,
            message: c.title,
            body: c.body ? c.body.substring(0, 200) : undefined,
            branches: c.branches.join(", "),
            stats: c.stats,
            filesChanged: fileList
        };
    });

    // Estrategia Multi-Llamada de Auditoría de Archivos:
    // Analizamos los commits en lotes (de hasta 5 commits por lote) para indagar a fondo
    // en los archivos modificados, adiciones, eliminaciones y fragmentos de diff.
    const allDetailedTasks: GitDetailedTask[] = [];
    const batchSize = 5;
    const totalBatches = Math.max(1, Math.ceil(formattedCommits.length / batchSize));

    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
        const batchCommits = formattedCommits.slice(bIdx * batchSize, (bIdx + 1) * batchSize);
        if (batchCommits.length === 0) continue;

        const batchPrompt = `Eres un Auditor Técnico de Código y Arquitecto de Software Senior.
Tu objetivo es INDAGAR EN LOS ARCHIVOS MODIFICADOS, STATUS (added/modified/removed), LÍNEAS AGREGADAS/ELIMINADAS y FRAGMENTOS DE CÓDIGO (diffs) de los siguientes commits.
Debes determinar con exactitud qué tareas técnicas REALES se implementaron en estos archivos.
No te limites al mensaje del commit ni inventes: básate en el código y en los archivos modificados.

Para cada tarea técnica detectada:
- Explica qué funcionalidad, interfaz, endpoint, modelo de base de datos o lógica se agregó o modificó.
- Lista en "filesTouched" los archivos específicos afectados comprobados en los diffs.
- En "technicalDetails", menciona funciones, hooks, componentes o propiedades intervenidas según los diffs.
- En "impact", explica la utilidad práctica real para el sistema.

Responde ÚNICAMENTE con un JSON válido con la propiedad "tasks":
{
  "tasks": [
    {
      "id": "TASK-${bIdx + 1}-01",
      "title": "Nombre específico de la tarea realizada",
      "category": "Nueva Funcionalidad", // "Nueva Funcionalidad" | "Mejora / Refactor" | "Corrección de Error" | "DevOps / Infraestructura" | "Documentación / Tests"
      "badgeColor": "emerald", // "emerald" para Nuevas Funcionalidades, "blue" para Mejoras, "amber" para Errores, "purple" para DevOps, "slate" para Documentación
      "description": "Explicación detallada de lo que se construyó o modificó en el código según los archivos y diffs analizados.",
      "technicalDetails": "Archivos específicos modificados y métodos o interfaces intervenidos.",
      "impact": "Utilidad práctica y beneficio directo en el sistema.",
      "author": "Nombre del desarrollador",
      "relatedCommits": ["sha1"],
      "filesTouched": ["ruta/del/archivo.ts"]
    }
  ]
}`;

        try {
            const batchResponse = await generateText({
                model,
                system: batchPrompt,
                prompt: `Lote ${bIdx + 1} de ${totalBatches} (${batchCommits.length} commits con archivos y diffs):\n${JSON.stringify(batchCommits, null, 2)}`,
                temperature: 0.2
            });

            const parsedBatch = extractJSON<{ tasks: GitDetailedTask[] }>(batchResponse.text || "");
            if (Array.isArray(parsedBatch?.tasks)) {
                allDetailedTasks.push(...parsedBatch.tasks);
            }
        } catch (batchErr) {
            console.warn(`[gitReportActions] Advertencia al procesar lote de archivos ${bIdx + 1}:`, batchErr);
        }
    }

    // Llamada de Consolidación Ejecutiva (sintetiza todas las tareas verificadas y métricas del repo)
    const consolidationSystemPrompt = `Eres un Director de Ingeniería de Software de SmartClass Enterprise.
Tu misión es generar un INFORME EJECUTIVO CORPORATIVO de alto nivel, extremadamente claro, elocuente y pedagógico, integrando el trabajo real verificado en los archivos del repositorio.

REGLAS DE COMUNICACIÓN:
1. Idioma: Español corporativo, claro y pedagógico.
2. Explica con total claridad el progreso global, objetivos alcanzados y valor generado.
3. Categoriza los esfuerzos e incluye recomendaciones de próximos pasos y salud técnica.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA:
{
  "title": "Título profesional del informe (ej: 'Informe Ejecutivo de Desarrollo: Repositorio ...')",
  "periodLabel": "${dateRangeLabel}",
  "executiveSummary": "Resumen ejecutivo de 2 a 3 párrafos fluidos explicando el progreso global durante este período, los objetivos alcanzados y el valor generado.",
  "keyAchievements": [
    "Logro clave 1 redactado con claridad",
    "Logro clave 2...",
    "Logro clave 3..."
  ],
  "detailedTasks": [
    {
      "id": "TASK-01",
      "title": "Nombre claro y específico de la tarea realizada",
      "category": "Nueva Funcionalidad",
      "badgeColor": "emerald",
      "description": "Explicación detallada de qué se desarrolló o modificó en los archivos.",
      "technicalDetails": "Archivos y módulos específicos modificados.",
      "impact": "Beneficio directo y utilidad para el usuario o la plataforma.",
      "author": "Nombre o usuario del autor",
      "relatedCommits": ["abc1234"],
      "filesTouched": ["src/index.ts"]
    }
  ],
  "categories": [
    {
      "category": "Nuevas Funcionalidades",
      "badgeColor": "emerald",
      "title": "Título sintetizado del conjunto de cambios",
      "description": "Explicación comprensible de lo que se implementó o cambió.",
      "impact": "Beneficio o impacto práctico que aporta al proyecto.",
      "commitsCount": 5
    }
  ],
  "contributorHighlights": [
    {
      "name": "Nombre del colaborador",
      "login": "login_github",
      "roleDescription": "Foco principal basado en los archivos que modificó",
      "mainDeliveries": [
        "Entrega destacada 1",
        "Entrega destacada 2"
      ],
      "commitsCount": 10,
      "percentage": 45.5
    }
  ],
  "cadenceAndHealth": {
    "status": "Excelente",
    "velocityDescription": "Análisis en 1-2 párrafos del ritmo de trabajo, frecuencia de commits y consistencia del equipo.",
    "activeDaysSummary": "Evaluación de la distribución del tiempo y días con actividad.",
    "recommendations": [
      "Recomendación 1 para las próximas fases",
      "Recomendación 2..."
    ]
  }
}`;

    const consolidationUserContent = `Genera el informe ejecutivo a partir de los datos y auditoría de archivos:

Repositorio: ${repoInfo.owner}/${repoInfo.repo}
Rama(s) analizada(s): ${repoInfo.activeBranch === "all" ? "Todas las ramas (Global)" : repoInfo.activeBranch}
Período evaluado: ${dateRangeLabel}
Total de Commits en el período: ${summary.totalCommits}
Colaboradores activos: ${summary.totalContributors}
Días con actividad: ${summary.activeDaysCount}

Colaboradores y porcentaje de commits:
${contributors.map(c => `- ${c.name} (${c.login || "N/A"}): ${c.commitsCount} commits (${c.percentage}%)`).join("\n")}

${allDetailedTasks.length > 0 ? `Tareas técnicas extraídas del análisis profundo de archivos y diffs (${allDetailedTasks.length} tareas detectadas):\n${JSON.stringify(allDetailedTasks, null, 2)}` : `Commits con archivos modificados y fragmentos de código:\n${JSON.stringify(formattedCommits, null, 2)}`}
`;

    try {
        const aiResponse = await generateText({
            model,
            system: consolidationSystemPrompt,
            prompt: consolidationUserContent,
            temperature: 0.2,
        });

        const rawText = aiResponse.text || "";
        const parsed = extractJSON<Omit<GitAiReportResult, "markdownText">>(rawText);

        // Si ya teníamos tareas extraídas en los lotes previos, preservarlas y combinarlas
        let finalTasks: GitDetailedTask[] = [];
        if (allDetailedTasks.length > 0) {
            finalTasks = allDetailedTasks;
        } else if (Array.isArray(parsed.detailedTasks) && parsed.detailedTasks.length > 0) {
            finalTasks = parsed.detailedTasks;
        }

        // Asignar IDs secuenciales limpios (TASK-01, TASK-02...)
        finalTasks = finalTasks.map((t, idx) => ({
            ...t,
            id: `TASK-${String(idx + 1).padStart(2, '0')}`,
            filesTouched: Array.isArray(t.filesTouched) ? t.filesTouched : []
        }));

        // Generar versión Markdown complementaria para copiar o exportar
        const markdownLines: string[] = [];
        markdownLines.push(`# ${parsed.title || `Informe de Actividad: ${repoInfo.repo}`}`);
        markdownLines.push(`**Repositorio:** ${repoInfo.owner}/${repoInfo.repo} | **Período:** ${dateRangeLabel}`);
        markdownLines.push(`**Rama:** ${repoInfo.activeBranch === "all" ? "Todas las ramas" : repoInfo.activeBranch} | **Commits:** ${summary.totalCommits} | **Colaboradores:** ${summary.totalContributors}\n`);
        
        markdownLines.push(`## Resumen Ejecutivo`);
        markdownLines.push(repairFeedbackText(parsed.executiveSummary || "") + "\n");

        if (parsed.keyAchievements && parsed.keyAchievements.length > 0) {
            markdownLines.push(`### Hitos y Logros Principales`);
            parsed.keyAchievements.forEach(h => markdownLines.push(`- ${h}`));
            markdownLines.push("");
        }

        if (finalTasks.length > 0) {
            markdownLines.push(`## Inventario Detallado de Tareas Realizadas (${finalTasks.length} tareas verificadas)`);
            finalTasks.forEach((task, idx) => {
                markdownLines.push(`### ${idx + 1}. [${task.category}] ${task.title}`);
                markdownLines.push(`**Responsable:** ${task.author} | **Commits:** ${task.relatedCommits?.join(", ") || "N/A"}`);
                if (task.filesTouched && task.filesTouched.length > 0) {
                    markdownLines.push(`**Archivos Modificados:** \`${task.filesTouched.join("`, `")}\``);
                }
                markdownLines.push(`\n${task.description}`);
                if (task.technicalDetails) {
                    markdownLines.push(`\n**Detalles Técnicos:** ${task.technicalDetails}`);
                }
                if (task.impact) {
                    markdownLines.push(`**Impacto / Utilidad:** ${task.impact}`);
                }
                markdownLines.push("");
            });
        }

        if (parsed.categories && parsed.categories.length > 0) {
            markdownLines.push(`## Desglose por Áreas de Trabajo`);
            parsed.categories.forEach(cat => {
                markdownLines.push(`### [${cat.category}] ${cat.title}`);
                markdownLines.push(cat.description);
                if (cat.impact) markdownLines.push(`*Impacto:* ${cat.impact}`);
                markdownLines.push("");
            });
        }

        if (parsed.contributorHighlights && parsed.contributorHighlights.length > 0) {
            markdownLines.push(`## Desempeño y Contribuciones por Integrante`);
            parsed.contributorHighlights.forEach(c => {
                markdownLines.push(`### ${c.name} (${c.commitsCount} commits - ${c.percentage}%)`);
                markdownLines.push(`**Rol / Foco:** ${c.roleDescription}`);
                if (c.mainDeliveries && c.mainDeliveries.length > 0) {
                    markdownLines.push(`Entregas principales:`);
                    c.mainDeliveries.forEach(d => markdownLines.push(`- ${d}`));
                }
                markdownLines.push("");
            });
        }

        if (parsed.cadenceAndHealth) {
            markdownLines.push(`## Cadencia y Ritmo de Desarrollo: ${parsed.cadenceAndHealth.status}`);
            markdownLines.push(parsed.cadenceAndHealth.velocityDescription || "");
            if (parsed.cadenceAndHealth.recommendations?.length > 0) {
                markdownLines.push(`### Próximos Pasos Recomendados:`);
                parsed.cadenceAndHealth.recommendations.forEach(r => markdownLines.push(`- ${r}`));
            }
        }

        return {
            ...parsed,
            title: parsed.title || `Informe de Desarrollo: ${repoInfo.repo}`,
            periodLabel: parsed.periodLabel || dateRangeLabel,
            executiveSummary: repairFeedbackText(parsed.executiveSummary || ""),
            detailedTasks: finalTasks,
            markdownText: markdownLines.join("\n")
        };
    } catch (error: any) {
        console.error("[generateGitAiReportAction] Error generando informe con IA:", error);
        throw new Error(error.message || "Error al sintetizar commits con el modelo de Inteligencia Artificial.");
    }
}
