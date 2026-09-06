"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { stripEvaluationMetadata } from "@/features/teacher/utils/checklistGradingUtils";
import { cn } from "@/lib/utils";

interface FeedbackViewerProps {
    feedback: string;
    repoUrl?: string;
    configuredPaths?: string | string[];
    preventCopy?: boolean;
}

function buildGitHubFileBlobUrl(repoUrl?: string, filePath?: string): string | null {
    if (!repoUrl || !filePath) return null;
    try {
        const cleanRepo = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
        const match = cleanRepo.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:tree|blob)\/([^/]+))?/);
        if (!match) return null;
        const [, owner, repo, branch] = match;
        const targetBranch = branch || 'main';
        const cleanPath = filePath.trim().replace(/^\//, '');
        return `https://github.com/${owner}/${repo}/blob/${targetBranch}/${cleanPath}`;
    } catch {
        return null;
    }
}

export function FeedbackViewer({ feedback, repoUrl, configuredPaths, preventCopy = false }: FeedbackViewerProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    // Replace literal escaped newlines with actual newlines and strip invisible evaluation metadata
    let formattedFeedback = typeof feedback === 'string' ? stripEvaluationMetadata(feedback.replace(/\\n/g, '\n')) : feedback;

    if (typeof formattedFeedback === 'string') {
        // Fix URLs containing newlines/spaces inside markdown link parentheses: `[label](https://foo \n\n bar)` -> `[label](https://foobar)`
        formattedFeedback = formattedFeedback.replace(/(\]\()([\s\S]*?)(\))/g, (match, p1, p2, p3) => {
            if (p2.includes('http://') || p2.includes('https://') || p2.includes('/')) {
                const cleanedUrl = p2.replace(/[\r\n\s]+/g, '');
                return `${p1}${cleanedUrl}${p3}`;
            }
            return match;
        });

        // Strip legacy API request count strings: `*(Calificado por IA - Peticiones API: N)*` or `*(Peticiones a la API de Gemini: N)*`
        formattedFeedback = formattedFeedback
            .replace(/\n\s*\*\((?:Calificado por IA - )?Peticiones (?:a la API de Gemini|API):?\s*\d+\)\*/gi, '')
            .replace(/\*\((?:Calificado por IA - )?Peticiones (?:a la API de Gemini|API):?\s*\d+\)\*/gi, '');

        formattedFeedback = formattedFeedback
            // Fix double pipes between table rows: `| |` or `||` -> `|\n|`
            .replace(/\|[ \t]*\|/g, '|\n|')
            // Fix glued pipe table rows without newlines: `| ... | [File]` -> `| ... |\n| [File]`
            .replace(/(\|\s*(?:Aprobado|Requiere mejoras|Rechazado|[0-5]\.[0-9]|-\s*))\s+(\|\s*\[)/gi, '$1\n$2')
            // Fix headers attached to table ends
            .replace(/\|\s*(#{1,4}\s)/g, '|\n\n$1')
            .replace(/Evaluado\s+\|\s*(#{1,4}\s)/g, 'Evaluado |\n\n$1')
            // Fix inline headers
            .replace(/([^\n])\s+(#{2,4}\s)/g, '$1\n\n$2')
            // Separate keywords from the headers so they aren't fully bolded
            .replace(/\s*(?:\*\*)?Fortalezas:(?:\*\*)?\s*/gi, '\n\n**Fortalezas:** ')
            .replace(/\s*(?:\*\*)?Áreas de mejora:(?:\*\*)?\s*/gi, '\n\n**Áreas de mejora:** ')
            // Downgrade headers for Nota Final and Recomendaciones to bold text to avoid huge blocks of bold text
            .replace(/#{1,4}\s*(?:\*\*)?Nota Final:(?:\*\*)?\s*/gi, '\n\n**Nota Final:** ')
            .replace(/#{1,4}\s*(?:\*\*)?Recomendaciones:(?:\*\*)?\s*/gi, '\n\n**Recomendaciones:**\n')
            // Fix flattened numbered lists (e.g. ` 1. ` -> `\n1. `)
            .replace(/\s+(\d+\.)\s+/g, '\n$1 ');

        // Auto-link unlinked table file names if repoUrl is present
        if (repoUrl) {
            const cleanRepo = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
            const pathsArray: string[] = Array.isArray(configuredPaths)
                ? configuredPaths
                : typeof configuredPaths === 'string'
                    ? configuredPaths.split(',').map(p => p.trim()).filter(Boolean)
                    : [];

            const findFullPath = (filename: string): string => {
                const cleanName = filename.toLowerCase();
                const found = pathsArray.find(p => {
                    const pLower = p.toLowerCase();
                    return pLower === cleanName || pLower.endsWith('/' + cleanName) || pLower.endsWith('\\' + cleanName);
                });
                return found || filename;
            };

            formattedFeedback = formattedFeedback.replace(
                /^(\|\s*)(?!\[)([\w\-.]+\.(?:java|ts|tsx|js|jsx|py|cpp|c|cs|html|css|json|md|sql))(\s*\|)/gm,
                (match, p1, filename, p3) => {
                    const fullPath = findFullPath(filename);
                    const blobUrl = buildGitHubFileBlobUrl(cleanRepo, fullPath);
                    if (blobUrl) {
                        return `${p1}[${filename}](${blobUrl})${p3}`;
                    }
                    return match;
                }
            );
        }
    }

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const anchor = (e.target as HTMLElement).closest('a');
        if (anchor && anchor.href) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        }
    };

    return (
        <div 
            data-color-mode={mode} 
            onClickCapture={handleContainerClick}
            onCopy={(e) => {
                if (preventCopy) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.clipboardData) {
                        e.clipboardData.clearData();
                    }
                }
            }}
            onCut={(e) => {
                if (preventCopy) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.clipboardData) {
                        e.clipboardData.clearData();
                    }
                }
            }}
            onContextMenu={(e) => {
                if (preventCopy) {
                    e.preventDefault();
                }
            }}
            onKeyDown={(e) => {
                if (preventCopy && (e.ctrlKey || e.metaKey)) {
                    const key = e.key.toLowerCase();
                    if (key === 'c' || key === 'x' || key === 'insert') {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }}
            onDragStart={(e) => {
                if (preventCopy) {
                    e.preventDefault();
                }
            }}
            className={cn(
                "w-full max-w-full overflow-x-auto [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word!",
                preventCopy && "select-none prevent-copy"
            )}
        >
            <MDEditor.Markdown 
                source={formattedFeedback} 
                style={{ background: 'transparent' }}
                disableCopy={preventCopy ? true : undefined}
                components={{
                    a: ({ node, ...props }) => (
                        <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            className="text-primary underline hover:opacity-80 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                        />
                    )
                }}
                rehypeRewrite={(node: any) => {
                    if (node && node.type === 'element' && node.tagName === 'a') {
                        node.properties = node.properties || {};
                        node.properties.target = '_blank';
                        node.properties.rel = 'noopener noreferrer';
                    }
                }}
            />
            <style jsx global>{`
                /* Clean, responsive Markdown Table Styling */
                .wmde-markdown table {
                    display: table !important;
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: auto !important;
                    margin-top: 1rem !important;
                    margin-bottom: 1rem !important;
                    font-size: 0.825rem !important;
                }
                .wmde-markdown table thead {
                    display: table-header-group !important;
                }
                .wmde-markdown table tbody {
                    display: table-row-group !important;
                }
                .wmde-markdown table tr {
                    display: table-row !important;
                    border-bottom: 1px solid var(--border, rgba(120,120,120,0.2)) !important;
                }
                .wmde-markdown table th,
                .wmde-markdown table td {
                    display: table-cell !important;
                    padding: 0.5rem 0.75rem !important;
                    text-align: left !important;
                    word-break: break-word !important;
                    overflow-wrap: anywhere !important;
                    vertical-align: top !important;
                    border: 1px solid var(--border, rgba(120,120,120,0.2)) !important;
                }
                .wmde-markdown table th {
                    font-weight: 700 !important;
                    background-color: var(--muted, rgba(120,120,120,0.1)) !important;
                }
                .wmde-markdown a {
                    word-break: break-all !important;
                    overflow-wrap: anywhere !important;
                    color: var(--primary, #3b82f6) !important;
                    text-decoration: underline !important;
                    text-underline-offset: 2px !important;
                    cursor: pointer !important;
                    transition: opacity 0.2s ease, color 0.2s ease !important;
                }
                .wmde-markdown a:hover {
                    opacity: 0.8 !important;
                    text-decoration: underline !important;
                }
                
                /* Inline code - using primary color from theme */
                .wmde-markdown code {
                    background-color: var(--primary, var(--primary-fallback)) !important;
                    background-color: oklch(from var(--primary) l c h / 0.15) !important;
                    color: var(--primary, var(--primary-fallback)) !important;
                    border: 1px solid var(--primary, var(--primary-fallback)) !important;
                    border: 1px solid oklch(from var(--primary) l c h / 0.3) !important;
                    border-radius: 0.25rem !important;
                    padding: 0.1rem 0.4rem !important;
                    font-size: 0.875em !important;
                    font-weight: 500 !important;
                    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace !important;
                }
                
                /* Code blocks - using muted colors */
                .wmde-markdown pre {
                    background-color: var(--muted, var(--muted-fallback)) !important;
                    border: 1px solid var(--border, var(--border-fallback)) !important;
                    border-radius: 0.5rem !important;
                    padding: 1rem !important;
                }
                
                .wmde-markdown pre code {
                    background-color: transparent !important;
                    color: var(--foreground, var(--foreground-fallback)) !important;
                    border: none !important;
                    padding: 0 !important;
                    font-weight: 400 !important;
                }

                /* Anti-copy protection styles */
                .prevent-copy,
                .prevent-copy * {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }

                .prevent-copy pre,
                .prevent-copy code,
                .prevent-copy pre *,
                .prevent-copy code * {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }

                /* Hide copy buttons in code blocks or headers */
                .prevent-copy button,
                .prevent-copy .copy-code,
                .prevent-copy [class*="copy"],
                .prevent-copy [data-code],
                .prevent-copy [aria-label*="copy" i],
                .prevent-copy [title*="copy" i],
                .prevent-copy [title*="copiar" i] {
                    display: none !important;
                    pointer-events: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            `}</style>
        </div>
    );
}
