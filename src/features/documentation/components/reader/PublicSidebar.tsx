"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "../../services/public-docs";
import { ChevronDown, FileText, LayoutGrid, UnfoldVertical, FoldVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DynamicIcon from "../DynamicIcon";
import Search from "./Search";

function isMatchingSlug(currentPath: string, targetSlug: string): boolean {
  if (!currentPath || !targetSlug) return false;
  const cleanCurrent = decodeURIComponent(currentPath).toLowerCase().replace(/^\//, "").replace(/\/$/, "");
  const cleanTarget = decodeURIComponent(targetSlug).toLowerCase().replace(/^\//, "").replace(/\/$/, "");
  
  if (cleanCurrent === cleanTarget) return true;
  if (cleanCurrent.endsWith("/" + cleanTarget)) return true;
  
  const lastPartCurrent = cleanCurrent.split("/").pop();
  const lastPartTarget = cleanTarget.split("/").pop();
  return !!lastPartCurrent && lastPartCurrent === lastPartTarget;
}

function NavNode({ node, projectId, activeSlug, expandToken }: { 
  node: NavItem, 
  projectId: string, 
  activeSlug: string, 
  expandToken: number
}) {
  const isActive = isMatchingSlug(activeSlug, node.slug);

  const isChildActive = useMemo(() => {
    if (!node.children) return false;
    const checkChildren = (children: NavItem[]): boolean => {
      return children.some(child => 
        isMatchingSlug(activeSlug, child.slug) || (child.children && checkChildren(child.children))
      );
    };
    return checkChildren(node.children);
  }, [node.children, activeSlug]);

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (isChildActive || isActive) {
      setIsOpen(true);
    }
  }, [isChildActive, isActive]);

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
            className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors mr-1 cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isOpen ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-colors", (isActive || isChildActive) ? "text-emerald-500 opacity-100" : "opacity-40 group-hover:opacity-100")} />
            </motion.div>
          </button>
          
          {hasPage ? (
            <Link 
              href={`/docs/${projectId}/${node.slug}`}
              className={cn(
                "flex-1 flex items-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all truncate",
                isActive ? "text-emerald-500 font-extrabold" : "text-muted-foreground hover:text-emerald-500"
              )}
            >
              {node.icon && <DynamicIcon icon={node.icon} className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left truncate">{node.title}</span>
            </Link>
          ) : (
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex-1 flex items-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 hover:text-emerald-500 transition-all text-left truncate cursor-pointer"
            >
              <span className="flex-1 truncate">{node.title}</span>
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
              className="ml-4 pl-3 border-l border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/30 transition-colors duration-300 flex flex-col gap-1 mt-1 overflow-hidden"
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
          "flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-[13px] transition-all duration-300 group mb-1 relative overflow-hidden",
          isActive 
            ? "text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]" 
            : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 hover:translate-x-1 font-medium",
          isScheduled && "cursor-not-allowed opacity-60 grayscale"
        )}
      >
        {isActive && (
          <motion.div 
            layoutId="active-nav-glow"
            className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        
        {node.icon ? (
          <DynamicIcon icon={node.icon} className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110 shrink-0", isActive ? "text-emerald-500" : "opacity-50 group-hover:opacity-100 group-hover:text-emerald-500")} />
        ) : (
          <FileText className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110 shrink-0", isActive ? "text-emerald-500" : "opacity-50 group-hover:opacity-100 group-hover:text-emerald-500")} />
        )}
        
        <span className="flex-1 tracking-tight text-left truncate">{node.title}</span>
        
        {isScheduled && (
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
            {formattedDate}
          </span>
        )}

        {isPublished && (
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {formattedDate}
          </span>
        )}
      </Link>
    </div>
  );
}

export function PublicSidebar({ navTree, projectId, className }: { 
  navTree: NavItem[], 
  projectId: string, 
  className?: string 
}) {
  const pathname = usePathname();
  const [expandToken, setExpandToken] = useState(0);

  // Extract active path from URL: /docs/[projectId]/[...slug]
  const basePath = `/docs/${projectId}`;
  let activeSlug = pathname.replace(basePath, "").replace(/^\//, "");
  if (!activeSlug) activeSlug = "index";

  return (
    <aside className={cn("w-72 border-r border-slate-200/80 dark:border-slate-800/80 h-full bg-background/50 backdrop-blur-xl overflow-hidden flex flex-col", className)}>
      {/* Sidebar Toolbar */}
      <div className="p-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-muted/20">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Contenido</span>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setExpandToken(prev => prev <= 0 ? 1 : prev + 1)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <FoldVertical size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Contraer todo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {/* Mobile Search (Hidden on Desktop) */}
        <div className="block md:hidden mb-4 px-0.5">
           <Search projectId={projectId} />
        </div>

        {navTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 opacity-30">
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
