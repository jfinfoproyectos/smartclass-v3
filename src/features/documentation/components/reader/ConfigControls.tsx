"use client";

import React from "react";
import { CodeThemeSelector } from "./CodeThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { PaperModeToggle } from "@/components/theme/PaperModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { ThemeInfo } from "@/app/actions/themes";
import { CreditsModal } from "@/components/CreditsModal";
import { Button } from "@/components/ui/button";
import { FileDown, Settings, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { DocPDFSection } from "./DocPagePDF";

interface ConfigControlsProps {
  projectName?: string;
  projectId?: string;
  currentCodeTheme: string;
  themes: ThemeInfo[];
  courseSettings: {
    themeMode: string;
    codeTheme: string;
    allowCodeThemeChange: boolean;
    themeColor: string;
    allowThemeColorChange: boolean;
  };
  isTocOpen: boolean;
  toggleToc: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

function extractDocContent(defaultProjectName: string = "SmartClass"): {
  pageTitle: string;
  pageSubtitle?: string;
  sections: DocPDFSection[];
} {
  const docRoot = document.getElementById("doc-content") || document.querySelector("main") || document.body;

  // Extract main page title (h1)
  const h1 = docRoot.querySelector("h1");
  const pageTitle = h1?.textContent?.trim() || defaultProjectName || "Documentación";

  // Subtitle
  const subtitleEl = docRoot.querySelector("h1 + p, h1 ~ p, .max-w-2xl p");
  const pageSubtitle = (subtitleEl && subtitleEl !== h1) ? subtitleEl.textContent?.trim() : undefined;

  const sections: DocPDFSection[] = [];

  // 1. Check if there is a rich BlockRenderer container (.select-text)
  const blockContainer = docRoot.querySelector(".select-text");
  if (blockContainer) {
    const blockNodes = blockContainer.children;
    for (let i = 0; i < blockNodes.length; i++) {
      const el = blockNodes[i] as HTMLElement;

      // Header block
      const hEl = el.querySelector("h1, h2, h3, h4, h5, h6");
      if (hEl && (el.classList.contains("group") || hEl.parentElement === el || el.querySelector("a.anchor") || el.tagName.toLowerCase().startsWith("h"))) {
        const tag = hEl.tagName.toLowerCase();
        const level: 'h1' | 'h2' | 'h3' = tag === 'h1' ? 'h1' : tag === 'h3' ? 'h3' : 'h2';
        const title = hEl.textContent?.replace(/[\*_~`#\[\]\(\)]/g, "").trim();
        if (title && title !== pageTitle) {
          sections.push({ type: "header", level, title });
        }
        continue;
      }

      // Code block
      const preEl = el.querySelector("pre");
      if (preEl) {
        const codeEl = preEl.querySelector("code") || preEl;
        let language: string | undefined;
        const classMatch = (codeEl.className || "").match(/language-([a-zA-Z0-9_-]+)/);
        if (classMatch) {
          language = classMatch[1];
        } else {
          const langEl = el.querySelector("span.uppercase, [data-language]");
          language = langEl?.textContent?.trim() || undefined;
        }
        const code = codeEl.textContent || "";
        if (code.trim()) {
          sections.push({ type: "code", language, code });
        }
        continue;
      }

      // Callout block (has left bar or border with h5)
      const h5 = el.querySelector("h5");
      if (h5) {
        const calloutTitle = h5.textContent?.trim();
        const bodyEl = el.querySelector(".text-\\[15px\\], .text-foreground\\/90, p");
        const calloutText = bodyEl?.textContent?.trim() || el.textContent?.replace(calloutTitle || "", "").trim() || "";
        sections.push({
          type: "callout",
          title: calloutTitle,
          text: calloutText
        });
        continue;
      }

      // Table block
      const tableEl = el.querySelector("table");
      if (tableEl) {
        const tableHeaders = Array.from(tableEl.querySelectorAll("thead th")).map(th => th.textContent?.trim() || "");
        const tableRows = Array.from(tableEl.querySelectorAll("tbody tr")).map(tr =>
          Array.from(tr.querySelectorAll("td")).map(td => td.textContent?.trim() || "")
        );
        if (tableHeaders.length > 0 || tableRows.length > 0) {
          sections.push({
            type: "table",
            tableHeaders,
            tableRows
          });
        }
        continue;
      }

      // List block
      const listEl = el.querySelector("ul, ol");
      if (listEl) {
        const items = Array.from(listEl.querySelectorAll("li")).map(li => li.textContent?.trim() || "").filter(Boolean);
        if (items.length > 0) {
          sections.push({ type: "list", items });
        }
        continue;
      }

      // Paragraph / generic text block
      const paragraphs = el.querySelectorAll("p");
      if (paragraphs.length > 0) {
        paragraphs.forEach(p => {
          const text = p.textContent?.trim();
          if (text) {
            sections.push({ type: "paragraph", text });
          }
        });
      } else {
        const text = el.textContent?.trim();
        if (text && text.length > 3) {
          sections.push({ type: "paragraph", text });
        }
      }
    }
  }

  // 2. If no sections were found (e.g. topic overview / welcome page or markdown fallback), extract from docRoot
  if (sections.length === 0) {
    // Check if there are topic cards
    const cards = docRoot.querySelectorAll(".grid > a, .grid > div");
    if (cards.length > 0) {
      sections.push({
        type: "header",
        level: "h2",
        title: "Temas y Secciones Disponibles"
      });
      cards.forEach(card => {
        const cardTitle = card.querySelector("h3, h4, .font-bold, .font-semibold, span.truncate")?.textContent?.trim();
        const cardDesc = card.querySelector("p, .text-xs, .text-muted-foreground")?.textContent?.trim();
        if (cardTitle) {
          sections.push({
            type: "callout",
            title: cardTitle,
            text: cardDesc || "Módulo de contenido interactivo"
          });
        }
      });
    }

    // Extract any other headings, paragraphs, and lists in docRoot
    const contentElements = docRoot.querySelectorAll("h2, h3, h4, p:not(footer p):not(nav p), pre, table, ul, ol");
    contentElements.forEach(el => {
      if (el.closest("nav") || el.closest("footer") || el.closest(".no-print")) return;

      const tag = el.tagName.toLowerCase();
      if (tag === "h2" || tag === "h3" || tag === "h4") {
        const title = el.textContent?.trim();
        if (title && title !== pageTitle) {
          sections.push({
            type: "header",
            level: tag === "h3" ? "h3" : "h2",
            title
          });
        }
      } else if (tag === "p") {
        const text = el.textContent?.trim();
        if (text && text !== pageSubtitle && text.length > 5) {
          sections.push({ type: "paragraph", text });
        }
      } else if (tag === "pre") {
        const codeEl = el.querySelector("code") || el;
        let language: string | undefined;
        const classMatch = (codeEl.className || "").match(/language-([a-zA-Z0-9_-]+)/);
        if (classMatch) language = classMatch[1];
        const code = codeEl.textContent || "";
        if (code.trim()) {
          sections.push({ type: "code", language, code });
        }
      } else if (tag === "table") {
        const tableHeaders = Array.from(el.querySelectorAll("th")).map(th => th.textContent?.trim() || "");
        const tableRows = Array.from(el.querySelectorAll("tbody tr")).map(tr =>
          Array.from(tr.querySelectorAll("td")).map(td => td.textContent?.trim() || "")
        );
        if (tableHeaders.length > 0 || tableRows.length > 0) {
          sections.push({ type: "table", tableHeaders, tableRows });
        }
      } else if (tag === "ul" || tag === "ol") {
        const items = Array.from(el.querySelectorAll("li")).map(li => li.textContent?.trim() || "").filter(Boolean);
        if (items.length > 0) {
          sections.push({ type: "list", items });
        }
      }
    });
  }

  if (sections.length === 0) {
    sections.push({
      type: "paragraph",
      text: "Documento oficial generado desde SmartClass."
    });
  }

  return {
    pageTitle,
    pageSubtitle,
    sections
  };
}

export function ConfigControls({ 
  projectName,
  projectId,
  currentCodeTheme, 
  themes, 
  courseSettings, 
  isTocOpen, 
  toggleToc, 
  isSidebarOpen, 
  toggleSidebar
}: ConfigControlsProps) {
  const showModeToggle = courseSettings.themeMode === "STUDENT";
  const showCodeThemeSelector = courseSettings.allowCodeThemeChange;
  const showThemeSelector = courseSettings.allowThemeColorChange;

  const hasLeftControls = showThemeSelector || showCodeThemeSelector;
  const hasRightControls = showModeToggle;

  const [fontSize, setFontSize] = React.useState(15);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDownloadPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading("Generando documento PDF...", {
      description: "Compilando estilos y contenido con @react-pdf/renderer",
    });

    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { DocPagePDF } = await import("./DocPagePDF");

      const { pageTitle, pageSubtitle, sections } = extractDocContent(projectName);

      const blob = await pdf(
        <DocPagePDF
          projectName={projectName || "SmartClass"}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          sections={sections}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanSlug = (pageTitle || projectName || "documento")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      link.download = `${cleanSlug || "documento"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF descargado correctamente", {
        id: toastId,
        description: `${cleanSlug}.pdf generado exitosamente`,
      });
    } catch (err) {
      console.error("Error al generar PDF con @react-pdf/renderer:", err);
      toast.error("No se pudo generar el PDF", {
        id: toastId,
        description: "Ocurrió un problema al procesar el documento.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem("smartclass-doc-font-size");
    if (saved) {
      const size = parseInt(saved, 10);
      if (!isNaN(size) && size >= 12 && size <= 24) {
        setFontSize(size);
        document.documentElement.style.setProperty('--doc-font-size', `${size}px`);
      }
    }
  }, []);

  const changeFontSize = (delta: number) => {
    const newSize = Math.min(24, Math.max(12, fontSize + delta));
    setFontSize(newSize);
    localStorage.setItem("smartclass-doc-font-size", newSize.toString());
    document.documentElement.style.setProperty('--doc-font-size', `${newSize}px`);
  };

  const resetFontSize = () => {
    setFontSize(15);
    localStorage.removeItem("smartclass-doc-font-size");
    document.documentElement.style.removeProperty('--doc-font-size');
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Desktop Controls (Visible only on lg and up) */}
      <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
        {showThemeSelector && <ThemeSelector themes={themes} />}
        {showCodeThemeSelector && <CodeThemeSelector currentTheme={currentCodeTheme} />}
        {showModeToggle && <ModeToggle />}
        <PaperModeToggle />

        {/* Font Size Accessibility Controls */}
        <TooltipProvider delayDuration={150}>
          <div className="hidden sm:flex items-center gap-0.5 bg-muted/60 dark:bg-white/[0.04] p-0.5 rounded-lg border border-border/40 dark:border-white/5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-background hover:text-primary transition-all text-xs font-bold cursor-pointer"
                  onClick={() => changeFontSize(-1)}
                  disabled={fontSize <= 12}
                >
                  A-
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[9px] font-bold uppercase tracking-wider">Reducir texto</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/40 dark:bg-white/10" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-background hover:text-primary transition-all text-xs font-bold cursor-pointer"
                  onClick={resetFontSize}
                >
                  {fontSize}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[9px] font-bold uppercase tracking-wider">Tamaño original (15px)</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border/40 dark:bg-white/10" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-background hover:text-primary transition-all text-xs font-bold cursor-pointer"
                  onClick={() => changeFontSize(1)}
                  disabled={fontSize >= 24}
                >
                  A+
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[9px] font-bold uppercase tracking-wider">Aumentar texto</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleDownloadPdf}
                disabled={isExporting}
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 relative opacity-60 hover:opacity-100 hover:text-primary transition-all focus-visible:ring-0 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                ) : (
                  <FileDown className="h-4.5 w-4.5" />
                )}
                <span className="sr-only">Descargar PDF</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-[10px] font-bold uppercase tracking-wider">
                {isExporting ? "Generando PDF..." : "Descargar PDF"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

      <CreditsModal />
    </div>

    {/* Mobile/Tablet Settings Dropdown (Visible only below lg) */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 lg:hidden shrink-0 opacity-60 hover:opacity-100 transition-all cursor-pointer"
        >
          <Settings className="w-4.5 h-4.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-3 bg-background/95 backdrop-blur-md border border-border/50 space-y-4 z-[100]"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 p-0">
          Ajustes de Lectura
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {/* Theme and Mode Selection row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apariencia</span>
          <div className="flex items-center gap-1.5">
            {showThemeSelector && <ThemeSelector themes={themes} />}
            {showModeToggle && <ModeToggle />}
          </div>
        </div>

        {/* Code Theme selection row */}
        {showCodeThemeSelector && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Editor de Código</span>
            <CodeThemeSelector currentTheme={currentCodeTheme} />
          </div>
        )}

        {/* Font size controls */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tamaño de Texto</span>
          <div className="flex items-center gap-0.5 bg-muted/65 dark:bg-white/[0.04] p-0.5 rounded-lg border border-border/40 dark:border-white/5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold"
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= 12}
            >
              A-
            </Button>
            <div className="h-4 w-px bg-border/40 dark:bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold"
              onClick={resetFontSize}
            >
              {fontSize}
            </Button>
            <div className="h-4 w-px bg-border/40 dark:bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold"
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= 24}
            >
              A+
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Action Buttons row: PDF download + credits */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acciones</span>
          <div className="flex items-center gap-1">
            {/* PDF download button */}
            <Button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-70 hover:opacity-100 disabled:opacity-50"
              title="Descargar PDF"
            >
              {isExporting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
              ) : (
                <FileDown className="h-4.5 w-4.5" />
              )}
            </Button>

            {/* Credits Modal */}
            <CreditsModal />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}
