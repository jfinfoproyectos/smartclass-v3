"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  HelpCircle,
  Code2,
  FileText,
  BookOpen,
  Sparkles,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Images,
  Flame,
  ArrowRight,
  Terminal,
  Activity,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import mermaid from "mermaid";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";

// Model structure of blocks
export interface Block {
  id: string;
  type: "header" | "paragraph" | "callout" | "code" | "quiz" | "card" | "accordion" | "featureGrid" | "stepList" | "aiPrompt" | "table" | "list" | "image" | "video" | "carousel" | "codeExplain" | "flashcard" | "timeline" | "matching" | "embed" | "pdf" | "mermaid";
  data: any;
}

// Sound effects generator using Web Audio API
export const playSound = (type: "correct" | "incorrect") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === "correct") {
      // Upward chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Muted buzzer
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn("AudioContext failed to initialize:", e);
  }
};

export const GLOSSARY_DICT: Record<string, string> = {
  "kotlin": "Lenguaje de programación moderno, estático y multiplataforma, recomendado por Google para Android.",
  "mvvm": "Model-View-ViewModel. Patrón de arquitectura que separa la lógica de negocio de la interfaz gráfica.",
  "api rest": "Interfaz de programación de aplicaciones basada en el protocolo HTTP, que utiliza métodos estándar (GET, POST).",
  "jetpack compose": "El kit de herramientas moderno de Android para crear interfaces de usuario nativas de forma declarativa.",
  "state": "El estado de una aplicación o componente en un momento dado, que define su comportamiento y visualización.",
  "json": "JavaScript Object Notation. Formato de intercambio de datos ligero, estructurado y fácil de leer.",
  "retrofit": "Biblioteca cliente HTTP con seguridad de tipos para Android y Java desarrollada por Square.",
  "corrutinas": "Patrón de diseño de concurrencia para simplificar la ejecución asíncrona de código en Kotlin.",
  "corrutina": "Patrón de diseño de concurrencia para simplificar la ejecución asíncrona de código en Kotlin.",
  "firebase": "Plataforma de Google para desarrollo móvil y web que ofrece base de datos en tiempo real, autenticación y hosting."
};

// Simple parser for basic inline markdown (**bold**, *italic*, `code`, [link](url)) & Glossary Tooltips
export function renderFormattedText(text: string) {
  if (!text) return "";
  
  // Safe HTML escaping
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // **bold**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong class='font-black text-foreground'>$1</strong>");
  // *italic*
  escaped = escaped.replace(/\*(.*?)\*/g, "<em class='italic text-foreground/80'>$1</em>");
  // inline code `code`
  escaped = escaped.replace(/`(.*?)`/g, "<code class='bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono text-[0.88em] border border-primary/15'>$1</code>");
  // link [text](url)
  escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-primary font-black hover:underline inline-flex items-center gap-1 transition-all'>$1</a>");
  
  // Scan for glossary terms
  Object.keys(GLOSSARY_DICT).forEach((term) => {
    const regex = new RegExp(`\\b(${term})\\b(?![^<]*>)`, "gi");
    escaped = escaped.replace(regex, (match) => {
      const definition = GLOSSARY_DICT[term.toLowerCase()];
      return `<span class="glossary-term relative cursor-help border-b border-dotted border-primary/60 hover:text-primary transition-colors font-semibold" data-tooltip="${definition}">${match}</span>`;
    });
  });

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}

