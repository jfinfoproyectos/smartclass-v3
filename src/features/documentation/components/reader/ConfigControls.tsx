"use client";

import React from "react";
import { CodeThemeSelector } from "./CodeThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { ThemeInfo } from "@/app/actions/themes";
import { CreditsModal } from "@/components/CreditsModal";
import { Button } from "@/components/ui/button";
import { FileDown, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfigControlsProps {
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
}

export function ConfigControls({ currentCodeTheme, themes, courseSettings, isTocOpen, toggleToc }: ConfigControlsProps) {
  const showModeToggle = courseSettings.themeMode === "STUDENT";
  const showCodeThemeSelector = courseSettings.allowCodeThemeChange;
  const showThemeSelector = courseSettings.allowThemeColorChange;

  const hasLeftControls = showThemeSelector || showCodeThemeSelector;
  const hasRightControls = showModeToggle;

  const [fontSize, setFontSize] = React.useState(15);

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
      {showThemeSelector && <ThemeSelector themes={themes} />}
      {showCodeThemeSelector && <CodeThemeSelector currentTheme={currentCodeTheme} />}
      {showModeToggle && <ModeToggle />}

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
              onClick={() => window.print()}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 relative opacity-60 hover:opacity-100 hover:text-primary transition-all focus-visible:ring-0 cursor-pointer"
            >
              <FileDown className="h-4.5 w-4.5" />
              <span className="sr-only">Descargar PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-[10px] font-bold uppercase tracking-wider">Descargar PDF</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Toggle TOC Sidebar Control */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleToc}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 relative opacity-60 hover:opacity-100 hover:text-primary transition-all focus-visible:ring-0 cursor-pointer hidden xl:flex"
            >
              {isTocOpen ? (
                <PanelRightClose className="h-4.5 w-4.5" />
              ) : (
                <PanelRightOpen className="h-4.5 w-4.5" />
              )}
              <span className="sr-only">Índice de Temas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-[10px] font-bold uppercase tracking-wider">
              {isTocOpen ? "Ocultar Índice" : "Mostrar Índice"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CreditsModal />
    </div>
  );
}
