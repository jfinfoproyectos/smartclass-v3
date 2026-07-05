'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd className={cn(
      "pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/10 px-1.5 font-mono text-[10px] font-bold text-foreground opacity-100 shadow-[0_2px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_2px_0_0_rgba(255,255,255,0.05)] mx-0.5",
      className
    )}>
      {children}
    </kbd>
  );
}
