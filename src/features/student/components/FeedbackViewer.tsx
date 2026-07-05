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

    // Fix AI SDK / Gemini artifacts where newlines were completely stripped into spaces (Invalid JSON generation bug)
    if (typeof formattedFeedback === 'string') {
        formattedFeedback = formattedFeedback
            // Fix tables where newlines became spaces: `| |` -> `|\n|`
            .replace(/\|\s+\|/g, '|\n|')
            // Fix headers attached to table ends
            .replace(/\|\s+(#{1,4}\s)/g, '|\n\n$1')
            .replace(/Evaluado\s+\|\s+(#{1,4}\s)/g, 'Evaluado |\n\n$1')
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
        <div data-color-mode={mode} className="w-full max-w-full overflow-hidden [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_table]:w-full! [&_td]:wrap-break-word!">
            <MDEditor.Markdown source={formattedFeedback} style={{ background: 'transparent' }} />
            <style jsx global>{`
                /* Tables - responsive handling */
                .wmde-markdown table {
                    display: block;
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .wmde-markdown table thead,
                .wmde-markdown table tbody,
                .wmde-markdown table tr {
                    display: table;
                    width: 100%;
                    table-layout: fixed;
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
