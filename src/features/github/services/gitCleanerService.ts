/**
 * Servicio para gestión y eliminación masiva de repositorios en GitHub.
 * Utiliza la API REST de GitHub v3 con autenticación por Personal Access Token (PAT).
 */

export interface CleanerUserProfile {
    login: string;
    id: number;
    name: string | null;
    avatar_url: string;
    html_url: string;
    public_repos: number;
    total_private_repos?: number;
    owned_private_repos?: number;
}

export interface CleanerRepoItem {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number; // en KB
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
    default_branch: string;
    archived: boolean;
}

export interface DeleteRepoResult {
    fullName: string;
    owner: string;
    repo: string;
    success: boolean;
    status: number;
    error?: string;
}

export const gitCleanerService = {
    /**
     * Valida el token de GitHub, verifica la identidad del usuario y comprueba si posee el scope delete_repo.
     */
    async validateCleanerToken(token: string): Promise<{
        success: boolean;
        user?: CleanerUserProfile;
        hasDeleteScope: boolean;
        scopes: string[];
        isFineGrained: boolean;
        error?: string;
    }> {
        const cleanToken = token.trim();
        if (!cleanToken) {
            return {
                success: false,
                hasDeleteScope: false,
                scopes: [],
                isFineGrained: false,
                error: "Por favor ingresa un token de acceso personal de GitHub.",
            };
        }

        try {
            const res = await fetch("https://api.github.com/user", {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    Authorization: `Bearer ${cleanToken}`,
                    "User-Agent": "SmartClass-Repo-Cleaner",
                },
                cache: "no-store",
            });

            if (res.status === 401) {
                return {
                    success: false,
                    hasDeleteScope: false,
                    scopes: [],
                    isFineGrained: false,
                    error: "Token de GitHub no válido o expirado. Verifica que no contenga espacios ni caracteres extraños.",
                };
            }

            if (!res.ok) {
                return {
                    success: false,
                    hasDeleteScope: false,
                    scopes: [],
                    isFineGrained: false,
                    error: `Error al autenticar con GitHub: HTTP ${res.status} (${res.statusText})`,
                };
            }

            const userData = await res.json();

            // Inspeccionar encabezado X-OAuth-Scopes (presente en tokens clásicos)
            const rawScopes = res.headers.get("x-oauth-scopes");
            const scopes = rawScopes ? rawScopes.split(",").map((s) => s.trim()).filter(Boolean) : [];
            const isFineGrained = cleanToken.startsWith("github_pat_");

            // En tokens clásicos verificamos 'delete_repo'. En fine-grained GitHub no envía x-oauth-scopes en cabecera
            const hasDeleteScope = isFineGrained 
                ? true 
                : scopes.includes("delete_repo") || scopes.includes("admin:org");

            const user: CleanerUserProfile = {
                login: userData.login,
                id: userData.id,
                name: userData.name || null,
                avatar_url: userData.avatar_url,
                html_url: userData.html_url,
                public_repos: userData.public_repos ?? 0,
                total_private_repos: userData.total_private_repos,
                owned_private_repos: userData.owned_private_repos,
            };

            return {
                success: true,
                user,
                hasDeleteScope,
                scopes,
                isFineGrained,
            };
        } catch (error: any) {
            console.error("[GitCleanerService] Error validando token:", error);
            return {
                success: false,
                hasDeleteScope: false,
                scopes: [],
                isFineGrained: false,
                error: error.message || "Error al conectar con la API de GitHub.",
            };
        }
    },

    /**
     * Obtiene la lista completa de repositorios pertenecientes al usuario autenticado (incluye públicos, privados y forks).
     */
    async fetchUserRepositories(token: string): Promise<{
        success: boolean;
        repos: CleanerRepoItem[];
        totalCount: number;
        error?: string;
    }> {
        const cleanToken = token.trim();
        if (!cleanToken) {
            return { success: false, repos: [], totalCount: 0, error: "Token requerido." };
        }

        try {
            const allRepos: CleanerRepoItem[] = [];
            let page = 1;
            const perPage = 100;
            let hasMore = true;

            // Recorremos páginas hasta agotar los repositorios (límite de seguridad 5 páginas = 500 repos)
            while (hasMore && page <= 5) {
                const url = `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc&affiliation=owner`;
                const res = await fetch(url, {
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                        Authorization: `Bearer ${cleanToken}`,
                        "User-Agent": "SmartClass-Repo-Cleaner",
                    },
                    cache: "no-store",
                });

                if (!res.ok) {
                    return {
                        success: false,
                        repos: [],
                        totalCount: 0,
                        error: `HTTP ${res.status}: Error al obtener repositorios (${res.statusText})`,
                    };
                }

                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const item of data) {
                    allRepos.push({
                        id: item.id,
                        name: item.name,
                        full_name: item.full_name,
                        owner: item.owner?.login || "",
                        private: Boolean(item.private),
                        html_url: item.html_url,
                        description: item.description || null,
                        fork: Boolean(item.fork),
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        pushed_at: item.pushed_at,
                        size: item.size || 0,
                        stargazers_count: item.stargazers_count || 0,
                        forks_count: item.forks_count || 0,
                        open_issues_count: item.open_issues_count || 0,
                        language: item.language || null,
                        default_branch: item.default_branch || "main",
                        archived: Boolean(item.archived),
                    });
                }

                if (data.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            return {
                success: true,
                repos: allRepos,
                totalCount: allRepos.length,
            };
        } catch (error: any) {
            console.error("[GitCleanerService] Error listando repositorios:", error);
            return {
                success: false,
                repos: [],
                totalCount: 0,
                error: error.message || "Error al comunicarse con la API de repositorios de GitHub.",
            };
        }
    },

    /**
     * Elimina un único repositorio en GitHub mediante DELETE /repos/{owner}/{repo}.
     */
    async deleteSingleRepository(owner: string, repo: string, token: string): Promise<DeleteRepoResult> {
        const cleanToken = token.trim();
        const fullName = `${owner}/${repo}`;

        try {
            const url = `https://api.github.com/repos/${owner}/${repo}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    Authorization: `Bearer ${cleanToken}`,
                    "User-Agent": "SmartClass-Repo-Cleaner",
                },
            });

            // 204 No Content indica eliminación exitosa
            if (res.status === 204) {
                return {
                    fullName,
                    owner,
                    repo,
                    success: true,
                    status: 204,
                };
            }

            let errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
            try {
                const data = await res.json();
                if (data && data.message) {
                    errorMsg = data.message;
                }
            } catch {
                // Ignore json parse error
            }

            if (res.status === 403) {
                errorMsg = `Permiso denegado (403). Asegúrate de que el token tenga el scope 'delete_repo' o permisos de administración en este repositorio.`;
            } else if (res.status === 404) {
                errorMsg = `Repositorio no encontrado o ya fue eliminado previamente.`;
            }

            return {
                fullName,
                owner,
                repo,
                success: false,
                status: res.status,
                error: errorMsg,
            };
        } catch (error: any) {
            return {
                fullName,
                owner,
                repo,
                success: false,
                status: 500,
                error: error.message || "Fallo de conexión al intentar eliminar el repositorio.",
            };
        }
    },

    /**
     * Elimina un lote de repositorios de forma secuencial y controlada con pausa para evitar rate limiting.
     */
    async deleteBatchRepositories(
        repos: Array<{ owner: string; repo: string }>,
        token: string
    ): Promise<{
        total: number;
        deletedCount: number;
        failedCount: number;
        results: DeleteRepoResult[];
    }> {
        const results: DeleteRepoResult[] = [];
        let deletedCount = 0;
        let failedCount = 0;

        for (const item of repos) {
            const result = await this.deleteSingleRepository(item.owner, item.repo, token);
            results.push(result);

            if (result.success) {
                deletedCount++;
            } else {
                failedCount++;
            }

            // Pequeña pausa de 250ms entre cada llamada para respetar los límites de la API de GitHub
            await new Promise((resolve) => setTimeout(resolve, 250));
        }

        return {
            total: repos.length,
            deletedCount,
            failedCount,
            results,
        };
    },
};
