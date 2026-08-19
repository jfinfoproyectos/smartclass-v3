"use server";

import fs from "fs/promises";
import path from "path";

export interface ThemeInfo {
  id: string;
  name: string;
  primaryColor: string; // 10% Accent
  cardColor: string;    // 30% Secondary
  bgColor: string;      // 60% Dominant Canvas
  cssContent: string;
}

import { unstable_noStore as noStore } from 'next/cache';

function parseCssColor(css: string, varName: string, fallback: string): string {
  const reg = new RegExp(`${varName}:\\s*([^;!]+)`);
  const match = css.match(reg);
  if (match && match[1]) {
    let color = match[1].trim();
    if (/^[\d\.]+\s+[\d\.]+%/.test(color)) {
      color = `hsl(${color})`;
    }
    return color;
  }
  return fallback;
}

export async function getAvailableThemes(): Promise<ThemeInfo[]> {
  noStore();
  try {
    const themesDir = path.join(process.cwd(), "src/app/themes");
    const files = await fs.readdir(themesDir);
    
    const cssFiles = files.filter(file => file.endsWith(".css"));
    
    const themes: ThemeInfo[] = [];
    
    for (const file of cssFiles) {
      const filePath = path.join(themesDir, file);
      const cssContent = await fs.readFile(filePath, "utf-8");
      
      const id = file.replace(".css", "");
      const name = id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
      
      const primaryColor = parseCssColor(cssContent, "--primary", "hsl(210 100% 50%)");
      const cardColor = parseCssColor(cssContent, "--card", "hsl(0 0% 100%)");
      const bgColor = parseCssColor(cssContent, "--background", "hsl(0 0% 97%)");
      
      // Clean up directives meant for build-time tailwind
      let processedCss = cssContent
        .replace(/@import\s+["']tailwindcss["'];?/g, "")
        .replace(/@custom-variant\s+dark\s+\([^)]+\);?/g, "")
        .replace(/@theme\s+inline\s*\{[\s\S]*?\}/g, "");
      
      // Increase specificity to ensure it overrides globals.css
      processedCss = processedCss.replace(/:root\s*\{/g, ":root, html {");
      processedCss = processedCss.replace(/\.dark\s*\{/g, ".dark, html.dark {");
      
      // Inject !important to guarantee custom themes win against Tailwind's default variables
      processedCss = processedCss.replace(/(--[a-zA-Z0-9-]+:\s*[^;!]+)(;)/g, "$1 !important$2");

      themes.push({
        id,
        name,
        primaryColor,
        cardColor,
        bgColor,
        cssContent: processedCss
      });
    }
    
    return themes;
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}

