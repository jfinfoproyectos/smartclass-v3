import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function RightSidebar() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Reset headings on path change
    setHeadings([]);
    setActiveId('');
    
    function scanHeadings() {
      // Scan h1, h2 and h3 headings inside the doc-content div
      const elements = Array.from(document.querySelectorAll('#doc-content h1, #doc-content h2, #doc-content h3'));
      const newHeadings = elements.map((elem) => {
        // Clean text to create valid ID if not present
        const cleanId = elem.id || elem.textContent?.toLowerCase()
          .trim()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents for fallback ID
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          || 'id-' + Math.random().toString(36).substr(2, 9);
        
        return {
          id: elem.id || cleanId, // Prefer existing ID from rehype-slug
          text: elem.textContent || '',
          level: Number(elem.tagName.replace('H', ''))
        };
      });
      
      // Assign IDs if they don't have them
      elements.forEach((elem, i) => {
        if (!elem.id) elem.id = newHeadings[i].id;
      });

      setHeadings(newHeadings);
    }

    // Initial scan
    scanHeadings();

    // Re-scan after a moment to ensure MDX is rendered and images are loaded
    const timer = setTimeout(scanHeadings, 500);
    const timer2 = setTimeout(scanHeadings, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [pathname]);

  // Scroll spy implementation
  useEffect(() => {
    const container = document.getElementById('main-content');
    if (!container || headings.length === 0) return;

    const handleScrollSpy = () => {
      const containerRect = container.getBoundingClientRect();
      const scrollBuffer = 140; // threshold from top

      let currentActiveId = '';
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const topRelativeToContainer = rect.top - containerRect.top;
          if (topRelativeToContainer <= scrollBuffer) {
            currentActiveId = heading.id;
          } else {
            break;
          }
        }
      }

      if (currentActiveId) {
        setActiveId(currentActiveId);
      } else if (headings.length > 0) {
        setActiveId(headings[0].id);
      }
    };

    container.addEventListener('scroll', handleScrollSpy);
    // Initial run
    handleScrollSpy();

    return () => {
      container.removeEventListener('scroll', handleScrollSpy);
    };
  }, [headings]);

  // Handle initial anchor on load
  useEffect(() => {
    if (window.location.hash && headings.length > 0) {
      const id = decodeURIComponent(window.location.hash.substring(1));
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        const container = document.getElementById('main-content');
        if (element && container) {
          const offset = 80;
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const offsetPosition = (elementRect.top - containerRect.top) + container.scrollTop - offset;
          container.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [headings]);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    const container = document.getElementById('main-content');
    
    if (element && container) {
      const offset = 80;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offsetPosition = (elementRect.top - containerRect.top) + container.scrollTop - offset;

      container.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
    }
  };

  return (
    <aside className="w-72 p-8 hidden xl:block shrink-0 h-full overflow-y-auto border-l border-border dark:border-white/10 custom-scrollbar bg-card/5 backdrop-blur-sm">
      {headings.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-6 opacity-60">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">En esta página</h4>
          </div>
          
          <div className="relative border-l border-border/30 ml-1 py-1">
            <ul className="space-y-3.5 relative">
              {headings.map((heading) => {
                const isActive = activeId === heading.id;
                
                return (
                  <li 
                    key={heading.id} 
                    className={cn(
                      "relative transition-all duration-300",
                      heading.level === 2 ? 'pl-4' : 
                      heading.level === 3 ? 'pl-7' : 
                      'pl-3'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-[-1.5px] top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    )}
                      <a 
                        href={`#${heading.id}`}
                        onClick={(e) => handleScroll(e, heading.id)}
                        className={cn(
                          "text-[11px] font-medium transition-all block leading-relaxed py-0.5 cursor-pointer",
                          isActive 
                            ? "text-primary font-bold translate-x-0.5" 
                            : "text-muted-foreground hover:text-foreground hover:translate-x-0.5"
                        )}
                      >
                        {heading.text}
                      </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2 mb-6 opacity-60">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <div className="h-2 bg-foreground/10 rounded w-24" />
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-foreground/5 rounded w-full" />
            <div className="h-3 bg-foreground/5 rounded w-5/6" />
            <div className="h-3 bg-foreground/5 rounded w-4/6" />
            <div className="h-3 bg-foreground/5 rounded w-full" />
          </div>
        </div>
      )}
    </aside>
  );
}
