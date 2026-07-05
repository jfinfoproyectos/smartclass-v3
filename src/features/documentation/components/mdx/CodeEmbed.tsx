'use client';

import React, { useState } from 'react';
import { ExternalLink, Code2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CodeEmbedProps {
  url: string;
  height?: string;
  autoHeight?: boolean;
  autoload?: boolean;
  /** Margen interno entre el contenedor y el contenido embebido. Ej: inset="20" */
  inset?: string;
  title?: string;
  className?: string;
}

export function CodeEmbed({ 
  url, 
  height = '500', 
  autoHeight = false, 
  autoload = false, 
  inset = '0', 
  title, 
  className 
}: CodeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(autoload);

  // Parse string props to numbers
  const heightPx = parseInt(height, 10) || 500;
  const insetPx = parseInt(inset, 10) || 0;

  // Platform detection and URL transformation
  const getEmbedData = (rawUrl: string) => {
    try {
      const urlObj = new URL(rawUrl);
      const host = urlObj.hostname;

      if (host.includes('codepen.io')) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const user = pathParts[0];
        const slug = pathParts[pathParts.length - 1];
        return {
          type: 'CodePen',
          embedUrl: `https://codepen.io/${user}/embed/${slug}?height=${heightPx}&theme-id=dark&default-tab=result&editable=true`,
          icon: <Code2 className="w-6 h-6" />,
        };
      }

      if (host.includes('codesandbox.io')) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const id = pathParts[pathParts.length - 1];
        return {
          type: 'CodeSandbox',
          embedUrl: `https://codesandbox.io/embed/${id}?fontsize=14&hidenavigation=1&theme=dark`,
          icon: <Play className="w-6 h-6" />,
        };
      }

      if (host.includes('stackblitz.com')) {
        const embedUrl = rawUrl.includes('?') ? `${rawUrl}&embed=1` : `${rawUrl}?embed=1`;
        return {
          type: 'StackBlitz',
          embedUrl: embedUrl,
          icon: <Play className="w-6 h-6" />,
        };
      }

      return { type: 'Ecosistema', embedUrl: rawUrl, icon: <ExternalLink className="w-6 h-6" /> };
    } catch (e) {
      return { type: 'Recurso', embedUrl: rawUrl, icon: <ExternalLink className="w-6 h-6" /> };
    }
  };

  const embedData = getEmbedData(url);

  // Outer container: explicit px height or 16:9 via padding-top trick
  const outerStyle: React.CSSProperties = autoHeight
    ? { paddingTop: '56.25%' }           // 16:9 ratio via padding-top (always reliable)
    : { height: `${heightPx}px` };

  // iframe: absolute, offset by inset on all sides
  const iframeStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${insetPx}px`,
    left: `${insetPx}px`,
    width: `calc(100% - ${insetPx * 2}px)`,
    height: `calc(100% - ${insetPx * 2}px)`,
  };

  if (!isLoaded) {
    return (
      <div 
        className={cn(
          "not-prose my-8 relative group rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:bg-white/[0.08] cursor-pointer",
          className
        )}
        style={outerStyle}
        onClick={() => setIsLoaded(true)}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center p-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-all duration-500 shadow-[0_0_40px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_60px_rgba(6,182,212,0.25)]">
            {embedData.icon}
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 font-sans">
            <h4 className="text-xl font-bold text-foreground mb-2">
              Explorar Demo en {embedData.type}
            </h4>
            <p className="text-sm text-balance text-muted-foreground max-w-xs mx-auto">
              Esta sección contiene un editor interactivo. Haz clic para cargar el entorno de {title || embedData.type}.
            </p>
          </div>
          <Button variant="outline" className="mt-2 h-11 gap-2 rounded-full border-white/10 px-8 font-black uppercase tracking-widest text-[10px] group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all overflow-hidden relative shadow-lg">
             <Play className="w-4 h-4 fill-current" /> Cargar Ahora
          </Button>
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-colors" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 blur-[80px] rounded-full" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "not-prose my-8 w-full rounded-2xl border border-white/10 shadow-2xl bg-[#09090b] animate-in fade-in zoom-in-95 duration-1000 relative overflow-hidden",
        className
      )}
      style={outerStyle}
    >
      <iframe
        src={embedData.embedUrl}
        title={title || `Embedded ${embedData.type} sandbox`}
        className="rounded-xl border border-white/5"
        style={iframeStyle}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        loading="lazy"
      ></iframe>
    </div>
  );
}
