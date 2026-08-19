"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { NavItem } from "../../services/public-docs";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-8 border-t border-border/80">
      {prev ? (
        <Link 
          href={`/docs/${projectId}/${prev.slug === "index" ? "" : prev.slug}`}
          className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary transition-colors mb-0.5">
              Tema Anterior
            </span>
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {prev.title}
            </span>
          </div>
        </Link>
      ) : <div />}

      {next ? (
        <Link 
          href={`/docs/${projectId}/${next.slug === "index" ? "" : next.slug}`}
          className="group relative overflow-hidden flex items-center justify-end gap-4 p-5 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 text-right"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary transition-colors mb-0.5">
              Siguiente Tema
            </span>
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {next.title}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      ) : <div />}
    </div>
  );
}
