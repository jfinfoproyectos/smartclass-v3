"use client";

import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";

export function Footer() {
    const [footerText, setFooterText] = useState<string | null>(null);

    useEffect(() => {
        getSettingsAction().then((settings) => {
            if (settings?.footerText) {
                setFooterText(settings.footerText);
            }
        });
    }, []);

    if (!footerText) return null;

    return (
        <footer className="shrink-0 w-full py-1.5 text-center text-xs text-muted-foreground bg-background/95 backdrop-blur-sm border-t">
            <div
                className="container mx-auto px-4"
                dangerouslySetInnerHTML={{ __html: footerText }}
            />
        </footer>
    );
}
