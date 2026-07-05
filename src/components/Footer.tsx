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
        <footer className="w-full py-2 text-center text-xs text-muted-foreground bg-muted/30 border-t mt-auto">
            <div
                className="container mx-auto px-4"
                dangerouslySetInnerHTML={{ __html: footerText }}
            />
        </footer>
    );
}
