"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getGithubToken } from "@/lib/githubTokenHelper";
import { githubService } from "../services/githubService";
import { 
    gitDocsService, 
    RepoAnalysisResult, 
    DocsGenerationOptions, 
    GeneratedDocsResult 
} from "../services/gitDocsService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

/**
 * Analiza la arquitectura técnica, árbol de archivos y manifiestos de un repositorio
 */
export async function analyzeRepoForDocsAction(
    repoUrl: string,
    branch?: string,
    customToken?: string
): Promise<{
    analysis: RepoAnalysisResult;
    availableBranches: string[];
    defaultBranch: string;
}> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida. Por favor inicia sesión.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) {
        throw new Error("URL de GitHub no válida. Asegúrate de incluir el formato: https://github.com/usuario/repositorio");
    }

    // Solo usar token si el usuario proporcionó uno temporal explícito
    const token = customToken?.trim() || undefined;

    // Obtener ramas disponibles
    const { branches, defaultBranch } = await githubService.getRepoBranches(
        repoInfo.owner, 
        repoInfo.repo, 
        token
    );

    const targetBranch = branch && branch.trim() ? branch.trim() : (repoInfo.branch !== "HEAD" ? repoInfo.branch : defaultBranch);

    // Ejecutar análisis estructural y de manifiestos
    const analysis = await gitDocsService.analyzeRepo(
        repoInfo.owner,
        repoInfo.repo,
        targetBranch,
        token
    );

    return {
        analysis,
        availableBranches: branches,
        defaultBranch
    };
}

/**
 * Obtiene la cuenta Git activa configurada en la computadora local
 */
export async function getLocalComputerGitAccountAction(): Promise<{
    hasLocalAccount: boolean;
    name: string | null;
    email: string | null;
    label: string;
}> {
    return await gitDocsService.getLocalGitAccount();
}

/**
 * Genera el paquete de documentación (README, Licencia, .gitignore, .env.example, etc.) con IA
 */
export async function generateRepoDocsAction(
    analysis: RepoAnalysisResult,
    options: DocsGenerationOptions
): Promise<GeneratedDocsResult> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    return await gitDocsService.generateDocsWithAi(analysis, options, session.user.id);
}

/**
 * Server action para subir/confirmar archivos directamente a un repositorio de GitHub
 * Por defecto utiliza la cuenta activa en la computadora (Git local / Credential Manager)
 * sin usar el token almacenado en la base de datos de la aplicación.
 */
export async function pushDocsToRepoAction(params: {
    repoUrl: string;
    targetBranch: string;
    files: Array<{ path: string; content: string }>;
    commitMessage: string;
    mode: "direct" | "pull_request";
    newBranchName?: string;
    prTitle?: string;
    prBody?: string;
    customToken?: string;
}): Promise<{
    success: boolean;
    commitSha: string;
    commitUrl?: string;
    branch: string;
    mode: "direct" | "pull_request";
    prUrl?: string;
    prNumber?: number;
    message: string;
}> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    const repoInfo = githubService.parseGitHubUrl(params.repoUrl);
    if (!repoInfo) {
        throw new Error("URL de repositorio no válida.");
    }

    // 1. Si el usuario ingresó explícitamente un token temporal, usar la API de GitHub
    if (params.customToken && params.customToken.trim()) {
        return await gitDocsService.pushDocsToRepository({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            targetBranch: params.targetBranch,
            files: params.files,
            commitMessage: params.commitMessage,
            mode: params.mode,
            newBranchName: params.newBranchName,
            prTitle: params.prTitle,
            prBody: params.prBody,
            token: params.customToken.trim()
        });
    }

    // 2. Por defecto: Subir cambios con la cuenta activa de la computadora (Git local)
    return await gitDocsService.pushDocsWithLocalGit({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        targetBranch: params.targetBranch,
        files: params.files,
        commitMessage: params.commitMessage,
        mode: params.mode,
        newBranchName: params.newBranchName,
        prTitle: params.prTitle,
        prBody: params.prBody
    });
}

