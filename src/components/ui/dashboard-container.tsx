"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return (
    <div className={cn("min-h-[calc(100vh-4rem)] h-auto w-full max-w-full pb-12", className)}>
      <div className="relative flex flex-col w-full space-y-6 sm:space-y-8 px-3 sm:px-6 md:px-8 pt-3 sm:pt-6">
        {children}
      </div>
    </div>
  );
}
