export interface MediaMetadata {
    platform: "Loom" | "YouTube" | "Google Drive" | "Direct Video" | "Direct Audio" | "Web Link";
    title?: string;
    description?: string;
    duration?: number; // in seconds
    durationFormatted?: string;
    author?: string;
    isAccessible: boolean;
    error?: string;
}

export async function extractMediaMetadata(rawUrl: string): Promise<MediaMetadata> {
    if (!rawUrl || typeof rawUrl !== "string") {
        return { platform: "Web Link", isAccessible: false, error: "URL vacía" };
    }

    const url = rawUrl.trim();

    // 1. LOOM
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
        try {
            const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`;
            const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
            if (res.ok) {
                const data = await res.json();
                const durationSec = typeof data.duration === "number" ? Math.round(data.duration) : undefined;
                const durationFormatted = durationSec
                    ? `${Math.floor(durationSec / 60)} min ${durationSec % 60} s`
                    : undefined;

                return {
                    platform: "Loom",
                    title: data.title || "Video de Loom",
                    description: data.description || "",
                    duration: durationSec,
                    durationFormatted,
                    author: data.author_name,
                    isAccessible: true,
                };
            }
        } catch (err: any) {
            console.warn("Error fetching Loom oEmbed:", err.message);
        }

        // Fallback: fetch page meta tags
        try {
            const pageRes = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(6000),
            });
            if (pageRes.ok) {
                const html = await pageRes.text();
                const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
                    || html.match(/<title>(.*?)<\/title>/i);
                const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
                    || html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

                return {
                    platform: "Loom",
                    title: titleMatch?.[1] || "Video de Loom",
                    description: descMatch?.[1] || "",
                    isAccessible: true,
                };
            }
        } catch (err: any) {
            console.warn("Error fetching Loom page:", err.message);
        }

        return { platform: "Loom", isAccessible: true };
    }

    // 2. YOUTUBE
    const isYouTube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);
    if (isYouTube) {
        let ytTitle: string | undefined;
        let ytAuthor: string | undefined;
        let ytDescription: string | undefined;

        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
            if (res.ok) {
                const data = await res.json();
                ytTitle = data.title;
                ytAuthor = data.author_name;
            }
        } catch (err: any) {
            console.warn("Error fetching YouTube oEmbed:", err.message);
        }

        // Try to fetch YouTube page for og:description
        try {
            const pageRes = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
                signal: AbortSignal.timeout(5000),
            });
            if (pageRes.ok) {
                const html = await pageRes.text();
                const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
                    || html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
                if (descMatch?.[1]) {
                    ytDescription = descMatch[1];
                }
            }
        } catch {}

        return {
            platform: "YouTube",
            title: ytTitle || "Video de YouTube",
            description: ytDescription,
            author: ytAuthor,
            isAccessible: true,
        };
    }

    // 3. VIMEO
    const isVimeo = /vimeo\.com\/(?:video\/)?([0-9]+)/.test(url);
    if (isVimeo) {
        try {
            const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
            const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
            if (res.ok) {
                const data = await res.json();
                const durationSec = typeof data.duration === "number" ? Math.round(data.duration) : undefined;
                const durationFormatted = durationSec
                    ? `${Math.floor(durationSec / 60)} min ${durationSec % 60} s`
                    : undefined;

                return {
                    platform: "Vimeo" as any,
                    title: data.title || "Video de Vimeo",
                    description: data.description || "",
                    duration: durationSec,
                    durationFormatted,
                    author: data.author_name,
                    isAccessible: true,
                };
            }
        } catch (err: any) {
            console.warn("Error fetching Vimeo oEmbed:", err.message);
        }
        return { platform: "Vimeo" as any, isAccessible: true };
    }

    // 3. GOOGLE DRIVE
    const driveMatch = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch) {
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(6000),
            });
            if (res.ok) {
                const html = await res.text();
                const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
                    || html.match(/<title>(.*?)<\/title>/i);
                const cleanTitle = titleMatch?.[1]?.replace(" - Google Drive", "").trim();

                return {
                    platform: "Google Drive",
                    title: cleanTitle || "Archivo en Google Drive",
                    isAccessible: true,
                };
            }
        } catch (err: any) {
            console.warn("Error fetching Google Drive metadata:", err.message);
        }
        return { platform: "Google Drive", isAccessible: true };
    }

    // 4. DIRECT VIDEO / AUDIO
    const isDirectVideo = /\.(mp4|webm|ogg|mov)($|\?)/i.test(url);
    const isDirectAudio = /\.(mp3|wav|ogg|m4a|aac)($|\?)/i.test(url);
    if (isDirectVideo || isDirectAudio) {
        try {
            const headRes = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) });
            return {
                platform: isDirectVideo ? "Direct Video" : "Direct Audio",
                isAccessible: headRes.ok,
            };
        } catch {
            return {
                platform: isDirectVideo ? "Direct Video" : "Direct Audio",
                isAccessible: true,
            };
        }
    }

    // 5. GENERIC URL
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
            const html = await res.text();
            const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
                || html.match(/<title>(.*?)<\/title>/i);
            const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
                || html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

            return {
                platform: "Web Link",
                title: titleMatch?.[1],
                description: descMatch?.[1],
                isAccessible: true,
            };
        }
    } catch {
        // Ignored
    }

    return { platform: "Web Link", isAccessible: true };
}
