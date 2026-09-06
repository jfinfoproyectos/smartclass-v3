
export const githubService = {
    parseGitHubUrl(url: string) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            // Expected format: /owner/repo or /owner/repo/tree/branch/...
            if (pathParts.length < 2) return null;

            const owner = pathParts[0];
            let repo = pathParts[1];
            if (repo.endsWith(".git")) {
                repo = repo.slice(0, -4);
            }

            let branch = "HEAD"; // Default

            // If URL contains /tree/branch or /blob/branch
            if (pathParts.length >= 4 && (pathParts[2] === "tree" || pathParts[2] === "blob")) {
                branch = pathParts.slice(3).join('/');
            }

            return { owner, repo, branch };
        } catch (e) {
            return null;
        }
    },

    async getRepoBranches(owner: string, repo: string, token?: string): Promise<{ branches: string[]; defaultBranch: string }> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let defaultBranch = "main";
        try {
            const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (repoRes.ok) {
                const repoData = await repoRes.json();
                if (repoData.default_branch) {
                    defaultBranch = repoData.default_branch;
                }
            }
        } catch (e) {
            // Ignore fallback error
        }

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, { headers });
            if (!res.ok) {
                console.warn(`[GitHubService] Error fetching branches for ${owner}/${repo}: ${res.statusText}`);
                return { branches: [defaultBranch], defaultBranch };
            }

            const data = await res.json();
            if (!Array.isArray(data)) {
                return { branches: [defaultBranch], defaultBranch };
            }

            const branchNames = data.map((b: any) => b.name).filter(Boolean);
            if (branchNames.length === 0) {
                branchNames.push(defaultBranch);
            }

            // Put default branch first if present
            const orderedBranches = Array.from(new Set([
                defaultBranch,
                ...branchNames
            ])).filter(b => branchNames.includes(b) || b === defaultBranch);

            return { branches: orderedBranches, defaultBranch };
        } catch (error) {
            console.error("[GitHubService] Error al obtener ramas:", error);
            return { branches: [defaultBranch], defaultBranch };
        }
    },

    async getFileContent(owner: string, repo: string, path: string, branch: string = "HEAD", token?: string, retries = 3): Promise<string | null> {
        // Use encodeURIComponent for each part of the path separately to avoid breaking slashes
        const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
        const targetBranch = branch && branch.trim() ? branch.trim() : "HEAD";
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${encodedPath}`;
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, { headers });

                if (!response.ok) {
                    if (response.status === 429 || response.status >= 500) {
                        if (attempt < retries) {
                            const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
                            console.warn(`[GitHubService] HTTP ${response.status} en ${path}. Reintentando en ${delayMs}ms (Intento ${attempt}/${retries})...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                            continue;
                        }
                    }

                    // Fallback to GitHub REST API contents endpoint if token exists or raw content failed
                    if (token) {
                        try {
                            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${targetBranch !== "HEAD" ? `?ref=${encodeURIComponent(targetBranch)}` : ""}`;
                            const apiHeaders: HeadersInit = {
                                'Accept': 'application/vnd.github.v3+json',
                                'Authorization': `Bearer ${token}`,
                            };
                            const apiRes = await fetch(apiUrl, { headers: apiHeaders });
                            if (apiRes.ok) {
                                const apiData = await apiRes.json();
                                if (apiData.content && apiData.encoding === "base64") {
                                    return Buffer.from(apiData.content, "base64").toString("utf-8");
                                }
                            }
                        } catch {
                            // ignore fallback error
                        }
                    }

                    console.error(`Failed to fetch ${url}: ${response.statusText}`);
                    return null;
                }

                return await response.text();
            } catch (error) {
                if (attempt < retries) {
                    const delayMs = 1000 * Math.pow(2, attempt - 1);
                    console.warn(`[GitHubService] Network error en ${path}. Reintentando en ${delayMs}ms (Intento ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                console.error("Error fetching file from GitHub:", error);
                return null;
            }
        }
        return null;
    },

    async getRepoStructure(owner: string, repo: string, branch: string = "HEAD", token?: string, retries = 3): Promise<string[]> {
        // Use GitHub API to get the tree
        // https://api.github.com/repos/OWNER/REPO/git/trees/{branch}?recursive=1
        const targetRef = branch && branch.trim() ? branch.trim() : "HEAD";
        const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetRef)}?recursive=1`;

        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, { headers });

                if (!response.ok) {
                    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
                        const delayMs = 2000 * attempt;
                        console.warn(`[GitHubService] HTTP ${response.status} en getRepoStructure. Reintentando en ${delayMs}ms (Intento ${attempt}/${retries})...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                        continue;
                    }
                    console.error(`Failed to fetch repo structure: ${response.statusText}`);
                    return [];
                }

                const data = await response.json();
                if (!data.tree || !Array.isArray(data.tree)) {
                    return [];
                }

                // Filter only blobs (files), ignore trees (directories)
                return data.tree
                    .filter((item: any) => item.type === "blob")
                    .map((item: any) => item.path);
            } catch (error) {
                if (attempt < retries) {
                    const delayMs = 2000 * attempt;
                    console.warn(`[GitHubService] Network error en getRepoStructure. Reintentando en ${delayMs}ms (Intento ${attempt}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                console.error("Error fetching repo structure:", error);
                return [];
            }
        }
        return [];
    },

    async getRepoCommits(owner: string, repo: string, branch: string = "HEAD", token?: string, maxPages: number = 2): Promise<any[]> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const allCommits: any[] = [];
        const effectiveBranch = branch && branch !== "HEAD" ? branch : "";

        for (let page = 1; page <= maxPages; page++) {
            try {
                let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}`;
                if (effectiveBranch) {
                    url += `&sha=${encodeURIComponent(effectiveBranch)}`;
                }

                const response = await fetch(url, { headers });

                if (!response.ok) {
                    if (response.status === 409 || response.status === 404) {
                        // Empty repo or not found
                        break;
                    }
                    console.error(`[GitHubService] Error al obtener commits (página ${page}): ${response.statusText}`);
                    break;
                }

                const data = await response.json();
                if (!Array.isArray(data) || data.length === 0) {
                    break;
                }

                allCommits.push(...data);

                // If less than 100 returned, we reached the end
                if (data.length < 100) {
                    break;
                }
            } catch (error) {
                console.error("[GitHubService] Error al solicitar commits:", error);
                break;
            }
        }

        return allCommits;
    },

    async getRepoStatsContributors(owner: string, repo: string, token?: string): Promise<any[]> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
            const response = await fetch(url, { headers });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (error) {
            console.warn("[GitHubService] Stats/contributors no disponibles:", error);
        }
        return [];
    }
};
