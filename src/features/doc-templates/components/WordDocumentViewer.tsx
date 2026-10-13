"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
    ZoomIn, 
    ZoomOut, 
    Maximize2, 
    RotateCcw, 
    FileText, 
    Loader2, 
    AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HighlightVariableItem {
    id: string;
    originalText: string;
    type?: string;
    label?: string;
}

interface WordDocumentViewerProps {
    file: Blob | ArrayBuffer | null;
    highlightVariables?: HighlightVariableItem[];
    onTextSelect?: (selectedText: string) => void;
    onVariableClick?: (variableId: string) => void;
    className?: string;
    showZoomControls?: boolean;
    onLoadSuccess?: () => void;
}

export function WordDocumentViewer({
    file,
    highlightVariables = [],
    onTextSelect,
    onVariableClick,
    className,
    showZoomControls = true,
    onLoadSuccess
}: WordDocumentViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(100);

    // Función para resaltar en el DOM de Word las variables marcadas
    const applyHighlights = () => {
        if (!containerRef.current || highlightVariables.length === 0) return;

        // Primero remover resaltados previos sin destruir el texto
        const prevMarks = containerRef.current.querySelectorAll("mark.docx-var-highlight");
        prevMarks.forEach((mark) => {
            const parent = mark.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
                parent.normalize();
            }
        });

        // Filtrar variables con texto original válido (> 1 caracter)
        const validVars = highlightVariables.filter(v => v.originalText && v.originalText.trim().length > 1);
        if (validVars.length === 0) return;

        // Buscar texto en nodos de texto dentro de .docx-preview-root
        const walker = document.createTreeWalker(
            containerRef.current,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim();
                    if (!text || text.length === 0) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement?.tagName === "SCRIPT" || node.parentElement?.tagName === "STYLE") {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes: Text[] = [];
        let currentNode: Node | null;
        while ((currentNode = walker.nextNode())) {
            textNodes.push(currentNode as Text);
        }

        // Ordenar variables por longitud descendente para evitar colisiones de subcadenas
        const sortedVars = [...validVars].sort((a, b) => b.originalText.length - a.originalText.length);

        for (const textNode of textNodes) {
            let nodeText = textNode.nodeValue || "";
            if (!nodeText) continue;

            for (const v of sortedVars) {
                const target = v.originalText;
                const idx = nodeText.indexOf(target);
                if (idx !== -1) {
                    try {
                        const range = document.createRange();
                        range.setStart(textNode, idx);
                        range.setEnd(textNode, idx + target.length);

                        const mark = document.createElement("mark");
                        mark.className = `docx-var-highlight docx-var-type-${v.type || "text"}`;
                        mark.setAttribute("data-var-id", v.id);
                        mark.setAttribute("title", `Variable: {{${v.id}}} (${v.label || v.id}) - Haz clic para editar`);

                        // Añadir pill flotante con el nombre de la variable
                        const badge = document.createElement("span");
                        badge.className = "docx-var-pill";
                        badge.textContent = `{{${v.id}}}`;
                        mark.appendChild(badge);

                        range.surroundContents(mark);
                        break; // Procesar siguiente nodo
                    } catch {
                        // En caso de corte en límites de elementos DOM complejos, continuar de forma segura
                    }
                }
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        async function renderDocx() {
            if (!file || !containerRef.current) return;

            try {
                setIsLoading(true);
                setError(null);

                // Limpiar renderizado previo
                containerRef.current.innerHTML = "";

                // Importar dinámicamente docx-preview en el cliente
                const docx = await import("docx-preview");

                if (!isMounted || !containerRef.current) return;

                await docx.renderAsync(file, containerRef.current, undefined, {
                    className: "docx-preview-sheet",
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    experimental: true,
                    useBase64URL: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true
                });

                if (isMounted) {
                    setIsLoading(false);
                    // Aplicar resaltados de variables tras finalizar el renderizado
                    setTimeout(() => {
                        applyHighlights();
                    }, 50);
                    onLoadSuccess?.();
                }
            } catch (err: any) {
                console.error("[WordDocumentViewer] Error al renderizar documento:", err);
                if (isMounted) {
                    setError("No se pudo renderizar la vista previa de Word directamente.");
                    setIsLoading(false);
                }
            }
        }

        renderDocx();

        return () => {
            isMounted = false;
        };
    }, [file, onLoadSuccess]);

    // Re-aplicar resaltados cuando cambie la lista de variables
    useEffect(() => {
        if (!isLoading && containerRef.current) {
            applyHighlights();
        }
    }, [highlightVariables, isLoading]);

    const handleMouseUp = (e: React.MouseEvent) => {
        // Si se hizo clic en un resaltado de variable, llamar a onVariableClick
        const target = e.target as HTMLElement;
        const mark = target.closest("mark.docx-var-highlight");
        if (mark) {
            const varId = mark.getAttribute("data-var-id");
            if (varId && onVariableClick) {
                onVariableClick(varId);
                return;
            }
        }

        if (!onTextSelect) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const text = selection.toString().trim();
        if (text && text.length > 0 && text.length < 500) {
            onTextSelect(text);
        }
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 160));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
    const handleZoomReset = () => setZoom(100);
    const handleZoomFit = () => setZoom(75);

    return (
        <div className={cn("flex flex-col h-full min-h-0 rounded-2xl border border-border bg-muted/40 overflow-hidden shadow-inner", className)}>
            {/* Toolbar Superior Estilo Visor Word */}
            {showZoomControls && (
                <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/80 bg-card/80 backdrop-blur-sm text-xs select-none">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-foreground">Vista Previa Real de Microsoft Word</span>
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                            Fiel al Formato Original
                        </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleZoomFit}
                            className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Ajustar al ancho de la pantalla"
                        >
                            Ajustar ancho
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleZoomOut}
                            disabled={zoom <= 50}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Reducir zoom"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </Button>
                        <button 
                            type="button" 
                            onClick={handleZoomReset}
                            className="font-mono text-[11px] font-bold px-2 py-0.5 rounded hover:bg-muted text-foreground cursor-pointer"
                            title="Restablecer 100%"
                        >
                            {zoom}%
                        </button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleZoomIn}
                            disabled={zoom >= 160}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Aumentar zoom"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Contenedor con Scroll de las Hojas de Word */}
            <div 
                className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 flex justify-center items-start relative bg-zinc-200/80 dark:bg-zinc-950/80"
                onMouseUp={handleMouseUp}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs z-10 space-y-2">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-xs font-semibold text-muted-foreground">Renderizando páginas de Word...</p>
                    </div>
                )}

                {error && (
                    <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <p className="font-semibold text-foreground">{error}</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm">
                            El archivo se compilará y descargará correctamente en .docx pero tu navegador no pudo renderizar algunos estilos gráficos.
                        </p>
                    </div>
                )}

                {/* Contenedor del documento renderizado con escala de zoom */}
                <div 
                    style={{ 
                        transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, 
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out"
                    }}
                    className="inline-block mx-auto"
                >
                    <div 
                        ref={containerRef}
                        className="docx-preview-root select-text text-zinc-900"
                    />
                </div>
            </div>

            {/* Inyección de estilos de Word para docx-preview y corrección de tablas */}
            <style jsx global>{`
                .docx-preview-root .docx-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 24px !important;
                }
                .docx-preview-root .docx-preview-sheet {
                    background: #ffffff !important;
                    color: #18181b !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15) !important;
                    border: 1px solid #e4e4e7 !important;
                    border-radius: 2px !important;
                    margin-bottom: 24px !important;
                    box-sizing: border-box !important;
                }

                /* Tablas en Word con ancho y bordes exactos */
                .docx-preview-root table {
                    border-collapse: collapse !important;
                    color: #18181b !important;
                    max-width: 100% !important;
                    table-layout: auto !important;
                    margin-top: 4pt !important;
                    margin-bottom: 8pt !important;
                }

                /* Bordes por defecto de celdas de Word si no fueron sobreescritos */
                .docx-preview-root table td, 
                .docx-preview-root table th {
                    color: #18181b !important;
                    border: 1px solid #000000 !important;
                    padding: 4pt 6pt !important;
                    vertical-align: top !important;
                    box-sizing: border-box !important;
                    word-break: normal !important;
                    overflow-wrap: break-word !important;
                }

                /* Celdas invisibles generadas por docx-preview para placeholders */
                .docx-preview-root table td[style*="border: none"],
                .docx-preview-root table td[style*="border:none"] {
                    border: none !important;
                }

                /* Respetar anchos de columnas colgroup */
                .docx-preview-root colgroup col {
                    box-sizing: border-box !important;
                }

                .docx-preview-root p {
                    margin: 0 !important;
                    min-height: 1em !important;
                    color: inherit !important;
                }

                .docx-preview-root span {
                    color: inherit !important;
                }

                /* Enlaces dentro de tablas o textos */
                .docx-preview-root a {
                    color: #2563eb !important;
                    text-decoration: underline !important;
                    word-break: break-all !important;
                }

                /* Resaltados de variables en el visor Word */
                .docx-preview-root mark.docx-var-highlight {
                    display: inline-flex !important;
                    align-items: center !important;
                    flex-wrap: wrap !important;
                    gap: 3px !important;
                    padding: 1px 4px !important;
                    border-radius: 4px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease-in-out !important;
                    vertical-align: baseline !important;
                    line-height: inherit !important;
                }
                .docx-preview-root mark.docx-var-highlight:hover {
                    filter: brightness(0.92) !important;
                    transform: translateY(-1px) !important;
                }

                /* Resaltado según Tipo de Variable */
                .docx-preview-root mark.docx-var-type-text {
                    background-color: #dbeafe !important; /* blue-100 */
                    color: #1e40af !important; /* blue-800 */
                    border: 1px solid #93c5fd !important; /* blue-300 */
                }
                .docx-preview-root mark.docx-var-type-paragraph {
                    background-color: #f3e8ff !important; /* purple-100 */
                    color: #6b21a8 !important; /* purple-800 */
                    border: 1px solid #d8b4fe !important; /* purple-300 */
                }
                .docx-preview-root mark.docx-var-type-date {
                    background-color: #d1fae5 !important; /* emerald-100 */
                    color: #065f46 !important; /* emerald-800 */
                    border: 1px solid #6ee7b7 !important; /* emerald-300 */
                }
                .docx-preview-root mark.docx-var-type-number {
                    background-color: #fef3c7 !important; /* amber-100 */
                    color: #92400e !important; /* amber-800 */
                    border: 1px solid #fcd34d !important; /* amber-300 */
                }
                .docx-preview-root mark.docx-var-type-select {
                    background-color: #cffafe !important; /* cyan-100 */
                    color: #155e75 !important; /* cyan-800 */
                    border: 1px solid #67e8f9 !important; /* cyan-300 */
                }
                .docx-preview-root mark.docx-var-type-currency_words {
                    background-color: #dcfce7 !important; /* green-100 */
                    color: #166534 !important; /* green-800 */
                    border: 1px solid #86efac !important; /* green-300 */
                }
                .docx-preview-root mark.docx-var-type-signature {
                    background-color: #fae8ff !important; /* fuchsia-100 */
                    color: #86198f !important; /* fuchsia-800 */
                    border: 1px solid #f0abfc !important; /* fuchsia-300 */
                }
                .docx-preview-root mark.docx-var-type-conditional {
                    background-color: #ffedd5 !important; /* orange-100 */
                    color: #9a3412 !important; /* orange-800 */
                    border: 1px solid #fdba74 !important; /* orange-300 */
                }
                .docx-preview-root mark.docx-var-type-dynamic_table {
                    background-color: #ede9fe !important; /* violet-100 */
                    color: #5b21b6 !important; /* violet-800 */
                    border: 1px solid #c4b5fd !important; /* violet-300 */
                }
                .docx-preview-root mark.docx-var-type-date_range {
                    background-color: #ccfbf1 !important; /* teal-100 */
                    color: #115e59 !important; /* teal-800 */
                    border: 1px solid #5eead4 !important; /* teal-300 */
                }
                .docx-preview-root mark.docx-var-type-legal_citation {
                    background-color: #ffe4e6 !important; /* rose-100 */
                    color: #9f1239 !important; /* rose-800 */
                    border: 1px solid #fda4af !important; /* rose-300 */
                }

                /* Badge indicador de la variable */
                .docx-preview-root .docx-var-pill {
                    font-size: 9px !important;
                    font-family: monospace !important;
                    font-weight: 700 !important;
                    padding: 0 4px !important;
                    border-radius: 9999px !important;
                    background: rgba(0, 0, 0, 0.08) !important;
                    margin-left: 2px !important;
                    user-select: none !important;
                }
            `}</style>
        </div>
    );
}
