"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

interface MdxEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export interface MdxEditorHandle {
  handleFormat: (prefix: string, suffix?: string, placeholder?: string) => void;
  handleLineFormat: (prefix: string) => void;
  handleInsert: (text: string) => void;
}

export const MdxEditor = forwardRef<MdxEditorHandle, MdxEditorProps>(
  ({ content, onChange, onSave }, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    useImperativeHandle(ref, () => ({
      handleFormat,
      handleLineFormat,
      handleInsert,
    }));

    const handleEditorDidMount: OnMount = (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Forzar el esquema de colores en el nodo DOM del editor para corregir el puntero del mouse blanco en Windows/Chrome
      const domNode = editor.getDomNode();
      if (domNode) {
        domNode.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
      }

      // Atajos de Teclado
      editor.addAction({
        id: "format-bold",
        label: "Negrita",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
        run: () => {
          handleFormat("**", "**", "texto");
        }
      });

      editor.addAction({
        id: "format-italic",
        label: "Itálica",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
        run: () => {
          handleFormat("*", "*", "texto");
        }
      });

      editor.addAction({
        id: "format-code",
        label: "Código Inline",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
        run: () => {
          handleFormat("`", "`", "codigo");
        }
      });

      editor.addAction({
        id: "format-h1",
        label: "Encabezado 1",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Digit1],
        run: () => {
          handleLineFormat("# ");
        }
      });

      editor.addAction({
        id: "format-h2",
        label: "Encabezado 2",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Digit2],
        run: () => {
          handleLineFormat("## ");
        }
      });

      editor.addAction({
        id: "format-h3",
        label: "Encabezado 3",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Digit3],
        run: () => {
          handleLineFormat("### ");
        }
      });

      if (onSave) {
        editor.addAction({
          id: "save-document",
          label: "Guardar",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => {
            onSave();
          }
        });
      }
    };

    useEffect(() => {
      if (editorRef.current && editorContainerRef.current) {
        const resizeObserver = new ResizeObserver(() => {
          editorRef.current?.layout();
        });
        resizeObserver.observe(editorContainerRef.current);
        
        // Actualizar el esquema de colores si cambia el tema
        const domNode = editorRef.current.getDomNode();
        if (domNode) {
          domNode.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
        }

        return () => resizeObserver.disconnect();
      }
    }, [mounted, resolvedTheme]);

    const handleFormat = (prefix: string, suffix: string = "", placeholder: string = "") => {
      if (!editorRef.current || !monacoRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const selection = editor.getSelection();
      if (!selection) return;
      const model = editor.getModel();
      if (!model) return;
      const selectedText = model.getValueInRange(selection) || "";
      let newText = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${placeholder}${suffix}`;
      const range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
      editor.executeEdits("format", [{ range, text: newText, forceMoveMarkers: true }]);
      if (!selectedText && placeholder) {
        const startLine = selection.startLineNumber;
        const startCol = selection.startColumn + prefix.length;
        editor.setSelection(new monaco.Selection(startLine, startCol, startLine, startCol + placeholder.length));
      }
      editor.focus();
    };

    const handleLineFormat = (prefix: string) => {
      if (!editorRef.current || !monacoRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const selection = editor.getSelection();
      if (!selection) return;
      const model = editor.getModel();
      if (!model) return;
      const edits: any[] = [];
      for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
        edits.push({ range: new monaco.Range(i, 1, i, 1), text: prefix, forceMoveMarkers: true });
      }
      editor.executeEdits("line-format", edits);
      editor.focus();
    };

    const handleInsert = (text: string) => {
      if (!editorRef.current || !monacoRef.current) return;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const selection = editor.getSelection();
      if (!selection) return;
      editor.executeEdits("assistant-insert", [{
        range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
        text,
        forceMoveMarkers: true,
      }]);
      editor.focus();
    };

    if (!mounted) return null;

    return (
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-background">
        <div 
          ref={editorContainerRef} 
          className="flex-1 w-full min-h-0 relative overflow-hidden bg-background text-foreground"
          style={{ colorScheme: resolvedTheme === "dark" ? "dark" : "light" }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .monaco-editor .cursor {
              background-color: var(--primary) !important;
              border-color: var(--primary) !important;
              color: var(--primary) !important;
            }
            /* Asegurar que el puntero del mouse sea visible */
            .monaco-editor .view-lines {
              cursor: text !important;
            }
          ` }} />
          <div className="absolute inset-0">
            <Editor
              height="100%"
              width="100%"
              defaultLanguage="markdown"
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              value={content}
              onChange={(value) => onChange(value || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                lineNumbers: "on",
                folding: true,
                glyphMargin: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 24, bottom: 24 },
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, comments: false, strings: true },
                acceptSuggestionOnEnter: "on",
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                  useShadows: false,
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12,
                },
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                renderLineHighlight: "all",
                smoothScrolling: true,
                cursorStyle: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                stickyScroll: { enabled: false },
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

MdxEditor.displayName = "MdxEditor";
