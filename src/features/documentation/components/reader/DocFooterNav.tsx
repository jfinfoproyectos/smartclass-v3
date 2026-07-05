"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { NavItem } from "../../services/public-docs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface DocFooterNavProps {
  navTree: NavItem[];
  currentSlug: string;
  projectId: string;
}

export function DocFooterNav({ navTree, currentSlug, projectId }: DocFooterNavProps) {
  const { prev, next } = useMemo(() => {
    const flatItems: NavItem[] = [];
    
    const flatten = (items: NavItem[]) => {
      items.forEach(item => {
        if (item.type === "file") {
          flatItems.push(item);
        } else if (item.children) {
          flatten(item.children);
        }
      });
    };
    
    flatten(navTree);
    
    const currentIndex = flatItems.findIndex(item => item.slug === currentSlug || (currentSlug === "" && item.slug === "index"));
    
    return {
      prev: currentIndex > 0 ? flatItems[currentIndex - 1] : null,
      next: currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null,
    };
  }, [navTree, currentSlug]);

  if (!prev && !next) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-border/10">
      {prev ? (
        <Link 
          href={`/docs/${projectId}/${prev.slug === "index" ? "" : prev.slug}`}
          className="group flex flex-col items-start p-6 rounded-2xl border border-border/20 bg-card/5 hover:bg-primary/5 hover:border-primary/20 transition-all"
        >
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-primary/60 mb-2">
            <ChevronLeft size={12} />
            Anterior
          </span>
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : <div />}

      {next ? (
        <Link 
          href={`/docs/${projectId}/${next.slug === "index" ? "" : next.slug}`}
          className="group flex flex-col items-end p-6 rounded-2xl border border-border/20 bg-card/5 hover:bg-primary/5 hover:border-primary/20 transition-all text-right"
        >
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-hover:text-primary/60 mb-2">
            Siguiente
            <ChevronRight size={12} />
          </span>
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {next.title}
          </span>
        </Link>
      ) : <div />}
    </div>
  );
}
