"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TabEmptyStateProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function TabEmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: TabEmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border/70 rounded-2xl bg-muted/10 dark:bg-card/40 transition-colors",
                className
            )}
        >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3.5 shadow-2xs">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1 tracking-tight">
                {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                {description}
            </p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
