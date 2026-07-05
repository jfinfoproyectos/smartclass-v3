"use client";

import { Tabs } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export function CourseTabsWrapper({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Cargando Dashboard...</span>
                </div>
            </div>
        }>
            <CourseTabsContent>{children}</CourseTabsContent>
        </Suspense>
    );
}

function CourseTabsContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "activities";

    return (
        <Tabs value={activeTab} className="w-full h-full flex flex-col">
            {children}
        </Tabs>
    );
}
