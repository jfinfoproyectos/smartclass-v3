'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BentoGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function BentoGrid({ children, columns = 3, className }: BentoGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn(
      "grid gap-4 my-8",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  title: string;
  description?: string;
  icon?: string;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  href?: string;
  children?: React.ReactNode;
}

export function BentoCard({ 
  title, 
  description, 
  icon, 
  className, 
  colSpan = 1, 
  rowSpan = 1,
  href,
  children 
}: BentoCardProps) {
  const IconComponent = icon ? (Icons as any)[icon] : null;

  const colSpans = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
  };

  const rowSpans = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
  };

  const CardContent = (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        "relative group flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:bg-white/[0.08] shadow-sm h-full",
        colSpans[colSpan],
        rowSpans[rowSpan],
        className
      )}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-1">
          {IconComponent && (
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] group-hover:scale-110 transition-transform duration-500">
              <IconComponent className="h-6 w-6" />
            </div>
          )}
          <h3 className="mb-3 text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight break-words">{title}</h3>
          {description && (
            <p className="text-base text-muted-foreground/85 leading-relaxed">
              {description}
            </p>
          )}
          {children && <div className="mt-6 flex-1">{children}</div>}
        </div>
      </div>

      {/* Premium Decorations */}
      <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-[80px] pointer-events-none group-hover:bg-primary/20 transition-colors" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full no-underline">
        {CardContent}
      </a>
    );
  }

  return <div className="h-full">{CardContent}</div>;
}
