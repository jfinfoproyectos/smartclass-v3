"use client";

import React, { useMemo, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PublicHeader } from "./PublicHeader";
import { PublicSidebar } from "./PublicSidebar";
import RightSidebar from "./RightSidebar";
import { TopicsHeader } from "./TopicsHeader";
import { NavItem } from "../../services/public-docs";
import { ThemeInfo } from "@/app/actions/themes";
import { recordProjectVisitAction } from "../../actions/progressActions";
import { Eye, Zap, Clock } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ReadingProgress } from "./ReadingProgress";
import { DocFooterNav } from "./DocFooterNav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PublicDocsShellProps {
  children: React.ReactNode;
  projectName: string;
  projectId: string;
  navTree: NavItem[];
  currentCodeTheme: string;
  themes: ThemeInfo[];
  userProgress?: { pageId: string, completed: boolean, timeSpent: number }[];
  userTotalViews?: number;
  courseSettings?: {
    themeMode: string;
    codeTheme: string;
    allowCodeThemeChange: boolean;
    themeColor: string;
    allowThemeColorChange: boolean;
  };
}

export function PublicDocsShell({ 
  children, 
  projectName, 
  projectId, 
  navTree, 
  currentCodeTheme, 
  themes, 
  userProgress = [], 
  userTotalViews = 0,
  courseSettings = { themeMode: "STUDENT", codeTheme: "one-dark-pro", allowCodeThemeChange: true, themeColor: "zinc", allowThemeColorChange: true }
}: PublicDocsShellProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState(false);
  const [isTocOpen, setIsTocOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartclass-toc-open");
      return saved !== "false";
    }
    return true;
  });

  const toggleToc = () => {
    setIsTocOpen(prev => {
      const next = !prev;
      localStorage.setItem("smartclass-toc-open", String(next));
      return next;
    });
  };

  const totalTimeSpentSeconds = useMemo(() => {
    return userProgress.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
  }, [userProgress]);

  const formattedTime = useMemo(() => {
    if (totalTimeSpentSeconds === 0) return "0 min";
    if (totalTimeSpentSeconds < 60) return "< 1 min";
    const minutes = Math.floor(totalTimeSpentSeconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes} min`;
  }, [totalTimeSpentSeconds]);

  React.useEffect(() => {
    setMounted(true);
    
    // 1. Aplicar forzado de tema (Light/Dark)
    if (courseSettings.themeMode === "LIGHT" && theme !== "light") {
      setTheme("light");
    } else if (courseSettings.themeMode === "DARK" && theme !== "dark") {
      setTheme("dark");
    }

    // 2. Aplicar forzado de color de tema (Paleta)
    if (!courseSettings.allowThemeColorChange && courseSettings.themeColor) {
      const elId = "smartclass-dynamic-theme";
      let styleEl = document.getElementById(elId);
      const themeData = themes.find((t) => t.id === courseSettings.themeColor);
      
      if (themeData) {
        let finalCss = themeData.cssContent;
        if (!finalCss.includes('!important')) {
          finalCss = finalCss.replace(/(--[a-zA-Z0-9-]+:\s*[^;!]+)(;)/g, "$1 !important$2");
        }
        
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = elId;
          document.head.appendChild(styleEl);
        } else {
          // Re-append to ensure it's the last child and has precedence
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = finalCss;
      } else {
        // If theme is zinc, default, or not found, forcefully reset any custom theme styles
        if (styleEl) styleEl.innerHTML = "";
        localStorage.removeItem("smartclass-theme-css-v2");
        localStorage.setItem("smartclass-theme", "default");
      }
    }
  }, [projectId, courseSettings.themeMode, courseSettings.themeColor, courseSettings.allowThemeColorChange, setTheme, themes]);
  
  // Efecto para buscar y desplazar al texto exacto si viene de una búsqueda (?h=...)
  useEffect(() => {
    const highlightWord = searchParams.get('h');
    const hash = window.location.hash.replace('#', '');
    
    if (!highlightWord && !hash) return;

    let attempts = 0;
    const maxAttempts = 1;

    const tryScroll = () => {
      const mainScroll = document.getElementById('main-content');
      const docContent = document.getElementById('doc-content');
      if (!mainScroll || !docContent) return false;

      let targetElement: HTMLElement | null = null;

      // 1. Prioridad: Hash si existe
      if (hash) {
        targetElement = document.getElementById(hash);
      }

      // 2. Fallback: Buscar palabra clave
      if (!targetElement && highlightWord) {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchTerm = normalize(highlightWord);

        const walker = document.createTreeWalker(docContent, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while (node = walker.nextNode()) {
          const text = normalize(node.textContent || "");
          if (text.includes(searchTerm)) {
            targetElement = node.parentElement;
            break;
          }
        }
      }

      if (targetElement) {
        const parentRect = targetElement.getBoundingClientRect();
        const scrollRect = mainScroll.getBoundingClientRect();
        const offset = 120;
        const targetTop = (parentRect.top - scrollRect.top) + mainScroll.scrollTop - offset;

        mainScroll.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth'
        });

        // Resaltado visual intenso si hay palabra
        if (highlightWord) {
          targetElement.style.transition = 'all 0.5s ease';
          targetElement.classList.add('bg-primary/30', 'ring-8', 'ring-primary/20', 'rounded-lg', 'scale-105', 'z-10', 'relative');
          
          setTimeout(() => {
            targetElement?.classList.remove('bg-primary/30', 'ring-8', 'ring-primary/20', 'scale-105');
          }, 5000);
        }
        
        return true;
      }
      return false;
    };

    // Reintentos para asegurar que el contenido cargó (especialmente en MDX con imágenes)
    const intervals = [100, 300, 800, 1500, 3000];
    intervals.forEach(ms => {
      setTimeout(() => {
        if (attempts < 1) { 
          if (tryScroll()) attempts++;
        }
      }, ms);
    });

  }, [pathname, searchParams]);
  
  // Reset de scroll al cambiar de página
  // Next.js no resetea automáticamente el scroll de contenedores personalizados (como #main-content)
  useEffect(() => {
    // Si hay un hash o un highlight (?h=), dejamos que los otros efectos manejen el scroll
    if (window.location.hash || searchParams.get('h')) return;

    const mainScroll = document.getElementById('main-content');
    if (mainScroll) {
      mainScroll.scrollTop = 0;
    }
  }, [pathname]);

  // Actualizar el título de la pestaña del navegador (document.title) con el nombre del tema seleccionado
  useEffect(() => {
    const updateTitle = () => {
      const docHeading = document.querySelector("#doc-content h1, #doc-content h2, h1, h2");
      if (docHeading && docHeading.textContent && docHeading.textContent.trim()) {
        document.title = docHeading.textContent.trim();
      } else {
        document.title = projectName || "Documentación";
      }
    };

    const timer = setTimeout(updateTitle, 150);
    return () => clearTimeout(timer);
  }, [pathname, projectName, children]);

  // Logic to determine active topic and filtered sidebar tree
  const { topics, activeTopic, sidebarNav } = useMemo(() => {
    // 1. Get all top-level topics (folders at level 0)
    const allTopics = navTree.filter(item => item.type === "folder");
    
    // 2. Identify active topic from URL
    // URL: /docs/[projectId]/[topicSlug]/...
    const pathParts = pathname.split('/').filter(Boolean);
    // pathParts[0] = "docs", pathParts[1] = projectId, pathParts[2] = topicSlug
    const topicSlugFromUrl = pathParts[2] || null;
    
    const active = allTopics.find(t => t.slug === topicSlugFromUrl) || null;
    
    // 3. Determine what to show in sidebar
    // If we have an active topic, show its children (categories)
    // If not, and there are topics, we might be at the root index
    const sidebar = active?.children || (topicSlugFromUrl ? [] : navTree);

    return {
      topics: allTopics,
      activeTopic: active,
      sidebarNav: sidebar
    };
  }, [navTree, pathname]);

  return (
    <div className="public-docs-root flex flex-col h-screen w-full overflow-hidden bg-background text-foreground transition-all duration-500">
      {/* Primary Header Area */}
      <div className="relative z-50">
        <PublicHeader 
          projectName={projectName} 
          projectId={projectId} 
          currentCodeTheme={currentCodeTheme} 
          themes={themes}
          navTree={sidebarNav}
          courseSettings={courseSettings}
          isTocOpen={isTocOpen}
          toggleToc={toggleToc}
        />
      </div>

      {/* Secondary Topics Navigation */}
      <div className="relative z-40 no-print">
        <TopicsHeader 
          topics={topics} 
          projectId={projectId} 
          activeTopicSlug={activeTopic?.slug || null} 
        />
      </div>
      
      {/* 3-Column Layout Container */}
      <div className="public-docs-container flex flex-1 w-full max-w-[1800px] mx-auto relative overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="no-print hidden md:block w-72 shrink-0">
          <PublicSidebar 
            navTree={sidebarNav} 
            projectId={projectId} 
            className="h-full border-r border-border bg-muted/40 dark:bg-muted/30" 
          />
        </div>
        
        {/* CENTER COLUMN */}
        <div className="public-docs-center flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
          <div className="flex flex-1 overflow-hidden relative">
            
            {/* MAIN CONTENT AREA WRAPPER (TO CONSTRAIN PROGRESS BAR) */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* PROGRESS BAR */}
              <ReadingProgress targetId="main-content" />

              {/* MAIN SCROLL AREA */}
              <main 
                id="main-content" 
                className="flex-1 w-full overflow-y-auto custom-scrollbar relative scroll-smooth bg-background bg-grid-pattern"
              >
                <div id="doc-content" className="w-full relative z-10 p-6 md:p-8 mx-auto max-w-6xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pathname}
                      className="public-docs-content"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {mounted && children}
                      
                      <DocFooterNav 
                        navTree={navTree} 
                        currentSlug={pathname.split('/').filter(Boolean).slice(2).join('/') || "index"} 
                        projectId={projectId} 
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Classic MD Footer */}
                <footer className="mt-20 border-t border-border/10">
                  <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-16 text-center space-y-6">
                    <div className="flex items-center justify-center gap-3 opacity-30 hover:opacity-80 transition-all duration-500">
                      <div className="h-px w-8 bg-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-[0.5em]">FusionDoc Engine</span>
                      <div className="h-px w-8 bg-foreground" />
                    </div>
                  </div>
                </footer>
              </main>
            </div>

            {/* RIGHT COLUMN */}
            {isTocOpen && (
              <div className="no-print hidden xl:block w-72 shrink-0 border-l border-border/40">
                <RightSidebar />
              </div>
            )}
          </div>

          {/* Minimalist Fixed Bottom Bar */}
          <div className="no-print">
            <footer className="flex-none border-t border-border bg-card/40 backdrop-blur-md px-6 py-2.5">
               <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
                  <div className="flex items-center gap-4">
                    <p>SmartClass <span className="text-muted-foreground/70">© 2026</span></p>
                  </div>
               </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