// Style configurations for each code style theme supported
export const THEME_STYLES: Record<string, {
  bg: string;
  text: string;
  lines: string;
  headerBg: string;
  headerText: string;
  border: string;
  textColorHex: string;
  css: string;
}> = {
  "github-dark": {
    bg: "bg-[#0d1117]",
    text: "text-[#c9d1d9]",
    lines: "text-[#8b949e] border-[#30363d]",
    headerBg: "bg-[#161b22]/80 border-[#30363d]",
    headerText: "text-[#8b949e]",
    border: "border-[#30363d]",
    textColorHex: "#c9d1d9",
    css: `
      .theme-github-dark .token.comment { color: #8b949e; font-style: italic; }
      .theme-github-dark .token.keyword { color: #ff7b72; font-weight: bold; }
      .theme-github-dark .token.string { color: #a5d6ff; }
      .theme-github-dark .token.function { color: #d2a8ff; }
      .theme-github-dark .token.number { color: #79c0ff; }
      .theme-github-dark .token.operator { color: #ff7b72; }
      .theme-github-dark .token.punctuation { color: #c9d1d9; }
      .theme-github-dark .token.boolean { color: #79c0ff; }
      .theme-github-dark .token.property { color: #79c0ff; }
      .theme-github-dark .token.class-name { color: #ffa657; }
    `
  },
  "github-light": {
    bg: "bg-[#ffffff]",
    text: "text-[#24292f]",
    lines: "text-[#57606a] border-[#d0d7de]",
    headerBg: "bg-[#f6f8fa]/80 border-[#d0d7de]",
    headerText: "text-[#57606a]",
    border: "border-[#d0d7de]",
    textColorHex: "#24292f",
    css: `
      .theme-github-light .token.comment { color: #6e7781; font-style: italic; }
      .theme-github-light .token.keyword { color: #cf222e; font-weight: bold; }
      .theme-github-light .token.string { color: #0a3069; }
      .theme-github-light .token.function { color: #8250df; }
      .theme-github-light .token.number { color: #0550ae; }
      .theme-github-light .token.operator { color: #cf222e; }
      .theme-github-light .token.punctuation { color: #24292f; }
      .theme-github-light .token.boolean { color: #0550ae; }
      .theme-github-light .token.property { color: #0550ae; }
      .theme-github-light .token.class-name { color: #953800; }
    `
  },
  "dracula": {
    bg: "bg-[#282a36]",
    text: "text-[#f8f8f2]",
    lines: "text-[#6272a4] border-[#44475a]",
    headerBg: "bg-[#191a21]/80 border-[#44475a]",
    headerText: "text-[#6272a4]",
    border: "border-[#44475a]",
    textColorHex: "#f8f8f2",
    css: `
      .theme-dracula .token.comment { color: #6272a4; font-style: italic; }
      .theme-dracula .token.keyword { color: #ff79c6; }
      .theme-dracula .token.string { color: #f1fa8c; }
      .theme-dracula .token.function { color: #50fa7b; }
      .theme-dracula .token.number { color: #bd93f9; }
      .theme-dracula .token.operator { color: #ff79c6; }
      .theme-dracula .token.punctuation { color: #f8f8f2; }
      .theme-dracula .token.boolean { color: #bd93f9; }
      .theme-dracula .token.property { color: #8be9fd; }
      .theme-dracula .token.class-name { color: #8be9fd; }
    `
  },
  "nord": {
    bg: "bg-[#2e3440]",
    text: "text-[#d8dee9]",
    lines: "text-[#4c566a] border-[#3b4252]",
    headerBg: "bg-[#242933]/80 border-[#3b4252]",
    headerText: "text-[#4c566a]",
    border: "border-[#3b4252]",
    textColorHex: "#d8dee9",
    css: `
      .theme-nord .token.comment { color: #4c566a; font-style: italic; }
      .theme-nord .token.keyword { color: #81a1c1; }
      .theme-nord .token.string { color: #a3be8c; }
      .theme-nord .token.function { color: #88c0d0; }
      .theme-nord .token.number { color: #b48ead; }
      .theme-nord .token.operator { color: #81a1c1; }
      .theme-nord .token.punctuation { color: #e5e9f0; }
      .theme-nord .token.boolean { color: #b48ead; }
      .theme-nord .token.property { color: #8fbcbb; }
      .theme-nord .token.class-name { color: #8fbcbb; }
    `
  },
  "tokyo-night": {
    bg: "bg-[#1a1b26]",
    text: "text-[#a9b1d6]",
    lines: "text-[#565f89] border-[#24283b]",
    headerBg: "bg-[#16161e]/80 border-[#24283b]",
    headerText: "text-[#565f89]",
    border: "border-[#24283b]",
    textColorHex: "#a9b1d6",
    css: `
      .theme-tokyo-night .token.comment { color: #565f89; font-style: italic; }
      .theme-tokyo-night .token.keyword { color: #9abdf5; }
      .theme-tokyo-night .token.string { color: #9ece6a; }
      .theme-tokyo-night .token.function { color: #7aa2f7; }
      .theme-tokyo-night .token.number { color: #ff9e64; }
      .theme-tokyo-night .token.operator { color: #89ddff; }
      .theme-tokyo-night .token.punctuation { color: #a9b1d6; }
      .theme-tokyo-night .token.boolean { color: #ff9e64; }
      .theme-tokyo-night .token.property { color: #7ad5f7; }
      .theme-tokyo-night .token.class-name { color: #2ac3de; }
    `
  },
  "ayu-dark": {
    bg: "bg-[#0a0e14]",
    text: "text-[#b3b1ad]",
    lines: "text-[#62605c] border-[#1f2430]",
    headerBg: "bg-[#0f1419]/80 border-[#1f2430]",
    headerText: "text-[#62605c]",
    border: "border-[#1f2430]",
    textColorHex: "#b3b1ad",
    css: `
      .theme-ayu-dark .token.comment { color: #5c6773; font-style: italic; }
      .theme-ayu-dark .token.keyword { color: #ff7733; }
      .theme-ayu-dark .token.string { color: #c2d94c; }
      .theme-ayu-dark .token.function { color: #ffb454; }
      .theme-ayu-dark .token.number { color: #95e6cb; }
      .theme-ayu-dark .token.operator { color: #f29718; }
      .theme-ayu-dark .token.punctuation { color: #b3b1ad; }
      .theme-ayu-dark .token.boolean { color: #95e6cb; }
      .theme-ayu-dark .token.property { color: #39bae6; }
      .theme-ayu-dark .token.class-name { color: #59c2ff; }
    `
  },
  "one-dark-pro": {
    bg: "bg-[#282c34]",
    text: "text-[#abb2bf]",
    lines: "text-[#5c6370] border-[#1e2024]",
    headerBg: "bg-[#21252b]/80 border-[#1e2024]",
    headerText: "text-[#5c6370]",
    border: "border-[#1e2024]",
    textColorHex: "#abb2bf",
    css: `
      .theme-one-dark-pro .token.comment { color: #5c6370; font-style: italic; }
      .theme-one-dark-pro .token.keyword { color: #c678dd; }
      .theme-one-dark-pro .token.string { color: #98c379; }
      .theme-one-dark-pro .token.function { color: #61afef; }
      .theme-one-dark-pro .token.number { color: #d19a66; }
      .theme-one-dark-pro .token.operator { color: #56b6c2; }
      .theme-one-dark-pro .token.punctuation { color: #abb2bf; }
      .theme-one-dark-pro .token.boolean { color: #d19a66; }
      .theme-one-dark-pro .token.property { color: #e06c75; }
      .theme-one-dark-pro .token.class-name { color: #e5c07b; }
    `
  },
  "one-light": {
    bg: "bg-[#fafafa]",
    text: "text-[#383a42]",
    lines: "text-[#a0a1a7] border-[#e5e5e6]",
    headerBg: "bg-[#f3f3f3]/80 border-[#e5e5e6]",
    headerText: "text-[#a0a1a7]",
    border: "border-[#e5e5e6]",
    textColorHex: "#383a42",
    css: `
      .theme-one-light .token.comment { color: #a0a1a7; font-style: italic; }
      .theme-one-light .token.keyword { color: #a626a4; }
      .theme-one-light .token.string { color: #50a14f; }
      .theme-one-light .token.function { color: #4078f2; }
      .theme-one-light .token.number { color: #986801; }
      .theme-one-light .token.operator { color: #0184bc; }
      .theme-one-light .token.punctuation { color: #383a42; }
      .theme-one-light .token.boolean { color: #986801; }
      .theme-one-light .token.property { color: #e45649; }
      .theme-one-light .token.class-name { color: #c18401; }
    `
  },
  "monokai": {
    bg: "bg-[#272822]",
    text: "text-[#f8f8f2]",
    lines: "text-[#75715e] border-[#3e3d32]",
    headerBg: "bg-[#1e1f1c]/80 border-[#3e3d32]",
    headerText: "text-[#75715e]",
    border: "border-[#3e3d32]",
    textColorHex: "#f8f8f2",
    css: `
      .theme-monokai .token.comment { color: #75715e; font-style: italic; }
      .theme-monokai .token.keyword { color: #f92672; }
      .theme-monokai .token.string { color: #e6db74; }
      .theme-monokai .token.function { color: #a6e22e; }
      .theme-monokai .token.number { color: #ae81ff; }
      .theme-monokai .token.operator { color: #f92672; }
      .theme-monokai .token.punctuation { color: #f8f8f2; }
      .theme-monokai .token.boolean { color: #ae81ff; }
      .theme-monokai .token.property { color: #fd971f; }
      .theme-monokai .token.class-name { color: #66d9ef; }
    `
  },
  "catppuccin-mocha": {
    bg: "bg-[#1e1e2e]",
    text: "text-[#cdd6f4]",
    lines: "text-[#585b70] border-[#313244]",
    headerBg: "bg-[#11111b]/80 border-[#313244]",
    headerText: "text-[#585b70]",
    border: "border-[#313244]",
    textColorHex: "#cdd6f4",
    css: `
      .theme-catppuccin-mocha .token.comment { color: #6c7086; font-style: italic; }
      .theme-catppuccin-mocha .token.keyword { color: #cba6f7; }
      .theme-catppuccin-mocha .token.string { color: #a6e3a1; }
      .theme-catppuccin-mocha .token.function { color: #89b4fa; }
      .theme-catppuccin-mocha .token.number { color: #fab387; }
      .theme-catppuccin-mocha .token.operator { color: #89dceb; }
      .theme-catppuccin-mocha .token.punctuation { color: #cdd6f4; }
      .theme-catppuccin-mocha .token.boolean { color: #fab387; }
      .theme-catppuccin-mocha .token.property { color: #f38ba8; }
      .theme-catppuccin-mocha .token.class-name { color: #f9e2af; }
    `
  }
};

