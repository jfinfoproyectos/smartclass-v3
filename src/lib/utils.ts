import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatName(name: string | undefined | null, profile?: { nombres?: string | null, apellido?: string | null } | null): string {
    const nombres = profile?.nombres?.trim();
    const apellido = profile?.apellido?.trim();
    const baseName = name?.trim();

    let rawName = "";
    if (nombres && apellido) {
        rawName = `${nombres} ${apellido}`;
    } else if (nombres) {
        rawName = nombres;
    } else if (apellido) {
        rawName = apellido;
    } else {
        rawName = baseName || "";
    }

    if (!rawName) return "Sin Nombre";

    return rawName
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getInitials(name: string): string {
    if (!name) return "??";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function normalizeUrl(url: string): string {
    if (!url) return "";
    let trimmed = url.trim();
    
    // Si no tiene protocolo, intentamos agregarlo para que URL() no falle
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = 'https://' + trimmed;
    }

    try {
        const urlObj = new URL(trimmed);
        // Hostnames are case-insensitive
        urlObj.hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        urlObj.protocol = urlObj.protocol.toLowerCase();
        
        // Path and search params are case-sensitive in many services (Drive, GitHub, etc.)
        let normalized = urlObj.href;
        // Remove trailing slash
        normalized = normalized.replace(/\/$/, '');
        return normalized;
    } catch {
        // Fallback for non-standard URLs - NO pasamos a minúsculas porque rompe IDs de Drive/GitHub
        return trimmed.replace(/\/$/, '');
    }
}

/**
 * Robustly extract and normalize any student evidence URL (raw URL, JSON payload, or domain without protocol).
 * Ensures it starts with https:// or http:// so PDF readers and Excel hyperlinks launch properly.
 */
export function formatEvidenceUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let trimmed = rawUrl.trim();
    if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'MANUAL' || trimmed === 'null' || trimmed === 'undefined') {
        return null;
    }

    // Handle JSON payloads (e.g. VideoPitch, AudioDefense, or structured submission objects)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
                const candidate = parsed.videoUrl || parsed.url || parsed.repoUrl || parsed.link || parsed.fileUrl || parsed.evidenceUrl;
                if (candidate && typeof candidate === 'string') {
                    trimmed = candidate.trim();
                } else {
                    return null;
                }
            }
        } catch {
            // Not valid JSON, continue with trimmed string
        }
    }

    if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'MANUAL' || trimmed === 'null' || trimmed === 'undefined') {
        return null;
    }

    // Must not be a markdown statement or sentence with multiple spaces
    if (trimmed.includes(' ') && !/^https?:\/\//i.test(trimmed)) {
        return null;
    }

    // If it already has http:// or https://
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    // If it has domain structure like github.com/..., drive.google.com/..., etc.
    if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    // Fallback: if it has a period, no spaces, and no linebreaks
    if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.includes('\n')) {
        return `https://${trimmed}`;
    }

    return null;
}

export function isValidPdfUrl(url: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    
    // 1. Direct PDF Link (ends with .pdf before query params)
    if (lowerUrl.split('?')[0].endsWith('.pdf')) return true;
    
    // 2. Google Drive (MUST be a file link, NOT a folder link)
    if (lowerUrl.includes('drive.google.com')) {
        // Reject folder links
        if (lowerUrl.includes('/folders/')) return false;
        // Accept common file link patterns
        if (lowerUrl.includes('/file/d/') || lowerUrl.includes('id=')) return true;
        return false;
    }
    
    // 3. OneDrive / SharePoint
    if (lowerUrl.includes('1drv.ms') || lowerUrl.includes('sharepoint.com')) return true;
    
    // 4. Dropbox
    if (lowerUrl.includes('dropbox.com')) return true;
    
    // 5. Box.com
    if (lowerUrl.includes('app.box.com')) {
        if (lowerUrl.includes('/folder/')) return false;
        return true;
    }

    return false;
}
