"use client";

import React, { useState, useEffect } from "react";
import Search from "./Search";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConfigControls } from "./ConfigControls";
import { ThemeInfo } from "@/app/actions/themes";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, AlignRight, ArrowLeft } from "lucide-react";
import { NavItem } from "../../services/public-docs";
import { Button } from "@/components/ui/button";
import { PublicSidebar } from "./PublicSidebar";
import RightSidebar from "./RightSidebar";

import { usePathname, useRouter } from "next/navigation";

export function PublicHeader({ 
  projectName, 
  projectId, 
  currentCodeTheme,
  themes,
  navTree,
  courseSettings,
  isTocOpen,
  toggleToc,
  isSidebarOpen,
  toggleSidebar,
  topics,
  activeTopicSlug,
  backUrl = "/",
  rawContent,
  pageTitle,
  pageCategory
}: { 
  projectName: string, 
  projectId: string, 
  currentCodeTheme: string,
  themes: ThemeInfo[],
  navTree: NavItem[],
  courseSettings: {
    themeMode: string;
    codeTheme: string;
    allowCodeThemeChange: boolean;
    themeColor: string;
    allowThemeColorChange: boolean;
  },
  isTocOpen: boolean;
  toggleToc: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  topics?: NavItem[];
  activeTopicSlug?: string | null;
  backUrl?: string;
  rawContent?: string;
  pageTitle?: string;
  pageCategory?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileTocOpen(false);
  }, [pathname]);

  return (
    <header className="flex-none border-b border-border/80 bg-background/80 backdrop-blur-xl z-50 sticky top-0 w-full flex flex-col shadow-none">
      <div className="h-12 w-full flex items-center justify-between px-3 sm:px-5 gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Back to app button */}
          {mounted && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              title="Volver a la aplicación"
            >
              <Link href={backUrl} aria-label="Volver a la aplicación">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          )}

          {/* Mobile Menu (Left Nav) */}
          <div className="md:hidden">
            {mounted && (
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-muted transition-colors border border-slate-200/80 dark:border-slate-800">
                    <Menu className="w-4 h-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80 border-r-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navegación</SheetTitle>
                    <SheetDescription>Menú de navegación de la documentación</SheetDescription>
                  </SheetHeader>
                  <div className="h-full pt-10">
                    <PublicSidebar 
                      navTree={navTree} 
                      projectId={projectId} 
                      className="w-full border-r-0 bg-transparent"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Project Title */}
          <Link
            href={`/docs/${projectId}`}
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-muted/80 text-foreground transition-all duration-200 shrink-0 group border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
            title={`Documentación: ${projectName}`}
          >
            <span className="text-xs font-black uppercase tracking-wider text-foreground group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-[220px] md:max-w-[300px]">
              {projectName}
            </span>
          </Link>

          {/* Search Area */}
          <div className="flex items-center flex-1 max-w-[180px] sm:max-w-xs md:max-w-sm min-w-0 ml-auto sm:ml-2">
            {mounted && <Search projectId={projectId} />}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {mounted && (
            <ConfigControls 
              projectName={projectName}
              projectId={projectId}
              rawContent={rawContent}
              pageTitle={pageTitle}
              pageCategory={pageCategory}
              currentCodeTheme={currentCodeTheme} 
              themes={themes} 
              courseSettings={courseSettings} 
              isTocOpen={isTocOpen}
              toggleToc={toggleToc}
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
            />
          )}

          {/* Mobile TOC button */}
          <div className="xl:hidden">
            {mounted && (
              <Sheet open={isMobileTocOpen} onOpenChange={setIsMobileTocOpen}>
                <SheetTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-muted transition-colors border border-slate-200/80 dark:border-slate-800" aria-label="Índice de la página">
                    <AlignRight className="w-4 h-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-80 border-l-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>En esta página</SheetTitle>
                    <SheetDescription>Índice de secciones de la página actual</SheetDescription>
                  </SheetHeader>
                  <div className="h-full pt-6">
                    <RightSidebar className="block w-full border-l-0" onItemClick={() => setIsMobileTocOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
