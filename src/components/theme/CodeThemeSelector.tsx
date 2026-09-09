"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Code2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { setCodeTheme } from "@/app/actions/code-themes";
import { updateUserVisualSettingsAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

export const SHIKI_THEMES = [
  { id: "github-dark", name: "GitHub Dark" },
  { id: "github-light", name: "GitHub Light" },
  { id: "dracula", name: "Dracula" },
  { id: "nord", name: "Nord" },
  { id: "tokyo-night", name: "Tokyo Night" },
  { id: "ayu-dark", name: "Ayu Dark" },
  { id: "one-dark-pro", name: "One Dark Pro" },
  { id: "one-light", name: "One Light" },
  { id: "monokai", name: "Monokai" },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha" },
];

interface CodeThemeSelectorProps {
  currentTheme?: string;
  asSubMenu?: boolean;
  className?: string;
}

export function CodeThemeSelector({ currentTheme, asSubMenu, className }: CodeThemeSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTheme, setActiveTheme] = useState(currentTheme || "one-dark-pro");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentTheme) {
      setActiveTheme(currentTheme);
      return;
    }
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };
    const saved = getCookie("code-theme");
    if (saved) setActiveTheme(saved);
  }, [currentTheme]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTheme(customEvent.detail);
      }
    };
    window.addEventListener("code-theme-change", handler);
    return () => window.removeEventListener("code-theme-change", handler);
  }, []);

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    startTransition(async () => {
      await setCodeTheme(themeId);
      updateUserVisualSettingsAction({ appCodeTheme: themeId }).catch(() => {});
      window.dispatchEvent(new CustomEvent("code-theme-change", { detail: themeId }));
      router.refresh();
    });
  };

  if (!mounted) {
    if (asSubMenu) {
      return (
        <DropdownMenuItem className="cursor-pointer text-xs">
          <Code2 className="mr-2 h-4 w-4 opacity-50" />
          <span>Estilo de Código</span>
        </DropdownMenuItem>
      );
    }
    return (
      <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-lg shrink-0 opacity-50", className)}>
        <Code2 className="h-3.5 w-3.5" />
      </Button>
    );
  }

  if (asSubMenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer text-xs">
          <Code2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Estilo de Código</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-56 bg-background/95 backdrop-blur-md border-border/80 shadow-xl max-h-[320px] overflow-y-auto">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">
              Tema de Código
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SHIKI_THEMES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className="flex items-center justify-between cursor-pointer text-xs py-2 px-3"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-1.5 h-3 rounded-full shrink-0",
                      t.id.includes("light") ? "bg-slate-300" : "bg-slate-800"
                    )}
                  />
                  <span className={cn(activeTheme === t.id ? "font-bold text-primary" : "font-medium")}>
                    {t.name}
                  </span>
                </div>
                {activeTheme === t.id && <Check className="w-3.5 h-3.5 ml-2 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-lg shrink-0 relative opacity-70 hover:opacity-100 transition-all focus-visible:ring-0",
            className
          )}
          title="Estilo de Código"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Code2 className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">Seleccionar Estilo de Código</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[170px] max-h-[320px] overflow-y-auto rounded-xl">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">
          Estilo de Código
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {SHIKI_THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="flex items-center justify-between cursor-pointer text-xs py-2 px-3"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-1.5 h-3 rounded-full shrink-0",
                  theme.id.includes("light") ? "bg-slate-300" : "bg-slate-800"
                )}
              />
              <span className={cn(activeTheme === theme.id ? "font-bold text-primary" : "font-medium")}>
                {theme.name}
              </span>
            </div>
            {activeTheme === theme.id && <Check className="w-3.5 h-3.5 ml-2 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
