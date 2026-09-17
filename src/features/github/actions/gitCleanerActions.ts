"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { gitCleanerService, CleanerRepoItem, CleanerUserProfile, DeleteRepoResult } from "../services/gitCleanerService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

/**
 * Valida un token de GitHub para la herramienta de limpieza.
 * Verifica identidad del usuario y permiso delete_repo.
 */
export async function validateCleanerTokenAction(token: string): Promise<{
    success: boolean;
    user?: CleanerUserProfile;
    hasDeleteScope: boolean;
    scopes: string[];
    isFineGrained: boolean;
    error?: string;
}> {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await gitCleanerService.validateCleanerToken(token);
}

/**
 * Obtiene todos los repositorios pertenecientes a la cuenta autenticada con el token.
 */
export async function fetchUserReposForCleanerAction(token: string): Promise<{
    success: boolean;
    repos: CleanerRepoItem[];
    totalCount: number;
    error?: string;
}> {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await gitCleanerService.fetchUserRepositories(token);
}

/**
 * Elimina de forma permanente una lista seleccionada de repositorios.
 */
export async function deleteSelectedReposAction(
    repos: Array<{ owner: string; repo: string }>,
    token: string
): Promise<{
    success: boolean;
    total: number;
    deletedCount: number;
    failedCount: number;
    results: DeleteRepoResult[];
    error?: string;
}> {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    if (!repos || repos.length === 0) {
        return {
            success: false,
            total: 0,
            deletedCount: 0,
            failedCount: 0,
            results: [],
            error: "No se seleccionó ningún repositorio para eliminar.",
        };
    }

    const res = await gitCleanerService.deleteBatchRepositories(repos, token);

    return {
        success: res.failedCount === 0,
        total: res.total,
        deletedCount: res.deletedCount,
        failedCount: res.failedCount,
        results: res.results,
    };
}
