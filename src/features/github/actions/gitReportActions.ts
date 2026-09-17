"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { gitReportService, GitReportData, GitReportFilterOptions, GitCommitFileChange } from "../services/gitReportService";
import { getGithubToken } from "@/lib/githubTokenHelper";
import { getAIModel, extractJSON, repairFeedbackText } from "@/features/teacher/services/ai/client";
import { generateText } from "ai";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export type GitReportMode = "pedagogical" | "executive" | "technical";

export interface GitDiffAiExplanation {
    summary: string;
    changesBreakdown: string[];
    pedagogicalAssessment: {
        strengths: string[];
        observations: string[];
        suggestedFeedback?: string;
    };
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
    reportMode?: GitReportMode;
    includeAuthors?: boolean;
    includeCommitHashes?: boolean;
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
 * Server action para obtener los detalles completos y diffs de un commit específico
 */
export async function getCommitFullDiffAction(params: {
    repoUrl: string;
    sha: string;
    customToken?: string;
}): Promise<{
    sha: string;
    stats: { additions: number; deletions: number; total: number };
    files: Array<GitCommitFileChange & { rawUrl?: string; blobUrl?: string }>;
} | null> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión no válida. Inicia sesión para continuar.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    let token: string | null = null;
    if (params.customToken && params.customToken.trim()) {
        token = params.customToken.trim();
    } else {
        token = await getGithubToken(session.user.id);
    }

    const { githubService } = await import("../services/githubService");
    const repoInfo = githubService.parseGitHubUrl(params.repoUrl);
    if (!repoInfo) {
        throw new Error("URL del repositorio no válida.");
    }

    return await gitReportService.fetchCommitFullDetails(repoInfo.owner, repoInfo.repo, params.sha, token || undefined);
}

/**
 * Server action para explicar pedagógicamente un diff de código con IA
 */
