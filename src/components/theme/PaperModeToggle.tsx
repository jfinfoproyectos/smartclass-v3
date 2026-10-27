"use client";

import React, { useEffect, useState, useCallback } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function interpolateColor(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = lerp(c1[0], c2[0], t);
  const g = lerp(c1[1], c2[1], t);
  const b = lerp(c1[2], c2[2], t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function generatePaperModeCss(warmth: number): string {
  const t = Math.min(100, Math.max(0, warmth)) / 100;
  
  const interpolate = (cLow: [number, number, number], cMid: [number, number, number], cHigh: [number, number, number]) => {
    if (t < 0.5) {
      const subT = t * 2;
      return interpolateColor(cLow, cMid, subT);
    } else {
      const subT = (t - 0.5) * 2;
      return interpolateColor(cMid, cHigh, subT);
    }
  };

  const bg = interpolate([250, 248, 245], [251, 245, 230], [242, 226, 192]);
  const card = interpolate([244, 238, 226], [244, 235, 210], [234, 215, 174]);
  const fg = interpolate([33, 29, 25], [45, 38, 30], [35, 24, 12]);
  const border = interpolate([230, 219, 201], [226, 207, 170], [212, 185, 137]);
  const muted = interpolate([238, 228, 212], [237, 220, 185], [226, 201, 155]);
  const mutedFg = interpolate([112, 98, 83], [115, 97, 77], [102, 76, 48]);
  const primary = interpolate([140, 75, 32], [148, 83, 39], [122, 50, 14]);
  const textureOpacity = (0.015 + t * 0.055).toFixed(3);

  return `
:root, .dark, body, .public-docs-root {
  --background: ${bg} !important;
  --foreground: ${fg} !important;
  --card: ${card} !important;
  --card-foreground: ${fg} !important;
  --popover: ${card} !important;
  --popover-foreground: ${fg} !important;
  --primary: ${primary} !important;
  --primary-foreground: ${bg} !important;
  --secondary: ${card} !important;
  --secondary-foreground: ${fg} !important;
  --muted: ${muted} !important;
  --muted-foreground: ${mutedFg} !important;
  --accent: ${card} !important;
  --accent-foreground: ${fg} !important;
  --border: ${border} !important;
  --input: ${border} !important;
  --ring: ${primary} !important;
  --sidebar-background: ${card} !important;
  --sidebar-foreground: ${fg} !important;
  --sidebar-primary: ${primary} !important;
  --sidebar-border: ${border} !important;
  --sidebar-ring: ${primary} !important;
  color-scheme: light !important;
}

.public-docs-root,
.public-docs-root header,
.public-docs-root footer,
.public-docs-root main,
.public-docs-root aside {
  background-color: ${bg} !important;
  border-color: ${border} !important;
  color: ${fg} !important;
}

.public-docs-root .bg-card,
.public-docs-root .bg-muted,
.public-docs-root .bg-muted\\/40,
.public-docs-root .bg-muted\\/30,
.public-docs-root .bg-background\\/80,
.public-docs-root .bg-slate-950\\/80 {
  background-color: ${card} !important;
  color: ${fg} !important;
}

/* Paper grain overlay */
body.paper-mode::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: ${textureOpacity};
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}
`;
}

export function applyPaperMode(enable: boolean, warmth: number = 50) {
  if (typeof document === "undefined") return;
  const elId = "smartclass-paper-reading-mode";
  let styleEl = document.getElementById(elId);

  if (enable) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = elId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = generatePaperModeCss(warmth);
    document.documentElement.classList.add("paper-mode");
    document.body.classList.add("paper-mode");
    localStorage.setItem("smartclass-paper-mode", "true");
    localStorage.setItem("smartclass-paper-warmth", warmth.toString());
  } else {
    if (styleEl) {
      styleEl.remove();
    }
    document.documentElement.classList.remove("paper-mode");
    document.body.classList.remove("paper-mode");
    localStorage.setItem("smartclass-paper-mode", "false");
  }
}

export function usePaperMode() {
  const [isPaperMode, setIsPaperMode] = useState(false);
  const [paperWarmth, setPaperWarmth] = useState(50);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("smartclass-paper-mode") === "true";
    const savedWarmth = parseInt(localStorage.getItem("smartclass-paper-warmth") || "50", 10);
    const validWarmth = !isNaN(savedWarmth) ? Math.min(100, Math.max(0, savedWarmth)) : 50;

    setIsPaperMode(savedMode);
    setPaperWarmth(validWarmth);
    if (savedMode) {
      applyPaperMode(true, validWarmth);
    }

    const handleCustomChange = (e: any) => {
      if (e.detail?.enabled !== undefined) {
        setIsPaperMode(e.detail.enabled);
      }
      if (e.detail?.warmth !== undefined) {
        setPaperWarmth(e.detail.warmth);
      }
    };

    window.addEventListener("smartclass-paper-mode-change", handleCustomChange);
    return () => window.removeEventListener("smartclass-paper-mode-change", handleCustomChange);
  }, []);

  const togglePaperMode = useCallback(() => {
    const nextState = !isPaperMode;
    setIsPaperMode(nextState);
    applyPaperMode(nextState, paperWarmth);
    window.dispatchEvent(new CustomEvent("smartclass-paper-mode-change", {
      detail: { enabled: nextState, warmth: paperWarmth }
    }));
  }, [isPaperMode, paperWarmth]);

  const updatePaperWarmth = useCallback((newWarmth: number) => {
    const clamped = Math.min(100, Math.max(0, newWarmth));
    setPaperWarmth(clamped);
    if (isPaperMode) {
      applyPaperMode(true, clamped);
    }
    localStorage.setItem("smartclass-paper-warmth", clamped.toString());
    window.dispatchEvent(new CustomEvent("smartclass-paper-mode-change", {
      detail: { enabled: isPaperMode, warmth: clamped }
    }));
  }, [isPaperMode]);

  return {
    isPaperMode,
    paperWarmth,
    mounted,
    togglePaperMode,
    updatePaperWarmth
  };
}

export function PaperSimulationSlider({ className }: { className?: string }) {
  const { isPaperMode, paperWarmth, updatePaperWarmth, mounted } = usePaperMode();

  if (!mounted || !isPaperMode) return null;

  return (
    <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#945327]/10 dark:bg-[#945327]/15 border border-[#945327]/30 shadow-2xs animate-in fade-in zoom-in-95 duration-200", className)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#945327] shrink-0">
                Papel <span className="font-extrabold">{paperWarmth}%</span>
              </span>
              <div className="w-16 sm:w-24">
                <Slider
                  value={[paperWarmth]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals) => updatePaperWarmth(vals[0])}
                  className="cursor-pointer"
                  aria-label="Control de simulación de papel"
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-bold text-[10px] uppercase tracking-wider">
              Simulación de Papel: {paperWarmth}%
            </p>
            <p className="text-[9px] text-muted-foreground">
              Ajusta tono cálido, textura de grano y contraste
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function PaperModeToggle({ className }: { className?: string }) {
  const { isPaperMode, togglePaperMode, mounted } = usePaperMode();

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
