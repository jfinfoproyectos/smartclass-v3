"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RightSidebar() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    // Reset headings on path change
    setHeadings([]);
    
    function scanHeadings() {
      // Scan h1, h2 and h3 headings inside the doc-content div
      const elements = Array.from(document.querySelectorAll('#doc-content h1, #doc-content h2, #doc-content h3'));
      const newHeadings = elements.map((elem) => {
        // Clean text to create valid ID if not present (using a more standard slugger logic)
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
      
      // Assign IDs if they don't have them (though rehype-slug should have handled it)
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

  // Handle initial anchor on load
  useEffect(() => {
    if (window.location.hash && headings.length > 0) {
      // Decode the hash to handle accents (e.g. %C3%A1 -> á)
      const id = decodeURIComponent(window.location.hash.substring(1));
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        const container = document.getElementById('main-content');
        if (element && container) {
          const offset = 80; // Adjusted for better visibility
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

      // Actualizar URL sin recargar
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <aside className="w-72 p-8 hidden xl:block shrink-0 h-full overflow-y-auto border-l border-border custom-scrollbar bg-card/5 backdrop-blur-sm">
      {headings.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-6 opacity-60">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">En esta página</h4>
          </div>
          
          <ul className="space-y-3">
            {headings.map((heading) => (
              <li 
                key={heading.id} 
                className={
                  heading.level === 2 ? 'ml-3' : 
                  heading.level === 3 ? 'ml-6' : 
                  ''
                }
              >
                <a 
                  href={`#${heading.id}`}
                  onClick={(e) => handleScroll(e, heading.id)}
                  className={`text-[12px] font-medium text-muted-foreground hover:text-primary transition-all block leading-relaxed py-1 hover:translate-x-1 cursor-pointer ${heading.level === 1 ? 'text-foreground font-bold' : ''}`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
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
