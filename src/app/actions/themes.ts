"use server";

import fs from "fs/promises";
import path from "path";

export interface ThemeInfo {
  id: string;
  name: string;
  primaryColor: string;
  cssContent: string;
}

import { unstable_noStore as noStore } from 'next/cache';

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
      
      const primaryMatch = cssContent.match(/--primary:\s*([^;]+);/);
      let primaryColor = "hsl(0 0% 50%)"; // fallback
      
      if (primaryMatch && primaryMatch[1]) {
        primaryColor = primaryMatch[1].trim();
        if (/^[\d\.]+\s+[\d\.]+%/.test(primaryColor)) {
          primaryColor = `hsl(${primaryColor})`;
        }
      }
      
      // Increase specificity to ensure it overrides globals.css
      let processedCss = cssContent;
      processedCss = processedCss.replace(/:root\s*\{/g, ":root, html {");
      processedCss = processedCss.replace(/\.dark\s*\{/g, ".dark, html.dark {");
      
      // Inject !important to guarantee custom themes win against Tailwind's default variables
      processedCss = processedCss.replace(/(--[a-zA-Z0-9-]+:\s*[^;!]+)(;)/g, "$1 !important$2");

      themes.push({
        id,
        name,
        primaryColor,
        cssContent: processedCss
      });
    }
    
    return themes;
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}