export async function explainDiffWithAiAction(params: {
    repoFullName: string;
    commitTitle: string;
    authorName?: string;
    filename: string;
    patch: string;
}): Promise<GitDiffAiExplanation> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión no válida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    const model = await getAIModel(session?.user?.id);
    const systemPrompt = `Eres un docente senior de ingeniería de software y evaluador experto en control de versiones Git y revisión de código.
Analiza el siguiente diff de código de un estudiante/desarrollador y proporciona una explicación clara, técnica pero didáctica, estructurada en JSON estrictamente válido.

Instrucciones:
1. "summary": Resumen conciso de qué implementa o modifica este cambio (1 o 2 oraciones).
2. "changesBreakdown": Array de 2 a 4 viñetas concretas sobre las modificaciones clave efectuadas en el código.
3. "pedagogicalAssessment":
   - "strengths": Array de 1 a 2 aspectos positivos encontrados (ej. tipado, modularidad, nombres descriptivos, manejo de casos borde).
   - "observations": Array de 1 a 2 posibles observaciones, riesgos o deuda técnica si los hubiera (ej. falta de validación, código repetido, etc.).
   - "suggestedFeedback": Una frase constructiva y motivadora dirigida al estudiante para orientarlo o felicitarlo.

Responde ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "summary": "...",
  "changesBreakdown": ["...", "..."],
  "pedagogicalAssessment": {
    "strengths": ["..."],
    "observations": ["..."],
    "suggestedFeedback": "..."
  }
}`;

    const prompt = `Repositorio: ${params.repoFullName}
Commit: ${params.commitTitle}
Autor: ${params.authorName || 'Desarrollador'}
Archivo: ${params.filename}

DIFF:
\`\`\`diff
${params.patch.slice(0, 5000)}
\`\`\``;

    try {
        const response = await generateText({
            model,
            system: systemPrompt,
            prompt,
            temperature: 0.2
        });

        const parsed = extractJSON(response.text);
        if (!parsed || !parsed.summary) {
            return {
                summary: "Se aplicaron modificaciones en " + params.filename,
                changesBreakdown: ["Cambios registrados en el diff del archivo"],
                pedagogicalAssessment: {
                    strengths: ["Commit registrado en el repositorio"],
                    observations: ["No fue posible analizar el diff automáticamente"],
                    suggestedFeedback: "Revisar la lógica implementada directamente en el editor."
                }
            };
        }

        return parsed as GitDiffAiExplanation;
    } catch {
        return {
            summary: "Se realizaron cambios en " + params.filename,
            changesBreakdown: ["Modificación en líneas del archivo"],
            pedagogicalAssessment: {
                strengths: ["Aporte registrado"],
                observations: ["Servicio de IA ocupado o temporalmente no disponible"],
                suggestedFeedback: "Continúa aplicando buenas prácticas de control de versiones."
            }
        };
    }
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
    reportMode?: GitReportMode;
    includeAuthors?: boolean;
    includeCommitHashes?: boolean;
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

    const { 
        repoInfo, 
        dateRangeLabel, 
        summary, 
        commits, 
        contributors, 
        reportMode = "pedagogical", 
        includeAuthors = true, 
        includeCommitHashes = true 
    } = params;

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
            sha: includeCommitHashes ? c.shortSha : undefined,
            date: `${c.regionalDate} ${c.regionalTime}`,
            author: includeAuthors ? (c.authorLogin || c.authorName) : "Equipo",
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
${!includeAuthors ? "REGLA DE PRIVACIDAD: No nombres a personas específicas. En el campo 'author' asigna siempre 'Equipo'.\n" : ""}
${!includeCommitHashes ? "REGLA DE FORMATO: No es necesario citar hashes de commits en el texto ni en relatedCommits.\n" : ""}

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
      "author": "${includeAuthors ? 'Nombre del desarrollador' : 'Equipo'}",
      "relatedCommits": ${includeCommitHashes ? '["sha1"]' : '[]'},
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

    // Configurar instrucciones y rol según el modo seleccionado
    let modePersona = "";
    let modeInstructions = "";
    let defaultTitle = "";

    if (reportMode === "pedagogical") {
        modePersona = "Eres un Evaluador Académico Senior y Mentor de Desarrollo de Software en SmartClass.";
        modeInstructions = `ENFOQUE PEDAGÓGICO / FORMATIVO:
1. Evalúa las buenas prácticas de Git (atomicidad de commits, mensajes descriptivos y convencionales, uso ordenado de ramas).
2. Valora el progreso continuo, la constancia en el tiempo y el desarrollo de competencias técnicas evidenciadas en el código real.
3. Brinda retroalimentación constructiva señalando fortalezas formativas y áreas clave de aprendizaje.
${!includeAuthors ? "4. Omitir individualizaciones: Enfócate en el desempeño colectivo del grupo de aprendizaje sin nombrar alumnos específicos." : "4. Evalúa la equidad y colaboración en el equipo, detectando aportes de cada integrante."}
${!includeCommitHashes ? "5. Omitir hashes: Redacta de forma limpia y legible sin hashes de commits en el texto." : ""}`;
        defaultTitle = `Evaluación Pedagógica y Auditoría Git: ${repoInfo.repo}`;
    } else if (reportMode === "executive") {
        modePersona = "Eres un Director Ejecutivo de Tecnología (CTO) y Gerente de Producto en SmartClass Enterprise.";
        modeInstructions = `ENFOQUE EJECUTIVO / GERENCIAL:
1. Destaca el valor comercial y de producto entregado, las funcionalidades listas para el usuario final y los hitos alcanzados.
2. Explica el impacto estratégico de los cambios en el negocio, minimizando la jerga técnica innecesaria para directivos y clientes.
3. Evalúa la cadencia de entrega y la estabilidad general del proyecto para el roadmap.
${!includeAuthors ? "4. Enfoque de equipo: Resume el trabajo como un logro conjunto de la célula de desarrollo sin individualizar nombres." : ""}
${!includeCommitHashes ? "5. Formato ejecutivo: No menciones códigos de commits en las descripciones." : ""}`;
        defaultTitle = `Informe Ejecutivo de Entregas y Negocio: ${repoInfo.repo}`;
    } else {
        // "technical"
        modePersona = "Eres un Arquitecto Principal de Software y Auditor Técnico de Código en SmartClass Enterprise.";
        modeInstructions = `ENFOQUE TÉCNICO Y DE ARQUITECTURA:
1. Analiza modularidad, patrones de arquitectura de software, calidad, robustez y diseño de componentes y servicios.
2. Examina cambios críticos en archivos, refactorizaciones, endpoints, esquemas de datos y diffs comprobados.
3. Identifica control de deuda técnica, buenas prácticas de ingeniería y recomendaciones de escalabilidad.
${!includeAuthors ? "4. Enfoque de código: Enfoca el análisis estrictamente en el código y la arquitectura del sistema." : ""}
${!includeCommitHashes ? "5. No satures el informe con hashes de commits en las explicaciones." : ""}`;
        defaultTitle = `Auditoría Técnica y Arquitectura de Software: ${repoInfo.repo}`;
    }

    // Llamada de Consolidación (sintetiza todas las tareas verificadas y métricas del repo)
    const consolidationSystemPrompt = `${modePersona}
Tu misión es generar un INFORME OFICIAL de alto nivel, extremadamente claro, elocuente y adaptado al modo de síntesis seleccionado.

${modeInstructions}

REGLAS DE COMUNICACIÓN:
1. Idioma: Español profesional, claro y adecuado al rol.
2. Explica con total claridad el progreso global, objetivos alcanzados y valor generado.
3. Categoriza los esfuerzos e incluye recomendaciones de próximos pasos y salud técnica.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA:
{
  "title": "Título profesional del informe (ej: '${defaultTitle}')",
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
      "author": "${includeAuthors ? 'Nombre o usuario del autor' : 'Equipo'}",
      "relatedCommits": ${includeCommitHashes ? '["abc1234"]' : '[]'},
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
      "name": "${includeAuthors ? 'Nombre del colaborador' : 'Equipo de Desarrollo'}",
      "login": "${includeAuthors ? 'login_github' : ''}",
      "roleDescription": "Foco principal basado en los archivos modificados",
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

    const consolidationUserContent = `Genera el informe a partir de los datos y auditoría de archivos:

