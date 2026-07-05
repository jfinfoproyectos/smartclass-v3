"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";

loader.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });

interface CodeAnswerViewerProps {
    code: string;
    language?: string;
}

export function CodeAnswerViewer({ code, language = "plaintext" }: CodeAnswerViewerProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Normalize language for Monaco (arduino → cpp)
    const monacoLang = language === "arduino" ? "cpp" : (language || "plaintext");

    // Count lines to set a reasonable auto-height (min 6 lines, max 30)
    const lineCount = Math.min(Math.max((code || "").split("\n").length + 1, 6), 30);
    const editorHeight = lineCount * 20; // ~20px per line

    return (
        <div className="rounded-md border overflow-hidden">
            <Editor
                height={`${editorHeight}px`}
                language={monacoLang}
                value={code || ""}
                theme={mounted && resolvedTheme === "dark" ? "vs-dark" : "light"}
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    fontFamily: "'Fira Code', 'Cascadia Code', 'Monaco', monospace",
                    fontSize: 13,
                    padding: { top: 12, bottom: 12 },
                    folding: false,
                    contextmenu: false,
                    scrollbar: { vertical: "hidden", horizontal: "auto" },
                    overviewRulerLanes: 0,
                    renderLineHighlight: "none",
                    domReadOnly: true,
                    cursorStyle: "line",
                    renderWhitespace: "none",
                }}
            />
        </div>
    );
}