export const parseHighlightLines = (rangeStr: string): Set<number> => {
  const set = new Set<number>();
  if (!rangeStr) return set;
  const parts = rangeStr.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          set.add(i);
        }
      }
    } else {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val)) {
        set.add(val);
      }
    }
  }
  return set;
};

// Subcomponent: Code Block with Copy, Zoom and Theme reactivity
export function CodeBlock({ 
  title, 
  language = "javascript", 
  code, 
  tabs,
  highlightLines,
  initialCodeTheme
}: { 
  title?: string; 
  language?: string; 
  code?: string; 
  tabs?: { name: string; language: string; code: string; highlightLines?: string }[];
  highlightLines?: string;
  initialCodeTheme?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(initialCodeTheme || "one-dark-pro");
  const [fontSize, setFontSize] = useState(14); // in pixels
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTabs = useMemo(() => {
    if (tabs && tabs.length > 0) return tabs;
    return [{ name: title || language.toUpperCase(), language, code: code || "", highlightLines: highlightLines || "" }];
  }, [tabs, title, language, code, highlightLines]);

  useEffect(() => {
    if (activeTabIdx >= activeTabs.length) {
      setActiveTabIdx(0);
    }
  }, [activeTabs.length, activeTabIdx]);

  const currentTab = activeTabs[activeTabIdx] || { name: "", language: "javascript", code: "", highlightLines: "" };
  const activeHighlightStr = currentTab.highlightLines || (tabs ? "" : (highlightLines || ""));
  const highlightedLinesSet = useMemo(() => parseHighlightLines(activeHighlightStr), [activeHighlightStr]);

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    const saved = getCookie("code-theme");
    if (saved) setTheme(saved);

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setTheme(customEvent.detail);
    };
    window.addEventListener("code-theme-change", handler);

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("code-theme-change", handler);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error entering native fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const lineCount = (currentTab.code || "").split("\n").length;

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const [highlighted, setHighlighted] = useState(() => escapeHtml(currentTab.code || ""));

  useEffect(() => {
    const lang = (currentTab.language || "javascript").toLowerCase();
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    try {
      const html = Prism.highlight(currentTab.code || "", grammar, lang);
      setHighlighted(html);
    } catch (e) {
      console.warn("Prism highlight error:", e);
      setHighlighted(escapeHtml(currentTab.code || ""));
    }
  }, [currentTab.code, currentTab.language]);

  const activeStyle = THEME_STYLES[theme] || THEME_STYLES["one-dark-pro"];

  return (
    <div 
      ref={containerRef}
      className={cn(
        "rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden",
        activeStyle.bg,
        activeStyle.text,
        activeStyle.border,
        isFullscreen ? "w-full h-full p-6 md:p-8 bg-zinc-950" : "my-6 shadow-lg group"
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        ${activeStyle.css}
        pre[class*="language-"], code[class*="language-"], .token.punctuation, .token.operator {
          background: transparent !important;
          color: ${activeStyle.textColorHex} !important;
        }
      ` }} />

      {activeTabs.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-border/10 overflow-x-auto custom-scrollbar shrink-0 bg-black/10">
          {activeTabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTabIdx(idx)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x border-transparent -mb-[1px]",
                activeTabIdx === idx 
                  ? cn("bg-background text-primary border-border/10", activeStyle.bg, activeStyle.text)
                  : "text-zinc-400 hover:text-zinc-100 bg-transparent"
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      <div className={cn(
        "flex items-center justify-between px-5 py-2.5 border-b shrink-0",
        activeStyle.headerBg
      )}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className={cn("text-[10px] font-black uppercase tracking-widest font-sans", activeStyle.headerText)}>
            {currentTab.name || currentTab.language.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-border/10 pr-2 mr-2">
            <button
              onClick={() => setFontSize(prev => Math.max(11, prev - 1))}
              className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
              title="Disminuir tamaño de letra"
            >
              <ZoomOut className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
            <span className="text-[10px] font-bold w-6 text-center select-none opacity-80">{fontSize}px</span>
            <button
              onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
              className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
              title="Aumentar tamaño de letra"
            >
              <ZoomIn className="w-4 h-4 opacity-70 hover:opacity-100" />
            </button>
          </div>

          <button 
            onClick={handleCopy}
            className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 animate-none shrink-0 cursor-pointer"
            title="Copiar código"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 opacity-70 hover:opacity-100" />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary animate-pulse" /> : <Maximize2 className="w-4 h-4 opacity-70 hover:opacity-100" />}
          </button>
        </div>
      </div>
      
      <div 
        className={cn(
          "flex font-mono leading-relaxed overflow-auto custom-scrollbar select-text p-4 relative",
          isFullscreen ? "flex-1" : "max-h-[500px]"
        )}
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="absolute top-4 left-0 right-0 pointer-events-none select-none z-0">
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightedLinesSet.has(lineNum);
            return (
              <div 
                key={i} 
                style={{ 
                  height: `${fontSize * 1.5}px`,
                }}
                className={cn(
                  "w-full transition-colors duration-300",
                  isHighlighted ? "bg-primary/10 border-l-2 border-primary" : "bg-transparent"
                )}
              />
            );
          })}
        </div>

        <div className={cn("text-right pr-4 border-r select-none hidden sm:block relative z-10", activeStyle.lines)}>
          {Array.from({ length: lineCount }).map((_, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightedLinesSet.has(lineNum);
            return (
              <div 
                key={i} 
                style={{ height: `${fontSize * 1.5}px`, lineHeight: `${fontSize * 1.5}px` }} 
                className={cn("text-xs transition-colors", isHighlighted ? "text-primary font-black" : "")}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <pre className="pl-4 flex-1 whitespace-pre relative z-10">
          <code 
            className={`language-${currentTab.language} theme-${theme}`}
            style={{ lineHeight: `${fontSize * 1.5}px` }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

// Subcomponent: Code Explanation Block (split columns, interactive walkthrough)
export function CodeExplainBlock({ 
  code, 
  language = "javascript", 
  steps,
  tabs,
  initialCodeTheme
}: { 
  code: string; 
  language?: string; 
  steps: { title: string; content: string; lines: string; tabIdx?: number }[];
  tabs?: { name: string; language: string; code: string }[];
  initialCodeTheme?: string;
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(initialCodeTheme || "one-dark-pro");
  const [fontSize, setFontSize] = useState(13);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error entering native fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    const saved = getCookie("code-theme");
    if (saved) setTheme(saved);

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setTheme(customEvent.detail);
    };
    window.addEventListener("code-theme-change", handler);
    return () => window.removeEventListener("code-theme-change", handler);
  }, []);

  const activeStep = steps && steps[currentStepIdx] ? steps[currentStepIdx] : { title: "", content: "", lines: "", tabIdx: 0 };
  const activeTabs = tabs && tabs.length > 0 ? tabs : [{ name: "Principal", language, code }];
  const currentTab = activeTabs[activeTabIdx] || activeTabs[0] || { name: "Principal", language, code };

  useEffect(() => {
    if (activeStep && activeStep.tabIdx !== undefined && activeTabs[activeStep.tabIdx]) {
      setActiveTabIdx(activeStep.tabIdx);
    }
  }, [currentStepIdx, activeStep, activeTabs]);

  const lineCount = (currentTab.code || "").split("\n").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const [highlighted, setHighlighted] = useState(() => escapeHtml(currentTab.code || ""));

  useEffect(() => {
    const lang = (currentTab.language || "javascript").toLowerCase();
    const grammar = Prism.languages[lang] || Prism.languages.javascript;
    try {
      const html = Prism.highlight(currentTab.code || "", grammar, lang);
      setHighlighted(html);
    } catch (e) {
      console.warn("Prism highlight error:", e);
      setHighlighted(escapeHtml(currentTab.code || ""));
    }
  }, [currentTab.code, currentTab.language]);

  const highlightedLinesSet = useMemo(() => {
    return parseHighlightLines(activeStep.lines || "");
  }, [activeStep.lines]);

  const activeStyle = THEME_STYLES[theme] || THEME_STYLES["one-dark-pro"];

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  if (!steps || steps.length === 0) {
    return <CodeBlock code={code} language={language} />;
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "my-8 rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-2xl md:grid md:grid-cols-12 md:divide-x md:divide-border/40",
        activeStyle.bg,
        activeStyle.text,
        activeStyle.border,
        isFullscreen ? "w-full h-full p-6 md:p-8 bg-zinc-950 border-none" : "min-h-[480px] md:h-[500px]"
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        ${activeStyle.css}
        pre[class*="language-"], code[class*="language-"], .token.punctuation, .token.operator {
          background: transparent !important;
          color: ${activeStyle.textColorHex} !important;
        }
      ` }} />

      <div className={cn("md:col-span-7 flex flex-col min-w-0 transition-colors duration-300 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none", activeStyle.bg)}>
        <div className={cn("flex items-center justify-between px-5 py-3 border-b shrink-0", activeStyle.headerBg)}>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className={cn("text-[10px] font-black uppercase tracking-widest font-sans", activeStyle.headerText)}>
              {currentTab.name ? `${currentTab.name} (${currentTab.language.toUpperCase()})` : currentTab.language.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-r border-border/10 pr-2 mr-2">
              <button
                onClick={() => setFontSize(prev => Math.max(11, prev - 1))}
                className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
                title="Disminuir tamaño de letra"
              >
                <ZoomOut className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
              <span className="text-[10px] font-bold w-6 text-center select-none opacity-80">{fontSize}px</span>
              <button
                onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
                title="Aumentar tamaño de letra"
              >
                <ZoomIn className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </div>

            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
              title="Copiar código completo"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 opacity-70 hover:opacity-100" />}
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl hover:bg-muted/15 transition-all duration-300 shrink-0 cursor-pointer"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary animate-pulse" /> : <Maximize2 className="w-4 h-4 opacity-70 hover:opacity-100" />}
            </button>
          </div>
        </div>

        {activeTabs.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-border/10 overflow-x-auto custom-scrollbar shrink-0 bg-black/10">
            {activeTabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTabIdx(idx)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x border-transparent -mb-[1px] cursor-pointer",
                  activeTabIdx === idx 
                    ? cn("bg-background text-primary border-border/10", activeStyle.bg, activeStyle.text)
                    : "text-zinc-400 hover:text-zinc-100 bg-transparent"
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}

        <div 
          className={cn(
            "flex-1 flex font-mono leading-relaxed overflow-auto custom-scrollbar select-text p-5 relative min-h-[300px]"
          )}
          style={{ fontSize: `${fontSize}px` }}
        >
          <div className="absolute top-5 left-0 right-0 pointer-events-none select-none z-0">
            {Array.from({ length: lineCount }).map((_, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlightedLinesSet.has(lineNum);
              return (
                <div 
                  key={i} 
                  style={{ height: `${fontSize * 1.5}px` }}
                  className={cn(
                    "w-full transition-colors duration-300",
                    isHighlighted ? "bg-primary/10 border-l-2 border-primary" : "bg-transparent"
                  )}
                />
              );
            })}
          </div>

          <div className={cn("text-right pr-4 border-r select-none hidden sm:block relative z-10", activeStyle.lines)}>
            {Array.from({ length: lineCount }).map((_, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlightedLinesSet.has(lineNum);
              return (
                <div 
                  key={i} 
                  style={{ height: `${fontSize * 1.5}px`, lineHeight: `${fontSize * 1.5}px` }} 
                  className={cn("text-xs transition-colors", isHighlighted ? "text-primary font-black animate-pulse" : "")}
                >
                  {lineNum}
                </div>
              );
            })}
          </div>

          <pre className="pl-4 flex-1 whitespace-pre relative z-10">
            <code 
              className={`language-${currentTab.language} theme-${theme}`}
              style={{ lineHeight: `${fontSize * 1.5}px` }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        </div>
      </div>

      <div className={cn(
        "md:col-span-5 bg-zinc-50 dark:bg-zinc-900/60 backdrop-blur-md flex flex-col p-6 min-w-0 rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none h-full"
      )}>
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Explicación Paso a Paso</span>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {currentStepIdx + 1} de {steps.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[180px] flex flex-col justify-center">
          <motion.div
            key={currentStepIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {activeStep.title && (
              <h4 className="text-base font-black text-foreground tracking-tight leading-snug">
                {activeStep.title}
              </h4>
            )}
            <div className="text-[13.5px] leading-relaxed text-muted-foreground font-medium">
              {renderFormattedText(activeStep.content)}
            </div>
            
            {activeStep.lines && (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-primary bg-primary/5 rounded-lg px-3 py-1.5 w-max border border-primary/10">
                <Terminal className="w-3.5 h-3.5" />
                Línea(s) destacada(s): {activeStep.lines}
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex justify-center gap-1.5 my-4 shrink-0">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIdx(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                currentStepIdx === idx 
                  ? "bg-primary w-5" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
              )}
              title={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-auto pt-4 border-t border-border/40 shrink-0">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="flex-1 rounded-xl h-11 text-xs font-bold uppercase transition-all duration-300"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" /> Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentStepIdx === steps.length - 1}
            className="flex-1 rounded-xl h-11 text-xs font-bold uppercase transition-all duration-300"
          >
            Siguiente <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Interactive Quiz
export function InteractiveQuiz({ question, options, correctIndex, explanation }: { 
  question: string; 
  options: string[]; 
  correctIndex: number; 
  explanation?: string; 
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelectedIdx(idx);
    setRevealed(true);
    
    if (idx === correctIndex) {
      playSound("correct");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } else {
      playSound("incorrect");
    }
  };

  const handleReset = () => {
    setSelectedIdx(null);
    setRevealed(false);
  };

  return (
    <div className="my-8 p-6 rounded-3xl border border-border/80 bg-card/45 backdrop-blur-md shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cuestionario Práctico</span>
          <h4 className="text-base font-bold text-foreground mt-0.5 leading-snug">{question}</h4>
        </div>
      </div>
      
      <div className="space-y-2 mt-4">
        {options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === correctIndex;
          
          return (
            <button
              key={idx}
              disabled={revealed}
              onClick={() => handleSelect(idx)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border text-sm font-semibold transition-all duration-300 flex items-center justify-between group",
                !revealed && "hover:bg-muted/40 hover:border-primary/30 border-border bg-background/50 hover:-translate-y-0.5",
                revealed && isCorrect && "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold",
                revealed && isSelected && !isCorrect && "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold",
                revealed && !isSelected && !isCorrect && "opacity-40 border-border bg-background/20"
              )}
            >
              <span>{option}</span>
              {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
              {revealed && isSelected && !isCorrect && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 p-5 rounded-2xl border border-border bg-muted/20">
              <span className={cn(
                "text-xs font-black uppercase tracking-widest block mb-1.5",
                selectedIdx === correctIndex ? "text-emerald-500" : "text-rose-500"
              )}>
                {selectedIdx === correctIndex ? "¡Correcto! Excelente trabajo" : "Ups, respuesta incorrecta"}
              </span>
              {explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {explanation}
                </p>
              )}
              <Button onClick={handleReset} variant="outline" size="sm" className="mt-4 shadow-sm active:scale-95">
                Reintentar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponent: Link Card
export function LinkCard({ title, description, url, icon }: { title: string; description?: string; url: string; icon?: string }) {
  const selectIcon = (name?: string) => {
    switch (name) {
      case "BookOpen": return BookOpen;
      case "Code2": return Code2;
      case "Sparkles": return Sparkles;
      default: return LinkIcon;
    }
  };

  const IconComponent = selectIcon(icon);

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block my-6 p-4 rounded-2xl border border-border/80 bg-card/30 hover:bg-card/75 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-md group"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform duration-300">
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{title}</h4>
          {description && <p className="text-xs text-muted-foreground mt-0.5 truncate leading-none">{description}</p>}
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 ml-2" />
      </div>
    </a>
  );
}

// Subcomponent: Accordion / FAQ
export function AccordionBlock({ items }: { items: { title: string; content: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="my-6 border border-border/60 bg-card/20 rounded-2xl overflow-hidden divide-y divide-border/40 shadow-sm">
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={idx} className="transition-all duration-300">
            <button
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-foreground hover:bg-muted/30 transition-colors"
            >
              <span>{item.title}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-background/30"
                >
                  <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                    {renderFormattedText(item.content)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// Subcomponent: Feature Grid
export function FeatureGridBlock({ items, columns }: { items: { title: string; text: string; icon: string }[]; columns?: number }) {
  const selectIcon = (name?: string) => {
    switch (name) {
      case "BookOpen": return BookOpen;
      case "Code2": return Code2;
      case "Sparkles": return Sparkles;
      case "Flame": return Flame;
      default: return Activity;
    }
  };

  if (!items || items.length === 0) return null;

  const colsClass = columns === 3 ? "lg:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className={cn("grid grid-cols-1 gap-5 my-8", colsClass)}>
      {items.map((item, idx) => {
        const IconComponent = selectIcon(item.icon);
        return (
          <div key={idx} className="p-5 rounded-2xl border border-border/80 bg-card/30 hover:border-primary/20 hover:bg-card/50 hover:-translate-y-0.5 transition-all duration-300 shadow-sm flex flex-col gap-3 group">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit group-hover:scale-105 transition-transform duration-300">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{item.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{item.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Subcomponent: Stepper / Timeline steps
export function StepListBlock({ steps }: { steps: { title: string; text: string }[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="my-8 relative pl-6 border-l border-primary/20 space-y-6">
      {steps.map((step, idx) => (
        <div key={idx} className="relative animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="absolute -left-[37px] top-0.5 h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-[10px] font-black border-4 border-background shadow-md">
            {idx + 1}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground leading-tight">{step.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">{step.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Subcomponent: Single Flashcard Item
export function SingleFlashcard({ card }: { card: { frontText: string; backText: string; hint?: string } }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      onClick={() => setIsFlipped(!isFlipped)}
      className="w-full h-64 perspective-1000 cursor-pointer group"
    >
      <div className={cn(
        "w-full h-full relative transform-style-3d transition-transform duration-700 rounded-3xl border border-border/50 shadow-md",
        isFlipped && "rotate-y-180"
      )}>
        {/* FRONT SIDE */}
        <div className="absolute inset-0 backface-hidden rounded-3xl bg-card hover:bg-card/90 flex flex-col items-center justify-center p-6 text-center transition-colors">
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
            <HelpCircle className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-foreground tracking-tight leading-snug">{card.frontText}</p>
          {card.hint && (
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-3 bg-muted/50 px-2 py-0.5 rounded-md">
              Pista: {card.hint}
            </span>
          )}
          <span className="text-[8px] uppercase font-black text-primary/75 tracking-wider mt-5 group-hover:text-primary transition-colors">
            Hacer clic para revelar
          </span>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-primary/[0.04] dark:bg-primary/[0.02] border border-primary/20 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[8px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-widest mb-1.5">Respuesta</span>
          <p className="text-xs font-medium text-foreground/90 leading-relaxed max-w-xs">
            {renderFormattedText(card.backText)}
          </p>
          <span className="text-[8px] uppercase font-black text-muted-foreground/60 tracking-wider mt-5">
            Hacer clic para volver
          </span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Flashcard / Memorización
export function FlashcardBlock({ cards }: { cards: { frontText: string; backText: string; hint?: string }[] }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {cards.map((card, idx) => (
        <SingleFlashcard key={idx} card={card} />
      ))}
    </div>
  );
}

// Subcomponent: Roadmap / Timeline
export function TimelineBlock({ items }: { items: { title: string; description: string; completed?: boolean }[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-8 relative pl-8 border-l-2 border-border/40 space-y-8 ml-4">
      {items.map((item, idx) => (
        <div key={idx} className="relative animate-in fade-in duration-300 group">
          <div className={cn(
            "absolute -left-[42px] top-1.5 h-5 w-5 rounded-full border-4 border-background flex items-center justify-center transition-all duration-300 shadow-md",
            item.completed 
              ? "bg-primary shadow-primary/20 scale-110" 
              : "bg-muted-foreground/30"
          )}>
            {item.completed && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />}
          </div>
          
          <div className="space-y-1 bg-card/45 hover:bg-card/75 border border-border/20 p-4 rounded-2xl transition-all duration-300">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
              {item.completed ? (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                  Completado
                </span>
              ) : (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                  Pendiente
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              {renderFormattedText(item.description)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MatchingPair {
  id: string;
  premise: string;
  definition: string;
}

// Subcomponent: Matching / Apareamiento
export function MatchingBlock({ pairs }: { pairs: MatchingPair[] }) {
  const [shuffledPremises, setShuffledPremises] = useState<{ id: string; text: string }[]>([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<{ id: string; text: string }[]>([]);
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // premiseId -> definitionId
  const [incorrectPair, setIncorrectPair] = useState<{ premiseId: string; definitionId: string } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const initializeGame = useCallback(() => {
    if (!pairs || pairs.length === 0) return;
    
    const premises = pairs.map(p => ({ id: p.id, text: p.premise }));
    const definitions = pairs.map(p => ({ id: p.id, text: p.definition }));

    const shuffle = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    setShuffledPremises(shuffle(premises));
    setShuffledDefinitions(shuffle(definitions));
    setSelectedPremiseId(null);
    setSelectedDefinitionId(null);
    setMatches({});
    setIncorrectPair(null);
    setIsCompleted(false);
  }, [pairs]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleSelectPremise = (id: string) => {
    if (matches[id] || incorrectPair) return;
    setSelectedPremiseId(id);
    
    if (selectedDefinitionId) {
      checkMatch(id, selectedDefinitionId);
    }
  };

  const handleSelectDefinition = (id: string) => {
    const isMatched = Object.values(matches).includes(id);
    if (isMatched || incorrectPair) return;
    setSelectedDefinitionId(id);

    if (selectedPremiseId) {
      checkMatch(selectedPremiseId, id);
    }
  };

  const checkMatch = (pId: string, dId: string) => {
    if (pId === dId) {
      const newMatches = { ...matches, [pId]: dId };
      setMatches(newMatches);
      setSelectedPremiseId(null);
      setSelectedDefinitionId(null);
      playSound("correct");

      if (Object.keys(newMatches).length === pairs.length) {
        setIsCompleted(true);
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
        toast.success("¡Excelente! Has emparejado todos los conceptos correctamente.");
      }
    } else {
      setIncorrectPair({ premiseId: pId, definitionId: dId });
      playSound("incorrect");
      
      setTimeout(() => {
        setIncorrectPair(null);
        setSelectedPremiseId(null);
        setSelectedDefinitionId(null);
      }, 1000);
    }
  };

  if (!pairs || pairs.length === 0) return null;

  return (
    <div className="my-8 p-6 rounded-3xl border border-border/50 bg-card/30 flex flex-col gap-6 shadow-sm select-none">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Actividad Práctica</span>
          <h4 className="text-sm font-bold text-foreground mt-0.5 leading-snug font-sans">Relaciona las columnas</h4>
        </div>
        {(Object.keys(matches).length > 0 || isCompleted) && (
          <Button 
            onClick={initializeGame} 
            size="sm" 
            variant="outline" 
            className="h-8 rounded-xl text-xs gap-1 border-border/50 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            Reiniciar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block px-1">Premisas / Conceptos</span>
          {shuffledPremises.map((p) => {
            const isMatched = !!matches[p.id];
            const isSelected = selectedPremiseId === p.id;
            const isIncorrect = incorrectPair?.premiseId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => handleSelectPremise(p.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-xs font-semibold leading-relaxed shadow-sm min-h-[50px] flex items-center",
                  isMatched && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-default shadow-none",
                  isSelected && "bg-primary/5 border-primary text-primary scale-[1.01] shadow-md",
                  isIncorrect && "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-shake",
                  !isMatched && !isSelected && !isIncorrect && "bg-background/80 border-border/50 hover:bg-muted/10 hover:border-border"
                )}
              >
                {p.text}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block px-1">Definiciones / Respuestas</span>
          {shuffledDefinitions.map((d) => {
            const isMatched = Object.values(matches).includes(d.id);
            const isSelected = selectedDefinitionId === d.id;
            const isIncorrect = incorrectPair?.definitionId === d.id;

            return (
              <div
                key={d.id}
                onClick={() => handleSelectDefinition(d.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-xs font-semibold leading-relaxed shadow-sm min-h-[50px] flex items-center",
                  isMatched && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-default shadow-none",
                  isSelected && "bg-primary/5 border-primary text-primary scale-[1.01] shadow-md",
                  isIncorrect && "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-shake",
                  !isMatched && !isSelected && !isIncorrect && "bg-background/80 border-border/50 hover:bg-muted/10 hover:border-border"
                )}
              >
                {renderFormattedText(d.text)}
              </div>
            );
          })}
        </div>
      </div>

      {isCompleted && (
        <div className="text-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-500">
          🎉 ¡Excelente trabajo! Has completado la actividad correctamente.
        </div>
      )}
    </div>
  );
}

// Subcomponent: Embed / Incrustaciones Externas (CodePen, Sandbox, YouTube, Figma, Replit, etc.)
export function EmbedBlock({ url, height = 450, caption }: { url: string; height?: number; caption?: string }) {
  const [isLoading, setIsLoading] = useState(true);

  if (!url) {
    return (
      <div className="my-8 p-8 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center bg-muted/5">
        <ExternalLink className="w-8 h-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">Bloque Embebido vacío</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Configura una URL válida para visualizar la incrustación.</p>
      </div>
    );
  }

  const getEmbedUrl = (rawUrl: string): string => {
    let cleanUrl = rawUrl.trim();

    try {
      if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
        let videoId = "";
        if (cleanUrl.includes("watch?v=")) {
          const urlObj = new URL(cleanUrl);
          videoId = urlObj.searchParams.get("v") || "";
        } else if (cleanUrl.includes("youtu.be/")) {
          videoId = cleanUrl.split("youtu.be/")[1].split("?")[0];
        } else if (cleanUrl.includes("youtube.com/embed/")) {
          return cleanUrl;
        }
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      if (cleanUrl.includes("codepen.io")) {
        if (cleanUrl.includes("/pen/")) {
          return cleanUrl.replace("/pen/", "/embed/") + "?default-tab=result&theme-id=dark";
        }
        return cleanUrl;
      }

      if (cleanUrl.includes("codesandbox.io")) {
        if (cleanUrl.includes("/s/")) {
          return cleanUrl.replace("/s/", "/embed/");
        }
        return cleanUrl;
      }

      if (cleanUrl.includes("figma.com") && !cleanUrl.includes("/embed")) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(cleanUrl)}`;
      }

      if (cleanUrl.includes("replit.com") && !cleanUrl.includes("embed=true")) {
        const separator = cleanUrl.includes("?") ? "&" : "?";
        return `${cleanUrl}${separator}embed=true`;
      }
    } catch (e) {
      console.warn("Error parsing embed URL:", e);
    }

    return cleanUrl;
  };

  const embedUrl = getEmbedUrl(url);

  const getProviderName = (targetUrl: string): string => {
    if (targetUrl.includes("codepen.io")) return "CodePen";
    if (targetUrl.includes("codesandbox.io")) return "CodeSandbox";
    if (targetUrl.includes("figma.com")) return "Figma";
    if (targetUrl.includes("replit.com")) return "Replit";
    if (targetUrl.includes("youtube.com") || targetUrl.includes("youtu.be")) return "YouTube";
    return "Enlace Externo";
  };

  const provider = getProviderName(url);

  return (
    <div className="my-8 flex flex-col gap-2.5 w-full">
      <div 
        className="w-full relative rounded-3xl border border-border/50 overflow-hidden bg-muted/10 shadow-sm flex flex-col"
        style={{ height: `${height}px` }}
      >
        <div className="h-10 bg-muted/40 px-4 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary/80 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {provider}
            </span>
          </div>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            Abrir original
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex-1 w-full relative bg-background">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 transition-opacity">
              <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          <iframe
            src={embedUrl}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            loading="lazy"
          />
        </div>
      </div>
      {caption && (
        <p className="text-center text-[10px] text-muted-foreground/80 font-medium italic mt-0.5 leading-snug">
          {caption}
        </p>
      )}
    </div>
  );
}

// Subcomponent: Visor de PDF
export function PdfBlock({ url, height = 650, title }: { url: string; height?: number; title?: string }) {
  const [isLoading, setIsLoading] = useState(true);

  if (!url) {
    return (
      <div className="my-8 p-8 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center bg-muted/5">
        <FileText className="w-8 h-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">Visor PDF vacío</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Configura un enlace válido a un documento PDF.</p>
      </div>
    );
  }

  return (
    <div className="my-8 flex flex-col gap-2.5 w-full">
      <div 
        className="w-full relative rounded-3xl border border-border/50 overflow-hidden bg-muted/10 shadow-sm flex flex-col"
        style={{ height: `${height}px` }}
      >
        <div className="h-10 bg-muted/40 px-4 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Documento PDF
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={url} 
              download
              className="text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Descargar
            </a>
            <span className="text-muted-foreground/30 text-xs">|</span>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Abrir original
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex-1 w-full relative bg-background">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 transition-opacity">
              <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          <iframe
            src={url}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </div>
      {title && (
        <p className="text-center text-[10px] text-muted-foreground/80 font-medium italic mt-0.5 leading-snug">
          {title}
        </p>
      )}
    </div>
  );
}

// Subcomponent: Diagrama Mermaid
export function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    let isMounted = true;
    const elementId = `mermaid-chart-${Math.random().toString(36).substring(2, 9)}`;

    const renderChart = async () => {
      try {
        setError(null);
        const { svg: renderedSvg } = await mermaid.render(elementId, chart);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        if (isMounted) {
          setError(err.message || "Error al compilar el diagrama de Mermaid.");
          setSvg("");
        }
        
        const tempEl = document.getElementById(elementId);
        if (tempEl) tempEl.remove();
        const bindEl = document.getElementById(`d${elementId}`);
        if (bindEl) bindEl.remove();
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (!chart) {
    return (
      <div className="my-8 p-8 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center bg-muted/5">
        <Activity className="w-8 h-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs font-semibold text-muted-foreground">Diagrama de Mermaid vacío</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Configura un código de diagrama válido.</p>
      </div>
    );
  }

  return (
    <div className="my-8 p-6 rounded-3xl border border-border/50 bg-card/30 flex flex-col gap-4 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 border-b pb-3 justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary font-sans">
            Diagrama / Flujo
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full flex justify-center overflow-x-auto py-2 custom-scrollbar">
        {error ? (
          <div className="w-full p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs font-semibold text-destructive leading-relaxed font-mono flex flex-col gap-1 select-text">
            <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-destructive/80">Error de Sintaxis Mermaid:</span>
            <span>{error}</span>
          </div>
        ) : svg ? (
          <div 
            className="mermaid-svg-container max-w-full text-foreground [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:bg-transparent"
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
        ) : (
          <div className="py-6 flex items-center justify-center">
            <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent: AI Prompt Card
export function AiPromptBlock({ promptText, buttonText, helperText }: { promptText: string; buttonText?: string; helperText?: string }) {
  const triggerAi = () => {
    const event = new CustomEvent("open-ai-tutor-chat");
    window.dispatchEvent(event);
    toast.success("Invocando Tutor de IA...");
  };

  return (
    <div className="my-8 p-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent relative overflow-hidden shadow-inner-sm">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Sparkles className="w-32 h-32 text-primary" />
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Asistente Virtual Activo</span>
            <h4 className="text-sm font-bold text-foreground mt-0.5 leading-snug">{promptText}</h4>
            {helperText && <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed font-medium">{helperText}</p>}
          </div>
          <Button onClick={triggerAi} className="font-bold gap-2 text-xs h-9 px-4 shadow-sm active:scale-95 transition-all">
            {buttonText || "Preguntar al Asistente IA"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Table (GFM compatible)
export function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!headers || headers.length === 0) return null;

  return (
    <div className="my-6 w-full overflow-x-auto border border-border/80 bg-card/25 backdrop-blur-md rounded-2xl shadow-sm custom-scrollbar">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {headers.map((header, idx) => (
              <th key={idx} className="px-5 py-3 font-bold text-foreground">
                {renderFormattedText(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-primary/5 even:bg-muted/10 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-5 py-3 text-foreground/80 font-medium whitespace-pre-wrap">
                  {renderFormattedText(cell || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Subcomponent: List (GFM check-lists & bullets compatible)
export function ListBlock({ items, ordered }: { items: { text: string; checked?: boolean }[]; ordered: boolean }) {
  if (!items || items.length === 0) return null;
  
  const isTaskList = items.some(item => item.checked !== undefined);
  
  if (isTaskList) {
    return (
      <ul className="my-5 space-y-2.5">
        {items.map((item, idx) => {
          const isChecked = !!item.checked;
          return (
            <li key={idx} className="flex items-start gap-2.5 text-[15px] font-semibold text-foreground/90">
              <div className="shrink-0 mt-0.5 text-primary">
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4 opacity-50" />
                )}
              </div>
              <span className={cn(isChecked && "line-through text-muted-foreground/60 font-medium")}>
                {renderFormattedText(item.text)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  
  if (ordered) {
    return (
      <ol className="my-5 list-decimal pl-6 space-y-2 text-[15px] leading-relaxed text-foreground/90 font-medium">
        {items.map((item, idx) => (
          <li key={idx} className="pl-1">
            {renderFormattedText(item.text)}
          </li>
        ))}
      </ol>
    );
  }
  
  return (
    <ul className="my-5 list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-foreground/90 font-medium">
      {items.map((item, idx) => (
        <li key={idx} className="pl-1">
          {renderFormattedText(item.text)}
        </li>
      ))}
    </ul>
  );
}

// Subcomponent: Video Player (GFM compatible)
export function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  if (!url) return null;

  const getYoutubeEmbedUrl = (videoUrl: string) => {
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const ytUrl = getYoutubeEmbedUrl(url);

  return (
    <div className="my-6 space-y-2 max-w-4xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-lg bg-zinc-950 aspect-video">
        {ytUrl ? (
          <iframe
            src={ytUrl}
            title={caption || "Video player"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <video
            src={url}
            controls
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      {caption && (
        <p className="text-center text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
          {caption}
        </p>
      )}
    </div>
  );
}

// Subcomponent: Image Card (GFM compatible with zoom and advanced layouts)
export function ImageBlock({ 
  url, 
  alt, 
  align = "center", 
  width = "large", 
  radius = "large" 
}: { 
  url: string; 
  alt?: string; 
  align?: "left" | "center" | "right"; 
  width?: "small" | "medium" | "large"; 
  radius?: "small" | "medium" | "large" | "none";
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (!url) return null;

  const alignClasses = {
    left: "justify-start text-left items-start",
    center: "justify-center text-center items-center",
    right: "justify-end text-right items-end"
  };

  const widthClasses = {
    small: "max-w-md",
    medium: "max-w-2xl",
    large: "max-w-full"
  };

  const radiusClasses = {
    none: "rounded-none",
    small: "rounded-lg",
    medium: "rounded-xl",
    large: "rounded-2xl"
  };

  return (
    <>
      <div className={cn("my-8 flex flex-col gap-2 w-full", alignClasses[align] || alignClasses.center)}>
        <div 
          onClick={() => setIsOpen(true)}
          className={cn(
            "overflow-hidden border border-border shadow-md hover:scale-[1.01] transition-transform duration-500 bg-muted/10 cursor-zoom-in",
            widthClasses[width] || widthClasses.large,
            radiusClasses[radius] || radiusClasses.large
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || "Imagen"} className="w-full h-auto object-contain max-h-[500px]" />
        </div>
        {alt && <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/60 text-center">{alt}</span>}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={url}
              alt={alt || "Zoomed Image"}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            {alt && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/80 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider">
                {alt}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Subcomponent: Carousel of images with advanced options and transition effects
export function CarouselBlock({ 
  items, 
  autoplay = false, 
  interval = 5, 
  width = "large", 
  align = "center",
  transitionEffect = "fade"
}: { 
  items: { url: string; caption?: string }[]; 
  autoplay?: boolean; 
  interval?: number; 
  width?: "small" | "medium" | "large"; 
  align?: "left" | "center" | "right";
  transitionEffect?: "slide" | "fade" | "zoom";
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const handlePrev = useCallback(() => {
    setActiveIdx(prev => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setActiveIdx(prev => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  useEffect(() => {
    if (!autoplay || items.length <= 1) return;
    const t = setInterval(() => {
      handleNext();
    }, interval * 1000);
    return () => clearInterval(t);
  }, [autoplay, interval, handleNext, items.length]);

  const alignClasses = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto"
  };

  const widthClasses = {
    small: "max-w-md",
    medium: "max-w-2xl",
    large: "max-w-4xl"
  };

  const activeItem = items[activeIdx] || { url: "", caption: "" };

  const variants = {
    slide: {
      initial: { x: 150, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -150, opacity: 0 }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    zoom: {
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.1, opacity: 0 }
    }
  };

  const currentVariant = variants[transitionEffect] || variants.fade;

  return (
    <>
      <div className={cn("my-8 space-y-4 w-full", alignClasses[align] || alignClasses.center, widthClasses[width] || widthClasses.large)}>
        <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-lg bg-zinc-950 aspect-video group">
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeItem.url && (
                <motion.img
                  key={activeIdx}
                  variants={currentVariant}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  src={activeItem.url}
                  alt={activeItem.caption || `Diapositiva ${activeIdx + 1}`}
                  onClick={() => setZoomUrl(activeItem.url)}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                />
              )}
            </AnimatePresence>
          </div>

          {items.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-background/80 hover:bg-primary border text-foreground hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-background/80 hover:bg-primary border text-foreground hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {items.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-background/60 backdrop-blur px-3 py-1.5 rounded-full border border-border/40">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    idx === activeIdx ? "bg-primary w-3" : "bg-muted-foreground/40 hover:bg-muted-foreground/80"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {activeItem.caption && (
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
            {activeItem.caption}
          </p>
        )}
      </div>

      <AnimatePresence>
        {zoomUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomUrl(null)}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={zoomUrl}
              alt="Zoomed Carousel Slide"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            {activeItem.caption && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/80 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider">
                {activeItem.caption}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