Modo de síntesis seleccionado: ${reportMode.toUpperCase()}
Incluir autores individuales: ${includeAuthors ? "SÍ" : "NO (Generar informe anónimo/de equipo)"}
Incluir hashes de commits: ${includeCommitHashes ? "SÍ" : "NO (Omitir códigos SHA)"}

Repositorio: ${repoInfo.owner}/${repoInfo.repo}
Rama(s) analizada(s): ${repoInfo.activeBranch === "all" ? "Todas las ramas (Global)" : repoInfo.activeBranch}
Período evaluado: ${dateRangeLabel}
Total de Commits en el período: ${summary.totalCommits}
Colaboradores activos: ${summary.totalContributors}
Días con actividad: ${summary.activeDaysCount}

${includeAuthors ? `Colaboradores y porcentaje de commits:\n${contributors.map(c => `- ${c.name} (${c.login || "N/A"}): ${c.commitsCount} commits (${c.percentage}%)`).join("\n")}` : `Total de miembros del equipo evaluados: ${summary.totalContributors}`}

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

        // Asignar IDs secuenciales limpios (TASK-01, TASK-02...) y aplicar reglas de autor y hash
        finalTasks = finalTasks.map((t, idx) => ({
            ...t,
            id: `TASK-${String(idx + 1).padStart(2, '0')}`,
            author: includeAuthors ? t.author : "Equipo",
            relatedCommits: includeCommitHashes ? (t.relatedCommits || []) : [],
            filesTouched: Array.isArray(t.filesTouched) ? t.filesTouched : []
        }));

        // Generar versión Markdown complementaria para copiar o exportar
        const markdownLines: string[] = [];
        markdownLines.push(`# ${parsed.title || defaultTitle}`);
        markdownLines.push(`**Repositorio:** ${repoInfo.owner}/${repoInfo.repo} | **Período:** ${dateRangeLabel}`);
        markdownLines.push(`**Rama:** ${repoInfo.activeBranch === "all" ? "Todas las ramas" : repoInfo.activeBranch} | **Commits:** ${summary.totalCommits} | **Modo:** ${reportMode === 'pedagogical' ? 'Pedagógico' : reportMode === 'executive' ? 'Ejecutivo' : 'Técnico'}\n`);
        
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
                const metaParts: string[] = [];
                if (includeAuthors) metaParts.push(`**Responsable:** ${task.author}`);
                if (includeCommitHashes && task.relatedCommits && task.relatedCommits.length > 0) {
                    metaParts.push(`**Commits:** ${task.relatedCommits.join(", ")}`);
                }
                if (metaParts.length > 0) {
                    markdownLines.push(metaParts.join(" | "));
                }

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

        if (includeAuthors && parsed.contributorHighlights && parsed.contributorHighlights.length > 0) {
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
            reportMode,
            includeAuthors,
            includeCommitHashes,
            title: parsed.title || defaultTitle,
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
