import { githubService } from "@/features/github/services/githubService";
import { getGithubToken } from "@/lib/githubTokenHelper";
import { getAIModel, repairFeedbackText } from "./client";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export interface WorkshopMilestoneData {
    id?: string;
    title: string;
    instructions: string;
    requiresFile?: boolean;
    requiresGitCommands?: boolean;
    targetFilePath?: string;
    targetFileContent?: string;
    gitCommands?: Array<{ command: string; explanation: string }>;
    validationRule?: string;
    order?: number;
    weight?: number;
}

export interface StepAuditEvaluation {
    stepIndex: number;
    title: string;
    targetFilePath: string;
    status: "COMPLETED" | "PARTIAL" | "MISSING";
    score: number; // 0.0 to 5.0
    fileFound: boolean;
    isInstructional?: boolean;
    feedback: string;
}

export interface GitWorkflowEvaluation {
    score: number; // 0.0 to 5.0
    status: "EXCELLENT" | "ACCEPTABLE" | "NEEDS_IMPROVEMENT" | "POOR";
    feedback: string;
    totalCommitsFound: number;
    commitSummary: string;
}

export interface WorkshopGithubGradingResult {
    grade: number;
    rawAiGrade?: number;
    feedback: string;
    stepEvaluations: StepAuditEvaluation[];
    gitWorkflow?: GitWorkflowEvaluation;
    totalSteps: number;
    completedSteps: number;
    partialSteps: number;
    missingSteps: number;
    summary: string;
}

function parseRubricWeights(statement?: string): { stepsWeight: number; gitWeight: number } {
    const defaultWeights = { stepsWeight: 0.7, gitWeight: 0.3 };
    if (!statement) return defaultWeights;

    const gitMatch = statement.match(/(?:git|versionamiento|historial|commits?)[^\d\n\r]*?(\d{1,2})\s*%/i)
        || statement.match(/(\d{1,2})\s*%\s*(?:para\s+)?(?:git|versionamiento|historial|commits?)/i);
    
    const stepsMatch = statement.match(/(?:pasos?|código|archivos?|implementación)[^\d\n\r]*?(\d{1,2})\s*%/i)
        || statement.match(/(\d{1,2})\s*%\s*(?:para\s+)?(?:pasos?|código|archivos?|implementación)/i);

    if (gitMatch) {
        const parsedGit = parseInt(gitMatch[1], 10);
        if (parsedGit >= 5 && parsedGit <= 60) {
            const gitWeight = parsedGit / 100;
            return { stepsWeight: Math.round((1 - gitWeight) * 100) / 100, gitWeight };
        }
    } else if (stepsMatch) {
        const parsedSteps = parseInt(stepsMatch[1], 10);
        if (parsedSteps >= 40 && parsedSteps <= 95) {
            const stepsWeight = parsedSteps / 100;
            return { stepsWeight, gitWeight: Math.round((1 - stepsWeight) * 100) / 100 };
        }
    }

    return defaultWeights;
}

