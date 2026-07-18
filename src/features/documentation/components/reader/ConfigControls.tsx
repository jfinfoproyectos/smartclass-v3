"use client";

import React from "react";
import { CodeThemeSelector } from "./CodeThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { ThemeInfo } from "@/app/actions/themes";
import { CreditsModal } from "@/components/CreditsModal";
import { Button } from "@/components/ui/button";
import { FileDown, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function ConfigControls({ 
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
            {/* PDF print button */}
            <Button
              onClick={() => window.print()}
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-70 hover:opacity-100"
            >
              <FileDown className="h-4.5 w-4.5" />
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
