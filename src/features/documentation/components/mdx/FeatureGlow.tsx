'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface FeatureGlowGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FeatureGlowGrid({ children, columns = 3, className }: FeatureGlowGridProps) {
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

interface FeatureGlowCardProps {
  title: string;
  description?: string;
  icon?: string;
  className?: string;
  href?: string;
  glowColor?: string;
}

export function FeatureGlowCard({ 
  title, 
  description, 
  icon, 
  className,
  href,
  glowColor = "rgba(var(--primary-rgb), 0.15)"
}: FeatureGlowCardProps) {
  const IconComponent = icon ? (Icons as any)[icon] : null;
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`
    radial-gradient(
      650px circle at ${mouseX}px ${mouseY}px,
      ${glowColor},
      transparent 80%
    )
  `;

  const CardInner = (
    <div 
      onMouseMove={onMouseMove}
      className={cn(
        "group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-black/5 dark:bg-white/5 p-8 transition-all duration-300 hover:bg-black/10 dark:hover:bg-white/10",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      
      <div className="relative z-10">
        {IconComponent && (
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
            <IconComponent className="h-7 w-7" />
          </div>
        )}
        <h3 className="mb-3 text-xl md:text-2xl font-bold tracking-tight text-foreground transition-colors break-words">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground/80 leading-relaxed break-words">
            {description}
          </p>
        )}
      </div>

      <div className="relative z-10 mt-8 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        Saber más <Icons.ArrowRight className="ml-2 h-4 w-4" />
      </div>

      {/* Subtle border glow on hover */}
      <div className="absolute inset-0 z-0 border border-primary/0 group-hover:border-primary/20 rounded-[2rem] transition-colors duration-500 pointer-events-none" />
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full no-underline">
        {CardInner}
      </a>
    );
  }

  return <div className="h-full">{CardInner}</div>;
}
