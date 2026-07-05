"use client";

import React, { useState, useTransition } from "react";
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
} from "@/components/ui/dropdown-menu";
import { setCodeTheme } from "@/app/actions/code-themes";
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
  currentTheme: string;
}

export function CodeThemeSelector({ currentTheme }: CodeThemeSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTheme, setActiveTheme] = useState(currentTheme);

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    startTransition(async () => {
      await setCodeTheme(themeId);
      window.dispatchEvent(new CustomEvent("code-theme-change", { detail: themeId }));
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0 relative opacity-60 hover:opacity-100 transition-all focus-visible:ring-0" 
          title="Tema de Código"
          disabled={isPending}
        >
           {isPending ? (
             <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
           ) : (
             <Code2 className="h-4 w-4" />
           )}
           <span className="sr-only">Seleccionar Tema de Código</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px] max-h-[300px] overflow-y-auto rounded-xl">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Estilo de Código</DropdownMenuLabel>
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
                  "w-1.5 h-3 rounded-full",
                  theme.id.includes("light") ? "bg-slate-300" : "bg-slate-800"
                )}
              />
              <span className={cn(
                activeTheme === theme.id ? "font-bold text-primary" : "font-medium"
              )}>
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
