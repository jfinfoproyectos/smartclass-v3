"use client";

import React, { useState, useEffect } from "react";
import Search from "./Search";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConfigControls } from "./ConfigControls";
import { ThemeInfo } from "@/app/actions/themes";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu, ChevronDown, AlignRight, ArrowLeft } from "lucide-react";
import { NavItem } from "../../services/public-docs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  backUrl = "/"
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
  topics: NavItem[];
  activeTopicSlug: string | null;
  backUrl?: string;
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

  const filteredTopics = topics.filter(
    t => t.slug.toLowerCase() !== "inicio" && t.slug !== "" && t.title.toLowerCase() !== "inicio"
  );
  const activeTopic = topics.find(t => t.slug === activeTopicSlug);
  const activeTitle = activeTopic ? activeTopic.title : "Inicio";

  return (
    <header className="flex-none border-b border-slate-200/80 dark:border-slate-800/80 bg-background/80 dark:bg-slate-950/80 backdrop-blur-xl z-50 sticky top-0 w-full flex flex-col shadow-sm">
      <div className="h-13 w-full flex items-center justify-between px-3 sm:px-5 gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
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

          {/* Mobile/Tablet Topics Dropdown */}
          {mounted && (
            <div className="lg:hidden flex items-center shrink-0 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1.5 px-2.5 bg-muted/50 border border-slate-200/80 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-primary cursor-pointer max-w-[110px] sm:max-w-[200px] truncate"
                  >
                    <span className="truncate">{activeTitle}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 p-1 z-[100] rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1.5">
                    Seleccionar Tema
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/docs/${projectId}`}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer block truncate",
                        !activeTopicSlug 
                          ? "text-primary bg-primary/10 font-black" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Inicio
                    </Link>
                  </DropdownMenuItem>

                  {filteredTopics.map((topic) => {
                    const isActive = activeTopicSlug === topic.slug;
                    return (
                      <DropdownMenuItem key={topic.id} asChild>
                        <Link
                          href={`/docs/${projectId}/${topic.slug}`}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer block truncate",
                            isActive 
                              ? "text-primary bg-primary/10 font-black" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {topic.title}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Desktop Topics Tabs */}
          {mounted && (
            <div className="hidden lg:flex items-center h-9 gap-1 bg-muted/50 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar shrink-0">
              <Link
                href={`/docs/${projectId}`}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                  !activeTopicSlug 
                    ? "bg-background text-primary border border-primary/30 shadow-xs font-extrabold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Inicio
              </Link>
              {filteredTopics.map((topic) => {
                const isActive = activeTopicSlug === topic.slug;
                return (
                  <Link
                    key={topic.id}
                    href={`/docs/${projectId}/${topic.slug}`}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                      isActive 
                        ? "bg-background text-primary border border-primary/30 shadow-xs font-extrabold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {topic.title}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Search Area */}
          <div className="flex items-center flex-1 max-w-[120px] sm:max-w-[220px] lg:max-w-xs min-w-0">
            {mounted && <Search projectId={projectId} />}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {mounted && (
            <ConfigControls 
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
