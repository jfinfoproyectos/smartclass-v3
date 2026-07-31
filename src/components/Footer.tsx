"use client";

import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import { Sparkles } from "lucide-react";

export function Footer() {
    const [footerText, setFooterText] = useState<string | null>(null);
    const [institutionName, setInstitutionName] = useState<string>("SmartClass");

    useEffect(() => {
        getSettingsAction().then((settings) => {
            if (settings?.footerText) {
                setFooterText(settings.footerText);
            }
            if (settings?.institutionName) {
                setInstitutionName(settings.institutionName);
            }
        });
    }, []);

    return (
        <footer className="relative shrink-0 w-full bg-background/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] transition-all py-2">
            {/* Subtle ambient top line */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent absolute top-0 left-0" />

            <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>{institutionName}</span>
                </div>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                {footerText ? (
                    <div
                        className="text-[11px]"
                        dangerouslySetInnerHTML={{ __html: footerText }}
                    />
                ) : (
                    <span>© {new Date().getFullYear()} Plataforma Académica. Todos los derechos reservados.</span>
                )}
            </div>
        </footer>
    );
}