export async function gradeWorkshopGithubSubmission(params: {
    activityId: string;
    activityTitle: string;
    repoUrl: string;
    branch?: string;
    milestones: WorkshopMilestoneData[];
    teacherId: string;
    gradingMode?: "normal" | "moderate" | "strict";
    statement?: string;
}): Promise<WorkshopGithubGradingResult> {
    const {
        activityTitle,
        repoUrl,
        branch = "main",
        milestones = [],
        teacherId,
        gradingMode = "moderate",
        statement
    } = params;

    if (!repoUrl || !repoUrl.trim()) {
        throw new Error("No se proporcionó la URL del repositorio GitHub del estudiante.");
    }

    if (!milestones || milestones.length === 0) {
        throw new Error("Esta actividad no tiene pasos o hitos definidos para evaluar.");
    }

    // 1. Parsear URL del repositorio
    const repoInfo = githubService.parseGitHubUrl(repoUrl.trim());
    if (!repoInfo) {
        throw new Error("La URL del repositorio no tiene un formato válido de GitHub.");
    }

    const effectiveBranch = (branch && branch.trim()) ? branch.trim() : (repoInfo.branch !== "HEAD" ? repoInfo.branch : "main");
    const token = await getGithubToken(teacherId);

    // 2. Obtener historial de commits de la rama para auditar buenas prácticas de Git
    let repoCommits: Array<{ sha: string; message: string; author: string; date: string }> = [];
    try {
        const rawCommits = await githubService.getRepoCommits(
            repoInfo.owner,
            repoInfo.repo,
            effectiveBranch,
            token || undefined,
            15
        );
        repoCommits = (rawCommits || []).map(c => ({
            sha: (c.sha || "").slice(0, 7),
            message: (c.commit?.message || "").split("\n")[0].slice(0, 120),
            author: c.commit?.author?.name || "Estudiante",
            date: c.commit?.author?.date || ""
        }));
    } catch (commitErr) {
        console.warn("[workshopGithubGradingService] No se pudieron obtener commits:", commitErr);
    }

    // 3. Descargar archivos de cada paso desde GitHub o identificar pasos puramente instructivos
    const stepInspections: Array<{
        index: number;
        title: string;
        instructions: string;
        targetFilePath: string;
        expectedContent: string;
        validationRule: string;
        studentContent: string | null;
        fileFound: boolean;
        isInstructional: boolean;
        weight: number;
    }> = [];

    for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const cleanPath = (m.targetFilePath || "").replace(/^[/\\]+/, "").trim();
        const requiresFile = m.requiresFile !== undefined ? Boolean(m.requiresFile) : Boolean(cleanPath);
        const isInstructional = !requiresFile || !cleanPath;

        let studentContent: string | null = null;
        let fileFound = false;

        if (!isInstructional && cleanPath) {
            try {
                studentContent = await githubService.getFileContent(
                    repoInfo.owner,
                    repoInfo.repo,
                    cleanPath,
                    effectiveBranch,
                    token || undefined
                );
                fileFound = studentContent !== null;
            } catch (err) {
                console.warn(`[workshopGithubGradingService] Error leyendo '${cleanPath}':`, err);
                studentContent = null;
                fileFound = false;
            }
        }

        stepInspections.push({
            index: i,
            title: m.title || `Paso ${i + 1}`,
            instructions: m.instructions || "",
            targetFilePath: cleanPath,
            expectedContent: m.targetFileContent || "",
            validationRule: m.validationRule || "",
            studentContent,
            fileFound: isInstructional ? true : fileFound,
            isInstructional,
            weight: (m.weight && m.weight > 0) ? m.weight : 1
        });
    }

    // 4. Evaluar con IA cada paso y el flujo de Git mediante prompt estructurado
    const model = await getAIModel(teacherId);

    const stepsPayload = stepInspections.map(s => ({
        stepIndex: s.index,
        title: s.title,
        isInstructional: s.isInstructional,
        targetFilePath: s.isInstructional ? "N/A (Paso instructivo / sin archivo requerido)" : s.targetFilePath,
        fileFoundInRepo: s.fileFound,
        expectedInstructions: s.instructions.slice(0, 500),
        validationRule: s.validationRule || (s.isInstructional ? "Paso instructivo o conceptual. No requiere archivo propio en el repositorio." : undefined),
        hasExpectedContentReference: Boolean(s.expectedContent && s.expectedContent.trim()),
        studentContentSnippet: s.studentContent ? s.studentContent.slice(0, 10000) : null
    }));

    const EvaluationSchema = z.object({
        summary: z.string().describe("Resumen general del cumplimiento del estudiante en el tutorial"),
        steps: z.array(z.object({
            stepIndex: z.number(),
            status: z.enum(["COMPLETED", "PARTIAL", "MISSING"]).describe("COMPLETED si se cumple el paso; PARTIAL si está incompleto o con errores; MISSING si el archivo no existe en el repositorio (solo aplica a pasos que requieren archivo)."),
            score: z.number().min(0).max(5).describe("Calificación del paso de 0.0 a 5.0 (0.0 si es MISSING)"),
            feedback: z.string().describe("Observación pedagógica concisa sobre lo implementado en este paso")
        })),
        gitWorkflow: z.object({
            score: z.number().min(0).max(5).describe("Calificación del flujo de Git y disciplina de commits de 0.0 a 5.0"),
            status: z.enum(["EXCELLENT", "ACCEPTABLE", "NEEDS_IMPROVEMENT", "POOR"]).describe("Evaluación cualitativa de la disciplina de versionamiento"),
            feedback: z.string().describe("Retroalimentación sobre los mensajes de commit, frecuencia y buenas prácticas de Git"),
            commitSummary: z.string().describe("Breve síntesis de los commits encontrados y su progresión")
        }).describe("Auditoría pedagógica del historial de commits de Git"),
        recommendations: z.array(z.string()).describe("Lista de 2 a 3 recomendaciones constructivas para el estudiante")
    });

    const systemPrompt = `Eres un docente universitario y auditor senior de software evaluando un Tutorial Práctico GitHub ("${activityTitle}").
En este tipo de actividad, el estudiante debía seguir una guía paso a paso para construir un proyecto real en su repositorio de GitHub aplicando buenas prácticas de desarrollo y versionamiento Git.

Tu tarea es auditar tanto los archivos técnicos de cada paso como el historial de commits en Git:
1. Para pasos técnicos con archivo (isInstructional = false):
   - Comprueba si el archivo objetivo existe en el repositorio (fileFoundInRepo).
   - Si el archivo NO existe en el repo: status = "MISSING", score = 0.0, feedback = "El archivo objetivo no fue encontrado en la rama '${effectiveBranch}' del repositorio."
   - Si el archivo existe pero está vacío o le falta la mayor parte del código: status = "PARTIAL", score entre 1.0 y 3.0.
   - Si el archivo existe y contiene el código/lógica requerida para este paso: status = "COMPLETED", score entre 4.5 y 5.0.
2. Para pasos instructivos o de configuración (isInstructional = true):
   - Estos pasos NO requieren un archivo propio específico (ej. instalación de dependencias, comandos iniciales o lectura).
   - Si el estudiante tiene commits en el repo o los pasos con archivo fueron iniciados: evalúalo como status = "COMPLETED", score = 5.0, feedback = "Paso instructivo verificado dentro de la ejecución general del proyecto."
   - Solo califícalo como MISSING o 0.0 si el repositorio no tiene ningún commit ni actividad.
3. Audita el historial de commits en Git (gitWorkflow):
   - EXCELLENT (4.5 - 5.0): Commits progresivos, mensajes descriptivos/semánticos (ej: Conventional Commits tipo feat:, fix:, refactor:) alineados con cada etapa.
   - ACCEPTABLE (3.5 - 4.4): Varios commits con mensajes comprensibles aunque no perfectamente estandarizados.
   - NEEDS_IMPROVEMENT (2.0 - 3.4): Muy pocos commits (ej. 1 o 2 para todo el proyecto) o mensajes genéricos tipo "update", "subiendo archivos".
   - POOR (0.0 - 1.9): Un único commit masivo o historial vacío/descuidado.
4. Criterio de exigencia (${gradingMode.toUpperCase()}):
   - normal: Tolerante con variaciones de estilo si la funcionalidad está presente.
   - moderate: Equilibrio entre exactitud funcional y buenas prácticas de código y Git.
   - strict: Riguroso en completitud, arquitectura limpia y disciplina de versionamiento.`;

    const userPrompt = `Pasos a evaluar para el proyecto "${activityTitle}" en la rama "${effectiveBranch}":
${JSON.stringify(stepsPayload, null, 2)}

Historial de los últimos ${repoCommits.length} commits en la rama "${effectiveBranch}":
${JSON.stringify(repoCommits, null, 2)}`;

    let aiEvaluation;
    try {
        const { object } = await generateObject({
            model,
            schema: EvaluationSchema,
            schemaName: "WorkshopGithubEvaluation",
            schemaDescription: "Auditoría estructurada del repositorio GitHub frente a los pasos y commits del tutorial",
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2
        });
        aiEvaluation = object;
    } catch (e: any) {
        console.warn("[workshopGithubGradingService] Fallback a evaluación matemática y textual:", e);
        const fallbackGitScore = repoCommits.length >= 3 ? 4.5 : repoCommits.length >= 1 ? 3.0 : 1.0;
        aiEvaluation = {
            summary: "Auditoría automatizada de los pasos del tutorial en GitHub.",
            steps: stepInspections.map(s => {
                if (s.isInstructional) {
                    const hasActivity = repoCommits.length > 0 || stepInspections.some(o => !o.isInstructional && o.fileFound);
                    return {
                        stepIndex: s.index,
                        status: hasActivity ? ("COMPLETED" as const) : ("MISSING" as const),
                        score: hasActivity ? 5.0 : 0.0,
                        feedback: hasActivity
                            ? "Paso instructivo/metodológico verificado dentro del flujo del proyecto."
                            : "No se evidenció actividad en el repositorio para validar este paso instructivo."
                    };
                }
                return {
                    stepIndex: s.index,
                    status: s.fileFound 
                        ? ((s.studentContent?.trim().length || 0) > 20 ? ("COMPLETED" as const) : ("PARTIAL" as const)) 
                        : ("MISSING" as const),
                    score: s.fileFound ? ((s.studentContent?.trim().length || 0) > 20 ? 5.0 : 2.5) : 0.0,
                    feedback: s.fileFound
                        ? `Archivo '${s.targetFilePath}' verificado en el repositorio.`
                        : `El archivo '${s.targetFilePath}' no fue encontrado en la rama '${effectiveBranch}'.`
                };
            }),
            gitWorkflow: {
                score: fallbackGitScore,
                status: fallbackGitScore >= 4.0 ? ("EXCELLENT" as const) : ("ACCEPTABLE" as const),
                feedback: `Se detectaron ${repoCommits.length} commits en el historial de la rama '${effectiveBranch}'.`,
                commitSummary: `${repoCommits.length} commits registrados en el historial.`
            },
            recommendations: [
                "Asegúrate de ejecutar 'git push' tras realizar cada commit en tu proyecto local.",
                "Utiliza mensajes de commit descriptivos (ej. feat:, fix:, docs:) para reflejar el progreso de cada paso.",
                "Verifica que la estructura de carpetas y los nombres de archivos coincidan exactamente con la consigna."
            ]
        };
    }

    // 5. Consolidar resultados de cada paso
    const stepEvaluations: StepAuditEvaluation[] = stepInspections.map(s => {
        const evalData = aiEvaluation.steps.find(aiS => aiS.stepIndex === s.index);
        const defaultStatus = s.isInstructional ? "COMPLETED" : (s.fileFound ? "COMPLETED" : "MISSING");
        const defaultScore = s.isInstructional ? 5.0 : (s.fileFound ? 5.0 : 0.0);
        const status = evalData?.status || defaultStatus;
        const rawScore = evalData?.score !== undefined ? evalData.score : defaultScore;
        const score = Math.max(0, Math.min(5, Math.round(rawScore * 10) / 10));
        return {
            stepIndex: s.index,
            title: s.title,
            targetFilePath: s.targetFilePath,
            fileFound: s.fileFound,
            isInstructional: s.isInstructional,
            status,
            score,
            feedback: evalData?.feedback || (s.isInstructional ? "Paso instructivo validado." : (s.fileFound ? "Archivo verificado correctamente." : "Archivo no encontrado."))
        };
    });

    const completedSteps = stepEvaluations.filter(s => s.status === "COMPLETED").length;
    const partialSteps = stepEvaluations.filter(s => s.status === "PARTIAL").length;
    const missingSteps = stepEvaluations.filter(s => s.status === "MISSING").length;
    const totalSteps = stepEvaluations.length;

    // Cálculo ponderado de la nota de pasos
    let totalWeight = 0;
    let weightedStepScores = 0;
    stepEvaluations.forEach((s, i) => {
        const w = stepInspections[i]?.weight || 1;
        totalWeight += w;
        weightedStepScores += s.score * w;
    });

    const stepsAverage = totalWeight > 0 ? (weightedStepScores / totalWeight) : 0;
    const gitWorkflowScore = aiEvaluation.gitWorkflow?.score ?? 5.0;

    // Ponderación dinámica según enunciado (por defecto 70% pasos técnicos + 30% buenas prácticas Git)
    const { stepsWeight, gitWeight } = parseRubricWeights(statement);
    const stepsPct = Math.round(stepsWeight * 100);
    const gitPct = Math.round(gitWeight * 100);

    const rawFinalGrade = (stepsAverage * stepsWeight) + (gitWorkflowScore * gitWeight);
    const computedGrade = totalSteps > 0
        ? Math.min(5.0, Math.max(0.0, Math.round(rawFinalGrade * 10) / 10))
        : 0.0;

    // 6. Construir retroalimentación completa en Markdown para el estudiante
    const percentCompletion = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let markdownFeedback = `## 📋 Informe de Auditoría y Evaluación — Tutorial GitHub\n\n`;
    markdownFeedback += `**Actividad:** ${activityTitle}\n`;
    markdownFeedback += `**Repositorio:** [${repoInfo.owner}/${repoInfo.repo}](${repoUrl}) (Rama: \`${effectiveBranch}\`)\n`;
    markdownFeedback += `**Progreso de Pasos:** ${completedSteps} de ${totalSteps} completados (${percentCompletion}%)\n\n`;

    markdownFeedback += `> **Resumen Docente:** ${aiEvaluation.summary}\n\n`;

    markdownFeedback += `### 📊 Tabla de Cumplimiento Paso a Paso (${stepsPct}% de la Nota)\n\n`;
    markdownFeedback += `| # | Paso | Archivo Objetivo | Estado | Nota / 5.0 | Observaciones |\n`;
    markdownFeedback += `|---|------|------------------|:------:|:----------:|---------------|\n`;

    stepEvaluations.forEach(s => {
        const statusBadge = s.status === "COMPLETED" 
            ? "✅ Cumplido" 
            : s.status === "PARTIAL" 
            ? "⚠️ Parcial" 
            : "❌ No entregado";
        const fileLink = s.isInstructional
            ? `*(Paso instructivo)*`
            : s.fileFound
            ? `[\`${s.targetFilePath}\`](https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${effectiveBranch}/${s.targetFilePath})`
            : `\`${s.targetFilePath || "N/A"}\``;
        markdownFeedback += `| **${s.stepIndex + 1}** | ${s.title} | ${fileLink} | ${statusBadge} | **${s.score.toFixed(1)}** | ${s.feedback.replace(/\|/g, "/")} |\n`;
    });

    markdownFeedback += `\n*Promedio Técnico de Pasos:* **${stepsAverage.toFixed(1)} / 5.0**\n\n`;

    // Sección de Auditoría de Historial Git
    const gitBadge = aiEvaluation.gitWorkflow?.status === "EXCELLENT"
        ? "🌟 Excelente"
        : aiEvaluation.gitWorkflow?.status === "ACCEPTABLE"
        ? "✅ Aceptable"
        : aiEvaluation.gitWorkflow?.status === "NEEDS_IMPROVEMENT"
        ? "⚠️ Requiere Mejora"
        : "❌ Deficiente";

    markdownFeedback += `### 🌿 Auditoría de Versionamiento Git (${gitPct}% de la Nota)\n\n`;
    markdownFeedback += `- **Disciplina de Commits:** ${gitBadge} (**${gitWorkflowScore.toFixed(1)} / 5.0**)\n`;
    markdownFeedback += `- **Commits Detectados:** ${repoCommits.length} en la rama \`${effectiveBranch}\`\n`;
    if (aiEvaluation.gitWorkflow?.feedback) {
        markdownFeedback += `- **Observación:** ${aiEvaluation.gitWorkflow.feedback}\n\n`;
    }

    if (repoCommits.length > 0) {
        markdownFeedback += `| Hash | Mensaje de Commit | Autor | Fecha |\n`;
        markdownFeedback += `|:----:|-------------------|-------|:-----:|\n`;
        repoCommits.slice(0, 8).forEach(c => {
            const shortDate = c.date ? c.date.split("T")[0] : "-";
            markdownFeedback += `| \`${c.sha}\` | ${c.message.replace(/\|/g, "/")} | ${c.author} | ${shortDate} |\n`;
        });
        markdownFeedback += `\n`;
    }

    markdownFeedback += `\n---\n`;
    markdownFeedback += `### 🎯 Calificación Final Ponderada\n\n`;
    markdownFeedback += `**Nota Final:** **${computedGrade.toFixed(1)} / 5.0**\n`;
    markdownFeedback += `*(${stepsPct}% Pasos Técnicos [${stepsAverage.toFixed(1)}] + ${gitPct}% Flujo Git [${gitWorkflowScore.toFixed(1)}])*\n\n`;

    markdownFeedback += `### 🔍 Detalle Analítico por Paso\n\n`;
    stepEvaluations.forEach(s => {
        const icon = s.status === "COMPLETED" ? "✅" : s.status === "PARTIAL" ? "⚠️" : "❌";
        const fileDesc = s.isInstructional 
            ? "Paso instructivo / sin archivo propio requerido" 
            : `\`${s.targetFilePath}\` (${s.fileFound ? "Encontrado en repo" : "No encontrado"})`;
        markdownFeedback += `#### ${icon} Paso ${s.stepIndex + 1}: ${s.title}\n`;
        markdownFeedback += `- **Archivo:** ${fileDesc}\n`;
        markdownFeedback += `- **Puntaje del paso:** **${s.score.toFixed(1)} / 5.0**\n`;
        markdownFeedback += `- **Evaluación:** ${s.feedback}\n\n`;
    });

    if (aiEvaluation.recommendations && aiEvaluation.recommendations.length > 0) {
        markdownFeedback += `### 💡 Recomendaciones para Mejorar tu Repositorio\n`;
        aiEvaluation.recommendations.forEach(r => {
            markdownFeedback += `- ${r}\n`;
        });
        markdownFeedback += `\n`;
    }

    markdownFeedback = repairFeedbackText(markdownFeedback);

    return {
        grade: computedGrade,
        rawAiGrade: computedGrade,
        feedback: markdownFeedback,
        stepEvaluations,
        gitWorkflow: {
            score: gitWorkflowScore,
            status: aiEvaluation.gitWorkflow?.status || "ACCEPTABLE",
            feedback: aiEvaluation.gitWorkflow?.feedback || "",
            totalCommitsFound: repoCommits.length,
            commitSummary: aiEvaluation.gitWorkflow?.commitSummary || `${repoCommits.length} commits`
        },
        totalSteps,
        completedSteps,
        partialSteps,
        missingSteps,
        summary: aiEvaluation.summary
    };
}
