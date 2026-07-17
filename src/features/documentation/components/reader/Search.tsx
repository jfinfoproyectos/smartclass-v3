"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search as SearchIcon, X, FileText, Command, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';

export default function Search({ projectId }: { projectId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => !prev);
    setQuery('');
    setResults([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleSearch]);

  // Search logic
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = `/api/search?q=${encodeURIComponent(query)}${projectId ? `&project=${projectId}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, projectId]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    
    const [urlPath, hash] = url.split('#');
    
    // Normalización de rutas para comparación robusta
    const normalizePath = (p: string) => p.split('?')[0].split('#')[0].replace(/\/$/, "");
    const isSamePage = normalizePath(urlPath) === normalizePath(pathname);

    if (isSamePage) {
      const mainScroll = document.getElementById('main-content');
      const docContent = document.getElementById('doc-content');
      
      if (mainScroll && docContent) {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchTerm = normalize(query.trim());

        const performScroll = () => {
          let targetElement: HTMLElement | null = null;

          // 1. Intentar por Hash
          if (hash) {
            targetElement = document.getElementById(hash);
          }

          // 2. Intentar por Texto si no hay hash o no se encontró
          if (!targetElement && searchTerm) {
            const walker = document.createTreeWalker(docContent, NodeFilter.SHOW_TEXT, null);
            let node: Node | null;
            while (node = walker.nextNode()) {
              if (normalize(node.textContent || "").includes(searchTerm)) {
                targetElement = node.parentElement;
                break;
              }
            }
          }

          if (targetElement) {
            const containerRect = mainScroll.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            const offset = 120;
            const targetTop = (elementRect.top - containerRect.top) + mainScroll.scrollTop - offset;

            mainScroll.scrollTo({
              top: Math.max(0, targetTop),
              behavior: 'smooth'
            });

            // Resaltado visual
            targetElement.classList.add('bg-primary/20', 'ring-4', 'ring-primary/10', 'rounded-lg', 'transition-all', 'duration-500');
            setTimeout(() => {
              targetElement?.classList.remove('bg-primary/20', 'ring-4', 'ring-primary/10');
            }, 4000);
            
            window.history.pushState(null, '', url);
            return true;
          }
          return false;
        };

        // Delay un poco más largo para asegurar estabilidad
        setTimeout(performScroll, 200);
        return;
      }
    }

    // Si vamos a otra página, pasamos el término de búsqueda completo
    let finalUrl = url;
    const fullSearchTerm = query.trim();
    if (fullSearchTerm) {
      const [baseUrl, hashPart] = url.split('#');
      const separator = baseUrl.includes('?') ? '&' : '?';
      finalUrl = `${baseUrl}${separator}h=${encodeURIComponent(fullSearchTerm)}${hashPart ? `#${hashPart}` : ''}`;
    }
    
    router.push(finalUrl);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].url);
    }
  };

  return (
    <>
      <button
        onClick={mounted ? toggleSearch : undefined}
        disabled={!mounted}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl transition-all group w-full max-w-[280px] bg-muted/80 dark:bg-white/[0.04] border border-border/60 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/40 hover:bg-muted dark:hover:bg-white/[0.08]"
      >
        <SearchIcon className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
        <span className="flex-1 text-left text-muted-foreground/70 group-hover:text-foreground/90 transition-colors text-xs font-medium">Buscar...</span>
        {mounted && (
          <kbd className="hidden md:flex flex-row items-center gap-1 bg-background dark:bg-white/[0.05] px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50 dark:border-white/10 opacity-60 group-hover:opacity-100">
            <span className="text-[8px]">Ctrl</span> K
          </kbd>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-card border border-border/80 dark:border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden pointer-events-auto flex flex-col"
            >
              <div className="flex items-center px-6 border-b border-border/40 dark:border-white/5 h-16 bg-background/50">
                <SearchIcon className="w-5 h-5 text-primary mr-4 opacity-70" />
                <input
                  ref={inputRef}
                  autoFocus
                  placeholder="Busca cualquier tema, comando o concepto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 h-full py-2 text-lg font-medium tracking-tight"
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted dark:bg-white/5 border border-border/60 dark:border-white/10 text-[10px] font-mono text-muted-foreground/60">
                    ESC
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted dark:hover:bg-white/5 rounded-md transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground/60" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">Buscando...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, i) => (
                      <button
                        key={i}
                        onMouseEnter={() => setSelectedIndex(i)}
                        onClick={() => handleSelect(result.url)}
                        className={`w-full flex items-start text-left p-3 rounded-xl transition-all gap-3 ${
                          i === selectedIndex ? 'bg-primary/10' : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className={`mt-0.5 p-2 rounded-md ${i === selectedIndex ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-foreground truncate">{result.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-black uppercase tracking-widest">
                              {result.topic}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {result.content}
                          </p>
                        </div>
                        {i === selectedIndex && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-primary font-bold animate-pulse">
                            <span>ENTRAR</span>
                            <CornerDownLeft className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : query && !isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    No se encontraron resultados para "{query}"
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                    <Command className="w-8 h-8 opacity-10 mb-2" />
                    <p className="font-bold uppercase tracking-widest opacity-40 text-[10px]">Atajos de Teclado</p>
                    <div className="flex gap-4 mt-2 opacity-60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border text-[10px]">↑↓</kbd>
                        <span>Navegar</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border text-[10px]">Enter</kbd>
                        <span>Seleccionar</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted border-t border-border flex justify-between items-center text-[10px] text-muted-foreground px-4">
                <div className="flex gap-4">
                   <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">ESC</kbd> Cerrar</span>
                </div>
                <div className="flex items-center gap-1 opacity-40 font-bold uppercase tracking-widest">
                  SmartClass DocSearch
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
