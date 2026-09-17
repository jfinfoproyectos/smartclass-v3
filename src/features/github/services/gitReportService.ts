import { githubService } from "./githubService";
import { getRegionalDateOnly, formatTimeRegional, getTodayDateString } from "@/lib/dateUtils";

export interface GitCommitFileChange {
    filename: string;
    status: "added" | "modified" | "removed" | "renamed" | string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    rawUrl?: string;
    blobUrl?: string;
}

export interface GitReportCommit {
    sha: string;
    shortSha: string;
    title: string;
    body: string;
    date: string; // ISO
    regionalDate: string; // YYYY-MM-DD (America/Bogota)
    regionalTime: string; // HH:mm (America/Bogota)
    authorName: string;
    authorEmail: string;
    authorLogin: string | null;
    authorAvatar: string | null;
    authorHtmlUrl: string | null;
    commitUrl: string;
    branches: string[]; // List of branches containing this commit
    stats?: {
        additions: number;
        deletions: number;
        total: number;
    };
    files?: GitCommitFileChange[];
}

export interface GitReportContributor {
    name: string;
    login: string | null;
    avatar: string | null;
    profileUrl: string | null;
    email: string;
    commitsCount: number;
    percentage: number;
    activeDaysCount: number;
    firstCommitDate: string;
    lastCommitDate: string;
}

export interface GitReportFilterOptions {
    branch?: string; // "all" or branch name
    filterType?: "dates" | "commits"; // "dates" (default) or "commits"
    preset?: "today" | "week" | "month" | "last-month" | "month-week" | "custom" | "all";
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    commitQuery?: string; // Hash único, lista de hashes separados por coma, o rango base..head
    month?: number; // 1 - 12
    year?: number; // e.g. 2026
    weekOfMonth?: number | "all"; // 1, 2, 3, 4, 5, or "all"
}

export interface GitReportData {
    repoInfo: {
        owner: string;
        repo: string;
        defaultBranch: string;
        activeBranch: string;
        repoUrl: string;
    };
    branches: string[];
    selectedBranch: string;
    selectedPreset: "today" | "week" | "month" | "last-month" | "month-week" | "custom" | "all";
    selectedMonth?: number;
    selectedYear?: number;
    selectedWeekOfMonth?: number | "all";
    repoBounds?: {
        oldestDate: string | null;
        latestDate: string | null;
        oldestDateIso: string | null;
        latestDateIso: string | null;
        activeDates?: string[];
    };
    filterType?: "dates" | "commits";
    commitQuery?: string;
    dateRange: {
        startDate: string | null;
        endDate: string | null;
        label: string;
    };
    summary: {
        totalCommits: number;
        totalContributors: number;
        activeDaysCount: number;
        firstCommitDate: string | null;
        lastCommitDate: string | null;
        topContributor: GitReportContributor | null;
    };
    contributors: GitReportContributor[];
    commits: GitReportCommit[];
    timeline: Array<{
        date: string;
        total: number;
        contributors: Array<{ name: string; login?: string; count: number }>;
    }>;
    warning?: string;
}

