"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

interface ThemeEnforcerProps {
    themeMode: string;
    themeColor: string;
    allowThemeColorChange: boolean;
}

export function ThemeEnforcer({ themeMode, themeColor, allowThemeColorChange }: ThemeEnforcerProps) {
    const { setTheme } = useTheme();

    useEffect(() => {
        return; // THEME DETECTIVE: Disabled Enforcer to check if this is the culprit
        // 1. Force Theme Mode (Light/Dark)
        if (themeMode === "LIGHT" || themeMode === "DARK") {
            const target = themeMode.toLowerCase();
            setTheme(target);
            // Optional: prevent user from changing it via next-themes if we can
        }

        // 2. Force Theme Color (Palette)
        // If it's forced OR if it's not forced but the user is on 'default', 
        // we might want to apply the admin's choice as the new default.
        if (themeColor) {
            const isDefault = localStorage.getItem("smartclass-theme") === "default" || !localStorage.getItem("smartclass-theme");
            
            // Apply if forced OR if user is on default (to adopt the institutional default)
            if (!allowThemeColorChange || isDefault) {
                const applyColor = async () => {
                    try {
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
                            
                            // Only update if it's different to avoid flickering
                            if (styleEl.innerHTML !== themeData.cssContent) {
                                styleEl.innerHTML = themeData.cssContent;
                                
                                // Sync localStorage so ThemeInitializer and ThemeSelector are happy
                                // We sync if it's forced OR if we are adopting the new institutional default
                                if (!allowThemeColorChange || isDefault) {
                                    localStorage.setItem("smartclass-theme", themeColor);
                                    localStorage.setItem("smartclass-theme-css-v2", themeData.cssContent);
                                    window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
                                }
                            }
                        } else if (themeColor === "zinc") {
                            // Revert to zinc if that's the admin choice
                            const elId = "smartclass-dynamic-theme";
                            const styleEl = document.getElementById(elId);
                            if (styleEl) styleEl.remove();
                            if (!allowThemeColorChange) {
                                localStorage.setItem("smartclass-theme", "default");
                                localStorage.removeItem("smartclass-theme-css-v2");
                                window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
                            }
                        }
                    } catch (error) {
                        console.error("Failed to enforce theme color:", error);
                    }
                };
                applyColor();
            }
        }
    }, [themeMode, themeColor, allowThemeColorChange, setTheme]);

    return null;
}
