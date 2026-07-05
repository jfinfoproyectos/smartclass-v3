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
