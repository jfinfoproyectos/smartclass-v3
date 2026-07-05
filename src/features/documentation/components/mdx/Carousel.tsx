'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Carousel({ children, autoPlay = false, interval = 5000, items }: { children?: React.ReactNode; autoPlay?: boolean; interval?: number; items?: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const finalItems = useMemo(() => {
    if (!items) return [];
    if (typeof items === 'string') {
      try {
        const parsed = new Function(`return ${items}`)();
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        try {
          const normalized = items.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          return JSON.parse(normalized);
        } catch (err) {
          console.error("Error parsing items JSON in Carousel:", err);
          return [];
        }
      }
    }
    return Array.isArray(items) ? items : [];
  }, [items]);

  const slides = useMemo(() => {
    if (finalItems.length > 0) {
      return finalItems.map((item: any, i: number) => (
        <div key={i} className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
          <img src={item.src} alt={item.alt || ""} className="absolute inset-0 w-full h-full object-cover select-none m-0" />
          {item.alt && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white font-medium text-xs max-w-[80%] text-center">
              {item.alt}
            </div>
          )}
        </div>
      ));
    }
    return React.Children.map(children, (child, i) => (
      <div key={i} className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
        {child}
      </div>
    )) || [];
  }, [finalItems, children]);

  const count = slides.length;

  const next = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (autoPlay && !isPaused && count > 0) {
      const timer = setInterval(next, interval);
      return () => clearInterval(timer);
    }
  }, [autoPlay, isPaused, next, interval, count]);

  const scrollTo = (index: number) => {
    setCurrentIndex(index);
  };

  if (count === 0) {
    return (
      <div className="relative group w-full h-[400px] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/5">
        <span className="text-muted-foreground text-sm">No hay imágenes en el carrusel.</span>
      </div>
    );
  }

  return (
    <div 
      className="relative group w-full overflow-hidden rounded-2xl border border-white/10 bg-black/5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Items Container */}
      <div 
        className="flex transition-transform duration-500 ease-out w-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide: React.ReactNode, i: number) => (
          <div key={i} className="flex-none w-full flex items-center justify-center">
            <div className="w-full h-full [&>img]:block [&>img]:w-full [&>img]:h-auto [&>img]:m-0">
               {slide}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Only show if more than 1 item */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/40 border border-white/10 z-20 outline-none"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/40 border border-white/10 z-20 outline-none"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicators & Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
             {/* Slide Counter */}
             <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white/90 border border-white/5 uppercase tracking-widest">
                {currentIndex + 1} <span className="text-white/40 mx-1">/</span> {count}
             </div>
             
             {/* Dots */}
             <div className="flex gap-2 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
                {slides.map((_: React.ReactNode, i: number) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    className={cn(
                      "h-1.5 transition-all duration-300 rounded-full outline-none",
                      i === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/50"
                    )}
                  />
                ))}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
