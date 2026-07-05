'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Accordion({ children, allowMultiple = false, items }: { children?: React.ReactNode; allowMultiple?: boolean; items?: any }) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const finalItems = useMemo(() => {
    if (!items) return [];
    if (typeof items === 'string') {
      try {
        const parsed = new Function(`return ${items}`)();
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        try {
          const normalized = items.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          return JSON.parse(normalized);
        } catch (err) {
          console.error("Error parsing items JSON in Accordion:", err);
          return [];
        }
      }
    }
    return Array.isArray(items) ? items : [];
  }, [items]);

  const toggleIndex = (index: number) => {
    if (allowMultiple) {
      setOpenIndexes(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndexes(prev => (prev.includes(index) ? [] : [index]));
    }
  };

  if (finalItems.length > 0) {
    return (
      <div className="my-6 border border-white/10 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 divide-y divide-white/10 shadow-lg backdrop-blur-sm">
        {finalItems.map((item: any, i: number) => (
          <AccordionItem
            key={i}
            title={item.title || ""}
            isOpen={openIndexes.includes(i)}
            onToggle={() => toggleIndex(i)}
          >
            {item.content || item.description || ""}
          </AccordionItem>
        ))}
      </div>
    );
  }

  return (
    <div className="my-6 border border-white/10 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 divide-y divide-white/10 shadow-lg backdrop-blur-sm">
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen: openIndexes.includes(index),
            onToggle: () => toggleIndex(index),
          });
        }
        return child;
      })}
    </div>
  );
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function AccordionItem({ title, children, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="group border-white/10">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-5 text-left transition-all focus:outline-none",
          isOpen ? "bg-primary/5 border-b border-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
        )}
      >
        <span className={cn(
          "font-bold text-base transition-colors duration-200",
          isOpen ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
        )}>
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 transition-colors duration-200",
              isOpen ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
            )} 
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="p-5 text-sm leading-relaxed text-muted-foreground/90 bg-black/[0.01] dark:bg-white/[0.01] border-t border-white/5 prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
