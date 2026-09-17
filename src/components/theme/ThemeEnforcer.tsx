"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

interface ThemeEnforcerProps {
    themeMode: string;
    themeColor: string;
    allowThemeColorChange: boolean;
}

export function ThemeEnforcer({ themeMode, themeColor, allowThemeColorChange }: ThemeEnforcerProps) {
    const { setTheme } = useTheme();
    const initializedRef = useRef(false);

    // 1. Force/Sync Theme Mode (Light/Dark) on initial load or when server prop changes
    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            if (themeMode === "LIGHT" || themeMode === "DARK") {
                const target = themeMode.toLowerCase();
                setTheme(target);
            }
        }
    }, [themeMode, setTheme]);

    // 2. Sync Theme Color (Palette) from user's DB settings
    useEffect(() => {
        if (themeColor) {
            const currentSaved = localStorage.getItem("smartclass-theme");
            const effectiveSaved = (!currentSaved || currentSaved === "default") ? "ocean-breeze" : currentSaved;
            const targetColor = (themeColor === "default") ? "ocean-breeze" : themeColor;

            if (effectiveSaved !== targetColor) {
                const applyColor = async () => {
                    try {
                        if (targetColor === "zinc") {
                            const elId = "smartclass-dynamic-theme";
                            const styleEl = document.getElementById(elId);
                            if (styleEl) styleEl.remove();
                            localStorage.setItem("smartclass-theme", "zinc");
                            localStorage.removeItem("smartclass-theme-css-v2");
                            window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
                            return;
                        }

                        const response = await fetch("/api/themes");
                        const themes = await response.json();
                        const themeData = themes.find((t: any) => t.id === targetColor);

                        if (themeData) {
                            const elId = "smartclass-dynamic-theme";
                            let styleEl = document.getElementById(elId);
                            if (!styleEl) {
                                styleEl = document.createElement("style");
                                styleEl.id = elId;
                                document.head.appendChild(styleEl);
                            }

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
                            localStorage.setItem("smartclass-theme", targetColor);
                            localStorage.setItem("smartclass-theme-css-v2", finalCss);
                            window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
                        }
                    } catch (error) {
                        console.error("Failed to enforce theme color:", error);
                    }
                };
                applyColor();
            }
        }
    }, [themeColor]);

    return null;
}
