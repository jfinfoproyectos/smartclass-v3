"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getRepoBranchesAction(repoUrl: string, activityId?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "student" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");

    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("URL de GitHub inválida");

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
    const result = await githubService.getRepoBranches(repoInfo.owner, repoInfo.repo, token || undefined);

    const activeBranch = repoInfo.branch !== "HEAD" ? repoInfo.branch : result.defaultBranch;

    return {
        ...result,
        activeBranch,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
    };
}

export async function scanRepositoryAction(repoUrl: string, branch?: string) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");
    
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("URL de GitHub inválida");

    const effectiveBranch = branch || (repoInfo.branch !== "HEAD" ? repoInfo.branch : "HEAD");
    const token = await getGithubToken(session.user.id);
    const files = await githubService.getRepoStructure(repoInfo.owner, repoInfo.repo, effectiveBranch, token || undefined);

    let warning;
    if (!token) {
        warning = "Aviso: No tienes configurado tu Token de GitHub en tu perfil. Estás expuesto a posibles límites de tasa de la API.";
    }

    return { files, warning, branch: effectiveBranch };
}


export async function fetchRepoFilesAction(repoUrl: string, filePaths: string, activityId?: string, branch?: string) {
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
    const effectiveBranch = branch || repoInfo.branch;

    for (const path of paths) {
        if (!path) continue;
        const content = await githubService.getFileContent(repoInfo.owner, repoInfo.repo, path, effectiveBranch, token || undefined);
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

    return { validFiles, missingFiles, warning, branch: effectiveBranch };
}

export async function getGitHubSubmissionDetailsAction(repoUrl: string, filePaths: string, activityId?: string, branch?: string) {
    // This is essentially a wrapper for fetchRepoFilesAction but with a slightly different return structure or intended use
    // We'll implement it to match ActivityDetail's expectation
    const result = await fetchRepoFilesAction(repoUrl, filePaths, activityId, branch);
    const { githubService } = await import("../services/githubService");
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    
    return {
        ...result,
        repoInfo
    };
}

export async function getRepoStructureAction(repoUrl: string, teacherId?: string, branch?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "student" && session.user.role !== "teacher")) {
        throw new Error("Unauthorized");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");
    
    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) throw new Error("URL de GitHub inválida");

    const effectiveBranch = branch || repoInfo.branch;
    const token = await getGithubToken(teacherId || session.user.id);
    const files = await githubService.getRepoStructure(repoInfo.owner, repoInfo.repo, effectiveBranch, token || undefined);

    let warning;
    if (!token) {
        warning = "Aviso: No se configuró el Token de GitHub. Estás expuesto a límites de tasa.";
    }

    return files;
}

