'use client';

import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ZoomImageProps {
  src: string;
  alt?: string;
  caption?: string;
}

export function ZoomImage({ src, alt, caption }: ZoomImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleZoom = () => setIsOpen(!isOpen);

  return (
    <>
      <figure className="my-8 group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:shadow-2xl" onClick={toggleZoom}>
        <div className="relative aspect-video sm:aspect-auto sm:max-h-[500px] flex items-center justify-center overflow-hidden">
          <img 
            src={src} 
            alt={alt || caption} 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white transform scale-90 group-hover:scale-100 transition-transform">
               <ZoomIn className="w-6 h-6" />
            </div>
          </div>
        </div>
        {caption && (
          <figcaption className="p-4 text-center text-sm text-muted-foreground border-t border-white/5 bg-black/40">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Lightbox / Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={toggleZoom}
        >
          <button 
            onClick={toggleZoom}
            className="absolute top-8 right-8 p-3 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all z-[110]"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={src} 
            alt={alt || caption} 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />
          
          {caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-xl bg-black/40 border border-white/10 text-white backdrop-blur-md">
               <p className="text-sm font-medium">{caption}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
