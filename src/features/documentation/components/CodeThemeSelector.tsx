"use client";

import { useState, useTransition } from "react";
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
  { id: "dracula-soft", name: "Dracula Soft" },
  { id: "nord", name: "Nord" },
  { id: "tokyo-night", name: "Tokyo Night" },
  { id: "night-owl", name: "Night Owl" },
  { id: "ayu-dark", name: "Ayu Dark" },
  { id: "one-dark-pro", name: "One Dark Pro" },
  { id: "one-light", name: "One Light" },
  { id: "monokai", name: "Monokai" },
  { id: "vesper", name: "Vesper" },
  { id: "poimandres", name: "Poimandres" },
  { id: "rose-pine", name: "Rosé Pine" },
  { id: "rose-pine-moon", name: "Rosé Pine Moon" },
  { id: "rose-pine-dawn", name: "Rosé Pine Dawn" },
  { id: "catppuccin-frappe", name: "Catppuccin Frappé" },
  { id: "catppuccin-latte", name: "Catppuccin Latte" },
  { id: "catppuccin-macchiato", name: "Catppuccin Macchiato" },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha" },
  { id: "kanagawa-wave", name: "Kanagawa Wave" },
  { id: "kanagawa-dragon", name: "Kanagawa Dragon" },
  { id: "kanagawa-lotus", name: "Kanagawa Lotus" },
  { id: "material-theme", name: "Material Default" },
  { id: "material-theme-darker", name: "Material Darker" },
  { id: "material-theme-lighter", name: "Material Lighter" },
  { id: "material-theme-ocean", name: "Material Ocean" },
  { id: "material-theme-palenight", name: "Material Palenight" },
  { id: "everforest-dark", name: "Everforest Dark" },
  { id: "everforest-light", name: "Everforest Light" },
  { id: "solarized-dark", name: "Solarized Dark" },
  { id: "solarized-light", name: "Solarized Light" },
  { id: "laserwave", name: "Laserwave" },
  { id: "synthwave-84", name: "Synthwave '84" },
  { id: "vitesse-dark", name: "Vitesse Dark" },
  { id: "vitesse-light", name: "Vitesse Light" },
  { id: "slack-dark", name: "Slack Dark" },
  { id: "slack-ochin", name: "Slack Ochin" },
  { id: "houston", name: "Houston (Astro)" },
  { id: "min-dark", name: "Min Dark" },
  { id: "min-light", name: "Min Light" },
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
      // Dispatch custom event for reactive updates (like the editor preview)
      window.dispatchEvent(new CustomEvent("code-theme-change", { detail: themeId }));
      // Efficiently refresh only the server components of the current page
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 relative" 
          title="Tema de Código"
          disabled={isPending}
        >
           {isPending ? (
             <Loader2 className="h-[1.1rem] w-[1.1rem] animate-spin text-primary" />
           ) : (
             <Code2 className="h-[1.1rem] w-[1.1rem] transition-all" />
           )}
           <span className="sr-only">Seleccionar Tema de Código</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px] max-h-[400px] overflow-y-auto overflow-x-hidden">
        <DropdownMenuLabel>Estilo de Código</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {SHIKI_THEMES.map((theme) => (
          <DropdownMenuItem 
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div 
                className={cn(
                  "w-1.5 h-3 rounded-full",
                  theme.id.includes("light") ? "bg-slate-300" : "bg-slate-800"
                )}
              />
              <span className={cn(
                activeTheme === theme.id ? "font-bold text-primary" : ""
              )}>
                {theme.name}
              </span>
            </div>
            {activeTheme === theme.id && <Check className="w-4 h-4 ml-2 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
