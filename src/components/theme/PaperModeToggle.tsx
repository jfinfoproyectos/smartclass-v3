"use client";

import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PAPER_MODE_CSS = `
:root, .dark, body, .public-docs-root {
  --background: #fbf5e6 !important;
  --foreground: #2d261e !important;
  --card: #f4ebd2 !important;
  --card-foreground: #2d261e !important;
  --popover: #f5edd8 !important;
  --popover-foreground: #2d261e !important;
  --primary: #945327 !important;
  --primary-foreground: #fbf5e6 !important;
  --secondary: #eee2c5 !important;
  --secondary-foreground: #4a3c2c !important;
  --muted: #eddcb9 !important;
  --muted-foreground: #73614d !important;
  --accent: #eee2c5 !important;
  --accent-foreground: #2d261e !important;
  --border: #e2cfaa !important;
  --input: #e2cfaa !important;
  --ring: #945327 !important;
  --sidebar-background: #f4ebd2 !important;
  --sidebar-foreground: #2d261e !important;
  --sidebar-primary: #945327 !important;
  --sidebar-border: #e2cfaa !important;
  --sidebar-ring: #945327 !important;
  color-scheme: light !important;
}

.public-docs-root,
.public-docs-root header,
.public-docs-root footer,
.public-docs-root main,
.public-docs-root aside {
  background-color: #fbf5e6 !important;
  border-color: #e2cfaa !important;
  color: #2d261e !important;
}

.public-docs-root .bg-card,
.public-docs-root .bg-muted,
.public-docs-root .bg-muted\\/40,
.public-docs-root .bg-muted\\/30,
.public-docs-root .bg-background\\/80,
.public-docs-root .bg-slate-950\\/80 {
  background-color: #f4ebd2 !important;
  color: #2d261e !important;
}
`;

export function PaperModeToggle({ className }: { className?: string }) {
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const applyPaperMode = (enable: boolean) => {
    const elId = "smartclass-paper-reading-mode";
    let styleEl = document.getElementById(elId);

    if (enable) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = elId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = PAPER_MODE_CSS;
      document.documentElement.classList.add("paper-mode");
      localStorage.setItem("smartclass-paper-mode", "true");
    } else {
      if (styleEl) {
        styleEl.remove();
      }
      document.documentElement.classList.remove("paper-mode");
      localStorage.setItem("smartclass-paper-mode", "false");
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("smartclass-paper-mode") === "true";
    setIsPaperMode(saved);
    if (saved) {
      applyPaperMode(true);
    }
  }, []);

  const togglePaperMode = () => {
    const nextState = !isPaperMode;
    setIsPaperMode(nextState);
    applyPaperMode(nextState);
  };

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePaperMode}
            className={cn(
              "h-8 w-8 rounded-xl transition-all cursor-pointer border shrink-0",
              isPaperMode 
                ? "bg-[#945327]/15 text-[#945327] border-[#945327]/40 font-bold shadow-xs" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
              className
            )}
            aria-label="Modo Lectura Papel"
          >
            <BookOpen className={cn("h-4 w-4 transition-transform", isPaperMode && "scale-110")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-50 text-xs">
          <p className="font-bold text-[10px] uppercase tracking-wider">
            {isPaperMode ? "Desactivar Modo Lectura Papel" : "Modo Lectura Papel (Sepia)"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
