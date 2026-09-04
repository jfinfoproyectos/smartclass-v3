"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

interface FeedbackViewerProps {
    feedback: string;
}

export function FeedbackViewer({ feedback }: FeedbackViewerProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const mode = mounted ? (resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "auto") : "light";

    // Replace literal escaped newlines with actual newlines
    let formattedFeedback = typeof feedback === 'string' ? feedback.replace(/\\n/g, '\n') : feedback;

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
    }

    return (
        <div data-color-mode={mode} className="w-full max-w-full overflow-x-auto [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word!">
            <MDEditor.Markdown source={formattedFeedback} style={{ background: 'transparent' }} />
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
                .wmde-markdown table a {
                    word-break: break-all !important;
                    overflow-wrap: anywhere !important;
                    color: var(--primary, #3b82f6) !important;
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
            `}</style>
        </div>
    );
}
