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
            const currentSaved = localStorage.getItem("smartclass-theme") || "default";

            if (currentSaved !== themeColor) {
                const applyColor = async () => {
                    try {
                        if (themeColor === "zinc" || themeColor === "default") {
                            const elId = "smartclass-dynamic-theme";
                            const styleEl = document.getElementById(elId);
                            if (styleEl) styleEl.remove();
                            localStorage.setItem("smartclass-theme", "default");
                            localStorage.removeItem("smartclass-theme-css-v2");
                            window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
                            return;
                        }

                        const response = await fetch("/api/themes");
                        const themes = await response.json();
                        const themeData = themes.find((t: any) => t.id === themeColor);

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

                            styleEl.innerHTML = finalCss;
                            localStorage.setItem("smartclass-theme", themeColor);
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
