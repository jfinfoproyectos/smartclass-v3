"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { githubService } from "@/features/github/services/githubService";
import { getGithubToken } from "@/lib/githubTokenHelper";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export interface VerifyWorkshopGithubStepParams {
    activityId: string;
    repoUrl: string;
    branch?: string;
    stepIndex: number;
    milestone: {
        id?: string;
        title?: string;
        targetFilePath?: string;
        targetFileContent?: string;
        validationRule?: string;
        gitCommands?: Array<{ command: string; explanation: string }>;
    };
}

export interface VerifyStepResult {
    success: boolean;
    message: string;
    details?: {
        checkedFile?: string;
        checkedBranch?: string;
        fileFound?: boolean;
        contentMatched?: boolean;
        repoOwner?: string;
        repoName?: string;
        hint?: string;
    };
}

/**
 * Verifica en tiempo real si el estudiante cumplió con los requerimientos del paso en su repositorio GitHub:
 * 1. Valida y analiza la URL del repositorio
 * 2. Comprueba existencia del repositorio y rama de trabajo
 * 3. Comprueba si el archivo objetivo existe en el repositorio (en la rama especificada)
 * 4. Opcionalmente verifica que contenga contenido esencial o no esté vacío
 */
export async function verifyWorkshopGithubStepAction(
    params: VerifyWorkshopGithubStepParams
): Promise<VerifyStepResult> {
    try {
        const session = await getSession();
        if (!session || (session.user.role !== "student" && session.user.role !== "teacher" && session.user.role !== "admin")) {
            return {
                success: false,
                message: "No tienes una sesión activa autorizada para realizar esta verificación."
            };
        }

        const { activityId, repoUrl, branch = "main", stepIndex, milestone } = params;

        if (!repoUrl || !repoUrl.trim()) {
            return {
                success: false,
                message: "Por favor ingresa la URL de tu repositorio GitHub antes de verificar."
            };
        }

        // 1. Parsear URL del repositorio
        const repoInfo = githubService.parseGitHubUrl(repoUrl.trim());
        if (!repoInfo) {
            return {
                success: false,
                message: "La URL del repositorio no tiene un formato válido de GitHub (ejemplo: https://github.com/usuario/mi-proyecto)."
            };
        }

        const effectiveBranch = (branch && branch.trim()) ? branch.trim() : (repoInfo.branch !== "HEAD" ? repoInfo.branch : "main");

        // 2. Obtener Token de GitHub si existe (profesor o entorno)
        let teacherId = session.user.id;
        if (activityId) {
            const activity = await prisma.activity.findUnique({
                where: { id: activityId },
                include: { course: true }
            });
            if (activity?.course?.teacherId) {
                teacherId = activity.course.teacherId;
            }
        }

        const token = await getGithubToken(teacherId);

        // 3. Comprobar si el repositorio es accesible y obtener ramas
        const branchesInfo = await githubService.getRepoBranches(repoInfo.owner, repoInfo.repo, token || undefined);
        const branchExists = branchesInfo.branches.some(
            b => b.toLowerCase() === effectiveBranch.toLowerCase()
        );

        if (!branchExists && branchesInfo.branches.length > 0) {
            const availableBranches = branchesInfo.branches.slice(0, 5).join(", ");
            return {
                success: false,
                message: `No se encontró la rama '${effectiveBranch}' en el repositorio '${repoInfo.owner}/${repoInfo.repo}'.`,
                details: {
                    checkedBranch: effectiveBranch,
                    repoOwner: repoInfo.owner,
                    repoName: repoInfo.repo,
                    hint: `Ramas disponibles encontradas: ${availableBranches}. Verifica el nombre de tu rama o realiza 'git push origin ${effectiveBranch}'.`
                }
            };
        }

        // 4. Determinar archivo objetivo a verificar
        let targetPath = milestone.targetFilePath?.trim() || "";

        // Si no tiene targetFilePath explícito, intentar inferir del título o instrucciones
        if (!targetPath) {
            const matchFile = milestone.title?.match(/[\w\-./]+\.[a-zA-Z0-9]+/);
            if (matchFile) {
                targetPath = matchFile[0];
            }
        }

        // Si hay un archivo objetivo definido
        if (targetPath) {
            // Normalizar ruta: quitar barras iniciales
            const cleanPath = targetPath.replace(/^[/\\]+/, "");

            const fileContent = await githubService.getFileContent(
                repoInfo.owner,
                repoInfo.repo,
                cleanPath,
                effectiveBranch,
                token || undefined
            );

            if (fileContent === null) {
                // El archivo no fue encontrado en la rama
                // Intentar buscar en la estructura general para dar feedback inteligente
                let hint = `Asegúrate de haber guardado el archivo en '${cleanPath}', realizado el commit y ejecutado 'git push origin ${effectiveBranch}'.`;
                
                try {
                    const structure = await githubService.getRepoStructure(
                        repoInfo.owner,
                        repoInfo.repo,
                        effectiveBranch,
                        token || undefined
                    );
                    
                    const fileNameOnly = cleanPath.split("/").pop()?.toLowerCase();
                    const similar = structure.find(f => f.toLowerCase().endsWith(fileNameOnly || ""));
                    if (similar) {
                        hint = `Encontramos '${similar}' en tu repositorio, pero se esperaba exactamente '${cleanPath}'. Revisa la ubicación de las carpetas.`;
                    }
                } catch {
                    // ignorar
                }

                return {
                    success: false,
                    message: `No se encontró el archivo '${cleanPath}' en la rama '${effectiveBranch}' de tu repositorio.`,
                    details: {
                        checkedFile: cleanPath,
                        checkedBranch: effectiveBranch,
                        fileFound: false,
                        repoOwner: repoInfo.owner,
                        repoName: repoInfo.repo,
                        hint
                    }
                };
            }

            // El archivo sí existe. Verificar si hay validaciones de contenido
            if (fileContent.trim().length === 0) {
                return {
                    success: false,
                    message: `El archivo '${cleanPath}' fue encontrado en la rama '${effectiveBranch}', pero está vacío.`,
                    details: {
                        checkedFile: cleanPath,
                        checkedBranch: effectiveBranch,
                        fileFound: true,
                        contentMatched: false,
                        hint: "Agrega el contenido solicitado en las instrucciones del paso, haz commit y 'git push'."
                    }
                };
            }

            // Si hay reglas de validación de palabras clave
            if (milestone.validationRule && milestone.validationRule.trim()) {
                const rule = milestone.validationRule.toLowerCase();
                // Si la regla indica palabras requeridas (ej: "debe contener palabra1, palabra2")
                const keywordsMatch = milestone.validationRule.match(/contener\s*[:\-]?\s*(.+)/i);
                if (keywordsMatch && keywordsMatch[1]) {
                    const keywords = keywordsMatch[1].split(/[,;]+/).map(k => k.trim().toLowerCase()).filter(Boolean);
                    const lowerContent = fileContent.toLowerCase();
                    const missingKeywords = keywords.filter(k => !lowerContent.includes(k));
                    
                    if (missingKeywords.length > 0) {
                        return {
                            success: false,
                            message: `El archivo '${cleanPath}' existe, pero le falta incluir elementos clave requeridos.`,
                            details: {
                                checkedFile: cleanPath,
                                checkedBranch: effectiveBranch,
                                fileFound: true,
                                contentMatched: false,
                                hint: `Se requiere que contenga: ${missingKeywords.join(", ")}.`
                            }
                        };
                    }
                }
            }

            return {
                success: true,
                message: `¡Paso ${stepIndex + 1} verificado con éxito! El archivo '${cleanPath}' fue validado en la rama '${effectiveBranch}'.`,
                details: {
                    checkedFile: cleanPath,
                    checkedBranch: effectiveBranch,
                    fileFound: true,
                    contentMatched: true,
                    repoOwner: repoInfo.owner,
                    repoName: repoInfo.repo
                }
            };
        }

        // Si el paso no exige un archivo específico (ej: paso de inicialización de repo o creación de rama)
        const commits = await githubService.getRepoCommits(
            repoInfo.owner,
            repoInfo.repo,
            effectiveBranch,
            token || undefined,
            1
        );

        if (!commits || commits.length === 0) {
            return {
                success: false,
                message: `No se encontraron commits en la rama '${effectiveBranch}'.`,
                details: {
                    checkedBranch: effectiveBranch,
                    repoOwner: repoInfo.owner,
                    repoName: repoInfo.repo,
                    hint: `Realiza tu primer commit y súbelo con 'git push -u origin ${effectiveBranch}'.`
                }
            };
        }

        return {
            success: true,
            message: `¡Paso ${stepIndex + 1} verificado con éxito! Conexión y commits confirmados en la rama '${effectiveBranch}'.`,
            details: {
                checkedBranch: effectiveBranch,
                repoOwner: repoInfo.owner,
                repoName: repoInfo.repo
            }
        };

    } catch (error: any) {
        console.error("[verifyWorkshopGithubStepAction] Error al verificar paso:", error);
        return {
            success: false,
            message: `Ocurrió un error al verificar en GitHub: ${error.message || "Error de conexión con la API de GitHub."}`,
            details: {
                hint: "Asegúrate de que el repositorio sea público o de que tu token de GitHub esté configurado correctamente."
            }
        };
    }
}
