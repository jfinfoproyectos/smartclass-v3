import { getAIModel } from "@/features/teacher/services/ai/client";
import { githubService } from "@/features/github/services/githubService";
import { getGithubToken } from "@/lib/githubTokenHelper";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

export interface McpChatMessage {
    role: "user" | "assistant";
    content: string;
}

export async function askGitHubMcpQuestion(params: {
    repoUrl: string;
    question: string;
    userId: string;
    chatHistory?: McpChatMessage[];
    branch?: string;
    customToken?: string;
}) {
    const { repoUrl, question, userId, chatHistory = [], branch, customToken } = params;

    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) {
        throw new Error("URL de GitHub inválida");
    }

    if (branch && branch.trim()) {
        repoInfo.branch = branch.trim();
    }

    const token = customToken || (await getGithubToken(userId)) || undefined;
    const model = await getAIModel(userId);

    // Definición de Herramientas Estándar del GitHub MCP Server (AI SDK v6)
    const mcpTools = {
        get_file_contents: tool({
            description: "Obtiene el contenido completo de un archivo específico dentro del repositorio de GitHub.",
            inputSchema: z.object({
                path: z.string().describe("Ruta del archivo dentro del repositorio (ej. src/index.ts)"),
            }),
            execute: async ({ path }) => {
                const content = await githubService.getFileContent(
                    repoInfo.owner,
                    repoInfo.repo,
                    path,
                    repoInfo.branch,
                    token
                );
                if (content === null) {
                    return { error: `No se pudo encontrar o leer el archivo '${path}'.` };
                }
                return { path, content };
            },
        }),

        list_directory_structure: tool({
            description: "Obtiene la lista completa de archivos y carpetas del repositorio entregado.",
            inputSchema: z.object({}),
            execute: async () => {
                const files = await githubService.getRepoStructure(
                    repoInfo.owner,
                    repoInfo.repo,
                    repoInfo.branch,
                    token
                );
                return { totalFiles: files.length, files };
            },
        }),

        list_commits: tool({
            description: "Obtiene el historial de commits recientes del repositorio de GitHub con sus hashes, autores, fechas y mensajes.",
            inputSchema: z.object({
                limit: z.number().optional().describe("Número máximo de commits a retornar (máximo 30)"),
            }),
            execute: async ({ limit }) => {
                try {
                    const limitVal = limit || 15;
                    const branchQuery = repoInfo.branch && repoInfo.branch !== "HEAD" ? `&sha=${encodeURIComponent(repoInfo.branch)}` : "";
                    const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?per_page=${Math.min(limitVal, 30)}${branchQuery}`;
                    const headers: HeadersInit = {
                        Accept: "application/vnd.github.v3+json",
                    };
                    if (token) {
                        headers.Authorization = `Bearer ${token}`;
                    }

                    const res = await fetch(url, { headers });
                    if (!res.ok) {
                        return { error: `HTTP ${res.status}: ${res.statusText}` };
                    }
                    const data = await res.json();
                    if (!Array.isArray(data)) return { commits: [] };

                    const commits = data.map((c: any) => ({
                        sha: c.sha?.substring(0, 7),
                        authorName: c.commit?.author?.name || c.author?.login || "Desconocido",
                        authorEmail: c.commit?.author?.email || "",
                        date: c.commit?.author?.date,
                        message: c.commit?.message?.split("\n")[0],
                    }));

                    return { count: commits.length, commits };
                } catch (err: any) {
                    return { error: `Error obteniendo commits: ${err.message}` };
                }
            },
        }),

        get_commit_details: tool({
            description: "Obtiene los detalles específicos de un commit (archivos modificados, líneas agregadas/eliminadas).",
            inputSchema: z.object({
                commitSha: z.string().describe("El SHA o hash del commit a revisar"),
            }),
            execute: async ({ commitSha }) => {
                try {
                    const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits/${commitSha}`;
                    const headers: HeadersInit = {
                        Accept: "application/vnd.github.v3+json",
                    };
                    if (token) {
                        headers.Authorization = `Bearer ${token}`;
                    }

                    const res = await fetch(url, { headers });
                    if (!res.ok) {
                        return { error: `HTTP ${res.status}: ${res.statusText}` };
                    }
                    const data = await res.json();

                    return {
                        sha: data.sha,
                        author: data.commit?.author?.name,
                        message: data.commit?.message,
                        stats: data.stats,
                        files: (data.files || []).map((f: any) => ({
                            filename: f.filename,
                            status: f.status,
                            additions: f.additions,
                            deletions: f.deletions,
                            patch: f.patch?.substring(0, 500),
                        })),
                    };
                } catch (err: any) {
                    return { error: `Error al obtener detalles del commit: ${err.message}` };
                }
            },
        }),

        search_code: tool({
            description: "Busca una palabra clave, función o patrón dentro de los nombres y rutas de archivos del repositorio.",
            inputSchema: z.object({
                query: z.string().describe("Término o patrón a buscar"),
            }),
            execute: async ({ query }) => {
                try {
                    const files = await githubService.getRepoStructure(
                        repoInfo.owner,
                        repoInfo.repo,
                        repoInfo.branch,
                        token
                    );
                    const matchingFiles: string[] = [];

                    const lowercaseQuery = query.toLowerCase();
                    for (const f of files) {
                        if (f.toLowerCase().includes(lowercaseQuery)) {
                            matchingFiles.push(f);
                        }
                    }

                    return {
                        query,
                        matchingFilePaths: matchingFiles,
                        totalMatches: matchingFiles.length,
                    };
                } catch (err: any) {
                    return { error: `Error buscando código: ${err.message}` };
                }
            },
        }),
    };

    const systemPrompt = `
    Actúa como un **Asistente de Inspección y Análisis Técnico de Repositorios** utilizando el Model Context Protocol (MCP) de GitHub.
    Tu objetivo es ayudar al usuario/docente a auditar, inspeccionar, comprender y analizar a fondo el siguiente repositorio de GitHub:
    
    **REPOSITORIO**: ${repoUrl} (Propietario: ${repoInfo.owner}, Repo: ${repoInfo.repo}, Rama de consulta: ${repoInfo.branch})

    **REGLAS Y ALCANCE**:
    1. Utiliza de manera autónoma las herramientas MCP provistas (\`list_directory_structure\`, \`get_file_contents\`, \`list_commits\`, \`get_commit_details\`, \`search_code\`) para fundamentar todas tus respuestas con evidencia concreta del repositorio real.
    2. Si se consulta por el historial de commits, autoría, mensajes o frecuencia de cambios, DEBES usar la herramienta \`list_commits\` y \`get_commit_details\` para obtener los commits reales, hashes, autores y fechas.
    3. Si se consulta por estructura, dependencias, configuración o arquitectura, consulta \`list_directory_structure\` y lee los archivos clave como package.json, requirements.txt, tsconfig, etc. con \`get_file_contents\`.
    4. Si se consulta por seguridad o buenas prácticas, busca archivos sensibles (.env), tokens expuestos o malas prácticas de credenciales.
    5. Tras invocar las herramientas necesarias, SIEMPRE redacta una respuesta clara, profesional y estructurada en Markdown (con encabezados, listas, citas de código y tablas cuando sea oportuno).
    `;

    const messages = chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));

    messages.push({
        role: "user",
        content: question,
    });

    const result = await generateText({
        model,
        system: systemPrompt,
        messages,
        tools: mcpTools,
        stopWhen: stepCountIs(6), // Permite continuar hasta 6 pasos (Tool calls + síntesis final en texto)
    });

    const toolCallsCount = result.steps?.flatMap((s) => s.toolCalls || []).length || 0;
    const answer = result.text?.trim() || "Se procesó la consulta con las herramientas MCP pero no se pudo generar el texto final. Intenta realizar la pregunta nuevamente.";

    return {
        answer,
        toolCallsCount,
    };
}
