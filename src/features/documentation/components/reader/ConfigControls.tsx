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

interface ConfigControlsProps {
  projectName?: string;
  projectId?: string;
  rawContent?: string;
  pageTitle?: string;
  pageCategory?: string;
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

export function ConfigControls({ 
  projectName,
  projectId,
  rawContent,
  pageTitle,
  pageCategory,
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
    const toastId = toast.loading("Generando documento corporativo PDF...", {
      description: "Compilando contenido Markdown estándar y maquetación ejecutiva",
    });

    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { DocPagePDF } = await import("./DocPagePDF");

      // 1. Obtener el Markdown real de la lección / página
      let markdown = rawContent;
      let title = pageTitle;
      let category = pageCategory;

      if (!markdown) {
        const dataEl = document.getElementById("doc-raw-markdown-data");
        if (dataEl) {
          const contentText = dataEl.textContent?.trim() || "";
          if (contentText) {
            try {
              markdown = decodeURIComponent(contentText);
            } catch {
              markdown = contentText;
            }
          }
          if (!title) title = dataEl.getAttribute("data-title") || undefined;
          if (!category) category = dataEl.getAttribute("data-category") || undefined;
        }
      }

      // 2. Extraer título de h1 en DOM si aún no existe
      if (!title) {
        const h1 = document.querySelector("#doc-content h1, main h1, h1");
        title = h1?.textContent?.trim() || projectName || "Documento Técnico";
      }

      // 3. Fallback de extracción si no se obtuvo markdown puro
      if (!markdown) {
        const docRoot = document.getElementById("doc-content") || document.querySelector("main") || document.body;
        const nodes = Array.from(docRoot.querySelectorAll("h1, h2, h3, h4, p:not(footer p):not(nav p), pre, table, ul, ol, blockquote"));
        const fallbackLines: string[] = [];
        nodes.forEach(node => {
          if (node.closest("nav") || node.closest("footer") || node.closest(".no-print")) return;
          const tag = node.tagName.toLowerCase();
          const txt = node.textContent?.trim() || "";
          if (!txt) return;
          if (tag === "h1") fallbackLines.push(`# ${txt}\n`);
          else if (tag === "h2") fallbackLines.push(`## ${txt}\n`);
          else if (tag === "h3") fallbackLines.push(`### ${txt}\n`);
          else if (tag === "h4") fallbackLines.push(`#### ${txt}\n`);
          else if (tag === "p") fallbackLines.push(`${txt}\n`);
          else if (tag === "pre") {
            const codeEl = node.querySelector("code") || node;
            let lang = "";
            const match = (codeEl.className || "").match(/language-([a-zA-Z0-9_-]+)/);
            if (match) lang = match[1];
            fallbackLines.push(`\`\`\`${lang}\n${codeEl.textContent || txt}\n\`\`\`\n`);
          }
          else if (tag === "blockquote") fallbackLines.push(`> ${txt}\n`);
          else if (tag === "ul" || tag === "ol") {
            const lis = node.querySelectorAll("li");
            lis.forEach((li, idx) => {
              fallbackLines.push(`${tag === "ol" ? `${idx + 1}.` : "-"} ${li.textContent?.trim()}`);
            });
            fallbackLines.push("");
          }
        });
        markdown = fallbackLines.join("\n");
      }

      const blob = await pdf(
        <DocPagePDF
          projectName={projectName || "SmartClass"}
          pageTitle={title}
          category={category}
          markdownContent={markdown}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanSlug = (title || projectName || "documento")
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

      toast.success("PDF generado con éxito", {
        id: toastId,
        description: `${cleanSlug}.pdf descargado con estilo corporativo.`,
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
