"use client";

import dynamic from "next/dynamic";

const CodeAnswerViewer = dynamic(
    () => import("./CodeAnswerViewer").then((mod) => mod.CodeAnswerViewer),
    {
        ssr: false,
        loading: () => (
            <div className="rounded-md border bg-muted p-4 text-sm font-mono animate-pulse h-24" />
        ),
    }
);

interface CodeAnswerViewerWrapperProps {
    code: string;
    language?: string;
}

export function CodeAnswerViewerWrapper({ code, language }: CodeAnswerViewerWrapperProps) {
    return <CodeAnswerViewer code={code} language={language} />;
}
