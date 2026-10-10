"use client";

import React, { useMemo, useRef, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";

// Configurar Monaco para usar CDN de Cloudflare para autocompletado y workers
loader.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

let monacoCompletionsRegistered = false;

export interface CodeAnswerEditorProps {
    questionId: string;
    language: string;
    initialValue: string;
    onAnswerChange: (val: string) => void;
    onSaveCurrent: () => void;
    disabled?: boolean;
    zoomLevel?: number;
    theme?: string;
    editorRef?: React.MutableRefObject<any>;
    isActiveTab?: boolean;
}

export const CodeAnswerEditor = React.memo(function CodeAnswerEditor({
    questionId,
    language,
    initialValue,
    onAnswerChange,
    onSaveCurrent,
    disabled = false,
    zoomLevel = 1.0,
    theme = "light",
    editorRef,
    isActiveTab = true,
}: CodeAnswerEditorProps) {
    const localEditorRef = useRef<any>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastValueRef = useRef<string>(initialValue);

    // Opciones estables y memoizadas para evitar llamadas repetitivas a updateOptions
    const options = useMemo(() => {
        const integerFontSize = Math.max(10, Math.round(14 * (zoomLevel || 1.0)));
        return {
            fontSize: integerFontSize,
            minimap: { enabled: false },
            lineNumbers: "on" as const,
            scrollBeyondLastLine: false,
            wordWrap: "on" as const,
            // Pila de fuentes monoespaciadas nativas del sistema con métricas idénticas y 0ms de carga
            fontFamily: "Consolas, 'Courier New', Menlo, Monaco, monospace",
            fontWeight: "normal" as const,
            fontLigatures: false,
            padding: { top: 16, bottom: 16 },
            readOnly: disabled,
            contextmenu: true,
            copyWithSyntaxHighlighting: false,
            automaticLayout: true,
            accessibilitySupport: "off" as const,
            unicodeHighlight: { ambiguousCharacters: false },
            acceptSuggestionOnEnter: "off" as const,
            tabCompletion: "off" as const,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
            },
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: "currentDocument" as const,
            dragAndDrop: true,
            formatOnPaste: true,
        };
    }, [zoomLevel, disabled]);

    // Limpieza o descarga del debounce al desmontar
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                onAnswerChange(lastValueRef.current);
            }
        };
    }, [onAnswerChange]);

    // Recalcular layout cuando la pestaña 'Tu Respuesta' pasa a estar visible
    useEffect(() => {
        if (isActiveTab && localEditorRef.current) {
            const timer = setTimeout(() => {
                localEditorRef.current?.layout();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isActiveTab]);

    const handleChange = (value: string | undefined) => {
        const val = value || "";
        lastValueRef.current = val;

        // Escritura fluida en Monaco (0ms latencia) y propagación debounced al estado del examen
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            onAnswerChange(val);
        }, 300);
    };

    const handleMount = (editor: any, monaco: any) => {
        localEditorRef.current = editor;
        if (editorRef) {
            editorRef.current = editor;
        }

        // Remedición inmediata de métricas de fuentes y suscripción a fonts.ready
        if (monaco?.editor?.remeasureFonts) {
            monaco.editor.remeasureFonts();
        }
        if (typeof document !== "undefined" && "fonts" in document) {
            document.fonts.ready.then(() => {
                try {
                    monaco?.editor?.remeasureFonts?.();
                    editor?.layout();
                } catch {}
            }).catch(() => {});
        }

        // Forzar ajuste de layout tras montaje en el DOM
        setTimeout(() => {
            try {
                editor?.layout();
            } catch {}
        }, 100);

        // Registro de autocompletado pedagógico una sola vez en la sesión
        if (!monacoCompletionsRegistered) {
            monacoCompletionsRegistered = true;
            const registerCompletions = (langId: string, keywords: string[], builtins: string[]) => {
                monaco.languages.registerCompletionItemProvider(langId, {
                    provideCompletionItems: (model: any, position: any) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn,
                        };
                        const suggestions = [
                            ...keywords.map((kw: string) => ({
                                label: kw,
                                kind: monaco.languages.CompletionItemKind.Keyword,
                                insertText: kw,
                                range: range,
                            })),
                            ...builtins.map((bi: string) => ({
                                label: bi,
                                kind: monaco.languages.CompletionItemKind.Function,
                                insertText: bi,
                                range: range,
                            })),
                        ];
                        return { suggestions };
                    },
                });
            };

            // Python
            registerCompletions('python',
                ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'pass', 'break', 'continue', 'and', 'or', 'not', 'is', 'in', 'None', 'True', 'False'],
                ['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'enumerate', 'zip', 'map', 'filter', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'any', 'all', 'input', 'open', 'type', 'isinstance', 'help']
            );

            // Arduino / C++
            registerCompletions('cpp',
                ['void', 'int', 'float', 'double', 'char', 'long', 'unsigned', 'const', 'static', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'class', 'public', 'private', 'protected', 'virtual', 'override', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false'],
                ['setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'millis', 'micros', 'Serial.begin', 'Serial.print', 'Serial.println', 'Serial.available', 'Serial.read', 'attachInterrupt', 'detachInterrupt', 'bitRead', 'bitWrite', 'abs', 'min', 'max', 'map', 'constrain']
            );

            // Java
            registerCompletions('java',
                ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'new', 'this', 'super', 'import', 'package', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'instanceof', 'void', 'int', 'boolean', 'double', 'float', 'long', 'char', 'byte', 'short', 'true', 'false', 'null'],
                ['System.out.println', 'System.out.print', 'Scanner', 'ArrayList', 'HashMap', 'String.valueOf', 'Integer.parseInt', 'Math.max', 'Math.min', 'Math.sqrt', 'Math.pow']
            );

            // C#
            registerCompletions('csharp',
                ['using', 'namespace', 'class', 'public', 'private', 'protected', 'internal', 'static', 'void', 'int', 'string', 'bool', 'double', 'float', 'long', 'char', 'decimal', 'var', 'new', 'this', 'return', 'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'task', 'true', 'false', 'null'],
                ['Console.WriteLine', 'Console.ReadLine', 'List', 'Dictionary', 'Math.Max', 'Math.Min', 'String.Format', 'int.Parse', 'double.Parse']
            );

            // PHP
            registerCompletions('php',
                ['echo', 'print', 'if', 'else', 'elseif', 'foreach', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'function', 'class', 'public', 'private', 'protected', 'static', 'global', 'return', 'new', 'try', 'catch', 'finally', 'throw', 'array', 'true', 'false', 'null'],
                ['count', 'strlen', 'array_push', 'array_pop', 'array_merge', 'json_encode', 'json_decode', 'isset', 'empty', 'die', 'exit', 'str_replace', 'substr', 'explode', 'implode']
            );

            // SQL
            registerCompletions('sql',
                ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'INTO', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'VALUES'],
                ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'DATE', 'CONCAT', 'SUBSTR', 'LENGTH', 'UPPER', 'LOWER', 'ROUND']
            );
        }

        // Restricción de portapapeles
        const overwriteMonacoClipboard = () => {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText("No está permitido pegar contenido externo.").catch(() => {});
            }
        };
        editor.onDidFocusEditorText(overwriteMonacoClipboard);
        editor.onDidFocusEditorWidget(overwriteMonacoClipboard);

        // Guardado de borrador cuando pierde el foco
        editor.onDidBlurEditorText(() => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            const val = editor.getValue();
            lastValueRef.current = val;
            onAnswerChange(val);
            onSaveCurrent();
        });
    };

    const monacoLang = language === "arduino" ? "cpp" : (language || "javascript");

    return (
        <Editor
            key={questionId}
            height="100%"
            width="100%"
            language={monacoLang}
            theme={theme}
            defaultValue={initialValue}
            onChange={handleChange}
            options={options}
            onMount={handleMount}
        />
    );
});
