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

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
}

export function ThemeSelector({ themes, asSubMenu }: ThemeSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("smartclass-theme") || "default";
    setActiveTheme(savedTheme);

    const handleExternalThemeChange = () => {
      const current = localStorage.getItem("smartclass-theme") || "default";
      setActiveTheme(current);
    };

    window.addEventListener("smartclass-theme-changed", handleExternalThemeChange);
    return () => {
      window.removeEventListener("smartclass-theme-changed", handleExternalThemeChange);
    };
  }, []);

  const handleThemeSelect = async (themeId: string) => {
    setActiveTheme(themeId);
    try {
      const { updateUserVisualSettingsAction } = await import("@/app/actions/settings");
      await updateUserVisualSettingsAction({ appThemeColor: themeId });
    } catch (err) {
      console.error("Failed to persist theme color to DB:", err);
    }
  };

  useEffect(() => {
    if (!mounted || activeTheme === null) return;

    const elId = "smartclass-dynamic-theme";
    let styleEl = document.getElementById(elId);

    if (activeTheme === "default") {
      if (styleEl) styleEl.remove();
      localStorage.setItem("smartclass-theme", "default");
      localStorage.removeItem("smartclass-theme-css-v2");
      return;
    }

    const themeData = themes.find((t) => t.id === activeTheme);
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

    styleEl.innerHTML = finalCss;
    
    // Dynamic Font Loading
    handleFontLoading(finalCss);
    
    localStorage.setItem("smartclass-theme", activeTheme);
    localStorage.setItem("smartclass-theme-css-v2", finalCss);
    window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
  }, [activeTheme, themes, mounted]);

  const handleFontLoading = (css: string) => {
    const fontVars = ['--font-sans', '--font-serif', '--font-mono'];
    const foundFonts = new Set<string>();

    fontVars.forEach(v => {
      const reg = new RegExp(`${v}:\\s*([^;]+);`);
      const match = css.match(reg);
      if (match && match[1]) {
        const firstFont = match[1].split(',')[0].trim().replace(/['"]/g, '');
        if (firstFont && !isSystemFont(firstFont)) {
          foundFonts.add(firstFont);
        }
      }
    });

    if (foundFonts.size > 0) {
      const fontQuery = Array.from(foundFonts)
        .map(f => `family=${f.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900`)
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
      'inter', 'roboto', 'geist', 'sans-serif', 'serif', 'monospace', 
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
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-50">
        <Palette className="h-4 w-4" />
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
          <DropdownMenuSubContent className="w-[200px] bg-background border-border">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50 flex items-center justify-between">
              <span>Temas 60-30-10</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleThemeSelect("default")}
              className="flex items-center justify-between cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2">
                {renderThemeSwatch()}
                <span>Predeterminado</span>
              </div>
              {activeTheme === "default" && <Check className="w-3 h-3 ml-2" />}
            </DropdownMenuItem>

            {themes.map((theme) => (
              <DropdownMenuItem 
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className="flex items-center justify-between cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  {renderThemeSwatch(theme)}
                  <span>{theme.name}</span>
                </div>
                {activeTheme === theme.id && <Check className="w-3 h-3 ml-2" />}
              </DropdownMenuItem>
            ))}
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
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 focus-visible:ring-0 opacity-60 hover:opacity-100 transition-all">
                 <Palette className="h-4 w-4" />
                 <span className="sr-only">Apariencia</span>
              </Button>
            </TooltipTrigger>
          </span>
        </DropdownMenuTrigger>
        <TooltipContent>
          <p>Apariencia (Sistema 60-30-10)</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-[200px] bg-background/95 backdrop-blur-md border-border/80 shadow-xl">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-60 flex items-center justify-between">
          <span>Temas 60-30-10</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleThemeSelect("default")}
          className="flex items-center justify-between cursor-pointer text-xs"
        >
          <div className="flex items-center gap-2">
            {renderThemeSwatch()}
            <span>Predeterminado</span>
          </div>
          {activeTheme === "default" && <Check className="w-3 h-3 ml-2" />}
        </DropdownMenuItem>

        {themes.map((theme) => (
          <DropdownMenuItem 
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              {renderThemeSwatch(theme)}
              <span>{theme.name}</span>
            </div>
            {activeTheme === theme.id && <Check className="w-3 h-3 ml-2 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