export async function getRepoAuditAction(repoUrl: string, activityId?: string, branch?: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "student" && session.user.role !== "teacher")) {
        throw new Error("No autorizado");
    }

    const { githubService } = await import("../services/githubService");
    const { getGithubToken } = await import("@/lib/githubTokenHelper");

    const repoInfo = githubService.parseGitHubUrl(repoUrl);
    if (!repoInfo) {
        throw new Error("URL de repositorio de GitHub no válida.");
    }

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
    const effectiveBranch = branch || repoInfo.branch;

    // 1. Obtener lista de commits del repositorio
    const rawCommits = await githubService.getRepoCommits(
        repoInfo.owner,
        repoInfo.repo,
        effectiveBranch,
        token || undefined,
        3 // Hasta 300 commits
    );

    // 2. Intentar obtener estadísticas de contribuyentes (adiciones/eliminaciones)
    const statsContributors = await githubService.getRepoStatsContributors(
        repoInfo.owner,
        repoInfo.repo,
        token || undefined
    );

    const statsMap: Record<string, { additions: number; deletions: number }> = {};
    if (Array.isArray(statsContributors)) {
        for (const item of statsContributors) {
            const login = item?.author?.login?.toLowerCase();
            if (login && Array.isArray(item.weeks)) {
                let add = 0;
                let del = 0;
                for (const w of item.weeks) {
                    add += w.a || 0;
                    del += w.d || 0;
                }
                statsMap[login] = { additions: add, deletions: del };
            }
        }
    }

    // 3. Procesar y normalizar commits
    const processedCommits = rawCommits.map((c: any) => {
        const sha = c.sha || "";
        const shortSha = sha.substring(0, 7);
        const commitMsg = c.commit?.message || "Sin mensaje de commit";
        const msgLines = commitMsg.split('\n');
        const title = msgLines[0].trim();
        const body = msgLines.slice(1).join('\n').trim();

        const rawDate = c.commit?.author?.date || c.commit?.committer?.date || "";
        const commitDate = rawDate ? new Date(rawDate) : new Date();

        const authorName = c.commit?.author?.name || c.author?.login || "Anónimo";
        const authorEmail = c.commit?.author?.email || "";
        const authorLogin = c.author?.login || null;
        const authorAvatar = c.author?.avatar_url || null;
        const authorHtmlUrl = c.author?.html_url || (authorLogin ? `https://github.com/${authorLogin}` : null);
        const commitUrl = c.html_url || `https://github.com/${repoInfo.owner}/${repoInfo.repo}/commit/${sha}`;

        return {
            sha,
            shortSha,
            title,
            body,
            date: commitDate.toISOString(),
            authorName,
            authorEmail,
            authorLogin,
            authorAvatar,
            authorHtmlUrl,
            commitUrl
        };
    });

    const totalCommits = processedCommits.length;

    // 4. Mapear y computar estadísticas por colaborador
    const contributorMap = new Map<string, {
        key: string;
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

    for (const commit of processedCommits) {
        const key = (commit.authorLogin || commit.authorEmail || commit.authorName).toLowerCase();
        const commitTime = new Date(commit.date);
        const dateStr = commit.date.substring(0, 10); // YYYY-MM-DD

        let item = contributorMap.get(key);
        if (!item) {
            item = {
                key,
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

        // Si antes no tenía avatar o login y ahora sí, actualizar
        if (!item.avatar && commit.authorAvatar) item.avatar = commit.authorAvatar;
        if (!item.login && commit.authorLogin) item.login = commit.authorLogin;
        if (!item.profileUrl && commit.authorHtmlUrl) item.profileUrl = commit.authorHtmlUrl;
    }

    const contributors = Array.from(contributorMap.values()).map((contrib) => {
        const pct = totalCommits > 0 ? (contrib.commitsCount / totalCommits) * 100 : 0;
        const lookupKey = (contrib.login || "").toLowerCase();
        const extraStats = statsMap[lookupKey] || { additions: 0, deletions: 0 };

        return {
            name: contrib.name,
            login: contrib.login,
            avatar: contrib.avatar,
            profileUrl: contrib.profileUrl,
            email: contrib.email,
            commitsCount: contrib.commitsCount,
            percentage: Number(pct.toFixed(1)),
            firstCommitDate: contrib.firstCommitDate.toISOString(),
            lastCommitDate: contrib.lastCommitDate.toISOString(),
            activeDaysCount: contrib.activeDates.size,
            additions: extraStats.additions,
            deletions: extraStats.deletions
        };
    }).sort((a, b) => b.commitsCount - a.commitsCount);

    // 5. Timeline cronológico (commits por fecha YYYY-MM-DD)
    const timelineMap = new Map<string, { date: string; total: number; contributors: { name: string; login?: string; count: number }[]; [key: string]: any }>();
    const timelineContribMaps = new Map<string, Map<string, { name: string; login?: string; count: number }>>();

    // Ordenar commits ascendentemente para el timeline
    const chronologicalCommits = [...processedCommits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const commit of chronologicalCommits) {
        const dateKey = commit.date.substring(0, 10);
        let entry = timelineMap.get(dateKey);
        let cMap = timelineContribMaps.get(dateKey);
        if (!entry || !cMap) {
            entry = { date: dateKey, total: 0, contributors: [] };
            cMap = new Map();
            timelineMap.set(dateKey, entry);
            timelineContribMaps.set(dateKey, cMap);
        }
        entry.total += 1;
        const authorSafeKey = (commit.authorLogin || commit.authorName).replace(/[^a-zA-Z0-9]/g, '_');
        entry[authorSafeKey] = (entry[authorSafeKey] || 0) + 1;

        const authorKey = commit.authorLogin || commit.authorName;
        const existing = cMap.get(authorKey);
        if (existing) {
            existing.count += 1;
        } else {
            cMap.set(authorKey, {
                name: commit.authorName || commit.authorLogin,
                login: commit.authorLogin,
                count: 1
            });
        }
    }

    timelineMap.forEach((entry, dateKey) => {
        const cMap = timelineContribMaps.get(dateKey);
        if (cMap) {
            entry.contributors = Array.from(cMap.values()).sort((a, b) => b.count - a.count);
        }
    });

    const timeline = Array.from(timelineMap.values());

    // 6. Periodicidad por Día de la Semana
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayOfWeekContribMaps: Map<string, { name: string; login?: string; count: number }>[] = Array.from({ length: 7 }, () => new Map());

    // 7. Periodicidad por Franja Horaria
    const timeSlots = {
        madrugada: 0, // 00:00 - 05:59
        manana: 0,    // 06:00 - 11:59
        tarde: 0,     // 12:00 - 17:59
        noche: 0      // 18:00 - 23:59
    };
    const timeSlotContribMaps = {
        madrugada: new Map<string, { name: string; login?: string; count: number }>(),
        manana: new Map<string, { name: string; login?: string; count: number }>(),
        tarde: new Map<string, { name: string; login?: string; count: number }>(),
        noche: new Map<string, { name: string; login?: string; count: number }>()
    };

    const allActiveDays = new Set<string>();

    for (const commit of processedCommits) {
        const d = new Date(commit.date);
        allActiveDays.add(commit.date.substring(0, 10));
        const dayIdx = d.getDay();
        dayOfWeekCounts[dayIdx] += 1;

        const authorKey = commit.authorLogin || commit.authorName;
        const authorDisplayName = commit.authorName || commit.authorLogin;

        // Day of week contrib record
        const dMap = dayOfWeekContribMaps[dayIdx];
        const existD = dMap.get(authorKey);
        if (existD) {
            existD.count += 1;
        } else {
            dMap.set(authorKey, { name: authorDisplayName, login: commit.authorLogin, count: 1 });
        }

        // Hour slot contrib record
        const hour = d.getHours();
        let slotKey: "madrugada" | "manana" | "tarde" | "noche";
        if (hour >= 0 && hour < 6) {
            timeSlots.madrugada += 1;
            slotKey = "madrugada";
        } else if (hour >= 6 && hour < 12) {
            timeSlots.manana += 1;
            slotKey = "manana";
        } else if (hour >= 12 && hour < 18) {
            timeSlots.tarde += 1;
            slotKey = "tarde";
        } else {
            timeSlots.noche += 1;
            slotKey = "noche";
        }

        const hMap = timeSlotContribMaps[slotKey];
        const existH = hMap.get(authorKey);
        if (existH) {
            existH.count += 1;
        } else {
            hMap.set(authorKey, { name: authorDisplayName, login: commit.authorLogin, count: 1 });
        }
    }

    // Reordenar días para que empiece en Lunes
    const reorderedDays = [
        { day: "Lun", fullName: "Lunes", count: dayOfWeekCounts[1], contributors: Array.from(dayOfWeekContribMaps[1].values()).sort((a, b) => b.count - a.count) },
        { day: "Mar", fullName: "Martes", count: dayOfWeekCounts[2], contributors: Array.from(dayOfWeekContribMaps[2].values()).sort((a, b) => b.count - a.count) },
        { day: "Mié", fullName: "Miércoles", count: dayOfWeekCounts[3], contributors: Array.from(dayOfWeekContribMaps[3].values()).sort((a, b) => b.count - a.count) },
        { day: "Jue", fullName: "Jueves", count: dayOfWeekCounts[4], contributors: Array.from(dayOfWeekContribMaps[4].values()).sort((a, b) => b.count - a.count) },
        { day: "Vie", fullName: "Viernes", count: dayOfWeekCounts[5], contributors: Array.from(dayOfWeekContribMaps[5].values()).sort((a, b) => b.count - a.count) },
        { day: "Sáb", fullName: "Sábado", count: dayOfWeekCounts[6], contributors: Array.from(dayOfWeekContribMaps[6].values()).sort((a, b) => b.count - a.count) },
        { day: "Dom", fullName: "Domingo", count: dayOfWeekCounts[0], contributors: Array.from(dayOfWeekContribMaps[0].values()).sort((a, b) => b.count - a.count) }
    ];

    const hourSlotStats = [
        { slot: "Madrugada", range: "00:00 - 06:00", count: timeSlots.madrugada, contributors: Array.from(timeSlotContribMaps.madrugada.values()).sort((a, b) => b.count - a.count) },
        { slot: "Mañana", range: "06:00 - 12:00", count: timeSlots.manana, contributors: Array.from(timeSlotContribMaps.manana.values()).sort((a, b) => b.count - a.count) },
        { slot: "Tarde", range: "12:00 - 18:00", count: timeSlots.tarde, contributors: Array.from(timeSlotContribMaps.tarde.values()).sort((a, b) => b.count - a.count) },
        { slot: "Noche", range: "18:00 - 24:00", count: timeSlots.noche, contributors: Array.from(timeSlotContribMaps.noche.values()).sort((a, b) => b.count - a.count) }
    ];

    // 8. Resumen global
    const firstCommit = chronologicalCommits[0];
    const lastCommit = chronologicalCommits[chronologicalCommits.length - 1];
    
    let daysSpan = 1;
    if (firstCommit && lastCommit) {
        const diffMs = Math.abs(new Date(lastCommit.date).getTime() - new Date(firstCommit.date).getTime());
        daysSpan = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const summary = {
        totalCommits,
        totalContributors: contributors.length,
        firstCommitDate: firstCommit?.date || null,
        lastCommitDate: lastCommit?.date || null,
        activeDaysCount: allActiveDays.size,
        daysSpan,
        topContributor: contributors[0] || null,
        repoInfo: {
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            branch: repoInfo.branch,
            repoUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
        }
    };

    let warning: string | undefined;
    if (!token) {
        warning = "Aviso: No se configuró un Token de GitHub para autenticar la API. Algunas métricas pueden verse limitadas por cuota.";
    }

    return {
        summary,
        contributors,
        timeline,
        dayOfWeekStats: reorderedDays,
        hourStats: hourSlotStats,
        commits: processedCommits,
        warning
    };
}
