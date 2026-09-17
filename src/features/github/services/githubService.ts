
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

    /**
     * Obtiene de forma rápida y ultra liviana la fecha del primer commit (más antiguo)
     * y del último commit (más reciente) del repositorio o de una rama dada
     */
    async getRepoDateBounds(
        owner: string, 
        repo: string, 
        branch?: string, 
        token?: string
    ): Promise<{
        oldestDate: string | null;
        latestDate: string | null;
        oldestDateIso: string | null;
        latestDateIso: string | null;
        activeDates: string[];
    }> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const effectiveBranch = branch && branch !== "all" && branch !== "HEAD" ? branch : "";
            const activeDatesSet = new Set<string>();

            const getRegionalDateOnly = (iso: string | null) => {
                if (!iso) return null;
                const d = new Date(iso);
                if (isNaN(d.getTime())) return null;
                const pad = (n: number) => String(n).padStart(2, "0");
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            };

            // Solicitamos 100 commits por página para mapear las fechas activas de forma ultra rápida
            let url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=1`;
            if (effectiveBranch) {
                url += `&sha=${encodeURIComponent(effectiveBranch)}`;
            }

            const res = await fetch(url, { headers });
            if (!res.ok) {
                return { oldestDate: null, latestDate: null, oldestDateIso: null, latestDateIso: null, activeDates: [] };
            }

            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                return { oldestDate: null, latestDate: null, oldestDateIso: null, latestDateIso: null, activeDates: [] };
            }

            for (const c of data) {
                const dateIso = c?.commit?.author?.date || c?.commit?.committer?.date;
                const dStr = getRegionalDateOnly(dateIso);
                if (dStr) activeDatesSet.add(dStr);
            }

            const latestIso = data[0]?.commit?.author?.date || data[0]?.commit?.committer?.date || null;
            let oldestIso = data[data.length - 1]?.commit?.author?.date || data[data.length - 1]?.commit?.committer?.date || latestIso;

            const link = res.headers.get('link');
            if (link) {
                const match = link.match(/<([^>]+)>;\s*rel="last"/);
                if (match) {
                    const lastUrl = match[1];
                    try {
                        const pageMatch = lastUrl.match(/[?&]page=(\d+)/);
                        const lastPageNum = pageMatch ? parseInt(pageMatch[1], 10) : 1;

                        const intermediatePromises: Promise<any>[] = [];
                        for (let p = 2; p < Math.min(lastPageNum, 5); p++) {
                            let pUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${p}`;
                            if (effectiveBranch) pUrl += `&sha=${encodeURIComponent(effectiveBranch)}`;
                            intermediatePromises.push(fetch(pUrl, { headers }).then(r => r.ok ? r.json() : []).catch(() => []));
                        }

                        const [lastPageRes, ...intermediatePages] = await Promise.all([
                            fetch(lastUrl, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
                            ...intermediatePromises
                        ]);

                        for (const pageList of intermediatePages) {
                            if (Array.isArray(pageList)) {
                                for (const c of pageList) {
                                    const dStr = getRegionalDateOnly(c?.commit?.author?.date || c?.commit?.committer?.date);
                                    if (dStr) activeDatesSet.add(dStr);
                                }
                            }
                        }

                        if (Array.isArray(lastPageRes) && lastPageRes.length > 0) {
                            for (const c of lastPageRes) {
                                const dStr = getRegionalDateOnly(c?.commit?.author?.date || c?.commit?.committer?.date);
                                if (dStr) activeDatesSet.add(dStr);
                            }
                            oldestIso = lastPageRes[lastPageRes.length - 1]?.commit?.author?.date || lastPageRes[0]?.commit?.author?.date || oldestIso;
                        }
                    } catch {
                        // ignore and use fallback
                    }
                }
            }

            return {
                oldestDate: getRegionalDateOnly(oldestIso),
                latestDate: getRegionalDateOnly(latestIso),
                oldestDateIso: oldestIso,
                latestDateIso: latestIso,
                activeDates: Array.from(activeDatesSet).sort()
            };
        } catch (e) {
            console.warn("[GitHubService] Error al obtener límites de fechas:", e);
            return { oldestDate: null, latestDate: null, oldestDateIso: null, latestDateIso: null, activeDates: [] };
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

    async getRepoCommits(
        owner: string, 
        repo: string, 
        branch: string = "HEAD", 
        token?: string, 
        maxPages: number = 10,
        since?: string,
        until?: string
    ): Promise<any[]> {
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
                if (since) {
                    url += `&since=${encodeURIComponent(since)}`;
                }
                if (until) {
                    url += `&until=${encodeURIComponent(until)}`;
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
    },

    /**
     * Obtiene los datos de un commit individual por hash SHA o referencia
     */
    async getSingleCommit(owner: string, repo: string, ref: string, token?: string): Promise<any | null> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref.trim())}`;
            const response = await fetch(url, { headers });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error(`[GitHubService] Error al obtener commit individual ${ref}:`, error);
            return null;
        }
    },

    /**
     * Compara dos commits o referencias (base...head) y obtiene todos los commits y diffs intermedios
     */
    async compareCommits(owner: string, repo: string, base: string, head: string, token?: string): Promise<{
        commits: any[];
        files: any[];
        totalCommits: number;
    } | null> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(base.trim())}...${encodeURIComponent(head.trim())}`;
            const response = await fetch(url, { headers });
            if (!response.ok) return null;
            const data = await response.json();
            return {
                commits: Array.isArray(data.commits) ? data.commits : [],
                files: Array.isArray(data.files) ? data.files : [],
                totalCommits: data.total_commits || (Array.isArray(data.commits) ? data.commits.length : 0)
            };
        } catch (error) {
            console.error(`[GitHubService] Error al comparar commits ${base}...${head}:`, error);
            return null;
        }
    }
};

