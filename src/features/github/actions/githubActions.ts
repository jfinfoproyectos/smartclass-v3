"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function scanRepositoryAction(repoUrl: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");
    
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("URL de GitHub inválida");

    const token = await getGithubToken(session.user.id);
    const files = await githubService.getRepoStructure(repoInfo.owner, repoInfo.repo, token || undefined);

    let warning;
    if (!token) {
        warning = "Aviso: No tienes configurado tu Token de GitHub en tu perfil. Estás expuesto a posibles límites de tasa de la API.";
    }

    return { files, warning };
}


export async function fetchRepoFilesAction(repoUrl: string, filePaths: string, activityId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "student" && session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("Invalid GitHub URL");

    let teacherId = session.user.id;

    if (activityId) {
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: { course: true }
        });
        if (activity) {
            teacherId = activity.course.teacherId;
        }
    }

    const token = await getGithubToken(teacherId);

    const paths = (filePaths || "").split(',').map((p: string) => p.trim());
    const validFiles = [];
    const missingFiles = [];

    for (const path of paths) {
        if (!path) continue;
        const content = await githubService.getFileContent(repoInfo.owner, repoInfo.repo, path, repoInfo.branch, token || undefined);
        if (content) {
            validFiles.push({ path, content });
        } else {
            missingFiles.push(path);
        }
    }

    let warning;
    if (!token) {
        warning = session.user.role === "student"
            ? "Aviso: Tu profesor no ha configurado su Token de GitHub. Podrían ocurrir fallos por límite de peticiones."
            : "Aviso: No tienes configurado tu Token de GitHub en tu perfil. Estás expuesto a posibles límites de tasa.";
    }

    return { validFiles, missingFiles, warning };
}

export async function getGitHubSubmissionDetailsAction(repoUrl: string, filePaths: string, activityId?: string) {
    // This is essentially a wrapper for fetchRepoFilesAction but with a slightly different return structure or intended use
    // We'll implement it to match ActivityDetail's expectation
    const result = await fetchRepoFilesAction(repoUrl, filePaths, activityId);
    const { githubService } = await import("../services/githubService");
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    
    return {
        ...result,
        repoInfo
    };
}

export async function getRepoStructureAction(repoUrl: string, teacherId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "student" && session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");
    
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("URL de GitHub inválida");

    const token = await getGithubToken(teacherId || session.user.id);
    const files = await githubService.getRepoStructure(repoInfo.owner, repoInfo.repo, token || undefined);

    let warning;
    if (!token) {
        warning = "Aviso: No se configuró el Token de GitHub. Estás expuesto a límites de tasa.";
    }

    return files;
}
