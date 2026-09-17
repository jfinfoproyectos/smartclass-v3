"use client";

import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "next-themes";
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
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

import { updateUserVisualSettingsAction } from "@/app/actions/settings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ThemeInfo {
  id: string;
  name: string;
  primaryColor: string; // 10% Accent
  cardColor?: string;   // 30% Secondary
  bgColor?: string;     // 60% Base
  cssContent: string;
}

interface ThemeSelectorProps {
  themes: ThemeInfo[];
  asSubMenu?: boolean;
  className?: string;
}

export function ThemeSelector({ themes, asSubMenu, className }: ThemeSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const { theme } = useTheme();

  const sortedThemes = [...themes].sort((a, b) => {
    if (a.id === "ocean-breeze") return -1;
    if (b.id === "ocean-breeze") return 1;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("smartclass-theme");
    const eff = (!savedTheme || savedTheme === "default") ? "ocean-breeze" : savedTheme;
    setActiveTheme(eff);

    const handleExternalThemeChange = () => {
      const current = localStorage.getItem("smartclass-theme");
      const effCurr = (!current || current === "default") ? "ocean-breeze" : current;
      setActiveTheme(effCurr);
    };

    window.addEventListener("smartclass-theme-changed", handleExternalThemeChange);
    return () => {
      window.removeEventListener("smartclass-theme-changed", handleExternalThemeChange);
    };
  }, []);

  const handleThemeSelect = (themeId: string) => {
    setActiveTheme(themeId);
    updateUserVisualSettingsAction({ appThemeColor: themeId }).catch((err) => {
      console.error("Failed to persist theme color to DB:", err);
    });
  };

  useEffect(() => {
    if (!mounted || activeTheme === null) return;

    const elId = "smartclass-dynamic-theme";
    let styleEl = document.getElementById(elId);

    if (activeTheme === "zinc") {
      if (styleEl) styleEl.remove();
      localStorage.setItem("smartclass-theme", "zinc");
      localStorage.removeItem("smartclass-theme-css-v2");
      window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
      return;
    }

    const targetThemeId = (activeTheme === "default") ? "ocean-breeze" : activeTheme;
    const themeData = themes.find((t) => t.id === targetThemeId);
    if (!themeData) return;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = elId;
      document.head.appendChild(styleEl);
    } else {
      // Move to end of head to ensure it overrides other styles
      document.head.appendChild(styleEl);
    }

    // Ultimate Client-Side Fallback: If the server sent cached CSS without !important,
    // we forcefully append it here to guarantee invincibility against Tailwind v4
    let finalCss = themeData.cssContent;
    if (!finalCss.includes('!important')) {
      finalCss = finalCss.replace(/(--[a-zA-Z0-9-]+:\s*[^;!]+)(;)/g, "$1 !important$2");
    }

    if (!finalCss.includes('font-family: var(--font-sans)')) {
      finalCss += `
html, body, button, input, select, textarea {
  font-family: var(--font-sans) !important;
}
h1, h2, h3, h4, h5, h6, .prose h1, .prose h2, .prose h3, .prose h4 {
  font-family: var(--font-heading, var(--font-sans)) !important;
}
`;
    }

    styleEl.innerHTML = finalCss;
    
    // Dynamic Font Loading
    handleFontLoading(finalCss);
    
    localStorage.setItem("smartclass-theme", targetThemeId);
    localStorage.setItem("smartclass-theme-css-v2", finalCss);
    window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
  }, [activeTheme, themes, mounted]);

  const handleFontLoading = (css: string) => {
    const fontVars = ['--font-sans', '--font-heading', '--font-serif', '--font-mono'];
    const foundFonts = new Set<string>();

    fontVars.forEach(v => {
      const reg = new RegExp(`${v}:\\s*([^;]+);`);
      const match = css.match(reg);
      if (match && match[1]) {
        const cleanVal = match[1].replace(/!important/g, '').trim();
        const fonts = cleanVal.split(',').map(f => f.trim().replace(/['"]/g, ''));
        for (const font of fonts) {
          if (font && !isSystemFont(font)) {
            foundFonts.add(font);
            break;
          }
        }
      }
    });

    if (foundFonts.size > 0) {
      const fontQuery = Array.from(foundFonts)
        .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;600;700`)
        .join('&');
      
      const linkId = "smartclass-dynamic-fonts";
      let linkEl = document.getElementById(linkId) as HTMLLinkElement;
      
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.id = linkId;
        linkEl.rel = "stylesheet";
        document.head.appendChild(linkEl);
      }
      
      linkEl.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    }
  };

  const isSystemFont = (font: string) => {
    const systemFonts = [
      'sans-serif', 'serif', 'monospace', 'cursive',
      'ui-sans-serif', 'system-ui', '-apple-system', 'blinkmacsystemfont',
      'segoe ui', 'helvetica neue', 'arial', 'noto sans', 'apple color emoji',
      'segoe ui emoji', 'segoe ui symbol', 'noto color emoji', 'georgia',
      'cambria', 'times new roman', 'times', 'ui-serif', 'ui-monospace',
      'sfmono-regular', 'menlo', 'monaco', 'consolas', 'liberation mono',
      'courier new'
    ];
    return systemFonts.includes(font.toLowerCase());
  };

  const renderThemeSwatch = (t?: ThemeInfo) => {
    if (!t) {
      return (
        <div className="flex w-5 h-3.5 rounded-sm overflow-hidden border border-black/10 dark:border-white/10 shrink-0" title="Regla 60-30-10 Predeterminada">
          <div className="w-[60%] h-full bg-background" />
          <div className="w-[30%] h-full bg-card" />
          <div className="w-[10%] h-full bg-primary" />
        </div>
      );
    }
    return (
      <div className="flex w-5 h-3.5 rounded-sm overflow-hidden border border-black/10 dark:border-white/10 shrink-0" title="Regla 60-30-10: 60% Fondo, 30% Tarjetas, 10% Acento">
        <div className="w-[60%] h-full" style={{ backgroundColor: t.bgColor || "var(--background)" }} />
        <div className="w-[30%] h-full" style={{ backgroundColor: t.cardColor || "var(--card)" }} />
        <div className="w-[10%] h-full" style={{ backgroundColor: t.primaryColor || "var(--primary)" }} />
      </div>
    );
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 opacity-50">
        <Palette className="h-3.5 w-3.5" />
      </Button>
    );
  }

  if (asSubMenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer text-xs">
          <Palette className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Apariencia (60-30-10)</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-56 bg-background/95 backdrop-blur-md border-border/80 shadow-xl max-h-80 overflow-y-auto custom-scrollbar">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-60 flex items-center justify-between">
              <span>Paleta 60-30-10</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {sortedThemes.map((theme) => (
              <DropdownMenuItem 
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  {renderThemeSwatch(theme)}
                  <span className="font-medium">
                    {theme.name}
                    {theme.id === "ocean-breeze" && (
                      <span className="ml-1 text-[10px] text-primary font-normal">(Predeterminado)</span>
                    )}
                  </span>
                </div>
                {(activeTheme === theme.id || (theme.id === "ocean-breeze" && (!activeTheme || activeTheme === "default"))) && (
                  <Check className="w-3 h-3 ml-2 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={() => handleThemeSelect("zinc")}
              className="flex items-center justify-between cursor-pointer text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                {renderThemeSwatch()}
                <span>Neutro (Sin tema)</span>
              </div>
              {activeTheme === "zinc" && <Check className="w-3 h-3 ml-2 shrink-0" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger asChild>
          <span className="inline-block">
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/90 dark:hover:bg-accent/70 hover:shadow-2xs transition-all", 
                  className
                )}
              >
                 <Palette className="h-3.5 w-3.5" />
                 <span className="sr-only">Apariencia</span>
              </Button>
            </TooltipTrigger>
          </span>
        </DropdownMenuTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Paleta de colores (60-30-10)</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-[210px] bg-background/95 backdrop-blur-md border-border/80 shadow-xl max-h-80 overflow-y-auto custom-scrollbar">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-60 flex items-center justify-between">
          <span>Temas 60-30-10</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {sortedThemes.map((theme) => (
          <DropdownMenuItem 
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              {renderThemeSwatch(theme)}
              <span className="font-medium">
                {theme.name}
                {theme.id === "ocean-breeze" && (
                  <span className="ml-1 text-[10px] text-primary font-normal">(Predeterminado)</span>
                )}
              </span>
            </div>
            {(activeTheme === theme.id || (theme.id === "ocean-breeze" && (!activeTheme || activeTheme === "default"))) && (
              <Check className="w-3 h-3 ml-2 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={() => handleThemeSelect("zinc")}
          className="flex items-center justify-between cursor-pointer text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            {renderThemeSwatch()}
            <span>Neutro (Sin tema)</span>
          </div>
          {activeTheme === "zinc" && <Check className="w-3 h-3 ml-2 shrink-0" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