export const gitReportService = {
    /**
     * Calcula los rangos de fecha para un mes y una semana del mes específica
     */
    computeMonthWeekRange(
        year: number,
        month: number, // 1 - 12
        week: number | "all" = "all"
    ): {
        startDate: string;
        endDate: string;
        label: string;
        apiSince: string;
        apiUntil: string;
    } {
        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const monthName = monthNames[month - 1] || `Mes ${month}`;

        // Obtener total de días del mes
        const lastDayOfMonth = new Date(year, month, 0).getDate();

        let startDay = 1;
        let endDay = lastDayOfMonth;
        let weekLabel = "Todo el mes";

        if (week === 1) {
            startDay = 1;
            endDay = Math.min(7, lastDayOfMonth);
            weekLabel = "Semana 1 (Días 1 al 7)";
        } else if (week === 2) {
            startDay = 8;
            endDay = Math.min(14, lastDayOfMonth);
            weekLabel = "Semana 2 (Días 8 al 14)";
        } else if (week === 3) {
            startDay = 15;
            endDay = Math.min(21, lastDayOfMonth);
            weekLabel = "Semana 3 (Días 15 al 21)";
        } else if (week === 4) {
            startDay = 22;
            endDay = Math.min(28, lastDayOfMonth);
            weekLabel = "Semana 4 (Días 22 al 28)";
        } else if (week === 5) {
            startDay = 29;
            endDay = lastDayOfMonth;
            weekLabel = `Semana 5 (Días 29 al ${lastDayOfMonth})`;
        }

        const pad = (n: number) => String(n).padStart(2, "0");
        const startStr = `${year}-${pad(month)}-${pad(startDay)}`;
        const endStr = `${year}-${pad(month)}-${pad(endDay)}`;

        return {
            startDate: startStr,
            endDate: endStr,
            label: `${monthName} ${year} - ${weekLabel} (${startStr} al ${endStr})`,
            apiSince: `${startStr}T00:00:00.000Z`,
            apiUntil: `${endStr}T23:59:59.999Z`
        };
    },

    /**
     * Resuelve el rango de fechas según el preset elegido
     */
    resolveDateRange(
        preset: GitReportFilterOptions["preset"] = "week", 
        customStart?: string, 
        customEnd?: string,
        options?: {
            month?: number;
            year?: number;
            weekOfMonth?: number | "all";
        }
    ): {
        startDate: string | null;
        endDate: string | null;
        label: string;
        apiSince?: string;
        apiUntil?: string;
    } {
        const todayStr = getTodayDateString();

        if (preset === "today") {
            const sinceIso = `${todayStr}T00:00:00.000Z`;
            const untilIso = `${todayStr}T23:59:59.999Z`;
            return {
                startDate: todayStr,
                endDate: todayStr,
                label: `Hoy (${todayStr})`,
                apiSince: sinceIso,
                apiUntil: untilIso
            };
        }

        if (preset === "week") {
            const today = new Date();
            const past7 = new Date(today);
            past7.setDate(past7.getDate() - 7);
            const startStr = getRegionalDateOnly(past7);
            return {
                startDate: startStr,
                endDate: todayStr,
                label: `Últimos 7 días (${startStr} al ${todayStr})`,
                apiSince: `${startStr}T00:00:00.000Z`,
                apiUntil: `${todayStr}T23:59:59.999Z`
            };
        }

        if (preset === "month") {
            const today = new Date();
            const past30 = new Date(today);
            past30.setDate(past30.getDate() - 30);
            const startStr = getRegionalDateOnly(past30);
            return {
                startDate: startStr,
                endDate: todayStr,
                label: `Últimos 30 días (${startStr} al ${todayStr})`,
                apiSince: `${startStr}T00:00:00.000Z`,
                apiUntil: `${todayStr}T23:59:59.999Z`
            };
        }

        if (preset === "last-month") {
            const today = new Date();
            let prevYear = today.getFullYear();
            let prevMonth = today.getMonth(); // 0-11
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear -= 1;
            }
            return this.computeMonthWeekRange(prevYear, prevMonth, "all");
        }

        if (preset === "month-week") {
            const today = new Date();
            const y = options?.year || today.getFullYear();
            const m = options?.month || (today.getMonth() + 1);
            const w = options?.weekOfMonth !== undefined ? options.weekOfMonth : "all";
            return this.computeMonthWeekRange(y, m, w);
        }

        if (preset === "custom") {
            const start = customStart || null;
            const end = customEnd || todayStr;
            const labelParts: string[] = [];
            if (start) labelParts.push(`Desde ${start}`);
            if (end) labelParts.push(`Hasta ${end}`);
            return {
                startDate: start,
                endDate: end,
                label: labelParts.length > 0 ? labelParts.join(" ") : "Rango personalizado",
                apiSince: start ? `${start}T00:00:00.000Z` : undefined,
                apiUntil: end ? `${end}T23:59:59.999Z` : undefined
            };
        }

        // "all"
        return {
            startDate: null,
            endDate: null,
            label: "Todo el historial completo"
        };
    },

    /**
     * Obtiene los detalles de archivos modificados, adiciones y eliminaciones de un commit específico
     */
    async fetchCommitFileChanges(
        owner: string,
        repo: string,
        sha: string,
        token?: string
    ): Promise<{
        stats: { additions: number; deletions: number; total: number };
        files: GitCommitFileChange[];
    } | null> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
            const res = await fetch(url, { headers });
            if (!res.ok) return null;
            const data = await res.json();
            const files: GitCommitFileChange[] = (data.files || []).map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions || 0,
                deletions: f.deletions || 0,
                changes: f.changes || 0,
                patch: typeof f.patch === "string" ? f.patch.substring(0, 800) : undefined
            }));
            return {
                stats: data.stats || { additions: 0, deletions: 0, total: 0 },
                files
            };
        } catch {
            return null;
        }
    },

    /**
     * Obtiene los detalles completos del commit y el diff/patch íntegro de cada archivo sin truncar
     */
    async fetchCommitFullDetails(
        owner: string,
        repo: string,
        sha: string,
        token?: string
    ): Promise<{
        sha: string;
        stats: { additions: number; deletions: number; total: number };
        files: Array<GitCommitFileChange & { rawUrl?: string; blobUrl?: string }>;
    } | null> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
            const res = await fetch(url, { headers });
            if (!res.ok) return null;
            const data = await res.json();
            const files = (data.files || []).map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions || 0,
                deletions: f.deletions || 0,
                changes: f.changes || 0,
                patch: typeof f.patch === "string" ? f.patch : undefined,
                rawUrl: f.raw_url,
                blobUrl: f.blob_url
            }));
            return {
                sha: data.sha || sha,
                stats: data.stats || { additions: 0, deletions: 0, total: 0 },
                files
            };
        } catch {
            return null;
        }
    },

    /**
     * Consulta ramas y commits para una rama específica o para todas las ramas
     */
    async getRepoReportData(
        repoUrl: string,
        token?: string,
        options: GitReportFilterOptions = {}
    ): Promise<GitReportData> {
        const repoInfo = githubService.parseGitHubUrl(repoUrl);
        if (!repoInfo) {
            throw new Error("URL de repositorio de GitHub no válida.");
        }

        // Determinar qué rama se auditará
        const selectedBranch = options.branch || "all";

        // 1. Obtener ramas disponibles y límites de commits del repositorio en paralelo
        const [branchesData, repoDateBounds] = await Promise.all([
            githubService.getRepoBranches(repoInfo.owner, repoInfo.repo, token),
            githubService.getRepoDateBounds(repoInfo.owner, repoInfo.repo, selectedBranch === "all" ? undefined : selectedBranch, token)
        ]);
        const allBranches = branchesData.branches;
        const defaultBranch = branchesData.defaultBranch;

        const filterType = options.filterType || "dates";
        const commitQuery = options.commitQuery?.trim() || "";
        const preset = filterType === "commits" ? "all" : (options.preset || "week");
        let dateRange = this.resolveDateRange(preset, options.startDate, options.endDate, {
            month: options.month,
            year: options.year,
            weekOfMonth: options.weekOfMonth
        });
        if (filterType === "commits" && !commitQuery) {
            dateRange.label = "Todos los commits del repositorio (Selección con Checkboxes)";
        }

        // 2. Obtener commits
        const commitMap = new Map<string, { raw: any; branches: Set<string> }>();

        if (filterType === "commits" && commitQuery) {
            // Manejo de filtro por commit o grupo de commits
            if (commitQuery.includes("..")) {
                const parts = commitQuery.includes("...") 
                    ? commitQuery.split("...").map(p => p.trim())
                    : commitQuery.split("..").map(p => p.trim());
                const base = parts[0];
                const head = parts[1];
                if (base && head) {
                    const compareResult = await githubService.compareCommits(repoInfo.owner, repoInfo.repo, base, head, token);
                    if (compareResult && compareResult.commits.length > 0) {
                        for (const c of compareResult.commits) {
                            if (!c.sha) continue;
                            commitMap.set(c.sha, { raw: c, branches: new Set([selectedBranch === "all" ? defaultBranch : selectedBranch]) });
                        }
                        dateRange = {
                            startDate: null,
                            endDate: null,
                            label: `Rango: ${base.slice(0, 7)}..${head.slice(0, 7)} (${compareResult.totalCommits || commitMap.size} commits)`
                        };
                    } else {
                        throw new Error(`No se encontraron commits en el rango "${base}..${head}". Verifica que las referencias existan en este repositorio (ej: HEAD~5..HEAD).`);
                    }
                }
            } else {
                // Lista de hashes o hash individual
                const shas = commitQuery.split(/[\s,]+/).filter(Boolean);
                if (shas.length > 0) {
                    const results = await Promise.all(
                        shas.map(sha => githubService.getSingleCommit(repoInfo.owner, repoInfo.repo, sha, token))
                    );
                    for (const c of results) {
                        if (c && c.sha) {
                            commitMap.set(c.sha, { raw: c, branches: new Set([selectedBranch === "all" ? defaultBranch : selectedBranch]) });
                        }
                    }
                    if (commitMap.size === 0) {
                        throw new Error(`El commit "${commitQuery}" no existe en este repositorio. Verifica el hash o presiona "Consultar Todos" para seleccionarlos con casillas (checkbox).`);
                    }
                    dateRange = {
                        startDate: null,
                        endDate: null,
                        label: shas.length === 1 
                            ? `Commit específico: ${shas[0].slice(0, 7)}` 
                            : `Grupo de ${commitMap.size} commits específicos`
                    };
                }
            }
        } else if (selectedBranch === "all") {
            // Consultar commits de las ramas principales (hasta 8 ramas más relevantes para no agotar la cuota)
            const targetBranches = allBranches.slice(0, 8);
            for (const b of targetBranches) {
                try {
                    const rawList = await githubService.getRepoCommits(
                        repoInfo.owner,
                        repoInfo.repo,
                        b,
                        token,
                        10, // hasta 1000 commits por rama
                        dateRange.apiSince,
                        dateRange.apiUntil
                    );
                    for (const c of rawList) {
                        if (!c.sha) continue;
                        const existing = commitMap.get(c.sha);
                        if (existing) {
                            existing.branches.add(b);
                        } else {
                            commitMap.set(c.sha, { raw: c, branches: new Set([b]) });
                        }
                    }
                } catch (e) {
                    console.warn(`[gitReportService] Error consultando rama ${b}:`, e);
                }
            }
        } else {
            // Rama individual
            const rawList = await githubService.getRepoCommits(
                repoInfo.owner,
                repoInfo.repo,
                selectedBranch,
                token,
                15, // hasta 1500 commits
                dateRange.apiSince,
                dateRange.apiUntil
            );
            for (const c of rawList) {
                if (!c.sha) continue;
                commitMap.set(c.sha, { raw: c, branches: new Set([selectedBranch]) });
            }
        }

        // 3. Procesar y normalizar commits con filtro de fecha regional estricto
        const processedCommits: GitReportCommit[] = [];

        commitMap.forEach(({ raw, branches }) => {
            const sha = raw.sha || "";
            const shortSha = sha.substring(0, 7);
            const commitMsg = raw.commit?.message || "Sin mensaje de commit";
            const msgLines = commitMsg.split("\n");
            const title = msgLines[0].trim();
            const body = msgLines.slice(1).join("\n").trim();

            const rawDate = raw.commit?.author?.date || raw.commit?.committer?.date || "";
            const commitDate = rawDate ? new Date(rawDate) : new Date();
            const regionalDate = getRegionalDateOnly(commitDate);
            const regionalTime = formatTimeRegional(commitDate);

            // Filtro en memoria por fecha regional solo si el filtro activo es por fechas
            if (filterType !== "commits") {
                if (dateRange.startDate && regionalDate < dateRange.startDate) return;
                if (dateRange.endDate && regionalDate > dateRange.endDate) return;
            }

            const authorName = raw.commit?.author?.name || raw.author?.login || "Anónimo";
            const authorEmail = raw.commit?.author?.email || "";
            const authorLogin = raw.author?.login || null;
            const authorAvatar = raw.author?.avatar_url || null;
            const authorHtmlUrl = raw.author?.html_url || (authorLogin ? `https://github.com/${authorLogin}` : null);
            const commitUrl = raw.html_url || `https://github.com/${repoInfo.owner}/${repoInfo.repo}/commit/${sha}`;

            processedCommits.push({
                sha,
                shortSha,
                title,
                body,
                date: commitDate.toISOString(),
                regionalDate,
                regionalTime,
                authorName,
                authorEmail,
                authorLogin,
                authorAvatar,
                authorHtmlUrl,
                commitUrl,
                branches: Array.from(branches)
            });
        });

        // Ordenar commits descendente (más recientes primero)
        processedCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Enriquecer los commits más relevantes del rango con sus archivos modificados reales
        // (hasta 50 commits si hay token, o 15 commits en modo anónimo para evitar rate-limits)
        const maxEnrich = token ? 50 : 15;
        const commitsToEnrich = processedCommits.slice(0, maxEnrich);
        const concurrency = 5;

        for (let i = 0; i < commitsToEnrich.length; i += concurrency) {
            const chunk = commitsToEnrich.slice(i, i + concurrency);
            await Promise.all(chunk.map(async (commit) => {
                const details = await this.fetchCommitFileChanges(repoInfo.owner, repoInfo.repo, commit.sha, token);
                if (details) {
                    commit.stats = details.stats;
                    commit.files = details.files;
                }
            }));
        }

        const totalCommits = processedCommits.length;

        // 4. Agrupar contribuidores y calcular estadísticas
        const contributorMap = new Map<string, {
            name: string;
            login: string | null;
            avatar: string | null;
            profileUrl: string | null;
            email: string;
            commitsCount: number;
            firstCommitDate: Date;
            lastCommitDate: Date;
            activeDates: Set<string>;
        }>();

        const allActiveDays = new Set<string>();

        for (const commit of processedCommits) {
            const key = (commit.authorLogin || commit.authorEmail || commit.authorName).toLowerCase();
            const commitTime = new Date(commit.date);
            const dateStr = commit.regionalDate;
            allActiveDays.add(dateStr);

            let item = contributorMap.get(key);
            if (!item) {
                item = {
                    name: commit.authorName,
                    login: commit.authorLogin,
                    avatar: commit.authorAvatar,
                    profileUrl: commit.authorHtmlUrl,
                    email: commit.authorEmail,
                    commitsCount: 0,
                    firstCommitDate: commitTime,
                    lastCommitDate: commitTime,
                    activeDates: new Set<string>()
                };
                contributorMap.set(key, item);
            }

            item.commitsCount += 1;
            item.activeDates.add(dateStr);

            if (commitTime < item.firstCommitDate) {
                item.firstCommitDate = commitTime;
            }
            if (commitTime > item.lastCommitDate) {
                item.lastCommitDate = commitTime;
            }

            if (!item.avatar && commit.authorAvatar) item.avatar = commit.authorAvatar;
            if (!item.login && commit.authorLogin) item.login = commit.authorLogin;
            if (!item.profileUrl && commit.authorHtmlUrl) item.profileUrl = commit.authorHtmlUrl;
        }

        const contributors: GitReportContributor[] = Array.from(contributorMap.values())
            .map(c => {
                const pct = totalCommits > 0 ? (c.commitsCount / totalCommits) * 100 : 0;
                return {
                    name: c.name,
                    login: c.login,
                    avatar: c.avatar,
                    profileUrl: c.profileUrl,
                    email: c.email,
                    commitsCount: c.commitsCount,
                    percentage: Number(pct.toFixed(1)),
                    activeDaysCount: c.activeDates.size,
                    firstCommitDate: c.firstCommitDate.toISOString(),
                    lastCommitDate: c.lastCommitDate.toISOString()
                };
            })
            .sort((a, b) => b.commitsCount - a.commitsCount);

        // 5. Timeline cronológico por fecha YYYY-MM-DD
        const timelineMap = new Map<string, { date: string; total: number; contributors: Map<string, { name: string; login?: string; count: number }> }>();

        // Cronológico ascendente para el timeline
        const ascendingCommits = [...processedCommits].reverse();
        for (const commit of ascendingCommits) {
            const dateKey = commit.regionalDate;
            let entry = timelineMap.get(dateKey);
            if (!entry) {
                entry = { date: dateKey, total: 0, contributors: new Map() };
                timelineMap.set(dateKey, entry);
            }
            entry.total += 1;
            const authorKey = commit.authorLogin || commit.authorName;
            const existing = entry.contributors.get(authorKey);
            if (existing) {
                existing.count += 1;
            } else {
                entry.contributors.set(authorKey, {
                    name: commit.authorName,
                    login: commit.authorLogin || undefined,
                    count: 1
                });
            }
        }

        const timeline = Array.from(timelineMap.values()).map(e => ({
            date: e.date,
            total: e.total,
            contributors: Array.from(e.contributors.values()).sort((a, b) => b.count - a.count)
        }));

        let warning: string | undefined;
        if (!token) {
            warning = "Aviso: No se ha suministrado un Token de GitHub. Las consultas a la API de GitHub pueden estar limitadas a 60 peticiones/hora.";
        }

        return {
            repoInfo: {
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                defaultBranch,
                activeBranch: selectedBranch,
                repoUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
            },
            branches: allBranches,
            selectedBranch,
            selectedPreset: preset,
            selectedMonth: options.month,
            selectedYear: options.year,
            selectedWeekOfMonth: options.weekOfMonth,
            repoBounds: {
                oldestDate: (processedCommits.length > 0 && (!repoDateBounds.oldestDate || processedCommits[processedCommits.length - 1].regionalDate < repoDateBounds.oldestDate))
                    ? processedCommits[processedCommits.length - 1].regionalDate 
                    : repoDateBounds.oldestDate,
                latestDate: (processedCommits.length > 0 && (!repoDateBounds.latestDate || processedCommits[0].regionalDate > repoDateBounds.latestDate))
                    ? processedCommits[0].regionalDate 
                    : repoDateBounds.latestDate,
                oldestDateIso: repoDateBounds.oldestDateIso,
                latestDateIso: repoDateBounds.latestDateIso,
                activeDates: Array.from(new Set([
                    ...(repoDateBounds.activeDates || []),
                    ...processedCommits.map(c => c.regionalDate).filter(Boolean)
                ])).sort()
            },
            filterType,
            commitQuery: commitQuery || undefined,
            dateRange: {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                label: dateRange.label
            },
            summary: {
                totalCommits,
                totalContributors: contributors.length,
                activeDaysCount: allActiveDays.size,
                firstCommitDate: processedCommits[processedCommits.length - 1]?.date || null,
                lastCommitDate: processedCommits[0]?.date || null,
                topContributor: contributors[0] || null
            },
            contributors,
            commits: processedCommits,
            timeline,
            warning
        };
    }
};
