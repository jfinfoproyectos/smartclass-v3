"use client";

import { useEffect, useState } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = async () => {
      const savedThemeId = localStorage.getItem("smartclass-theme") || "default";
      if (savedThemeId === "default") {
        const styleEl = document.getElementById("smartclass-dynamic-theme");
        if (styleEl) styleEl.remove();
        return;
      }

      try {
        let cssContent = localStorage.getItem("smartclass-theme-css-v2");
        
        // Only fetch if we don't have the CSS cached
        if (!cssContent) {
          const response = await fetch("/api/themes");
          const themes = await response.json();
          const themeData = themes.find((t: any) => t.id === savedThemeId);
          if (themeData && themeData.cssContent) {
            let finalCss = themeData.cssContent;
            if (!finalCss.includes('!important')) {
              finalCss = finalCss.replace(/(--[a-zA-Z0-9-]+:\s*[^;!]+)(;)/g, "$1 !important$2");
            }
            cssContent = finalCss;
            localStorage.setItem("smartclass-theme-css-v2", finalCss);
          }
        }

        if (cssContent) {
          let styleEl = document.getElementById("smartclass-dynamic-theme");
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "smartclass-dynamic-theme";
            document.head.appendChild(styleEl);
          }
          styleEl.innerHTML = cssContent;
          
          handleFontLoading(cssContent);
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error);
      }
    };

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

    applyTheme();

    // Listen for storage changes from other tabs/instances
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "smartclass-theme") {
        applyTheme();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-tab changes if needed, 
    // but usually ThemeSelector handles locally.
    // However, if we have multiple selectors, they should listen too.
    window.addEventListener("smartclass-theme-changed", applyTheme);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("smartclass-theme-changed", applyTheme);
    };
  }, []);

  return null;
}
