"use client";

import React, { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import Search from "./Search";
import { ConfigControls } from "./ConfigControls";
import { ThemeInfo } from "@/app/actions/themes";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NavItem } from "../../services/public-docs";
import { PublicSidebar } from "./PublicSidebar";

import { usePathname } from "next/navigation";

export function PublicHeader({ 
  projectName, 
  projectId, 
  currentCodeTheme,
  themes,
  navTree,
  courseSettings,
  isTocOpen,
  toggleToc
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
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="flex-none h-14 border-b border-border dark:border-white/10 bg-background/80 backdrop-blur-md z-50 sticky top-0 w-full flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu */}
        <div className="md:hidden">
          {mounted && (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <Menu className="w-5 h-5" />
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

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-bold text-[10px] sm:text-xs tracking-[0.2em] uppercase truncate max-w-[120px] sm:max-w-none">{projectName}</span>
        </div>
      </div>

      {/* Search Area */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        {mounted && <Search projectId={projectId} />}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {mounted && (
          <ConfigControls 
            currentCodeTheme={currentCodeTheme} 
            themes={themes} 
            courseSettings={courseSettings} 
            isTocOpen={isTocOpen}
            toggleToc={toggleToc}
          />
        )}
      </div>
    </header>
  );
}
