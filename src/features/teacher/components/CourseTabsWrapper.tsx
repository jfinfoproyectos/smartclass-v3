"use client";

import { Tabs } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

/**
 * Inner resolver: reads the URL tab param and syncs it to parent state.
 * Wrapped in its own Suspense so it doesn't affect the children's component tree.
 */
function TabResolver({ onResolved }: { onResolved: (tab: string) => void }) {
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab") || "activities";

    useEffect(() => {
        onResolved(tab);
    }, [tab]);

    return null;
}

/**
 * CourseTabsWrapper avoids SSR/CSR hydration mismatches by:
 * 1. Rendering children on the server immediately (consistent tree = consistent Radix IDs)
 * 2. Using a separately suspended <TabResolver> that only updates the active tab value
 *    without affecting the rest of the component tree structure.
 */
export function CourseTabsWrapper({ children }: { children: React.ReactNode }) {
    const [activeTab, setActiveTab] = useState("activities");

    return (
        <Tabs value={activeTab} className="w-full h-full flex flex-col">
            <Suspense fallback={null}>
                <TabResolver onResolved={setActiveTab} />
            </Suspense>
            {children}
        </Tabs>
    );
}
