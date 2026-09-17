"use client";

import { Tabs } from "@/components/ui/tabs";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

/**
 * Inner resolver: reads the URL tab param and pathname, syncing it to parent state.
 * Wrapped in its own Suspense so it doesn't affect the children's component tree.
 */
function TabResolver({ onResolved }: { onResolved: (tab: string) => void }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) {
            onResolved(tab);
        } else if (pathname?.includes("/evaluations")) {
            onResolved("evaluations");
        } else if (pathname?.includes("/activities")) {
            onResolved("activities");
        } else if (pathname?.includes("/duplicates")) {
            onResolved("activities");
        } else {
            onResolved("activities");
        }
    }, [searchParams, pathname, onResolved]);

    return null;
}

/**
 * CourseTabsWrapper avoids SSR/CSR hydration mismatches by:
 * 1. Rendering children on the server immediately (consistent tree = consistent Radix IDs)
 * 2. Using a separately suspended <TabResolver> that only updates the active tab value
 *    without affecting the rest of the component tree structure.
 */
export function CourseTabsWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const getInitialTab = () => {
        if (pathname?.includes("/evaluations")) return "evaluations";
        if (pathname?.includes("/activities")) return "activities";
        return "activities";
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);

    return (
        <Tabs value={activeTab} className="w-full h-full flex flex-col">
            <Suspense fallback={null}>
                <TabResolver onResolved={setActiveTab} />
            </Suspense>
            {children}
        </Tabs>
    );
}
