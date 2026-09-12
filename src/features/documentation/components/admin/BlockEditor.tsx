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
  GitMerge,
  MessageSquare,
  Search
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { AIGenerateDialog } from "@/features/teacher/components/AIGenerateDialog";
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

  const { theme, resolvedTheme } = useTheme();
  const mode = (resolvedTheme || theme) === "dark" ? "dark" : "light";
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [aiInitialContent, setAiInitialContent] = useState<string | undefined>(undefined);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [markdownText, setMarkdownText] = useState<string>(() => blocksToMarkdown(blocks));
  const [activeInserterIndex, setActiveInserterIndex] = useState<number | null>(null);
  const [componentSearch, setComponentSearch] = useState("");
  const [isTocOpen, setIsTocOpen] = useState(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const filteredBlockTypes = blockTypes.filter(bt => 
    bt.label.toLowerCase().includes(componentSearch.toLowerCase()) ||
    bt.type.toLowerCase().includes(componentSearch.toLowerCase())
  );

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


  const getBlockTypeName = (type: Block["type"]) => {
    switch (type) {
      case "header": return "Título";
      case "paragraph": return "Párrafo";
      case "callout": return "Alerta / Callout";
      case "code": return "Bloque de Código";
      case "quiz": return "Quiz Interactivo";
      case "card": return "Enlace Tarjeta";
      case "accordion": return "FAQ / Acordeón";
      case "featureGrid": return "Grid de Características";
      case "stepList": return "Lista de Pasos";
      case "flashcard": return "Flashcard";
      case "timeline": return "Mapa de Ruta";
      case "matching": return "Apareamiento";
      case "embed": return "Código Embebido";
      case "pdf": return "Visor PDF";
      case "mermaid": return "Diagrama Mermaid";
      case "aiPrompt": return "AI Prompt Helper";
      case "table": return "Tabla de Datos";
      case "list": return "Lista / Tareas";
      case "image": return "Imagen";
      case "video": return "Video Player";
      case "carousel": return "Carrusel de Fotos";
      case "codeExplain": return "Explicar Código";
      default: return "Elemento";
    }
  };

  const getBlockSummary = (block: Block) => {
    switch (block.type) {
      case "header": 
        return `${block.data.level?.toUpperCase() || "H1"} — ${block.data.title || "Sin título"}`;
      case "paragraph": 
        return block.data.text ? block.data.text.replace(/\n+/g, ' ').substring(0, 80) : "Sin contenido de texto";
      case "callout": 
        return `${block.data.style || "info"}: ${block.data.title || block.data.text || "Alerta"}`;
      case "code": 
        return `${block.data.language || "js"}: ${block.data.title || "Código"}`;
      case "quiz": 
        return block.data.question || "Pregunta de evaluación";
      case "card": 
        return block.data.title || block.data.url || "Enlace";
      case "accordion": 
        return `${block.data.items?.length || 0} secciones plegables`;
      case "featureGrid": 
        return `${block.data.items?.length || 0} tarjetas`;
      case "stepList": 
        return `${block.data.steps?.length || 0} pasos`;
      case "flashcard": 
        return `${block.data.cards?.length || (block.data.frontText ? 1 : 0)} tarjeta(s)`;
      case "timeline": 
        return `${block.data.items?.length || 0} hitos`;
      case "matching": 
        return `${block.data.pairs?.length || 0} parejas`;
      case "embed": 
        return block.data.url || "URL embebida";
      case "pdf": 
        return block.data.title || block.data.url || "Documento PDF";
      case "mermaid": 
        return block.data.title || "Diagrama de flujo";
      case "table": 
        return `${block.data.headers?.length || 0} columnas`;
      case "list": 
        return `${block.data.items?.length || 0} elementos`;
      case "image": 
        return block.data.alt || block.data.url || "Imagen";
      case "video": 
        return block.data.caption || block.data.url || "Video";
      case "carousel": 
        return `${block.data.items?.length || 0} diapositivas`;
      case "codeExplain": 
        return `${block.data.steps?.length || 0} pasos`;
      default: 
        return "";
    }
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                setComponentSearch("");
                setActiveInserterIndex(targetIndex);
              }}
              className="relative z-10 w-7 h-7 rounded-full bg-background border border-border hover:bg-primary hover:border-primary text-muted-foreground hover:text-primary-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-all duration-300 cursor-pointer"
              aria-label="Insertar componente aquí"
            >
              <Plus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Insertar componente aquí</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 dark:bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-inner-sm font-sans relative">

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Canvas Area */}
        <div className={cn("flex-1 custom-scrollbar bg-grid-pattern/30", activeTab === "markdown" ? "flex flex-col h-full min-h-0 overflow-hidden p-4" : "overflow-y-auto p-6")}>
          {activeTab === "markdown" ? (
            <div className="flex flex-col h-full min-h-0 overflow-hidden space-y-2.5 w-full max-w-7xl mx-auto px-1 sm:px-2 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 px-1 pt-0.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Contenido de la Lección (Markdown)
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Escribe o genera el contenido de este documento con formato Markdown estándar y previsualización en vivo sincronizada.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setAiInitialContent(undefined);
                      setIsAIGeneratorOpen(true);
                    }}
                    className="h-8 text-xs font-semibold gap-1.5 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary text-primary-foreground shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Generar Contenido con IA</span>
                    <span className="sm:hidden">Generar con IA</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAiInitialContent(markdownText);
                      setIsAIGeneratorOpen(true);
                    }}
                    disabled={!markdownText || markdownText.trim().length < 10}
                    className="h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs"
                    title="Toma el contenido actual de la lección y abre el chat de IA para redactarlo, enriquecerlo o mejorarlo interactivamente"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="hidden sm:inline">Modificar con Chat IA</span>
                    <span className="sm:hidden">Chat IA</span>
                  </Button>
                  <div className="text-[11px] text-muted-foreground items-center gap-1.5 hidden md:flex pl-2 border-l border-border/60">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Markdown con vista previa en vivo</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 border border-border/70 rounded-xl overflow-hidden shadow-2xs min-h-0 h-full bg-background" data-color-mode={mode}>
                <MDEditor
                  value={markdownText}
                  onChange={(val) => handleMarkdownChange(val || "")}
                  height="100%"
                  preview="live"
                  className="h-full border-none"
                />
              </div>
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
                <motion.div layout className="space-y-2">
                  {blocks.map((block, index) => {
                    const BlockIcon = getBlockIcon(block.type);

                    return (
                      <div key={block.id} id={`block-${block.id}`}>
                        <motion.div 
                          layoutId={block.id}
                          onClick={() => setEditingBlockId(block.id)}
                          className={cn(
                            "relative border border-border/70 hover:border-primary/40 bg-card hover:bg-card/90 rounded-2xl px-3.5 sm:px-4 py-2.5 transition-all duration-150 shadow-2xs group flex items-center justify-between gap-3 cursor-pointer"
                          )}
                        >
                          {/* Left: Index badge + Icon + Type Label + Content Snippet */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary select-none shrink-0">
                              #{index + 1}
                            </span>
                            
                            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                              <BlockIcon className="w-4 h-4" />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                              <span className="text-xs font-bold text-foreground shrink-0">
                                {getBlockTypeName(block.type)}
                              </span>
                              <span className="hidden sm:inline text-muted-foreground/40 text-xs">•</span>
                              <span className="text-xs text-muted-foreground truncate font-normal">
                                {getBlockSummary(block)}
                              </span>
                            </div>
                          </div>

                          {/* Right: Config Button + Controls */}
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingBlockId(block.id)}
                              className="h-8 px-3 rounded-xl gap-1.5 text-xs font-semibold text-primary border-primary/25 hover:bg-primary/10 hover:text-primary transition-all shadow-2xs"
                              title="Configurar y editar contenido"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span className="hidden xs:inline">Configurar</span>
                            </Button>

                            <div className="flex items-center gap-0.5 border-l border-border/60 pl-1.5 ml-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    disabled={index === 0}
                                    onClick={() => moveBlock(index, "up")}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                    aria-label="Subir bloque"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Subir</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    disabled={index === blocks.length - 1}
                                    onClick={() => moveBlock(index, "down")}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                    aria-label="Bajar bloque"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Bajar</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => duplicateBlock(block)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    aria-label="Duplicar bloque"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Duplicar</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => deleteBlock(block.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                    aria-label="Eliminar bloque"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Eliminar</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
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

      {/* Configuration & Content Dialog */}
      <Dialog open={editingBlockId !== null} onOpenChange={open => !open && setEditingBlockId(null)}>
        <DialogContent className="h-[88vh] max-w-5xl sm:max-w-5xl flex flex-col rounded-3xl border border-border bg-background p-0 overflow-hidden shadow-2xl transition-all duration-300">
          {(() => {
            const currentBlock = blocks.find(b => b.id === editingBlockId);
            if (!currentBlock) return null;
            const Icon = getBlockIcon(currentBlock.type);
            return (
              <>
                <div className="px-6 py-4 border-b border-border/50 shrink-0 bg-card/60 backdrop-blur-xs flex items-center justify-between">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2.5 text-foreground">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>Configurar {getBlockTypeName(currentBlock.type)}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Modifica los contenidos y parámetros del elemento. Los cambios se sincronizan en tiempo real.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/50">
                  {/* Left Column: Config & Content Form (scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background">
                    <BlockConfigForms
                      currentBlock={currentBlock}
                      updateBlockData={updateBlockData}
                      addCollectionItem={addCollectionItem}
                      removeCollectionItem={removeCollectionItem}
                      updateCollectionItemValue={updateCollectionItemValue}
                      updateQuizOption={updateQuizOption}
                    />
                  </div>

                  {/* Right Column: Live Visual Preview for ALL blocks */}
                  <div className="w-full md:w-[45%] overflow-y-auto p-6 bg-muted/15 border-t md:border-t-0 border-border/40 custom-scrollbar flex flex-col gap-3 select-text">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Vista Previa en Vivo
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-medium">Renderizado final</span>
                    </div>
                    <div className="flex-1 border border-border/60 rounded-2xl p-4 sm:p-5 bg-card shadow-2xs min-h-[260px] overflow-y-auto custom-scrollbar">
                      <BlockRenderer content={JSON.stringify([currentBlock])} />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 border-t border-border/50 bg-card/60 shrink-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Presiona Listo para confirmar los cambios
                  </span>
                  <DialogFooter className="flex items-center gap-2 sm:justify-end w-full sm:w-auto">
                    <Button 
                      onClick={() => setEditingBlockId(null)} 
                      className="font-semibold rounded-xl h-9 px-6 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                      Listo
                    </Button>
                  </DialogFooter>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal para Seleccionar e Insertar Componentes */}
      <Dialog 
        open={activeInserterIndex !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setActiveInserterIndex(null);
            setComponentSearch("");
          }
        }}
      >
        <DialogContent className="max-w-2xl w-[94vw] sm:w-full rounded-3xl border border-border bg-background p-0 overflow-hidden shadow-2xl">
          <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-card/60 backdrop-blur-xs">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Insertar Componente</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecciona el componente interactivo o bloque que deseas agregar al documento.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3.5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar componente (ej: Acordeón, Quiz, Código, Video, Tabla...)"
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="pl-10 h-10 bg-background border-border/80 focus:border-primary/50 rounded-xl text-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 max-h-[58vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredBlockTypes.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => {
                    if (activeInserterIndex !== null) {
                      insertBlockAtIndex(activeInserterIndex, bt.type);
                      setActiveInserterIndex(null);
                      setComponentSearch("");
                    }
                  }}
                  className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-border/60 hover:border-primary/40 bg-card hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-150 gap-2 cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted/60 group-hover:bg-primary/15 border border-border/40 group-hover:border-primary/25 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <bt.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors text-center line-clamp-1">
                    {bt.label}
                  </span>
                </button>
              ))}
            </div>

            {filteredBlockTypes.length === 0 && (
              <div className="text-center py-10 text-muted-foreground space-y-1">
                <p className="text-xs font-medium">No se encontraron componentes</p>
                <p className="text-[11px] text-muted-foreground/70">Prueba buscando con otro término.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Generar y Modificar Contenido con IA */}
      <AIGenerateDialog
        isOpen={isAIGeneratorOpen}
        onClose={() => {
          setIsAIGeneratorOpen(false);
          setAiInitialContent(undefined);
        }}
        type="statement"
        activityType="DOCUMENTATION"
        initialContent={aiInitialContent}
        onUseContent={(newContent) => {
          handleMarkdownChange(newContent);
          setIsAIGeneratorOpen(false);
          setAiInitialContent(undefined);
          toast.success("Contenido generado e insertado correctamente en el editor Markdown.");
        }}
      />
    </div>
  );
}
