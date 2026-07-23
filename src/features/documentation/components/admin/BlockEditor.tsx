"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Plus, 
  Eye, 
  Edit3,
  FileText,
  File,
  AlertCircle,
  HelpCircle,
  Code2,
  Heading,
  Link2,
  Copy,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
  Activity,
  ListPlus,
  Play,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Images,
  ListTree,
  Columns,
  Settings,
  ExternalLink,
  GitMerge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BlockRenderer from "../BlockRenderer";
import { Block, markdownToBlocks, blocksToMarkdown, getInitialBlockData } from "./blockEditorUtils";
import { BlockConfigForms } from "./BlockConfigForms";


interface BlockEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  activeTab?: "edit" | "markdown" | "preview";
  onTabChange?: (tab: "edit" | "markdown" | "preview") => void;
}


const blockTypes = [
  { type: "header", label: "Título", icon: Heading },
  { type: "paragraph", label: "Párrafo", icon: FileText },
  { type: "callout", label: "Alerta", icon: AlertCircle },
  { type: "code", label: "Código", icon: Code2 },
  { type: "quiz", label: "Quiz", icon: HelpCircle },
  { type: "card", label: "Link Tarjeta", icon: Link2 },
  { type: "accordion", label: "Acordeón", icon: Layers },
  { type: "featureGrid", label: "Grid Tarjetas", icon: Activity },
  { type: "stepList", label: "Lista Pasos", icon: ListPlus },
  { type: "flashcard", label: "Flashcard", icon: HelpCircle },
  { type: "timeline", label: "Mapa de Ruta", icon: ListTree },
  { type: "matching", label: "Apareamiento", icon: Columns },
  { type: "embed", label: "Código Embebido", icon: ExternalLink },
  { type: "pdf", label: "Visor PDF", icon: File },
  { type: "mermaid", label: "Diagrama Mermaid", icon: GitMerge },
  { type: "table", label: "Tabla GFM", icon: Activity },
  { type: "list", label: "Lista GFM", icon: CheckSquare },
  { type: "image", label: "Imagen GFM", icon: ImageIcon },
  { type: "video", label: "Video Player", icon: Play },
  { type: "carousel", label: "Carrusel", icon: Images },
  { type: "codeExplain", label: "Explicar Código", icon: HelpCircle }
] as const;

