'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Circle, Clock, Rocket, Star } from 'lucide-react';

type RoadmapStatus = 'planned' | 'in-progress' | 'beta' | 'released';

interface RoadmapItemProps {
  title: string;
  description?: string;
  status: RoadmapStatus;
  date?: string;
  isLast?: boolean;
}

const statusConfig: Record<RoadmapStatus, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  glow: string;
}> = {
  planned: {
    icon: Clock,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    label: 'Planeado',
    glow: '',
  },
  'in-progress': {
    icon: Circle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    label: 'En Progreso',
    glow: 'shadow-[0_0_14px_rgba(96,165,250,0.25)]',
  },
  beta: {
    icon: Star,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    label: 'Beta',
    glow: 'shadow-[0_0_14px_rgba(192,132,252,0.3)]',
  },
  released: {
    icon: Rocket,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    label: 'Lanzado',
    glow: 'shadow-[0_0_14px_rgba(52,211,153,0.3)]',
  },
};

export function Roadmap({ children, items }: { children?: React.ReactNode, items?: any }) {
  const finalItems = useMemo(() => {
    if (!items) return [];
    if (typeof items === 'string') {
      try {
        const normalized = items.replace(/'/g, '"');
        return JSON.parse(normalized);
      } catch (e) {
        console.error("Error parsing items JSON in Roadmap:", e);
        return [];
      }
    }
    return Array.isArray(items) ? items : [];
  }, [items]);

  if (finalItems.length > 0) {
    return (
      <div className="relative my-10 space-y-0">
        {finalItems.map((item: any, i: number) => (
          <RoadmapItem 
            key={i} 
            title={item.title || ""} 
            description={item.description} 
            status={item.status || "planned"} 
            date={item.date}
            isLast={i === finalItems.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative my-10 space-y-0">
      {children}
    </div>
  );
}

export function RoadmapItem({ title, description, status, date, isLast }: RoadmapItemProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex gap-5 group"
    >
      {/* Left column: icon + connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Icon circle */}
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 group-hover:scale-110 z-10 flex-shrink-0',
          config.bgColor,
          config.borderColor,
          config.color,
          config.glow,
        )}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Connector line — hidden on last item */}
        {!isLast && (
          <div className="mt-1 flex-1 w-px bg-gradient-to-b from-border/60 to-transparent min-h-[2rem]" />
        )}
      </div>

      {/* Right column: content card */}
      <div className="flex-1 pb-8">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6 transition-all duration-300 hover:bg-black/[0.07] dark:hover:bg-white/[0.07] hover:shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h3>
            <span className={cn(
              'rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest border whitespace-nowrap',
              config.bgColor,
              config.borderColor,
              config.color,
            )}>
              {config.label}
            </span>
          </div>

          {date && (
            <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60">
              <Clock className="h-3.5 w-3.5" />
              {date}
            </div>
          )}

          {description && (
            <p className="text-muted-foreground/80 leading-relaxed text-base">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
