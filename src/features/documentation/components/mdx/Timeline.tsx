'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor de línea de tiempo con diseño minimalista y limpio.
 */
export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn(
      "relative my-10 ml-4 border-l-2 border-slate-200 dark:border-white/10 space-y-10 pb-1",
      className
    )}>
      {children}
    </div>
  );
}

interface TimelineItemProps {
  title: string;
  date?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'active';
  children?: React.ReactNode;
}

/**
 * Item individual de la línea de tiempo sin tarjetas, priorizando la legibilidad.
 */
export function TimelineItem({ 
  title, 
  date, 
  variant = 'default', 
  children 
}: TimelineItemProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'success': return "bg-emerald-500 border-background dark:border-[#0a0a0a]";
      case 'warning': return "bg-amber-500 border-background dark:border-[#0a0a0a]";
      case 'info': return "bg-sky-500 border-background dark:border-[#0a0a0a]";
      case 'active': return "bg-primary border-background dark:border-[#0a0a0a] ring-4 ring-primary/20";
      default: return "bg-slate-300 dark:bg-slate-600 border-background dark:border-[#0a0a0a]";
    }
  };

  return (
    <div className="relative pl-8 group animate-in fade-in slide-in-from-left-4 duration-500">
      {/* Indicador circular sobre la línea */}
      <div className={cn(
        "absolute left-[-9px] top-1.5 h-4 w-4 rounded-full border-2 transition-transform group-hover:scale-125 duration-300 z-10",
        getVariantStyles()
      )} />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white/90 tracking-tight transition-colors group-hover:text-primary">
            {title}
          </h4>
          {date && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 shadow-sm">
              {date}
            </span>
          )}
        </div>
        
        {children && (
          <div className="text-base text-slate-600 dark:text-white/65 leading-relaxed max-w-none">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
