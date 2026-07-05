'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className={cn(
        "cursor-help border-b border-dotted border-primary/50 hover:border-primary transition-colors",
        className
      )}>
        {children}
      </span>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 w-max max-w-[250px]"
          >
            <div className="relative rounded-2xl border border-white/10 bg-black/80 dark:bg-white/10 p-3 text-sm text-white backdrop-blur-xl shadow-2xl">
              {content}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/80 dark:border-t-white/10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