export function BlockEditor({ 
  content, 
  onChange, 
  onSave,
  activeTab: controlledTab,
  onTabChange: controlledTabChange
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (!content) return [];
    const trimmed = content.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return JSON.parse(trimmed) as Block[];
      } catch (e) {
        console.error("Error parsing content as JSON, treating as legacy", e);
      }
    }
    // Fallback: Legacy markdown text parsed dynamically into blocks
    return markdownToBlocks(content);
  });
  
  const [localTab, setLocalTab] = useState<"edit" | "markdown" | "preview">("edit");
  const activeTab = controlledTab !== undefined ? controlledTab : localTab;

  const handleTabChange = (newTab: "edit" | "markdown" | "preview") => {
    if (controlledTabChange) {
      controlledTabChange(newTab);
    } else {
      setLocalTab(newTab);
    }
  };

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [markdownText, setMarkdownText] = useState<string>(() => blocksToMarkdown(blocks));
  const [activeInserterIndex, setActiveInserterIndex] = useState<number | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdownSnippet = (before: string, after: string = "", defaultText: string = "") => {
    if (!textareaRef.current) {
      handleMarkdownChange(markdownText + `\n${before}${defaultText}${after}`);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdownText.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;
    const newText = markdownText.substring(0, start) + replacement + markdownText.substring(end);
    
    handleMarkdownChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      }
    }, 0);
  };

  const lastTabRef = React.useRef(activeTab);
  useEffect(() => {
    if (activeTab === lastTabRef.current) return;
    
    if (activeTab === "markdown") {
      setMarkdownText(blocksToMarkdown(blocks));
    } else if (lastTabRef.current === "markdown") {
      const parsedBlocks = markdownToBlocks(markdownText);
      setBlocks(parsedBlocks);
      onChange(JSON.stringify(parsedBlocks));
    }
    
    lastTabRef.current = activeTab;
  }, [activeTab, blocks, markdownText, onChange]);

  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  };

  const handleMarkdownChange = (val: string) => {
    setMarkdownText(val);
    try {
      const parsedBlocks = markdownToBlocks(val);
      setBlocks(parsedBlocks);
      onChange(JSON.stringify(parsedBlocks));
    } catch (e) {
      console.warn("Failed parsing markdown on keystroke:", e);
    }
  };

  const headers = React.useMemo(() => {
    return blocks
      .map((block, index) => {
        if (block.type === "header") {
          return {
            id: block.id,
            title: block.data.title || "",
            level: block.data.level || "h1",
            index
          };
        }
        return null;
      })
      .filter((h): h is { id: string; title: string; level: string; index: number } => h !== null && h.title.trim().length > 0);
  }, [blocks]);

  const getHeaderSlug = (title: string, id: string) => {
    const cleanTitle = title ? title.replace(/[\*_~`#\[\]\(\)]/g, "").trim() : "";
    return cleanTitle ? cleanTitle.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-') : id;
  };

  const scrollToBlock = (blockId: string, slug?: string) => {
    let el = document.getElementById(`block-${blockId}`);
    if (!el && slug) {
      el = document.getElementById(slug);
    }
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/45", "rounded-xl", "transition-all", "duration-300");
      setTimeout(() => {
        if (el) el.classList.remove("ring-2", "ring-primary/45", "rounded-xl");
      }, 1500);
    }
  };

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    updateBlocks(newBlocks);
    if (editingBlockId === id) setEditingBlockId(null);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    updateBlocks(newBlocks);
  };

  const duplicateBlock = (block: Block) => {
    const duplicated: Block = {
      id: Math.random().toString(36).substring(2, 9),
      type: block.type,
      data: JSON.parse(JSON.stringify(block.data))
    };
    const index = blocks.findIndex(b => b.id === block.id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicated);
    updateBlocks(newBlocks);
    setEditingBlockId(duplicated.id);
  };

  const updateBlockData = (id: string, key: string, value: any) => {
    const newBlocks = blocks.map(b => {
      if (b.id === id) {
        return {
          ...b,
          data: {
            ...b.data,
            [key]: value
          }
        };
      }
      return b;
    });
    updateBlocks(newBlocks);
  };

  // Helper methods to modify items inside collections (Accordions, Steps, Grids, Lists, Code Tabs)
  const addCollectionItem = (blockId: string, collectionKey: "items" | "steps" | "tabs", defaultItem: any) => {
    const newBlocks = blocks.map(b => {
      if (b.id === blockId) {
        const arr = [...(b.data[collectionKey] || [])];
        arr.push(defaultItem);
        return {
          ...b,
          data: {
            ...b.data,
            [collectionKey]: arr
          }
        };
      }
      return b;
    });
    updateBlocks(newBlocks);
  };

  const removeCollectionItem = (blockId: string, collectionKey: "items" | "steps" | "tabs", idx: number) => {
    const newBlocks = blocks.map(b => {
      if (b.id === blockId) {
        const arr = [...(b.data[collectionKey] || [])];
        arr.splice(idx, 1);
        return {
          ...b,
          data: {
            ...b.data,
            [collectionKey]: arr
          }
        };
      }
      return b;
    });
    updateBlocks(newBlocks);
  };

  const updateCollectionItemValue = (blockId: string, collectionKey: "items" | "steps" | "tabs", idx: number, key: string, value: any) => {
    const newBlocks = blocks.map(b => {
      if (b.id === blockId) {
        const arr = [...(b.data[collectionKey] || [])];
        arr[idx] = {
          ...arr[idx],
          [key]: value
        };
        return {
          ...b,
          data: {
            ...b.data,
            [collectionKey]: arr
          }
        };
      }
      return b;
    });
    updateBlocks(newBlocks);
  };

  const updateQuizOption = (id: string, optIndex: number, value: string) => {
    const newBlocks = blocks.map(b => {
      if (b.id === id && b.type === "quiz") {
        const newOptions = [...(b.data.options || [])];
        newOptions[optIndex] = value;
        return {
          ...b,
          data: {
            ...b.data,
            options: newOptions
          }
        };
      }
      return b;
    });
    updateBlocks(newBlocks);
  };

  const insertBlockAtIndex = (index: number, type: Block["type"]) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      data: getInitialBlockData(type)
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    updateBlocks(newBlocks);
    setEditingBlockId(newBlock.id);
  };


  const getBlockHeaderLabel = (block: Block) => {
    switch (block.type) {
      case "header": return `Título (${block.data.level?.toUpperCase() || "H1"}) - ${block.data.title || ""}`;
      case "paragraph": return `Texto - ${block.data.text ? block.data.text.substring(0, 40) + "..." : ""}`;
      case "callout": return `Alerta (${block.data.style || "info"}) - ${block.data.title || ""}`;
      case "code": return `Código (${block.data.language || "js"}) - ${block.data.title || "Sin título"}`;
      case "quiz": return `Quiz - ${block.data.question || ""}`;
      case "card": return `Enlace Tarjeta - ${block.data.title || ""}`;
      case "accordion": return `FAQ / Acordeón - ${block.data.items?.length || 0} ítems`;
      case "featureGrid": return `Grid de Características - ${block.data.items?.length || 0} tarjetas`;
      case "stepList": return `Lista de Pasos - ${block.data.steps?.length || 0} pasos`;
      case "flashcard": {
        const cardsCount = block.data.cards?.length || (block.data.frontText ? 1 : 0);
        return `Flashcard - Deck de ${cardsCount} tarjeta(s)`;
      }
      case "timeline": return `Mapa de Ruta - ${block.data.items?.length || 0} hitos`;
      case "matching": return `Apareamiento - ${block.data.pairs?.length || 0} parejas`;
      case "embed": return `Código Embebido - ${block.data.url || ""}`;
      case "pdf": return `Visor PDF - ${block.data.title || block.data.url || ""}`;
      case "mermaid": return "Diagrama / Flujo Mermaid";
      case "aiPrompt": return `AI Prompt Helper - ${block.data.promptText || ""}`;
      case "table": return `Tabla de Datos - ${block.data.headers?.length || 0} columnas`;
      case "list": return `Lista Viñetas/Tareas - ${block.data.items?.length || 0} elementos`;
      case "image": return `Imagen Card - ${block.data.alt || block.data.url || ""}`;
      case "video": return `Video Player - ${block.data.caption || block.data.url || ""}`;
      case "carousel": return `Carrusel de Imágenes - ${block.data.items?.length || 0} fotos`;
      case "codeExplain": return `Explicación de Código - ${block.data.steps?.length || 0} pasos`;
    }
  };

  const getBlockIcon = (type: Block["type"]) => {
    switch (type) {
      case "header": return Heading;
      case "paragraph": return FileText;
      case "callout": return AlertCircle;
      case "code": return Code2;
      case "quiz": return HelpCircle;
      case "card": return Link2;
      case "accordion": return Layers;
      case "featureGrid": return Activity;
      case "stepList": return ListPlus;
      case "flashcard": return HelpCircle;
      case "timeline": return ListTree;
      case "matching": return Columns;
      case "embed": return ExternalLink;
      case "pdf": return File;
      case "mermaid": return GitMerge;
      case "aiPrompt": return Sparkles;
      case "table": return Activity;
      case "list": return CheckSquare;
      case "image": return ImageIcon;
      case "video": return Play;
      case "carousel": return Images;
      case "codeExplain": return HelpCircle;
      case "divider": return Activity;
      default: return FileText;
    }
  };

  const BlockInserter = ({ targetIndex }: { targetIndex: number }) => {
    return (
      <div className="relative flex items-center justify-center my-4 group">
        <div className="absolute inset-x-0 h-px bg-border/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        <button
          onClick={() => setActiveInserterIndex(activeInserterIndex === targetIndex ? null : targetIndex)}
          className="relative z-10 w-7 h-7 rounded-full bg-background border border-border hover:bg-primary hover:border-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-all duration-300 cursor-pointer"
          title="Insertar bloque aquí"
        >
          <Plus className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {activeInserterIndex === targetIndex && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActiveInserterIndex(null)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute z-50 mt-10 w-80 bg-background border border-border/80 rounded-2xl shadow-xl p-3 grid grid-cols-3 gap-2"
              >
                {blockTypes.map(bt => (
                  <button
                    key={bt.type}
                    onClick={() => {
                      insertBlockAtIndex(targetIndex, bt.type);
                      setActiveInserterIndex(null);
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all gap-1 text-[8px] font-black uppercase tracking-wider text-center"
                  >
                    <bt.icon className="w-4 h-4 text-primary/75" />
                    <span>{bt.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 dark:bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-inner-sm font-sans relative">

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Canvas Area */}
        <div className={cn("flex-1 custom-scrollbar bg-grid-pattern/30", activeTab === "markdown" ? "flex flex-col h-full min-h-0 overflow-hidden p-4" : "overflow-y-auto p-6")}>
          {activeTab === "markdown" ? (
            <div className="space-y-4 w-full max-w-7xl mx-auto px-2 sm:px-4 flex-1 h-full min-h-0 flex flex-col">
              {/* Header & GFM Formatting Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/60 p-2.5 rounded-2xl shadow-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10">
                    <FileText className="w-3.5 h-3.5" />
                    Edición Rápida (Sintaxis GFM)
                  </span>
                </div>

                {/* Quick Insert Snippet Toolbar */}
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold font-mono" onClick={() => insertMarkdownSnippet("# ", "", "Título H1")} title="Título 1 (#)">H1</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold font-mono" onClick={() => insertMarkdownSnippet("## ", "", "Subtítulo H2")} title="Título 2 (##)">H2</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold font-mono" onClick={() => insertMarkdownSnippet("### ", "", "Tema H3")} title="Título 3 (###)">H3</Button>
                  <div className="h-4 w-px bg-border/60 mx-1" />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold font-mono" onClick={() => insertMarkdownSnippet("**", "**", "negrita")} title="Negrita (**texto**)"><b>B</b></Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono" onClick={() => insertMarkdownSnippet("*", "*", "cursiva")} title="Cursiva (*texto*)"><i>I</i></Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono" onClick={() => insertMarkdownSnippet("~~", "~~", "tachado")} title="Tachado (~~texto~~)"><span className="line-through">S</span></Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono" onClick={() => insertMarkdownSnippet("`", "`", "código")} title="Código Inline (`código`)">`code`</Button>
                  <div className="h-4 w-px bg-border/60 mx-1" />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => insertMarkdownSnippet("> [!NOTE]\n> ", "", "Nota informativa...")} title="Alerta Nota (> [!NOTE])">Nota</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => insertMarkdownSnippet("> [!WARNING]\n> ", "", "Advertencia importante...")} title="Alerta Advertencia (> [!WARNING])">Alerta</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => insertMarkdownSnippet("| Cabecera 1 | Cabecera 2 |\n| --- | --- |\n| Celda A1 | Celda A2 |\n", "")} title="Tabla GFM">Tabla</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => insertMarkdownSnippet("```kotlin\n", "\n```", "// Código aquí")} title="Bloque Código (```)">```</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold" onClick={() => insertMarkdownSnippet("\n---\n", "")} title="Línea Divisoria (---)">---</Button>
                </div>
              </div>

              {/* Full Width Editor Textarea */}
              <Textarea
                ref={textareaRef}
                value={markdownText}
                onChange={e => handleMarkdownChange(e.target.value)}
                className="flex-1 min-h-0 w-full rounded-2xl border border-border/80 bg-background font-mono text-xs leading-relaxed p-6 text-foreground focus-visible:ring-primary/30 custom-scrollbar select-text resize-none shadow-sm cursor-text"
                placeholder="# Escribe tu documentación aquí en formato GFM..."
              />
            </div>
          ) : activeTab === "edit" ? (
            <div className="space-y-4 w-full max-w-7xl mx-auto px-4">
              <BlockInserter targetIndex={0} />
              
              {blocks.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/80 rounded-2xl bg-muted/5 flex flex-col items-center justify-center space-y-4">
                  <FileText className="w-12 h-12 text-muted-foreground opacity-20" />
                  <h3 className="text-lg font-bold text-foreground">Documento Vacío</h3>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Comienza agregando componentes interactivos con el catálogo de herramientas de abajo o haciendo clic en el botón "+" redondo.
                  </p>
                </div>
              ) : (
                <motion.div layout className="space-y-4">
                  {blocks.map((block, index) => {
                    const isEditing = editingBlockId === block.id;

                    return (
                      <div key={block.id} id={`block-${block.id}`}>
                        <motion.div 
                          layoutId={block.id}
                          className={cn(
                            "relative border border-border/25 hover:border-primary/30 bg-card rounded-2xl transition-all duration-300 shadow-sm overflow-hidden group/card"
                          )}
                        >
                          {/* Floating Control Bar */}
                          <div className="absolute top-1.5 right-3 z-30 flex items-center gap-1 bg-background border border-border/40 shadow-sm rounded-xl px-2 py-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                            <button 
                              onClick={() => setEditingBlockId(block.id)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                              title="Configurar bloque"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              disabled={index === 0}
                              onClick={() => moveBlock(index, "up")}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Subir"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              disabled={index === blocks.length - 1}
                              onClick={() => moveBlock(index, "down")}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Bajar"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => duplicateBlock(block)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Duplicar"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => deleteBlock(block.id)}
                              className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Visual Badge Header */}
                          <div className="px-5 py-2 flex items-center gap-2.5 bg-muted/10 border-b border-border/10">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary select-none">
                              #{index + 1}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                              {getBlockHeaderLabel(block)}
                            </span>
                          </div>

                          {/* Rendered Block Body (WYSIWYG) */}
                          <div className="p-6 bg-background/5">
                            <BlockRenderer content={JSON.stringify([block])} />
                          </div>
                        </motion.div>
                        
                        <BlockInserter targetIndex={index + 1} />
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-7xl mx-auto py-4 border border-border/50 rounded-2xl bg-card/15 p-8 shadow-sm">
              <BlockRenderer content={JSON.stringify(blocks)} />
            </div>
          )}
        </div>

        {/* Right Table of Contents (TOC) */}
        {isTocOpen && (activeTab === "edit" || activeTab === "preview") && headers.length > 0 && (
          <div className="hidden lg:flex w-60 border-l border-border/40 bg-card/10 backdrop-blur-xs flex-col p-5 shrink-0 overflow-y-auto custom-scrollbar select-none animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <ListTree className="w-3.5 h-3.5 text-primary" />
                Contenidos
              </h4>
              <button 
                onClick={() => setIsTocOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Contraer Tabla de Contenidos"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {headers.map(h => (
                <button
                  key={h.id}
                  onClick={() => scrollToBlock(h.id, getHeaderSlug(h.title, h.id))}
                  className={cn(
                    "w-full text-left text-xs font-semibold py-1 rounded transition-all block leading-snug cursor-pointer",
                    h.level === "h1" ? "pl-0 text-foreground/90 font-bold" : "",
                    h.level === "h2" ? "pl-3 text-muted-foreground hover:text-foreground border-l border-border/60" : "",
                    h.level === "h3" ? "pl-6 text-muted-foreground/80 hover:text-foreground border-l border-border/45" : "",
                    "hover:text-primary transition-all hover:translate-x-0.5 transform duration-200"
                  )}
                >
                  {h.title.replace(/[\*_~`]/g, "")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Floating TOC Trigger (when collapsed) */}
        {!isTocOpen && (activeTab === "edit" || activeTab === "preview") && headers.length > 0 && (
          <button
            onClick={() => setIsTocOpen(true)}
            className="absolute right-4 top-4 z-40 p-2 rounded-full bg-background border border-border shadow-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center animate-in fade-in duration-300"
            title="Mostrar Tabla de Contenidos"
          >
            <ListTree className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={editingBlockId !== null} onOpenChange={open => !open && setEditingBlockId(null)}>
        <DialogContent className={cn(
          "h-[85vh] flex flex-col rounded-2xl border border-border bg-background p-0 overflow-hidden shadow-2xl transition-all duration-300",
          (() => {
            const editingBlock = blocks.find(b => b.id === editingBlockId);
            return (editingBlock?.type === "code" || editingBlock?.type === "codeExplain") ? "md:max-w-5xl sm:max-w-3xl" : "sm:max-w-3xl";
          })()
        )}>
          {(() => {
            const currentBlock = blocks.find(b => b.id === editingBlockId);
            if (!currentBlock) return null;
            const Icon = getBlockIcon(currentBlock.type);
            return (
              <>
                <div className="p-6 border-b border-border/40 shrink-0">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      Configurar {getBlockHeaderLabel(currentBlock)}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Modifica los campos del componente visual. Los cambios se aplicarán de inmediato.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/40">
                  {/* Left Column: Config Form (scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background/50">
                  <BlockConfigForms
                    currentBlock={currentBlock}
                    updateBlockData={updateBlockData}
                    addCollectionItem={addCollectionItem}
                    removeCollectionItem={removeCollectionItem}
                    updateCollectionItemValue={updateCollectionItemValue}
                    updateQuizOption={updateQuizOption}
                  />
                  </div>

                  {/* Right Column: Live Preview (sticky/fixed height) */}
                  {(currentBlock.type === "code" || currentBlock.type === "codeExplain") && (
                    <div className="w-full md:w-[45%] overflow-y-auto p-6 bg-muted/5 border-t md:border-t-0 border-border/40 custom-scrollbar flex flex-col gap-4 select-text">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5 shrink-0 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Vista Previa en Tiempo Real
                      </h4>
                      <div className="flex-1 border border-border/30 rounded-2xl p-4 bg-background shadow-inner-sm min-h-[300px]">
                        <BlockRenderer content={JSON.stringify([currentBlock])} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-border/40 bg-muted/10 shrink-0">
                  <DialogFooter className="flex items-center justify-end">
                    <Button onClick={() => setEditingBlockId(null)} className="font-bold rounded-xl h-10 px-6 shadow-sm">
                      Listo
                    </Button>
                  </DialogFooter>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
