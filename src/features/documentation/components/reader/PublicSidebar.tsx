"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "../../services/public-docs";
import { ChevronDown, ChevronRight, FileText, Folder, Clock, Eye, LayoutGrid, UnfoldVertical, FoldVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DynamicIcon from "../DynamicIcon";

function NavNode({ node, projectId, activeSlug, expandToken }: { 
  node: NavItem, 
  projectId: string, 
  activeSlug: string, 
  expandToken: number
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = activeSlug === node.slug;

  // Sync with global expand/collapse commands
  useEffect(() => {
    if (expandToken > 0) setIsOpen(true);
    if (expandToken < 0) setIsOpen(false);
  }, [expandToken]);
  
  if (node.type === "folder") {
    const hasPage = !node.id.startsWith("folder-");
    return (
      <div className="flex flex-col mb-1.5">
        <div className="flex items-center group w-full pr-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors mr-1"
          >
            <motion.div
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-colors", isActive ? "text-primary opacity-100" : "opacity-40 group-hover:opacity-100")} />
            </motion.div>
          </button>
          
          {hasPage ? (
            <Link 
              href={`/docs/${projectId}/${node.slug}`}
              className={cn(
                "flex-1 flex items-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all truncate",
                isActive ? "text-primary font-black" : "text-muted-foreground hover:text-primary"
              )}
            >
              {node.icon && <DynamicIcon icon={node.icon} className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">{node.title}</span>
            </Link>
          ) : (
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex-1 flex items-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/75 hover:text-primary transition-all text-left"
            >
              <span className="flex-1">{node.title}</span>
            </button>
          )}
        </div>
        
        <AnimatePresence initial={false}>
          {isOpen && node.children && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="ml-4 pl-3.5 border-l border-border/40 hover:border-primary/20 transition-colors duration-300 flex flex-col gap-1 mt-1 overflow-hidden"
            >
              {node.children.map(child => (
                <NavNode key={child.id} node={child} projectId={projectId} activeSlug={activeSlug} expandToken={expandToken} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // File
  const now = new Date();
  const publishDate = node.publishDate ? new Date(node.publishDate) : null;
  const isScheduled = publishDate && publishDate > now;
  const isPublished = publishDate && publishDate <= now;
  const formattedDate = publishDate ? publishDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null;

  return (
    <div className="px-0.5">
      <Link 
        href={isScheduled ? "#" : `/docs/${projectId}/${node.slug === "index" ? "" : node.slug}`}
        onClick={(e) => {
          if (isScheduled) e.preventDefault();
        }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] transition-all duration-300 group mb-0.5 relative overflow-hidden",
          isActive 
            ? "text-primary font-bold bg-primary/5 ring-1 ring-primary/20 shadow-[inset_0_0_20px_rgba(var(--primary),0.02)]" 
            : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:translate-x-1 font-medium",
          isScheduled && "cursor-not-allowed opacity-60 grayscale"
        )}
      >
        {isActive && (
          <motion.div 
            layoutId="active-nav-glow"
            className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        
        {node.icon ? (
          <DynamicIcon icon={node.icon} className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "opacity-40 group-hover:opacity-100 group-hover:text-primary")} />
        ) : (
          <FileText className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "opacity-40 group-hover:opacity-100 group-hover:text-primary")} />
        )}
        
        <span className="flex-1 tracking-tight text-left">{node.title}</span>
        
        {isScheduled && (
          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500/80 border border-amber-500/10 whitespace-nowrap">
            {formattedDate}
          </span>
        )}

        {isPublished && (
          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500/80 border border-emerald-500/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {formattedDate}
          </span>
        )}
      </Link>
    </div>
  );
}

import Search from "./Search";

export function PublicSidebar({ navTree, projectId, className }: { 
  navTree: NavItem[], 
  projectId: string, 
  className?: string 
}) {
  const pathname = usePathname();
  const [expandToken, setExpandToken] = useState(0);

  // Extract slug from pathname: /docs/[projectId]/[...slug]
  const basePath = `/docs/${projectId}`;
  let activeSlug = pathname.replace(basePath, "").replace(/^\//, "");
  if (!activeSlug) activeSlug = "index";

  return (
    <aside className={cn("w-72 border-r border-border dark:border-white/10 h-full bg-card/30 backdrop-blur-md overflow-hidden flex flex-col", className)}>
      {/* Sidebar Toolbar */}
      <div className="p-4 py-2 border-b border-border/40 dark:border-white/5 flex items-center justify-between bg-muted/20">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Contenido</span>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setExpandToken(prev => prev <= 0 ? 1 : prev + 1)}
                  className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UnfoldVertical size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Expandir todo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setExpandToken(prev => prev >= 0 ? -1 : prev - 1)}
                  className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FoldVertical size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Contraer todo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {/* Mobile Search (Hidden on Desktop) */}
        <div className="block md:hidden mb-4 px-0.5">
           <Search projectId={projectId} />
        </div>

        {navTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 opacity-20">
             <LayoutGrid size={24} />
             <p className="text-[10px] font-bold uppercase tracking-widest">Tópico Vacío</p>
          </div>
        ) : (
          navTree.map(node => (
            <NavNode key={node.id} node={node} projectId={projectId} activeSlug={activeSlug} expandToken={expandToken} />
          ))
        )}
      </div>

    </aside>
  );
}
